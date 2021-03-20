#standardSQL
select 1 as one, 2 two;
-- leading1
-- leading2
select /* following1 */ /* following2 */ func(1) as f, func(2,3) -- following3
,func(),func(1+1,interval 9 hour)
;
select
  -- this is int64
  1,2,1=1 cond;
select 1,2,3 from data limit 100 offset 10;
select date '2020-01-01', 1;
select 1,(1),((1+1)),not 1=1,col like 'a%',col not like 'a%', 1 between -1 and 1, timestamp r"2020-01-01", 1 in (1,2),1 not in (2,3),
case col when 1 then 'one' else 'two' end,
case tooLongColumnNameToDisplayInSingleLinetooLongColumnNameToDisplayInSingleLinetooLongColumnNameToDisplayInSingleLine when 1 then 'one' else 'two' end as c;
select d.col1 from data as d for system_time as of current_timestamp() group by 1 having true order by abc desc, def;
