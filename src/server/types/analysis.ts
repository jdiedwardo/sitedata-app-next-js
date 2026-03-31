export interface AnalyzeWebsiteRequest {
  targetUrl: string;
}

export interface AnalyzerRunContext {
  targetUrl: string;
  html: string;
  parsedDocument: unknown;
}

export interface AnalyzerResult<TData = unknown> {
  moduleId: string;
  moduleName: string;
  data: TData;
}

export interface AnalysisSummaryMetrics {
  moduleCount: number;
  completedAtIso: string;
}

export interface AnalyzeWebsiteResponse {
  metadata: {
    targetUrl: string;
    startedAtIso: string;
    completedAtIso: string;
  };
  moduleResults: AnalyzerResult[];
  summaryMetrics: AnalysisSummaryMetrics;
}
