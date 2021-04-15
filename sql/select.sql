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
select 1,2,3 from data tablesample system (10 percent) limit 100 offset 10;
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
sum() over (partition by a order by b, c rows between unbounded preceding and current row),
sum() over (rows 1 + 1 preceding),
;
select arr[offset(1)], [1, 2], ARRAY[1,2],array<int64>[1],array<struct<array<int64>, x int64>>[struct([1])];
select (1,2),struct(1,2),struct<int64>(1),struct<int64,x float64>(1,.1),struct<array<int64>>([1]),;
(select 1, 2);
select 1 union all select 2;(select 1) union all select 2;select 1 union all (select 2);select 1 union all select 2 union all select 3;

select 1 union all (select 2 union all select 3);(select 1 union all select 2) union all select 3;
with a as (select 1) select 2;with a as (select 1), b as (select 2 from TooLongTableToPrintInOneLine where TooLongTableToPrintInOneLine=1) select 3;
select as struct 1;select distinct 1;select all 1;select t.* except (col1), * except(col1, col2), * replace (col1 * 2 as col2), from t;
select * from unnest([1,2,3]);select * from unnest([1]) with offset;select * from unnest([1]) a with offset as b;
select * from (select 1,2);select sub.* from (select 1,2) as sub;select * from main as m where not exists(select 1 from sub as s where s.x = m.x);
select * from (select 1 from table1) inner join table2;
select * from t order by col1 asc nulls last, col2 nulls first;
select * from data1 as one inner join data2 two ON true;
select * from data1 as one inner join data2 two using(col) left outer join data3 on true;
select * from data1 as one , data2 two join (data3 full outer join data4 on col1=col2) on true;
select safe.substr('foo', 0, -2),keys.func();
select last_value(col3) OVER (c ROWS BETWEEN 2 PRECEDING AND 2 FOLLOWING)
FROM table
WINDOW
a AS (PARTITION BY col1),
b AS (a ORDER BY col2),
c AS b;
select last_value(col3) OVER (c ROWS BETWEEN 2 PRECEDING AND 2 FOLLOWING)
FROM table WINDOW a AS (PARTITION BY col1);
select
cast(abc as string),string_agg(distinct x, y ignore nulls order by z limit 100),array(select 1 union all select 2),
NORMALIZE_AND_CASEFOLD(a, nFD),
extract(day from ts),extract(day from ts at time zone 'UTC'),extract(week(sunday) from ts),
st_geogfromtext(p, oriented => true),
;
select
aaa.bbb.ccc,x[offset(1)],-+1,~1,1*2/3,'a'||'b',1+2-3,1<<3>>2,1|2^3&4,
1<2,3>4,1<=2,3>=4,1!=2,1<>2,
'a' like '%a','a' not like 'b',1 between 1 and 2,1 not between 1 and 2,'a' in ('a'),'a' not in ('a','b'),
a is null,a is not null,true is true,true or true is not true,not true is true,true or false not in (true),
;
select
sum(if(TooLongColumnToPrintInOneLine1 = 1 and TooLongColumnToPrintInOneLine2=2,1,0))
over(partition by TooLongColumnToPrintInOneLine3, TooLongColumnToPrintInOneLine4 order by TooLongColumnToPrintInOneLine4) as ifFunc,
sum(case when TooLongColumnToPrintInOneLine1 then 1 when TooLongColumnToPrintInOneLine2 then 2 else null end);

select 1;

select 2; /*

*/
select 3; /*

*/

select 4;
-- 
select 5;

-- 
select 6;
(select 7);

select _partitiondate as dt1,_table_suffix as dt2, from data where _table_suffix = '20200101';
select myfunc.current_timestamp(), current_timestamp();

select date_diff(date '2020-01-01', date '2020-01-02', day),date_diff(date '2020-01-01', date '2020-01-02', week(monday)),
date_trunc(date '2020-01-31', month);
select aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa,bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb,count(*)
FROM data group by aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa,bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb;
select all 1;select t.* except (col1), * except(col1, col2), * replace (col1 * 2 as col2), from t;
select a,b,c,d,e,f,g,count(*)
from data
group by 1,2,3,4,5,6,7
order by 1,2,3,4,5,6,7
;
select *
from (
  select *
  from data
  where dt=current_date() and flg1=0 and flg2 is null and flg3=1
)
;
