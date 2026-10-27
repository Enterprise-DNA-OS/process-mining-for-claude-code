insert into processes(id,code,name,owner,purpose,terminal_activity,sla_hours,stale_hours,retention_review,evidence_ref,reviewed_at) values
('10000000-0000-4000-8000-000000000001','ORDERS','Wholesale order fulfilment','Operations lead','Review order delays using fictional records','Dispatch',120,48,current_date-3,'',null),
('10000000-0000-4000-8000-000000000002','RETURNS','Wholesale returns','Returns lead','Review returned goods handling using fictional records','Close return',72,24,current_date+90,'demo/source-review',now()) on conflict do nothing;
insert into cases(id,process_id,code,name,state) values
('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','ORD-101','North depot replenishment','closed'),
('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','ORD-102','South depot replenishment','open'),
('20000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001','ORD-103','West depot urgent order','closed'),
('20000000-0000-4000-8000-000000000004','10000000-0000-4000-8000-000000000002','RET-201','Damaged carton review','unknown') on conflict do nothing;
insert into events(case_id,event_key,activity,started_at,ended_at,resource,role,source)
select ('20000000-0000-4000-8000-'||lpad(c::text,12,'0'))::uuid,'demo-'||n,activity,
 current_date+interval '9 hours'-hours*interval '1 hour',
 case when duration is null then null else current_date+interval '9 hours'-(hours-duration)*interval '1 hour' end,
 resource,role,'fictional-seed'
from (values
 (1,1,'Receive',240,1,'rep-a','Sales'),(1,2,'Approve',216,1,'lead-a','Operations'),(1,3,'Pick',192,2,'depot-a','Warehouse'),(1,4,'Dispatch',168,1,'depot-a','Warehouse'),
 (2,5,'Receive',216,1,'rep-a','Sales'),(2,6,'Approve',192,1,'lead-a','Operations'),(2,7,'Pick',168,2,'depot-a','Warehouse'),(2,8,'Pick',120,2,'depot-a','Warehouse'),
 (3,9,'Receive',96,1,'rep-b','Sales'),(3,10,'Pick',72,1,'depot-b','Warehouse'),(3,11,'Dispatch',48,1,'depot-b','Warehouse'),
 (4,12,'Receive return',120,null,'desk-a','Returns')) as v(c,n,activity,hours,duration,resource,role)
on conflict do nothing;
insert into checkpoints(process_id,code,before_activity,after_activity,source_ref) values
('10000000-0000-4000-8000-000000000001','APPROVE-BEFORE-PICK','Approve','Pick','demo/policy/order-approval') on conflict do nothing;
insert into actions(process_id,case_id,code,title,owner,due) values
('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002','ACT-1','Check why the order was picked twice','Warehouse lead',current_date-2),
('10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000003','ACT-2','Find the missing approval record','Operations lead',current_date+2) on conflict do nothing;
