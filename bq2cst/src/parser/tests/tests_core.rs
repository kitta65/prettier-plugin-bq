use super::*;
#[test]
fn test_parse_code_core() {
    let test_cases: Vec<Box<dyn TestCase>> = vec![
        // ----- no statement -----
        Box::new(SuccessTestCase::new(
            "",
            "\
self: None (EOF)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
-- comment
",
            "\
self: None (EOF)
leading_comments:
- self: -- comment (Comment)
",
            0,
        )),
        Box::new(ErrorTestCase::new(
            "\
HOGE
",
            usize::MAX,
            usize::MAX,
        )),
        // ----- eof -----
        Box::new(SuccessTestCase::new(
            "\
SELECT 1;
",
            "\
self: None (EOF)
",
            1,
        )),
        Box::new(SuccessTestCase::new(
            "\
SELECT 1;
-- EOF
",
            "\
self: None (EOF)
leading_comments:
- self: -- EOF (Comment)
",
            1,
        )),
        // ----- comment -----
        Box::new(SuccessTestCase::new(
            "\
#standardSQL
SELECT /* */
  -- leading_comments
  1
; -- end of statement
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: 1 (NumericLiteral)
  leading_comments:
  - self: -- leading_comments (Comment)
leading_comments:
- self: #standardSQL (Comment)
semicolon:
  self: ; (Symbol)
  trailing_comments:
  - self: -- end of statement (Comment)
trailing_comments:
- self: /* */ (Comment)
",
            0,
        )),
        // ----- unary operator -----
        Box::new(SuccessTestCase::new(
            "\
SELECT
  -1,
  +1,
  r'xxx',
  DATE '2020-01-01',
  TIMESTAMP r'2020-01-01',
  NOT TRUE,
  MODEL `ident.ident`
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: - (UnaryOperator)
  comma:
    self: , (Symbol)
  right:
    self: 1 (NumericLiteral)
- self: + (UnaryOperator)
  comma:
    self: , (Symbol)
  right:
    self: 1 (NumericLiteral)
- self: r (UnaryOperator)
  comma:
    self: , (Symbol)
  right:
    self: 'xxx' (StringLiteral)
- self: DATE (UnaryOperator)
  comma:
    self: , (Symbol)
  right:
    self: '2020-01-01' (StringLiteral)
- self: TIMESTAMP (UnaryOperator)
  comma:
    self: , (Symbol)
  right:
    self: r (UnaryOperator)
    right:
      self: '2020-01-01' (StringLiteral)
- self: NOT (UnaryOperator)
  comma:
    self: , (Symbol)
  right:
    self: TRUE (BooleanLiteral)
- self: MODEL (UnaryOperator)
  right:
    self: `ident.ident` (Identifier)
",
            0,
        )),
        // ----- binary operator -----
        // +, -, *, /
        Box::new(SuccessTestCase::new(
            "\
SELECT
  1 + 2,
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: + (BinaryOperator)
  comma:
    self: , (Symbol)
  left:
    self: 1 (NumericLiteral)
  right:
    self: 2 (NumericLiteral)
",
            0,
        )),
        // BETWEEN
        Box::new(SuccessTestCase::new(
            "\
SELECT
  1 BETWEEN 0 AND 3,
  1 NOT BETWEEN 0 AND 3,
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: BETWEEN (BetweenOperator)
  and:
    self: AND (Keyword)
  comma:
    self: , (Symbol)
  left:
    self: 1 (NumericLiteral)
  right_max:
    self: 3 (NumericLiteral)
  right_min:
    self: 0 (NumericLiteral)
- self: BETWEEN (BetweenOperator)
  and:
    self: AND (Keyword)
  comma:
    self: , (Symbol)
  left:
    self: 1 (NumericLiteral)
  not:
    self: NOT (Keyword)
  right_max:
    self: 3 (NumericLiteral)
  right_min:
    self: 0 (NumericLiteral)
",
            0,
        )),
        // IN
        Box::new(SuccessTestCase::new(
            "\
SELECT
  1 IN (1, 2, 3),
  1 NOT IN (1, 2, 3),
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: IN (InOperator)
  comma:
    self: , (Symbol)
  left:
    self: 1 (NumericLiteral)
  right:
    self: ( (GroupedExprs)
    exprs:
    - self: 1 (NumericLiteral)
      comma:
        self: , (Symbol)
    - self: 2 (NumericLiteral)
      comma:
        self: , (Symbol)
    - self: 3 (NumericLiteral)
    rparen:
      self: ) (Symbol)
- self: IN (InOperator)
  comma:
    self: , (Symbol)
  left:
    self: 1 (NumericLiteral)
  not:
    self: NOT (Keyword)
  right:
    self: ( (GroupedExprs)
    exprs:
    - self: 1 (NumericLiteral)
      comma:
        self: , (Symbol)
    - self: 2 (NumericLiteral)
      comma:
        self: , (Symbol)
    - self: 3 (NumericLiteral)
    rparen:
      self: ) (Symbol)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
SELECT 1 IN (SELECT 1)
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: IN (InOperator)
  left:
    self: 1 (NumericLiteral)
  right:
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
SELECT 1 IN UNNEST([1, 2])
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: IN (InOperator)
  left:
    self: 1 (NumericLiteral)
  right:
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
SELECT 1 IN UNNEST(1) AND TRUE
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: AND (BinaryOperator)
  left:
    self: IN (InOperator)
    left:
      self: 1 (NumericLiteral)
    right:
      self: ( (CallingUnnest)
      args:
      - self: 1 (NumericLiteral)
      func:
        self: UNNEST (Identifier)
      rparen:
        self: ) (Symbol)
  right:
    self: TRUE (BooleanLiteral)
",
            0,
        )),
        Box::new(ErrorTestCase::new(
            "\
SELECT 1 NOT;
",
            1,
            13,
        )),
        // LIKE
        Box::new(SuccessTestCase::new(
            "\
SELECT
  'x' LIKE '%x%',
  'x' NOT LIKE '%x%',
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: LIKE (BinaryOperator)
  comma:
    self: , (Symbol)
  left:
    self: 'x' (StringLiteral)
  right:
    self: '%x%' (StringLiteral)
- self: LIKE (BinaryOperator)
  comma:
    self: , (Symbol)
  left:
    self: 'x' (StringLiteral)
  not:
    self: NOT (Keyword)
  right:
    self: '%x%' (StringLiteral)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
SELECT
  'x' LIKE ANY ('%x%'),
  'x' NOT LIKE SOME ('%x%', ''),
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: LIKE (BinaryOperator)
  comma:
    self: , (Symbol)
  left:
    self: 'x' (StringLiteral)
  quantifier:
    self: ANY (Keyword)
  right:
    self: ( (GroupedExpr)
    expr:
      self: '%x%' (StringLiteral)
    rparen:
      self: ) (Symbol)
- self: LIKE (BinaryOperator)
  comma:
    self: , (Symbol)
  left:
    self: 'x' (StringLiteral)
  not:
    self: NOT (Keyword)
  quantifier:
    self: SOME (Keyword)
  right:
    self: ( (StructLiteral)
    exprs:
    - self: '%x%' (StringLiteral)
      comma:
        self: , (Symbol)
    - self: '' (StringLiteral)
    rparen:
      self: ) (Symbol)
",
            0,
        )),
        // IS
        Box::new(SuccessTestCase::new(
            "\
SELECT
  x IS NULL,
  x IS NOT NULL,
  TRUE IS NOT FALSE,
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: IS (BinaryOperator)
  comma:
    self: , (Symbol)
  left:
    self: x (Identifier)
  right:
    self: NULL (NullLiteral)
- self: IS (BinaryOperator)
  comma:
    self: , (Symbol)
  left:
    self: x (Identifier)
  not:
    self: NOT (Keyword)
  right:
    self: NULL (NullLiteral)
- self: IS (BinaryOperator)
  comma:
    self: , (Symbol)
  left:
    self: TRUE (BooleanLiteral)
  not:
    self: NOT (Keyword)
  right:
    self: FALSE (BooleanLiteral)
",
            0,
        )),
        // DISTINCT FROM
        Box::new(SuccessTestCase::new(
            "\
SELECT 1 IS DISTINCT FROM 2
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: IS (IsDistinctFromOperator)
  distinct:
    self: DISTINCT (Keyword)
  from:
    self: FROM (Keyword)
  left:
    self: 1 (NumericLiteral)
  right:
    self: 2 (NumericLiteral)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
SELECT 1 IS NOT DISTINCT FROM 2
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: IS (IsDistinctFromOperator)
  distinct:
    self: DISTINCT (Keyword)
  from:
    self: FROM (Keyword)
  left:
    self: 1 (NumericLiteral)
  not:
    self: NOT (Keyword)
  right:
    self: 2 (NumericLiteral)
",
            0,
        )),
        // '.'
        Box::new(SuccessTestCase::new(
            "\
SELECT
  t.struct_col.num + 1,
  1 + t.struct_col.num,
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: + (BinaryOperator)
  comma:
    self: , (Symbol)
  left:
    self: . (DotOperator)
    left:
      self: . (DotOperator)
      left:
        self: t (Identifier)
      right:
        self: struct_col (Identifier)
    right:
      self: num (Identifier)
  right:
    self: 1 (NumericLiteral)
- self: + (BinaryOperator)
  comma:
    self: , (Symbol)
  left:
    self: 1 (NumericLiteral)
  right:
    self: . (DotOperator)
    left:
      self: . (DotOperator)
      left:
        self: t (Identifier)
      right:
        self: struct_col (Identifier)
    right:
      self: num (Identifier)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
SELECT
  foo.select,
  foo.select.from
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: . (DotOperator)
  comma:
    self: , (Symbol)
  left:
    self: foo (Identifier)
  right:
    self: select (Identifier)
- self: . (DotOperator)
  left:
    self: . (DotOperator)
    left:
      self: foo (Identifier)
    right:
      self: select (Identifier)
  right:
    self: from (Identifier)
",
            0,
        )),
        // precedence
        Box::new(SuccessTestCase::new(
            "\
SELECT (1+(-2)) * 3 IN (9)
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: IN (InOperator)
  left:
    self: * (BinaryOperator)
    left:
      self: ( (GroupedExpr)
      expr:
        self: + (BinaryOperator)
        left:
          self: 1 (NumericLiteral)
        right:
          self: ( (GroupedExpr)
          expr:
            self: - (UnaryOperator)
            right:
              self: 2 (NumericLiteral)
          rparen:
            self: ) (Symbol)
      rparen:
        self: ) (Symbol)
    right:
      self: 3 (NumericLiteral)
  right:
    self: ( (GroupedExprs)
    exprs:
    - self: 9 (NumericLiteral)
    rparen:
      self: ) (Symbol)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
SELECT (1+2) * 3 NOT BETWEEN 10 + 0 AND 11 + 2 OR TRUE
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: OR (BinaryOperator)
  left:
    self: BETWEEN (BetweenOperator)
    and:
      self: AND (Keyword)
    left:
      self: * (BinaryOperator)
      left:
        self: ( (GroupedExpr)
        expr:
          self: + (BinaryOperator)
          left:
            self: 1 (NumericLiteral)
          right:
            self: 2 (NumericLiteral)
        rparen:
          self: ) (Symbol)
      right:
        self: 3 (NumericLiteral)
    not:
      self: NOT (Keyword)
    right_max:
      self: + (BinaryOperator)
      left:
        self: 11 (NumericLiteral)
      right:
        self: 2 (NumericLiteral)
    right_min:
      self: + (BinaryOperator)
      left:
        self: 10 (NumericLiteral)
      right:
        self: 0 (NumericLiteral)
  right:
    self: TRUE (BooleanLiteral)
",
            0,
        )),
        // ----- array -----
        Box::new(SuccessTestCase::new(
            "\
SELECT
  [],
  [1, 2],
  ARRAY[1,2],
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: [ (ArrayLiteral)
  comma:
    self: , (Symbol)
  exprs: []
  rparen:
    self: ] (Symbol)
- self: [ (ArrayLiteral)
  comma:
    self: , (Symbol)
  exprs:
  - self: 1 (NumericLiteral)
    comma:
      self: , (Symbol)
  - self: 2 (NumericLiteral)
  rparen:
    self: ] (Symbol)
- self: [ (ArrayLiteral)
  comma:
    self: , (Symbol)
  exprs:
  - self: 1 (NumericLiteral)
    comma:
      self: , (Symbol)
  - self: 2 (NumericLiteral)
  rparen:
    self: ] (Symbol)
  type:
    self: ARRAY (Type)
",
            0,
        )),
        // array with type declaration
        Box::new(SuccessTestCase::new(
            "\
SELECT ARRAY<STRING>[]
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: [ (ArrayLiteral)
  exprs: []
  rparen:
    self: ] (Symbol)
  type:
    self: ARRAY (Type)
    type_declaration:
      self: < (GroupedType)
      rparen:
        self: > (Symbol)
      type:
        self: STRING (Type)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
SELECT ARRAY<INT64>[1]
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: [ (ArrayLiteral)
  exprs:
  - self: 1 (NumericLiteral)
  rparen:
    self: ] (Symbol)
  type:
    self: ARRAY (Type)
    type_declaration:
      self: < (GroupedType)
      rparen:
        self: > (Symbol)
      type:
        self: INT64 (Type)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
SELECT ARRAY<STRUCT<INT64, INT64>>[(1,2)]
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: [ (ArrayLiteral)
  exprs:
  - self: ( (StructLiteral)
    exprs:
    - self: 1 (NumericLiteral)
      comma:
        self: , (Symbol)
    - self: 2 (NumericLiteral)
    rparen:
      self: ) (Symbol)
  rparen:
    self: ] (Symbol)
  type:
    self: ARRAY (Type)
    type_declaration:
      self: < (GroupedType)
      rparen:
        self: > (Symbol)
      type:
        self: STRUCT (Type)
        type_declaration:
          self: < (GroupedTypeDeclarationOrConstraints)
          declarations:
          - self: None (TypeDeclaration)
            comma:
              self: , (Symbol)
            type:
              self: INT64 (Type)
          - self: None (TypeDeclaration)
            type:
              self: INT64 (Type)
          rparen:
            self: > (Symbol)
",
            0,
        )),
        // accessing array
        Box::new(SuccessTestCase::new(
            "\
SELECT arr[OFFSET(1)]
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: [ (AccessOperator)
  left:
    self: arr (Identifier)
  right:
    self: ( (CallingFunction)
    args:
    - self: 1 (NumericLiteral)
    func:
      self: OFFSET (Identifier)
    rparen:
      self: ) (Symbol)
  rparen:
    self: ] (Symbol)
",
            0,
        )),
        // ----- struct -----
        Box::new(SuccessTestCase::new(
            "\
SELECT
  (1,2),
  STRUCT(1,2),
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: ( (StructLiteral)
  comma:
    self: , (Symbol)
  exprs:
  - self: 1 (NumericLiteral)
    comma:
      self: , (Symbol)
  - self: 2 (NumericLiteral)
  rparen:
    self: ) (Symbol)
- self: ( (StructLiteral)
  comma:
    self: , (Symbol)
  exprs:
  - self: 1 (NumericLiteral)
    comma:
      self: , (Symbol)
  - self: 2 (NumericLiteral)
  rparen:
    self: ) (Symbol)
  type:
    self: STRUCT (Type)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
SELECT
  (1,2)[0],
  STRUCT(1,2)[0],
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: [ (AccessOperator)
  comma:
    self: , (Symbol)
  left:
    self: ( (StructLiteral)
    exprs:
    - self: 1 (NumericLiteral)
      comma:
        self: , (Symbol)
    - self: 2 (NumericLiteral)
    rparen:
      self: ) (Symbol)
  right:
    self: 0 (NumericLiteral)
  rparen:
    self: ] (Symbol)
- self: [ (AccessOperator)
  comma:
    self: , (Symbol)
  left:
    self: ( (StructLiteral)
    exprs:
    - self: 1 (NumericLiteral)
      comma:
        self: , (Symbol)
    - self: 2 (NumericLiteral)
    rparen:
      self: ) (Symbol)
    type:
      self: STRUCT (Type)
  right:
    self: 0 (NumericLiteral)
  rparen:
    self: ] (Symbol)
",
            0,
        )),
        // struct with type declarations
        Box::new(SuccessTestCase::new(
            "\
SELECT STRUCT<INT64>(1)
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: ( (StructLiteral)
  exprs:
  - self: 1 (NumericLiteral)
  rparen:
    self: ) (Symbol)
  type:
    self: STRUCT (Type)
    type_declaration:
      self: < (GroupedTypeDeclarationOrConstraints)
      declarations:
      - self: None (TypeDeclaration)
        type:
          self: INT64 (Type)
      rparen:
        self: > (Symbol)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
SELECT STRUCT<ARRAY<INT64>, x FLOAT64>([1], .1)
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: ( (StructLiteral)
  exprs:
  - self: [ (ArrayLiteral)
    comma:
      self: , (Symbol)
    exprs:
    - self: 1 (NumericLiteral)
    rparen:
      self: ] (Symbol)
  - self: .1 (NumericLiteral)
  rparen:
    self: ) (Symbol)
  type:
    self: STRUCT (Type)
    type_declaration:
      self: < (GroupedTypeDeclarationOrConstraints)
      declarations:
      - self: None (TypeDeclaration)
        comma:
          self: , (Symbol)
        type:
          self: ARRAY (Type)
          type_declaration:
            self: < (GroupedType)
            rparen:
              self: > (Symbol)
            type:
              self: INT64 (Type)
      - self: x (TypeDeclaration)
        type:
          self: FLOAT64 (Type)
      rparen:
        self: > (Symbol)
",
            0,
        )),
        // ----- range -----
        Box::new(SuccessTestCase::new(
            "\
SELECT RANGE<DATE> '[2023-01-01, 2024-01-01)'
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: '[2023-01-01, 2024-01-01)' (RangeLiteral)
  type:
    self: RANGE (Type)
    type_declaration:
      self: < (GroupedType)
      rparen:
        self: > (Symbol)
      type:
        self: DATE (Type)
",
            0,
        )),
        // ----- interval -----
        Box::new(SuccessTestCase::new(
            "\
SELECT
  INTERVAL 1 YEAR,
  INTERVAL 1 + 1 MONTH,
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: INTERVAL (IntervalLiteral)
  comma:
    self: , (Symbol)
  date_part:
    self: YEAR (Keyword)
  expr:
    self: 1 (NumericLiteral)
- self: INTERVAL (IntervalLiteral)
  comma:
    self: , (Symbol)
  date_part:
    self: MONTH (Keyword)
  expr:
    self: + (BinaryOperator)
    left:
      self: 1 (NumericLiteral)
    right:
      self: 1 (NumericLiteral)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
SELECT
  INTERVAL '1' DAY,
  INTERVAL '1:2:3' HOUR TO SECOND,
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: INTERVAL (IntervalLiteral)
  comma:
    self: , (Symbol)
  date_part:
    self: DAY (Keyword)
  expr:
    self: '1' (StringLiteral)
- self: INTERVAL (IntervalLiteral)
  comma:
    self: , (Symbol)
  date_part:
    self: HOUR (Keyword)
  expr:
    self: '1:2:3' (StringLiteral)
  to:
    self: TO (Keyword)
  to_date_part:
    self: SECOND (Keyword)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
SELECT DATE_ADD('2000-01-01', INTERVAL 1 DAY)
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: ( (CallingFunction)
  args:
  - self: '2000-01-01' (StringLiteral)
    comma:
      self: , (Symbol)
  - self: INTERVAL (IntervalLiteral)
    date_part:
      self: DAY (Keyword)
    expr:
      self: 1 (NumericLiteral)
  func:
    self: DATE_ADD (Identifier)
  rparen:
    self: ) (Symbol)
",
            0,
        )),
        // ----- json -----
        Box::new(SuccessTestCase::new(
            "\
SELECT
  JSON '{\"key\": \"value\"}',
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: JSON (UnaryOperator)
  comma:
    self: , (Symbol)
  right:
    self: '{\"key\": \"value\"}' (StringLiteral)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
SELECT json['path']
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: [ (AccessOperator)
  left:
    self: json (Identifier)
  right:
    self: 'path' (StringLiteral)
  rparen:
    self: ] (Symbol)
",
            0,
        )),
        // ----- case expr -----
        Box::new(SuccessTestCase::new(
            "\
SELECT CASE c1 WHEN 1 THEN 'one' WHEN 2 THEN 'two' END
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: CASE (CaseExpr)
  arms:
  - self: WHEN (CaseExprArm)
    expr:
      self: 1 (NumericLiteral)
    result:
      self: 'one' (StringLiteral)
    then:
      self: THEN (Keyword)
  - self: WHEN (CaseExprArm)
    expr:
      self: 2 (NumericLiteral)
    result:
      self: 'two' (StringLiteral)
    then:
      self: THEN (Keyword)
  end:
    self: END (Keyword)
  expr:
    self: c1 (Identifier)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
SELECT CASE c1 WHEN 1 THEN 'one' WHEN 2 THEN 'two' ELSE NULL END
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: CASE (CaseExpr)
  arms:
  - self: WHEN (CaseExprArm)
    expr:
      self: 1 (NumericLiteral)
    result:
      self: 'one' (StringLiteral)
    then:
      self: THEN (Keyword)
  - self: WHEN (CaseExprArm)
    expr:
      self: 2 (NumericLiteral)
    result:
      self: 'two' (StringLiteral)
    then:
      self: THEN (Keyword)
  - self: ELSE (CaseExprArm)
    result:
      self: NULL (NullLiteral)
  end:
    self: END (Keyword)
  expr:
    self: c1 (Identifier)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
SELECT CASE WHEN c1 = 1 THEN 'one' ELSE f() END
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: CASE (CaseExpr)
  arms:
  - self: WHEN (CaseExprArm)
    expr:
      self: = (BinaryOperator)
      left:
        self: c1 (Identifier)
      right:
        self: 1 (NumericLiteral)
    result:
      self: 'one' (StringLiteral)
    then:
      self: THEN (Keyword)
  - self: ELSE (CaseExprArm)
    result:
      self: ( (CallingFunction)
      func:
        self: f (Identifier)
      rparen:
        self: ) (Symbol)
  end:
    self: END (Keyword)
",
            0,
        )),
        // ----- function -----
        Box::new(SuccessTestCase::new(
            "\
SELECT f(c1, c2)
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: ( (CallingFunction)
  args:
  - self: c1 (Identifier)
    comma:
      self: , (Symbol)
  - self: c2 (Identifier)
  func:
    self: f (Identifier)
  rparen:
    self: ) (Symbol)
",
            0,
        )),
        // deep function
        Box::new(SuccessTestCase::new(
            "\
SELECT SAFE.KEYS.NEW_KEYSET('AEAD_AES_GCM_256')
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: ( (CallingFunction)
  args:
  - self: 'AEAD_AES_GCM_256' (StringLiteral)
  func:
    self: . (DotOperator)
    left:
      self: . (DotOperator)
      left:
        self: SAFE (Identifier)
      right:
        self: KEYS (Identifier)
    right:
      self: NEW_KEYSET (Identifier)
  rparen:
    self: ) (Symbol)
",
            0,
        )),
        // CAST
        Box::new(SuccessTestCase::new(
            "\
SELECT CAST('1' AS INT64),
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: ( (CallingFunction)
  args:
  - self: AS (CastArgument)
    cast_from:
      self: '1' (StringLiteral)
    cast_to:
      self: INT64 (Type)
  comma:
    self: , (Symbol)
  func:
    self: CAST (Identifier)
  rparen:
    self: ) (Symbol)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
SELECT CAST('Hello' AS BYTES FORMAT 'ASCII')
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: ( (CallingFunction)
  args:
  - self: AS (CastArgument)
    cast_from:
      self: 'Hello' (StringLiteral)
    cast_to:
      self: BYTES (Type)
    format:
      self: FORMAT (KeywordWithExpr)
      expr:
        self: 'ASCII' (StringLiteral)
  func:
    self: CAST (Identifier)
  rparen:
    self: ) (Symbol)
",
            0,
        )),
        // EXTRACT
        Box::new(SuccessTestCase::new(
            "\
SELECT EXTRACT(DAY FROM ts)
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: ( (CallingFunction)
  args:
  - self: FROM (ExtractArgument)
    extract_datepart:
      self: DAY (Identifier)
    extract_from:
      self: ts (Identifier)
  func:
    self: EXTRACT (Identifier)
  rparen:
    self: ) (Symbol)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
SELECT EXTRACT(WEEK(SUNDAY) FROM ts)
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: ( (CallingFunction)
  args:
  - self: FROM (ExtractArgument)
    extract_datepart:
      self: ( (CallingFunction)
      args:
      - self: SUNDAY (Identifier)
      func:
        self: WEEK (Identifier)
      rparen:
        self: ) (Symbol)
    extract_from:
      self: ts (Identifier)
  func:
    self: EXTRACT (Identifier)
  rparen:
    self: ) (Symbol)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
SELECT EXTRACT(DAY FROM ts AT TIME ZONE 'UTC')
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: ( (CallingFunction)
  args:
  - self: FROM (ExtractArgument)
    at_time_zone:
    - self: AT (Keyword)
    - self: TIME (Keyword)
    - self: ZONE (Keyword)
    extract_datepart:
      self: DAY (Identifier)
    extract_from:
      self: ts (Identifier)
    time_zone:
      self: 'UTC' (StringLiteral)
  func:
    self: EXTRACT (Identifier)
  rparen:
    self: ) (Symbol)
",
            0,
        )),
        // ANY_VALUE
        Box::new(SuccessTestCase::new(
            "\
SELECT ANY_VALUE(x HAVING MAX y)
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: ( (CallingFunction)
  args:
  - self: x (Identifier)
  func:
    self: ANY_VALUE (Identifier)
  having:
    self: HAVING (KeywordSequence)
    next_keyword:
      self: MAX (KeywordWithExpr)
      expr:
        self: y (Identifier)
  rparen:
    self: ) (Symbol)
",
            0,
        )),
        // ARRAY_AGG
        Box::new(SuccessTestCase::new(
            "\
SELECT ARRAY_AGG(DISTINCT x IGNORE NULLS ORDER BY z DESC LIMIT 100)
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: ( (CallingFunction)
  args:
  - self: x (Identifier)
  distinct:
    self: DISTINCT (Keyword)
  func:
    self: ARRAY_AGG (Identifier)
  ignore_nulls:
  - self: IGNORE (Keyword)
  - self: NULLS (Keyword)
  limit:
    self: LIMIT (KeywordWithExpr)
    expr:
      self: 100 (NumericLiteral)
  orderby:
    self: ORDER (XXXByExprs)
    by:
      self: BY (Keyword)
    exprs:
    - self: z (Identifier)
      order:
        self: DESC (Keyword)
  rparen:
    self: ) (Symbol)
",
            0,
        )),
        // ARRAY
        Box::new(SuccessTestCase::new(
            "\
SELECT ARRAY(SELECT 1 UNION ALL SELECT 2),
",
            // TODO strictly speaking,
            // SetOperator should not appear in args because it is not a subtype of Expr.
            "\
self: SELECT (SelectStatement)
exprs:
- self: ( (CallingFunction)
  args:
  - self: UNION (SetOperator)
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
  comma:
    self: , (Symbol)
  func:
    self: ARRAY (Identifier)
  rparen:
    self: ) (Symbol)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
SELECT ARRAY((SELECT 1))
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: ( (CallingFunction)
  args:
  - self: ( (GroupedStatement)
    rparen:
      self: ) (Symbol)
    stmt:
      self: SELECT (SelectStatement)
      exprs:
      - self: 1 (NumericLiteral)
  func:
    self: ARRAY (Identifier)
  rparen:
    self: ) (Symbol)
",
            0,
        )),
        // ST_GEOGFROMTEXT
        Box::new(SuccessTestCase::new(
            "\
SELECT ST_GEOGFROMTEXT(p, oriented => TRUE),
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: ( (CallingFunction)
  args:
  - self: p (Identifier)
    comma:
      self: , (Symbol)
  - self: => (BinaryOperator)
    left:
      self: oriented (Identifier)
    right:
      self: TRUE (BooleanLiteral)
  comma:
    self: , (Symbol)
  func:
    self: ST_GEOGFROMTEXT (Identifier)
  rparen:
    self: ) (Symbol)
",
            0,
        )),
        // ----- window function -----
        Box::new(SuccessTestCase::new(
            "\
SELECT SUM(x) OVER ()
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: ( (CallingFunction)
  args:
  - self: x (Identifier)
  func:
    self: SUM (Identifier)
  over:
    self: OVER (OverClause)
    window:
      self: ( (WindowSpecification)
      rparen:
        self: ) (Symbol)
  rparen:
    self: ) (Symbol)
",
            0,
        )),
        // PARTITION BY, ORDER BY
        Box::new(SuccessTestCase::new(
            "\
SELECT SUM(x) OVER (PARTITION BY a)
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: ( (CallingFunction)
  args:
  - self: x (Identifier)
  func:
    self: SUM (Identifier)
  over:
    self: OVER (OverClause)
    window:
      self: ( (WindowSpecification)
      partitionby:
        self: PARTITION (XXXByExprs)
        by:
          self: BY (Keyword)
        exprs:
        - self: a (Identifier)
      rparen:
        self: ) (Symbol)
  rparen:
    self: ) (Symbol)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
SELECT SUM(x) OVER (ORDER BY a DESC)
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: ( (CallingFunction)
  args:
  - self: x (Identifier)
  func:
    self: SUM (Identifier)
  over:
    self: OVER (OverClause)
    window:
      self: ( (WindowSpecification)
      orderby:
        self: ORDER (XXXByExprs)
        by:
          self: BY (Keyword)
        exprs:
        - self: a (Identifier)
          order:
            self: DESC (Keyword)
      rparen:
        self: ) (Symbol)
  rparen:
    self: ) (Symbol)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
SELECT SUM(x) OVER (PARTITION BY a ORDER BY b ASC, c)
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: ( (CallingFunction)
  args:
  - self: x (Identifier)
  func:
    self: SUM (Identifier)
  over:
    self: OVER (OverClause)
    window:
      self: ( (WindowSpecification)
      orderby:
        self: ORDER (XXXByExprs)
        by:
          self: BY (Keyword)
        exprs:
        - self: b (Identifier)
          comma:
            self: , (Symbol)
          order:
            self: ASC (Keyword)
        - self: c (Identifier)
      partitionby:
        self: PARTITION (XXXByExprs)
        by:
          self: BY (Keyword)
        exprs:
        - self: a (Identifier)
      rparen:
        self: ) (Symbol)
  rparen:
    self: ) (Symbol)
",
            0,
        )),
        // window frame clause
        Box::new(SuccessTestCase::new(
            "\
SELECT
  SUM() OVER (ROWS 1 + 1 PRECEDING),
  SUM() OVER (ROWS UNBOUNDED PRECEDING)
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: ( (CallingFunction)
  comma:
    self: , (Symbol)
  func:
    self: SUM (Identifier)
  over:
    self: OVER (OverClause)
    window:
      self: ( (WindowSpecification)
      frame:
        self: ROWS (WindowFrameClause)
        start:
        - self: + (BinaryOperator)
          left:
            self: 1 (NumericLiteral)
          right:
            self: 1 (NumericLiteral)
        - self: PRECEDING (Keyword)
      rparen:
        self: ) (Symbol)
  rparen:
    self: ) (Symbol)
- self: ( (CallingFunction)
  func:
    self: SUM (Identifier)
  over:
    self: OVER (OverClause)
    window:
      self: ( (WindowSpecification)
      frame:
        self: ROWS (WindowFrameClause)
        start:
        - self: UNBOUNDED (Keyword)
        - self: PRECEDING (Keyword)
      rparen:
        self: ) (Symbol)
  rparen:
    self: ) (Symbol)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
SELECT SUM() OVER (
  PARTITION BY a ORDER BY b, c
  ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
)
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: ( (CallingFunction)
  func:
    self: SUM (Identifier)
  over:
    self: OVER (OverClause)
    window:
      self: ( (WindowSpecification)
      frame:
        self: ROWS (WindowFrameClause)
        and:
          self: AND (Keyword)
        between:
          self: BETWEEN (Keyword)
        end:
        - self: UNBOUNDED (Keyword)
        - self: FOLLOWING (Keyword)
        start:
        - self: UNBOUNDED (Keyword)
        - self: PRECEDING (Keyword)
      orderby:
        self: ORDER (XXXByExprs)
        by:
          self: BY (Keyword)
        exprs:
        - self: b (Identifier)
          comma:
            self: , (Symbol)
        - self: c (Identifier)
      partitionby:
        self: PARTITION (XXXByExprs)
        by:
          self: BY (Keyword)
        exprs:
        - self: a (Identifier)
      rparen:
        self: ) (Symbol)
  rparen:
    self: ) (Symbol)
",
            0,
        )),
        // named window specification
        Box::new(SuccessTestCase::new(
            "\
SELECT
  SUM() OVER named_window,
  SUM() OVER (named_window),
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: ( (CallingFunction)
  comma:
    self: , (Symbol)
  func:
    self: SUM (Identifier)
  over:
    self: OVER (OverClause)
    window:
      self: named_window (Identifier)
  rparen:
    self: ) (Symbol)
- self: ( (CallingFunction)
  comma:
    self: , (Symbol)
  func:
    self: SUM (Identifier)
  over:
    self: OVER (OverClause)
    window:
      self: ( (WindowSpecification)
      name:
        self: named_window (Identifier)
      rparen:
        self: ) (Symbol)
  rparen:
    self: ) (Symbol)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
SELECT last_value(col3) OVER (c ROWS BETWEEN 2 PRECEDING AND 2 FOLLOWING)
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: ( (CallingFunction)
  args:
  - self: col3 (Identifier)
  func:
    self: last_value (Identifier)
  over:
    self: OVER (OverClause)
    window:
      self: ( (WindowSpecification)
      frame:
        self: ROWS (WindowFrameClause)
        and:
          self: AND (Keyword)
        between:
          self: BETWEEN (Keyword)
        end:
        - self: 2 (NumericLiteral)
        - self: FOLLOWING (Keyword)
        start:
        - self: 2 (NumericLiteral)
        - self: PRECEDING (Keyword)
      name:
        self: c (Identifier)
      rparen:
        self: ) (Symbol)
  rparen:
    self: ) (Symbol)
",
            0,
        )),
        // chained function call
        Box::new(SuccessTestCase::new(
            "\
SELECT (col).UPPER().LOWER()
 ",
            "\
self: SELECT (SelectStatement)
exprs:
- self: . (FunctionChain)
  left:
    self: . (FunctionChain)
    left:
      self: ( (GroupedExpr)
      expr:
        self: col (Identifier)
      rparen:
        self: ) (Symbol)
    right:
      self: ( (CallingFunction)
      func:
        self: UPPER (Identifier)
      rparen:
        self: ) (Symbol)
  right:
    self: ( (CallingFunction)
    func:
      self: LOWER (Identifier)
    rparen:
      self: ) (Symbol)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
SELECT
  TIMESTAMP '2024-01-01'.TIMESTAMP_TRUNC(MONTH),
  CASE WHEN TRUE THEN TIMESTAMP '2024-01-01' END.TIMESTAMP_TRUNC(MONTH),
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: . (FunctionChain)
  comma:
    self: , (Symbol)
  left:
    self: TIMESTAMP (UnaryOperator)
    right:
      self: '2024-01-01' (StringLiteral)
  right:
    self: ( (CallingFunction)
    args:
    - self: MONTH (Identifier)
    func:
      self: TIMESTAMP_TRUNC (Identifier)
    rparen:
      self: ) (Symbol)
- self: . (FunctionChain)
  comma:
    self: , (Symbol)
  left:
    self: CASE (CaseExpr)
    arms:
    - self: WHEN (CaseExprArm)
      expr:
        self: TRUE (BooleanLiteral)
      result:
        self: TIMESTAMP (UnaryOperator)
        right:
          self: '2024-01-01' (StringLiteral)
      then:
        self: THEN (Keyword)
    end:
      self: END (Keyword)
  right:
    self: ( (CallingFunction)
    args:
    - self: MONTH (Identifier)
    func:
      self: TIMESTAMP_TRUNC (Identifier)
    rparen:
      self: ) (Symbol)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
SELECT (col).(safe.left)(3)
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: . (FunctionChain)
  left:
    self: ( (GroupedExpr)
    expr:
      self: col (Identifier)
    rparen:
      self: ) (Symbol)
  right:
    self: ( (CallingFunction)
    args:
    - self: 3 (NumericLiteral)
    func:
      self: ( (GroupedExpr)
      expr:
        self: . (DotOperator)
        left:
          self: safe (Identifier)
        right:
          self: left (Identifier)
      rparen:
        self: ) (Symbol)
    rparen:
      self: ) (Symbol)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
SELECT STRUCT('a' AS b).TO_JSON().b.JSON_VALUE().CONCAT('c')
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: . (FunctionChain)
  left:
    self: . (FunctionChain)
    left:
      self: . (DotOperator)
      left:
        self: . (FunctionChain)
        left:
          self: ( (StructLiteral)
          exprs:
          - self: 'a' (StringLiteral)
            alias:
              self: b (Identifier)
            as:
              self: AS (Keyword)
          rparen:
            self: ) (Symbol)
          type:
            self: STRUCT (Type)
        right:
          self: ( (CallingFunction)
          func:
            self: TO_JSON (Identifier)
          rparen:
            self: ) (Symbol)
      right:
        self: b (Identifier)
    right:
      self: ( (CallingFunction)
      func:
        self: JSON_VALUE (Identifier)
      rparen:
        self: ) (Symbol)
  right:
    self: ( (CallingFunction)
    args:
    - self: 'c' (StringLiteral)
    func:
      self: CONCAT (Identifier)
    rparen:
      self: ) (Symbol)
",
            0,
        )),
        // ----- WITH expression -----
        Box::new(SuccessTestCase::new(
            "\
SELECT WITH(a AS 'a', UPPER(a))
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: ( (CallingFunction)
  args:
  - self: a (Identifier)
    alias:
      self: 'a' (StringLiteral)
    as:
      self: AS (Keyword)
    comma:
      self: , (Symbol)
  - self: ( (CallingFunction)
    args:
    - self: a (Identifier)
    func:
      self: UPPER (Identifier)
    rparen:
      self: ) (Symbol)
  func:
    self: WITH (Identifier)
  rparen:
    self: ) (Symbol)
",
            0,
        )),
        // ----- template -----
        Box::new(SuccessTestCase::new(
            "\
SELECT
  {{variable}},
  {variable},
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: {{variable}} (Template)
  comma:
    self: , (Symbol)
- self: {variable} (Template)
  comma:
    self: , (Symbol)
",
            0,
        )),
    ];
    for t in test_cases {
        t.test();
    }
}
