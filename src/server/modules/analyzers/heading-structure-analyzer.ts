import type { AnalyticsModule } from "@/server/modules/analytics-module";
import { getParsedDocument, resolveCrawledPageSnapshots } from "@/server/modules/crawl-pages";
import type { AnalyzerResult, AnalyzerRunContext } from "@/server/types/analysis";

interface HeadingStructureResultData {
  hierarchy: Array<{ level: "h1" | "h2" | "h3"; text: string; pageUrl?: string }>;
  counts: { h1: number; h2: number; h3: number };
}

export class HeadingStructureAnalyzer implements AnalyticsModule {
  readonly id = "heading-structure";
  readonly name = "Heading Structure Analyzer";

  async analyze(context: AnalyzerRunContext): Promise<AnalyzerResult<HeadingStructureResultData>> {
    const snapshots = resolveCrawledPageSnapshots(context);
    const includePageUrl = snapshots.length > 1;
    const hierarchy: HeadingStructureResultData["hierarchy"] = [];

    for (const snapshot of snapshots) {
      const parsedDocument = getParsedDocument(snapshot);
      parsedDocument.dom("h1, h2, h3")
        .toArray()
        .forEach((element) => {
          const level = element.tagName.toLowerCase() as "h1" | "h2" | "h3";
          const text = parsedDocument.dom(element).text().replace(/\s+/g, " ").trim();
          hierarchy.push(
            includePageUrl ? { level, text, pageUrl: snapshot.url } : { level, text },
          );
        });
    }

    const counts = {
      h1: hierarchy.filter((item) => item.level === "h1").length,
      h2: hierarchy.filter((item) => item.level === "h2").length,
      h3: hierarchy.filter((item) => item.level === "h3").length,
    };

    return {
      moduleId: this.id,
      moduleName: this.name,
      data: { hierarchy, counts },
    };
  }
}
