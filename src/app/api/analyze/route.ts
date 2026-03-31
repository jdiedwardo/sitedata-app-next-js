import { NextResponse } from "next/server";
import { AnalysisService } from "@/server/services/analysis-service";
import type { AnalyzeWebsiteRequest } from "@/server/types/analysis";

const analysisService = new AnalysisService();

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const requestBody = (await request.json()) as Partial<AnalyzeWebsiteRequest>;

    if (!requestBody.targetUrl || typeof requestBody.targetUrl !== "string") {
      return NextResponse.json({ error: "A targetUrl string is required." }, { status: 400 });
    }

    const result = await analysisService.analyzeWebsite({ targetUrl: requestBody.targetUrl });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
