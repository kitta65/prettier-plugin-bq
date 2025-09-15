use super::*;

#[test]
fn test_parse_code_ml() {
    let test_cases = vec![
        // CREATE MODEL statement
        Box::new(SuccessTestCase::new(
            // NOTE actually, this is not valid syntax
            "\
CREATE OR REPLACE MODEL IF NOT EXISTS ident;
",
            "\
self: CREATE (CreateModelStatement)
ident:
  self: ident (Identifier)
if_not_exists:
- self: IF (Keyword)
- self: NOT (Keyword)
- self: EXISTS (Keyword)
or_replace:
- self: OR (Keyword)
- self: REPLACE (Keyword)
semicolon:
  self: ; (Symbol)
what:
  self: MODEL (Keyword)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            // NOTE trailing comma seems to be acceptable
            "\
CREATE MODEL ident
TRANSFORM (
  expr_a as alias_a,
  *,
  * EXCEPT(expr_b),
)
",
            "\
self: CREATE (CreateModelStatement)
ident:
  self: ident (Identifier)
transform:
  self: TRANSFORM (KeywordWithGroupedXXX)
  group:
    self: ( (GroupedExprs)
    exprs:
    - self: expr_a (Identifier)
      alias:
        self: alias_a (Identifier)
      as:
        self: as (Keyword)
      comma:
        self: , (Symbol)
    - self: * (Asterisk)
      comma:
        self: , (Symbol)
    - self: * (Asterisk)
      comma:
        self: , (Symbol)
      except:
        self: EXCEPT (KeywordWithGroupedXXX)
        group:
          self: ( (GroupedExprs)
          exprs:
          - self: expr_b (Identifier)
          rparen:
            self: ) (Symbol)
    rparen:
      self: ) (Symbol)
what:
  self: MODEL (Keyword)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
CREATE MODEL ident
INPUT (a INT64, b FLOAT64)
OUTPUT (c STRING)
",
            "\
self: CREATE (CreateModelStatement)
ident:
  self: ident (Identifier)
input:
  self: INPUT (KeywordWithGroupedXXX)
  group:
    self: ( (GroupedTypeDeclarationOrConstraints)
    declarations:
    - self: a (TypeDeclaration)
      comma:
        self: , (Symbol)
      type:
        self: INT64 (Type)
    - self: b (TypeDeclaration)
      type:
        self: FLOAT64 (Type)
    rparen:
      self: ) (Symbol)
output:
  self: OUTPUT (KeywordWithGroupedXXX)
  group:
    self: ( (GroupedTypeDeclarationOrConstraints)
    declarations:
    - self: c (TypeDeclaration)
      type:
        self: STRING (Type)
    rparen:
      self: ) (Symbol)
what:
  self: MODEL (Keyword)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
CREATE MODEL ident
REMOTE WITH CONNECTION ident
OPTIONS (ENDPOINT = '')
",
            "\
self: CREATE (CreateModelStatement)
ident:
  self: ident (Identifier)
options:
  self: OPTIONS (KeywordWithGroupedXXX)
  group:
    self: ( (GroupedExprs)
    exprs:
    - self: = (BinaryOperator)
      left:
        self: ENDPOINT (Identifier)
      right:
        self: '' (StringLiteral)
    rparen:
      self: ) (Symbol)
remote:
  self: REMOTE (KeywordSequence)
  next_keyword:
    self: WITH (KeywordSequence)
    next_keyword:
      self: CONNECTION (KeywordWithExpr)
      expr:
        self: ident (Identifier)
what:
  self: MODEL (Keyword)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
CREATE MODEL ident
REMOTE WITH CONNECTION DEFAULT
OPTIONS (ENDPOINT = '')
",
            "\
self: CREATE (CreateModelStatement)
ident:
  self: ident (Identifier)
options:
  self: OPTIONS (KeywordWithGroupedXXX)
  group:
    self: ( (GroupedExprs)
    exprs:
    - self: = (BinaryOperator)
      left:
        self: ENDPOINT (Identifier)
      right:
        self: '' (StringLiteral)
    rparen:
      self: ) (Symbol)
remote:
  self: REMOTE (KeywordSequence)
  next_keyword:
    self: WITH (KeywordSequence)
    next_keyword:
      self: CONNECTION (KeywordWithExpr)
      expr:
        self: DEFAULT (Keyword)
what:
  self: MODEL (Keyword)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
CREATE MODEL ident
AS (SELECT 1);
",
            "\
self: CREATE (CreateModelStatement)
ident:
  self: ident (Identifier)
query:
  self: AS (KeywordWithStatement)
  stmt:
    self: ( (GroupedStatement)
    rparen:
      self: ) (Symbol)
    stmt:
      self: SELECT (SelectStatement)
      exprs:
      - self: 1 (NumericLiteral)
semicolon:
  self: ; (Symbol)
what:
  self: MODEL (Keyword)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
CREATE MODEL ident
AS (
  training_data AS (SELECT 1),
  custom_holiday AS (SELECT 1)
)
",
            "\
self: CREATE (CreateModelStatement)
ident:
  self: ident (Identifier)
training_data_custom_holiday:
  self: AS (KeywordWithGroupedXXX)
  group:
    self: ( (TrainingDataCustomHolidayClause)
    custom_holiday:
      self: custom_holiday (WithQuery)
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
    rparen:
      self: ) (Symbol)
    training_data:
      self: training_data (WithQuery)
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
what:
  self: MODEL (Keyword)
",
            0,
        )),
        // EXPORT MODEL statement
        Box::new(SuccessTestCase::new(
            "\
EXPORT MODEL ident
",
            "\
self: EXPORT (ExportModelStatement)
ident:
  self: ident (Identifier)
what:
  self: MODEL (Keyword)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
EXPORT MODEL ident OPTIONS(uri = '');
",
            "\
self: EXPORT (ExportModelStatement)
ident:
  self: ident (Identifier)
options:
  self: OPTIONS (KeywordWithGroupedXXX)
  group:
    self: ( (GroupedExprs)
    exprs:
    - self: = (BinaryOperator)
      left:
        self: uri (Identifier)
      right:
        self: '' (StringLiteral)
    rparen:
      self: ) (Symbol)
semicolon:
  self: ; (Symbol)
what:
  self: MODEL (Keyword)
",
            0,
        )),
        // ALTER MODEL statement
        Box::new(SuccessTestCase::new(
            "\
ALTER MODEL ident SET OPTIONS ()
",
            "\
self: ALTER (AlterModelStatement)
ident:
  self: ident (Identifier)
options:
  self: OPTIONS (KeywordWithGroupedXXX)
  group:
    self: ( (GroupedExprs)
    rparen:
      self: ) (Symbol)
set:
  self: SET (Keyword)
what:
  self: MODEL (Keyword)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
ALTER MODEL IF EXISTS ident SET OPTIONS (description = '')
",
            "\
self: ALTER (AlterModelStatement)
ident:
  self: ident (Identifier)
if_exists:
- self: IF (Keyword)
- self: EXISTS (Keyword)
options:
  self: OPTIONS (KeywordWithGroupedXXX)
  group:
    self: ( (GroupedExprs)
    exprs:
    - self: = (BinaryOperator)
      left:
        self: description (Identifier)
      right:
        self: '' (StringLiteral)
    rparen:
      self: ) (Symbol)
set:
  self: SET (Keyword)
what:
  self: MODEL (Keyword)
",
            0,
        )),
        // DROP statement
        Box::new(SuccessTestCase::new(
            "\
DROP MODEL ident
",
            "\
self: DROP (DropStatement)
ident:
  self: ident (Identifier)
what:
  self: MODEL (Keyword)
",
            0,
        )),
    ];
    for t in test_cases {
        t.test();
    }
}
