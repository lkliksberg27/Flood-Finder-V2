import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";

export const metadata: Metadata = {
  title: "Flood Finder",
  description: "Neighborhood IoT flood monitoring",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Flood Finder" },
};

export const viewport: Viewport = {
  width: "device-width", initialScale: 1, maximumScale: 1,
  userScalable: false, viewportFit: "cover", themeColor: "#0a0e17",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link href="https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.css" rel="stylesheet" />
        <script src="https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.js" defer></script>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="h-[100dvh] bg-[#0c1021] font-sans overscroll-none touch-manipulation">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
