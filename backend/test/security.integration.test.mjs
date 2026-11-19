import 'reflect-metadata';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {fork,execFileSync} from 'node:child_process';
import {once} from 'node:events';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {request} from 'node:https';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {NestFactory} from '@nestjs/core';
import {AppModule} from '../dist/app.module.js';
import {requireLocalFixtures} from '../prisma/env.mjs';
const skip=process.env.LEYISA_V1_TESTS!=='1'?'tests V1 locaux explicites requis':false;

test('T05 — cookie de production sur connexion HTTPS réelle, certificat local vérifié',{skip,timeout:30000},async()=>{
 requireLocalFixtures();const dir=await mkdtemp(join(tmpdir(),'leyisa-tls-'));const key=join(dir,'key.pem'),cert=join(dir,'cert.pem');
 execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',key,'-out',cert,'-days','1','-subj','/CN=127.0.0.1','-addext','subjectAltName=IP:127.0.0.1'],{stdio:'ignore'});
 const child=fork(new URL('./helpers/https-server.mjs',import.meta.url),{env:{...process.env,NODE_ENV:'production',LEYISA_TLS_KEY:key,LEYISA_TLS_CERT:cert},stdio:['ignore','ignore','pipe','ipc']});
 try{
  const [{url}]=await Promise.race([once(child,'message'),once(child,'exit').then(()=>{throw new Error('Serveur HTTPS non démarré.');})]);
  const ca=await readFile(cert);let cookies='';let csrf='';
  async function call(path,data){const payload=data?JSON.stringify(data):undefined;return new Promise((resolve,reject)=>{
   const req=request(new URL(`/api/v1${path}`,url),{ca,method:data?'POST':'GET',headers:{Origin:url,Cookie:cookies,...(data?{'content-type':'application/json','content-length':Buffer.byteLength(payload),'X-CSRF-Token':csrf}:{})}},res=>{const chunks=[];res.on('data',c=>chunks.push(c));res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:JSON.parse(Buffer.concat(chunks).toString())}));});req.on('error',reject);req.end(payload);
  });}
  const token=await call('/auth/csrf');assert.equal(token.status,200);csrf=token.body.csrfToken;cookies=token.headers['set-cookie'].map(c=>c.split(';')[0]).join('; ');
  const credentials=JSON.parse(await readFile(process.env.LEYISA_DEMO_CREDENTIALS_FILE??'/tmp/leyisa-v1-credentials.json','utf8'));
  const login=await call('/auth/login',{login:credentials.ens.login,password:credentials.ens.password});assert.equal(login.status,200);
  const cookie=login.headers['set-cookie'].find(c=>c.startsWith('leyisa_session='));
  for(const flag of ['HttpOnly','Secure','SameSite=Lax','Path=/'])assert.ok(cookie.includes(flag));assert.equal(/Domain=/i.test(cookie),false);
 }finally{child.send('stop');await once(child,'exit');await rm(dir,{recursive:true,force:true});}
});

test('T13 — panne PostgreSQL réelle : 503 sans détail interne ni stack',{skip,timeout:30000},async()=>{
 requireLocalFixtures();const previous=process.env.DATABASE_URL;process.env.DATABASE_URL='postgresql://test@127.0.0.1:1/unavailable';
 let app;try{
  app=await NestFactory.create(AppModule,{logger:false,abortOnError:false});await app.listen(0,'127.0.0.1');process.env.DATABASE_URL=previous;
  const response=await fetch(`${await app.getUrl()}/school/bootstrap`,{headers:{Cookie:`leyisa_session=${'a'.repeat(43)}`}});
  assert.equal(response.status,503);const body=await response.text();assert.equal(body.includes('stack'),false);assert.equal(body.includes('Prisma'),false);assert.equal(body.includes('127.0.0.1'),false);
 }finally{process.env.DATABASE_URL=previous;await app?.close();}
});
