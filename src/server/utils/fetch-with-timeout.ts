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
    return await fetch(input, { ...fetchOptions, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}
