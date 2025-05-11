----- simple pipe syntax -----
from tablename;

from table |> select col;

from table |> select col |> select col;

from table
-- comment before |>
|>
-- comment before select
select col;

----- select statement -----
select 1 |> select *;

(select 1) |> select *;

select 1 union all select 2 |> select *;

(select 1) order by 1 limit 1 |> SELECT *;

----- from statement -----
from tabe as t1
join table as p2 using (col);

(from tablename);

(from table as t) order by 1 limit 1
|> select *
