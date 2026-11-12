import { useEffect, useSyncExternalStore } from 'react';
import { AssignmentsPage } from './features/assignments/AssignmentsPage';
import { LoginPage } from './features/auth';
import { StudentsPage } from './features/students/StudentsPage';
import {
  BulletinsPreview,
  GradesPreview,
  ResultsPreview,
  SchoolPreview,
  ValidationPreview,
} from './WireframePreviews';
import { SchoolLogo } from './SchoolLogo';

const pages = [
  { hash: '#scolarite', label: 'Scolarité', title: 'Configuration scolaire', Page: SchoolPreview },
  { hash: '#eleves', label: 'Élèves / inscriptions', title: 'Élèves et inscriptions', Page: StudentsPage },
  { hash: '#affectations', label: 'Enseignants', title: 'Enseignants et affectations', Page: AssignmentsPage },
  { hash: '#notes', label: 'Évaluations / notes', title: 'Saisie des notes', Page: GradesPreview },
  { hash: '#validation', label: 'Validation', title: 'Validation des notes', Page: ValidationPreview },
  { hash: '#resultats', label: 'Résultats', title: 'Résultats et clôture', Page: ResultsPreview },
  { hash: '#bulletins', label: 'Bulletins', title: 'Bulletins scolaires', Page: BulletinsPreview },
] as const;

function subscribeToHashChange(onChange: () => void) {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}

function getCurrentPage() {
  return pages.find(({ hash }) => hash === window.location.hash);
}

function App() {
  const currentPage = useSyncExternalStore(subscribeToHashChange, getCurrentPage);
  const title = currentPage?.title ?? 'Connexion';

  useEffect(() => {
    document.title = `${title} | Leyisa School`;
  }, [title]);

  if (!currentPage) return <LoginPage />;

  const { Page } = currentPage;
  return (
    <div className="leyisa-shell">
      <aside className="leyisa-sidebar">
        <a className="leyisa-brand" href="#connexion">
          <SchoolLogo />
          <span><strong>Leyisa School</strong><small>Espace de gestion</small></span>
        </a>
        <nav className="leyisa-nav" aria-label="Navigation principale">
          <a href="#connexion">Accueil</a>
          {pages.map(({ hash, label }) => (
            <a key={hash} href={hash} aria-current={hash === currentPage.hash ? 'page' : undefined}>
              {label}
            </a>
          ))}
        </nav>
        <p className="leyisa-sidebar-note">Environnement de développement<br />Données fictives</p>
      </aside>
      <div className="leyisa-workspace">
        <header className="leyisa-topbar">
          <p><span>Leyisa School</span><span aria-hidden="true">/</span>{title}</p>
          <span className="leyisa-chip">Année 2026–2027</span>
        </header>
        <Page />
      </div>
    </div>
  );
}

export default App;
