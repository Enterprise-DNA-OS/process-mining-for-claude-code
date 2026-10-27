#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {getDb,REPO_ROOT} from './lib/db.mjs';
import {parseCsv,pick} from './lib/csv.mjs';
import {table} from './lib/format.mjs';

export const commands={
 help:'', processes:'', cases:'process', show:'process', variants:'process', bottlenecks:'process', rework:'process',
 'case-review':'process', checkpoints:'process', 'checkpoint-review':'process', actions:'process', attention:'process', compliance:'process', insights:'', history:'',
 add:'code name owner purpose terminal sla-hours stale-hours retention-review actor',
 configure:'owner purpose terminal sla-hours stale-hours retention-review actor',
 review:'evidence actor', 'add-case':'process code name actor', 'case-state':'process state note actor',
 'add-event':'process key activity start end resource role actor',
 'add-checkpoint':'process code before after source actor',
 'add-action':'process case code title owner due actor', 'complete-action':'resolution actor', log:'note actor',
 import:'process source dry-run actor case-column activity-column start-column end-column resource-column role-column timezone',
 export:'out format process', 'weekly-review':'process', 'draft-case':'process'
};
const mutators=new Set(['add','configure','review','add-case','case-state','add-event','add-checkpoint','add-action','complete-action','log','import']);
const sha=s=>createHash('sha256').update(s).digest('hex');
const required=(o,k)=>{if(typeof o[k]!=='string'||!o[k].trim())throw Error(`Required --${k}=value`);return o[k].trim();};
const number=(v)=>{const n=Number(v);if(!Number.isFinite(n)||n<=0)throw Error('Expected positive number');return n;};
function day(v){if(!/^\d{4}-\d{2}-\d{2}$/.test(v)||new Date(v+'T00:00:00Z').toISOString().slice(0,10)!==v)throw Error('Use a valid YYYY-MM-DD date');return v;}
function instant(v,zone){
 let s=String(v).trim().replace(' ','T');
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})?$/.test(s))throw Error(`Invalid ISO timestamp: ${v}`);
 day(s.slice(0,10));
 const time=s.slice(11).match(/^(\d{2}):(\d{2})(?::(\d{2}))?/);
 if(Number(time[1])>23||Number(time[2])>59||Number(time[3]||0)>59)throw Error('Invalid clock time');
 if(!/(Z|[+-]\d{2}:\d{2})$/.test(s)){if(!zone||!/^([+-](0\d|1[0-4]):[0-5]\d|Z)$/.test(zone))throw Error('Timestamp needs an offset, or --timezone=+12:00 for a fixed-offset source');s+=zone;}
 const d=new Date(s);if(!Number.isFinite(d.getTime())||d.getTime()>Date.now())throw Error('Invalid or future event timestamp');return d.toISOString();
}
function parse(argv){const [cmd='help',...tail]=argv;const args=[],o={};if(!(cmd in commands))throw Error(`Unknown command ${cmd}. Use help.`);
 for(const a of tail){if(a.startsWith('--')){const i=a.indexOf('=');const k=a.slice(2,i<0?undefined:i);if(k in o)throw Error(`Repeated --${k}`);o[k]=i<0?true:a.slice(i+1);}else args.push(a);}
 for(const k of Object.keys(o))if(!['json',...commands[cmd].split(' ')].includes(k))throw Error(`Unknown flag --${k} for ${cmd}`);
 if(o['dry-run']!==undefined&&o['dry-run']!==true)throw Error('Use bare --dry-run');
 return {cmd,args,o};
}
async function match(db,tableName,q,processId=null){
 if(!q)throw Error(`Supply a ${tableName} code, name or ID prefix`);
 const columns={processes:'name',cases:'name',actions:'title'};const col=columns[tableName];
 const rows=await db.query(`select * from ${tableName} ${processId?'where process_id=$1':''} order by code`,processId?[processId]:[]);
 const s=q.toLowerCase();let hits=rows.filter(r=>r.code.toLowerCase()===s||r.id===s);
 if(!hits.length)hits=rows.filter(r=>r.id.toLowerCase().startsWith(s)||r[col].toLowerCase().includes(s));
 if(hits.length!==1)throw Error(`${hits.length?'Ambiguous':'No match'} ${q}. Candidates: ${ (hits.length?hits:rows).map(r=>`${r.code} (${r.id.slice(0,8)}): ${r[col]}`).join('; ')}`);
 return hits[0];
}
export function human(value){
 if(Array.isArray(value)){if(!value.length)return '(none)';const rows=value.map(r=>Object.fromEntries(Object.entries(r).map(([k,v])=>[k,v instanceof Date?v.toISOString():typeof v==='object'&&v!==null?JSON.stringify(v):v])));return table(rows,Object.keys(rows[0]).map(key=>({key,label:key.replaceAll('_',' '),width:75})));}
 if(value&&typeof value==='object')return Object.entries(value).map(([k,v])=>Array.isArray(v)?`\n${k}\n${human(v)}`:`${k}: ${typeof v==='object'?JSON.stringify(v):v}`).join('\n');return String(value);
}
const insights=[
 ['Which open cases exceed their target without an improvement owner?',"select code,process,elapsed_open_hours from case_summary where state='open' and elapsed_open_hours>sla_hours and open_actions=0"],
 ['Which repeated steps have no open improvement action?',"select code,process,repeated_steps from case_summary where repeated_steps>0 and open_actions=0"],
 ['Which closed cases still have an unresolved checkpoint finding?',"select distinct s.code,s.process from case_summary s join checkpoint_findings f on f.case_id=s.id where s.state='closed'"],
 ['Which observed paths combine repeated work and completed cases?',"select process,path,cases,mean_closed_hours from variant_summary where repeated_steps>0 and closed_cases>0"],
 ['Which handovers have gaps longer than the local quiet-work threshold?',"select t.process,t.previous_activity,t.activity,t.max_gap_hours from transition_summary t join processes p on p.id=t.process_id where t.max_gap_hours>p.stale_hours"],
 ['Which cases have no activity history at all?',"select code,process,state from case_summary where event_count=0"],
 ['Which imported histories still need an accuracy review?',"select p.code process,i.source,i.row_count from imports i join processes p on p.id=i.process_id where p.reviewed_at is null or p.reviewed_at<i.updated_at"],
 ['Which processes have retention reviews due while work remains open?',"select distinct p.code process,p.retention_review from processes p join cases c on c.process_id=p.id where c.state='open' and (p.retention_review is null or p.retention_review<=current_date)"],
 ['Which cases have simultaneous starts that make sequence uncertain?',"select distinct process,case_code from event_sequence where simultaneous_starts>1"],
 ['Which overdue actions belong to cases already marked closed?',"select a.code,a.title,c.code case_code from actions a join cases c on c.id=a.case_id where a.state='open' and a.due<current_date and c.state='closed'"]
];
export const questions=insights.map(x=>x[0]);

