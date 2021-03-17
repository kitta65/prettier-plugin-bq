#standardSQL
select 1;
-- leading1
-- leading2
select /* following1 */ /* following2 */ func(1), func(2,3) -- following3
;
select
  -- this is int64
  1,;
