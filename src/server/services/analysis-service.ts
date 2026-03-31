import { AnalyticsModuleRegistry } from "@/server/modules/module-registry";
import type { AnalysisRepository } from "@/server/storage/analysis-repository";
import { JsonAnalysisRepository } from "@/server/storage/json-analysis-repository";
import type { AnalyzeWebsiteRequest, AnalyzeWebsiteResponse } from "@/server/types/analysis";
import { fetchWithTimeout } from "@/server/utils/fetch-with-timeout";
import { parseHtmlToDocument } from "@/server/utils/html-parser";
import { normalizeAndValidateWebsiteUrl } from "@/server/utils/url-validation";

export class AnalysisService {
  constructor(
    private readonly repository: AnalysisRepository = new JsonAnalysisRepository(),
    private readonly moduleRegistry: AnalyticsModuleRegistry = new AnalyticsModuleRegistry(),
  ) {}

  async analyzeWebsite(request: AnalyzeWebsiteRequest): Promise<AnalyzeWebsiteResponse> {
    const startedAtIso = new Date().toISOString();
    const validatedUrl = normalizeAndValidateWebsiteUrl(request.targetUrl);
    const fetchResponse = await fetchWithTimeout(validatedUrl, { timeoutMs: 10000 });
    const html = await fetchResponse.text();
    const parsedDocument = parseHtmlToDocument(html);

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
      moduleResults: [],
      summaryMetrics: {
        moduleCount: this.moduleRegistry.getModules().length,
        completedAtIso: new Date().toISOString(),
      },
    };

    await this.repository.saveAnalysisResult(result);
    return result;
  }
}
