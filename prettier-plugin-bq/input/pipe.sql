----- simple pipe syntax -----
from tablename;

from table |> select col;

from table |> select col |> select col;

from table
-- comment before |>
|>
-- comment before select
select col;

with t as (select 1) from t;

select * from (from t |> select *);

----- select statement -----
select 1 |> select *;

(select 1) |> select *;

select 1 union all select 2 |> select *;

(select 1) order by 1 limit 1 |> SELECT *;

from t |>
  select col
  -- break parent
  window a as (partition by b)
;

----- from statement -----
from tabe as t1
join table as p2 using (col);

(from tablename);

(from table as t) order by 1 limit 1
|> select *;

----- base pipe operator -----
from t |> extend 1 as one, 2 as two,;

from t |> as u;

from t |> call tvf() as u;

-- keywords
from t |> order by col1 desc nulls last, col2;

-- select
from t |> select col1, col2,;

from t |> select distinct col;

from t |> select all as struct col;

----- limit pipe operator -----
from t |> limit 1;

from t |> limit 1 offset 2;

from t |>
limit 1
-- break
offset 2;

----- aggregate pipe operator -----
from t |> aggregate count(*) as cnt desc nulls last;

from t
|>
  aggregate count(*)
  group by col1 as col_a desc nulls last, col2;

----- distinct pipe operator -----
from t |> distinct;

----- union pipe operator -----
from t |> union all (select 1), (select 2);

from t |> union all by name (select 1);

from t |> left outer intersect distinct by name on (col) (select 1);

select *
|> except distinct
(
  select 1
  |> except distinct (select 2)
);

----- join pipe operator -----
from t |> join t using(col);

from t |> join (select 1) as u on foo = bar;

from t |> cross join u;

from t |>
-- comment before left
left
-- comment before outer
outer
-- comment before join
join u as u2
;

----- tablesample pipe operator -----
from t |> tablesample system (1 percent);

----- pivot pipe operator -----
from t |> pivot
-- comment before (
(
-- comment before sum
sum(sales) for quarter in ('Q1', 'Q2')) as q;

----- unpivot pipe operator -----
from t |> unpivot (sales for quarter in (q1, q2)) as q;

from t |> unpivot include nulls (sales for quarter in (q1, q2)) as q;

----- match recognize pipe operator -----
from t |> match_recognize (
  order by col1
  pattern (symbol)
);

----- with pipe operator -----
from t
|> with u as (
    select 1 as key
  )
|> inner join u using (key)
;

from t
|> with
  -- CTE
  u as (
    select 1 as key
  ),
  v as (
    select 2 as key
  ),
|> inner join u using (key)
;