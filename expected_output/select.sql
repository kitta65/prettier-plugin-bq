----- basic -----
SELECT 1;

SELECT 1, 2 FROM t;

(SELECT 1);

SELECT 1;
SELECT 2;

----- set operator -----
SELECT 1
-- comment before union
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
WITH tmp AS (SELECT 1)
SELECT * FROM tmp
UNION ALL
SELECT * FROM tmp
;
(
  WITH tmp AS (SELECT 1)
  SELECT *
  FROM tmp
)
UNION ALL
SELECT 2
;
SELECT 1 FROM (SELECT 2)
UNION ALL
SELECT 3
;

SELECT 1
-- comment before inner
INNER UNION ALL BY NAME -- comment before union
SELECT 2
;

SELECT 1
FULL OUTER UNION ALL BY NAME ON (
  foooooooooooooooooooooooo,
  barrrrrrrrrrrrrrrrrrrrrrr
)
SELECT 2
;

SELECT 1
UNION ALL CORRESPONDING
SELECT 2
;

SELECT 1
UNION ALL STRICT CORRESPONDING
SELECT 2
;

SELECT 1
UNION ALL STRICT CORRESPONDING BY (foo, bar)
SELECT 2
;

----- WITH clause -----
WITH a AS (SELECT 1)
SELECT 2
; -- do not insert blank line
WITH a AS (SELECT 1)
-- before select
SELECT *
FROM a
;

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

WITH a AS (SELECT 1)
(SELECT 2)
;

-- recursive
WITH RECURSIVE temp AS (
  SELECT 1 AS n UNION ALL SELECT n + 1 FROM temp WHERE n < 3
)
SELECT n
FROM temp
;

----- SELECT clause -----
-- differential privacy
SELECT WITH DIFFERENTIAL_PRIVACY OPTIONS ( -- comment
  -- comment
  dummy = "dummy",
  -- comment
  dummy = "dummy",
  dummy = "dummy"
)
  col1,
;

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

SELECT
  -- break
  (SELECT 1),
  (SELECT 2),
;

SELECT (SELECT 1 EXCEPT DISTINCT SELECT 2);

SELECT ((SELECT 1));

SELECT * FROM ((SELECT 1) UNION ALL SELECT 2);

SELECT * FROM (((SELECT 1)) UNION ALL SELECT 2);

----- FROM clause -----
-- dash
SELECT * FROM region-us.INFORMATION_SCHEMA.JOBS_BY_USER;

SELECT *
FROM
  -- comment
  region-us.INFORMATION_SCHEMA.JOBS_BY_USER
;

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

-- TVF
SELECT * FROM prettier_plugin_bq_test.tvf();

SELECT
  * EXCEPT (_CHANGE_TYPE, _CHANGE_TIMESTAMP),
  _CHANGE_TYPE AS ct,
  _CHANGE_TIMESTAMP AS cts,
FROM APPENDS(TABLE ident)
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

SELECT * FROM a.arr WITH OFFSET AS b;

SELECT *
FROM
  a
  , a.arr WITH OFFSET AS b
;

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
  t AS toolongtablename1
  INNER JOIN u AS toolongtablename2 ON
    toolongtablename1.str = toolongtablename2.str
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

SELECT *
FROM (
  (SELECT 1 AS one) AS a
  CROSS JOIN (SELECT 2 AS two) AS b
)
;

-- built-in table functions
SELECT uri
FROM EXTERNAL_OBJECT_TRANSFORM(TABLE mydataset.myobjecttable, ['SIGNED_URL'])
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

SELECT str
FROM t
WHERE
  -- comment1
  TRUE
  -- comment2
  AND FALSE
;

----- GROUP BY clause -----
SELECT COUNT(*) FROM t GROUP BY ();

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

SELECT x, SUM(y) FROM t GROUP BY ROLLUP (x);

SELECT x, SUM(y) FROM t GROUP BY GROUPING SETS (a, CUBE(b), ());

SELECT colname FROM tablename GROUP BY ALL;

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

(SELECT col FROM tablename ORDER BY 1)
-- break
ORDER BY 1 DESC
;

----- LIMIT clause -----
SELECT * FROM t LIMIT 100;

SELECT * FROM t LIMIT 100 OFFSET 10;

(SELECT 1 LIMIT 2)
-- break
LIMIT 3
;
