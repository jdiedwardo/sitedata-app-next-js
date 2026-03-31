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
    fetch: {
      statusCode: number;
      contentType: string | null;
      htmlSizeBytes: number;
    };
    parsedDocument: {
      title: string | null;
      description: string | null;
    };
  };
  moduleResults: AnalyzerResult[];
  summaryMetrics: AnalysisSummaryMetrics;
}
