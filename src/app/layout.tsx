import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SiteData Analytics",
  description: "Incremental fullstack website analytics tool",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
