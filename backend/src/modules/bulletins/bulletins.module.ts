import { Controller, ForbiddenException, Get, Module, NotFoundException, Param, Post, Res } from "@nestjs/common";
import { PDFDocument, rgb, type PDFFont } from "pdf-lib";
import fontkit from '@pdf-lib/fontkit';
import {readFile} from 'node:fs/promises';
import { PrismaService } from "../../common/prisma.service.js";
import { PrismaModule } from "../../common/prisma.module.js";
import { object, uuid } from "../../common/input.js";
import { CurrentAuth } from "../auth/session.guard.js";
import { Requires } from "../auth/permission.guard.js";
import type { AuthContext } from "../auth/auth-context.js";

@Controller("bulletins")
export class BulletinsController {
 constructor(private readonly prisma:PrismaService) {}
 @Get() @Requires("bulletins.download")
 async list(@CurrentAuth() auth:AuthContext) {
  const staff=auth.roles.some(r=>r==='DIR'||r==='SEC');
  const rows=await this.prisma.client.resultSnapshot.findMany({where:{classPeriod:{publishedAt:{not:null}},...(!staff?{enrollment:{student:{userId:auth.userId}}}:{})},select:{id:true,identitySnapshot:true,calculationProfile:true},orderBy:{id:'asc'},take:500});return rows;
 }
 private async load(raw:string,auth:AuthContext) {
  const id=uuid(raw);
  const result=await this.prisma.client.resultSnapshot.findUnique({where:{id},include:{classPeriod:true,enrollment:{include:{student:true}},decisions:{orderBy:{version:'desc'},take:1}}});
  if(!result||!result.classPeriod.publishedAt)throw new NotFoundException("Bulletin publié introuvable.");
  if(!auth.roles.some(r=>r==='DIR'||r==='SEC')&&result.enrollment.student.userId!==auth.userId)throw new ForbiddenException("Ce bulletin ne vous appartient pas.");
  return result;
 }
 @Get(":id") @Requires("bulletins.download")
 async detail(@Param("id") raw:string,@CurrentAuth() auth:AuthContext) {
  const result=await this.load(raw,auth);return {id:result.id,identity:{...object(result.identitySnapshot),decision:result.decisions[0]?.outcome??object(result.identitySnapshot).decision},subjects:result.subjectResults,profile:result.calculationProfile};
 }
 @Post(":id/generate") @Requires("bulletins.produce")
 async generate(@Param("id") raw:string,@CurrentAuth() auth:AuthContext) {
  const result=await this.load(raw,auth);
  return this.prisma.client.$transaction(async tx=>{
   // Création idempotente : aucune réécriture d'un document déjà enregistré.
   await tx.reportCard.createMany({data:[{resultSnapshotId:result.id,templateVersion:'DEMO-V1.3',notice:'DEMO-V1'}],skipDuplicates:true});
   const report=await tx.reportCard.findUnique({where:{resultSnapshotId_templateVersion:{resultSnapshotId:result.id,templateVersion:'DEMO-V1.3'}}});
   await tx.auditEntry.create({data:{actorId:auth.userId,action:'REPORT_GENERATED',targetType:'ReportCard',targetId:report!.id}});return report;
  });
 }
 @Get(":id/pdf") @Requires("bulletins.download")
 async pdf(@Param("id") raw:string,@CurrentAuth() auth:AuthContext,@Res() response:any) {
  const result=await this.load(raw,auth);
  const bytes=await renderBulletin({...object(result.identitySnapshot),decision:result.decisions[0]?.outcome??object(result.identitySnapshot).decision},result.subjectResults as unknown as Record<string,unknown>[]);
  response.setHeader('Content-Type','application/pdf');response.setHeader('Content-Disposition',`attachment; filename="bulletin-${result.id}.pdf"`);response.setHeader('Cache-Control','private, no-store');response.send(Buffer.from(bytes));
 }
}

