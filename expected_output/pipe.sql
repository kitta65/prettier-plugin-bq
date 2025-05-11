----- simple pipe syntax -----
FROM tablename;

FROM table
|>
  SELECT col
;

FROM table
|>
  SELECT col
|>
  SELECT col
;

FROM table
-- comment before |>
|>
  -- comment before select
  SELECT col
;
