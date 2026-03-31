import { AnalysisFetchError } from "@/server/errors/analysis-errors";
import { crawlSameOriginSite } from "@/server/crawler/site-crawler";
import { createDefaultAnalyticsModuleRegistry } from "@/server/modules/register-default-modules";
import type { AnalysisRepository } from "@/server/storage/analysis-repository";
import { JsonAnalysisRepository } from "@/server/storage/json-analysis-repository";
import type { AnalyzeWebsiteRequest, AnalyzeWebsiteResponse, CrawledPageSnapshot } from "@/server/types/analysis";
import { normalizeAndValidateWebsiteUrl } from "@/server/utils/url-validation";

const DEFAULT_MAX_PAGES = 50;
const ABSOLUTE_MAX_PAGES = 200;

export class AnalysisService {
  constructor(
    private readonly repository: AnalysisRepository = new JsonAnalysisRepository(),
    private readonly moduleRegistry = createDefaultAnalyticsModuleRegistry(),
  ) {}

  async analyzeWebsite(request: AnalyzeWebsiteRequest): Promise<AnalyzeWebsiteResponse> {
    const startedAtIso = new Date().toISOString();
    const validatedUrl = normalizeAndValidateWebsiteUrl(request.targetUrl);
    const maxPages = clampMaxPages(request.maxPages);

    const crawlOutcome = await crawlSameOriginSite({
      startUrl: validatedUrl,
      maxPages,
      timeoutMs: 10000,
    });

    if (crawlOutcome.pages.length === 0) {
      throw new AnalysisFetchError("Unable to crawl any pages for the provided URL.");
    }

    const crawlPages: CrawledPageSnapshot[] = crawlOutcome.pages.map((page) => ({
      url: page.url,
      html: page.html,
      parsedDocument: page.parsedDocument,
    }));

    const primaryPage = crawlOutcome.pages[0];
    const totalHtmlBytes = crawlOutcome.pages.reduce(
      (total, page) => total + Buffer.byteLength(page.html, "utf8"),
      0,
    );

    const moduleResults = await Promise.all(
      this.moduleRegistry.getModules().map((module) =>
        module.analyze({
          targetUrl: validatedUrl.toString(),
          html: primaryPage.html,
          parsedDocument: primaryPage.parsedDocument,
          crawlPages,
        }),
      ),
    );

    const linkModuleResult = moduleResults.find((result) => result.moduleId === "link-analysis");
    const imageModuleResult = moduleResults.find((result) => result.moduleId === "image-analysis");
    const contentModuleResult = moduleResults.find((result) => result.moduleId === "content-analysis");

    const linkCounts = (linkModuleResult?.data as { counts?: { internal?: number; external?: number } } | undefined)
      ?.counts;
    const imageCounts = imageModuleResult?.data as { totalImages?: number } | undefined;
    const contentCounts = contentModuleResult?.data as { wordCount?: number } | undefined;

    const result: AnalyzeWebsiteResponse = {
      metadata: {
        targetUrl: validatedUrl.toString(),
        startedAtIso,
        completedAtIso: new Date().toISOString(),
        fetch: {
          statusCode: primaryPage.statusCode,
          contentType: primaryPage.contentType,
          htmlSizeBytes: Buffer.byteLength(primaryPage.html, "utf8"),
        },
        parsedDocument: {
          title: primaryPage.parsedDocument.metadata.title,
          description: primaryPage.parsedDocument.metadata.description,
        },
        crawl: {
          pagesCrawled: crawlOutcome.pages.length,
          maxPages,
          limitReached: crawlOutcome.limitReached,
          totalHtmlBytes,
        },
      },
      moduleResults,
      summaryMetrics: {
        moduleCount: this.moduleRegistry.getModules().length,
        completedAtIso: new Date().toISOString(),
        totalInternalLinks: linkCounts?.internal ?? 0,
        totalExternalLinks: linkCounts?.external ?? 0,
        totalImages: imageCounts?.totalImages ?? 0,
        totalWords: contentCounts?.wordCount ?? 0,
      },
    };

    await this.repository.saveAnalysisResult(result);
    return result;
  }
}

function clampMaxPages(requestedMaxPages: number | undefined): number {
  if (requestedMaxPages === undefined || Number.isNaN(requestedMaxPages)) {
    return DEFAULT_MAX_PAGES;
  }

  const rounded = Math.floor(requestedMaxPages);
  return Math.min(ABSOLUTE_MAX_PAGES, Math.max(1, rounded));
}
