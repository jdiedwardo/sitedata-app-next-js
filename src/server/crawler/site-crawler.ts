import { fetchWithTimeout } from "@/server/utils/fetch-with-timeout";
import { parseHtmlToDocument } from "@/server/utils/html-parser";
import type { ParsedHtmlDocument } from "@/server/utils/html-parser";

export interface SiteCrawlOptions {
  startUrl: URL;
  maxPages: number;
  timeoutMs?: number;
}

export interface SiteCrawlResult {
  pages: Array<{
    url: string;
    html: string;
    parsedDocument: ParsedHtmlDocument;
    statusCode: number;
    contentType: string | null;
  }>;
  limitReached: boolean;
}

const MAX_QUEUE_SIZE = 2000;

export function normalizeUrlForCrawling(url: URL): string {
  const normalized = new URL(url.toString());
  normalized.hash = "";
  if (normalized.pathname.length > 1 && normalized.pathname.endsWith("/")) {
    normalized.pathname = normalized.pathname.slice(0, -1);
  }
  return normalized.toString();
}

function isHtmlResponse(contentType: string | null): boolean {
  if (!contentType) {
    return true;
  }
  return contentType.toLowerCase().includes("text/html");
}

export async function crawlSameOriginSite(options: SiteCrawlOptions): Promise<SiteCrawlResult> {
  const { startUrl, maxPages, timeoutMs = 10000 } = options;
  const origin = startUrl.origin;
  const visitedNormalizedUrls = new Set<string>();
  const urlQueue: string[] = [normalizeUrlForCrawling(startUrl)];
  const crawledPages: SiteCrawlResult["pages"] = [];

  while (urlQueue.length > 0 && crawledPages.length < maxPages) {
    if (urlQueue.length > MAX_QUEUE_SIZE) {
      break;
    }

    const nextUrlString = urlQueue.shift();
    if (!nextUrlString) {
      break;
    }

    let nextUrl: URL;
    try {
      nextUrl = new URL(nextUrlString);
    } catch {
      continue;
    }

    if (nextUrl.origin !== origin) {
      continue;
    }

    const normalizedKey = normalizeUrlForCrawling(nextUrl);
    if (visitedNormalizedUrls.has(normalizedKey)) {
      continue;
    }
    visitedNormalizedUrls.add(normalizedKey);

    let response: Response;
    try {
      response = await fetchWithTimeout(nextUrlString, { timeoutMs });
    } catch {
      continue;
    }

    if (!isHtmlResponse(response.headers.get("content-type"))) {
      continue;
    }

    const html = await response.text();
    const finalUrlString = response.url || nextUrlString;
    let finalUrl: URL;
    try {
      finalUrl = new URL(finalUrlString);
    } catch {
      continue;
    }

    if (finalUrl.origin !== origin) {
      continue;
    }

    const parsedDocument = parseHtmlToDocument(html);
    crawledPages.push({
      url: normalizeUrlForCrawling(finalUrl),
      html,
      parsedDocument,
      statusCode: response.status,
      contentType: response.headers.get("content-type"),
    });

    if (crawledPages.length >= maxPages) {
      break;
    }

    parsedDocument.dom("a[href]").toArray().forEach((anchorElement) => {
      const href = parsedDocument.dom(anchorElement).attr("href")?.trim();
      if (!href || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:")) {
        return;
      }

      try {
        const resolved = new URL(href, finalUrlString);
        if (resolved.origin !== origin) {
          return;
        }
        const candidate = normalizeUrlForCrawling(resolved);
        if (!visitedNormalizedUrls.has(candidate)) {
          urlQueue.push(candidate);
        }
      } catch {
        // Ignore malformed href values.
      }
    });
  }

  const limitReached = crawledPages.length >= maxPages && urlQueue.length > 0;

  return {
    pages: crawledPages,
    limitReached,
  };
}
