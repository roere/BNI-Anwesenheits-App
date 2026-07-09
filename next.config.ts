import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdfjs-dist nicht bundeln, sondern zur Laufzeit aus node_modules laden
  // (sonst findet pdfjs sein Worker-Modul im Next-Bundle nicht).
  serverExternalPackages: ["pdfjs-dist"],
  async headers() {
    return [
      {
        // Interne Anwendung mit Personendaten – für alle Antworten
        // (auch Assets) Indexierung durch Suchmaschinen verbieten
        source: "/:path*",
        headers: [
          {
            key: "X-Robots-Tag",
            value: "noindex, nofollow, noarchive, nosnippet, noimageindex",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
