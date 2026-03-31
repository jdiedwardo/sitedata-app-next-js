export function validateWebsiteUrl(candidateUrl: string): URL {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(candidateUrl);
  } catch {
    throw new Error("Invalid URL format.");
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error("Only HTTP and HTTPS URLs are supported.");
  }

  return parsedUrl;
}
