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

