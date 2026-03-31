import { load, type CheerioAPI } from "cheerio";

export interface ParsedHtmlDocument {
  dom: CheerioAPI;
  metadata: {
    title: string | null;
    description: string | null;
  };
}

export function parseHtmlToDocument(html: string): ParsedHtmlDocument {
  const dom = load(html);
  const title = dom("title").first().text().trim() || null;
  const descriptionMetaContent = dom('meta[name="description"]').attr("content")?.trim() ?? "";

  return {
    dom,
    metadata: {
      title,
      description: descriptionMetaContent || null,
    },
  };
}
