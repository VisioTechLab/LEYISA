import { useRef, useState, type FormEvent } from "react";
import { SchoolLogo } from "../../SchoolLogo";
import { homeHashFor, login, LoginError } from "./authApi";
import "./LoginPage.css";

/**
 * LEYISA SCHOOL V1 — Module M1 Accès (Sidonie) — wireframe W01
 * Les champs sont vérifiés ici pour le confort, puis revérifiés par
 * l'API NestJS POST /auth/login, qui ouvre la session dans Neon.
 */
export default function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [identifierError, setIdentifierError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const identifierRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

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

    setSubmitting(true);
    try {
      const user = await login(identifier, password);
      window.location.hash = homeHashFor(user);
    } catch (error) {
      // Après un échec : on garde l'identifiant et on vide le mot de passe.
      setPassword("");
      setStatus(error instanceof LoginError ? error.message : "La connexion est momentanément impossible.");
      passwordRef.current?.focus();
    } finally {
      setSubmitting(false);
    }
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

          <button className="leyisa-button login__submit" type="submit" aria-busy={submitting}>
            {submitting ? "Connexion…" : "Se connecter"}
          </button>

          {status && <p className="login__status" role="alert">{status}</p>}
          <a className="login__preview" href="#scolarite">Consulter l’espace de travail</a>
        </form>
      </section>
    </main>
  );
}
