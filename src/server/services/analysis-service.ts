import { createDefaultAnalyticsModuleRegistry } from "@/server/modules/register-default-modules";
import type { AnalysisRepository } from "@/server/storage/analysis-repository";
import { JsonAnalysisRepository } from "@/server/storage/json-analysis-repository";
import type { AnalyzeWebsiteRequest, AnalyzeWebsiteResponse } from "@/server/types/analysis";
import { fetchWithTimeout } from "@/server/utils/fetch-with-timeout";
import { parseHtmlToDocument } from "@/server/utils/html-parser";
import { normalizeAndValidateWebsiteUrl } from "@/server/utils/url-validation";

export class AnalysisService {
  constructor(
    private readonly repository: AnalysisRepository = new JsonAnalysisRepository(),
    private readonly moduleRegistry = createDefaultAnalyticsModuleRegistry(),
  ) {}

  async analyzeWebsite(request: AnalyzeWebsiteRequest): Promise<AnalyzeWebsiteResponse> {
    const startedAtIso = new Date().toISOString();
    const validatedUrl = normalizeAndValidateWebsiteUrl(request.targetUrl);
    const fetchResponse = await fetchWithTimeout(validatedUrl, { timeoutMs: 10000 });
    const html = await fetchResponse.text();
    const parsedDocument = parseHtmlToDocument(html);
    const moduleResults = await Promise.all(
      this.moduleRegistry.getModules().map((module) =>
        module.analyze({
          targetUrl: validatedUrl.toString(),
          html,
          parsedDocument,
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
          statusCode: fetchResponse.status,
          contentType: fetchResponse.headers.get("content-type"),
          htmlSizeBytes: Buffer.byteLength(html, "utf8"),
        },
        parsedDocument: {
          title: parsedDocument.metadata.title,
          description: parsedDocument.metadata.description,
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
