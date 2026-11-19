import { useState } from 'react';
import { ActionForm, Field, Panel, useResource } from '../../WorkspacePages';
import { post } from '../../shared/api';
type Row=Record<string,any>;
export function DeliberationPanel({students}:{students:Array<{id?:string;identity:{firstName?:string;lastName?:string;matricule?:string}}>}) {
 const [id,setId]=useState('');const result=students.find(s=>s.id===id)??students[0];
 const r=useResource<Row>(`/results/snapshots/${result?.id??'00000000-0000-0000-0000-000000000000'}/deliberation`);
 const [profileId,setProfileId]=useState(''),[courses,setCourses]=useState<string[]>([]);
 const profile=r.data?.profiles.find((p:Row)=>p.id===profileId)??r.data?.profiles[0];
 const proposal=r.data?.proposals.find((p:Row)=>p.profileId===profile?.id)?.proposal;
 return <Panel title="Délibération — profil DEMO versionné"><label>Élève<select value={result?.id??''} onChange={e=>{setId(e.target.value);setCourses([]);}}>{students.map(s=><option key={s.id} value={s.id}>{s.identity.lastName} {s.identity.firstName} — {s.identity.matricule}</option>)}</select></label>{r.error&&<p role="alert">{r.error}</p>}{r.loading?<p>Chargement…</p>:r.data&&<><p>Dernière décision : {r.data.decisions[0]?.outcome??'À examiner'}</p>{r.data.published?<p>Décision figée par publication. Une correction exceptionnelle nécessite une procédure approuvée.</p>:!profile?<p>Aucun profil de démonstration configuré pour cette année, ce cycle et ce niveau.</p>:<ActionForm key={result?.id} action={d=>post(`/results/snapshots/${result?.id}/decisions`,{...d,profileId:profile.id,courses})} done={r.refresh} label="Enregistrer la décision motivée"><label>Profil<select value={profile.id} onChange={e=>setProfileId(e.target.value)}>{r.data.profiles.map((p:Row)=><option key={p.id} value={p.id}>{p.code} · v{p.version} · DEMO</option>)}</select></label><p>Proposition du serveur : {proposal?.outcome} — {proposal?.reason}</p><Field label="Décision de la direction" name="outcome">{['A_VERIFIER','ADMIS','REPECHAGE','REDOUBLEMENT'].map(o=><option key={o}>{o}</option>)}</Field><fieldset><legend>Cours autorisés si repêchage</legend>{r.data.subjects.map((s:Row)=><label key={s.subjectId}><input type="checkbox" checked={courses.includes(s.subjectId)} onChange={e=>setCourses(old=>e.target.checked?[...old,s.subjectId]:old.filter(id=>id!==s.subjectId))}/>{s.label}</label>)}</fieldset><Field label="Motif de la décision (5 caractères minimum)" name="reason"/><p>Aucune note historique n’est modifiée. Les cas ambigus restent à vérifier.</p></ActionForm>}</>}</Panel>;
}
export function RetakeDecisionField() {
 const r=useResource<Row[]>('/results/retake-authorizations');
 return <Field label="Décision autorisant le repêchage (si applicable)" name="decisionId" required={false}><option value="">Sans repêchage</option>{r.data?.map(d=><option key={d.id} value={d.id}>{d.identity.lastName} {d.identity.firstName} — {d.identity.matricule} · {d.identity.classLabel}</option>)}</Field>;
}
