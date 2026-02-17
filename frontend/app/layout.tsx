import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";

export const metadata: Metadata = {
  title: "Flood Finder",
  description: "Neighborhood IoT flood monitoring system",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0a0e17",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-surface-0 font-sans">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
