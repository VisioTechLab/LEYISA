import {readFile,readdir,stat} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {resolve,join,relative} from 'node:path';
const root=resolve(import.meta.dirname,'../..');
const tracked=execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{cwd:root}).toString().split('\0').filter(Boolean);
const errors=[];
const rules=[[/github_pat_[A-Za-z0-9_]{30,}/,'jeton GitHub'],[/gh[pousr]_[A-Za-z0-9]{30,}/,'jeton GitHub'],[/-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/,'clé privée'],[/postgres(?:ql)?:\/\/[^\s"'<>]*:[^\s"'<>@]+@[^\s"'<>/]*(?:neon\.tech|neon\.build)/i,'URL PostgreSQL distante avec secret']];
for(const name of tracked){if(!/\.(?:[cm]?[jt]sx?|json|ya?ml|md|sql|toml|html|css)$/.test(name)&&!name.startsWith('.env'))continue;const text=await readFile(join(root,name),'utf8').catch(()=>null);if(text===null)continue;for(const [pattern,label] of rules)if(pattern.test(text))errors.push(`${name}: ${label}`);}
async function walk(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const path=join(dir,entry.name);if(entry.isDirectory())await walk(path);else if(/\.(?:js|html|css)$/.test(entry.name)){const text=await readFile(path,'utf8');for(const [pattern,label] of rules)if(pattern.test(text))errors.push(`${relative(root,path)}: ${label}`);if(/DATABASE_URL|DIRECT_DATABASE_URL|passwordHash|leyisa\.sessionToken|Bearer /.test(text))errors.push(`${relative(root,path)}: donnée serveur ou jeton dans le bundle`);}}}
await walk(join(root,'frontend/dist'));
execFileSync('git',['diff','--check'],{cwd:root,stdio:'inherit'});
if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}else console.log('Hygiène Git et motifs de secrets vérifiés ; aucune valeur sensible détectée dans les sources et bundles inspectés. Ce contrôle ne constitue pas une certification exhaustive.');
