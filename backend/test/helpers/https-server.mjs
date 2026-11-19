import 'reflect-metadata';
import {readFile} from 'node:fs/promises';
import {NestFactory} from '@nestjs/core';
import {AppModule} from '../../dist/app.module.js';
const key=await readFile(process.env.LEYISA_TLS_KEY),cert=await readFile(process.env.LEYISA_TLS_CERT);
const app=await NestFactory.create(AppModule,{logger:false,abortOnError:false,httpsOptions:{key,cert}});
app.setGlobalPrefix('api/v1',{exclude:['health']});await app.listen(0,'127.0.0.1');
const url=await app.getUrl();process.env.APP_ORIGINS=url;process.send?.({url});
process.on('message',async message=>{if(message==='stop'){await app.close();process.exit(0);}});
