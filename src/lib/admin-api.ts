export async function adminFetch<T = unknown>(
  url: string,
  pin: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-Admin-PIN": pin,
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Fehler ${res.status}`);
  }

  return res.json();
}
