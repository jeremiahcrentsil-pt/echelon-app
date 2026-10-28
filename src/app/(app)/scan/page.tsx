import type { Metadata } from "next";
import { ScanBarcode } from "lucide-react";

import { PlaceholderModule } from "@/components/modules/placeholder-module";

export const metadata: Metadata = { title: "Scan" };

export default function ScanPage() {
  return (
    <PlaceholderModule
      title="Scan"
      purpose="Scan food barcodes to look up nutrition info and drop items straight into your log."
      icon={ScanBarcode}
    />
  );
}
