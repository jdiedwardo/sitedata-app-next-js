"use client";

import { FormEvent, ReactNode, useState } from "react";
import Image from "next/image";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AnalyzeWebsiteResponse, AnalyzerResult } from "@/server/types/analysis";

interface MetadataModuleData {
  title: string | null;
  description: string | null;
  metaTags: Array<{ name: string; content: string }>;
}

interface HeadingModuleData {
  hierarchy: Array<{ level: "h1" | "h2" | "h3"; text: string; pageUrl?: string }>;
  counts: { h1: number; h2: number; h3: number };
}

interface LinkModuleData {
  internalLinks: string[];
  externalLinks: string[];
  counts: { internal: number; external: number };
  brokenLinks: Array<{ url: string; scope: "internal" | "external"; reason: string }>;
  linkProbe: {
    probedCount: number;
    totalUniqueCount: number;
    maxProbes: number;
    truncated: boolean;
    probedInternalCount: number;
    probedExternalCount: number;
  };
}

interface ContentModuleData {
  wordCount: number;
  estimatedReadingTimeMinutes: number;
  keywordFrequency: Array<{ keyword: string; count: number }>;
}

interface ImageModuleData {
  totalImages: number;
  imagesWithAltText: number;
  imagesMissingAltText: number;
  altCoveragePercent: number;
}

function getModuleData<TData>(moduleResults: AnalyzerResult[], moduleId: string): TData | null {
  const result = moduleResults.find((item) => item.moduleId === moduleId);
  return (result?.data as TData | undefined) ?? null;
}

function buildLinksPieChartData(linkData: LinkModuleData): Array<{ name: string; value: number; fill: string }> {
  const brokenInternal = linkData.brokenLinks.filter((entry) => entry.scope === "internal").length;
  const brokenExternal = linkData.brokenLinks.filter((entry) => entry.scope === "external").length;
  const probedInternal = linkData.linkProbe.probedInternalCount;
  const probedExternal = linkData.linkProbe.probedExternalCount;
  const okInternal = Math.max(0, probedInternal - brokenInternal);
  const okExternal = Math.max(0, probedExternal - brokenExternal);
  const notChecked = Math.max(0, linkData.linkProbe.totalUniqueCount - linkData.linkProbe.probedCount);

  const slices = [
    { name: "Internal (reachable)", value: okInternal, fill: "#2563eb" },
    { name: "Internal (broken)", value: brokenInternal, fill: "#dc2626" },
    { name: "External (reachable)", value: okExternal, fill: "#16a34a" },
    { name: "External (broken)", value: brokenExternal, fill: "#ea580c" },
    { name: "Not checked", value: notChecked, fill: "#9ca3af" },
  ];

  return slices.filter((slice) => slice.value > 0);
}

function downloadTextFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const objectUrl = URL.createObjectURL(blob);
  const linkElement = document.createElement("a");
  linkElement.href = objectUrl;
  linkElement.download = filename;
  linkElement.click();
  URL.revokeObjectURL(objectUrl);
}

function createCsvRow(values: Array<string | number | boolean>): string {
  return values
    .map((value) => `"${String(value).replaceAll('"', '""')}"`)
    .join(",");
}

function buildAnalysisCsv(responsePayload: AnalyzeWebsiteResponse): string {
  const rows: string[] = [];

  rows.push(createCsvRow(["section", "key", "value"]));
  rows.push(createCsvRow(["metadata", "targetUrl", responsePayload.metadata.targetUrl]));
  rows.push(createCsvRow(["metadata", "title", responsePayload.metadata.parsedDocument.title ?? ""]));
  rows.push(
    createCsvRow(["metadata", "description", responsePayload.metadata.parsedDocument.description ?? ""]),
  );
  rows.push(createCsvRow(["summary", "totalWords", responsePayload.summaryMetrics.totalWords]));
  rows.push(createCsvRow(["summary", "totalImages", responsePayload.summaryMetrics.totalImages]));
  rows.push(createCsvRow(["summary", "internalLinks", responsePayload.summaryMetrics.totalInternalLinks]));
  rows.push(createCsvRow(["summary", "externalLinks", responsePayload.summaryMetrics.totalExternalLinks]));
  rows.push(createCsvRow(["crawl", "pagesCrawled", responsePayload.metadata.crawl.pagesCrawled]));
  rows.push(createCsvRow(["crawl", "maxPages", responsePayload.metadata.crawl.maxPages]));
  rows.push(createCsvRow(["crawl", "limitReached", responsePayload.metadata.crawl.limitReached]));
  rows.push(createCsvRow(["crawl", "totalHtmlBytes", responsePayload.metadata.crawl.totalHtmlBytes]));

  for (const moduleResult of responsePayload.moduleResults) {
    rows.push(createCsvRow(["module", moduleResult.moduleId, JSON.stringify(moduleResult.data)]));
  }

  return rows.join("\n");
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M20 20l-4.2-4.2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 4v10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M8 10l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M5 20h14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function TagIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 13l-7 7-9-9V4h7z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="8.5" cy="8.5" r="1.2" fill="currentColor" />
    </svg>
  );
}

function HeadingIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7h16M4 12h11M4 17h7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="7" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="17" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M10 12h4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 3h7l5 5v13H7z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M14 3v5h5M10 13h6M10 17h6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function ImageIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" fill="none" stroke="currentColor" strokeWidth="2" rx="2" />
      <circle cx="9" cy="10" r="1.5" fill="currentColor" />
      <path d="M5 17l5-4 3 2 4-3 2 2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function HourglassIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 4h10M7 20h10M8 4c0 4 4 4 4 8s-4 4-4 8M16 4c0 4-4 4-4 8s4 4 4 8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function ButtonContent({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span className="buttonContent">
      <span className="buttonIcon" aria-hidden="true">
        {icon}
      </span>
      <span>{label}</span>
    </span>
  );
}

export default function HomePage() {
  const [targetUrl, setTargetUrl] = useState("");
  const [maxPages, setMaxPages] = useState(50);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [responsePayload, setResponsePayload] = useState<AnalyzeWebsiteResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setResponsePayload(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUrl, maxPages }),
      });

      const payload = (await response.json()) as AnalyzeWebsiteResponse | { error: string };

      if (!response.ok) {
        const apiError = "error" in payload ? payload.error : "Request failed.";
        throw new Error(apiError);
      }

      setResponsePayload(payload as AnalyzeWebsiteResponse);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error.";
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main>
      <div className="logoHeader">
        <Image src="/SiteDataAnalyticsLogo.png" alt="SiteData Analytics" width={1089} height={166} priority />
      </div>
      <p>
        Submit a URL to crawl same-origin pages (default 50, max 200) and aggregate metadata, headings, links, content,
        and images.
      </p>
      <section className="panel">
        <form onSubmit={handleSubmit}>
          <div className="row">
            <input
              required
              type="url"
              placeholder="https://example.com"
              value={targetUrl}
              onChange={(event) => setTargetUrl(event.target.value)}
            />
            <label className="maxPagesLabel">
              Max pages
              <input
                type="number"
                min={1}
                max={200}
                value={maxPages}
                onChange={(event) => setMaxPages(Number(event.target.value))}
              />
            </label>
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <ButtonContent icon={<HourglassIcon />} label="Analyzing..." /> : <ButtonContent icon={<SearchIcon />} label="Analyze" />}
            </button>
          </div>
        </form>
        {isSubmitting ? <p className="statusMessage">Analyzing website, please wait...</p> : null}
        {!isSubmitting && errorMessage ? <p className="errorMessage">{errorMessage}</p> : null}
        {!isSubmitting && !responsePayload && !errorMessage ? (
          <p className="statusMessage">No analysis yet. Submit a URL to start.</p>
        ) : null}
      </section>

      {responsePayload ? <AnalysisResults responsePayload={responsePayload} /> : null}
    </main>
  );
}

type ModuleTabId = "page-metadata" | "heading-structure" | "link-analysis" | "content-analysis" | "image-analysis";

