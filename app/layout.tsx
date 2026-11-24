import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AJZIO Store | Curated for the Exceptional",
  description: "Discover considered essentials and statement pieces at AJZIO Store.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}