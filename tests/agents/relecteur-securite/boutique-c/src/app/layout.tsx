import type { Metadata } from "next";
import { PiedDePage } from "@/components/PiedDePage";

export const metadata: Metadata = {
  title: "Boutique",
  description: "Boutique en ligne",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>
        {children}
        <PiedDePage />
      </body>
    </html>
  );
}
