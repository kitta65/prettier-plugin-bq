----- simple pipe syntax -----
FROM tablename;

FROM table
|> SELECT col
;

FROM table
|> SELECT col
|> SELECT col
;

FROM table
-- comment before |>
|>
  -- comment before select
  SELECT col
;

----- select statement -----
SELECT 1
|> SELECT *
;

(SELECT 1)
|> SELECT *
;

SELECT 1
UNION ALL
SELECT 2
|> SELECT *
;

(SELECT 1) ORDER BY 1 LIMIT 1
|> SELECT *
;

----- from statement -----
FROM tabe AS t1
INNER JOIN table AS p2 USING(col)
;

(FROM tablename);

(FROM table AS t) ORDER BY 1 LIMIT 1
|> SELECT *
