use super::*;

#[test]
fn test_parse_code_select() {
    let test_cases = vec![
        Box::new(SuccessTestCase::new(
            "\
SELECT 1;
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: 1 (NumericLiteral)
semicolon:
  self: ; (Symbol)
",
            0,
        )),
        // trailing comma
        Box::new(SuccessTestCase::new(
            "\
SELECT
  1,
  2,
FROM t;
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: 1 (NumericLiteral)
  comma:
    self: , (Symbol)
- self: 2 (NumericLiteral)
  comma:
    self: , (Symbol)
from:
  self: FROM (KeywordWithExpr)
  expr:
    self: t (Identifier)
semicolon:
  self: ; (Symbol)
",
            0,
        )),
        // grouped
        Box::new(SuccessTestCase::new(
            "\
(SELECT 1);
",
            "\
self: ( (GroupedStatement)
rparen:
  self: ) (Symbol)
semicolon:
  self: ; (Symbol)
stmt:
  self: SELECT (SelectStatement)
  exprs:
  - self: 1 (NumericLiteral)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
((SELECT 1));
",
            "\
self: ( (GroupedStatement)
rparen:
  self: ) (Symbol)
semicolon:
  self: ; (Symbol)
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
        // ----- set operator -----
        Box::new(SuccessTestCase::new(
            "\
SELECT 1 UNION ALL SELECT 2;
",
            "\
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
semicolon:
  self: ; (Symbol)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
SELECT 1 INTERSECT DISTINCT (SELECT 2);
",
            "\
self: INTERSECT (SetOperator)
distinct_or_all:
  self: DISTINCT (Keyword)
left:
  self: SELECT (SelectStatement)
  exprs:
  - self: 1 (NumericLiteral)
right:
  self: ( (GroupedStatement)
  rparen:
    self: ) (Symbol)
  stmt:
    self: SELECT (SelectStatement)
    exprs:
    - self: 2 (NumericLiteral)
semicolon:
  self: ; (Symbol)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
(SELECT 1) EXCEPT DISTINCT SELECT 2;
",
            "\
self: EXCEPT (SetOperator)
distinct_or_all:
  self: DISTINCT (Keyword)
left:
  self: ( (GroupedStatement)
  rparen:
    self: ) (Symbol)
  stmt:
    self: SELECT (SelectStatement)
    exprs:
    - self: 1 (NumericLiteral)
right:
  self: SELECT (SelectStatement)
  exprs:
  - self: 2 (NumericLiteral)
semicolon:
  self: ; (Symbol)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3;
",
            "\
self: UNION (SetOperator)
distinct_or_all:
  self: ALL (Keyword)
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
  self: SELECT (SelectStatement)
  exprs:
  - self: 3 (NumericLiteral)
semicolon:
  self: ; (Symbol)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
SELECT 1 UNION ALL (SELECT 2 UNION ALL SELECT 3);
",
            "\
self: UNION (SetOperator)
distinct_or_all:
  self: ALL (Keyword)
left:
  self: SELECT (SelectStatement)
  exprs:
  - self: 1 (NumericLiteral)
right:
  self: ( (GroupedStatement)
  rparen:
    self: ) (Symbol)
  stmt:
    self: UNION (SetOperator)
    distinct_or_all:
      self: ALL (Keyword)
    left:
      self: SELECT (SelectStatement)
      exprs:
      - self: 2 (NumericLiteral)
    right:
      self: SELECT (SelectStatement)
      exprs:
      - self: 3 (NumericLiteral)
semicolon:
  self: ; (Symbol)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
SELECT * FROM (SELECT 1 UNION ALL SELECT 2) LIMIT 100
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
limit:
  self: LIMIT (LimitClause)
  expr:
    self: 100 (NumericLiteral)
",
            0,
        )),
        // NOTE `WITH` belongs to `UNION ALL`
        Box::new(SuccessTestCase::new(
            "\
WITH tmp AS (SELECT 1)
SELECT * FROM tmp
UNION ALL
SELECT * FROM tmp
",
            "\
self: UNION (SetOperator)
distinct_or_all:
  self: ALL (Keyword)
left:
  self: SELECT (SelectStatement)
  exprs:
  - self: * (Asterisk)
  from:
    self: FROM (KeywordWithExpr)
    expr:
      self: tmp (Identifier)
right:
  self: SELECT (SelectStatement)
  exprs:
  - self: * (Asterisk)
  from:
    self: FROM (KeywordWithExpr)
    expr:
      self: tmp (Identifier)
with:
  self: WITH (WithClause)
  queries:
  - self: tmp (WithQuery)
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
(WITH tmp AS (SELECT 1) SELECT * FROM tmp)
UNION ALL
SELECT 2
",
            "\
self: UNION (SetOperator)
distinct_or_all:
  self: ALL (Keyword)
left:
  self: ( (GroupedStatement)
  rparen:
    self: ) (Symbol)
  stmt:
    self: SELECT (SelectStatement)
    exprs:
    - self: * (Asterisk)
    from:
      self: FROM (KeywordWithExpr)
      expr:
        self: tmp (Identifier)
    with:
      self: WITH (WithClause)
      queries:
      - self: tmp (WithQuery)
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
right:
  self: SELECT (SelectStatement)
  exprs:
  - self: 2 (NumericLiteral)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
SELECT 1
FROM
  (SELECT 2)
UNION ALL
SELECT 3
",
            "\
self: UNION (SetOperator)
distinct_or_all:
  self: ALL (Keyword)
left:
  self: SELECT (SelectStatement)
  exprs:
  - self: 1 (NumericLiteral)
  from:
    self: FROM (KeywordWithExpr)
    expr:
      self: ( (GroupedStatement)
      rparen:
        self: ) (Symbol)
      stmt:
        self: SELECT (SelectStatement)
        exprs:
        - self: 2 (NumericLiteral)
right:
  self: SELECT (SelectStatement)
  exprs:
  - self: 3 (NumericLiteral)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
SELECT 1 INNER UNION ALL BY NAME SELECT 2
",
            "\
self: UNION (SetOperator)
by:
  self: BY (KeywordSequence)
  next_keyword:
    self: NAME (Keyword)
distinct_or_all:
  self: ALL (Keyword)
left:
  self: SELECT (SelectStatement)
  exprs:
  - self: 1 (NumericLiteral)
method:
  self: INNER (Keyword)
right:
  self: SELECT (SelectStatement)
  exprs:
  - self: 2 (NumericLiteral)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
SELECT 1 LEFT UNION ALL BY NAME SELECT 2
",
            "\
self: UNION (SetOperator)
by:
  self: BY (KeywordSequence)
  next_keyword:
    self: NAME (Keyword)
distinct_or_all:
  self: ALL (Keyword)
left:
  self: SELECT (SelectStatement)
  exprs:
  - self: 1 (NumericLiteral)
method:
  self: LEFT (Keyword)
right:
  self: SELECT (SelectStatement)
  exprs:
  - self: 2 (NumericLiteral)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
SELECT 1 FULL OUTER UNION ALL BY NAME ON (foo) SELECT 2
",
            "\
self: UNION (SetOperator)
by:
  self: BY (KeywordSequence)
  next_keyword:
    self: NAME (KeywordSequence)
    next_keyword:
      self: ON (KeywordWithGroupedXXX)
      group:
        self: ( (GroupedExprs)
        exprs:
        - self: foo (Identifier)
        rparen:
          self: ) (Symbol)
distinct_or_all:
  self: ALL (Keyword)
left:
  self: SELECT (SelectStatement)
  exprs:
  - self: 1 (NumericLiteral)
method:
  self: FULL (KeywordSequence)
  next_keyword:
    self: OUTER (Keyword)
right:
  self: SELECT (SelectStatement)
  exprs:
  - self: 2 (NumericLiteral)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
SELECT 1 UNION ALL CORRESPONDING SELECT 2
",
            "\
self: UNION (SetOperator)
corresponding:
  self: CORRESPONDING (Keyword)
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
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
SELECT 1 UNION ALL STRICT CORRESPONDING SELECT 2
",
            "\
self: UNION (SetOperator)
corresponding:
  self: STRICT (KeywordSequence)
  next_keyword:
    self: CORRESPONDING (Keyword)
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
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
SELECT 1 UNION ALL STRICT CORRESPONDING BY (foo, bar) SELECT 2
",
            "\
self: UNION (SetOperator)
corresponding:
  self: STRICT (KeywordSequence)
  next_keyword:
    self: CORRESPONDING (KeywordSequence)
    next_keyword:
      self: BY (KeywordWithGroupedXXX)
      group:
        self: ( (GroupedExprs)
        exprs:
        - self: foo (Identifier)
          comma:
            self: , (Symbol)
        - self: bar (Identifier)
        rparen:
          self: ) (Symbol)
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
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
SELECT 1 UNION ALL CORRESPONDING BY (foo) SELECT 2
",
            "\
self: UNION (SetOperator)
corresponding:
  self: CORRESPONDING (KeywordSequence)
  next_keyword:
    self: BY (KeywordWithGroupedXXX)
    group:
      self: ( (GroupedExprs)
      exprs:
      - self: foo (Identifier)
      rparen:
        self: ) (Symbol)
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
",
            0,
        )),
        // ----- WITH clause -----
        Box::new(SuccessTestCase::new(
            "\
WITH a AS (SELECT 1) SELECT 2;
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: 2 (NumericLiteral)
semicolon:
  self: ; (Symbol)
with:
  self: WITH (WithClause)
  queries:
  - self: a (WithQuery)
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
WITH a AS (SELECT 1) (SELECT 2);
",
            "\
self: ( (GroupedStatement)
rparen:
  self: ) (Symbol)
semicolon:
  self: ; (Symbol)
stmt:
  self: SELECT (SelectStatement)
  exprs:
  - self: 2 (NumericLiteral)
with:
  self: WITH (WithClause)
  queries:
  - self: a (WithQuery)
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
WITH
  a AS (SELECT 1),
  b AS (SELECT 2 FROM t WHERE TRUE)
SELECT 3
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: 3 (NumericLiteral)
with:
  self: WITH (WithClause)
  queries:
  - self: a (WithQuery)
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
  - self: b (WithQuery)
    as:
      self: AS (Keyword)
    stmt:
      self: ( (GroupedStatement)
      rparen:
        self: ) (Symbol)
      stmt:
        self: SELECT (SelectStatement)
        exprs:
        - self: 2 (NumericLiteral)
        from:
          self: FROM (KeywordWithExpr)
          expr:
            self: t (Identifier)
        where:
          self: WHERE (KeywordWithExpr)
          expr:
            self: TRUE (BooleanLiteral)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
WITH RECURSIVE temp AS (
  SELECT 1 AS n
  UNION ALL
  SELECT n + 1 FROM temp WHERE n < 3
)
SELECT n FROM temp
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: n (Identifier)
from:
  self: FROM (KeywordWithExpr)
  expr:
    self: temp (Identifier)
with:
  self: WITH (WithClause)
  queries:
  - self: temp (WithQuery)
    as:
      self: AS (Keyword)
    stmt:
      self: ( (GroupedStatement)
      rparen:
        self: ) (Symbol)
      stmt:
        self: UNION (SetOperator)
        distinct_or_all:
          self: ALL (Keyword)
        left:
          self: SELECT (SelectStatement)
          exprs:
          - self: 1 (NumericLiteral)
            alias:
              self: n (Identifier)
            as:
              self: AS (Keyword)
        right:
          self: SELECT (SelectStatement)
          exprs:
          - self: + (BinaryOperator)
            left:
              self: n (Identifier)
            right:
              self: 1 (NumericLiteral)
          from:
            self: FROM (KeywordWithExpr)
            expr:
              self: temp (Identifier)
          where:
            self: WHERE (KeywordWithExpr)
            expr:
              self: < (BinaryOperator)
              left:
                self: n (Identifier)
              right:
                self: 3 (NumericLiteral)
  recursive:
    self: RECURSIVE (Keyword)
",
            0,
        )),
        // ----- SELECT clause -----
        // DIFFERENTIAL_PRIVACY
        Box::new(SuccessTestCase::new(
            "\
SELECT WITH DIFFERENTIAL_PRIVACY OPTIONS() col1
",
            "\
self: SELECT (SelectStatement)
differential_privacy:
  self: WITH (DifferentialPrivacyClause)
  differential_privacy:
    self: DIFFERENTIAL_PRIVACY (Keyword)
  options:
    self: OPTIONS (KeywordWithGroupedXXX)
    group:
      self: ( (GroupedExprs)
      rparen:
        self: ) (Symbol)
exprs:
- self: col1 (Identifier)
",
            0,
        )),
        // DISTINCT
        Box::new(SuccessTestCase::new(
            "\
SELECT DISTINCT 1;
",
            "\
self: SELECT (SelectStatement)
distinct_or_all:
  self: DISTINCT (Keyword)
exprs:
- self: 1 (NumericLiteral)
semicolon:
  self: ; (Symbol)
",
            0,
        )),
        // ALL
        Box::new(SuccessTestCase::new(
            "\
SELECT ALL 1;
",
            "\
self: SELECT (SelectStatement)
distinct_or_all:
  self: ALL (Keyword)
exprs:
- self: 1 (NumericLiteral)
semicolon:
  self: ; (Symbol)
",
            0,
        )),
        // alias
        Box::new(SuccessTestCase::new(
            "\
SELECT 1 AS one, 2 two
",
            "\
self: SELECT (SelectStatement)
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
",
            0,
        )),
        // * EXCEPT
        Box::new(SuccessTestCase::new(
            "\
SELECT * EXCEPT (col1)
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: * (Asterisk)
  except:
    self: EXCEPT (KeywordWithGroupedXXX)
    group:
      self: ( (GroupedExprs)
      exprs:
      - self: col1 (Identifier)
      rparen:
        self: ) (Symbol)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
SELECT t.* EXCEPT(col1, col2)
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: . (DotOperator)
  left:
    self: t (Identifier)
  right:
    self: * (Asterisk)
    except:
      self: EXCEPT (KeywordWithGroupedXXX)
      group:
        self: ( (GroupedExprs)
        exprs:
        - self: col1 (Identifier)
          comma:
            self: , (Symbol)
        - self: col2 (Identifier)
        rparen:
          self: ) (Symbol)
",
            0,
        )),
        // * REPLACE
        Box::new(SuccessTestCase::new(
            "\
SELECT * REPLACE (col1 * 2 AS _col1)
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: * (Asterisk)
  replace:
    self: REPLACE (KeywordWithGroupedXXX)
    group:
      self: ( (GroupedExprs)
      exprs:
      - self: * (BinaryOperator)
        alias:
          self: _col1 (Identifier)
        as:
          self: AS (Keyword)
        left:
          self: col1 (Identifier)
        right:
          self: 2 (NumericLiteral)
      rparen:
        self: ) (Symbol)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
SELECT t.* REPLACE (col2 * 2 AS _col2)
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: . (DotOperator)
  left:
    self: t (Identifier)
  right:
    self: * (Asterisk)
    replace:
      self: REPLACE (KeywordWithGroupedXXX)
      group:
        self: ( (GroupedExprs)
        exprs:
        - self: * (BinaryOperator)
          alias:
            self: _col2 (Identifier)
          as:
            self: AS (Keyword)
          left:
            self: col2 (Identifier)
          right:
            self: 2 (NumericLiteral)
        rparen:
          self: ) (Symbol)
",
            0,
        )),
        // AS STRUCT, VALUE
        Box::new(SuccessTestCase::new(
            "\
SELECT (SELECT AS STRUCT 1 a, 2 b) ab
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: ( (GroupedStatement)
  alias:
    self: ab (Identifier)
  rparen:
    self: ) (Symbol)
  stmt:
    self: SELECT (SelectStatement)
    as_struct_or_value:
    - self: AS (Keyword)
    - self: STRUCT (Keyword)
    exprs:
    - self: 1 (NumericLiteral)
      alias:
        self: a (Identifier)
      comma:
        self: , (Symbol)
    - self: 2 (NumericLiteral)
      alias:
        self: b (Identifier)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
SELECT AS VALUE STRUCT(1 AS a, 2 AS b) xyz
",
            "\
self: SELECT (SelectStatement)
as_struct_or_value:
- self: AS (Keyword)
- self: VALUE (Keyword)
exprs:
- self: ( (StructLiteral)
  alias:
    self: xyz (Identifier)
  exprs:
  - self: 1 (NumericLiteral)
    alias:
      self: a (Identifier)
    as:
      self: AS (Keyword)
    comma:
      self: , (Symbol)
  - self: 2 (NumericLiteral)
    alias:
      self: b (Identifier)
    as:
      self: AS (Keyword)
  rparen:
    self: ) (Symbol)
  type:
    self: STRUCT (Type)
",
            0,
        )),
        // sub query
        Box::new(SuccessTestCase::new(
            "\
SELECT (SELECT 1)
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: ( (GroupedStatement)
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
SELECT ((SELECT 1))
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: ( (GroupedExpr)
  expr:
    self: ( (GroupedStatement)
    rparen:
      self: ) (Symbol)
    stmt:
      self: SELECT (SelectStatement)
      exprs:
      - self: 1 (NumericLiteral)
  rparen:
    self: ) (Symbol)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
SELECT (SELECT 1 EXCEPT DISTINCT SELECT 2);
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: ( (GroupedStatement)
  rparen:
    self: ) (Symbol)
  stmt:
    self: EXCEPT (SetOperator)
    distinct_or_all:
      self: DISTINCT (Keyword)
    left:
      self: SELECT (SelectStatement)
      exprs:
      - self: 1 (NumericLiteral)
    right:
      self: SELECT (SelectStatement)
      exprs:
      - self: 2 (NumericLiteral)
semicolon:
  self: ; (Symbol)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
SELECT * FROM (
  (SELECT 1)
  UNION ALL SELECT 2
)
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
      self: UNION (SetOperator)
      distinct_or_all:
        self: ALL (Keyword)
      left:
        self: ( (GroupedStatement)
        rparen:
          self: ) (Symbol)
        stmt:
          self: SELECT (SelectStatement)
          exprs:
          - self: 1 (NumericLiteral)
      right:
        self: SELECT (SelectStatement)
        exprs:
        - self: 2 (NumericLiteral)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
SELECT * FROM (
  ((SELECT 1))
  UNION ALL SELECT 2
)
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
      self: UNION (SetOperator)
      distinct_or_all:
        self: ALL (Keyword)
      left:
        self: ( (GroupedStatement)
        rparen:
          self: ) (Symbol)
        stmt:
          self: ( (GroupedStatement)
          rparen:
            self: ) (Symbol)
          stmt:
            self: SELECT (SelectStatement)
            exprs:
            - self: 1 (NumericLiteral)
      right:
        self: SELECT (SelectStatement)
        exprs:
        - self: 2 (NumericLiteral)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
SELECT ((SELECT TRUE) AND (SELECT FALSE))
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: ( (GroupedExpr)
  expr:
    self: AND (BinaryOperator)
    left:
      self: ( (GroupedStatement)
      rparen:
        self: ) (Symbol)
      stmt:
        self: SELECT (SelectStatement)
        exprs:
        - self: TRUE (BooleanLiteral)
    right:
      self: ( (GroupedStatement)
      rparen:
        self: ) (Symbol)
      stmt:
        self: SELECT (SelectStatement)
        exprs:
        - self: FALSE (BooleanLiteral)
  rparen:
    self: ) (Symbol)
",
            0,
        )),
        // ----- FROM clause -----
        // irregular identifier
        Box::new(SuccessTestCase::new(
            "\
SELECT *
FROM project-id.region-asia-northeast1.INFORMATION_SCHEMA.JOBS_BY_USER
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: * (Asterisk)
from:
  self: FROM (KeywordWithExpr)
  expr:
    self: . (DotOperator)
    left:
      self: . (DotOperator)
      left:
        self: . (DotOperator)
        left:
          self: project (MultiTokenIdentifier)
          trailing_idents:
          - self: - (Identifier)
          - self: id (Identifier)
        right:
          self: region (MultiTokenIdentifier)
          trailing_idents:
          - self: - (Identifier)
          - self: asia (Identifier)
          - self: - (Identifier)
          - self: northeast1 (Identifier)
      right:
        self: INFORMATION_SCHEMA (Identifier)
    right:
      self: JOBS_BY_USER (Identifier)
",
            0,
        )),
        // NOTE
        // Dot operator has disappered but it is acceptable.
        Box::new(SuccessTestCase::new(
            "\
SELECT *
FROM project-123.dataset.table-123
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: * (Asterisk)
from:
  self: FROM (KeywordWithExpr)
  expr:
    self: . (DotOperator)
    left:
      self: project (MultiTokenIdentifier)
      trailing_idents:
      - self: - (Identifier)
      - self: 123. (Identifier)
      - self: dataset (Identifier)
    right:
      self: table (MultiTokenIdentifier)
      trailing_idents:
      - self: - (Identifier)
      - self: 123 (Identifier)
",
            0,
        )),
        // NOTE
        // Dot operator has disappered but it is acceptable.
        Box::new(SuccessTestCase::new(
            "\
SELECT *
FROM project-123. dataset.tablename
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: * (Asterisk)
from:
  self: FROM (KeywordWithExpr)
  expr:
    self: . (DotOperator)
    left:
      self: project (MultiTokenIdentifier)
      trailing_idents:
      - self: - (Identifier)
      - self: 123. (Identifier)
      - self: dataset (Identifier)
    right:
      self: tablename (Identifier)
",
            0,
        )),
        // NOTE Currently this SQL is invalid.
        //        Box::new(SuccessTestCase::new(
        //            "\
        //SELECT *
        //FROM project.123.123
        //",
        //            "\
        //",
        //            0,
        //        )),

        // alias
        Box::new(SuccessTestCase::new(
            "\
SELECT 1
FROM t1 AS t
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: 1 (NumericLiteral)
from:
  self: FROM (KeywordWithExpr)
  expr:
    self: t1 (Identifier)
    alias:
      self: t (Identifier)
    as:
      self: AS (Keyword)
",
            0,
        )),
        // sub query
        Box::new(SuccessTestCase::new(
            "\
SELECT * FROM (SELECT 1,2)
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
      self: SELECT (SelectStatement)
      exprs:
      - self: 1 (NumericLiteral)
        comma:
          self: , (Symbol)
      - self: 2 (NumericLiteral)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
SELECT sub.* FROM (SELECT 1,2) AS sub;
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: . (DotOperator)
  left:
    self: sub (Identifier)
  right:
    self: * (Asterisk)
from:
  self: FROM (KeywordWithExpr)
  expr:
    self: ( (GroupedStatement)
    alias:
      self: sub (Identifier)
    as:
      self: AS (Keyword)
    rparen:
      self: ) (Symbol)
    stmt:
      self: SELECT (SelectStatement)
      exprs:
      - self: 1 (NumericLiteral)
        comma:
          self: , (Symbol)
      - self: 2 (NumericLiteral)
semicolon:
  self: ; (Symbol)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
SELECT *
FROM main m
WHERE NOT EXISTS(SELECT 1 FROM sub s WHERE s.x = m.x);
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: * (Asterisk)
from:
  self: FROM (KeywordWithExpr)
  expr:
    self: main (Identifier)
    alias:
      self: m (Identifier)
semicolon:
  self: ; (Symbol)
where:
  self: WHERE (KeywordWithExpr)
  expr:
    self: NOT (UnaryOperator)
    right:
      self: ( (CallingFunction)
      args:
      - self: SELECT (SelectStatement)
        exprs:
        - self: 1 (NumericLiteral)
        from:
          self: FROM (KeywordWithExpr)
          expr:
            self: sub (Identifier)
            alias:
              self: s (Identifier)
        where:
          self: WHERE (KeywordWithExpr)
          expr:
            self: = (BinaryOperator)
            left:
              self: . (DotOperator)
              left:
                self: s (Identifier)
              right:
                self: x (Identifier)
            right:
              self: . (DotOperator)
              left:
                self: m (Identifier)
              right:
                self: x (Identifier)
      func:
        self: EXISTS (Identifier)
      rparen:
        self: ) (Symbol)
",
            0,
        )),
        // TVF
        Box::new(SuccessTestCase::new(
            "\
SELECT * FROM tvf()
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: * (Asterisk)
from:
  self: FROM (KeywordWithExpr)
  expr:
    self: ( (CallingTableFunction)
    func:
      self: tvf (Identifier)
    rparen:
      self: ) (Symbol)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
SELECT * FROM APPENDS(TABLE ident)
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: * (Asterisk)
from:
  self: FROM (KeywordWithExpr)
  expr:
    self: ( (CallingTableFunction)
    args:
    - self: TABLE (UnaryOperator)
      right:
        self: ident (Identifier)
    func:
      self: APPENDS (Identifier)
    rparen:
      self: ) (Symbol)
",
            0,
        )),
        // Cloud Spanner federated queries
        Box::new(SuccessTestCase::new(
            "\
SELECT *
from EXTERNAL_QUERY(
  'project.us.db',
  'SELECT t.column_name FROM information_schema.columns AS t'
);
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: * (Asterisk)
from:
  self: from (KeywordWithExpr)
  expr:
    self: ( (CallingTableFunction)
    args:
    - self: 'project.us.db' (StringLiteral)
      comma:
        self: , (Symbol)
    - self: 'SELECT t.column_name FROM information_schema.columns AS t' (StringLiteral)
    func:
      self: EXTERNAL_QUERY (Identifier)
    rparen:
      self: ) (Symbol)
semicolon:
  self: ; (Symbol)
",
            0,
        )),
        // FOR SYSTEM_TIME AS OF
        Box::new(SuccessTestCase::new(
            "\
SELECT c1 FROM t FOR SYSTEM_TIME AS OF CURRENT_TIMESTAMP()
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: c1 (Identifier)
from:
  self: FROM (KeywordWithExpr)
  expr:
    self: t (Identifier)
    for_system_time_as_of:
      self: FOR (ForSystemTimeAsOfClause)
      expr:
        self: ( (CallingFunction)
        func:
          self: CURRENT_TIMESTAMP (Identifier)
        rparen:
          self: ) (Symbol)
      system_time_as_of:
      - self: SYSTEM_TIME (Keyword)
      - self: AS (Keyword)
      - self: OF (Keyword)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
SELECT c1 FROM table_name t FOR SYSTEM_TIME AS OF CURRENT_TIMESTAMP()
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: c1 (Identifier)
from:
  self: FROM (KeywordWithExpr)
  expr:
    self: table_name (Identifier)
    alias:
      self: t (Identifier)
    for_system_time_as_of:
      self: FOR (ForSystemTimeAsOfClause)
      expr:
        self: ( (CallingFunction)
        func:
          self: CURRENT_TIMESTAMP (Identifier)
        rparen:
          self: ) (Symbol)
      system_time_as_of:
      - self: SYSTEM_TIME (Keyword)
      - self: AS (Keyword)
      - self: OF (Keyword)
",
            0,
        )),
        // PIVOT
        Box::new(SuccessTestCase::new(
            "\
SELECT * FROM t PIVOT (COUNT(*) FOR x IN ('v1', 'v2'))
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: * (Asterisk)
from:
  self: FROM (KeywordWithExpr)
  expr:
    self: t (Identifier)
    pivot:
      self: PIVOT (PivotOperator)
      config:
        self: ( (PivotConfig)
        exprs:
        - self: ( (CallingFunction)
          args:
          - self: * (Asterisk)
          func:
            self: COUNT (Identifier)
          rparen:
            self: ) (Symbol)
        for:
          self: FOR (KeywordWithExpr)
          expr:
            self: x (Identifier)
        in:
          self: IN (KeywordWithGroupedXXX)
          group:
            self: ( (GroupedExprs)
            exprs:
            - self: 'v1' (StringLiteral)
              comma:
                self: , (Symbol)
            - self: 'v2' (StringLiteral)
            rparen:
              self: ) (Symbol)
        rparen:
          self: ) (Symbol)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
SELECT * FROM t AS t1 PIVOT (SUM(x) s, COUNT(*) AS c FOR y IN (1 one, 2 AS two)) t2
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: * (Asterisk)
from:
  self: FROM (KeywordWithExpr)
  expr:
    self: t (Identifier)
    alias:
      self: t1 (Identifier)
    as:
      self: AS (Keyword)
    pivot:
      self: PIVOT (PivotOperator)
      alias:
        self: t2 (Identifier)
      config:
        self: ( (PivotConfig)
        exprs:
        - self: ( (CallingFunction)
          alias:
            self: s (Identifier)
          args:
          - self: x (Identifier)
          comma:
            self: , (Symbol)
          func:
            self: SUM (Identifier)
          rparen:
            self: ) (Symbol)
        - self: ( (CallingFunction)
          alias:
            self: c (Identifier)
          args:
          - self: * (Asterisk)
          as:
            self: AS (Keyword)
          func:
            self: COUNT (Identifier)
          rparen:
            self: ) (Symbol)
        for:
          self: FOR (KeywordWithExpr)
          expr:
            self: y (Identifier)
        in:
          self: IN (KeywordWithGroupedXXX)
          group:
            self: ( (GroupedExprs)
            exprs:
            - self: 1 (NumericLiteral)
              alias:
                self: one (Identifier)
              comma:
                self: , (Symbol)
            - self: 2 (NumericLiteral)
              alias:
                self: two (Identifier)
              as:
                self: AS (Keyword)
            rparen:
              self: ) (Symbol)
        rparen:
          self: ) (Symbol)
",
            0,
        )),
        // UNPIVOT
        Box::new(SuccessTestCase::new(
            "\
SELECT *
FROM t UNPIVOT (
  c1
  FOR v
  IN (v1 1, v2 AS 2)
) AS unpivot
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: * (Asterisk)
from:
  self: FROM (KeywordWithExpr)
  expr:
    self: t (Identifier)
    unpivot:
      self: UNPIVOT (UnpivotOperator)
      alias:
        self: unpivot (Identifier)
      as:
        self: AS (Keyword)
      config:
        self: ( (UnpivotConfig)
        expr:
          self: c1 (Identifier)
        for:
          self: FOR (KeywordWithExpr)
          expr:
            self: v (Identifier)
        in:
          self: IN (KeywordWithGroupedXXX)
          group:
            self: ( (GroupedExprs)
            exprs:
            - self: v1 (Identifier)
              comma:
                self: , (Symbol)
              row_value_alias:
                self: 1 (NumericLiteral)
            - self: v2 (Identifier)
              as:
                self: AS (Keyword)
              row_value_alias:
                self: 2 (NumericLiteral)
            rparen:
              self: ) (Symbol)
        rparen:
          self: ) (Symbol)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
SELECT * FROM t UNPIVOT INCLUDE NULLS (
  (c1, c2)
  FOR v
  IN ((v1, v2) AS 'A', (v3, v4) 'B')
) AS unpivot
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: * (Asterisk)
from:
  self: FROM (KeywordWithExpr)
  expr:
    self: t (Identifier)
    unpivot:
      self: UNPIVOT (UnpivotOperator)
      alias:
        self: unpivot (Identifier)
      as:
        self: AS (Keyword)
      config:
        self: ( (UnpivotConfig)
        expr:
          self: ( (GroupedExprs)
          exprs:
          - self: c1 (Identifier)
            comma:
              self: , (Symbol)
          - self: c2 (Identifier)
          rparen:
            self: ) (Symbol)
        for:
          self: FOR (KeywordWithExpr)
          expr:
            self: v (Identifier)
        in:
          self: IN (KeywordWithGroupedXXX)
          group:
            self: ( (GroupedExprs)
            exprs:
            - self: ( (GroupedExprs)
              as:
                self: AS (Keyword)
              comma:
                self: , (Symbol)
              exprs:
              - self: v1 (Identifier)
                comma:
                  self: , (Symbol)
              - self: v2 (Identifier)
              row_value_alias:
                self: 'A' (StringLiteral)
              rparen:
                self: ) (Symbol)
            - self: ( (GroupedExprs)
              exprs:
              - self: v3 (Identifier)
                comma:
                  self: , (Symbol)
              - self: v4 (Identifier)
              row_value_alias:
                self: 'B' (StringLiteral)
              rparen:
                self: ) (Symbol)
            rparen:
              self: ) (Symbol)
        rparen:
          self: ) (Symbol)
      include_or_exclude_nulls:
      - self: INCLUDE (Keyword)
      - self: NULLS (Keyword)
",
            0,
        )),
        // MATCH RECOGNIZE
        Box::new(SuccessTestCase::new(
            "\
SELECT * FROM t MATCH_RECOGNIZE (
  PARTITION BY col1, col2
  ORDER BY col3, col4 DESC NULLS FIRST
  MEASURES ANY_VALUE(col4) AS col4
  AFTER MATCH SKIP TO NEXT ROW
  DEFINE
    symbol1 AS col3 = 'foo',
    symbol2 AS col4 = 'bar'
  OPTIONS (use_longest_match = TRUE)
) as u
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: * (Asterisk)
from:
  self: FROM (KeywordWithExpr)
  expr:
    self: t (Identifier)
    match_recognize:
      self: MATCH_RECOGNIZE (MatchRecognizeClause)
      alias:
        self: u (Identifier)
      as:
        self: as (Keyword)
      config:
        self: ( (MatchRecognizeConfig)
        define:
          self: DEFINE (KeywordWithExprs)
          exprs:
          - self: symbol1 (Identifier)
            alias:
              self: = (BinaryOperator)
              left:
                self: col3 (Identifier)
              right:
                self: 'foo' (StringLiteral)
            as:
              self: AS (Keyword)
            comma:
              self: , (Symbol)
          - self: symbol2 (Identifier)
            alias:
              self: = (BinaryOperator)
              left:
                self: col4 (Identifier)
              right:
                self: 'bar' (StringLiteral)
            as:
              self: AS (Keyword)
        measures:
          self: MEASURES (KeywordWithExprs)
          exprs:
          - self: ( (CallingFunction)
            alias:
              self: col4 (Identifier)
            args:
            - self: col4 (Identifier)
            as:
              self: AS (Keyword)
            func:
              self: ANY_VALUE (Identifier)
            rparen:
              self: ) (Symbol)
        options:
          self: OPTIONS (KeywordWithGroupedXXX)
          group:
            self: ( (GroupedExprs)
            exprs:
            - self: = (BinaryOperator)
              left:
                self: use_longest_match (Identifier)
              right:
                self: TRUE (BooleanLiteral)
            rparen:
              self: ) (Symbol)
        orderby:
          self: ORDER (XXXByExprs)
          by:
            self: BY (Keyword)
          exprs:
          - self: col3 (Identifier)
            comma:
              self: , (Symbol)
          - self: col4 (Identifier)
            null_order:
            - self: NULLS (Keyword)
            - self: FIRST (Keyword)
            order:
              self: DESC (Keyword)
        partitionby:
          self: PARTITION (XXXByExprs)
          by:
            self: BY (Keyword)
          exprs:
          - self: col1 (Identifier)
            comma:
              self: , (Symbol)
          - self: col2 (Identifier)
        rparen:
          self: ) (Symbol)
        skip_rule:
          self: AFTER (KeywordSequence)
          next_keyword:
            self: MATCH (KeywordSequence)
            next_keyword:
              self: SKIP (KeywordSequence)
              next_keyword:
                self: TO (KeywordSequence)
                next_keyword:
                  self: NEXT (KeywordSequence)
                  next_keyword:
                    self: ROW (KeywordSequence)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
SELECT *
FROM t MATCH_RECOGNIZE (
  PATTERN (symbol1)
)
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: * (Asterisk)
from:
  self: FROM (KeywordWithExpr)
  expr:
    self: t (Identifier)
    match_recognize:
      self: MATCH_RECOGNIZE (MatchRecognizeClause)
      config:
        self: ( (MatchRecognizeConfig)
        pattern:
          self: PATTERN (PatternClause)
          pattern:
            self: ( (GroupedPattern)
            patterns:
            - self: symbol1 (Pattern)
              suffixes: []
            rparen:
              self: ) (Symbol)
            suffixes: []
        rparen:
          self: ) (Symbol)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
SELECT *
FROM t MATCH_RECOGNIZE (
  PATTERN (^ ()*? symbol1{0}{1,2}{,3} $)
)
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: * (Asterisk)
from:
  self: FROM (KeywordWithExpr)
  expr:
    self: t (Identifier)
    match_recognize:
      self: MATCH_RECOGNIZE (MatchRecognizeClause)
      config:
        self: ( (MatchRecognizeConfig)
        pattern:
          self: PATTERN (PatternClause)
          pattern:
            self: ( (GroupedPattern)
            patterns:
            - self: ^ (Pattern)
              suffixes: []
            - self: ( (GroupedPattern)
              patterns: []
              rparen:
                self: ) (Symbol)
              suffixes:
              - self: * (Symbol)
              - self: ? (Symbol)
            - self: symbol1 (Pattern)
              suffixes:
              - self: { (PatternQuantifier)
                min:
                  self: 0 (NumericLiteral)
                rbrace:
                  self: } (Symbol)
              - self: { (PatternQuantifier)
                comma:
                  self: , (Symbol)
                max:
                  self: 2 (NumericLiteral)
                min:
                  self: 1 (NumericLiteral)
                rbrace:
                  self: } (Symbol)
              - self: { (PatternQuantifier)
                comma:
                  self: , (Symbol)
                max:
                  self: 3 (NumericLiteral)
                rbrace:
                  self: } (Symbol)
            - self: $ (Pattern)
              suffixes: []
            rparen:
              self: ) (Symbol)
            suffixes: []
        rparen:
          self: ) (Symbol)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
SELECT *
FROM t MATCH_RECOGNIZE (
  PATTERN (symbol1 | symbol2 symbol3)
)
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: * (Asterisk)
from:
  self: FROM (KeywordWithExpr)
  expr:
    self: t (Identifier)
    match_recognize:
      self: MATCH_RECOGNIZE (MatchRecognizeClause)
      config:
        self: ( (MatchRecognizeConfig)
        pattern:
          self: PATTERN (PatternClause)
          pattern:
            self: ( (GroupedPattern)
            patterns:
            - self: | (OrPattern)
              left:
              - self: symbol1 (Pattern)
                suffixes: []
              right:
              - self: symbol2 (Pattern)
                suffixes: []
              - self: symbol3 (Pattern)
                suffixes: []
            rparen:
              self: ) (Symbol)
            suffixes: []
        rparen:
          self: ) (Symbol)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
SELECT *
FROM t MATCH_RECOGNIZE (
  PATTERN (symbol1 | symbol2 | symbol3)
)
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: * (Asterisk)
from:
  self: FROM (KeywordWithExpr)
  expr:
    self: t (Identifier)
    match_recognize:
      self: MATCH_RECOGNIZE (MatchRecognizeClause)
      config:
        self: ( (MatchRecognizeConfig)
        pattern:
          self: PATTERN (PatternClause)
          pattern:
            self: ( (GroupedPattern)
            patterns:
            - self: | (OrPattern)
              left:
              - self: | (OrPattern)
                left:
                - self: symbol1 (Pattern)
                  suffixes: []
                right:
                - self: symbol2 (Pattern)
                  suffixes: []
              right:
              - self: symbol3 (Pattern)
                suffixes: []
            rparen:
              self: ) (Symbol)
            suffixes: []
        rparen:
          self: ) (Symbol)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
SELECT *
FROM t MATCH_RECOGNIZE (
  PATTERN (( symbol1 | ) (| symbol2))
)
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: * (Asterisk)
from:
  self: FROM (KeywordWithExpr)
  expr:
    self: t (Identifier)
    match_recognize:
      self: MATCH_RECOGNIZE (MatchRecognizeClause)
      config:
        self: ( (MatchRecognizeConfig)
        pattern:
          self: PATTERN (PatternClause)
          pattern:
            self: ( (GroupedPattern)
            patterns:
            - self: ( (GroupedPattern)
              patterns:
              - self: | (OrPattern)
                left:
                - self: symbol1 (Pattern)
                  suffixes: []
                right: []
              rparen:
                self: ) (Symbol)
              suffixes: []
            - self: ( (GroupedPattern)
              patterns:
              - self: | (OrPattern)
                left: []
                right:
                - self: symbol2 (Pattern)
                  suffixes: []
              rparen:
                self: ) (Symbol)
              suffixes: []
            rparen:
              self: ) (Symbol)
            suffixes: []
        rparen:
          self: ) (Symbol)
",
            0,
        )),
        // TABLESAMPLE
        Box::new(SuccessTestCase::new(
            "\
SELECT *
FROM t TABLESAMPLE SYSTEM (20 PERCENT)
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: * (Asterisk)
from:
  self: FROM (KeywordWithExpr)
  expr:
    self: t (Identifier)
    tablesample:
      self: TABLESAMPLE (TableSampleClause)
      group:
        self: ( (TableSampleRatio)
        expr:
          self: 20 (NumericLiteral)
        percent:
          self: PERCENT (Keyword)
        rparen:
          self: ) (Symbol)
      system:
        self: SYSTEM (Keyword)
",
            0,
        )),
        // UNNEST
        Box::new(SuccessTestCase::new(
            "\
SELECT * FROM UNNEST([1,2])
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: * (Asterisk)
from:
  self: FROM (KeywordWithExpr)
  expr:
    self: ( (CallingUnnest)
    args:
    - self: [ (ArrayLiteral)
      exprs:
      - self: 1 (NumericLiteral)
        comma:
          self: , (Symbol)
      - self: 2 (NumericLiteral)
      rparen:
        self: ] (Symbol)
    func:
      self: UNNEST (Identifier)
    rparen:
      self: ) (Symbol)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
SELECT * FROM UNNEST([1]) WITH OFFSET
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: * (Asterisk)
from:
  self: FROM (KeywordWithExpr)
  expr:
    self: ( (CallingUnnest)
    args:
    - self: [ (ArrayLiteral)
      exprs:
      - self: 1 (NumericLiteral)
      rparen:
        self: ] (Symbol)
    func:
      self: UNNEST (Identifier)
    rparen:
      self: ) (Symbol)
    with_offset:
      self: WITH (WithOffsetClause)
      offset:
        self: OFFSET (Keyword)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
SELECT * FROM UNNEST([1]) a WITH OFFSET AS b
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: * (Asterisk)
from:
  self: FROM (KeywordWithExpr)
  expr:
    self: ( (CallingUnnest)
    alias:
      self: a (Identifier)
    args:
    - self: [ (ArrayLiteral)
      exprs:
      - self: 1 (NumericLiteral)
      rparen:
        self: ] (Symbol)
    func:
      self: UNNEST (Identifier)
    rparen:
      self: ) (Symbol)
    with_offset:
      self: WITH (WithOffsetClause)
      alias:
        self: b (Identifier)
      as:
        self: AS (Keyword)
      offset:
        self: OFFSET (Keyword)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
SELECT * FROM t, t.arr WITH OFFSET
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: * (Asterisk)
from:
  self: FROM (KeywordWithExpr)
  expr:
    self: , (JoinOperator)
    left:
      self: t (Identifier)
    right:
      self: . (DotOperator)
      left:
        self: t (Identifier)
      right:
        self: arr (Identifier)
      with_offset:
        self: WITH (WithOffsetClause)
        offset:
          self: OFFSET (Keyword)
",
            0,
        )),
        // JOIN
        Box::new(SuccessTestCase::new(
            "\
SELECT * FROM (SELECT 1 FROM t1) INNER JOIN t2 ON TRUE;
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: * (Asterisk)
from:
  self: FROM (KeywordWithExpr)
  expr:
    self: JOIN (JoinOperator)
    join_type:
      self: INNER (Keyword)
    left:
      self: ( (GroupedStatement)
      rparen:
        self: ) (Symbol)
      stmt:
        self: SELECT (SelectStatement)
        exprs:
        - self: 1 (NumericLiteral)
        from:
          self: FROM (KeywordWithExpr)
          expr:
            self: t1 (Identifier)
    on:
      self: ON (KeywordWithExpr)
      expr:
        self: TRUE (BooleanLiteral)
    right:
      self: t2 (Identifier)
semicolon:
  self: ; (Symbol)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
SELECT * FROM t1 AS one JOIN t2 two ON TRUE
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: * (Asterisk)
from:
  self: FROM (KeywordWithExpr)
  expr:
    self: JOIN (JoinOperator)
    left:
      self: t1 (Identifier)
      alias:
        self: one (Identifier)
      as:
        self: AS (Keyword)
    on:
      self: ON (KeywordWithExpr)
      expr:
        self: TRUE (BooleanLiteral)
    right:
      self: t2 (Identifier)
      alias:
        self: two (Identifier)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
SELECT * FROM data1 AS one LEFT JOIN data2 two USING(col) LEFT OUTER JOIN data3 ON TRUE
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: * (Asterisk)
from:
  self: FROM (KeywordWithExpr)
  expr:
    self: JOIN (JoinOperator)
    join_type:
      self: LEFT (Keyword)
    left:
      self: JOIN (JoinOperator)
      join_type:
        self: LEFT (Keyword)
      left:
        self: data1 (Identifier)
        alias:
          self: one (Identifier)
        as:
          self: AS (Keyword)
      right:
        self: data2 (Identifier)
        alias:
          self: two (Identifier)
      using:
        self: ( (CallingFunction)
        args:
        - self: col (Identifier)
        func:
          self: USING (Identifier)
        rparen:
          self: ) (Symbol)
    on:
      self: ON (KeywordWithExpr)
      expr:
        self: TRUE (BooleanLiteral)
    outer:
      self: OUTER (Keyword)
    right:
      self: data3 (Identifier)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
SELECT * FROM data1 AS one , data2 two JOIN (data3 FULL OUTER JOIN data4 ON col1=col2) ON TRUE
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: * (Asterisk)
from:
  self: FROM (KeywordWithExpr)
  expr:
    self: JOIN (JoinOperator)
    left:
      self: , (JoinOperator)
      left:
        self: data1 (Identifier)
        alias:
          self: one (Identifier)
        as:
          self: AS (Keyword)
      right:
        self: data2 (Identifier)
        alias:
          self: two (Identifier)
    on:
      self: ON (KeywordWithExpr)
      expr:
        self: TRUE (BooleanLiteral)
    right:
      self: ( (GroupedExpr)
      expr:
        self: JOIN (JoinOperator)
        join_type:
          self: FULL (Keyword)
        left:
          self: data3 (Identifier)
        on:
          self: ON (KeywordWithExpr)
          expr:
            self: = (BinaryOperator)
            left:
              self: col1 (Identifier)
            right:
              self: col2 (Identifier)
        outer:
          self: OUTER (Keyword)
        right:
          self: data4 (Identifier)
      rparen:
        self: ) (Symbol)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
SELECT *
FROM
  data1 AS one
  JOIN (
    project-id.dataset.tablename AS data2 JOIN data3 ON true
  ) ON true
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: * (Asterisk)
from:
  self: FROM (KeywordWithExpr)
  expr:
    self: JOIN (JoinOperator)
    left:
      self: data1 (Identifier)
      alias:
        self: one (Identifier)
      as:
        self: AS (Keyword)
    on:
      self: ON (KeywordWithExpr)
      expr:
        self: true (BooleanLiteral)
    right:
      self: ( (GroupedExpr)
      expr:
        self: JOIN (JoinOperator)
        left:
          self: . (DotOperator)
          alias:
            self: data2 (Identifier)
          as:
            self: AS (Keyword)
          left:
            self: . (DotOperator)
            left:
              self: project (MultiTokenIdentifier)
              trailing_idents:
              - self: - (Identifier)
              - self: id (Identifier)
            right:
              self: dataset (Identifier)
          right:
            self: tablename (Identifier)
        on:
          self: ON (KeywordWithExpr)
          expr:
            self: true (BooleanLiteral)
        right:
          self: data3 (Identifier)
      rparen:
        self: ) (Symbol)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
SELECT * FROM (
  (SELECT 1 AS one) AS a
  CROSS JOIN
  (SELECT 2 AS two) AS b
)
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: * (Asterisk)
from:
  self: FROM (KeywordWithExpr)
  expr:
    self: ( (GroupedExpr)
    expr:
      self: JOIN (JoinOperator)
      join_type:
        self: CROSS (Keyword)
      left:
        self: ( (GroupedStatement)
        alias:
          self: a (Identifier)
        as:
          self: AS (Keyword)
        rparen:
          self: ) (Symbol)
        stmt:
          self: SELECT (SelectStatement)
          exprs:
          - self: 1 (NumericLiteral)
            alias:
              self: one (Identifier)
            as:
              self: AS (Keyword)
      right:
        self: ( (GroupedStatement)
        alias:
          self: b (Identifier)
        as:
          self: AS (Keyword)
        rparen:
          self: ) (Symbol)
        stmt:
          self: SELECT (SelectStatement)
          exprs:
          - self: 2 (NumericLiteral)
            alias:
              self: two (Identifier)
            as:
              self: AS (Keyword)
    rparen:
      self: ) (Symbol)
",
            0,
        )),
        // built-in table functions
        Box::new(SuccessTestCase::new(
            "\
SELECT uri FROM EXTERNAL_OBJECT_TRANSFORM(TABLE dataset.myobjecttable, ['SIGNED_URL'])
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: uri (Identifier)
from:
  self: FROM (KeywordWithExpr)
  expr:
    self: ( (CallingTableFunction)
    args:
    - self: TABLE (UnaryOperator)
      comma:
        self: , (Symbol)
      right:
        self: . (DotOperator)
        left:
          self: dataset (Identifier)
        right:
          self: myobjecttable (Identifier)
    - self: [ (ArrayLiteral)
      exprs:
      - self: 'SIGNED_URL' (StringLiteral)
      rparen:
        self: ] (Symbol)
    func:
      self: EXTERNAL_OBJECT_TRANSFORM (Identifier)
    rparen:
      self: ) (Symbol)
",
            0,
        )),
        // ----- WHERE clause -----
        Box::new(SuccessTestCase::new(
            "\
SELECT x FROM t WHERE true
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: x (Identifier)
from:
  self: FROM (KeywordWithExpr)
  expr:
    self: t (Identifier)
where:
  self: WHERE (KeywordWithExpr)
  expr:
    self: true (BooleanLiteral)
",
            0,
        )),
        // ----- GROUP BY clause -----
        Box::new(SuccessTestCase::new(
            "\
SELECT 1 FROM t GROUP BY ()
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: 1 (NumericLiteral)
from:
  self: FROM (KeywordWithExpr)
  expr:
    self: t (Identifier)
groupby:
  self: GROUP (GroupByExprs)
  by:
    self: BY (Keyword)
  exprs:
  - self: ( (EmptyStruct)
    rparen:
      self: ) (Symbol)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
SELECT x, y FROM t GROUP BY 1, 2
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: x (Identifier)
  comma:
    self: , (Symbol)
- self: y (Identifier)
from:
  self: FROM (KeywordWithExpr)
  expr:
    self: t (Identifier)
groupby:
  self: GROUP (GroupByExprs)
  by:
    self: BY (Keyword)
  exprs:
  - self: 1 (NumericLiteral)
    comma:
      self: , (Symbol)
  - self: 2 (NumericLiteral)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
SELECT x, SUM(y) FROM t GROUP BY ROLLUP(x)
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: x (Identifier)
  comma:
    self: , (Symbol)
- self: ( (CallingFunction)
  args:
  - self: y (Identifier)
  func:
    self: SUM (Identifier)
  rparen:
    self: ) (Symbol)
from:
  self: FROM (KeywordWithExpr)
  expr:
    self: t (Identifier)
groupby:
  self: GROUP (GroupByExprs)
  by:
    self: BY (Keyword)
  exprs:
  - self: ( (GroupedExpr)
    expr:
      self: x (Identifier)
    rparen:
      self: ) (Symbol)
  how:
  - self: ROLLUP (Keyword)
",
            0,
        )),
        // CUBE() may be not a function but it's OK
        Box::new(SuccessTestCase::new(
            "\
SELECT count(*) FROM t GROUP BY GROUPING SETS (a, CUBE(b))
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: ( (CallingFunction)
  args:
  - self: * (Asterisk)
  func:
    self: count (Identifier)
  rparen:
    self: ) (Symbol)
from:
  self: FROM (KeywordWithExpr)
  expr:
    self: t (Identifier)
groupby:
  self: GROUP (GroupByExprs)
  by:
    self: BY (Keyword)
  exprs:
  - self: ( (StructLiteral)
    exprs:
    - self: a (Identifier)
      comma:
        self: , (Symbol)
    - self: ( (CallingFunction)
      args:
      - self: b (Identifier)
      func:
        self: CUBE (Identifier)
      rparen:
        self: ) (Symbol)
    rparen:
      self: ) (Symbol)
  how:
  - self: GROUPING (Keyword)
  - self: SETS (Keyword)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "SELECT colname FROM tablename GROUP BY ALL",
            "\
self: SELECT (SelectStatement)
exprs:
- self: colname (Identifier)
from:
  self: FROM (KeywordWithExpr)
  expr:
    self: tablename (Identifier)
groupby:
  self: GROUP (GroupByExprs)
  by:
    self: BY (Keyword)
  how:
  - self: ALL (Keyword)
",
            0,
        )),
        // ----- HAVING clause -----
        Box::new(SuccessTestCase::new(
            "\
SELECT x, COUNT(*) cnt FROM t GROUP BY 1 HAVING cnt < 10
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: x (Identifier)
  comma:
    self: , (Symbol)
- self: ( (CallingFunction)
  alias:
    self: cnt (Identifier)
  args:
  - self: * (Asterisk)
  func:
    self: COUNT (Identifier)
  rparen:
    self: ) (Symbol)
from:
  self: FROM (KeywordWithExpr)
  expr:
    self: t (Identifier)
groupby:
  self: GROUP (GroupByExprs)
  by:
    self: BY (Keyword)
  exprs:
  - self: 1 (NumericLiteral)
having:
  self: HAVING (KeywordWithExpr)
  expr:
    self: < (BinaryOperator)
    left:
      self: cnt (Identifier)
    right:
      self: 10 (NumericLiteral)
",
            0,
        )),
        // ----- QUALIFY clause -----
        Box::new(SuccessTestCase::new(
            "\
SELECT x
FROM t
QUALIFY ROW_NUMBER() OVER(PARTITION BY y ORDER BY z) = 1
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: x (Identifier)
from:
  self: FROM (KeywordWithExpr)
  expr:
    self: t (Identifier)
qualify:
  self: QUALIFY (KeywordWithExpr)
  expr:
    self: = (BinaryOperator)
    left:
      self: ( (CallingFunction)
      func:
        self: ROW_NUMBER (Identifier)
      over:
        self: OVER (OverClause)
        window:
          self: ( (WindowSpecification)
          orderby:
            self: ORDER (XXXByExprs)
            by:
              self: BY (Keyword)
            exprs:
            - self: z (Identifier)
          partitionby:
            self: PARTITION (XXXByExprs)
            by:
              self: BY (Keyword)
            exprs:
            - self: y (Identifier)
          rparen:
            self: ) (Symbol)
      rparen:
        self: ) (Symbol)
    right:
      self: 1 (NumericLiteral)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
SELECT x
FROM t
WHERE TRUE
QUALIFY ROW_NUMBER() OVER(PARTITION BY y ORDER BY z) = 1
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: x (Identifier)
from:
  self: FROM (KeywordWithExpr)
  expr:
    self: t (Identifier)
qualify:
  self: QUALIFY (KeywordWithExpr)
  expr:
    self: = (BinaryOperator)
    left:
      self: ( (CallingFunction)
      func:
        self: ROW_NUMBER (Identifier)
      over:
        self: OVER (OverClause)
        window:
          self: ( (WindowSpecification)
          orderby:
            self: ORDER (XXXByExprs)
            by:
              self: BY (Keyword)
            exprs:
            - self: z (Identifier)
          partitionby:
            self: PARTITION (XXXByExprs)
            by:
              self: BY (Keyword)
            exprs:
            - self: y (Identifier)
          rparen:
            self: ) (Symbol)
      rparen:
        self: ) (Symbol)
    right:
      self: 1 (NumericLiteral)
where:
  self: WHERE (KeywordWithExpr)
  expr:
    self: TRUE (BooleanLiteral)
",
            0,
        )),
        // ----- WINDOW clause -----
        Box::new(SuccessTestCase::new(
            "\
SELECT *
FROM t
WINDOW
  a AS (PARTITION BY col1),
  b AS (a ORDER BY col2)
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: * (Asterisk)
from:
  self: FROM (KeywordWithExpr)
  expr:
    self: t (Identifier)
window:
  self: WINDOW (WindowClause)
  window_exprs:
  - self: a (WindowExpr)
    as:
      self: AS (Keyword)
    comma:
      self: , (Symbol)
    window:
      self: ( (WindowSpecification)
      partitionby:
        self: PARTITION (XXXByExprs)
        by:
          self: BY (Keyword)
        exprs:
        - self: col1 (Identifier)
      rparen:
        self: ) (Symbol)
  - self: b (WindowExpr)
    as:
      self: AS (Keyword)
    window:
      self: ( (WindowSpecification)
      name:
        self: a (Identifier)
      orderby:
        self: ORDER (XXXByExprs)
        by:
          self: BY (Keyword)
        exprs:
        - self: col2 (Identifier)
      rparen:
        self: ) (Symbol)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
SELECT *
FROM t
WINDOW
  a AS (PARTITION BY col1),
  b AS a
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: * (Asterisk)
from:
  self: FROM (KeywordWithExpr)
  expr:
    self: t (Identifier)
window:
  self: WINDOW (WindowClause)
  window_exprs:
  - self: a (WindowExpr)
    as:
      self: AS (Keyword)
    comma:
      self: , (Symbol)
    window:
      self: ( (WindowSpecification)
      partitionby:
        self: PARTITION (XXXByExprs)
        by:
          self: BY (Keyword)
        exprs:
        - self: col1 (Identifier)
      rparen:
        self: ) (Symbol)
  - self: b (WindowExpr)
    as:
      self: AS (Keyword)
    window:
      self: a (Identifier)
",
            0,
        )),
        // ----- ORDER BY clause -----
        Box::new(SuccessTestCase::new(
            "\
SELECT c1 FROM t ORDER BY c1 ASC, c2
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: c1 (Identifier)
from:
  self: FROM (KeywordWithExpr)
  expr:
    self: t (Identifier)
orderby:
  self: ORDER (XXXByExprs)
  by:
    self: BY (Keyword)
  exprs:
  - self: c1 (Identifier)
    comma:
      self: , (Symbol)
    order:
      self: ASC (Keyword)
  - self: c2 (Identifier)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
SELECT c1 FROM t ORDER BY c1 NULLS FIRST, c2 DESC NULLS LAST
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: c1 (Identifier)
from:
  self: FROM (KeywordWithExpr)
  expr:
    self: t (Identifier)
orderby:
  self: ORDER (XXXByExprs)
  by:
    self: BY (Keyword)
  exprs:
  - self: c1 (Identifier)
    comma:
      self: , (Symbol)
    null_order:
    - self: NULLS (Keyword)
    - self: FIRST (Keyword)
  - self: c2 (Identifier)
    null_order:
    - self: NULLS (Keyword)
    - self: LAST (Keyword)
    order:
      self: DESC (Keyword)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
(SELECT col FROM tablename ORDER BY 1)
ORDER BY 1 DESC
",
            "\
self: ( (GroupedStatement)
orderby:
  self: ORDER (XXXByExprs)
  by:
    self: BY (Keyword)
  exprs:
  - self: 1 (NumericLiteral)
    order:
      self: DESC (Keyword)
rparen:
  self: ) (Symbol)
stmt:
  self: SELECT (SelectStatement)
  exprs:
  - self: col (Identifier)
  from:
    self: FROM (KeywordWithExpr)
    expr:
      self: tablename (Identifier)
  orderby:
    self: ORDER (XXXByExprs)
    by:
      self: BY (Keyword)
    exprs:
    - self: 1 (NumericLiteral)
",
            0,
        )),
        // ----- LIMIT clause -----
        Box::new(SuccessTestCase::new(
            "\
SELECT c1 FROM t LIMIT 100
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: c1 (Identifier)
from:
  self: FROM (KeywordWithExpr)
  expr:
    self: t (Identifier)
limit:
  self: LIMIT (LimitClause)
  expr:
    self: 100 (NumericLiteral)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
SELECT c1 FROM t LIMIT 100 OFFSET 10
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: c1 (Identifier)
from:
  self: FROM (KeywordWithExpr)
  expr:
    self: t (Identifier)
limit:
  self: LIMIT (LimitClause)
  expr:
    self: 100 (NumericLiteral)
  offset:
    self: OFFSET (KeywordWithExpr)
    expr:
      self: 10 (NumericLiteral)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
(SELECT 1 LIMIT 2) LIMIT 3
",
            "\
self: ( (GroupedStatement)
limit:
  self: LIMIT (LimitClause)
  expr:
    self: 3 (NumericLiteral)
rparen:
  self: ) (Symbol)
stmt:
  self: SELECT (SelectStatement)
  exprs:
  - self: 1 (NumericLiteral)
  limit:
    self: LIMIT (LimitClause)
    expr:
      self: 2 (NumericLiteral)
",
            0,
        )),
    ];
    for t in test_cases {
        t.test();
    }
}
