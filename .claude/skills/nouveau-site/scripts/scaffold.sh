#!/bin/bash
# Crée un site dans sites/<identifiant> avec la stack par défaut et l'outillage
# exigé par /verifier.
# Usage : scaffold.sh <identifiant> "<Nom commercial>" "<Description de l'activité>"
#   identifiant : minuscules, chiffres et tirets (ex. boulangerie-martin).
#                 Préfixe demo- : site de démonstration, versionné dans le dépôt public.
#                 Sinon : site client, avec son propre dépôt git (privé).
# Code de sortie : 0 si le site est créé, 2 si la création est impossible.

abort() { echo "❌ Création impossible : $1" >&2; exit 2; }
step()  { echo "▸ $1"; }

slug="$1"; nom="$2"; description="$3"
[ -n "$slug" ] && [ -n "$nom" ] && [ -n "$description" ] \
  || abort "usage : scaffold.sh <identifiant> \"<Nom commercial>\" \"<Description>\""
[[ "$slug" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]] \
  || abort "identifiant '$slug' invalide (minuscules, chiffres et tirets, ex. boulangerie-martin)."

skill_dir="$(cd "$(dirname "$0")/.." && pwd)"
templates="$skill_dir/templates"
root="$(git -C "$skill_dir" rev-parse --show-toplevel 2>/dev/null)" \
  || abort "le skill n'est pas dans un dépôt git."
site="$root/sites/$slug"
[ -e "$site" ] && abort "le dossier sites/$slug existe déjà."
command -v node >/dev/null && command -v npm >/dev/null || abort "Node.js et npm sont requis."

if [[ "$slug" == demo-* ]]; then type="Démo (versionnée dans le dépôt public)"
else type="Client (dépôt git privé)"
fi

# 1. Projet Next.js (version majeure figée pour des créations reproductibles)
step "Création du projet Next.js…"
mkdir -p "$root/sites"
npx --yes create-next-app@16 "$site" \
  --ts --eslint --tailwind --app --src-dir --import-alias "@/*" \
  --use-npm --disable-git --agents-md --yes >/dev/null 2>&1 \
  || abort "échec de create-next-app (connexion internet ?)."
cd "$site" || abort "dossier $site inaccessible."

# 2. Outils de qualité
step "Installation de Prettier et Vitest…"
npm install --save-dev --silent prettier prettier-plugin-tailwindcss vitest >/dev/null 2>&1 \
  || abort "échec de l'installation des outils."

# 3. Scripts exigés par /verifier
step "Configuration des scripts…"
node -e '
  const fs = require("fs");
  const p = JSON.parse(fs.readFileSync("package.json", "utf8"));
  Object.assign(p.scripts, {
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "lint": "eslint --max-warnings=0",
    "typecheck": "next typegen && tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
  });
  fs.writeFileSync("package.json", JSON.stringify(p, null, 2) + "\n");
' || abort "impossible de modifier package.json."

# 4. Modèles : copiés tels quels, puis variables {{…}} remplacées
step "Application des modèles…"
cp -R "$templates/." . || abort "copie des modèles impossible."
node - "$nom" "$description" "$slug" "$type" <<'JS' || abort "remplissage des modèles impossible."
const fs = require("fs");
const [nom, description, slug, type] = process.argv.slice(2);
const valeurs = {
  NOM: nom, DESCRIPTION: description, SLUG: slug, TYPE: type,
  DATE: new Date().toISOString().slice(0, 10),
  NOM_JSON: JSON.stringify(nom), DESCRIPTION_JSON: JSON.stringify(description),
};
for (const f of ["CLAUDE.md", "README.md", "src/lib/site.ts"]) {
  const texte = fs.readFileSync(f, "utf8").replace(/\{\{(\w+)\}\}/g, (m, cle) => valeurs[cle] ?? m);
  fs.writeFileSync(f, texte);
}
JS

# Le .gitignore de Next.js exclut .env* : on réautorise le fichier d'exemple
printf '\n# modèle documenté des variables (sans valeurs réelles)\n!.env.example\n' >> .gitignore

# 5. Mise en forme du code généré
step "Mise en forme…"
npx prettier --write . >/dev/null 2>&1 || abort "échec de Prettier."

# 6. Dépôt git propre au site client
if [[ "$slug" != demo-* ]]; then
  step "Initialisation du dépôt git du client…"
  git init -q -b main && git add -A \
    && git commit -q -m "chore: crée le site avec /nouveau-site" \
    || abort "initialisation git impossible."
fi

echo
echo "✅ Site créé : sites/$slug ($type)"
