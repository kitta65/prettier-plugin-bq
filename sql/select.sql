#standardSQL
select 1 as one, 2 two, .1;
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
select d.col1 from data as d for system_time as of current_timestamp() where 1 = 1 group by 1 having true order by abc desc, -def asc;
select
sum() over (),
sum() over named_clause,
sum() over (named_clause),
sum() over (partition by a),
sum() over (order by a),
sum() over (partition by a order by b, c),
sum() over (partition by a order by b, c rows between unbounded preceding and unbounded following),
sum() over (rows 1 + 1 preceding),
;
select arr[offset(1)], [1, 2], ARRAY[1,2],array<int64>[1],array<struct<array<int64>, x int64>>[struct([1])];
select (1,2),struct(1,2),struct<int64>(1),struct<int64,x float64>(1,.1),struct<array<int64>>([1]),;
(select 1, 2);
select 1 union all select 2;(select 1) union all select 2;select 1 union all (select 2);select 1 union all select 2 union all select 3;
select 1 union all (select 2 union all select 3);(select 1 union all select 2) union all select 3;
with a as (select 1) select 2;with a as (select 1), b as (select 2) select 3;
select as struct 1;select distinct 1;select all 1;select t.* except (col1), * except(col1, col2), * replace (col1 * 2 as col2), from t;
select * from unnest([1,2,3]);select * from unnest([1]) with offset;select * from unnest([1]) a with offset as b;
select * from (select 1,2);select sub.* from (select 1,2) as sub;select * from main as m where not exists(select 1 from sub as s where s.x = m.x);
select * from t order by col1 asc nulls last, col2 nulls first;
select * from data1 as one inner join data2 two ON true;
select * from data1 as one , data2 two join (data3 full outer join data4 on col1=col2) on true;
select safe.substr('foo', 0, -2),keys.func();
select last_value(col3) OVER (c ROWS BETWEEN 2 PRECEDING AND 2 FOLLOWING)
FROM table
WINDOW
a AS (PARTITION BY col1),
b AS (a ORDER BY col2),
c AS b;
select
cast(abc as string),string_agg(distinct x, y ignore nulls order by z limit 100),array(select 1 union all select 2),
NORMALIZE_AND_CASEFOLD(a, nFD),
extract(day from ts),extract(day from ts at time zone 'UTC'),extract(week(sunday) from ts),
st_geogfromtext(p, oriented => true),
;

