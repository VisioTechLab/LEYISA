import type { ReactNode } from 'react';
import { useSession } from './session';
import { roleNames } from './navigation';

const screens: Record<string, string> = Object.fromEntries([
 ['comptes','02'],['scolarite','03'],['classes','04'],['programme','05'],
 ['enseignants','06'],['affectations','07'],['eleves','08'],['dossier','09'],
 ['historique','10'],['inscription','11'],['bulletins','12'],['cours','13'],
 ['evaluations','14'],['evaluation','15'],['notes','16'],['soumission','17'],
 ['corrections','18'],['validation','19'],['detail-soumission','20'],['rejet','21'],
 ['previsualisation','22'],['cloture','23'],['resultats','24'],['bulletin','25'],
 ['audit','26'],['acces','27'],
].map(([route, number]) => [`#${route}`, `W${number}`]));

export function PageHeading({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
 const user = useSession();
 const route = window.location.hash.split('?')[0];
 return <header className="leyisa-page-heading">
  <div><p className="leyisa-eyebrow">LEYISA SCHOOL / {user ? roleNames[user.roles[0]] : ''}</p><h1>{title}</h1>{description && <p>{description}</p>}</div>
  <div className="leyisa-heading-actions"><span className="leyisa-screen">{screens[route] ?? 'Accueil'}</span>{action}</div>
 </header>;
}
