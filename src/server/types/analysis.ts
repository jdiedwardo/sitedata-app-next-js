export interface AnalyzeWebsiteRequest {
  targetUrl: string;
  /**
   * Maximum same-origin HTML pages to fetch during a crawl (default 50, max 200).
   * Use 1 to analyze only the entry URL without following internal links.
   */
  maxPages?: number;
}

export interface CrawledPageSnapshot {
  url: string;
  html: string;
  parsedDocument: unknown;
}

export interface AnalyzerRunContext {
  targetUrl: string;
  html: string;
  parsedDocument: unknown;
  /**
   * When set, analyzers aggregate across these pages (same-origin crawl).
   * Otherwise the single-page fields above are used.
   */
  crawlPages?: CrawledPageSnapshot[];
}

export interface AnalyzerResult<TData = unknown> {
  moduleId: string;
  moduleName: string;
  data: TData;
}

export interface AnalysisSummaryMetrics {
  moduleCount: number;
  completedAtIso: string;
  totalInternalLinks: number;
  totalExternalLinks: number;
  totalImages: number;
  totalWords: number;
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
    crawl: {
      pagesCrawled: number;
      maxPages: number;
      limitReached: boolean;
      totalHtmlBytes: number;
    };
  };
  moduleResults: AnalyzerResult[];
  summaryMetrics: AnalysisSummaryMetrics;
}
