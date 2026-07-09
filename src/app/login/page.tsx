"use client";

import { useState } from "react";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        window.location.href = "/";
        return;
      }
      const data = await res.json().catch(() => null);
      setError(data?.error || "Anmeldung fehlgeschlagen");
    } catch {
      setError("Verbindungsfehler – bitte erneut versuchen");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-bni-gray-light px-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm flex flex-col gap-4"
      >
        <div className="flex flex-col items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/bni-logo.svg" alt="BNI" className="h-12" />
          <h1 className="text-xl font-bold text-bni-gray">BNI Anwesenheit</h1>
          <p className="text-sm text-bni-gray text-center">
            Bitte Zugangspasswort eingeben
          </p>
        </div>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Passwort"
          autoComplete="current-password"
          className="border border-gray-300 rounded-lg px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-bni-red"
        />
        {error && <p className="text-bni-red text-sm text-center">{error}</p>}
        <button
          type="submit"
          disabled={loading || !password}
          className="bg-bni-red text-white rounded-lg py-3 text-lg font-semibold disabled:opacity-50 hover:bg-bni-red-dark transition-colors"
        >
          {loading ? "Prüfe…" : "Anmelden"}
        </button>
      </form>
    </main>
  );
}
