----- comment -----
#standardSQL
select /* */ 1; -- end of statement

----- unary operator -----
select
  -1,
  +1,
  R'xxx',
  date '2020-01-01',
  timestamp R'2020-01-01',
  not true,
;
----- binary operator -----
select 1+2;
select (1+(-2)) * 3 in (9);
select (1+2) * 3 not between 10 + 0 and 11 + 2 or true;

-- BETWEEN
select
  1 between 0 and 3,
  1 not between 0 and 3,
;

-- IN
select
  1 in (1000000000000000, 2000000000000000, 3000000000000000, 4000000000000000, 5000000000000000),
  1 not in (1, 2, 3) as notOneTwoThree,
;

-- LIKE
select
  'a' like 'abc',
  'a' not like 'abc'
;

-- IS
select
  true is null,
  true is not null,
  true is not false,
;

-- '.'
select
  nested.int + 1,
  1 + nested.int,
from t
;

----- ARRAY -----
select
  [1,2],
  array[1,2],
  array<int64>[1],
  nested.arr[offset(1)],
  array<struct<int64, int64>>[(1,2)]
from t
;

----- STRUCT -----
select
  (1,2),
  struct(1,2),
  struct<int64>(1),
  struct<array<int64>, x float64>([1], .1)
;

----- CASE expr -----
select
  case int
    when 1 then 'one'
    when 2 then 'two'
    when 3
      -- comment
      then 'three'
    else null end,
  case when int = 1 then 'one' else 'other' end as caseExpression
from t
;

----- function -----
select least(1, 2);

-- cast
select cast('1' as int64);

-- extract
select
  extract(day from ts),
  extract(week(sunday) FROM ts),
  extract(day from ts at time zone 'UTC'),
from t
;



