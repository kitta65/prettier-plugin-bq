use super::*;

#[test]
fn test_parse_code_pipe() {
    let test_cases = vec![
        // ----- simple pipe syntax -----
        Box::new(SuccessTestCase::new(
            "\
FROM table
",
            "\
self: FROM (FromStatement)
expr:
  self: table (Identifier)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
FROM table;
",
            "\
self: FROM (FromStatement)
expr:
  self: table (Identifier)
semicolon:
  self: ; (Symbol)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
FROM table |> SELECT col
",
            "\
self: |> (PipeStatement)
left:
  self: FROM (FromStatement)
  expr:
    self: table (Identifier)
right:
  self: SELECT (SelectPipeOperator)
  exprs:
  - self: col (Identifier)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
FROM table |> SELECT col |> SELECT col;
",
            "\
self: |> (PipeStatement)
left:
  self: |> (PipeStatement)
  left:
    self: FROM (FromStatement)
    expr:
      self: table (Identifier)
  right:
    self: SELECT (SelectPipeOperator)
    exprs:
    - self: col (Identifier)
right:
  self: SELECT (SelectPipeOperator)
  exprs:
  - self: col (Identifier)
semicolon:
  self: ; (Symbol)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
WITH t AS (SELECT 1) FROM t
",
            "\
self: FROM (FromStatement)
expr:
  self: t (Identifier)
with:
  self: WITH (WithClause)
  queries:
  - self: t (WithQuery)
    as:
      self: AS (Keyword)
    stmt:
      self: ( (GroupedStatement)
      rparen:
        self: ) (Symbol)
      stmt:
        self: SELECT (SelectStatement)
        exprs:
        - self: 1 (NumericLiteral)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
SELECT * FROM (FROM t |> SELECT *)
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: * (Asterisk)
from:
  self: FROM (KeywordWithExpr)
  expr:
    self: ( (GroupedStatement)
    rparen:
      self: ) (Symbol)
    stmt:
      self: |> (PipeStatement)
      left:
        self: FROM (FromStatement)
        expr:
          self: t (Identifier)
      right:
        self: SELECT (SelectPipeOperator)
        exprs:
        - self: * (Asterisk)
",
            0,
        )),
        // ----- select statement -----
        Box::new(SuccessTestCase::new(
            "\
SELECT 1
|> SELECT *
",
            "\
self: |> (PipeStatement)
left:
  self: SELECT (SelectStatement)
  exprs:
  - self: 1 (NumericLiteral)
right:
  self: SELECT (SelectPipeOperator)
  exprs:
  - self: * (Asterisk)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
(SELECT 1)
|> SELECT *
",
            "\
self: |> (PipeStatement)
left:
  self: ( (GroupedStatement)
  rparen:
    self: ) (Symbol)
  stmt:
    self: SELECT (SelectStatement)
    exprs:
    - self: 1 (NumericLiteral)
right:
  self: SELECT (SelectPipeOperator)
  exprs:
  - self: * (Asterisk)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
SELECT 1 UNION ALL
SELECT 2
|> SELECT *
",
            "\
self: |> (PipeStatement)
left:
  self: UNION (SetOperator)
  distinct_or_all:
    self: ALL (Keyword)
  left:
    self: SELECT (SelectStatement)
    exprs:
    - self: 1 (NumericLiteral)
  right:
    self: SELECT (SelectStatement)
    exprs:
    - self: 2 (NumericLiteral)
right:
  self: SELECT (SelectPipeOperator)
  exprs:
  - self: * (Asterisk)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
(select 1) order by 1 limit 1
|> SELECT *
",
            "\
self: |> (PipeStatement)
left:
  self: ( (GroupedStatement)
  limit:
    self: limit (LimitClause)
    expr:
      self: 1 (NumericLiteral)
  orderby:
    self: order (XXXByExprs)
    by:
      self: by (Keyword)
    exprs:
    - self: 1 (NumericLiteral)
  rparen:
    self: ) (Symbol)
  stmt:
    self: select (SelectStatement)
    exprs:
    - self: 1 (NumericLiteral)
right:
  self: SELECT (SelectPipeOperator)
  exprs:
  - self: * (Asterisk)
",
            0,
        )),
        // ----- from statement -----
        Box::new(SuccessTestCase::new(
            "\
FROM tabe AS t1
JOIN table AS p2 USING (col)
",
            "\
self: FROM (FromStatement)
expr:
  self: JOIN (JoinOperator)
  left:
    self: tabe (Identifier)
    alias:
      self: t1 (Identifier)
    as:
      self: AS (Keyword)
  right:
    self: table (Identifier)
    alias:
      self: p2 (Identifier)
    as:
      self: AS (Keyword)
  using:
    self: ( (CallingFunction)
    args:
    - self: col (Identifier)
    func:
      self: USING (Identifier)
    rparen:
      self: ) (Symbol)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
(FROM table)
",
            "\
self: ( (GroupedStatement)
rparen:
  self: ) (Symbol)
stmt:
  self: FROM (FromStatement)
  expr:
    self: table (Identifier)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
(FROM table AS t) ORDER BY 1 LIMIT 1
|> SELECT *
         ",
            "\
self: |> (PipeStatement)
left:
  self: ( (GroupedStatement)
  limit:
    self: LIMIT (LimitClause)
    expr:
      self: 1 (NumericLiteral)
  orderby:
    self: ORDER (XXXByExprs)
    by:
      self: BY (Keyword)
    exprs:
    - self: 1 (NumericLiteral)
  rparen:
    self: ) (Symbol)
  stmt:
    self: FROM (FromStatement)
    expr:
      self: table (Identifier)
      alias:
        self: t (Identifier)
      as:
        self: AS (Keyword)
right:
  self: SELECT (SelectPipeOperator)
  exprs:
  - self: * (Asterisk)
",
            0,
        )),
        // ----- base pipe operator -----
        Box::new(SuccessTestCase::new(
            "\
FROM t |> EXTEND 1 AS one, 2 AS two,;
",
            "\
self: |> (PipeStatement)
left:
  self: FROM (FromStatement)
  expr:
    self: t (Identifier)
right:
  self: EXTEND (BasePipeOperator)
  exprs:
  - self: 1 (NumericLiteral)
    alias:
      self: one (Identifier)
    as:
      self: AS (Keyword)
    comma:
      self: , (Symbol)
  - self: 2 (NumericLiteral)
    alias:
      self: two (Identifier)
    as:
      self: AS (Keyword)
    comma:
      self: , (Symbol)
semicolon:
  self: ; (Symbol)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            // alias is array... but do not mind it!
            "\
FROM t |> AS u
",
            "\
self: |> (PipeStatement)
left:
  self: FROM (FromStatement)
  expr:
    self: t (Identifier)
right:
  self: AS (BasePipeOperator)
  exprs:
  - self: u (Identifier)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
FROM t |> CALL tvf() AS u
",
            "\
self: |> (PipeStatement)
left:
  self: FROM (FromStatement)
  expr:
    self: t (Identifier)
right:
  self: CALL (BasePipeOperator)
  exprs:
  - self: ( (CallingFunction)
    alias:
      self: u (Identifier)
    as:
      self: AS (Keyword)
    func:
      self: tvf (Identifier)
    rparen:
      self: ) (Symbol)
",
            0,
        )),
        // single keyword
        Box::new(SuccessTestCase::new(
            "\
FROM t |> ORDER BY col1 DESC NULLS LAST, col2
",
            "\
self: |> (PipeStatement)
left:
  self: FROM (FromStatement)
  expr:
    self: t (Identifier)
right:
  self: ORDER (BasePipeOperator)
  exprs:
  - self: col1 (Identifier)
    comma:
      self: , (Symbol)
    null_order:
    - self: NULLS (Keyword)
    - self: LAST (Keyword)
    order:
      self: DESC (Keyword)
  - self: col2 (Identifier)
  keywords:
    self: BY (Keyword)
",
            0,
        )),
        // ----- select pipe operator -----
        Box::new(SuccessTestCase::new(
            // trailing comma is allowed
            "\
FROM t |> SELECT col1, col2,
",
            "\
self: |> (PipeStatement)
left:
  self: FROM (FromStatement)
  expr:
    self: t (Identifier)
right:
  self: SELECT (SelectPipeOperator)
  exprs:
  - self: col1 (Identifier)
    comma:
      self: , (Symbol)
  - self: col2 (Identifier)
    comma:
      self: , (Symbol)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
FROM t |> SELECT DISTINCT col
",
            "\
self: |> (PipeStatement)
left:
  self: FROM (FromStatement)
  expr:
    self: t (Identifier)
right:
  self: SELECT (SelectPipeOperator)
  exprs:
  - self: col (Identifier)
  keywords:
    self: DISTINCT (Keyword)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
FROM t |> SELECT ALL AS STRUCT col
",
            "\
self: |> (PipeStatement)
left:
  self: FROM (FromStatement)
  expr:
    self: t (Identifier)
right:
  self: SELECT (SelectPipeOperator)
  exprs:
  - self: col (Identifier)
  keywords:
    self: ALL (KeywordSequence)
    next_keyword:
      self: AS (KeywordSequence)
      next_keyword:
        self: STRUCT (Keyword)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
FROM t |> SELECT col WINDOW a AS (PARTITION BY b)
",
            "\
self: |> (PipeStatement)
left:
  self: FROM (FromStatement)
  expr:
    self: t (Identifier)
right:
  self: SELECT (SelectPipeOperator)
  exprs:
  - self: col (Identifier)
  window:
    self: WINDOW (WindowClause)
    window_exprs:
    - self: a (WindowExpr)
      as:
        self: AS (Keyword)
      window:
        self: ( (WindowSpecification)
        partitionby:
          self: PARTITION (XXXByExprs)
          by:
            self: BY (Keyword)
          exprs:
          - self: b (Identifier)
        rparen:
          self: ) (Symbol)
",
            0,
        )),
        // ----- limit pipe operator -----
        Box::new(SuccessTestCase::new(
            "\
FROM t |> LIMIT 1
",
            "\
self: |> (PipeStatement)
left:
  self: FROM (FromStatement)
  expr:
    self: t (Identifier)
right:
  self: LIMIT (LimitPipeOperator)
  exprs:
  - self: 1 (NumericLiteral)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
FROM t |> LIMIT 1 OFFSET 2;
",
            "\
self: |> (PipeStatement)
left:
  self: FROM (FromStatement)
  expr:
    self: t (Identifier)
right:
  self: LIMIT (LimitPipeOperator)
  exprs:
  - self: 1 (NumericLiteral)
  offset:
    self: OFFSET (KeywordWithExpr)
    expr:
      self: 2 (NumericLiteral)
semicolon:
  self: ; (Symbol)
",
            0,
        )),
        // ----- aggregate pipe operator -----
        Box::new(SuccessTestCase::new(
            "\
FROM t |> AGGREGATE COUNT(*) AS cnt DESC NULLS LAST
",
            "\
self: |> (PipeStatement)
left:
  self: FROM (FromStatement)
  expr:
    self: t (Identifier)
right:
  self: AGGREGATE (AggregatePipeOperator)
  exprs:
  - self: ( (CallingFunction)
    alias:
      self: cnt (Identifier)
    args:
    - self: * (Asterisk)
    as:
      self: AS (Keyword)
    func:
      self: COUNT (Identifier)
    null_order:
    - self: NULLS (Keyword)
    - self: LAST (Keyword)
    order:
      self: DESC (Keyword)
    rparen:
      self: ) (Symbol)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
FROM t
|>
  AGGREGATE COUNT(*)
  GROUP BY col1 AS col_a DESC NULLS LAST, col2
",
            "\
self: |> (PipeStatement)
left:
  self: FROM (FromStatement)
  expr:
    self: t (Identifier)
right:
  self: AGGREGATE (AggregatePipeOperator)
  exprs:
  - self: ( (CallingFunction)
    args:
    - self: * (Asterisk)
    func:
      self: COUNT (Identifier)
    rparen:
      self: ) (Symbol)
  groupby:
    self: GROUP (GroupByExprs)
    by:
      self: BY (Keyword)
    exprs:
    - self: col1 (Identifier)
      alias:
        self: col_a (Identifier)
      as:
        self: AS (Keyword)
      comma:
        self: , (Symbol)
      null_order:
      - self: NULLS (Keyword)
      - self: LAST (Keyword)
      order:
        self: DESC (Keyword)
    - self: col2 (Identifier)
",
            0,
        )),
        // ----- distinct pipe operator -----
        Box::new(SuccessTestCase::new(
            "\
FROM t |> DISTINCT;
",
            "\
self: |> (PipeStatement)
left:
  self: FROM (FromStatement)
  expr:
    self: t (Identifier)
right:
  self: DISTINCT (Keyword)
semicolon:
  self: ; (Symbol)
",
            0,
        )),
        // ----- union pipe operator -----
        Box::new(SuccessTestCase::new(
            "\
FROM t |> UNION ALL (SELECT 1), (SELECT 2);
",
            "\
self: |> (PipeStatement)
left:
  self: FROM (FromStatement)
  expr:
    self: t (Identifier)
right:
  self: UNION (UnionPipeOperator)
  exprs:
  - self: ( (GroupedStatement)
    comma:
      self: , (Symbol)
    rparen:
      self: ) (Symbol)
    stmt:
      self: SELECT (SelectStatement)
      exprs:
      - self: 1 (NumericLiteral)
  - self: ( (GroupedStatement)
    rparen:
      self: ) (Symbol)
    stmt:
      self: SELECT (SelectStatement)
      exprs:
      - self: 2 (NumericLiteral)
  keywords:
    self: ALL (Keyword)
semicolon:
  self: ; (Symbol)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
FROM t |> UNION ALL BY NAME (SELECT 1)
",
            "\
self: |> (PipeStatement)
left:
  self: FROM (FromStatement)
  expr:
    self: t (Identifier)
right:
  self: UNION (UnionPipeOperator)
  by:
    self: BY (KeywordSequence)
    next_keyword:
      self: NAME (Keyword)
  exprs:
  - self: ( (GroupedStatement)
    rparen:
      self: ) (Symbol)
    stmt:
      self: SELECT (SelectStatement)
      exprs:
      - self: 1 (NumericLiteral)
  keywords:
    self: ALL (Keyword)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
FROM t |> LEFT OUTER INTERSECT DISTINCT BY NAME ON (col) (SELECT 1)
",
            "\
self: |> (PipeStatement)
left:
  self: FROM (FromStatement)
  expr:
    self: t (Identifier)
right:
  self: INTERSECT (UnionPipeOperator)
  by:
    self: BY (KeywordSequence)
    next_keyword:
      self: NAME (KeywordSequence)
      next_keyword:
        self: ON (KeywordWithGroupedXXX)
        group:
          self: ( (GroupedExprs)
          exprs:
          - self: col (Identifier)
          rparen:
            self: ) (Symbol)
  exprs:
  - self: ( (GroupedStatement)
    rparen:
      self: ) (Symbol)
    stmt:
      self: SELECT (SelectStatement)
      exprs:
      - self: 1 (NumericLiteral)
  keywords:
    self: DISTINCT (Keyword)
  method:
    self: LEFT (KeywordSequence)
    next_keyword:
      self: OUTER (Keyword)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
SELECT *
|> EXCEPT DISTINCT
(
  SELECT 1
  |> EXCEPT DISTINCT (SELECT 2)
);
",
            "\
self: |> (PipeStatement)
left:
  self: SELECT (SelectStatement)
  exprs:
  - self: * (Asterisk)
right:
  self: EXCEPT (UnionPipeOperator)
  exprs:
  - self: ( (GroupedStatement)
    rparen:
      self: ) (Symbol)
    stmt:
      self: |> (PipeStatement)
      left:
        self: SELECT (SelectStatement)
        exprs:
        - self: 1 (NumericLiteral)
      right:
        self: EXCEPT (UnionPipeOperator)
        exprs:
        - self: ( (GroupedStatement)
          rparen:
            self: ) (Symbol)
          stmt:
            self: SELECT (SelectStatement)
            exprs:
            - self: 2 (NumericLiteral)
        keywords:
          self: DISTINCT (Keyword)
  keywords:
    self: DISTINCT (Keyword)
semicolon:
  self: ; (Symbol)
",
            0,
        )),
        // ----- join pipe operator -----
        Box::new(SuccessTestCase::new(
            "\
FROM t |> JOIN t USING(col)
",
            "\
self: |> (PipeStatement)
left:
  self: FROM (FromStatement)
  expr:
    self: t (Identifier)
right:
  self: JOIN (JoinPipeOperator)
  exprs:
  - self: t (Identifier)
  using:
    self: ( (CallingFunction)
    args:
    - self: col (Identifier)
    func:
      self: USING (Identifier)
    rparen:
      self: ) (Symbol)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
FROM t |> JOIN (SELECT 1) AS u ON foo = bar
",
            "\
self: |> (PipeStatement)
left:
  self: FROM (FromStatement)
  expr:
    self: t (Identifier)
right:
  self: JOIN (JoinPipeOperator)
  exprs:
  - self: ( (GroupedStatement)
    alias:
      self: u (Identifier)
    as:
      self: AS (Keyword)
    rparen:
      self: ) (Symbol)
    stmt:
      self: SELECT (SelectStatement)
      exprs:
      - self: 1 (NumericLiteral)
  on:
    self: ON (KeywordWithExpr)
    expr:
      self: = (BinaryOperator)
      left:
        self: foo (Identifier)
      right:
        self: bar (Identifier)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
FROM t |> CROSS JOIN u
",
            "\
self: |> (PipeStatement)
left:
  self: FROM (FromStatement)
  expr:
    self: t (Identifier)
right:
  self: JOIN (JoinPipeOperator)
  exprs:
  - self: u (Identifier)
  method:
    self: CROSS (Keyword)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
FROM t |> LEFT OUTER JOIN u as u2
",
            "\
self: |> (PipeStatement)
left:
  self: FROM (FromStatement)
  expr:
    self: t (Identifier)
right:
  self: JOIN (JoinPipeOperator)
  exprs:
  - self: u (Identifier)
    alias:
      self: u2 (Identifier)
    as:
      self: as (Keyword)
  method:
    self: LEFT (KeywordSequence)
    next_keyword:
      self: OUTER (Keyword)
",
            0,
        )),
        // ----- tablesample pipe operator -----
        Box::new(SuccessTestCase::new(
            "\
FROM t |> TABLESAMPLE SYSTEM (1 PERCENT)
",
            "\
self: |> (PipeStatement)
left:
  self: FROM (FromStatement)
  expr:
    self: t (Identifier)
right:
  self: TABLESAMPLE (TableSamplePipeOperator)
  group:
    self: ( (TableSampleRatio)
    expr:
      self: 1 (NumericLiteral)
    percent:
      self: PERCENT (Keyword)
    rparen:
      self: ) (Symbol)
  keywords:
    self: SYSTEM (Keyword)
",
            0,
        )),
        // ----- pivot pipe operator -----
        Box::new(SuccessTestCase::new(
            "\
FROM t |> PIVOT (SUM(sales) FOR quarter IN ('Q1', 'Q2')) AS q
",
            "\
self: |> (PipeStatement)
left:
  self: FROM (FromStatement)
  expr:
    self: t (Identifier)
right:
  self: PIVOT (PivotPipeOperator)
  alias:
    self: q (Identifier)
  as:
    self: AS (Keyword)
  config:
    self: ( (PivotConfig)
    exprs:
    - self: ( (CallingFunction)
      args:
      - self: sales (Identifier)
      func:
        self: SUM (Identifier)
      rparen:
        self: ) (Symbol)
    for:
      self: FOR (KeywordWithExpr)
      expr:
        self: quarter (Identifier)
    in:
      self: IN (KeywordWithGroupedXXX)
      group:
        self: ( (GroupedExprs)
        exprs:
        - self: 'Q1' (StringLiteral)
          comma:
            self: , (Symbol)
        - self: 'Q2' (StringLiteral)
        rparen:
          self: ) (Symbol)
    rparen:
      self: ) (Symbol)
",
            0,
        )),
        // ----- unpivot pipe operator -----
        Box::new(SuccessTestCase::new(
            "\
FROM t |> UNPIVOT (sales FOR quarter IN (q1, q2)) AS q
",
            "\
self: |> (PipeStatement)
left:
  self: FROM (FromStatement)
  expr:
    self: t (Identifier)
right:
  self: UNPIVOT (UnpivotPipeOperator)
  alias:
    self: q (Identifier)
  as:
    self: AS (Keyword)
  config:
    self: ( (UnpivotConfig)
    expr:
      self: sales (Identifier)
    for:
      self: FOR (KeywordWithExpr)
      expr:
        self: quarter (Identifier)
    in:
      self: IN (KeywordWithGroupedXXX)
      group:
        self: ( (GroupedExprs)
        exprs:
        - self: q1 (Identifier)
          comma:
            self: , (Symbol)
        - self: q2 (Identifier)
        rparen:
          self: ) (Symbol)
    rparen:
      self: ) (Symbol)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
FROM t |> UNPIVOT include NULLS (sales FOR quarter IN (q1, q2)) AS q
",
            "\
self: |> (PipeStatement)
left:
  self: FROM (FromStatement)
  expr:
    self: t (Identifier)
right:
  self: UNPIVOT (UnpivotPipeOperator)
  alias:
    self: q (Identifier)
  as:
    self: AS (Keyword)
  config:
    self: ( (UnpivotConfig)
    expr:
      self: sales (Identifier)
    for:
      self: FOR (KeywordWithExpr)
      expr:
        self: quarter (Identifier)
    in:
      self: IN (KeywordWithGroupedXXX)
      group:
        self: ( (GroupedExprs)
        exprs:
        - self: q1 (Identifier)
          comma:
            self: , (Symbol)
        - self: q2 (Identifier)
        rparen:
          self: ) (Symbol)
    rparen:
      self: ) (Symbol)
  keywords:
    self: include (KeywordSequence)
    next_keyword:
      self: NULLS (Keyword)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
FROM t |> MATCH_RECOGNIZE ()
",
            "\
self: |> (PipeStatement)
left:
  self: FROM (FromStatement)
  expr:
    self: t (Identifier)
right:
  self: MATCH_RECOGNIZE (MatchRecognizePipeOperator)
  config:
    self: ( (MatchRecognizeConfig)
    rparen:
      self: ) (Symbol)
",
            0,
        )),
        // ----- with pipe operator -----
        Box::new(SuccessTestCase::new(
            "\
FROM t
|> WITH u AS (
    SELECT 1 AS key
  )
|> INNER JOIN u USING (key)
",
            "\
self: |> (PipeStatement)
left:
  self: |> (PipeStatement)
  left:
    self: FROM (FromStatement)
    expr:
      self: t (Identifier)
  right:
    self: WITH (WithPipeOperator)
    queries:
    - self: u (WithQuery)
      as:
        self: AS (Keyword)
      stmt:
        self: ( (GroupedStatement)
        rparen:
          self: ) (Symbol)
        stmt:
          self: SELECT (SelectStatement)
          exprs:
          - self: 1 (NumericLiteral)
            alias:
              self: key (Identifier)
            as:
              self: AS (Keyword)
right:
  self: JOIN (JoinPipeOperator)
  exprs:
  - self: u (Identifier)
  method:
    self: INNER (Keyword)
  using:
    self: ( (CallingFunction)
    args:
    - self: key (Identifier)
    func:
      self: USING (Identifier)
    rparen:
      self: ) (Symbol)
",
            0,
        )),
        // allow trailing comma
        Box::new(SuccessTestCase::new(
            "\
FROM t
|> WITH
  u AS (
    SELECT 1 AS key
  ),
  v AS (
    SELECT 2 AS key
  ),
|> INNER JOIN u USING (key)
",
            "\
self: |> (PipeStatement)
left:
  self: |> (PipeStatement)
  left:
    self: FROM (FromStatement)
    expr:
      self: t (Identifier)
  right:
    self: WITH (WithPipeOperator)
    queries:
    - self: u (WithQuery)
      as:
        self: AS (Keyword)
      comma:
        self: , (Symbol)
      stmt:
        self: ( (GroupedStatement)
        rparen:
          self: ) (Symbol)
        stmt:
          self: SELECT (SelectStatement)
          exprs:
          - self: 1 (NumericLiteral)
            alias:
              self: key (Identifier)
            as:
              self: AS (Keyword)
    - self: v (WithQuery)
      as:
        self: AS (Keyword)
      comma:
        self: , (Symbol)
      stmt:
        self: ( (GroupedStatement)
        rparen:
          self: ) (Symbol)
        stmt:
          self: SELECT (SelectStatement)
          exprs:
          - self: 2 (NumericLiteral)
            alias:
              self: key (Identifier)
            as:
              self: AS (Keyword)
right:
  self: JOIN (JoinPipeOperator)
  exprs:
  - self: u (Identifier)
  method:
    self: INNER (Keyword)
  using:
    self: ( (CallingFunction)
    args:
    - self: key (Identifier)
    func:
      self: USING (Identifier)
    rparen:
      self: ) (Symbol)
",
            0,
        )),
    ];
    for t in test_cases {
        t.test();
    }
}
