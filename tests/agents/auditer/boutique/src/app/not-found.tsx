import Link from "next/link";

export default function PageIntrouvable() {
  return (
    <>
      <h1 className="mb-4 text-2xl font-semibold">Page introuvable</h1>
      <p>
        Cette page n&apos;existe pas ou plus.{" "}
        <Link href="/">Retour à la boutique</Link>
      </p>
    </>
  );
}
