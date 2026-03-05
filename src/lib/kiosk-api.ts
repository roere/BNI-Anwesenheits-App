const KIOSK_TOKEN_KEY = "bni_kiosk_token";

export function getKioskToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(KIOSK_TOKEN_KEY);
}

export function setKioskToken(token: string): void {
  localStorage.setItem(KIOSK_TOKEN_KEY, token);
}

export function clearKioskToken(): void {
  localStorage.removeItem(KIOSK_TOKEN_KEY);
}

export async function kioskFetch<T = unknown>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const token = getKioskToken();

  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "X-Kiosk-Token": token } : {}),
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Fehler ${res.status}`);
  }

  return res.json();
}
