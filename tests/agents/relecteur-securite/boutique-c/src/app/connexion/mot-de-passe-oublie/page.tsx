import { demanderReinitialisation } from "../actions";

export default function PageMotDePasseOublie() {
  return (
    <main>
      <h1>Mot de passe oublié</h1>
      <form action={demanderReinitialisation}>
        <input name="email" type="email" required />
        <button type="submit">Recevoir un lien</button>
      </form>
    </main>
  );
}
