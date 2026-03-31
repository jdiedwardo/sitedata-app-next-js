import { NextResponse } from "next/server";
import { AnalysisFetchError, AnalysisInputError } from "@/server/errors/analysis-errors";
import { AnalysisService } from "@/server/services/analysis-service";
import type { AnalyzeWebsiteRequest } from "@/server/types/analysis";

const analysisService = new AnalysisService();

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const requestBody = (await request.json()) as Partial<AnalyzeWebsiteRequest>;

    if (!requestBody.targetUrl || typeof requestBody.targetUrl !== "string") {
      return NextResponse.json({ error: "A targetUrl string is required." }, { status: 400 });
    }

    const maxPages = parseOptionalMaxPages(requestBody.maxPages);
    const result = await analysisService.analyzeWebsite({ targetUrl: requestBody.targetUrl, maxPages });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof AnalysisInputError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (error instanceof AnalysisFetchError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }

    const message = error instanceof Error ? error.message : "Unexpected error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function parseOptionalMaxPages(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
}
