"use client";

import Link from "next/link";
import { useState } from "react";

export function PiedDePage() {
  const [inscrit, setInscrit] = useState(false);

  return (
    <footer className="border-t border-zinc-200 text-sm">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-6 sm:flex-row sm:justify-between">
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
        {inscrit ? (
          <p>Merci, à bientôt dans votre boîte mail !</p>
        ) : (
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setInscrit(true);
            }}
          >
            <input
              type="email"
              required
              placeholder="Votre e-mail pour la lettre d'information"
              className="rounded border border-zinc-300 px-2 py-1"
            />
            <button
              type="submit"
              className="rounded bg-zinc-900 px-3 text-white"
            >
              OK
            </button>
          </form>
        )}
      </div>
    </footer>
  );
}
