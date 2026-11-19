import 'reflect-metadata';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readdir} from 'node:fs/promises';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {Reflector} from '@nestjs/core';
import {PATH_METADATA,METHOD_METADATA} from '@nestjs/common/constants.js';
import {SecurityGuard} from '../dist/modules/auth/security.guard.js';
import {PERMISSION_KEY} from '../dist/modules/auth/permission.guard.js';
async function files(dir){const found=[];for(const e of await readdir(dir,{withFileTypes:true})){const p=join(dir,e.name);if(e.isDirectory())found.push(...await files(p));else if(p.endsWith('.js'))found.push(p);}return found;}
test('Inventaire de toutes les routes compilées : accès déclaré et trois routes publiques seulement',async()=>{
 let count=0;const publicRoutes=[];
 for(const file of await files(new URL('../dist',import.meta.url).pathname)){
  if(file.endsWith('/main.js'))continue;
  const module=await import(pathToFileURL(file));
  for(const Controller of Object.values(module)){
   if(typeof Controller!=='function'||!Controller.prototype||Reflect.getMetadata(PATH_METADATA,Controller)===undefined)continue;
   for(const key of Object.getOwnPropertyNames(Controller.prototype)){
    const handler=Controller.prototype[key];if(typeof handler!=='function'||Reflect.getMetadata(METHOD_METADATA,handler)===undefined)continue;
    const reflector=new Reflector(),targets=[handler,Controller];count++;
    const path=`${Reflect.getMetadata(PATH_METADATA,Controller)}/${Reflect.getMetadata(PATH_METADATA,handler)}`.replace(/^\/+|\/+$/g,'');
    if(reflector.getAllAndOverride('leyisa:public',targets)){publicRoutes.push(path);continue;}
    assert.ok(reflector.getAllAndOverride(PERMISSION_KEY,targets)||reflector.getAllAndOverride('leyisa:session-only',targets),path);
   }
  }
 }
 assert.ok(count>=45);assert.deepEqual([...new Set(publicRoutes)].sort(),['auth/csrf','auth/login','health'].sort());
});
test('CSRF non ASCII est refusé403, une nouvelle route sans accès est refusée403 et auditée',async()=>{
 const audit=[];const request={method:'POST',headers:{origin:'http://127.0.0.1:5173',cookie:`leyisa_csrf=${'a'.repeat(64)}`,'x-csrf-token':'é'.repeat(64)}};
 const handler=()=>{},Controller=class{};Reflect.defineMetadata('leyisa:public',true,handler);
 const context={getHandler:()=>handler,getClass:()=>Controller,switchToHttp:()=>({getRequest:()=>request})};
 const guard=new SecurityGuard(new Reflector(),{canActivate:async()=>{request.auth={userId:null,roles:[]};return true;}},{client:{auditEntry:{create:async({data})=>audit.push(data)}}});
 await assert.rejects(()=>guard.canActivate(context),e=>e.getStatus()===403);
 Reflect.deleteMetadata('leyisa:public',handler);request.method='GET';
 await assert.rejects(()=>guard.canActivate(context),e=>e.getStatus()===403);assert.equal(audit.length,2);
});
