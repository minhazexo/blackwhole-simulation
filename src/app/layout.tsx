import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";

import ErrorBoundary from "@/components/debug/ErrorBoundary";
import { siteMetadata, siteViewport } from "@/seo/metadata";
import { jsonLdSchemas } from "@/seo/structured-data";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

export const viewport: Viewport = siteViewport;
export const metadata: Metadata = siteMetadata;

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {jsonLdSchemas.map((schema, index) => (
          <script
            key={`${schema["@type"] as string}-${index}`}
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(schema),
            }}
          />
        ))}
      </head>
      <body
        className={`${inter.variable} antialiased bg-black text-white`}
        suppressHydrationWarning
      >
        <ErrorBoundary>{children}</ErrorBoundary>
      </body>
    </html>
  );
}
