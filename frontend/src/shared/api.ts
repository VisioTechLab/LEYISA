let csrfPromise:Promise<string>|undefined;
export class HttpError extends Error {
 status:number;
 details:Record<string,unknown>;
 constructor(status:number,message:string,details:Record<string,unknown>={}) {super(message);this.status=status;this.details=details;}
}
async function csrf() {
 csrfPromise??=fetch('/api/v1/auth/csrf',{credentials:'same-origin'}).then(async response=>{
  if(!response.ok)throw new Error('Le serveur est indisponible.');
  return (await response.json() as {csrfToken:string}).csrfToken;
 }).catch(error=>{csrfPromise=undefined;throw error;});return csrfPromise;
}
export async function api<T>(path:string,init:RequestInit={}):Promise<T> {
 const method=init.method??'GET';let response:Response;
 try {
  response=await fetch(`/api/v1${path}`,{...init,credentials:'same-origin',headers:{Accept:'application/json',...(init.body?{'Content-Type':'application/json'}:{}),...(!['GET','HEAD'].includes(method)?{'X-CSRF-Token':await csrf()}:{}),...init.headers}});
 }catch(error){throw new HttpError(0,error instanceof Error?error.message:'Le serveur est injoignable.');}
 const body=await response.json().catch(()=>null) as Record<string,unknown>|null;
 if(!response.ok) {
  if(response.status===401)window.dispatchEvent(new Event('leyisa:session-expired'));
  const message=typeof body?.message==='string'?body.message:`Erreur ${response.status}.`;
  throw new HttpError(response.status,message,body??{});
 }
 return body as T;
}
export const post=<T,>(path:string,data:unknown)=>api<T>(path,{method:'POST',body:JSON.stringify(data)});
