let activeRole = '';
export function setApiRole(role: string) { activeRole = role; }
export function activeRoleHeaders(): Record<string,string> { return activeRole ? { 'X-Leyisa-Role': activeRole } : {}; }
let csrfPromise:Promise<string>|undefined;
export class HttpError extends Error {
 status:number;
 details:Record<string,unknown>;
 constructor(status:number,message:string,details:Record<string,unknown>={}) {super(message);this.status=status;this.details=details;}
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
 const body=await response.json().catch(()=>null) as Record<string,unknown>|null;
 if(!response.ok) {
  if(response.status===401)window.dispatchEvent(new Event('leyisa:session-expired'));
  const message=typeof body?.message==='string'?body.message:`Erreur ${response.status}.`;
  throw new HttpError(response.status,message,body??{});
 }
 if(response.status!==204&&(body===null||typeof body!=='object'))throw new HttpError(502,'Le serveur démarre ou a renvoyé une réponse inattendue. Réessayez dans quelques instants.');
 return body as T;
}
export const post=<T,>(path:string,data:unknown)=>api<T>(path,{method:'POST',body:JSON.stringify(data)});
