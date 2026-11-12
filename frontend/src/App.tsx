import { useSyncExternalStore } from 'react';
import { AssignmentsPage } from './features/assignments/AssignmentsPage';
import { LoginPage } from './features/auth';
import { StudentsPage } from './features/students/StudentsPage';
import './App.css';

const pages = [
  { hash: '#connexion', label: 'Connexion', Page: LoginPage },
  { hash: '#eleves', label: 'Élèves et inscriptions', Page: StudentsPage },
  { hash: '#affectations', label: 'Enseignants et affectations', Page: AssignmentsPage },
] as const;

function subscribeToHashChange(onChange: () => void) {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}

function getCurrentPage() {
  return pages.find(({ hash }) => hash === window.location.hash) ?? pages[0];
}

function App() {
  const currentPage = useSyncExternalStore(subscribeToHashChange, getCurrentPage);
  const { Page } = currentPage;

  return (
    <div className="leyisa-shell">
      <header className="leyisa-header">
        <span className="leyisa-header__brand">Leyisa School</span>
        <nav className="leyisa-header__nav" aria-label="Navigation principale">
          {pages.map(({ hash, label }) => (
            <a key={hash} href={hash} aria-current={hash === currentPage.hash ? 'page' : undefined}>
              {label}
            </a>
          ))}
        </nav>
      </header>
      <Page />
    </div>
  );
}

export default App;
