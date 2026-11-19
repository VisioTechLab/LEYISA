import { useState } from 'react';
import { api } from '../../shared/api';
import type { EvaluationDetail } from './evaluationsApi';

export function AppreciationsGrid({detail,onChange}:{detail:EvaluationDetail;onChange:(d:EvaluationDetail)=>void}) {
 const [values,setValues]=useState<Record<string,Record<string,string>>>(()=>Object.fromEntries(detail.grades.map(g=>[g.enrollmentId,{QTE:'',QLT:'',COUL:'',observation:'',...g.appreciation}])));
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
 async function save(submit=false) {
  if(busy)return;if(submit&&!window.confirm('Soumettre les appréciations ? La version envoyée sera conservée et verrouillée.'))return;
  setBusy(true);try{
   const saved=await api<EvaluationDetail>(`/evaluations/${detail.id}/grades`,{method:'PUT',body:JSON.stringify({version:detail.version,grades:detail.grades.map(g=>({enrollmentId:g.enrollmentId,score:null,status:'PRESENT',appreciation:values[g.enrollmentId]}))})});
   const next=submit?await api<EvaluationDetail>(`/evaluations/${detail.id}/submission`,{method:'POST',body:JSON.stringify({version:saved.version})}):saved;
   onChange(next);setMessage(submit?'Appréciations soumises.':'Appréciations enregistrées.');
  }catch(error){setMessage(error instanceof Error?error.message:'Action impossible.');}finally{setBusy(false);}
 }
 return <section className="leyisa-card"><h2>Appréciations maternelles</h2><p>Colonnes QTE / QLT / COUL conservées. D1, D2 et D3 sont des codes de démonstration ; leur légende officielle reste à confirmer.</p><div className="leyisa-table-wrap"><table><thead><tr><th>Élève</th><th>QTE</th><th>QLT</th><th>COUL</th><th>Observation</th></tr></thead><tbody>{detail.grades.map(g=><tr key={g.enrollmentId}><td>{g.lastName} {g.firstName}</td>{['QTE','QLT','COUL'].map(k=><td key={k}><label className="sr-only" htmlFor={`${g.enrollmentId}-${k}`}>{k} de {g.firstName}</label><select id={`${g.enrollmentId}-${k}`} disabled={!detail.editable||busy} value={values[g.enrollmentId]?.[k]??''} onChange={e=>setValues(v=>({...v,[g.enrollmentId]:{...v[g.enrollmentId],[k]:e.target.value}}))}><option value="">Non saisi</option>{['D1','D2','D3'].map(v=><option key={v}>{v}</option>)}</select></td>)}<td><input aria-label={`Observation de ${g.firstName}`} disabled={!detail.editable||busy} maxLength={500} value={values[g.enrollmentId]?.observation??''} onChange={e=>setValues(v=>({...v,[g.enrollmentId]:{...v[g.enrollmentId],observation:e.target.value}}))}/></td></tr>)}</tbody></table></div>{detail.editable&&<div className="evaluations-actions"><button disabled={busy} onClick={()=>void save()}>Enregistrer les appréciations</button><button className="leyisa-button" disabled={busy} onClick={()=>void save(true)}>Soumettre les appréciations</button></div>}{message&&<p role="status">{message}</p>}</section>;
}
