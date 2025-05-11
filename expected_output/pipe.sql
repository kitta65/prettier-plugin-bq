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
;

----- base pipe operator -----
FROM t
|> extend 1 AS one, 2 AS two
;

FROM t
|> AS u
;

FROM t
|> call tvf() AS u
;

-- keywords
FROM t
|> ORDER BY col1 DESC NULLS LAST, col2
;

-- select
FROM t
|> SELECT col1, col2
;

FROM t
|> SELECT DISTINCT col
;

FROM t
|> SELECT ALL AS STRUCT col
;

----- limit pipe operator -----
FROM t
|> LIMIT 1
;

FROM t
|> LIMIT 1 OFFSET 2
;

FROM t
|>
  LIMIT 1
  -- break
  OFFSET 2
;

----- aggregate pipe operator -----
FROM t
|> aggregate COUNT(*) AS cnt DESC NULLS LAST
;

FROM t
|>
  aggregate COUNT(*)
  GROUP BY
    col1 AS col_a DESC NULLS LAST,
    col2
;

----- union pipe operator -----
FROM t
|> UNION ALL (SELECT 1), (SELECT 2)
;

FROM t
|> UNION ALL BY NAME (SELECT 1)
;

FROM t
|> LEFT OUTER INTERSECT DISTINCT BY NAME ON (col) (SELECT 1)
;

SELECT *
|>
  EXCEPT DISTINCT
    (
      SELECT 1
      |> EXCEPT DISTINCT (SELECT 2)
    ),
;
