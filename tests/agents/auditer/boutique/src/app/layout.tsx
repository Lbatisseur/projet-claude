import type { Metadata } from "next";
import { EnTete } from "@/components/EnTete";
import { PiedDePage } from "@/components/PiedDePage";
import { site } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: site.nom, template: `%s · ${site.nom}` },
  description: site.description,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <EnTete />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
          {children}
        </main>
        <PiedDePage />
      </body>
    </html>
  );
}
