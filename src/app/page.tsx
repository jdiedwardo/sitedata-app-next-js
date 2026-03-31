"use client";

import { FormEvent, useState } from "react";
import type { AnalyzeWebsiteResponse } from "@/server/types/analysis";

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
      <p>Step 1 foundation: submit a URL and receive a typed placeholder analysis response.</p>
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
        {errorMessage ? <p>{errorMessage}</p> : null}
        {responsePayload ? <pre>{JSON.stringify(responsePayload, null, 2)}</pre> : null}
      </section>
    </main>
  );
}
