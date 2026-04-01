export interface ProbeUrlResult {
  ok: boolean;
  statusCode?: number;
  error?: string;
}

/**
 * Lightweight reachability check (HEAD, then GET with Range if HEAD is not allowed).
 * Does not throw; used for bulk link validation.
 */
export async function probeUrl(url: string, timeoutMs: number): Promise<ProbeUrlResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    let response = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
    });

    if (response.status === 405) {
      response = await fetch(url, {
        method: "GET",
        redirect: "follow",
        signal: controller.signal,
        headers: { Range: "bytes=0-0" },
      });
    }

    if (response.ok) {
      return { ok: true, statusCode: response.status };
    }

    return {
      ok: false,
      statusCode: response.status,
      error: `HTTP ${response.status}`,
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return { ok: false, error: `Timeout after ${timeoutMs}ms` };
    }

    return {
      ok: false,
      error: error instanceof Error ? error.message : "Request failed",
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
