import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdfjs-dist nicht bundeln, sondern zur Laufzeit aus node_modules laden
  // (sonst findet pdfjs sein Worker-Modul im Next-Bundle nicht).
  serverExternalPackages: ["pdfjs-dist"],
};

export default nextConfig;
