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

-- BETWEEN
select
  1 between 0 and 3,
  1 not between 0 and 3,
;

-- IN
select
  1 in (1, 2, 3, 40000000000000000000000000000000000000000000000000000000000000000),
  1 not in (1, 2, 3) as notOneTwoThree,
;

-- LIKE
select
  'a' like 'abc',
  'a' not like 'abc'
;

-- IS
select
  x is null,
  x is not null,
  true is not false,
;

-- '.'
select
  t.struct_col.num + 1,
  1 + t.struct_col.num,
;
