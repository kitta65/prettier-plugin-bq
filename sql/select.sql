----- basic -----
select 1;

select
  1,
  2,
from t;

(select 1);

select 1; select 2;

----- set operator -----
select 1 union all select 2;

select 1 intersect distinct (select 2);

(select 1) except distinct select 2;

select 1 union all select 2 union all select 3;

select 1 union all (select 2 union all select 3);
with tmp as (select 1)
select * from tmp
union all
select * from tmp;
(with tmp as (select 1) select * from tmp)
union all
select 2;

----- WITH clause -----
with a as (select 1) select 2; -- do not insert blank line
with a as (select 1)
-- before select
select * from a;

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

with a as (select 1) (select 2);

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

select ((select 1));

select * from (
  (select 1)
  union all select 2
);

select * from (
  ((select 1))
  union all select 2
);

----- FROM clause -----
-- dash
select * from region-us.INFORMATION_SCHEMA.JOBS_BY_USER;

select *
from
  -- comment
  region-us.INFORMATION_SCHEMA.JOBS_BY_USER
;

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

-- TVF
select *
from prettier_plugin_bq_test.tvf()
;

-- FOR SYSTEM_TIME AS OF
select str from t for system_time as of current_timestamp();

select str from t as tmp for system_time
  -- unexpected comment
  as of current_timestamp()
;

-- PIVOT
with
  -- i don't know why but with clause is needed
  tmp as (
    select dt, str, int
    from t
  )
select *
from
  tmp pivot(sum(int) for str in ('v1'))
  inner join tmp pivot(sum(int) for str in ('v1')) using(dt)
;

with
  -- i don't know why but with clause is needed
  tmp as (
    select dt, str, int
    from t
  )
select *
from tmp as tmp1 pivot (
  sum(int) s,
  count(*) as c
  for str in ('v1' one, 'v2' AS two)
) tmp2;

-- UNPIVOT
with tmp AS (
  select 'a' as name, 51 as v1, 23 as v2 union all
  select 'b', 77, 0
)
select *
from tmp unpivot (
  value
  for v
  in (v1 1, v2 as 2)
)
;

with tmp AS (
  select 'a' name, 51 v1, 23 v2, 64 v3, 58 v4 union all
  select 'b', 77, 0, 32, 44
)
select *
from tmp unpivot include nulls (
  (value1, value2)
  for v in ((v1, v2) AS '1-2', (v3, v4) '3-4')
) AS unpivot
;

-- TABLESAMPLE
select * from t tablesample system (20 percent);

-- UNNEST
select * from unnest([1, 2]);

select * from unnest([1]) with offset;

select * from unnest([1]) a with offset as b;

-- JOIN
select * from (select str from t) as tmp inner join u on tmp.str = u.str;

select * from t as t1 join t t2 on t1.str = t2.str;

select *
from
  t as t1
  left join t t2 using(str)
  left
    -- outer
    outer -- outer
    join u on t2.dt = u.dt
;

select *
from
  t as toolongtablename1
  inner join u as toolongtablename2 on
    toolongtablename1.str = toolongtablename2.str
;

select * from t as t1 , t t2 join (t as t3 full outer join t t4 on t3.dt = t4.dt) on t2.str = t4.str;

----- WHERE clause -----
select str from t where true;

select str from t where str = 'abc' and ts < current_timestamp() and int < 100 and (float < 100 or 1000 < float);

----- GROUP BY clause -----
select str, int
-- break
from t group by 1, 2
;

select str, int
-- break
from t group by str, int
;

----- HAVING clause -----
select str, count(*) cnt from t group by 1 having cnt < 10;

---- QUALIFY clause -----
select int
from t
where true
qualify row_number() over(partition by str order by ts) = 1
;

----- WINDOW clause -----
select *
from t
-- break
window
  a as (partition by str),
  b as (a order by col2)
;

select *
from t
-- break
window
  a as (partition by str),
  b as a
;

select *
from t
-- break
window a as (partition by str order by ts)
;

----- ORDER BY clause -----
select * from t order by int asc, ts;

select * from t order by int nulls first, str desc nulls last;

----- LIMIT clause -----
select * from t limit 100;

select * from t limit 100 offset 10;

