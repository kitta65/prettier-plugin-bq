use super::*;

#[test]
fn test_parse_code_script() {
    let test_cases = vec![
        // ----- DECLARE statement -----
        Box::new(SuccessTestCase::new(
            "\
DECLARE x INT64;
",
            "\
self: DECLARE (DeclareStatement)
idents:
- self: x (Identifier)
semicolon:
  self: ; (Symbol)
variable_type:
  self: INT64 (Type)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
DECLARE x,y DEFAULT 1;
",
            "\
self: DECLARE (DeclareStatement)
default:
  self: DEFAULT (KeywordWithExpr)
  expr:
    self: 1 (NumericLiteral)
idents:
- self: x (Identifier)
  comma:
    self: , (Symbol)
- self: y (Identifier)
semicolon:
  self: ; (Symbol)
",
            0,
        )),
        // parameterized data types
        Box::new(SuccessTestCase::new(
            "\
DECLARE x NUMERIC(10) DEFAULT 12345
",
            "\
self: DECLARE (DeclareStatement)
default:
  self: DEFAULT (KeywordWithExpr)
  expr:
    self: 12345 (NumericLiteral)
idents:
- self: x (Identifier)
variable_type:
  self: NUMERIC (Type)
  parameter:
    self: ( (GroupedExprs)
    exprs:
    - self: 10 (NumericLiteral)
    rparen:
      self: ) (Symbol)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
DECLARE x BIGNUMERIC(5, 2)
",
            "\
self: DECLARE (DeclareStatement)
idents:
- self: x (Identifier)
variable_type:
  self: BIGNUMERIC (Type)
  parameter:
    self: ( (GroupedExprs)
    exprs:
    - self: 5 (NumericLiteral)
      comma:
        self: , (Symbol)
    - self: 2 (NumericLiteral)
    rparen:
      self: ) (Symbol)
",
            0,
        )),
        // ----- SET statement -----
        Box::new(SuccessTestCase::new(
            "\
SET x = 5
",
            "\
self: SET (SetStatement)
expr:
  self: = (BinaryOperator)
  left:
    self: x (Identifier)
  right:
    self: 5 (NumericLiteral)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
SET (x,y) = (1,2)
",
            // NOTE (x, y) is not GroupedExpr but StructLiteral
            "\
self: SET (SetStatement)
expr:
  self: = (BinaryOperator)
  left:
    self: ( (StructLiteral)
    exprs:
    - self: x (Identifier)
      comma:
        self: , (Symbol)
    - self: y (Identifier)
    rparen:
      self: ) (Symbol)
  right:
    self: ( (StructLiteral)
    exprs:
    - self: 1 (NumericLiteral)
      comma:
        self: , (Symbol)
    - self: 2 (NumericLiteral)
    rparen:
      self: ) (Symbol)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
SET (x, y) = (SELECT AS STRUCT 1,2)
",
            "\
self: SET (SetStatement)
expr:
  self: = (BinaryOperator)
  left:
    self: ( (StructLiteral)
    exprs:
    - self: x (Identifier)
      comma:
        self: , (Symbol)
    - self: y (Identifier)
    rparen:
      self: ) (Symbol)
  right:
    self: ( (GroupedStatement)
    rparen:
      self: ) (Symbol)
    stmt:
      self: SELECT (SelectStatement)
      as_struct_or_value:
      - self: AS (Keyword)
      - self: STRUCT (Keyword)
      exprs:
      - self: 1 (NumericLiteral)
        comma:
          self: , (Symbol)
      - self: 2 (NumericLiteral)
",
            0,
        )),
        // ----- EXECUTE statement -----
        Box::new(SuccessTestCase::new(
            "\
EXECUTE IMMEDIATE 'SELECT 1'
",
            "\
self: EXECUTE (ExecuteStatement)
immediate:
  self: IMMEDIATE (Keyword)
sql_expr:
  self: 'SELECT 1' (StringLiteral)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
EXECUTE IMMEDIATE 'SELECT ?' USING 1;
",
            "\
self: EXECUTE (ExecuteStatement)
immediate:
  self: IMMEDIATE (Keyword)
semicolon:
  self: ; (Symbol)
sql_expr:
  self: 'SELECT ?' (StringLiteral)
using:
  self: USING (KeywordWithExprs)
  exprs:
  - self: 1 (NumericLiteral)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
EXECUTE IMMEDIATE 'SELECT ?,?' INTO x, y USING 1, 2;
",
            "\
self: EXECUTE (ExecuteStatement)
immediate:
  self: IMMEDIATE (Keyword)
into:
  self: INTO (KeywordWithExprs)
  exprs:
  - self: x (Identifier)
    comma:
      self: , (Symbol)
  - self: y (Identifier)
semicolon:
  self: ; (Symbol)
sql_expr:
  self: 'SELECT ?,?' (StringLiteral)
using:
  self: USING (KeywordWithExprs)
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
EXECUTE IMMEDIATE 'SELECT @x' INTO x USING 1 AS x;
",
            "\
self: EXECUTE (ExecuteStatement)
immediate:
  self: IMMEDIATE (Keyword)
into:
  self: INTO (KeywordWithExprs)
  exprs:
  - self: x (Identifier)
semicolon:
  self: ; (Symbol)
sql_expr:
  self: 'SELECT @x' (StringLiteral)
using:
  self: USING (KeywordWithExprs)
  exprs:
  - self: 1 (NumericLiteral)
    alias:
      self: x (Identifier)
    as:
      self: AS (Keyword)
",
            0,
        )),
        // ----- BEGIN statement -----
        Box::new(SuccessTestCase::new(
            "\
BEGIN
  SELECT 1;
  SELECT 2;
END;
",
            "\
self: BEGIN (BeginStatement)
end:
  self: END (Keyword)
semicolon:
  self: ; (Symbol)
stmts:
- self: SELECT (SelectStatement)
  exprs:
  - self: 1 (NumericLiteral)
  semicolon:
    self: ; (Symbol)
- self: SELECT (SelectStatement)
  exprs:
  - self: 2 (NumericLiteral)
  semicolon:
    self: ; (Symbol)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
BEGIN
  SELECT 1;
EXCEPTION WHEN ERROR THEN
  SELECT 2;
END;
",
            "\
self: BEGIN (BeginStatement)
end:
  self: END (Keyword)
exception_when_error:
- self: EXCEPTION (Keyword)
- self: WHEN (Keyword)
- self: ERROR (Keyword)
semicolon:
  self: ; (Symbol)
stmts:
- self: SELECT (SelectStatement)
  exprs:
  - self: 1 (NumericLiteral)
  semicolon:
    self: ; (Symbol)
then:
  self: THEN (KeywordWithStatements)
  stmts:
  - self: SELECT (SelectStatement)
    exprs:
    - self: 2 (NumericLiteral)
    semicolon:
      self: ; (Symbol)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
BEGIN EXCEPTiON WHEN ERROR THEN END;
",
            "\
self: BEGIN (BeginStatement)
end:
  self: END (Keyword)
exception_when_error:
- self: EXCEPTiON (Keyword)
- self: WHEN (Keyword)
- self: ERROR (Keyword)
semicolon:
  self: ; (Symbol)
then:
  self: THEN (KeywordWithStatements)
  stmts: []
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
label: BEGIN
  SELECT 1;
END;
",
            "\
self: BEGIN (BeginStatement)
colon:
  self: : (Symbol)
end:
  self: END (Keyword)
leading_label:
  self: label (Identifier)
semicolon:
  self: ; (Symbol)
stmts:
- self: SELECT (SelectStatement)
  exprs:
  - self: 1 (NumericLiteral)
  semicolon:
    self: ; (Symbol)
",
            0,
        )),
        // ----- CASE statement -----
        Box::new(SuccessTestCase::new(
            "\
CASE WHEN true THEN SELECT 1; END CASE;
",
            "\
self: CASE (CaseStatement)
arms:
- self: WHEN (CaseStatementArm)
  expr:
    self: true (BooleanLiteral)
  stmts:
  - self: SELECT (SelectStatement)
    exprs:
    - self: 1 (NumericLiteral)
    semicolon:
      self: ; (Symbol)
  then:
    self: THEN (Keyword)
end_case:
- self: END (Keyword)
- self: CASE (Keyword)
semicolon:
  self: ; (Symbol)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
CASE
  WHEN true THEN
    SELECT 1;
    SELECT 2;
  WHEN true THEN SELECT 3;
END CASE;
",
            "\
self: CASE (CaseStatement)
arms:
- self: WHEN (CaseStatementArm)
  expr:
    self: true (BooleanLiteral)
  stmts:
  - self: SELECT (SelectStatement)
    exprs:
    - self: 1 (NumericLiteral)
    semicolon:
      self: ; (Symbol)
  - self: SELECT (SelectStatement)
    exprs:
    - self: 2 (NumericLiteral)
    semicolon:
      self: ; (Symbol)
  then:
    self: THEN (Keyword)
- self: WHEN (CaseStatementArm)
  expr:
    self: true (BooleanLiteral)
  stmts:
  - self: SELECT (SelectStatement)
    exprs:
    - self: 3 (NumericLiteral)
    semicolon:
      self: ; (Symbol)
  then:
    self: THEN (Keyword)
end_case:
- self: END (Keyword)
- self: CASE (Keyword)
semicolon:
  self: ; (Symbol)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
CASE expr
  WHEN 'x' THEN SELECT 1;
  ELSE SELECT 2;
END CASE;
",
            "\
self: CASE (CaseStatement)
arms:
- self: WHEN (CaseStatementArm)
  expr:
    self: 'x' (StringLiteral)
  stmts:
  - self: SELECT (SelectStatement)
    exprs:
    - self: 1 (NumericLiteral)
    semicolon:
      self: ; (Symbol)
  then:
    self: THEN (Keyword)
- self: ELSE (CaseStatementArm)
  stmts:
  - self: SELECT (SelectStatement)
    exprs:
    - self: 2 (NumericLiteral)
    semicolon:
      self: ; (Symbol)
end_case:
- self: END (Keyword)
- self: CASE (Keyword)
expr:
  self: expr (Identifier)
semicolon:
  self: ; (Symbol)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
CASE WHEN true THEN ELSE END CASE
",
            "\
self: CASE (CaseStatement)
arms:
- self: WHEN (CaseStatementArm)
  expr:
    self: true (BooleanLiteral)
  stmts: []
  then:
    self: THEN (Keyword)
- self: ELSE (CaseStatementArm)
  stmts: []
end_case:
- self: END (Keyword)
- self: CASE (Keyword)
",
            0,
        )),
        // ----- IF statement -----
        Box::new(SuccessTestCase::new(
            "\
IF TRUE THEN END IF;
",
            "\
self: IF (IfStatement)
condition:
  self: TRUE (BooleanLiteral)
end_if:
- self: END (Keyword)
- self: IF (Keyword)
semicolon:
  self: ; (Symbol)
then:
  self: THEN (KeywordWithStatements)
  stmts: []
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
IF TRUE THEN
  SELECT 1;
  SELECT 2;
END IF;
",
            "\
self: IF (IfStatement)
condition:
  self: TRUE (BooleanLiteral)
end_if:
- self: END (Keyword)
- self: IF (Keyword)
semicolon:
  self: ; (Symbol)
then:
  self: THEN (KeywordWithStatements)
  stmts:
  - self: SELECT (SelectStatement)
    exprs:
    - self: 1 (NumericLiteral)
    semicolon:
      self: ; (Symbol)
  - self: SELECT (SelectStatement)
    exprs:
    - self: 2 (NumericLiteral)
    semicolon:
      self: ; (Symbol)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
IF TRUE THEN
  SELECT 1;
ELSEIF TRUE THEN
END IF;
",
            "\
self: IF (IfStatement)
condition:
  self: TRUE (BooleanLiteral)
elseifs:
- self: ELSEIF (ElseIfClause)
  condition:
    self: TRUE (BooleanLiteral)
  then:
    self: THEN (KeywordWithStatements)
    stmts: []
end_if:
- self: END (Keyword)
- self: IF (Keyword)
semicolon:
  self: ; (Symbol)
then:
  self: THEN (KeywordWithStatements)
  stmts:
  - self: SELECT (SelectStatement)
    exprs:
    - self: 1 (NumericLiteral)
    semicolon:
      self: ; (Symbol)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
IF TRUE THEN
ELSEIF TRUE THEN
  SELECT 1;
ELSEIF TRUE THEN
  SELECT 2;
  SELECT 3;
ELSE
END IF;
",
            "\
self: IF (IfStatement)
condition:
  self: TRUE (BooleanLiteral)
else:
  self: ELSE (KeywordWithStatements)
  stmts: []
elseifs:
- self: ELSEIF (ElseIfClause)
  condition:
    self: TRUE (BooleanLiteral)
  then:
    self: THEN (KeywordWithStatements)
    stmts:
    - self: SELECT (SelectStatement)
      exprs:
      - self: 1 (NumericLiteral)
      semicolon:
        self: ; (Symbol)
- self: ELSEIF (ElseIfClause)
  condition:
    self: TRUE (BooleanLiteral)
  then:
    self: THEN (KeywordWithStatements)
    stmts:
    - self: SELECT (SelectStatement)
      exprs:
      - self: 2 (NumericLiteral)
      semicolon:
        self: ; (Symbol)
    - self: SELECT (SelectStatement)
      exprs:
      - self: 3 (NumericLiteral)
      semicolon:
        self: ; (Symbol)
end_if:
- self: END (Keyword)
- self: IF (Keyword)
semicolon:
  self: ; (Symbol)
then:
  self: THEN (KeywordWithStatements)
  stmts: []
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
IF TRUE THEN
ELSE SELECT 1;
END IF;
",
            "\
self: IF (IfStatement)
condition:
  self: TRUE (BooleanLiteral)
else:
  self: ELSE (KeywordWithStatements)
  stmts:
  - self: SELECT (SelectStatement)
    exprs:
    - self: 1 (NumericLiteral)
    semicolon:
      self: ; (Symbol)
end_if:
- self: END (Keyword)
- self: IF (Keyword)
semicolon:
  self: ; (Symbol)
then:
  self: THEN (KeywordWithStatements)
  stmts: []
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
IF TRUE THEN
ELSE
  SELECT 1;
  SELECT 2;
END IF;
",
            "\
self: IF (IfStatement)
condition:
  self: TRUE (BooleanLiteral)
else:
  self: ELSE (KeywordWithStatements)
  stmts:
  - self: SELECT (SelectStatement)
    exprs:
    - self: 1 (NumericLiteral)
    semicolon:
      self: ; (Symbol)
  - self: SELECT (SelectStatement)
    exprs:
    - self: 2 (NumericLiteral)
    semicolon:
      self: ; (Symbol)
end_if:
- self: END (Keyword)
- self: IF (Keyword)
semicolon:
  self: ; (Symbol)
then:
  self: THEN (KeywordWithStatements)
  stmts: []
",
            0,
        )),
        // ----- LOOP statement -----
        Box::new(SuccessTestCase::new(
            "\
LOOP
  SELECT 1;
END LOOP;
",
            "\
self: LOOP (LoopStatement)
end_loop:
- self: END (Keyword)
- self: LOOP (Keyword)
semicolon:
  self: ; (Symbol)
stmts:
- self: SELECT (SelectStatement)
  exprs:
  - self: 1 (NumericLiteral)
  semicolon:
    self: ; (Symbol)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
LOOP SELECT 1; BREAK; END LOOP;
",
            "\
self: LOOP (LoopStatement)
end_loop:
- self: END (Keyword)
- self: LOOP (Keyword)
semicolon:
  self: ; (Symbol)
stmts:
- self: SELECT (SelectStatement)
  exprs:
  - self: 1 (NumericLiteral)
  semicolon:
    self: ; (Symbol)
- self: BREAK (BreakContinueStatement)
  semicolon:
    self: ; (Symbol)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
label: loop
  SELECT 1;
  BREAK label;
END loop;
",
            "\
self: loop (LoopStatement)
colon:
  self: : (Symbol)
end_loop:
- self: END (Keyword)
- self: loop (Keyword)
leading_label:
  self: label (Identifier)
semicolon:
  self: ; (Symbol)
stmts:
- self: SELECT (SelectStatement)
  exprs:
  - self: 1 (NumericLiteral)
  semicolon:
    self: ; (Symbol)
- self: BREAK (BreakContinueStatement)
  label:
    self: label (Identifier)
  semicolon:
    self: ; (Symbol)
",
            0,
        )),
        // ----- LOOP statement -----
        Box::new(SuccessTestCase::new(
            "\
REPEAT
  SELECT 1;
UNTIL true
END REPEAT;
",
            "\
self: REPEAT (RepeatStatement)
end_repeat:
- self: END (Keyword)
- self: REPEAT (Keyword)
semicolon:
  self: ; (Symbol)
stmts:
- self: SELECT (SelectStatement)
  exprs:
  - self: 1 (NumericLiteral)
  semicolon:
    self: ; (Symbol)
until:
  self: UNTIL (KeywordWithExpr)
  expr:
    self: true (BooleanLiteral)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
label: REPEAT
  SELECT 1;
  SELECT 2;
UNTIL true
END REPEAT label;
",
            "\
self: REPEAT (RepeatStatement)
colon:
  self: : (Symbol)
end_repeat:
- self: END (Keyword)
- self: REPEAT (Keyword)
leading_label:
  self: label (Identifier)
semicolon:
  self: ; (Symbol)
stmts:
- self: SELECT (SelectStatement)
  exprs:
  - self: 1 (NumericLiteral)
  semicolon:
    self: ; (Symbol)
- self: SELECT (SelectStatement)
  exprs:
  - self: 2 (NumericLiteral)
  semicolon:
    self: ; (Symbol)
trailing_label:
  self: label (Identifier)
until:
  self: UNTIL (KeywordWithExpr)
  expr:
    self: true (BooleanLiteral)
",
            0,
        )),
        // ----- WHILE statement -----
        Box::new(SuccessTestCase::new(
            "\
WHILE TRUE DO
  SELECT 1;
END WHILE;
",
            "\
self: WHILE (WhileStatement)
condition:
  self: TRUE (BooleanLiteral)
do:
  self: DO (KeywordWithStatements)
  stmts:
  - self: SELECT (SelectStatement)
    exprs:
    - self: 1 (NumericLiteral)
    semicolon:
      self: ; (Symbol)
end_while:
- self: END (Keyword)
- self: WHILE (Keyword)
semicolon:
  self: ; (Symbol)
",
            0,
        )),
        // ----- BREAK CONTINUE statement -----
        Box::new(SuccessTestCase::new(
            "\
WHILE TRUE DO
  ITERATE;
  LEAVE;
  CONTINUE;
END WHILE;
",
            "\
self: WHILE (WhileStatement)
condition:
  self: TRUE (BooleanLiteral)
do:
  self: DO (KeywordWithStatements)
  stmts:
  - self: ITERATE (BreakContinueStatement)
    semicolon:
      self: ; (Symbol)
  - self: LEAVE (BreakContinueStatement)
    semicolon:
      self: ; (Symbol)
  - self: CONTINUE (BreakContinueStatement)
    semicolon:
      self: ; (Symbol)
end_while:
- self: END (Keyword)
- self: WHILE (Keyword)
semicolon:
  self: ; (Symbol)
",
            0,
        )),
        // ----- FOR statement -----
        Box::new(SuccessTestCase::new(
            "\
FOR record IN (SELECT 1) DO
  SELECT record;
END FOR
",
            "\
self: FOR (ForStatement)
do:
  self: DO (KeywordWithStatements)
  stmts:
  - self: SELECT (SelectStatement)
    exprs:
    - self: record (Identifier)
    semicolon:
      self: ; (Symbol)
end_for:
- self: END (Keyword)
- self: FOR (Keyword)
ident:
  self: record (Identifier)
in:
  self: IN (KeywordWithGroupedXXX)
  group:
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
label: FOR record IN (SELECT 1) DO
  BREAK label;
END FOR label
",
            "\
self: FOR (ForStatement)
colon:
  self: : (Symbol)
do:
  self: DO (KeywordWithStatements)
  stmts:
  - self: BREAK (BreakContinueStatement)
    label:
      self: label (Identifier)
    semicolon:
      self: ; (Symbol)
end_for:
- self: END (Keyword)
- self: FOR (Keyword)
ident:
  self: record (Identifier)
in:
  self: IN (KeywordWithGroupedXXX)
  group:
    self: ( (GroupedStatement)
    rparen:
      self: ) (Symbol)
    stmt:
      self: SELECT (SelectStatement)
      exprs:
      - self: 1 (NumericLiteral)
leading_label:
  self: label (Identifier)
trailing_label:
  self: label (Identifier)
",
            0,
        )),
        // ----- transaction statement -----
        Box::new(SuccessTestCase::new(
            "\
BEGIN
  BEGIN;
  ROLLBACK TRANSACTION;
END
",
            "\
self: BEGIN (BeginStatement)
end:
  self: END (Keyword)
stmts:
- self: BEGIN (TransactionStatement)
  semicolon:
    self: ; (Symbol)
- self: ROLLBACK (TransactionStatement)
  semicolon:
    self: ; (Symbol)
  transaction:
    self: TRANSACTION (Keyword)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
BEGIN
",
            "\
self: BEGIN (TransactionStatement)
",
            0,
        )),
        // ----- RAISE statement -----
        Box::new(SuccessTestCase::new(
            "\
RAISE;
",
            "\
self: RAISE (RaiseStatement)
semicolon:
  self: ; (Symbol)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
RAISE USING MESSAGE = 'error';
",
            "\
self: RAISE (RaiseStatement)
semicolon:
  self: ; (Symbol)
using:
  self: USING (KeywordWithExpr)
  expr:
    self: = (BinaryOperator)
    left:
      self: MESSAGE (Identifier)
    right:
      self: 'error' (StringLiteral)
",
            0,
        )),
        // ----- CALL statement -----
        Box::new(SuccessTestCase::new(
            "\
CALL mydataset.myprocedure(1);
",
            "\
self: CALL (CallStatement)
procedure:
  self: ( (CallingFunction)
  args:
  - self: 1 (NumericLiteral)
  func:
    self: . (DotOperator)
    left:
      self: mydataset (Identifier)
    right:
      self: myprocedure (Identifier)
  rparen:
    self: ) (Symbol)
semicolon:
  self: ; (Symbol)
",
            0,
        )),
        // ----- system variables (@@xxx) -----
        Box::new(SuccessTestCase::new(
            "\
BEGIN
  BEGIN
    SELECT 1;
  EXCEPTION WHEN ERROR THEN
    RAISE USING MESSAGE = 'error';
  END;
EXCEPTION WHEN ERROR THEN
  SELECT @@error.message;
END;
",
            "\
self: BEGIN (BeginStatement)
end:
  self: END (Keyword)
exception_when_error:
- self: EXCEPTION (Keyword)
- self: WHEN (Keyword)
- self: ERROR (Keyword)
semicolon:
  self: ; (Symbol)
stmts:
- self: BEGIN (BeginStatement)
  end:
    self: END (Keyword)
  exception_when_error:
  - self: EXCEPTION (Keyword)
  - self: WHEN (Keyword)
  - self: ERROR (Keyword)
  semicolon:
    self: ; (Symbol)
  stmts:
  - self: SELECT (SelectStatement)
    exprs:
    - self: 1 (NumericLiteral)
    semicolon:
      self: ; (Symbol)
  then:
    self: THEN (KeywordWithStatements)
    stmts:
    - self: RAISE (RaiseStatement)
      semicolon:
        self: ; (Symbol)
      using:
        self: USING (KeywordWithExpr)
        expr:
          self: = (BinaryOperator)
          left:
            self: MESSAGE (Identifier)
          right:
            self: 'error' (StringLiteral)
then:
  self: THEN (KeywordWithStatements)
  stmts:
  - self: SELECT (SelectStatement)
    exprs:
    - self: . (DotOperator)
      left:
        self: @@error (Parameter)
      right:
        self: message (Identifier)
    semicolon:
      self: ; (Symbol)
",
            0,
        )),
    ];
    for t in test_cases {
        t.test();
    }
}
