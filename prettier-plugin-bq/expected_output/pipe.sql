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

WITH t AS (SELECT 1)
FROM t
;

SELECT *
FROM (
  FROM t
  |> SELECT *
)
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

FROM t
|>
  SELECT col
  -- break parent
  WINDOW a AS (PARTITION BY b)
;

FROM t
|>
  SELECT
    x,
    -- comment
    y,
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

----- distinct pipe operator -----
FROM t
|> DISTINCT
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

----- join pipe operator -----
FROM t
|> JOIN t USING(col)
;

FROM t
|> JOIN (SELECT 1) AS u ON foo = bar
;

FROM t
|> CROSS JOIN u
;

FROM t
|>
  -- comment before left
  LEFT OUTER JOIN u AS u2 -- comment before outer -- comment before join
;

----- tablesample pipe operator -----
FROM t
|> TABLESAMPLE SYSTEM (1 PERCENT)
;

----- pivot pipe operator -----
FROM t
|>
  pivot ( -- comment before (
    -- comment before sum
    SUM(sales)
    FOR quarter IN ('Q1', 'Q2')
  ) AS q
;

----- unpivot pipe operator -----
FROM t
|> unpivot (sales FOR quarter IN (q1, q2)) AS q
;

FROM t
|> unpivot INCLUDE NULLS (sales FOR quarter IN (q1, q2)) AS q
;

----- match recognize pipe operator -----
FROM t
|>
  MATCH_RECOGNIZE (
    ORDER BY col1
    PATTERN (symbol)
  )
;

----- with pipe operator -----
FROM t
|> WITH u AS (SELECT 1 AS key)
|> INNER JOIN u USING(key)
;

FROM t
|>
  WITH
    -- CTE
    u AS (SELECT 1 AS key),
    v AS (SELECT 2 AS key),
|> INNER JOIN u USING(key)
;
