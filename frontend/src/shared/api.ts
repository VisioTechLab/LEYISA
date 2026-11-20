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
 csrfPromise??=api<{csrfToken:string}>('/auth/csrf').then(body=>{
  if(typeof body?.csrfToken!=='string'||!/^[a-f0-9]{64}$/.test(body.csrfToken))throw new HttpError(502,'La protection de session est momentanément indisponible. Réessayez.');
  return body.csrfToken;
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
 if(response.status!==204&&(body===null||typeof body!=='object'))throw new HttpError(502,'Le serveur démarre ou a renvoyé une réponse inattendue. Réessayez dans quelques instants.');
 return body as T;
}
export const post=<T,>(path:string,data:unknown)=>api<T>(path,{method:'POST',body:JSON.stringify(data)});
