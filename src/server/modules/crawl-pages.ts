import type { AnalyzerRunContext, CrawledPageSnapshot } from "@/server/types/analysis";
import type { ParsedHtmlDocument } from "@/server/utils/html-parser";

export function resolveCrawledPageSnapshots(context: AnalyzerRunContext): CrawledPageSnapshot[] {
  if (context.crawlPages && context.crawlPages.length > 0) {
    return context.crawlPages;
  }

  return [
    {
      url: context.targetUrl,
      html: context.html,
      parsedDocument: context.parsedDocument,
    },
  ];
}

export function getParsedDocument(snapshot: CrawledPageSnapshot): ParsedHtmlDocument {
  return snapshot.parsedDocument as ParsedHtmlDocument;
}