/** Trois dispositions ; aucune formule de résultats n'est recalculée ici. */
export async function renderBulletin(identity:Record<string,unknown>,subjects:Record<string,unknown>[]) {
 const doc=await PDFDocument.create();doc.setTitle('Bulletin scolaire DEMO-V1');doc.setAuthor('LEYISA SCHOOL');doc.setCreationDate(new Date(0));doc.setModificationDate(new Date(0));
 doc.registerFontkit(fontkit);
 const font=await doc.embedFont(await readFile(new URL('../../../assets/fonts/LiberationSans-Regular.ttf',import.meta.url)),{subset:true});
 const bold=await doc.embedFont(await readFile(new URL('../../../assets/fonts/LiberationSans-Bold.ttf',import.meta.url)),{subset:true});
 const maternal=identity.cycle==='MATERNEL',primary=identity.cycle==='PRIMAIRE';
 const size:[number,number]=maternal?[842,595]:[595,842];let page=doc.addPage(size),y=size[1]-35;
 const margin=28,width=size[0]-56;
 function safe(v:unknown) {return String(v??'').replace(/[–—]/g,'-').replace(/[’]/g,"'").replace(/[^\x0a\x20-\x7e\xa0-\xff]/g,' ');}
 function line(value:unknown,fontSize=9,heavy=false) {
  const f=heavy?bold:font;const words=safe(value).split(/\s+/);let current='';const lines:string[]=[];
  for(const word of words){if(current&&f.widthOfTextAtSize(current+' '+word,fontSize)>width){lines.push(current);current=word;}else current+=(current?' ':'')+word;}lines.push(current);
  for(const text of lines){if(y<60){page=doc.addPage(size);y=size[1]-35;}page.drawText(text,{x:margin,y,size:fontSize,font:f});y-=fontSize+(maternal?5:8);}
 }
 function fit(value:unknown,space:number,f:PDFFont,fontSize:number) {let v=safe(value);while(v&&f.widthOfTextAtSize(v,fontSize)>space-8)v=v.slice(0,-1);return v;}
 let tableHeader:{values:unknown[];widths:number[];height:number}|undefined;
 function row(values:unknown[],widths:number[],height=29,header=false) {
  const cells=values.map((value,i)=>{
   if(i!==0||header)return safe(value).split('\n');
   const lines:string[]=[];let current='';
   for(const word of safe(value).split(/\s+/)){if(current&&font.widthOfTextAtSize(current+' '+word,8)>widths[i]-8){lines.push(current);current=word;}else current+=(current?' ':'')+word;}
   lines.push(current);return lines;
  });
  height=Math.max(height,...cells.map(c=>c.length*10+6));
  if(y-height<55) {page=doc.addPage(size);y=size[1]-35;line('DEMO-V1',12,true);if(tableHeader&&!header)row(tableHeader.values,tableHeader.widths,tableHeader.height,true);}
  if(header)tableHeader={values,widths,height};
  let x=margin;
  values.forEach((value,i)=>{
   page.drawRectangle({x,y:y-height,width:widths[i],height,borderColor:rgb(.3,.35,.38),borderWidth:.4,...(header?{color:rgb(.9,.94,.95)}:{})});
   cells[i].forEach((v,n)=>page.drawText(fit(v,widths[i],header?bold:font,header?7:8),{x:x+4,y:y-12-n*10,size:header?7:8,font:header?bold:font}));x+=widths[i];
  });y-=height;
 }
 const school=object(identity.school??{});
 line('REPUBLIQUE DEMOCRATIQUE DU CONGO',11,true);
 line('DEMO-V1',18,true);
 line(school.name||'Établissement fictif LEYISA',13,true);
 line(`Province : ${school.province??''}    Ville / territoire : ${school.city??''}    Commune : ${school.commune??''}`);
 line(`Code école : ${school.code??''}    Année scolaire : ${identity.yearCode??''}`);
 line(maternal?"CARTE D'APPRECIATION PERIODIQUE":primary?"BULLETIN PRIMAIRE - SYNTHÈSES TRIMESTRIELLES":"BULLETIN SECONDAIRE",11,true);
 line(`Élève : ${identity.lastName??''} ${identity.postName??''} ${identity.firstName??''}    Sexe : ${identity.sex??''}`);
 line(`Classe : ${identity.classLabel??''}    Niveau / option : ${identity.level??''} ${identity.optionCode??''}    ${identity.periodLabel??''}`);
 line(`Matricule : ${identity.matricule??''}    N° permanent : ${identity.permanentNumber??''}`);
 if(!maternal)line(`Né(e) à : ${identity.birthPlace??''}    Le : ${identity.birthDate??''}`);
 y-=5;
 function component(subject:Record<string,unknown>,code:string):Record<string,unknown>|undefined {
  if(identity.periodCode===code)return subject;
  const components=subject.components as Record<string,Record<string,unknown>>|undefined;
  if(components?.[code])return components[code];
  for(const child of Object.values(components??{})) {const found=componentNested(child,code);if(found)return found;}
 }
 function componentNested(subject:Record<string,unknown>,code:string):Record<string,unknown>|undefined {
  const children=subject.components as Record<string,Record<string,unknown>>|undefined;
  if(children?.[code])return children[code];for(const child of Object.values(children??{})){const found=componentNested(child,code);if(found)return found;}
 }
 function cell(value:Record<string,unknown>|undefined) {return value?value.nonApplicable?'N/A':value.earned===null?'':`${value.earned}\n/${value.maximum}`:'';}
 if(maternal) {
  const widths=[250,...Array(6).fill(0).flatMap(()=>[28,28,28])];
  row(['ATTITUDES',...Array.from({length:6},(_,i)=>[`P${i+1}`,`P${i+1}`,`P${i+1}`]).flat()],widths,18,true);
  row(['',...Array.from({length:6},()=>['QTE','QLT','COUL']).flat()],widths,18,true);
  for(const subject of subjects) {
   const values:unknown[]=[subject.label];
   for(let i=1;i<=6;i++) {const c=component(subject,`P${i}`);const app=Array.isArray(c?.appreciation)?c.appreciation[0] as Record<string,unknown>|undefined:undefined;values.push(app?.QTE??'',app?.QLT??'',app?.COUL??'');}
   row(values,widths,20);
  }
  y-=15;line('Légende DEMO : D1 / D2 / D3, codes fictifs. Signification officielle QTE / QLT / COUL à confirmer.',8);
  line('Observation :');
 } else {
  const codes=primary?['T1','T2','T3','ANNEE']:['P1','P2','E1','S1','P3','P4','E2','S2','ANNEE'];
  const widths=primary?[215,75,75,75,99]:[161,...Array(9).fill(42)];
  row(['BRANCHES',...codes.map(c=>c==='ANNEE'?'TG':c)],widths,28,true);
  for(const subject of subjects)row([subject.label,...codes.map(code=>code==='ANNEE'&&identity.kind==='ANNUEL'?cell(subject):cell(component(subject,code)))],widths,30);
  y-=16;
  line(`TOTAL : ${identity.totalEarned??''} / ${identity.totalMaximum??''}    POURCENTAGE : ${identity.percentage??''} %`,10,true);
  line(`Rang / effectif : ${identity.rank??'NC'} / ${identity.effectif??''}    Décision : ${identity.decision??'A_VERIFIER'}`);
  line('Application / conduite :                         Repêchage :');
  if(primary)line('Les colonnes T1/T2/T3 représentent les synthèses des trimestres : choix DEMO explicite.',8);
 }
 line(`Profil : ${identity.profile??''}    Programme : ${identity.programVersion??''}`,8);
 line('Observations :');line('Titulaire / institutrice :                 Direction :                 Parent / tuteur :',8);
 line('Signatures :                              Sceau :',8);
 for(const [index,p] of doc.getPages().entries())p.drawText(`DEMO-V1 | ${index+1}/${doc.getPageCount()}`,{x:margin,y:20,size:8,font});
 return doc.save({useObjectStreams:false});
}
@Module({imports:[PrismaModule],controllers:[BulletinsController]})
export class BulletinsModule {}
