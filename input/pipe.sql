----- simple pipe syntax -----
from tablename;

from table |> select col;

from table |> select col |> select col;

from table
-- comment before |>
|>
-- comment before select
select col;
