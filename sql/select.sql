----- basic -----
select 1;

select
  1,
  2,
from t;

(select 1);

----- set operator -----
select 1 union all select 2;

select 1 intersect distinct (select 2);

(select 1) except distinct select 2;

select 1 union all select 2 union all select 3;

select 1 union all (select 2 union all select 3);

----- WITH clause -----
with
  -- with query
  a as (select 1)
select 2;

with
  a as (select 1),
  -- with query
  b as (select 2)
select 3
;

with a as (
  -- with query
  select 1
)
select 3
;

----- SELECT clause -----
-- distinct
select distinct str from t;
select all str from t;

-- alias
select 1 as one, 2 two;

-- except
select
  * except (str),
  t.* except(str, int)
from t
;

-- replace
select
  * replace (int * 2 as int),
  t.* replace (
    -- break parent
    int * 2 as int
  ),
from t
;

-- AS STRUCT, VALUE
select (select as struct 1 a, 2 b) ab;

select as value struct(1 as a, 2 as b) xyz;

-- sub query
select (select 1);

select (select 1 except distinct select 2);

----- FROM clause -----
-- alias
select 1
from t as tmp
;

-- sub query
select * from (
  -- break
  select 1,2
);

select tmp.* from (select 1,2) as tmp;

select *
from t
where
  -- break
  not exists(select 1 from u where u.str = t.str)
;

-- FOR SYSTEM_TIME AS OF
select str from t for system_time as of current_timestamp();

select str from t as tmp for system_time
  -- unexpected comment
  as of current_timestamp()
;

-- PIVOT
select * FROM t PIVOT (COUNT(*) FOR x IN ('v1', 'v2'))

