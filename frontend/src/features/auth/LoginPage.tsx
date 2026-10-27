import { useRef, useState, type FormEvent } from "react";
import "./LoginPage.css";

/**
 * LEYISA SCHOOL V1 — Module M1 Accès (Sidonie)
 * Missions J1-J2 : afficher l'écran et valider les champs requis.
 *
 * La validation des champs est locale ; l'authentification et le
 * protocole réseau restent hors périmètre tant que le contrat n'est pas décidé.
 */
export default function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [identifierError, setIdentifierError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const identifierRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextIdentifierError = identifier.trim()
      ? ""
      : "Veuillez saisir votre identifiant.";
    const nextPasswordError = password.length > 0
      ? ""
      : "Veuillez saisir votre mot de passe.";

    setIdentifierError(nextIdentifierError);
    setPasswordError(nextPasswordError);

    // Placer le curseur sur le premier champ à corriger, pour la navigation au clavier.
    if (nextIdentifierError) {
      identifierRef.current?.focus();
      return;
    }
    if (nextPasswordError) {
      passwordRef.current?.focus();
      return;
    }

    // J2 : les champs sont valides, mais aucun contrat d'authentification n'existe encore.
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
              ref={identifierRef}
              name="identifier"
              type="text"
              autoComplete="username"
              required
              aria-invalid={Boolean(identifierError)}
              aria-describedby={identifierError ? "login-identifier-error" : undefined}
              value={identifier}
              onChange={(e) => {
                const value = e.target.value;
                setIdentifier(value);
                if (value.trim()) {
                  setIdentifierError("");
                }
              }}
            />
            {identifierError && (
              <p className="login__error" id="login-identifier-error" role="alert">
                {identifierError}
              </p>
            )}
          </div>

          <div className="login__field">
            <label htmlFor="login-password">Mot de passe</label>
            <input
              id="login-password"
              ref={passwordRef}
              name="password"
              type="password"
              autoComplete="current-password"
              required
              aria-invalid={Boolean(passwordError)}
              aria-describedby={passwordError ? "login-password-error" : undefined}
              value={password}
              onChange={(e) => {
                const value = e.target.value;
                setPassword(value);
                if (value.length > 0) {
                  setPasswordError("");
                }
              }}
            />
            {passwordError && (
              <p className="login__error" id="login-password-error" role="alert">
                {passwordError}
              </p>
            )}
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
