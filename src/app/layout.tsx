import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#CF0A2C",
};

export const metadata: Metadata = {
  title: "BNI Anwesenheit",
  description: "Digitale Anwesenheitserfassung für BNI Chapter-Treffen",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "BNI Anwesenheit",
  },
  icons: {
    icon: "/bni-logo.svg",
    apple: "/icons/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body className="bg-white text-bni-gray min-h-screen">
        {children}
      </body>
    </html>
  );
}
