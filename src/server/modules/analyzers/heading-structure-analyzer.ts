import type { AnalyticsModule } from "@/server/modules/analytics-module";
import type { AnalyzerResult, AnalyzerRunContext } from "@/server/types/analysis";
import type { ParsedHtmlDocument } from "@/server/utils/html-parser";

interface HeadingStructureResultData {
  hierarchy: Array<{ level: "h1" | "h2" | "h3"; text: string }>;
  counts: { h1: number; h2: number; h3: number };
}

export class HeadingStructureAnalyzer implements AnalyticsModule {
  readonly id = "heading-structure";
  readonly name = "Heading Structure Analyzer";

  async analyze(context: AnalyzerRunContext): Promise<AnalyzerResult<HeadingStructureResultData>> {
    const parsedDocument = context.parsedDocument as ParsedHtmlDocument;
    const hierarchy = parsedDocument.dom("h1, h2, h3")
      .toArray()
      .map((element) => {
        const level = element.tagName.toLowerCase() as "h1" | "h2" | "h3";
        const text = parsedDocument.dom(element).text().replace(/\s+/g, " ").trim();
        return { level, text };
      });

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
