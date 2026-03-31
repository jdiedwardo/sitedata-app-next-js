import type { AnalyticsModule } from "@/server/modules/analytics-module";
import type { AnalyzerResult, AnalyzerRunContext } from "@/server/types/analysis";
import type { ParsedHtmlDocument } from "@/server/utils/html-parser";

interface LinkAnalyzerResultData {
  internalLinks: string[];
  externalLinks: string[];
  counts: {
    internal: number;
    external: number;
  };
}

export class LinkAnalyzer implements AnalyticsModule {
  readonly id = "link-analysis";
  readonly name = "Link Analyzer";

  async analyze(context: AnalyzerRunContext): Promise<AnalyzerResult<LinkAnalyzerResultData>> {
    const parsedDocument = context.parsedDocument as ParsedHtmlDocument;
    const baseOrigin = new URL(context.targetUrl).origin;
    const internalLinks = new Set<string>();
    const externalLinks = new Set<string>();

    parsedDocument.dom("a[href]").toArray().forEach((element) => {
      const href = parsedDocument.dom(element).attr("href")?.trim();
      if (!href) {
        return;
      }

      try {
        const resolved = new URL(href, context.targetUrl);
        if (resolved.origin === baseOrigin) {
          internalLinks.add(resolved.toString());
        } else {
          externalLinks.add(resolved.toString());
        }
      } catch {
        // Skip malformed URLs silently.
      }
    });

    return {
      moduleId: this.id,
      moduleName: this.name,
      data: {
        internalLinks: Array.from(internalLinks),
        externalLinks: Array.from(externalLinks),
        counts: {
          internal: internalLinks.size,
          external: externalLinks.size,
        },
      },
    };
  }
}
