import type { Metadata } from "next";

import { BarcodeScanner } from "@/components/scan/barcode-scanner";

export const metadata: Metadata = { title: "Scan" };

export default function ScanPage() {
  return <BarcodeScanner />;
}
