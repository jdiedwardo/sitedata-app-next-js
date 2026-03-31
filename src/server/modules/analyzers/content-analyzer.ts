import type { AnalyticsModule } from "@/server/modules/analytics-module";
import { getParsedDocument, resolveCrawledPageSnapshots } from "@/server/modules/crawl-pages";
import type { AnalyzerResult, AnalyzerRunContext } from "@/server/types/analysis";

interface ContentAnalyzerResultData {
  wordCount: number;
  estimatedReadingTimeMinutes: number;
  keywordFrequency: Array<{ keyword: string; count: number }>;
}

export class ContentAnalyzer implements AnalyticsModule {
  readonly id = "content-analysis";
  readonly name = "Content Analyzer";

  async analyze(context: AnalyzerRunContext): Promise<AnalyzerResult<ContentAnalyzerResultData>> {
    const snapshots = resolveCrawledPageSnapshots(context);
    const bodyText = snapshots
      .map((snapshot) => getParsedDocument(snapshot).dom("body").text().replace(/\s+/g, " ").trim().toLowerCase())
      .filter((text) => text.length > 0)
      .join(" ");
    const words = bodyText.match(/[a-z0-9']+/g) ?? [];
    const wordCount = words.length;
    const estimatedReadingTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));

    const stopWords = new Set([
      "the",
      "and",
      "for",
      "with",
      "that",
      "this",
      "from",
      "your",
      "have",
      "are",
      "was",
      "you",
      "our",
      "not",
    ]);

    const frequencyMap = new Map<string, number>();
    for (const word of words) {
      if (word.length < 3 || stopWords.has(word)) {
        continue;
      }
      frequencyMap.set(word, (frequencyMap.get(word) ?? 0) + 1);
    }

    const keywordFrequency = Array.from(frequencyMap.entries())
      .map(([keyword, count]) => ({ keyword, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    return {
      moduleId: this.id,
      moduleName: this.name,
      data: {
        wordCount,
        estimatedReadingTimeMinutes,
        keywordFrequency,
      },
    };
  }
}
