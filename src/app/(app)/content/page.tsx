import type { Metadata } from "next";

import { ContentLibrary } from "@/components/content/content-library";

export const metadata: Metadata = { title: "Content" };

export default function ContentPage() {
  return <ContentLibrary />;
}
