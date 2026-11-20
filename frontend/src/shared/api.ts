let activeRole = '';
export function setApiRole(role: string) { activeRole = role; }
export function activeRoleHeaders(): Record<string,string> { return activeRole ? { 'X-Leyisa-Role': activeRole } : {}; }
let csrfPromise:Promise<string>|undefined;
export class HttpError extends Error {
 status:number;
 details:Record<string,unknown>;
 constructor(status:number,message:string,details:Record<string,unknown>={}) {super(message);this.status=status;this.details=details;}
}
function jsonResponse(response:Response):boolean {
 const type=(response.headers.get('content-type')??'').split(';')[0].trim().toLowerCase();
 return type==='application/json'||type.endsWith('+json');
}
async function csrf() {
 csrfPromise??=fetch('/api/v1/auth/csrf',{credentials:'same-origin'}).then(async response=>{
  if(!response.ok||!jsonResponse(response))throw new Error('Le serveur est indisponible ou en cours de démarrage. Réessayez.');
  const payload:unknown=await response.json();
  const token=payload&&typeof payload==='object'&&'csrfToken' in payload?payload.csrfToken:undefined;
  if(typeof token!=='string'||! /^[a-f0-9]{64}$/.test(token))throw new Error('Réponse de sécurité invalide. Réessayez.');
  return token;
 }).catch(error=>{csrfPromise=undefined;throw error;});return csrfPromise;
}
export async function api<T>(path:string,init:RequestInit={}):Promise<T> {
 const method=init.method??'GET';let response:Response;
 try {
  response=await fetch(`/api/v1${path}`,{...init,credentials:'same-origin',headers:{Accept:'application/json',...(!path.startsWith('/auth/')?activeRoleHeaders():{}),...(init.body?{'Content-Type':'application/json'}:{}),...(!['GET','HEAD'].includes(method)?{'X-CSRF-Token':await csrf()}:{}),...init.headers}});
 }catch(error){throw new HttpError(0,error instanceof Error?error.message:'Le serveur est injoignable.');}
 if(response.ok&&(response.status===204||response.status===205||method==='HEAD'))return undefined as T;
 if(!jsonResponse(response))throw new HttpError(503,'Le serveur a renvoyé une réponse inattendue. Réessayez.');
 let body:unknown;
 try{body=await response.json();}catch{throw new HttpError(502,'Réponse du serveur illisible. Réessayez.');}
 const details=body!==null&&typeof body==='object'&&!Array.isArray(body)?body as Record<string,unknown>:{};
 if(!response.ok) {
  if(response.status===401)window.dispatchEvent(new Event('leyisa:session-expired'));
  const message=typeof details.message==='string'?details.message:`Erreur ${response.status}.`;
  throw new HttpError(response.status,message,details);
 }
 if(body===null)throw new HttpError(502,'Réponse vide inattendue du serveur. Réessayez.');
 return body as T;
}
export const post=<T,>(path:string,data:unknown)=>api<T>(path,{method:'POST',body:JSON.stringify(data)});
