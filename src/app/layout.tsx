import type { Metadata } from "next";
import { Figtree, Geist_Mono, Syne } from "next/font/google";

import "./globals.css";

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Echelon",
    template: "%s · Echelon",
  },
  description:
    "Echelon is a client coaching platform for workouts, nutrition, check-ins, and progress.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${syne.variable} ${figtree.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="atmosphere grain min-h-full font-sans text-foreground">
        {children}
      </body>
    </html>
  );
}
