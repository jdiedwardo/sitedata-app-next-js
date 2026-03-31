import type { AnalyticsModule } from "@/server/modules/analytics-module";
import { getParsedDocument, resolveCrawledPageSnapshots } from "@/server/modules/crawl-pages";
import type { AnalyzerResult, AnalyzerRunContext } from "@/server/types/analysis";

interface PageMetadataResultData {
  title: string | null;
  description: string | null;
  metaTags: Array<{ name: string; content: string }>;
}

export class PageMetadataAnalyzer implements AnalyticsModule {
  readonly id = "page-metadata";
  readonly name = "Page Metadata Analyzer";

  async analyze(context: AnalyzerRunContext): Promise<AnalyzerResult<PageMetadataResultData>> {
    const snapshots = resolveCrawledPageSnapshots(context);
    const parsedDocument = getParsedDocument(snapshots[0]);
    const metaTags = parsedDocument.dom("meta[name], meta[property]")
      .toArray()
      .map((element) => {
        const name =
          parsedDocument.dom(element).attr("name") ?? parsedDocument.dom(element).attr("property") ?? "";
        const content = parsedDocument.dom(element).attr("content") ?? "";
        return { name: name.trim(), content: content.trim() };
      })
      .filter((entry) => entry.name.length > 0);

    return {
      moduleId: this.id,
      moduleName: this.name,
      data: {
        title: parsedDocument.metadata.title,
        description: parsedDocument.metadata.description,
        metaTags,
      },
    };
  }
}
