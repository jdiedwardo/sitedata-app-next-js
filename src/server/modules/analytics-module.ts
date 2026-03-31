import type { AnalyzerResult, AnalyzerRunContext } from "@/server/types/analysis";

export interface AnalyticsModule {
  readonly id: string;
  readonly name: string;
  analyze(context: AnalyzerRunContext): Promise<AnalyzerResult>;
}
