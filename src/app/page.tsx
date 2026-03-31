"use client";

import { FormEvent, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
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
  hierarchy: Array<{ level: "h1" | "h2" | "h3"; text: string }>;
  counts: { h1: number; h2: number; h3: number };
}

interface LinkModuleData {
  internalLinks: string[];
  externalLinks: string[];
  counts: { internal: number; external: number };
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

function downloadTextFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const objectUrl = URL.createObjectURL(blob);
  const linkElement = document.createElement("a");
  linkElement.href = objectUrl;
  linkElement.download = filename;
  linkElement.click();
  URL.revokeObjectURL(objectUrl);
}

function createCsvRow(values: Array<string | number>): string {
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

  for (const moduleResult of responsePayload.moduleResults) {
    rows.push(createCsvRow(["module", moduleResult.moduleId, JSON.stringify(moduleResult.data)]));
  }

  return rows.join("\n");
}

export default function HomePage() {
  const [targetUrl, setTargetUrl] = useState("");
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
        body: JSON.stringify({ targetUrl }),
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
      <h1>SiteData Analytics</h1>
      <p>Submit a URL to analyze website metadata, headings, links, content, and images.</p>
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
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Analyzing..." : "Analyze"}
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

function AnalysisResults({ responsePayload }: { responsePayload: AnalyzeWebsiteResponse }) {
  const metadataData = getModuleData<MetadataModuleData>(responsePayload.moduleResults, "page-metadata");
  const headingData = getModuleData<HeadingModuleData>(responsePayload.moduleResults, "heading-structure");
  const linkData = getModuleData<LinkModuleData>(responsePayload.moduleResults, "link-analysis");
  const contentData = getModuleData<ContentModuleData>(responsePayload.moduleResults, "content-analysis");
  const imageData = getModuleData<ImageModuleData>(responsePayload.moduleResults, "image-analysis");

  return (
    <div className="results">
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
            Download JSON
          </button>
          <button
            type="button"
            onClick={() =>
              downloadTextFile("analysis-result.csv", buildAnalysisCsv(responsePayload), "text/csv;charset=utf-8")
            }
          >
            Download CSV
          </button>
        </div>
      </section>

      <section className="panel">
        <h2>Summary Metrics</h2>
        <table>
          <tbody>
            <tr>
              <th>Analyzed URL</th>
              <td>{responsePayload.metadata.targetUrl}</td>
            </tr>
            <tr>
              <th>Modules Run</th>
              <td>{responsePayload.summaryMetrics.moduleCount}</td>
            </tr>
            <tr>
              <th>Words</th>
              <td>{responsePayload.summaryMetrics.totalWords}</td>
            </tr>
            <tr>
              <th>Internal Links</th>
              <td>{responsePayload.summaryMetrics.totalInternalLinks}</td>
            </tr>
            <tr>
              <th>External Links</th>
              <td>{responsePayload.summaryMetrics.totalExternalLinks}</td>
            </tr>
            <tr>
              <th>Images</th>
              <td>{responsePayload.summaryMetrics.totalImages}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="panel">
        <h2>Metadata</h2>
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
            <tr>
              <th>HTML Size (bytes)</th>
              <td>{responsePayload.metadata.fetch.htmlSizeBytes}</td>
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
                {metadataData.metaTags.slice(0, 15).map((tag) => (
                  <tr key={`${tag.name}-${tag.content}`}>
                    <td>{tag.name}</td>
                    <td>{tag.content || "Empty"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      {headingData ? (
        <section className="panel">
          <h2>Heading Structure</h2>
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
                  <th>Text</th>
                </tr>
              </thead>
              <tbody>
                {headingData.hierarchy.slice(0, 20).map((heading, index) => (
                  <tr key={`${heading.level}-${index}`}>
                    <td>{heading.level.toUpperCase()}</td>
                    <td>{heading.text || "Empty"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {linkData ? (
        <section className="panel">
          <h2>Links</h2>
          <div className="chartWrap">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={[
                    { name: "Internal", value: linkData.counts.internal },
                    { name: "External", value: linkData.counts.external },
                  ]}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#16a34a"
                />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="twoCol">
            <div className="tableWrap">
              <h3>Internal Links</h3>
              <table>
                <tbody>
                  {linkData.internalLinks.slice(0, 15).map((url) => (
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
                  {linkData.externalLinks.slice(0, 15).map((url) => (
                    <tr key={url}>
                      <td>{url}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ) : null}

      {contentData ? (
        <section className="panel">
          <h2>Content</h2>
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
        </section>
      ) : null}

      {imageData ? (
        <section className="panel">
          <h2>Images</h2>
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
        </section>
      ) : null}
    </div>
  );
}
