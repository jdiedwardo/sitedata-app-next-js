import { AnalysisInputError } from "@/server/errors/analysis-errors";

export function normalizeAndValidateWebsiteUrl(candidateUrl: string): URL {
  const normalizedCandidate = candidateUrl.trim();
  if (!normalizedCandidate) {
    throw new AnalysisInputError("URL is required.");
  }

  const candidateWithProtocol = /^https?:\/\//i.test(normalizedCandidate)
    ? normalizedCandidate
    : `https://${normalizedCandidate}`;

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(candidateWithProtocol);
  } catch {
    throw new AnalysisInputError("Invalid URL format.");
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new AnalysisInputError("Only HTTP and HTTPS URLs are supported.");
  }

  if (!parsedUrl.hostname) {
    throw new AnalysisInputError("URL must include a valid domain.");
  }

  return parsedUrl;
}
