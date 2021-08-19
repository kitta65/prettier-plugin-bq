----- basic -----
SELECT 1;

SELECT 1, 2 FROM t;

(SELECT 1);

----- set operator -----
SELECT 1
UNION ALL
SELECT 2
;

SELECT 1
INTERSECT DISTINCT
(SELECT 2)
;

(SELECT 1)
EXCEPT DISTINCT
SELECT 2
;

SELECT 1
UNION ALL
SELECT 2
UNION ALL
SELECT 3
;

SELECT 1
UNION ALL
(SELECT 2 UNION ALL SELECT 3)
;

----- WITH clause -----
WITH
  -- with query
  a AS (SELECT 1)
SELECT 2
;

WITH
  a AS (SELECT 1),
  -- with query
  b AS (SELECT 2)
SELECT 3
;

WITH a AS (
  -- with query
  SELECT 1
)
SELECT 3
;

----- SELECT clause -----
-- distinct
SELECT DISTINCT str FROM t;
SELECT ALL str FROM t;

-- alias
SELECT 1 AS one, 2 AS two;

-- except
SELECT * EXCEPT (str), t.* EXCEPT (str, int) FROM t;

-- replace
SELECT
  * REPLACE (int * 2 AS int),
  t.* REPLACE (
    -- break parent
    int * 2 AS int
  ),
FROM t
;

-- AS STRUCT, VALUE
SELECT (SELECT AS STRUCT 1 AS a, 2 AS b) AS ab;

SELECT AS VALUE STRUCT(1 AS a, 2 AS b) AS xyz;

-- sub query
SELECT (SELECT 1);

SELECT (SELECT 1 EXCEPT DISTINCT SELECT 2);

----- FROM clause -----
-- alias
SELECT 1 FROM t AS tmp;

-- sub query
SELECT *
FROM (
  -- break
  SELECT 1, 2
)
;

SELECT tmp.* FROM (SELECT 1, 2) AS tmp;

SELECT *
FROM t
WHERE
  -- break
  NOT EXISTS(SELECT 1 FROM u WHERE u.str = t.str)
;

-- FOR SYSTEM_TIME AS OF
SELECT str FROM t FOR SYSTEM_TIME AS OF CURRENT_TIMESTAMP();

SELECT str
FROM
  t AS tmp FOR SYSTEM_TIME
  -- unexpected comment
  AS OF CURRENT_TIMESTAMP()
;

-- PIVOT
WITH
  -- i don't know why but with clause is needed
  tmp AS (SELECT dt, str, int FROM t)
SELECT *
FROM
  tmp PIVOT (
    SUM(int)
    FOR str IN ('v1')
  )
  INNER JOIN tmp PIVOT (
    SUM(int)
    FOR str IN ('v1')
  ) USING(dt)
;

WITH
  -- i don't know why but with clause is needed
  tmp AS (SELECT dt, str, int FROM t)
SELECT *
FROM
  tmp AS tmp1 PIVOT (
    SUM(int) AS s,
    COUNT(*) AS c
    FOR str IN ('v1' AS one, 'v2' AS two)
  ) AS tmp2
;

-- UNPIVOT
WITH tmp AS (SELECT 'a' AS name, 51 AS v1, 23 AS v2 UNION ALL SELECT 'b', 77, 0)
SELECT *
FROM tmp UNPIVOT (value FOR v IN (v1, v2))
;

WITH tmp AS (
  SELECT 'a' AS name, 51 AS v1, 23 AS v2, 64 AS v3, 58 AS v4
  UNION ALL
  SELECT 'b', 77, 0, 32, 44
)
SELECT *
FROM
  tmp UNPIVOT INCLUDE NULLS (
    (value1, value2)
    FOR v IN ((v1, v2) AS '1-2', (v3, v4) AS '3-4')
  ) AS unpivot
;

-- TABLESAMPLE
SELECT * FROM t TABLESAMPLE SYSTEM (20 PERCENT);

-- UNNEST
SELECT * FROM UNNEST([1, 2]);

SELECT * FROM UNNEST([1]) WITH OFFSET;

SELECT * FROM UNNEST([1]) AS a WITH OFFSET AS b;

-- JOIN
SELECT *
FROM
  (SELECT str FROM t) AS tmp
  INNER JOIN u ON tmp.str = u.str
;

SELECT *
FROM
  t AS t1
  INNER JOIN t AS t2 ON t1.str = t2.str
;

SELECT *
FROM
  t AS t1
  LEFT JOIN t AS t2 USING(str)
  LEFT JOIN u ON t2.dt = u.dt -- outer -- outer
;

SELECT *
FROM
  t AS t1
  , t AS t2
  INNER JOIN (
    t AS t3
    FULL JOIN t AS t4 ON t3.dt = t4.dt
  ) ON t2.str = t4.str
;

----- WHERE clause -----
SELECT str FROM t WHERE TRUE;

SELECT str
FROM t
WHERE
  str = 'abc'
  AND ts < CURRENT_TIMESTAMP()
  AND int < 100
  AND (float < 100 OR 1000 < float)
;

----- GROUP BY clause -----
SELECT
  str,
  int,
-- break
FROM t
GROUP BY 1, 2
;

SELECT
  str,
  int,
-- break
FROM t
GROUP BY
  str,
  int
;

----- HAVING clause -----
SELECT str, COUNT(*) AS cnt FROM t GROUP BY 1 HAVING cnt < 10;

---- QUALIFY clause -----
SELECT int
FROM t
WHERE TRUE
QUALIFY ROW_NUMBER() OVER (PARTITION BY str ORDER BY ts) = 1
;

----- WINDOW clause -----
SELECT *
FROM t
-- break
WINDOW
  a AS (PARTITION BY str),
  b AS (a ORDER BY col2)
;

SELECT *
FROM t
-- break
WINDOW
  a AS (PARTITION BY str),
  b AS a
;

SELECT *
FROM t
-- break
WINDOW a AS (PARTITION BY str ORDER BY ts)
;

----- ORDER BY clause -----
SELECT * FROM t ORDER BY int ASC, ts;

SELECT * FROM t ORDER BY int NULLS FIRST, str DESC NULLS LAST;

----- LIMIT clause -----
SELECT * FROM t LIMIT 100;

SELECT * FROM t LIMIT 100 OFFSET 10;
