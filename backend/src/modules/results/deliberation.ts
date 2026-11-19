import { Decimal } from "@prisma/client/runtime/client";

/** Proposition réversible : la décision finale reste un acte motivé de la direction. */
export function proposeDecision(subjects:Array<{earned:string|null;maximum:string;nonApplicable?:boolean}>,config:{admissionThreshold:string;failureThreshold:string}) {
 const applicable=subjects.filter(s=>!s.nonApplicable);
 if(!applicable.length||applicable.some(s=>s.earned===null))return {outcome:'A_VERIFIER',reason:'Résultat incomplet.',percentage:null,failures:null};
 const maximum=applicable.reduce((sum,s)=>sum.add(s.maximum),new Decimal(0));
 if(maximum.isZero())return {outcome:'A_VERIFIER',reason:'Aucun maximum applicable.',percentage:null,failures:null};
 const total=applicable.reduce((sum,s)=>sum.add(s.earned!),new Decimal(0));
 const percentage=total.div(maximum).mul(100);
 const failures=applicable.filter(s=>new Decimal(s.earned!).mul(100).lt(new Decimal(s.maximum).mul(config.failureThreshold))).length;
 const direct=percentage.gte(config.admissionThreshold)&&failures===0;
 return {outcome:direct?'ADMIS':'A_VERIFIER',reason:direct?'Seuil du profil DEMO atteint, sans échec.':'Décision motivée requise ; aucune péréquation ou sanction automatique.',percentage:percentage.toString(),failures};
}
/** Référence locale Les Ovations ; aucune extrapolation à une autre pondération. */
export function sourceTolerance(maximum:string) {
 const values:Record<string,string>={'480':'24','400':'20','360':'18','320':'16','240':'12','160':'8','80':'5'};
 return {value:values[maximum]??null,status:'REFERENCE_A_VERIFIER',exception:maximum==='80',automaticTransfer:false};
}
