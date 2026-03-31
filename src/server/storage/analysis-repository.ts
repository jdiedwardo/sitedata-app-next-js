import type { AnalyzeWebsiteResponse } from "@/server/types/analysis";

export interface AnalysisRepository {
  saveAnalysisResult(result: AnalyzeWebsiteResponse): Promise<void>;
}
