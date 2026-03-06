/**
 * Safely fetch JSON — returns { data, error } so callers never crash on empty bodies.
 */
export async function fetchJson<T = Record<string, unknown>>(
  url: string,
  options?: RequestInit
): Promise<{ data: T | null; error: string | null; status: number }> {
  const res = await fetch(url, options);

  let data: T | null = null;
  try {
    const text = await res.text();
    if (text) data = JSON.parse(text) as T;
  } catch {
    // body was not JSON
  }

  if (!res.ok) {
    const msg = (data as Record<string, string> | null)?.error ?? `Request failed (${res.status})`;
    return { data: null, error: msg, status: res.status };
  }

  return { data, error: null, status: res.status };
}
