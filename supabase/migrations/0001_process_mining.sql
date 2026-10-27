create function touch_updated() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end $$;
create table processes (
 id uuid primary key default gen_random_uuid(), code text not null check(btrim(code)<>''), name text not null check(btrim(name)<>''),
 owner text not null default '', purpose text not null default '', terminal_activity text not null default 'Close case',
 sla_hours numeric not null default 120 check(sla_hours>0), stale_hours numeric not null default 72 check(stale_hours>0),
 retention_review date, evidence_ref text not null default '', reviewed_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index process_code on processes(lower(code));
create table cases (
 id uuid primary key default gen_random_uuid(), process_id uuid not null references processes(id), code text not null check(btrim(code)<>''),
 name text not null, state text not null default 'unknown' check(state in ('unknown','open','closed')),
 closure_note text not null default '', created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(process_id,code), unique(id,process_id)
);
create unique index case_code on cases(process_id,lower(code));
create table events (
 id uuid primary key default gen_random_uuid(), case_id uuid not null references cases(id), event_key text not null unique,
 activity text not null check(btrim(activity)<>''), started_at timestamptz not null, ended_at timestamptz,
 resource text not null default '', role text not null default '', source text not null, source_row jsonb not null default '{}',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(ended_at is null or ended_at>=started_at)
);
create index event_order on events(case_id,started_at,event_key);
create table imports (
 id uuid primary key default gen_random_uuid(), process_id uuid not null references processes(id), source text not null,
 keys jsonb not null, row_count integer not null check(row_count>0), file_hash text not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(process_id,source)
);
create table checkpoints (
 id uuid primary key default gen_random_uuid(), process_id uuid not null references processes(id), code text not null,
 before_activity text not null, after_activity text not null, source_ref text not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(before_activity<>after_activity), unique(process_id,code)
);
create unique index checkpoint_code on checkpoints(process_id,lower(code));
create table actions (
 id uuid primary key default gen_random_uuid(), process_id uuid not null references processes(id), case_id uuid,
 code text not null check(btrim(code)<>''), title text not null check(btrim(title)<>''), owner text not null check(btrim(owner)<>''), due date not null,
 state text not null default 'open' check(state in ('open','done')), resolution text not null default '',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 foreign key(case_id,process_id) references cases(id,process_id), check(state<>'done' or btrim(resolution)<>'')
);
create unique index action_code on actions(lower(code));
create table notes (
 id uuid primary key default gen_random_uuid(), process_id uuid not null references processes(id), body text not null check(btrim(body)<>''), actor text not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table audit_events (
 id uuid primary key default gen_random_uuid(), process_id uuid references processes(id), action text not null, actor text not null,
 detail jsonb not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create function immutable_record() returns trigger language plpgsql as $$ begin raise exception 'Append-only record'; end $$;
create trigger audit_immutable before update or delete on audit_events for each row execute function immutable_record();
create trigger event_immutable before update or delete on events for each row execute function immutable_record();
create trigger notes_immutable before update or delete on notes for each row execute function immutable_record();
do $$ declare t text; begin foreach t in array array['processes','cases','events','imports','checkpoints','actions','notes','audit_events'] loop
 execute format('create trigger touch before update on %I for each row execute function touch_updated()',t);
 execute format('alter table %I enable row level security',t); execute format('revoke all on %I from public',t);
end loop; end $$;
create view case_summary as
select c.id,c.process_id,p.code process,c.code,c.name,c.state,p.owner,p.sla_hours,p.stale_hours,
 count(e.id)::int event_count,min(e.started_at) first_event,max(coalesce(e.ended_at,e.started_at)) last_event,
 round((extract(epoch from max(coalesce(e.ended_at,e.started_at))-min(e.started_at))/3600)::numeric,2) observed_hours,
 case when c.state='open' then round((extract(epoch from now()-min(e.started_at))/3600)::numeric,2) end elapsed_open_hours,
 case when c.state<>'closed' then round((extract(epoch from now()-max(coalesce(e.ended_at,e.started_at)))/3600)::numeric,2) end quiet_hours,
 count(e.id)::int-count(distinct e.activity)::int repeated_steps,
 string_agg(e.activity,' > ' order by e.started_at,e.event_key) path,
 (select count(*)::int from actions a where a.case_id=c.id and a.state='open') open_actions
from cases c join processes p on p.id=c.process_id left join events e on e.case_id=c.id
 group by c.id,p.id;
create view event_sequence as
select e.*,c.process_id,c.code case_code,p.code process,
 lag(e.activity) over w previous_activity,lag(e.ended_at) over w previous_end,
 lag(e.started_at) over w previous_start,
 count(*) over(partition by e.case_id,e.started_at)::int simultaneous_starts
from events e join cases c on c.id=e.case_id join processes p on p.id=c.process_id
window w as(partition by e.case_id order by e.started_at,e.event_key);
create view transition_summary as
select process_id,process,previous_activity,activity,count(*)::int occurrences,
 count(*) filter(where previous_end is not null and started_at>=previous_end)::int measured_gaps,
 round(avg(extract(epoch from started_at-previous_end)/3600) filter(where previous_end is not null and started_at>=previous_end)::numeric,2) mean_gap_hours,
 round(max(extract(epoch from started_at-previous_end)/3600) filter(where previous_end is not null and started_at>=previous_end)::numeric,2) max_gap_hours,
 count(*) filter(where previous_end>started_at)::int overlapping_events
from event_sequence where previous_activity is not null group by process_id,process,previous_activity,activity;
create view variant_summary as
select process_id,process,path,count(*)::int cases,count(*) filter(where state='closed')::int closed_cases,
 round(avg(observed_hours) filter(where state='closed'),2) mean_closed_hours,
 max(repeated_steps)::int repeated_steps
from case_summary where event_count>0 group by process_id,process,path;
create view checkpoint_findings as
select c.process_id,p.code process,c.id case_id,c.code case_code,r.code checkpoint,r.source_ref,
 r.before_activity,r.after_activity,e.id event_id,
 case when not exists(select 1 from events b where b.case_id=c.id and b.activity=r.before_activity) then 'missing predecessor'
 else 'predecessor not completed before step' end finding
from checkpoints r join processes p on p.id=r.process_id join cases c on c.process_id=r.process_id
 join events e on e.case_id=c.id and e.activity=r.after_activity
where not exists(select 1 from events b where b.case_id=c.id and b.activity=r.before_activity and b.ended_at is not null and b.ended_at<=e.started_at);
create view attention_queue as
select process_id,process,code item,'case status unknown' reason,owner from case_summary where state='unknown'
union all select process_id,process,code,'open case over target',owner from case_summary where state='open' and elapsed_open_hours>sla_hours
union all select process_id,process,code,'case gone quiet',owner from case_summary where state='open' and quiet_hours>stale_hours
union all select a.process_id,p.code,a.code,'overdue improvement',a.owner from actions a join processes p on p.id=a.process_id where a.state='open' and a.due<current_date
union all select id,code,code,'retention review missing or due',owner from processes where retention_review is null or retention_review<=current_date;
create view compliance_findings as
select id process_id,code process,'IPP1' rule,'Record the purpose for this event history' finding,'https://www.privacy.org.nz/privacy-principles/1/' source from processes where btrim(purpose)=''
union all select id,code,'IPP8','Record a source accuracy review','https://www.privacy.org.nz/privacy-principles/8/' from processes where reviewed_at is null or evidence_ref=''
union all select id,code,'IPP9','Review whether this history is still needed','https://www.privacy.org.nz/privacy-principles/9/' from processes where retention_review is null or retention_review<=current_date;
