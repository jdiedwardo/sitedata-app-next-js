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
      .map((snapshot) => extractLikelyContentText(getParsedDocument(snapshot).dom))
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
      "name",
      "url",
      "field",
      "fields",
      "submit",
      "click",
      "menu",
      "home",
      "contact",
      "login",
      "sign",
      "search",
      "page",
      "site",
      "read",
      "more",
      // Carousel / controls / icon labels often left inside main content
      "forward",
      "backward",
      "backwards",
      "arrow",
      "arrows",
      "chevron",
      "chevrons",
      "prev",
      "swiper",
      "carousel",
      "slide",
      "slides",
      "dot",
      "dots",
      "play",
      "pause",
      "mute",
      "unmute",
      "fullscreen",
      "expand",
      "collapse",
      "scroll",
      "swipe",
      "skip",
      "close",
      "open",
      "loading",
      "spinner",
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

/**
 * Best-effort "visible text" without a headless browser: drop nodes that are typically
 * hidden from view (sr-only, aria-hidden, display:none, etc.). Cheerio cannot know CSS
 * from stylesheets, so some hidden text may remain; use Playwright if you need pixel-accurate layout text.
 */
const NON_VISIBLE_AND_CHROME_SELECTOR = [
  "script",
  "style",
  "noscript",
  "template",
  "svg",
  "nav",
  "header",
  "footer",
  "aside",
  "form",
  "[hidden]",
  '[aria-hidden="true"]',
  ".sr-only",
  ".sr-only-focusable",
  ".visually-hidden",
  ".screen-reader-text",
  ".visuallyhidden",
  ".skip-link",
  ".skip-to-content",
  '[class*="sr-only"]',
  '[class*="visually-hidden"]',
  '[class*="screen-reader"]',
  "dialog:not([open])",
].join(", ");

function shouldRemoveElementForInlineStyle(styleAttr: string): boolean {
  const style = styleAttr.toLowerCase();
  if (/display\s*:\s*none/.test(style)) {
    return true;
  }
  if (/visibility\s*:\s*hidden/.test(style)) {
    return true;
  }
  if (/\bopacity\s*:\s*0(?:\.0+)?(?!\d)/.test(style)) {
    return true;
  }
  if (/clip\s*:\s*rect\s*\(\s*0(?:px)?\s*,\s*0(?:px)?\s*,\s*0(?:px)?\s*,\s*0(?:px)?\s*\)/.test(style)) {
    return true;
  }
  return false;
}

function extractLikelyContentText(dom: ReturnType<typeof getParsedDocument>["dom"]): string {
  const root = dom.root().clone();

  root.find(NON_VISIBLE_AND_CHROME_SELECTOR).remove();

  root.find("[style]").each((_, element) => {
    const node = dom(element);
    const styleAttr = node.attr("style");
    if (styleAttr && shouldRemoveElementForInlineStyle(styleAttr)) {
      node.remove();
    }
  });

  const mainCandidates = root.find("main, article, [role='main']");
  const contentRoot = mainCandidates.length > 0 ? mainCandidates.first() : root.find("body");
  const extractedText = contentRoot.text() ?? "";

  return extractedText.replace(/\s+/g, " ").trim().toLowerCase();
}
