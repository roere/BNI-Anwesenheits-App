import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BNI Anwesenheit",
  description: "Digitale Anwesenheitserfassung für BNI Chapter-Treffen",
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
