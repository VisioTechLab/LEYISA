import { useRef, useState, type FormEvent } from "react";
import { SchoolLogo } from "../../SchoolLogo";
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
  const [status, setStatus] = useState("");
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

    setStatus("");
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

    setStatus("La connexion au compte est en cours d’intégration. Vous pouvez consulter l’espace de travail ci-dessous.");
  }

  return (
    <main className="login">
      <section className="login__brand" aria-label="Présentation de Leyisa School">
        <div className="login__logo"><SchoolLogo label="Leyisa School" /></div>
        <div className="login__presentation">
          <p className="login__headline">Gérer la scolarité,<br />suivre les résultats.</p>
          <p className="login__tagline">
            De l’inscription au bulletin, un parcours commun pour l’administration et les enseignants.
          </p>
        </div>
        <p className="login__signature">Visio Tech</p>
      </section>

      <section className="login__panel">
        <form className="login__form" onSubmit={handleSubmit} noValidate>
          <h1 className="login__title">Connexion</h1>
          <p className="login__intro">Accédez à votre espace de travail.</p>

          <div className="login__field">
            <label htmlFor="login-identifier">Identifiant</label>
            <input
              id="login-identifier"
              ref={identifierRef}
              name="identifier"
              type="text"
              autoComplete="username"
              placeholder="Saisir l’identifiant"
              required
              aria-invalid={Boolean(identifierError)}
              aria-describedby={identifierError ? "login-identifier-error" : undefined}
              value={identifier}
              onChange={(e) => {
                setStatus("");
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
                setStatus("");
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

          <button className="leyisa-button login__submit" type="submit">
            Se connecter
          </button>

          {status && <p className="login__status" role="status">{status}</p>}
          <a className="login__preview" href="#scolarite">Consulter l’espace de travail</a>
        </form>
      </section>
    </main>
  );
}