export async function run(db,argv){
 const {cmd,args,o}=parse(argv);
 const nargs={show:1,history:1,configure:1,review:1,'case-state':1,'add-event':1,'complete-action':1,log:1,'draft-case':1,import:2};
 if(args.length!==(nargs[cmd]||0))throw Error(`${cmd} expects ${nargs[cmd]||0} positional argument(s)`);
 if(cmd==='help')return Object.entries(commands).map(([command,flags])=>({command,flags:flags?flags.split(' ').map(x=>'--'+x).join(' '):''}));
 let p=o.process?await match(db,'processes',required(o,'process')):null;
 const scoped=async(view,columns='*',order='')=>db.query(`select ${columns} from ${view}${p?' where process_id=$1':''}${order?' order by '+order:''}`,p?[p.id]:[]);
 if(cmd==='processes')return db.query('select code,name,owner,sla_hours,stale_hours,retention_review from processes order by code');
 if(cmd==='cases')return scoped('case_summary','code,process,state,event_count,observed_hours,elapsed_open_hours,repeated_steps,open_actions','process,code');
 if(cmd==='show'||cmd==='draft-case'){
  const c=await match(db,'cases',args[0],p?.id);const result={case:await db.query('select * from case_summary where id=$1',[c.id]),events:await db.query('select activity,started_at,ended_at,resource,role from events where case_id=$1 order by started_at,event_key',[c.id]),checkpoints:await db.query('select checkpoint,finding,source_ref from checkpoint_findings where case_id=$1',[c.id]),actions:await db.query('select code,title,owner,due,state,resolution from actions where case_id=$1 order by due',[c.id])};
  if(cmd==='show')return result;return draft(`case-${c.id}`,result);
 }
 if(cmd==='variants')return scoped('variant_summary','process,path,cases,closed_cases,mean_closed_hours,repeated_steps','process,cases desc,path');
 if(cmd==='bottlenecks')return scoped('transition_summary','process,previous_activity,activity,occurrences,measured_gaps,mean_gap_hours,max_gap_hours,overlapping_events','max_gap_hours desc nulls last,process,activity');
 if(cmd==='rework')return db.query(`select process,code,repeated_steps,open_actions from case_summary where repeated_steps>0${p?' and process_id=$1':''} order by repeated_steps desc,code`,p?[p.id]:[]);
 if(cmd==='case-review')return scoped('case_summary','process,code,state,observed_hours,elapsed_open_hours,quiet_hours,sla_hours','process,code');
 if(cmd==='checkpoints')return scoped('checkpoints','code,before_activity,after_activity,source_ref','code');
 if(cmd==='checkpoint-review')return scoped('checkpoint_findings','process,case_code,checkpoint,finding','process,case_code');
 if(cmd==='actions')return scoped('actions','code,title,owner,due,state,resolution','due,code');
 if(cmd==='attention')return scoped('attention_queue','process,item,reason,owner','process,item,reason');
 if(cmd==='compliance')return {scope:'Evidence reminders for NZ IPP1, IPP8 and IPP9; not a compliance certification.',findings:await scoped('compliance_findings','process,rule,finding,source','process,rule')};
 if(cmd==='history'){const proc=await match(db,'processes',args[0]);return db.query('select action,actor,detail,created_at from audit_events where process_id=$1 order by created_at,id',[proc.id]);}
 if(cmd==='insights'){
  if(p)throw Error('insights covers all processes; omit --process');const result={};for(const [q,sql] of insights)result[q]=await db.query(sql);return result;
 }
 if(cmd==='weekly-review')return draft('weekly-review',{attention:await run(db,['attention',...(p?['--process='+p.code]:[])]),bottlenecks:await run(db,['bottlenecks',...(p?['--process='+p.code]:[])]),checkpoints:await run(db,['checkpoint-review',...(p?['--process='+p.code]:[])])});
 if(cmd==='export'){
  const out=required(o,'out'),format=o.format||'json';if(!['json','csv'].includes(format))throw Error('Format must be json or csv');
  const payload={exported_at:new Date().toISOString(),format_version:1};
  if(format==='json'){
   payload.processes=await db.query(`select * from processes${p?' where id=$1':''} order by code`,p?[p.id]:[]);
   for(const t of ['cases','imports','checkpoints','actions','notes','audit_events'])payload[t]=await scoped(t,'*','id');
   payload.events=await db.query(`select e.* from events e join cases c on c.id=e.case_id${p?' where c.process_id=$1':''} order by e.event_key`,p?[p.id]:[]);
   write(out,JSON.stringify(payload,null,2));
  }else{
   const rows=await db.query(`select p.code as "Process",c.code as "ProcessID",e.activity as "Activity",e.started_at as "StartTime",e.ended_at as "EndTime",e.resource as "Resource",e.role as "Role" from events e join cases c on c.id=e.case_id join processes p on p.id=c.process_id${p?' where p.id=$1':''} order by p.code,c.code,e.started_at,e.event_key`,p?[p.id]:[]);
   const cols=['Process','ProcessID','Activity','StartTime','EndTime','Resource','Role'];const quote=v=>'"'+String(v instanceof Date?v.toISOString():v??'').replace(/^[\t\r\n ]*[=+@-]/,"'$&").replaceAll('"','""')+'"';
   write(out,[cols.map(quote).join(','),...rows.map(r=>cols.map(k=>quote(r[k])).join(','))].join('\r\n')+'\r\n');
  }return {file:path.resolve(out),format};
 }
 if(!mutators.has(cmd))throw Error('Command is not implemented');
 const actor=required(o,'actor');let processId=p?.id;
 await db.exec('BEGIN');
 try{
  let result;
  if(cmd==='add'){
   const rows=await db.query(`insert into processes(code,name,owner,purpose,terminal_activity,sla_hours,stale_hours,retention_review) values($1,$2,$3,$4,$5,$6,$7,$8) returning *`,[required(o,'code'),required(o,'name'),required(o,'owner'),required(o,'purpose'),required(o,'terminal'),number(o['sla-hours']||120),number(o['stale-hours']||72),day(required(o,'retention-review'))]);result=rows[0];processId=result.id;
  }else if(cmd==='configure'){
   p=await match(db,'processes',args[0]);processId=p.id;const fields={owner:'owner',purpose:'purpose',terminal:'terminal_activity','sla-hours':'sla_hours','stale-hours':'stale_hours','retention-review':'retention_review'};const sets=[],values=[];
   for(const [flag,col] of Object.entries(fields))if(flag in o){let v=required(o,flag);if(flag.endsWith('hours'))v=number(v);if(flag==='retention-review')v=day(v);values.push(v);sets.push(`${col}=$${values.length}`);}
   if(!sets.length)throw Error('Supply at least one setting');values.push(p.id);result=(await db.query(`update processes set ${sets.join(',')} where id=$${values.length} returning *`,values))[0];
  }else if(cmd==='review'){
   p=await match(db,'processes',args[0]);processId=p.id;result=(await db.query('update processes set reviewed_at=now(),evidence_ref=$1 where id=$2 returning code,reviewed_at,evidence_ref',[required(o,'evidence'),p.id]))[0];
  }else if(cmd==='add-case'){
   if(!p)throw Error('Supply --process');result=(await db.query('insert into cases(process_id,code,name) values($1,$2,$3) returning *',[p.id,required(o,'code'),required(o,'name')]))[0];
  }else if(cmd==='case-state'){
   const c=await match(db,'cases',args[0],p?.id);p=await match(db,'processes',c.process_id);processId=p.id;
   const state=required(o,'state');if(!['open','closed','unknown'].includes(state))throw Error('State must be open, closed or unknown');
   if(state==='closed'){
    const e=await db.query('select activity,ended_at from events where case_id=$1 order by started_at desc,event_key desc limit 1',[c.id]);
    if(!e.length||e[0].activity!==p.terminal_activity||!e[0].ended_at)throw Error('Closing needs the configured terminal activity with an end time as the final recorded step');
   }
   result=(await db.query('update cases set state=$1,closure_note=$2 where id=$3 returning code,state',[state,required(o,'note'),c.id]))[0];
  }else if(cmd==='add-event'){
   const c=await match(db,'cases',args[0],p?.id);processId=c.process_id;if(c.state==='closed')throw Error('Reopen the case before adding events');
   const start=instant(required(o,'start')),end=o.end?instant(required(o,'end')):null;
   result=(await db.query('insert into events(case_id,event_key,activity,started_at,ended_at,resource,role,source) values($1,$2,$3,$4,$5,$6,$7,$8) returning id,activity',[c.id,'manual:'+required(o,'key'),required(o,'activity'),start,end,o.resource||'',o.role||'','manual']))[0];
   await db.query('update processes set reviewed_at=null where id=$1',[processId]);
  }else if(cmd==='add-checkpoint'){
   if(!p)throw Error('Supply --process');result=(await db.query('insert into checkpoints(process_id,code,before_activity,after_activity,source_ref) values($1,$2,$3,$4,$5) returning *',[p.id,required(o,'code'),required(o,'before'),required(o,'after'),required(o,'source')]))[0];
  }else if(cmd==='add-action'){
   if(!p)throw Error('Supply --process');const c=o.case?await match(db,'cases',required(o,'case'),p.id):null;
   result=(await db.query('insert into actions(process_id,case_id,code,title,owner,due) values($1,$2,$3,$4,$5,$6) returning *',[p.id,c?.id||null,required(o,'code'),required(o,'title'),required(o,'owner'),day(required(o,'due'))]))[0];
  }else if(cmd==='complete-action'){
   const a=await match(db,'actions',args[0]);processId=a.process_id;if(a.state==='done')throw Error('Action already complete');
   result=(await db.query("update actions set state='done',resolution=$1 where id=$2 returning code,state,resolution",[required(o,'resolution'),a.id]))[0];
  }else if(cmd==='log'){
   p=await match(db,'processes',args[0]);processId=p.id;result=(await db.query('insert into notes(process_id,body,actor) values($1,$2,$3) returning id,body',[p.id,required(o,'note'),actor]))[0];
  }else if(cmd==='import'){
   if(args[0]!=='ibm-process-mining')throw Error('Use import ibm-process-mining <events.csv>');if(!p)throw Error('Supply --process');
   result=await importEvents(db,p,args[1],o);
  }
  await db.query('insert into audit_events(process_id,action,actor,detail) values($1,$2,$3,$4)',[processId,cmd,actor,JSON.stringify(result)]);
  await db.exec(o['dry-run']?'ROLLBACK':'COMMIT');return o['dry-run']?{...result,dry_run:true}:result;
 }catch(e){await db.exec('ROLLBACK');throw e;}
}
async function importEvents(db,p,file,o){
 const source=required(o,'source');const raw=fs.readFileSync(file,'utf8');const rows=parseCsv(raw);if(!rows.length)throw Error('CSV contains no events');
 const names={case:['ProcessID','Case ID','caseid','Process ID'],activity:['Activity'],start:['StartTime','Start time','starttime'],end:['EndTime','End time','endtime'],resource:['Resource'],role:['Role']};
 const value=(row,k)=>o[k+'-column']?pick(row,required(o,k+'-column')):pick(row,...names[k]);
 for(const k of Object.keys(names))if(o[k+'-column']&&!Object.keys(rows[0]).some(h=>h.toLowerCase()===String(o[k+'-column']).toLowerCase()))throw Error(`Missing mapped column ${o[k+'-column']}`);
 const counts=new Map(),canonical=[];
 for(const [i,row] of rows.entries()){
  const code=value(row,'case').trim(),activity=value(row,'activity').trim(),start=value(row,'start');if(!code||!activity||!start)throw Error(`CSV row ${i+2}: case, activity and start required`);
  const started=instant(start,o.timezone),ended=value(row,'end')?instant(value(row,'end'),o.timezone):null;if(ended&&ended<started)throw Error(`CSV row ${i+2}: end before start`);
  const semantic={code,activity,started,ended,resource:value(row,'resource'),role:value(row,'role'),raw:Object.fromEntries(Object.entries(row).sort(([a],[b])=>a.localeCompare(b)))};
  const hash=sha(JSON.stringify(semantic)),occurrence=(counts.get(hash)||0)+1;counts.set(hash,occurrence);
  canonical.push({...semantic,key:sha(p.id+'|'+source+'|'+hash+'|'+occurrence)});
 }
 const previous=(await db.query('select * from imports where process_id=$1 and source=$2 for update',[p.id,source]))[0];const keys=canonical.map(x=>x.key),keySet=new Set(keys);
 if(previous&&previous.keys.some(k=>!keySet.has(k)))throw Error('Changed or removed source rows: reconcile explicitly. Import must contain the previous snapshot unchanged plus additions.');
 let added=0,skipped=0;const old=new Set(previous?.keys||[]);
 for(const e of canonical){
  if(old.has(e.key)){skipped++;continue;}
  let c=(await db.query('select * from cases where process_id=$1 and lower(code)=lower($2)',[p.id,e.code]))[0];
  if(c?.state==='closed')throw Error(`New event for closed case ${c.code}: reopen and reconcile first`);
  if(c&&c.code!==e.code)throw Error(`Case code differs only by letter case: ${e.code}`);
  if(!c)c=(await db.query('insert into cases(process_id,code,name) values($1,$2,$3) returning *',[p.id,e.code,e.code]))[0];
  await db.query('insert into events(case_id,event_key,activity,started_at,ended_at,resource,role,source,source_row) values($1,$2,$3,$4,$5,$6,$7,$8,$9)',[c.id,e.key,e.activity,e.started,e.ended,e.resource,e.role,source,JSON.stringify(e.raw)]);added++;
 }
 if(!previous||added){await db.query('insert into imports(process_id,source,keys,row_count,file_hash) values($1,$2,$3,$4,$5) on conflict(process_id,source) do update set keys=excluded.keys,row_count=excluded.row_count,file_hash=excluded.file_hash',[p.id,source,JSON.stringify(keys),rows.length,sha(raw)]);await db.query('update processes set reviewed_at=null where id=$1',[p.id]);}
 return {process:p.code,source,rows:rows.length,added,skipped};
}
function write(file,body){fs.mkdirSync(path.dirname(path.resolve(file)),{recursive:true,mode:0o700});fs.writeFileSync(file,body+'\n',{mode:0o600});fs.chmodSync(file,0o600);}
function draft(label,result){const file=path.join(process.env.OUTPUT_DIR||REPO_ROOT,'drafts',`${label}-${Date.now()}-${randomUUID().slice(0,8)}.md`);write(file,`# Process review draft\n\nGenerated ${new Date().toISOString()}. Check source completeness before decisions.\n\n${human(result)}\n\nDraft only. Nothing sent.`);return {file};}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){let db;try{db=await getDb();const result=await run(db,process.argv.slice(2));console.log(process.argv.includes('--json')?JSON.stringify(result,null,2):human(result));}catch(e){console.error(e.message);process.exitCode=1;}finally{if(db)await db.close();}}
