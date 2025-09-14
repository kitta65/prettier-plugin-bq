----- comment -----
#standardSQL
SELECT 1; /* */ -- end of statement

----- unary operator -----
SELECT -1, +1, r'xxx', DATE '2020-01-01', TIMESTAMP r'2020-01-01', NOT TRUE;

----- binary operator -----
SELECT 1 + 2;
SELECT (1 + (-2)) * 3 IN (9);
SELECT (1 + 2) * 3 NOT BETWEEN 10 + 0 AND 11 + 2 OR TRUE;

-- BETWEEN
SELECT 1 BETWEEN 0 AND 3, 1 NOT BETWEEN 0 AND 3;

-- IN
SELECT
  1 IN (
    1000000000000000,
    2000000000000000,
    3000000000000000,
    4000000000000000,
    5000000000000000
  ),
  1 NOT IN (1, 2, 3) AS notOneTwoThree,
;
SELECT
  1 IN (
    -- break
    SELECT 1
  ),
;
SELECT 1 IN UNNEST([1, 2]);
SELECT 1 IN UNNEST([1]) AND TRUE;

-- LIKE
SELECT 'a' LIKE 'abc', 'a' NOT LIKE 'abc';

SELECT 'a' LIKE ANY 'abc', 'a' NOT LIKE SOME 'abc';

-- IS
SELECT TRUE IS NULL, TRUE IS NOT NULL, TRUE IS NOT FALSE;

-- '.'
SELECT nested.int + 1, 1 + nested.int FROM t;

SELECT foo.select, foo.select.from;

-- IS DISTINCT FROM
SELECT 1 IS DISTINCT FROM 2;

SELECT
  -- break
  1 + 0 IS NOT DISTINCT FROM 1 + 1 AS distinct_result,
;

----- STRING -----
SELECT
  """
multiline string""",
  r'''
multiline string''',
;

----- ARRAY -----
SELECT
  [],
  [1, 2],
  ARRAY[1, 2],
  ARRAY<INT64>[1],
  nested.arr[OFFSET(1)],
  ARRAY<STRUCT<INT64, INT64>>[(1, 2)],
FROM t
;

----- STRUCT -----
SELECT
  (1, 2),
  STRUCT(1, 2),
  (1, 2)[0],
  STRUCT(1, 2)[0],
  STRUCT<INT64>(1),
  STRUCT<ARRAY<INT64>, x FLOAT64>([1], .1),
;

----- range literal -----
SELECT RANGE<DATE> "[2023-01-01, 2024-01-01)";

----- interval literal -----
SELECT
  INTERVAL 1 YEAR,
  INTERVAL 1 + 1 MONTH,
  INTERVAL '1' DAY,
  INTERVAL '1:2:3' HOUR TO SECOND,
  DATE_ADD('2000-01-01', INTERVAL 1 DAY),
;

----- JSON -----
SELECT JSON '{"key": "value"}';

SELECT json['key'] FROM t;

----- CASE expr -----
SELECT CASE 1 WHEN 1 THEN 'one' WHEN 2 THEN 'two' END;

SELECT
  CASE int
    WHEN 1 THEN 'one'
    WHEN 2 THEN 'two'
    WHEN 3 THEN 'three' -- comment
    ELSE NULL
  END,
  CASE WHEN int = 1 THEN 'one' ELSE 'other' END AS caseExpression,
  CASE
    -- break
    WHEN int = 1 THEN 'one'
    WHEN
      int IN (
        -- break
        2,
        3
      )
    THEN 'two or three'
    WHEN (
      longlonglonglonglonglongcolumnname = 4
      OR longlonglonglonglonglongcolumnname = 5
    )
    THEN "four or five"
    ELSE 'other'
  END,
FROM t
;

----- function -----
SELECT
  LEAST(1, 2),
  -- comment
  LEAST(1, 2),
;

-- CAST
SELECT CAST('1' AS INT64), SAFE_CAST('1' AS INT64);

SELECT CAST(b'\x48\x65\x6c\x6c\x6f' AS STRING FORMAT 'ASCII');

-- EXTRACT
SELECT
  EXTRACT(DAY FROM ts),
  EXTRACT(WEEK(SUNDAY) FROM ts),
  EXTRACT(DAY FROM ts AT TIME ZONE 'UTC'),
FROM t
;

-- ANY_VALUE
SELECT ANY_VALUE(x HAVING MAX y);

-- ARRAY_AGG
SELECT
  ARRAY_AGG(
    -- break parent
    DISTINCT
    int
    IGNORE NULLS
    ORDER BY int DESC
    LIMIT 100
  ),
  ARRAY_AGG(DISTINCT int IGNORE NULLS ORDER BY int DESC LIMIT 100),
FROM t
;

-- ARRAY
SELECT ARRAY(SELECT 1 UNION ALL SELECT 2);

-- ST_GEOGFROMTEXT
SELECT ST_GEOGFROMTEXT(str, oriented => TRUE) FROM t;

-- NORMALIZE
SELECT NORMALIZE('\u00ea', NFC);

-- date_part
SELECT
  DATE_DIFF(dt, dt, WEEK),
  DATE_DIFF(dt, dt, WEEK(MONDAY)),
  DATE_TRUNC(dt, DAY),
  LAST_DAY(dt, MONTH),
  LAST_DAY(dt),
FROM t
;

-- SAFE
SELECT SAFE.SUBSTR("foo", 0, 2);

-- KEYS, ADAD, HLL_COUNT, NET
SELECT
  KEYS.NEW_KEYSET('AEAD_AES_GCM_256'),
  SAFE.KEYS.NEW_KEYSET('AEAD_AES_GCM_256'),
;

----- window function -----
SELECT
  SUM(int) OVER (),
  SUM(int) OVER (PARTITION BY str),
  SUM(int) OVER (ORDER BY ts DESC),
  SUM(int) OVER (PARTITION BY str ORDER BY ts ASC, dt),
  SUM(int) OVER (ROWS 1 PRECEDING),
  SUM(int) OVER (
    PARTITION BY str
    ORDER BY ts, dt
    ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
  ),
  SUM(int) OVER named_window1,
  SUM(int) OVER (named_window1),
  LAST_VALUE(int) OVER (named_window2 ROWS BETWEEN 2 PRECEDING AND 2 FOLLOWING),
FROM t
WINDOW
  named_window1 AS (PARTITION BY str),
  named_window2 AS (PARTITION BY str ORDER BY int)
;

----- chained function call -----
SELECT (col).UPPER().LOWER();

SELECT
  TIMESTAMP '2024-01-01'.TIMESTAMP_TRUNC(month),
  CASE WHEN TRUE THEN TIMESTAMP '2024-01-01' END.TIMESTAMP_TRUNC(month),
;

SELECT (col).(safe.left)(3);

SELECT STRUCT('a' AS b).TO_JSON().b.JSON_VALUE().CONCAT('c');

SELECT
  "foo"
  .longfunctionname()
  .longfunctionname()
  .longfunctionname()
  .longfunctionname()
  -- comment
  .longfunctionname()
  .longfunctionname()
  .longfunctionname()
  .longfunctionname()
  .longfunctionname(),
;

----- with expression -----
SELECT WITH(a AS 'a', UPPER(a));

----- template -----
SELECT {{variable}}, {variable};
