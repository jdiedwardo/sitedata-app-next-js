import { AnalyticsModuleRegistry } from "@/server/modules/module-registry";
import type { AnalysisRepository } from "@/server/storage/analysis-repository";
import { JsonAnalysisRepository } from "@/server/storage/json-analysis-repository";
import type { AnalyzeWebsiteRequest, AnalyzeWebsiteResponse } from "@/server/types/analysis";
import { validateWebsiteUrl } from "@/server/utils/url-validation";

export class AnalysisService {
  constructor(
    private readonly repository: AnalysisRepository = new JsonAnalysisRepository(),
    private readonly moduleRegistry: AnalyticsModuleRegistry = new AnalyticsModuleRegistry(),
  ) {}

  async analyzeWebsite(request: AnalyzeWebsiteRequest): Promise<AnalyzeWebsiteResponse> {
    const startedAtIso = new Date().toISOString();
    const validatedUrl = validateWebsiteUrl(request.targetUrl);

    // Step 1 placeholder response. Real fetch/parse/module execution starts in Step 2+.
    const result: AnalyzeWebsiteResponse = {
      metadata: {
        targetUrl: validatedUrl.toString(),
        startedAtIso,
        completedAtIso: new Date().toISOString(),
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
