import type { Metadata, Viewport } from "next";
import "./globals.css";
import TabBar from "@/components/TabBar";
import { SettingsProvider } from "@/lib/settings-context";

export const metadata: Metadata = {
  title: "Flood Finder",
  description: "Real-time flood monitoring and safe route planning for South Florida",
  icons: { icon: "/favicon.ico" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0a0e1a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <SettingsProvider>
          <main className="pb-20">{children}</main>
          <TabBar />
        </SettingsProvider>
      </body>
    </html>
  );
}
