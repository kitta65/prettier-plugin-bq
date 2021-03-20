#standardSQL
select 1 as one, 2 two;
-- leading1
-- leading2
select /* following1 */ /* following2 */ func(1) as f, func(2,3) -- following3
;
select
  -- this is int64
  1,2,1=1 cond;
select 1,2,3 from data limit 100 offset 10;
select date '2020-01-01', 1;
