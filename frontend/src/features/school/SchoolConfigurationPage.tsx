import './SchoolConfigurationPage.css';

const navigationItems = [
  'Accueil',
  'Scolarité',
  'Élèves / inscriptions',
  'Enseignants',
  'Évaluations / notes',
  'Validation',
  'Résultats',
  'Bulletins',
];

const program = [
  { code: 'MATH', subject: 'Mathématiques', teacher: 'À affecter' },
  { code: 'FR', subject: 'Français', teacher: 'À affecter' },
];

export function SchoolConfigurationPage() {
  return (
    <div className="school-config">
      <aside className="school-config__sidebar">
        <div className="school-config__brand">
          <span className="school-config__brand-mark" aria-hidden="true">L</span>
          <span>
            <strong>LEYISA SCHOOL</strong>
            <small>Espace de gestion</small>
          </span>
        </div>

        <nav className="school-config__nav" aria-label="Menu principal">
          <p className="school-config__nav-label">Menu principal</p>
          <ul>
            {navigationItems.map((item) => (
              <li key={item}>
                <span
                  className={item === 'Scolarité' ? 'is-active' : undefined}
                  aria-current={item === 'Scolarité' ? 'page' : undefined}
                >
                  {item}
                </span>
              </li>
            ))}
          </ul>
        </nav>

        <div className="school-config__sidebar-note">
          <strong>V1 · Démo conceptuelle</strong>
          <span>Données fictives uniquement</span>
        </div>
      </aside>

      <div className="school-config__content">
        <header className="school-config__topbar">
          <div className="school-config__breadcrumb" aria-label="Fil d’Ariane">
            <span>Leyisa School</span>
            <span aria-hidden="true">/</span>
            <span aria-current="page">Configuration scolaire</span>
          </div>
          <span className="school-config__year-chip">Année 2026–2027</span>
        </header>

        <main className="school-config__main">
          <div className="school-config__heading">
            <div>
              <h1>Configuration scolaire</h1>
              <p>Préparer l’année, les classes et les matières avant les inscriptions.</p>
            </div>
            <span className="school-config__role">Administrateur · Scolarité</span>
          </div>

          <section className="school-config__summary" aria-label="Contexte scolaire">
            <article className="school-config__summary-card">
              <h2>Année scolaire</h2>
              <p>En cours de préparation</p>
              <strong>2026–2027</strong>
            </article>
            <article className="school-config__summary-card">
              <h2>Périodes</h2>
              <p>Calendrier à confirmer</p>
              <strong>Période 1</strong>
            </article>
            <article className="school-config__summary-card">
              <h2>Classes</h2>
              <p>1 classe pour la démo</p>
              <strong>6e A</strong>
            </article>
          </section>

          <div className="school-config__workspace">
            <section className="school-config__panel" aria-labelledby="school-program-title">
              <div className="school-config__panel-heading">
                <h2 id="school-program-title">Programme de la classe</h2>
                <p>Liste des matières prévues pour la 6e A</p>
              </div>

              <div className="school-config__table-wrap">
                <table className="school-config__table">
                  <thead>
                    <tr>
                      <th scope="col">Code</th>
                      <th scope="col">Matière</th>
                      <th scope="col">Enseignant</th>
                    </tr>
                  </thead>
                  <tbody>
                    {program.map((row) => (
                      <tr key={row.code}>
                        <td>{row.code}</td>
                        <td>{row.subject}</td>
                        <td>{row.teacher}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="school-config__panel school-config__add-panel" aria-labelledby="school-add-title">
              <div className="school-config__panel-heading">
                <h2 id="school-add-title">Ajouter une matière</h2>
                <p>Référentiel scolaire partagé</p>
              </div>

              <label htmlFor="school-subject">Matière</label>
              <select id="school-subject" disabled>
                <option>Choisir une matière</option>
              </select>
              <button type="button" disabled>
                Ajouter au programme
              </button>
              <p className="school-config__notice" role="note">
                Action indisponible dans cette démo : le programme n’est pas sauvegardé.
              </p>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}