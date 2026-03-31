import { AnalysisFetchError } from "@/server/errors/analysis-errors";

export interface FetchWithTimeoutOptions extends RequestInit {
  timeoutMs?: number;
}

export async function fetchWithTimeout(
  input: string | URL,
  options: FetchWithTimeoutOptions = {},
): Promise<Response> {
  const { timeoutMs = 10000, ...fetchOptions } = options;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(input, { ...fetchOptions, signal: controller.signal });

    if (!response.ok) {
      throw new AnalysisFetchError(
        `Failed to fetch URL. Received HTTP ${response.status} ${response.statusText}.`,
      );
    }

    return response;
  } catch (error) {
    if (error instanceof AnalysisFetchError) {
      throw error;
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new AnalysisFetchError(`Request timed out after ${timeoutMs}ms.`);
    }

    throw new AnalysisFetchError("Unable to reach target URL.");
  } finally {
    clearTimeout(timeoutId);
  }
}
