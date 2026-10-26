import Link from "next/link";

export function PiedDePage() {
  return (
    <footer className="border-t border-zinc-200 text-sm">
      <div className="mx-auto max-w-5xl px-4 py-6">
        <ul className="flex flex-wrap gap-4">
          <li>
            <Link href="/mentions-legales">Mentions légales</Link>
          </li>
          <li>
            <Link href="/cgv">Conditions générales de vente</Link>
          </li>
          <li>
            <Link href="/confidentialite">Confidentialité</Link>
          </li>
        </ul>
      </div>
    </footer>
  );
}
