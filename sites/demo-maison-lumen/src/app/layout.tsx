import type { Metadata } from "next";
import { site } from "@/lib/site";
import "./globals.css";

// Aucune police téléchargée tant que l'identité visuelle n'est pas définie avec
// le client : la police système de globals.css s'affiche sans délai ni poids.

export const metadata: Metadata = {
  title: { default: site.nom, template: `%s · ${site.nom}` },
  description: site.description,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
