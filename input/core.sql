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
select 1 in (
  -- break
  select 1
)
;
select 1 in unnest([1, 2]);


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

-- IS DISTINCT FROM
select 1 is distinct from 2;

select
  -- break
  1 + 0 is not distinct from 1 + 1 as distinct_result
;

----- STRING -----
select """
multiline string""", R'''
multiline string'''
;

----- ARRAY -----
select
  [],
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

----- interval literal -----
select
  interval 1 year,
  interval 1 + 1 month,
  interval '1' day,
  interval '1:2:3' hour to second,
  date_add('2000-01-01', interval 1 day),
;

----- JSON -----
select json '{"key": "value"}';

select json['key'] from t;

----- CASE expr -----
select case 1 when 1 then 'one' when 2 then 'two' end;

select
  case int
    when 1 then 'one'
    when 2 then 'two'
    when 3
      -- comment
      then 'three'
    else null end,
  case when int = 1 then 'one' else 'other' end as caseExpression,
  case
    -- break
    when int = 1 then 'one'
    when
      int in (
        -- break
        2,
        3
      )
      then 'two or three'
    else 'other' end
from t
;

----- function -----
select
  least(1, 2),
  -- comment
  least(1, 2),
;

-- CAST
select cast('1' as int64), safe_cast('1' as int64);

select cast(b'\x48\x65\x6c\x6c\x6f' as string format 'ASCII');

-- EXTRACT
select
  extract(day from ts),
  extract(week(sunday) FROM ts),
  extract(day from ts at time zone 'UTC'),
from t
;

-- ARRAY_AGG
select
  array_agg(
    -- break parent
    distinct
    int
    ignore nulls
    order by int desc
    limit 100
  ),
  array_agg(distinct int ignore nulls order by int desc limit 100),
from t
;

-- ARRAY
select array(select 1 union all select 2);

-- ST_GEOGFROMTEXT
select st_geogfromtext(str, oriented => true) from t;

-- NORMALIZE
select normalize('\u00ea', nfc);

-- date_part
select
  date_diff(dt, dt, week),
  date_diff(dt, dt, week(monday)),
  date_trunc(dt, day),
  last_day(dt, month),
  last_day(dt)
from t;

-- SAFE
select safe.substr("foo", 0, 2);

-- KEYS, ADAD, HLL_COUNT, NET
select
  keys.new_keyset('AEAD_AES_GCM_256'),
  safe.keys.new_keyset('AEAD_AES_GCM_256')
;

----- window function -----
select
  sum(int) over (),
  sum(int) over (partition by str),
  sum(int) over (order by ts desc),
  sum(int) over (partition by str order by ts asc, dt),
  sum(int) over (rows 1 preceding),
  sum(int) over (partition by str order by ts, dt rows between unbounded preceding and unbounded following),
  sum(int) over named_window1,
  sum(int) over (named_window1),
  last_value(int) over (named_window2 rows between 2 preceding and 2 following),
from t
window
  named_window1 as (partition by str),
  named_window2 as (partition by str order by int)
;

----- template -----
select {{variable}}, {variable};