function AnalysisResults({ responsePayload }: { responsePayload: AnalyzeWebsiteResponse }) {
  const metadataData = getModuleData<MetadataModuleData>(responsePayload.moduleResults, "page-metadata");
  const headingData = getModuleData<HeadingModuleData>(responsePayload.moduleResults, "heading-structure");
  const linkData = getModuleData<LinkModuleData>(responsePayload.moduleResults, "link-analysis");
  const linkPieData = linkData ? buildLinksPieChartData(linkData) : [];
  const contentData = getModuleData<ContentModuleData>(responsePayload.moduleResults, "content-analysis");
  const imageData = getModuleData<ImageModuleData>(responsePayload.moduleResults, "image-analysis");
  const showHeadingPageColumn = headingData?.hierarchy.some((heading) => heading.pageUrl) ?? false;
  const [activeTabId, setActiveTabId] = useState<ModuleTabId>("page-metadata");

  return (
    <div className="results">
      <section className="panel">
        <h2>Summary</h2>
        <table>
          <tbody>
            <tr>
              <th>Analyzed URL</th>
              <td>{responsePayload.metadata.targetUrl}</td>
            </tr>
            <tr>
              <th>Pages Crawled</th>
              <td>
                {responsePayload.metadata.crawl.pagesCrawled} / {responsePayload.metadata.crawl.maxPages}
                {responsePayload.metadata.crawl.limitReached ? " (limit reached)" : ""}
              </td>
            </tr>
            <tr>
              <th>Words</th>
              <td>{responsePayload.summaryMetrics.totalWords}</td>
            </tr>
            <tr>
              <th>Internal / External Links</th>
              <td>
                {responsePayload.summaryMetrics.totalInternalLinks} / {responsePayload.summaryMetrics.totalExternalLinks}
              </td>
            </tr>
            <tr>
              <th>Images</th>
              <td>{responsePayload.summaryMetrics.totalImages}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="panel">
        <h2>Export</h2>
        <div className="row">
          <button
            type="button"
            onClick={() =>
              downloadTextFile(
                "analysis-result.json",
                JSON.stringify(responsePayload, null, 2),
                "application/json;charset=utf-8",
              )
            }
          >
            <ButtonContent icon={<DownloadIcon />} label="Download JSON" />
          </button>
          <button
            type="button"
            onClick={() =>
              downloadTextFile("analysis-result.csv", buildAnalysisCsv(responsePayload), "text/csv;charset=utf-8")
            }
          >
            <ButtonContent icon={<DownloadIcon />} label="Download CSV" />
          </button>
        </div>
      </section>

      <section className="panel">
        <h2>Analytics Modules</h2>
        <div className="tabRow" role="tablist" aria-label="Analytics modules">
          <button
            type="button"
            className={activeTabId === "page-metadata" ? "tabButton active" : "tabButton"}
            onClick={() => setActiveTabId("page-metadata")}
          >
            <ButtonContent icon={<TagIcon />} label="Metadata" />
          </button>
          <button
            type="button"
            className={activeTabId === "heading-structure" ? "tabButton active" : "tabButton"}
            onClick={() => setActiveTabId("heading-structure")}
          >
            <ButtonContent icon={<HeadingIcon />} label="Headings" />
          </button>
          <button
            type="button"
            className={activeTabId === "link-analysis" ? "tabButton active" : "tabButton"}
            onClick={() => setActiveTabId("link-analysis")}
          >
            <ButtonContent icon={<LinkIcon />} label="Links" />
          </button>
          <button
            type="button"
            className={activeTabId === "content-analysis" ? "tabButton active" : "tabButton"}
            onClick={() => setActiveTabId("content-analysis")}
          >
            <ButtonContent icon={<DocumentIcon />} label="Content" />
          </button>
          <button
            type="button"
            className={activeTabId === "image-analysis" ? "tabButton active" : "tabButton"}
            onClick={() => setActiveTabId("image-analysis")}
          >
            <ButtonContent icon={<ImageIcon />} label="Images" />
          </button>
        </div>

        <div className="tabPanel">
          {activeTabId === "page-metadata" ? (
            <div>
              <h3>Page Metadata</h3>
              <table>
                <tbody>
                  <tr>
                    <th>Document Title</th>
                    <td>{responsePayload.metadata.parsedDocument.title ?? "N/A"}</td>
                  </tr>
                  <tr>
                    <th>Description</th>
                    <td>{responsePayload.metadata.parsedDocument.description ?? "N/A"}</td>
                  </tr>
                  <tr>
                    <th>Fetch Status</th>
                    <td>{responsePayload.metadata.fetch.statusCode}</td>
                  </tr>
                  <tr>
                    <th>Content Type</th>
                    <td>{responsePayload.metadata.fetch.contentType ?? "Unknown"}</td>
                  </tr>
                </tbody>
              </table>
              {metadataData?.metaTags?.length ? (
                <div className="tableWrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Meta Tag</th>
                        <th>Content</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metadataData.metaTags.slice(0, 20).map((tag) => (
                        <tr key={`${tag.name}-${tag.content}`}>
                          <td>{tag.name}</td>
                          <td>{tag.content || "Empty"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>
          ) : null}

          {activeTabId === "heading-structure" && headingData ? (
            <div>
              <h3>Heading Structure</h3>
              <div className="chartWrap">
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart
                    data={[
                      { level: "H1", count: headingData.counts.h1 },
                      { level: "H2", count: headingData.counts.h2 },
                      { level: "H3", count: headingData.counts.h3 },
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="level" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#2563eb" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="tableWrap">
                <table>
                  <thead>
                    <tr>
                      <th>Level</th>
                      {showHeadingPageColumn ? <th>Page</th> : null}
                      <th>Text</th>
                    </tr>
                  </thead>
                  <tbody>
                    {headingData.hierarchy.slice(0, 40).map((heading, index) => (
                      <tr key={`${heading.pageUrl ?? "single"}-${heading.level}-${index}`}>
                        <td>{heading.level.toUpperCase()}</td>
                        {showHeadingPageColumn ? <td className="cellMuted">{heading.pageUrl ?? "—"}</td> : null}
                        <td>{heading.text || "Empty"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {activeTabId === "link-analysis" && linkData ? (
            <div>
              <h3>Links</h3>
              <table>
                <tbody>
                  <tr>
                    <th>Links checked</th>
                    <td>
                      {linkData.linkProbe.probedCount} of {linkData.linkProbe.totalUniqueCount} unique URLs
                      {linkData.linkProbe.truncated
                        ? ` (capped at ${linkData.linkProbe.maxProbes}; increase limit in code if needed)`
                        : ""}
                    </td>
                  </tr>
                  <tr>
                    <th>Broken links found</th>
                    <td>{linkData.brokenLinks.length}</td>
                  </tr>
                </tbody>
              </table>
              {linkData.brokenLinks.length > 0 ? (
                <div className="tableWrap">
                  <h4>Broken links</h4>
                  <table>
                    <thead>
                      <tr>
                        <th>Scope</th>
                        <th>URL</th>
                        <th>Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {linkData.brokenLinks.map((entry) => (
                        <tr key={entry.url}>
                          <td>{entry.scope}</td>
                          <td className="cellMuted">{entry.url}</td>
                          <td>{entry.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="statusMessage">No broken links among the URLs checked.</p>
              )}
              <h4>Link health (unique URLs)</h4>
              <p className="chartCaption">
                Based on probed links (internal and external are sampled in turn up to the probe limit): reachable vs
                broken, plus any URLs not checked when the limit is reached.
              </p>
              <div className="chartWrap">
                {linkPieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={linkPieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={88}
                        label={({ name, percent = 0 }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {linkPieData.map((entry) => (
                          <Cell key={entry.name} fill={entry.fill} stroke="#ffffff" strokeWidth={1} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [String(value ?? ""), "Count"]} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="statusMessage">No links to chart.</p>
                )}
              </div>
              <div className="twoCol">
                <div className="tableWrap">
                  <h3>Internal Links</h3>
                  <table>
                    <tbody>
                      {linkData.internalLinks.slice(0, 50).map((url) => (
                        <tr key={url}>
                          <td>{url}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="tableWrap">
                  <h3>External Links</h3>
                  <table>
                    <tbody>
                      {linkData.externalLinks.slice(0, 50).map((url) => (
                        <tr key={url}>
                          <td>{url}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : null}

          {activeTabId === "content-analysis" && contentData ? (
            <div>
              <h3>Content</h3>
              <table>
                <tbody>
                  <tr>
                    <th>Word Count</th>
                    <td>{contentData.wordCount}</td>
                  </tr>
                  <tr>
                    <th>Estimated Reading Time</th>
                    <td>{contentData.estimatedReadingTimeMinutes} minute(s)</td>
                  </tr>
                </tbody>
              </table>
              <div className="chartWrap">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={contentData.keywordFrequency.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="keyword" interval={0} angle={-25} textAnchor="end" height={75} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#7c3aed" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="tableWrap">
                <table>
                  <thead>
                    <tr>
                      <th>Keyword</th>
                      <th>Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contentData.keywordFrequency.slice(0, 20).map((keyword) => (
                      <tr key={keyword.keyword}>
                        <td>{keyword.keyword}</td>
                        <td>{keyword.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {activeTabId === "image-analysis" && imageData ? (
            <div>
              <h3>Images</h3>
              <div className="chartWrap">
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart
                    data={[
                      { name: "With Alt", value: imageData.imagesWithAltText },
                      { name: "Missing Alt", value: imageData.imagesMissingAltText },
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#ea580c" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <table>
                <tbody>
                  <tr>
                    <th>Total Images</th>
                    <td>{imageData.totalImages}</td>
                  </tr>
                  <tr>
                    <th>Alt Coverage</th>
                    <td>{imageData.altCoveragePercent}%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
