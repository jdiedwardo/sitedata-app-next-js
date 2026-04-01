import type { AnalyticsModule } from "@/server/modules/analytics-module";
import { getParsedDocument, resolveCrawledPageSnapshots } from "@/server/modules/crawl-pages";
import type { AnalyzerResult, AnalyzerRunContext } from "@/server/types/analysis";
import { probeUrl } from "@/server/utils/probe-url";

interface BrokenLinkEntry {
  url: string;
  scope: "internal" | "external";
  reason: string;
}

interface LinkAnalyzerResultData {
  internalLinks: string[];
  externalLinks: string[];
  counts: {
    internal: number;
    external: number;
  };
  brokenLinks: BrokenLinkEntry[];
  linkProbe: {
    probedCount: number;
    totalUniqueCount: number;
    maxProbes: number;
    truncated: boolean;
    probedInternalCount: number;
    probedExternalCount: number;
  };
}

const MAX_LINKS_TO_PROBE = 120;
const PROBE_CONCURRENCY = 6;
const PROBE_TIMEOUT_MS = 7000;

export class LinkAnalyzer implements AnalyticsModule {
  readonly id = "link-analysis";
  readonly name = "Link Analyzer";

  async analyze(context: AnalyzerRunContext): Promise<AnalyzerResult<LinkAnalyzerResultData>> {
    const snapshots = resolveCrawledPageSnapshots(context);
    const baseOrigin = new URL(context.targetUrl).origin;
    const internalLinks = new Set<string>();
    const externalLinks = new Set<string>();

    for (const snapshot of snapshots) {
      const parsedDocument = getParsedDocument(snapshot);
      parsedDocument.dom("a[href]").toArray().forEach((element) => {
        const href = parsedDocument.dom(element).attr("href")?.trim();
        if (!href) {
          return;
        }

        try {
          const resolved = new URL(href, snapshot.url);
          if (!["http:", "https:"].includes(resolved.protocol)) {
            return;
          }
          if (resolved.origin === baseOrigin) {
            internalLinks.add(resolved.toString());
          } else {
            externalLinks.add(resolved.toString());
          }
        } catch {
          // Skip malformed URLs silently.
        }
      });
    }

    const internalSorted = Array.from(internalLinks).sort();
    const externalSorted = Array.from(externalLinks).sort();
    const totalUniqueCount = internalSorted.length + externalSorted.length;
    const { urls: urlsToProbe, probedInternalCount, probedExternalCount } = selectUrlsToProbe(
      internalSorted,
      externalSorted,
      MAX_LINKS_TO_PROBE,
    );

    const brokenLinks = await probeUrlsConcurrently(
      urlsToProbe,
      internalLinks,
      PROBE_CONCURRENCY,
      PROBE_TIMEOUT_MS,
    );

    return {
      moduleId: this.id,
      moduleName: this.name,
      data: {
        internalLinks: internalSorted,
        externalLinks: externalSorted,
        counts: {
          internal: internalLinks.size,
          external: externalLinks.size,
        },
        brokenLinks,
        linkProbe: {
          probedCount: urlsToProbe.length,
          totalUniqueCount,
          maxProbes: MAX_LINKS_TO_PROBE,
          truncated: totalUniqueCount > MAX_LINKS_TO_PROBE,
          probedInternalCount,
          probedExternalCount,
        },
      },
    };
  }
}

/**
 * Interleaves internal and external URLs so the probe budget is shared across both.
 * (Previously we probed all internals first; sites with many internal links never
 * probed externals, so the pie chart showed no external slices.)
 */
function selectUrlsToProbe(
  internalSorted: string[],
  externalSorted: string[],
  max: number,
): { urls: string[]; probedInternalCount: number; probedExternalCount: number } {
  const urls: string[] = [];
  let probedInternalCount = 0;
  let probedExternalCount = 0;
  let internalIndex = 0;
  let externalIndex = 0;

  while (urls.length < max) {
    let addedInRound = false;

    if (internalIndex < internalSorted.length) {
      urls.push(internalSorted[internalIndex]!);
      internalIndex += 1;
      probedInternalCount += 1;
      addedInRound = true;
      if (urls.length >= max) {
        break;
      }
    }

    if (externalIndex < externalSorted.length) {
      urls.push(externalSorted[externalIndex]!);
      externalIndex += 1;
      probedExternalCount += 1;
      addedInRound = true;
    }

    if (!addedInRound) {
      break;
    }
  }

  return { urls, probedInternalCount, probedExternalCount };
}

async function probeUrlsConcurrently(
  urls: string[],
  internalSet: Set<string>,
  concurrency: number,
  timeoutMs: number,
): Promise<BrokenLinkEntry[]> {
  const broken: BrokenLinkEntry[] = [];
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= urls.length) {
        return;
      }

      const url = urls[index]!;
      const result = await probeUrl(url, timeoutMs);
      if (!result.ok) {
        broken.push({
          url,
          scope: internalSet.has(url) ? "internal" : "external",
          reason: result.error ?? (result.statusCode != null ? `HTTP ${result.statusCode}` : "Unreachable"),
        });
      }
    }
  }

  const workerCount = Math.max(1, Math.min(concurrency, urls.length));
  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  return broken.sort((a, b) => a.url.localeCompare(b.url));
}
