import { useState, type FormEvent } from "react";
import "./LoginPage.css";

/**
 * LEYISA SCHOOL V1 — Module M1 Accès (Sidonie)
 * Mission J1 : afficher l'écran de connexion.
 *
 * Volontairement hors périmètre J1 :
 * - aucun appel réseau : endpoint et protocole d'authentification non décidés
 *   (voir docs/contrats-api.md) ;
 * - aucune vérification des champs (mission J2).
 */
export default function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // J1 : pas d'authentification. Le branchement viendra après accord sur le contrat auth.
  }

  return (
    <main className="login">
      <section className="login__brand" aria-hidden="true">
        <p className="login__school">Leyisa School</p>
        <p className="login__tagline">
          Inscriptions, notes et bulletins de l’établissement, au même endroit.
        </p>
      </section>

      <section className="login__panel">
        <form className="login__form" onSubmit={handleSubmit} noValidate>
          <h1 className="login__title">Connexion</h1>
          <p className="login__intro">
            Utilisez l’identifiant fourni par l’administration de l’école.
          </p>

          <div className="login__field">
            <label htmlFor="login-identifier">Identifiant</label>
            <input
              id="login-identifier"
              name="identifier"
              type="text"
              autoComplete="username"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
            />
          </div>

          <div className="login__field">
            <label htmlFor="login-password">Mot de passe</label>
            <input
              id="login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button className="login__submit" type="submit">
            Se connecter
          </button>

          <p className="login__demo">Version de démonstration, non officielle</p>
        </form>
      </section>
    </main>
  );
}
