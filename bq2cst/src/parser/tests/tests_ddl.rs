use super::*;

#[test]
fn test_parse_code_ddl() {
    let test_cases: Vec<Box<dyn TestCase>> = vec![
        // ----- CREATE SCHEMA statement -----
        Box::new(SuccessTestCase::new(
            "\
CREATE SCHEMA dataset_name;
",
            "\
self: CREATE (CreateSchemaStatement)
ident:
  self: dataset_name (Identifier)
semicolon:
  self: ; (Symbol)
what:
  self: SCHEMA (Keyword)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
CREATE SCHEMA IF NOT EXISTS project_name.dataset_name OPTIONS();
",
            "\
self: CREATE (CreateSchemaStatement)
ident:
  self: . (DotOperator)
  left:
    self: project_name (Identifier)
  right:
    self: dataset_name (Identifier)
if_not_exists:
- self: IF (Keyword)
- self: NOT (Keyword)
- self: EXISTS (Keyword)
options:
  self: OPTIONS (KeywordWithGroupedXXX)
  group:
    self: ( (GroupedExprs)
    rparen:
      self: ) (Symbol)
semicolon:
  self: ; (Symbol)
what:
  self: SCHEMA (Keyword)
",
            0,
        )),
        Box::new(ErrorTestCase::new(
            "\
CREATE SCHEEMAA IF NOT EXISTS dataset_name;
",
            1,
            1,
        )),
        Box::new(SuccessTestCase::new(
            "\
CREATE SCHEMA dataset_name DEFAULT COLLATE 'und:ci'
",
            "\
self: CREATE (CreateSchemaStatement)
default_collate:
  self: DEFAULT (KeywordSequence)
  next_keyword:
    self: COLLATE (KeywordWithExpr)
    expr:
      self: 'und:ci' (StringLiteral)
ident:
  self: dataset_name (Identifier)
what:
  self: SCHEMA (Keyword)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
CREATE EXTERNAL SCHEMA dataset_name
WITH CONNECTION connection_name
",
            "\
self: CREATE (CreateSchemaStatement)
external:
  self: EXTERNAL (Keyword)
ident:
  self: dataset_name (Identifier)
what:
  self: SCHEMA (Keyword)
with_connection:
  self: WITH (KeywordSequence)
  next_keyword:
    self: CONNECTION (KeywordWithExpr)
    expr:
      self: connection_name (Identifier)
",
            0,
        )),
        // ----- CREATE SEARCH INDEX statement -----
        Box::new(SuccessTestCase::new(
            "\
CREATE SEARCH INDEX new_index ON tablename(ALL COLUMNS);
",
            "\
self: CREATE (CreateIndexStatement)
column_group:
  self: ( (GroupedExpr)
  expr:
    self: ALL (KeywordSequence)
    next_keyword:
      self: COLUMNS (Keyword)
  rparen:
    self: ) (Symbol)
ident:
  self: new_index (Identifier)
on:
  self: ON (Keyword)
semicolon:
  self: ; (Symbol)
tablename:
  self: tablename (Identifier)
what:
  self: SEARCH (KeywordSequence)
  next_keyword:
    self: INDEX (Keyword)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
CREATE SEARCH INDEX IF NOT EXISTS new_index
ON tablename(a, b)
",
            "\
self: CREATE (CreateIndexStatement)
column_group:
  self: ( (GroupedExprs)
  exprs:
  - self: a (Identifier)
    comma:
      self: , (Symbol)
  - self: b (Identifier)
  rparen:
    self: ) (Symbol)
ident:
  self: new_index (Identifier)
if_not_exists:
- self: IF (Keyword)
- self: NOT (Keyword)
- self: EXISTS (Keyword)
on:
  self: ON (Keyword)
tablename:
  self: tablename (Identifier)
what:
  self: SEARCH (KeywordSequence)
  next_keyword:
    self: INDEX (Keyword)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
CREATE OR REPLACE VECTOR INDEX new_index ON tablename(col)
STORING(a, b, c)
OPTIONS(dummy='dummy')
",
            "\
self: CREATE (CreateIndexStatement)
column_group:
  self: ( (GroupedExprs)
  exprs:
  - self: col (Identifier)
  rparen:
    self: ) (Symbol)
ident:
  self: new_index (Identifier)
on:
  self: ON (Keyword)
options:
  self: OPTIONS (KeywordWithGroupedXXX)
  group:
    self: ( (GroupedExprs)
    exprs:
    - self: = (BinaryOperator)
      left:
        self: dummy (Identifier)
      right:
        self: 'dummy' (StringLiteral)
    rparen:
      self: ) (Symbol)
or_replace:
- self: OR (Keyword)
- self: REPLACE (Keyword)
storing:
  self: STORING (KeywordWithGroupedXXX)
  group:
    self: ( (GroupedExprs)
    exprs:
    - self: a (Identifier)
      comma:
        self: , (Symbol)
    - self: b (Identifier)
      comma:
        self: , (Symbol)
    - self: c (Identifier)
    rparen:
      self: ) (Symbol)
tablename:
  self: tablename (Identifier)
what:
  self: VECTOR (KeywordSequence)
  next_keyword:
    self: INDEX (Keyword)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
CREATE VECTOR INDEX new_index
ON tablename(col)
PARTITION BY foo
OPTIONS(dummy='dummy')
",
            "\
self: CREATE (CreateIndexStatement)
column_group:
  self: ( (GroupedExprs)
  exprs:
  - self: col (Identifier)
  rparen:
    self: ) (Symbol)
ident:
  self: new_index (Identifier)
on:
  self: ON (Keyword)
options:
  self: OPTIONS (KeywordWithGroupedXXX)
  group:
    self: ( (GroupedExprs)
    exprs:
    - self: = (BinaryOperator)
      left:
        self: dummy (Identifier)
      right:
        self: 'dummy' (StringLiteral)
    rparen:
      self: ) (Symbol)
partitionby:
  self: PARTITION (XXXByExprs)
  by:
    self: BY (Keyword)
  exprs:
  - self: foo (Identifier)
tablename:
  self: tablename (Identifier)
what:
  self: VECTOR (KeywordSequence)
  next_keyword:
    self: INDEX (Keyword)
",
            0,
        )),
        // ----- CREATE TABLE statement -----
        Box::new(SuccessTestCase::new(
            "\
CREATE TABLE example (x int64);
",
            "\
self: CREATE (CreateTableStatement)
column_schema_group:
  self: ( (GroupedTypeDeclarationOrConstraints)
  declarations:
  - self: x (TypeDeclaration)
    type:
      self: int64 (Type)
  rparen:
    self: ) (Symbol)
ident:
  self: example (Identifier)
semicolon:
  self: ; (Symbol)
what:
  self: TABLE (Keyword)
",
            0,
        )),
        // NOTE This SQL is currently invalid.
        Box::new(SuccessTestCase::new(
            "\
CREATE TABLE this-is-project-name.dataset.table-123 (x int64);
",
            "\
self: CREATE (CreateTableStatement)
column_schema_group:
  self: ( (GroupedTypeDeclarationOrConstraints)
  declarations:
  - self: x (TypeDeclaration)
    type:
      self: int64 (Type)
  rparen:
    self: ) (Symbol)
ident:
  self: . (DotOperator)
  left:
    self: . (DotOperator)
    left:
      self: this (MultiTokenIdentifier)
      trailing_idents:
      - self: - (Identifier)
      - self: is (Identifier)
      - self: - (Identifier)
      - self: project (Identifier)
      - self: - (Identifier)
      - self: name (Identifier)
    right:
      self: dataset (Identifier)
  right:
    self: table (MultiTokenIdentifier)
    trailing_idents:
    - self: - (Identifier)
    - self: 123 (Identifier)
semicolon:
  self: ; (Symbol)
what:
  self: TABLE (Keyword)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
CREATE TEMP TABLE example (x INT64, y STRING(10));
",
            "\
self: CREATE (CreateTableStatement)
column_schema_group:
  self: ( (GroupedTypeDeclarationOrConstraints)
  declarations:
  - self: x (TypeDeclaration)
    comma:
      self: , (Symbol)
    type:
      self: INT64 (Type)
  - self: y (TypeDeclaration)
    type:
      self: STRING (Type)
      parameter:
        self: ( (GroupedExprs)
        exprs:
        - self: 10 (NumericLiteral)
        rparen:
          self: ) (Symbol)
  rparen:
    self: ) (Symbol)
ident:
  self: example (Identifier)
semicolon:
  self: ; (Symbol)
temp:
  self: TEMP (Keyword)
what:
  self: TABLE (Keyword)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
CREATE OR REPLACE TABLE dataset.example(x INT64 OPTIONS(description = 'dummy'))
PARTITION BY _PARTITIONDATE
OPTIONS(partition_expiration_days = 1);
",
            "\
self: CREATE (CreateTableStatement)
column_schema_group:
  self: ( (GroupedTypeDeclarationOrConstraints)
  declarations:
  - self: x (TypeDeclaration)
    type:
      self: INT64 (Type)
      options:
        self: OPTIONS (KeywordWithGroupedXXX)
        group:
          self: ( (GroupedExprs)
          exprs:
          - self: = (BinaryOperator)
            left:
              self: description (Identifier)
            right:
              self: 'dummy' (StringLiteral)
          rparen:
            self: ) (Symbol)
  rparen:
    self: ) (Symbol)
ident:
  self: . (DotOperator)
  left:
    self: dataset (Identifier)
  right:
    self: example (Identifier)
options:
  self: OPTIONS (KeywordWithGroupedXXX)
  group:
    self: ( (GroupedExprs)
    exprs:
    - self: = (BinaryOperator)
      left:
        self: partition_expiration_days (Identifier)
      right:
        self: 1 (NumericLiteral)
    rparen:
      self: ) (Symbol)
or_replace:
- self: OR (Keyword)
- self: REPLACE (Keyword)
partitionby:
  self: PARTITION (XXXByExprs)
  by:
    self: BY (Keyword)
  exprs:
  - self: _PARTITIONDATE (Identifier)
semicolon:
  self: ; (Symbol)
what:
  self: TABLE (Keyword)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
CREATE TABLE tablename (
  outer_col STRUCT<
    inner_col NUMERIC(5, 2) OPTIONS(rounding_mode = 'ROUND_HALF_EVEN')
  >
)
",
            "\
self: CREATE (CreateTableStatement)
column_schema_group:
  self: ( (GroupedTypeDeclarationOrConstraints)
  declarations:
  - self: outer_col (TypeDeclaration)
    type:
      self: STRUCT (Type)
      type_declaration:
        self: < (GroupedTypeDeclarationOrConstraints)
        declarations:
        - self: inner_col (TypeDeclaration)
          type:
            self: NUMERIC (Type)
            options:
              self: OPTIONS (KeywordWithGroupedXXX)
              group:
                self: ( (GroupedExprs)
                exprs:
                - self: = (BinaryOperator)
                  left:
                    self: rounding_mode (Identifier)
                  right:
                    self: 'ROUND_HALF_EVEN' (StringLiteral)
                rparen:
                  self: ) (Symbol)
            parameter:
              self: ( (GroupedExprs)
              exprs:
              - self: 5 (NumericLiteral)
                comma:
                  self: , (Symbol)
              - self: 2 (NumericLiteral)
              rparen:
                self: ) (Symbol)
        rparen:
          self: > (Symbol)
  rparen:
    self: ) (Symbol)
ident:
  self: tablename (Identifier)
what:
  self: TABLE (Keyword)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
CREATE TABLE IF NOT EXISTS example (x INT64 NOT NULL)
CLUSTER BY x
AS SELECT 1 UNION ALL SELECT 2;
",
            "\
self: CREATE (CreateTableStatement)
as:
  self: AS (KeywordWithStatement)
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
clusterby:
  self: CLUSTER (XXXByExprs)
  by:
    self: BY (Keyword)
  exprs:
  - self: x (Identifier)
column_schema_group:
  self: ( (GroupedTypeDeclarationOrConstraints)
  declarations:
  - self: x (TypeDeclaration)
    type:
      self: INT64 (Type)
      not_null:
      - self: NOT (Keyword)
      - self: NULL (Keyword)
  rparen:
    self: ) (Symbol)
ident:
  self: example (Identifier)
if_not_exists:
- self: IF (Keyword)
- self: NOT (Keyword)
- self: EXISTS (Keyword)
semicolon:
  self: ; (Symbol)
what:
  self: TABLE (Keyword)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
CREATE TABLE example (x STRING COLLATE 'und:ci' NOT NULL)
",
            "\
self: CREATE (CreateTableStatement)
column_schema_group:
  self: ( (GroupedTypeDeclarationOrConstraints)
  declarations:
  - self: x (TypeDeclaration)
    type:
      self: STRING (Type)
      collate:
        self: COLLATE (KeywordWithExpr)
        expr:
          self: 'und:ci' (StringLiteral)
      not_null:
      - self: NOT (Keyword)
      - self: NULL (Keyword)
  rparen:
    self: ) (Symbol)
ident:
  self: example (Identifier)
what:
  self: TABLE (Keyword)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
CREATE TABLE example (x STRING)
DEFAULT COLLATE 'und:ci'
",
            "\
self: CREATE (CreateTableStatement)
column_schema_group:
  self: ( (GroupedTypeDeclarationOrConstraints)
  declarations:
  - self: x (TypeDeclaration)
    type:
      self: STRING (Type)
  rparen:
    self: ) (Symbol)
default_collate:
  self: DEFAULT (KeywordSequence)
  next_keyword:
    self: COLLATE (KeywordWithExpr)
    expr:
      self: 'und:ci' (StringLiteral)
ident:
  self: example (Identifier)
what:
  self: TABLE (Keyword)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
CREATE TABLE example (x STRING DEFAULT 'hello')
",
            "\
self: CREATE (CreateTableStatement)
column_schema_group:
  self: ( (GroupedTypeDeclarationOrConstraints)
  declarations:
  - self: x (TypeDeclaration)
    type:
      self: STRING (Type)
      default:
        self: DEFAULT (KeywordWithExpr)
        expr:
          self: 'hello' (StringLiteral)
  rparen:
    self: ) (Symbol)
ident:
  self: example (Identifier)
what:
  self: TABLE (Keyword)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
CREATE TABLE example (
  x STRING,
  PRIMARY KEY (x),
  FOREIGN KEY (x) REFERENCES tablename(y) NOT ENFORCED,
  CONSTRAINT ident FOREIGN KEY (x)
)
",
            "\
self: CREATE (CreateTableStatement)
column_schema_group:
  self: ( (GroupedTypeDeclarationOrConstraints)
  declarations:
  - self: x (TypeDeclaration)
    comma:
      self: , (Symbol)
    type:
      self: STRING (Type)
  - self: PRIMARY (Constraint)
    columns:
      self: ( (GroupedExprs)
      exprs:
      - self: x (Identifier)
      rparen:
        self: ) (Symbol)
    comma:
      self: , (Symbol)
    key:
      self: KEY (Keyword)
  - self: FOREIGN (Constraint)
    columns:
      self: ( (GroupedExprs)
      exprs:
      - self: x (Identifier)
      rparen:
        self: ) (Symbol)
    comma:
      self: , (Symbol)
    enforced:
      self: NOT (KeywordSequence)
      next_keyword:
        self: ENFORCED (Keyword)
    key:
      self: KEY (Keyword)
    references:
      self: REFERENCES (KeywordWithExpr)
      expr:
        self: ( (CallingFunction)
        args:
        - self: y (Identifier)
        func:
          self: tablename (Identifier)
        rparen:
          self: ) (Symbol)
  - self: FOREIGN (Constraint)
    columns:
      self: ( (GroupedExprs)
      exprs:
      - self: x (Identifier)
      rparen:
        self: ) (Symbol)
    constraint:
      self: CONSTRAINT (Keyword)
    ident:
      self: ident (Identifier)
    key:
      self: KEY (Keyword)
  rparen:
    self: ) (Symbol)
ident:
  self: example (Identifier)
what:
  self: TABLE (Keyword)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
CREATE TABLE example (
  x STRING PRIMARY KEY NOT ENFORCED,
  y STRING REFERENCES tablename(col),
  z STRING CONSTRAINT ident REFERENCES tablename(col)
)
",
            "\
self: CREATE (CreateTableStatement)
column_schema_group:
  self: ( (GroupedTypeDeclarationOrConstraints)
  declarations:
  - self: x (TypeDeclaration)
    comma:
      self: , (Symbol)
    type:
      self: STRING (Type)
      enforced:
        self: NOT (KeywordSequence)
        next_keyword:
          self: ENFORCED (Keyword)
      primarykey:
        self: PRIMARY (KeywordSequence)
        next_keyword:
          self: KEY (Keyword)
  - self: y (TypeDeclaration)
    comma:
      self: , (Symbol)
    type:
      self: STRING (Type)
      references:
        self: REFERENCES (KeywordWithExpr)
        expr:
          self: ( (CallingFunction)
          args:
          - self: col (Identifier)
          func:
            self: tablename (Identifier)
          rparen:
            self: ) (Symbol)
  - self: z (TypeDeclaration)
    type:
      self: STRING (Type)
      constraint:
        self: CONSTRAINT (KeywordWithExpr)
        expr:
          self: ident (Identifier)
      references:
        self: REFERENCES (KeywordWithExpr)
        expr:
          self: ( (CallingFunction)
          args:
          - self: col (Identifier)
          func:
            self: tablename (Identifier)
          rparen:
            self: ) (Symbol)
  rparen:
    self: ) (Symbol)
ident:
  self: example (Identifier)
what:
  self: TABLE (Keyword)
",
            0,
        )),
        // LIKE
        Box::new(SuccessTestCase::new(
            "\
CREATE TABLE new_table LIKE source_table
",
            "\
self: CREATE (CreateTableStatement)
ident:
  self: new_table (Identifier)
like_or_copy:
  self: LIKE (Keyword)
source_table:
  self: source_table (Identifier)
what:
  self: TABLE (Keyword)
",
            0,
        )),
        // COPY
        Box::new(SuccessTestCase::new(
            "\
CREATE TABLE new_table COPY source_table
",
            "\
self: CREATE (CreateTableStatement)
ident:
  self: new_table (Identifier)
like_or_copy:
  self: COPY (Keyword)
source_table:
  self: source_table (Identifier)
what:
  self: TABLE (Keyword)
",
            0,
        )),
        // CLONE
        Box::new(SuccessTestCase::new(
            "\
CREATE TABLE from_snap CLONE snap
",
            "\
self: CREATE (CreateTableStatement)
clone:
  self: CLONE (KeywordWithExpr)
  expr:
    self: snap (Identifier)
ident:
  self: from_snap (Identifier)
what:
  self: TABLE (Keyword)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
CREATE TABLE snap
CLONE snap FOR SYSTEM_TIME AS OF CURRENT_TIMESTAMP
",
            "\
self: CREATE (CreateTableStatement)
clone:
  self: CLONE (KeywordWithExpr)
  expr:
    self: snap (Identifier)
    for_system_time_as_of:
      self: FOR (ForSystemTimeAsOfClause)
      expr:
        self: CURRENT_TIMESTAMP (Identifier)
      system_time_as_of:
      - self: SYSTEM_TIME (Keyword)
      - self: AS (Keyword)
      - self: OF (Keyword)
ident:
  self: snap (Identifier)
what:
  self: TABLE (Keyword)
",
            0,
        )),
        // SNAPSHOT
        Box::new(SuccessTestCase::new(
            "\
CREATE SNAPSHOT TABLE snap
CLONE source_table
",
            "\
self: CREATE (CreateTableStatement)
clone:
  self: CLONE (KeywordWithExpr)
  expr:
    self: source_table (Identifier)
ident:
  self: snap (Identifier)
snapshot:
  self: SNAPSHOT (Keyword)
what:
  self: TABLE (Keyword)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
CREATE SNAPSHOT TABLE snap
CLONE dataset.source_table FOR SYSTEM_TIME AS OF CURRENT_TIMESTAMP()
OPTIONS ()
",
            "\
self: CREATE (CreateTableStatement)
clone:
  self: CLONE (KeywordWithExpr)
  expr:
    self: . (DotOperator)
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
    left:
      self: dataset (Identifier)
    right:
      self: source_table (Identifier)
ident:
  self: snap (Identifier)
options:
  self: OPTIONS (KeywordWithGroupedXXX)
  group:
    self: ( (GroupedExprs)
    rparen:
      self: ) (Symbol)
snapshot:
  self: SNAPSHOT (Keyword)
what:
  self: TABLE (Keyword)
",
            0,
        )),
        // CLONE
        Box::new(SuccessTestCase::new(
            "\
CREATE TABLE clone
CLONE source_table
",
            "\
self: CREATE (CreateTableStatement)
clone:
  self: CLONE (KeywordWithExpr)
  expr:
    self: source_table (Identifier)
ident:
  self: clone (Identifier)
what:
  self: TABLE (Keyword)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
CREATE TABLE dataset.clone
CLONE dataset.source_table FOR SYSTEM_TIME AS OF CURRENT_TIMESTAMP()
OPTIONS ()
",
            "\
self: CREATE (CreateTableStatement)
clone:
  self: CLONE (KeywordWithExpr)
  expr:
    self: . (DotOperator)
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
    left:
      self: dataset (Identifier)
    right:
      self: source_table (Identifier)
ident:
  self: . (DotOperator)
  left:
    self: dataset (Identifier)
  right:
    self: clone (Identifier)
options:
  self: OPTIONS (KeywordWithGroupedXXX)
  group:
    self: ( (GroupedExprs)
    rparen:
      self: ) (Symbol)
what:
  self: TABLE (Keyword)
",
            0,
        )),
        // EXTERNAL
        Box::new(SuccessTestCase::new(
            "\
CREATE EXTERNAL TABLE dataset.new_table
WITH PARTITION COLUMNS
OPTIONS (
  uris = ['dummy'],
  format = csv
);
",
            "\
self: CREATE (CreateTableStatement)
external:
  self: EXTERNAL (Keyword)
ident:
  self: . (DotOperator)
  left:
    self: dataset (Identifier)
  right:
    self: new_table (Identifier)
options:
  self: OPTIONS (KeywordWithGroupedXXX)
  group:
    self: ( (GroupedExprs)
    exprs:
    - self: = (BinaryOperator)
      comma:
        self: , (Symbol)
      left:
        self: uris (Identifier)
      right:
        self: [ (ArrayLiteral)
        exprs:
        - self: 'dummy' (StringLiteral)
        rparen:
          self: ] (Symbol)
    - self: = (BinaryOperator)
      left:
        self: format (Identifier)
      right:
        self: csv (Identifier)
    rparen:
      self: ) (Symbol)
semicolon:
  self: ; (Symbol)
what:
  self: TABLE (Keyword)
with_partition_columns:
  self: WITH (WithPartitionColumnsClause)
  partition_columns:
  - self: PARTITION (Keyword)
  - self: COLUMNS (Keyword)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
CREATE EXTERNAL TABLE dataset.new_table
WITH PARTITION COLUMNS (
    col1 string
)
OPTIONS (
  uris = ['dummy'],
  format = csv
);
",
            "\
self: CREATE (CreateTableStatement)
external:
  self: EXTERNAL (Keyword)
ident:
  self: . (DotOperator)
  left:
    self: dataset (Identifier)
  right:
    self: new_table (Identifier)
options:
  self: OPTIONS (KeywordWithGroupedXXX)
  group:
    self: ( (GroupedExprs)
    exprs:
    - self: = (BinaryOperator)
      comma:
        self: , (Symbol)
      left:
        self: uris (Identifier)
      right:
        self: [ (ArrayLiteral)
        exprs:
        - self: 'dummy' (StringLiteral)
        rparen:
          self: ] (Symbol)
    - self: = (BinaryOperator)
      left:
        self: format (Identifier)
      right:
        self: csv (Identifier)
    rparen:
      self: ) (Symbol)
semicolon:
  self: ; (Symbol)
what:
  self: TABLE (Keyword)
with_partition_columns:
  self: WITH (WithPartitionColumnsClause)
  column_schema_group:
    self: ( (GroupedTypeDeclarationOrConstraints)
    declarations:
    - self: col1 (TypeDeclaration)
      type:
        self: string (Type)
    rparen:
      self: ) (Symbol)
  partition_columns:
  - self: PARTITION (Keyword)
  - self: COLUMNS (Keyword)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
CREATE EXTERNAL TABLE dataset.new_table (
  col STRING
)
OPTIONS (
  format = 'CSV',
  uris = ['dummy']
)
",
            "\
self: CREATE (CreateTableStatement)
column_schema_group:
  self: ( (GroupedTypeDeclarationOrConstraints)
  declarations:
  - self: col (TypeDeclaration)
    type:
      self: STRING (Type)
  rparen:
    self: ) (Symbol)
external:
  self: EXTERNAL (Keyword)
ident:
  self: . (DotOperator)
  left:
    self: dataset (Identifier)
  right:
    self: new_table (Identifier)
options:
  self: OPTIONS (KeywordWithGroupedXXX)
  group:
    self: ( (GroupedExprs)
    exprs:
    - self: = (BinaryOperator)
      comma:
        self: , (Symbol)
      left:
        self: format (Identifier)
      right:
        self: 'CSV' (StringLiteral)
    - self: = (BinaryOperator)
      left:
        self: uris (Identifier)
      right:
        self: [ (ArrayLiteral)
        exprs:
        - self: 'dummy' (StringLiteral)
        rparen:
          self: ] (Symbol)
    rparen:
      self: ) (Symbol)
what:
  self: TABLE (Keyword)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
CREATE EXTERNAL TABLE tablename
WITH CONNECTION ident
OPTIONS (dummy = 'dummy')
",
            "\
self: CREATE (CreateTableStatement)
external:
  self: EXTERNAL (Keyword)
ident:
  self: tablename (Identifier)
options:
  self: OPTIONS (KeywordWithGroupedXXX)
  group:
    self: ( (GroupedExprs)
    exprs:
    - self: = (BinaryOperator)
      left:
        self: dummy (Identifier)
      right:
        self: 'dummy' (StringLiteral)
    rparen:
      self: ) (Symbol)
what:
  self: TABLE (Keyword)
with_connection:
  self: WITH (KeywordSequence)
  next_keyword:
    self: CONNECTION (KeywordWithExpr)
    expr:
      self: ident (Identifier)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
CREATE EXTERNAL TABLE tablename
WITH CONNECTION DEFAULT
OPTIONS (dummy = 'dummy')
",
            "\
self: CREATE (CreateTableStatement)
external:
  self: EXTERNAL (Keyword)
ident:
  self: tablename (Identifier)
options:
  self: OPTIONS (KeywordWithGroupedXXX)
  group:
    self: ( (GroupedExprs)
    exprs:
    - self: = (BinaryOperator)
      left:
        self: dummy (Identifier)
      right:
        self: 'dummy' (StringLiteral)
    rparen:
      self: ) (Symbol)
what:
  self: TABLE (Keyword)
with_connection:
  self: WITH (KeywordSequence)
  next_keyword:
    self: CONNECTION (KeywordWithExpr)
    expr:
      self: DEFAULT (Keyword)
",
            0,
        )),
        // ----- CREATE VIEW statement -----
        Box::new(SuccessTestCase::new(
            "\
CREATE VIEW dataset.view_name
AS
  SELECT *
  FROM dataset.table_name
;
",
            "\
self: CREATE (CreateViewStatement)
as:
  self: AS (KeywordWithStatement)
  stmt:
    self: SELECT (SelectStatement)
    exprs:
    - self: * (Asterisk)
    from:
      self: FROM (KeywordWithExpr)
      expr:
        self: . (DotOperator)
        left:
          self: dataset (Identifier)
        right:
          self: table_name (Identifier)
ident:
  self: . (DotOperator)
  left:
    self: dataset (Identifier)
  right:
    self: view_name (Identifier)
semicolon:
  self: ; (Symbol)
what:
  self: VIEW (Keyword)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
CREATE VIEW dataset_name.view_name(uno, dos)
AS SELECT 1 ONE, 2 TWO
",
            "\
self: CREATE (CreateViewStatement)
as:
  self: AS (KeywordWithStatement)
  stmt:
    self: SELECT (SelectStatement)
    exprs:
    - self: 1 (NumericLiteral)
      alias:
        self: ONE (Identifier)
      comma:
        self: , (Symbol)
    - self: 2 (NumericLiteral)
      alias:
        self: TWO (Identifier)
column_name_list:
  self: ( (GroupedIdentWithOptions)
  idents:
  - self: uno (IdentWithOptions)
    comma:
      self: , (Symbol)
  - self: dos (IdentWithOptions)
  rparen:
    self: ) (Symbol)
ident:
  self: . (DotOperator)
  left:
    self: dataset_name (Identifier)
  right:
    self: view_name (Identifier)
what:
  self: VIEW (Keyword)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
CREATE VIEW viewname (uno OPTIONS(description='single'))
AS SELECT 1 ONE
",
            "\
self: CREATE (CreateViewStatement)
as:
  self: AS (KeywordWithStatement)
  stmt:
    self: SELECT (SelectStatement)
    exprs:
    - self: 1 (NumericLiteral)
      alias:
        self: ONE (Identifier)
column_name_list:
  self: ( (GroupedIdentWithOptions)
  idents:
  - self: uno (IdentWithOptions)
    options:
      self: OPTIONS (KeywordWithGroupedXXX)
      group:
        self: ( (GroupedExprs)
        exprs:
        - self: = (BinaryOperator)
          left:
            self: description (Identifier)
          right:
            self: 'single' (StringLiteral)
        rparen:
          self: ) (Symbol)
  rparen:
    self: ) (Symbol)
ident:
  self: viewname (Identifier)
what:
  self: VIEW (Keyword)
",
            0,
        )),
        // REPLICA
        Box::new(SuccessTestCase::new(
            "\
CREATE MATERIALIZED VIEW ident1
AS REPLICA OF ident2
",
            "\
self: CREATE (CreateViewStatement)
as:
  self: AS (KeywordSequence)
  next_keyword:
    self: REPLICA (KeywordSequence)
    next_keyword:
      self: OF (KeywordWithExpr)
      expr:
        self: ident2 (Identifier)
ident:
  self: ident1 (Identifier)
materialized:
  self: MATERIALIZED (Keyword)
what:
  self: VIEW (Keyword)
",
            0,
        )),
        // MATERIALIZED
        Box::new(SuccessTestCase::new(
            "\
CREATE MATERIALIZED VIEW dataset.view_name
OPTIONS(dummy = 'dummy')
AS
    SELECT COUNT(*)
    FROM dataset.table_name
;
",
            "\
self: CREATE (CreateViewStatement)
as:
  self: AS (KeywordWithStatement)
  stmt:
    self: SELECT (SelectStatement)
    exprs:
    - self: ( (CallingFunction)
      args:
      - self: * (Asterisk)
      func:
        self: COUNT (Identifier)
      rparen:
        self: ) (Symbol)
    from:
      self: FROM (KeywordWithExpr)
      expr:
        self: . (DotOperator)
        left:
          self: dataset (Identifier)
        right:
          self: table_name (Identifier)
ident:
  self: . (DotOperator)
  left:
    self: dataset (Identifier)
  right:
    self: view_name (Identifier)
materialized:
  self: MATERIALIZED (Keyword)
options:
  self: OPTIONS (KeywordWithGroupedXXX)
  group:
    self: ( (GroupedExprs)
    exprs:
    - self: = (BinaryOperator)
      left:
        self: dummy (Identifier)
      right:
        self: 'dummy' (StringLiteral)
    rparen:
      self: ) (Symbol)
semicolon:
  self: ; (Symbol)
what:
  self: VIEW (Keyword)
",
            0,
        )),
        // ----- CREATE FUNCTION statement -----
        // sql function definition
        Box::new(SuccessTestCase::new(
            "\
CREATE OR REPLACE FUNCTION abc() AS (1);
",
            "\
self: CREATE (CreateFunctionStatement)
as:
  self: AS (KeywordWithGroupedXXX)
  group:
    self: ( (GroupedExpr)
    expr:
      self: 1 (NumericLiteral)
    rparen:
      self: ) (Symbol)
group:
  self: ( (GroupedTypeDeclarationOrConstraints)
  rparen:
    self: ) (Symbol)
ident:
  self: abc (Identifier)
or_replace:
- self: OR (Keyword)
- self: REPLACE (Keyword)
semicolon:
  self: ; (Symbol)
what:
  self: FUNCTION (Keyword)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
CREATE TEMP FUNCTION abc(x INT64) AS (x);
",
            "\
self: CREATE (CreateFunctionStatement)
as:
  self: AS (KeywordWithGroupedXXX)
  group:
    self: ( (GroupedExpr)
    expr:
      self: x (Identifier)
    rparen:
      self: ) (Symbol)
group:
  self: ( (GroupedTypeDeclarationOrConstraints)
  declarations:
  - self: x (TypeDeclaration)
    type:
      self: INT64 (Type)
  rparen:
    self: ) (Symbol)
ident:
  self: abc (Identifier)
semicolon:
  self: ; (Symbol)
temp:
  self: TEMP (Keyword)
what:
  self: FUNCTION (Keyword)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
CREATE FUNCTION IF NOT EXISTS abc(x ARRAY<INT64>, y ANY TYPE)
RETURNS INT64
AS ('dummy');
",
            "\
self: CREATE (CreateFunctionStatement)
as:
  self: AS (KeywordWithGroupedXXX)
  group:
    self: ( (GroupedExpr)
    expr:
      self: 'dummy' (StringLiteral)
    rparen:
      self: ) (Symbol)
group:
  self: ( (GroupedTypeDeclarationOrConstraints)
  declarations:
  - self: x (TypeDeclaration)
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
  - self: y (TypeDeclaration)
    type:
      self: ANY (Type)
      type:
        self: TYPE (Keyword)
  rparen:
    self: ) (Symbol)
ident:
  self: abc (Identifier)
if_not_exists:
- self: IF (Keyword)
- self: NOT (Keyword)
- self: EXISTS (Keyword)
returns:
  self: RETURNS (KeywordWithType)
  type:
    self: INT64 (Type)
semicolon:
  self: ; (Symbol)
what:
  self: FUNCTION (Keyword)
",
            0,
        )),
        // javascript function definition
        Box::new(SuccessTestCase::new(
            "\
CREATE FUNCTION abc() RETURNS INT64 LAGUAGE js
OPTIONS()
AS '''return 1''';
",
            "\
self: CREATE (CreateFunctionStatement)
as:
  self: AS (KeywordWithExpr)
  expr:
    self: '''return 1''' (StringLiteral)
group:
  self: ( (GroupedTypeDeclarationOrConstraints)
  rparen:
    self: ) (Symbol)
ident:
  self: abc (Identifier)
language:
  self: LAGUAGE (KeywordWithExpr)
  expr:
    self: js (Identifier)
options:
  self: OPTIONS (KeywordWithGroupedXXX)
  group:
    self: ( (GroupedExprs)
    rparen:
      self: ) (Symbol)
returns:
  self: RETURNS (KeywordWithType)
  type:
    self: INT64 (Type)
semicolon:
  self: ; (Symbol)
what:
  self: FUNCTION (Keyword)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
CREATE FUNCTION abc() RETURNS INT64 DETERMINISTIC LANGUAGE js
OPTIONS(library = ['dummy'])
AS '''return 1''';
",
            "\
self: CREATE (CreateFunctionStatement)
as:
  self: AS (KeywordWithExpr)
  expr:
    self: '''return 1''' (StringLiteral)
determinism:
- self: DETERMINISTIC (Keyword)
group:
  self: ( (GroupedTypeDeclarationOrConstraints)
  rparen:
    self: ) (Symbol)
ident:
  self: abc (Identifier)
language:
  self: LANGUAGE (KeywordWithExpr)
  expr:
    self: js (Identifier)
options:
  self: OPTIONS (KeywordWithGroupedXXX)
  group:
    self: ( (GroupedExprs)
    exprs:
    - self: = (BinaryOperator)
      left:
        self: library (Identifier)
      right:
        self: [ (ArrayLiteral)
        exprs:
        - self: 'dummy' (StringLiteral)
        rparen:
          self: ] (Symbol)
    rparen:
      self: ) (Symbol)
returns:
  self: RETURNS (KeywordWithType)
  type:
    self: INT64 (Type)
semicolon:
  self: ; (Symbol)
what:
  self: FUNCTION (Keyword)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
CREATE FUNCTION abc() RETURNS INT64 NOT DETERMINISTIC LANGUAGE js
AS '''return 1''';
",
            "\
self: CREATE (CreateFunctionStatement)
as:
  self: AS (KeywordWithExpr)
  expr:
    self: '''return 1''' (StringLiteral)
determinism:
- self: NOT (Keyword)
- self: DETERMINISTIC (Keyword)
group:
  self: ( (GroupedTypeDeclarationOrConstraints)
  rparen:
    self: ) (Symbol)
ident:
  self: abc (Identifier)
language:
  self: LANGUAGE (KeywordWithExpr)
  expr:
    self: js (Identifier)
returns:
  self: RETURNS (KeywordWithType)
  type:
    self: INT64 (Type)
semicolon:
  self: ; (Symbol)
what:
  self: FUNCTION (Keyword)
",
            0,
        )),
        // python function
        Box::new(SuccessTestCase::new(
            "\
CREATE FUNCTION abc() RETURNS INT64 LAGUAGE python
WITH CONNECTION `project.us.connection`
OPTIONS()
AS '''return 1''';
",
            "\
self: CREATE (CreateFunctionStatement)
as:
  self: AS (KeywordWithExpr)
  expr:
    self: '''return 1''' (StringLiteral)
connection:
  self: WITH (KeywordSequence)
  next_keyword:
    self: CONNECTION (KeywordWithExpr)
    expr:
      self: `project.us.connection` (Identifier)
group:
  self: ( (GroupedTypeDeclarationOrConstraints)
  rparen:
    self: ) (Symbol)
ident:
  self: abc (Identifier)
language:
  self: LAGUAGE (KeywordWithExpr)
  expr:
    self: python (Identifier)
options:
  self: OPTIONS (KeywordWithGroupedXXX)
  group:
    self: ( (GroupedExprs)
    rparen:
      self: ) (Symbol)
returns:
  self: RETURNS (KeywordWithType)
  type:
    self: INT64 (Type)
semicolon:
  self: ; (Symbol)
what:
  self: FUNCTION (Keyword)
",
            0,
        )),
        // remote function
        Box::new(SuccessTestCase::new(
            "\
CREATE FUNCTION dataset.abc()
RETURNS INT64
REMOTE WITH CONNECTION `project.us.connection`
OPTIONS (endpoint = 'https://region-project.cloudfunctions.net/function')
",
            "\
self: CREATE (CreateFunctionStatement)
connection:
  self: WITH (KeywordSequence)
  next_keyword:
    self: CONNECTION (KeywordWithExpr)
    expr:
      self: `project.us.connection` (Identifier)
group:
  self: ( (GroupedTypeDeclarationOrConstraints)
  rparen:
    self: ) (Symbol)
ident:
  self: . (DotOperator)
  left:
    self: dataset (Identifier)
  right:
    self: abc (Identifier)
options:
  self: OPTIONS (KeywordWithGroupedXXX)
  group:
    self: ( (GroupedExprs)
    exprs:
    - self: = (BinaryOperator)
      left:
        self: endpoint (Identifier)
      right:
        self: 'https://region-project.cloudfunctions.net/function' (StringLiteral)
    rparen:
      self: ) (Symbol)
remote:
  self: REMOTE (Keyword)
returns:
  self: RETURNS (KeywordWithType)
  type:
    self: INT64 (Type)
what:
  self: FUNCTION (Keyword)
",
            0,
        )),
        // TVF
        Box::new(SuccessTestCase::new(
            "\
CREATE TABLE FUNCTION one(x INT64)
RETURNS TABLE<one INT64>
AS SELECT 1 AS one
",
            "\
self: CREATE (CreateFunctionStatement)
as:
  self: AS (KeywordWithStatement)
  stmt:
    self: SELECT (SelectStatement)
    exprs:
    - self: 1 (NumericLiteral)
      alias:
        self: one (Identifier)
      as:
        self: AS (Keyword)
group:
  self: ( (GroupedTypeDeclarationOrConstraints)
  declarations:
  - self: x (TypeDeclaration)
    type:
      self: INT64 (Type)
  rparen:
    self: ) (Symbol)
ident:
  self: one (Identifier)
returns:
  self: RETURNS (KeywordWithType)
  type:
    self: TABLE (Type)
    type_declaration:
      self: < (GroupedTypeDeclarationOrConstraints)
      declarations:
      - self: one (TypeDeclaration)
        type:
          self: INT64 (Type)
      rparen:
        self: > (Symbol)
table:
  self: TABLE (Keyword)
what:
  self: FUNCTION (Keyword)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
CREATE TABLE FUNCTION foo.bar (
  tablename TABLE<col1 INT64, col2 FLOAT64>
) AS (
  SELECT 1
)
",
            "\
self: CREATE (CreateFunctionStatement)
as:
  self: AS (KeywordWithStatement)
  stmt:
    self: ( (GroupedStatement)
    rparen:
      self: ) (Symbol)
    stmt:
      self: SELECT (SelectStatement)
      exprs:
      - self: 1 (NumericLiteral)
group:
  self: ( (GroupedTypeDeclarationOrConstraints)
  declarations:
  - self: tablename (TypeDeclaration)
    type:
      self: TABLE (Type)
      type_declaration:
        self: < (GroupedTypeDeclarationOrConstraints)
        declarations:
        - self: col1 (TypeDeclaration)
          comma:
            self: , (Symbol)
          type:
            self: INT64 (Type)
        - self: col2 (TypeDeclaration)
          type:
            self: FLOAT64 (Type)
        rparen:
          self: > (Symbol)
  rparen:
    self: ) (Symbol)
ident:
  self: . (DotOperator)
  left:
    self: foo (Identifier)
  right:
    self: bar (Identifier)
table:
  self: TABLE (Keyword)
what:
  self: FUNCTION (Keyword)
",
            0,
        )),
        // AGGREGATE function
        Box::new(SuccessTestCase::new(
            "\
CREATE AGGREGATE FUNCTION plus_one(n int64 not aggregate)
AS (n + 1)
",
            "\
self: CREATE (CreateFunctionStatement)
aggregate:
  self: AGGREGATE (Keyword)
as:
  self: AS (KeywordWithGroupedXXX)
  group:
    self: ( (GroupedExpr)
    expr:
      self: + (BinaryOperator)
      left:
        self: n (Identifier)
      right:
        self: 1 (NumericLiteral)
    rparen:
      self: ) (Symbol)
group:
  self: ( (GroupedTypeDeclarationOrConstraints)
  declarations:
  - self: n (TypeDeclaration)
    type:
      self: int64 (Type)
      aggregate:
        self: not (KeywordSequence)
        next_keyword:
          self: aggregate (Keyword)
  rparen:
    self: ) (Symbol)
ident:
  self: plus_one (Identifier)
what:
  self: FUNCTION (Keyword)
",
            0,
        )),
        // ----- CREATE PROCEDURE statement -----
        Box::new(SuccessTestCase::new(
            "\
CREATE PROCEDURE dataset.procede() BEGIN SELECT 1; END;
",
            "\
self: CREATE (CreateProcedureStatement)
group:
  self: ( (GroupedTypeDeclarationOrConstraints)
  rparen:
    self: ) (Symbol)
ident:
  self: . (DotOperator)
  left:
    self: dataset (Identifier)
  right:
    self: procede (Identifier)
semicolon:
  self: ; (Symbol)
stmt:
  self: BEGIN (BeginStatement)
  end:
    self: END (Keyword)
  stmts:
  - self: SELECT (SelectStatement)
    exprs:
    - self: 1 (NumericLiteral)
    semicolon:
      self: ; (Symbol)
what:
  self: PROCEDURE (Keyword)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
CREATE PROCEDURE dataset.procede(x INT64, INOUT y INT64)
OPTIONS(dummy = 'dummy')
BEGIN SELECT 1; END;
",
            "\
self: CREATE (CreateProcedureStatement)
group:
  self: ( (GroupedTypeDeclarationOrConstraints)
  declarations:
  - self: x (TypeDeclaration)
    comma:
      self: , (Symbol)
    type:
      self: INT64 (Type)
  - self: y (TypeDeclaration)
    in_out:
      self: INOUT (Keyword)
    type:
      self: INT64 (Type)
  rparen:
    self: ) (Symbol)
ident:
  self: . (DotOperator)
  left:
    self: dataset (Identifier)
  right:
    self: procede (Identifier)
options:
  self: OPTIONS (KeywordWithGroupedXXX)
  group:
    self: ( (GroupedExprs)
    exprs:
    - self: = (BinaryOperator)
      left:
        self: dummy (Identifier)
      right:
        self: 'dummy' (StringLiteral)
    rparen:
      self: ) (Symbol)
semicolon:
  self: ; (Symbol)
stmt:
  self: BEGIN (BeginStatement)
  end:
    self: END (Keyword)
  stmts:
  - self: SELECT (SelectStatement)
    exprs:
    - self: 1 (NumericLiteral)
    semicolon:
      self: ; (Symbol)
what:
  self: PROCEDURE (Keyword)
",
            0,
        )),
        // ----- Apache Spark
        Box::new(SuccessTestCase::new(
            "\
CREATE PROCEDURE procedure_ident()
WITH CONNECTION connection_ident
OPTIONS (dummy = 'dummy')
LANGUAGE python
",
            "\
self: CREATE (CreateProcedureStatement)
group:
  self: ( (GroupedTypeDeclarationOrConstraints)
  rparen:
    self: ) (Symbol)
ident:
  self: procedure_ident (Identifier)
language:
  self: LANGUAGE (KeywordWithExpr)
  expr:
    self: python (Identifier)
options:
  self: OPTIONS (KeywordWithGroupedXXX)
  group:
    self: ( (GroupedExprs)
    exprs:
    - self: = (BinaryOperator)
      left:
        self: dummy (Identifier)
      right:
        self: 'dummy' (StringLiteral)
    rparen:
      self: ) (Symbol)
what:
  self: PROCEDURE (Keyword)
with_connection:
  self: WITH (KeywordSequence)
  next_keyword:
    self: CONNECTION (KeywordWithExpr)
    expr:
      self: connection_ident (Identifier)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
CREATE PROCEDURE procedure_ident()
WITH CONNECTION connection_ident
LANGUAGE python AS r'code'
",
            "\
self: CREATE (CreateProcedureStatement)
as:
  self: AS (KeywordWithExpr)
  expr:
    self: r (UnaryOperator)
    right:
      self: 'code' (StringLiteral)
group:
  self: ( (GroupedTypeDeclarationOrConstraints)
  rparen:
    self: ) (Symbol)
ident:
  self: procedure_ident (Identifier)
language:
  self: LANGUAGE (KeywordWithExpr)
  expr:
    self: python (Identifier)
what:
  self: PROCEDURE (Keyword)
with_connection:
  self: WITH (KeywordSequence)
  next_keyword:
    self: CONNECTION (KeywordWithExpr)
    expr:
      self: connection_ident (Identifier)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
CREATE PROCEDURE procedure_ident()
EXTERNAL SECURITY INVOKER
WITH CONNECTION connection_ident
LANGUAGE python AS 'code'
",
            "\
self: CREATE (CreateProcedureStatement)
as:
  self: AS (KeywordWithExpr)
  expr:
    self: 'code' (StringLiteral)
external:
  self: EXTERNAL (KeywordSequence)
  next_keyword:
    self: SECURITY (KeywordSequence)
    next_keyword:
      self: INVOKER (Keyword)
group:
  self: ( (GroupedTypeDeclarationOrConstraints)
  rparen:
    self: ) (Symbol)
ident:
  self: procedure_ident (Identifier)
language:
  self: LANGUAGE (KeywordWithExpr)
  expr:
    self: python (Identifier)
what:
  self: PROCEDURE (Keyword)
with_connection:
  self: WITH (KeywordSequence)
  next_keyword:
    self: CONNECTION (KeywordWithExpr)
    expr:
      self: connection_ident (Identifier)
",
            0,
        )),
        // ----- CREATE ROW ACCESS POLICY statement -----
        Box::new(SuccessTestCase::new(
            "\
CREATE ROW ACCESS POLICY new_filter
ON tablename
FILTER USING (TRUE)
",
            "\
self: CREATE (CreateRowAccessPolicyStatement)
filter:
  self: FILTER (Keyword)
ident:
  self: new_filter (Identifier)
on:
  self: ON (KeywordWithExpr)
  expr:
    self: tablename (Identifier)
using:
  self: USING (KeywordWithExpr)
  expr:
    self: ( (GroupedExpr)
    expr:
      self: TRUE (BooleanLiteral)
    rparen:
      self: ) (Symbol)
what:
- self: ROW (Keyword)
- self: ACCESS (Keyword)
- self: POLICY (Keyword)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
CREATE OR REPLACE ROW ACCESS POLICY IF NOT EXISTS new_filter
ON tablename
GRANT TO ('a.example.com', 'b.example.com')
FILTER USING (email = SESSION_USER())
;
",
            "\
self: CREATE (CreateRowAccessPolicyStatement)
filter:
  self: FILTER (Keyword)
grant:
  self: GRANT (Keyword)
ident:
  self: new_filter (Identifier)
if_not_exists:
- self: IF (Keyword)
- self: NOT (Keyword)
- self: EXISTS (Keyword)
on:
  self: ON (KeywordWithExpr)
  expr:
    self: tablename (Identifier)
or_replace:
- self: OR (Keyword)
- self: REPLACE (Keyword)
semicolon:
  self: ; (Symbol)
to:
  self: TO (KeywordWithGroupedXXX)
  group:
    self: ( (GroupedExprs)
    exprs:
    - self: 'a.example.com' (StringLiteral)
      comma:
        self: , (Symbol)
    - self: 'b.example.com' (StringLiteral)
    rparen:
      self: ) (Symbol)
using:
  self: USING (KeywordWithExpr)
  expr:
    self: ( (GroupedExpr)
    expr:
      self: = (BinaryOperator)
      left:
        self: email (Identifier)
      right:
        self: ( (CallingFunction)
        func:
          self: SESSION_USER (Identifier)
        rparen:
          self: ) (Symbol)
    rparen:
      self: ) (Symbol)
what:
- self: ROW (Keyword)
- self: ACCESS (Keyword)
- self: POLICY (Keyword)
",
            0,
        )),
        // ----- CREATE RESERVATIONS statement -----
        // CREATE
        Box::new(SuccessTestCase::new(
            // may be deprecated
            "\
CREATE CAPACITY project.region.commitment_id
AS JSON '''
  'slot_count': 100,
  'plan': 'FLEX'
'''
",
            "\
self: CREATE (CreateReservationStatement)
as:
  self: AS (Keyword)
ident:
  self: . (DotOperator)
  left:
    self: . (DotOperator)
    left:
      self: project (Identifier)
    right:
      self: region (Identifier)
  right:
    self: commitment_id (Identifier)
json:
  self: JSON (Keyword)
json_string:
  self: '''
  'slot_count': 100,
  'plan': 'FLEX'
''' (StringLiteral)
what:
  self: CAPACITY (Keyword)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
CREATE CAPACITY ident
OPTIONS (plan='FLEX')
",
            "\
self: CREATE (CreateReservationStatement)
ident:
  self: ident (Identifier)
options:
  self: OPTIONS (KeywordWithGroupedXXX)
  group:
    self: ( (GroupedExprs)
    exprs:
    - self: = (BinaryOperator)
      left:
        self: plan (Identifier)
      right:
        self: 'FLEX' (StringLiteral)
    rparen:
      self: ) (Symbol)
what:
  self: CAPACITY (Keyword)
",
            0,
        )),
        // ----- ALTER SCHEMA statement -----
        Box::new(SuccessTestCase::new(
            "\
ALTER SCHEMA dataset_name SET OPTIONS();
",
            "\
self: ALTER (AlterSchemaStatement)
ident:
  self: dataset_name (Identifier)
options:
  self: OPTIONS (KeywordWithGroupedXXX)
  group:
    self: ( (GroupedExprs)
    rparen:
      self: ) (Symbol)
semicolon:
  self: ; (Symbol)
set:
  self: SET (Keyword)
what:
  self: SCHEMA (Keyword)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
ALTER SCHEMA dataset_name SET DEFAULT COLLATE 'und:ci'
",
            "\
self: ALTER (AlterSchemaStatement)
default_collate:
  self: DEFAULT (KeywordSequence)
  next_keyword:
    self: COLLATE (KeywordWithExpr)
    expr:
      self: 'und:ci' (StringLiteral)
ident:
  self: dataset_name (Identifier)
set:
  self: SET (Keyword)
what:
  self: SCHEMA (Keyword)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
ALTER SCHEMA IF EXISTS dataset_name SET OPTIONS(dummy = 'dummy');
",
            "\
self: ALTER (AlterSchemaStatement)
ident:
  self: dataset_name (Identifier)
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
        self: dummy (Identifier)
      right:
        self: 'dummy' (StringLiteral)
    rparen:
      self: ) (Symbol)
semicolon:
  self: ; (Symbol)
set:
  self: SET (Keyword)
what:
  self: SCHEMA (Keyword)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
ALTER SCHEMA dataset_name ADD REPLICA replica_name;
",
            "\
self: ALTER (AlterSchemaStatement)
add:
  self: ADD (KeywordSequence)
  next_keyword:
    self: REPLICA (KeywordWithExpr)
    expr:
      self: replica_name (Identifier)
ident:
  self: dataset_name (Identifier)
semicolon:
  self: ; (Symbol)
what:
  self: SCHEMA (Keyword)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
ALTER SCHEMA dataset_name DROP REPLICA replica_name;
",
            "\
self: ALTER (AlterSchemaStatement)
drop:
  self: DROP (KeywordSequence)
  next_keyword:
    self: REPLICA (KeywordWithExpr)
    expr:
      self: replica_name (Identifier)
ident:
  self: dataset_name (Identifier)
semicolon:
  self: ; (Symbol)
what:
  self: SCHEMA (Keyword)
",
            0,
        )),
        // ----- ALTER TABLE statement -----
        // SET
        Box::new(SuccessTestCase::new(
            "\
ALTER TABLE example SET OPTIONS(dummy='dummy');
",
            "\
self: ALTER (AlterTableStatement)
ident:
  self: example (Identifier)
options:
  self: OPTIONS (KeywordWithGroupedXXX)
  group:
    self: ( (GroupedExprs)
    exprs:
    - self: = (BinaryOperator)
      left:
        self: dummy (Identifier)
      right:
        self: 'dummy' (StringLiteral)
    rparen:
      self: ) (Symbol)
semicolon:
  self: ; (Symbol)
set:
  self: SET (Keyword)
what:
  self: TABLE (Keyword)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
ALTER TABLE example SET DEFAULT COLLATE 'und:ci'
",
            "\
self: ALTER (AlterTableStatement)
default_collate:
  self: DEFAULT (KeywordSequence)
  next_keyword:
    self: COLLATE (KeywordWithExpr)
    expr:
      self: 'und:ci' (StringLiteral)
ident:
  self: example (Identifier)
set:
  self: SET (Keyword)
what:
  self: TABLE (Keyword)
",
            0,
        )),
        // ADD COLUMN
        Box::new(SuccessTestCase::new(
            "\
ALTER TABLE example
ADD COLUMN x INT64;
",
            "\
self: ALTER (AlterTableStatement)
add_columns:
- self: ADD (AddColumnClause)
  type_declaration:
    self: x (TypeDeclaration)
    type:
      self: INT64 (Type)
  what:
    self: COLUMN (Keyword)
ident:
  self: example (Identifier)
semicolon:
  self: ; (Symbol)
what:
  self: TABLE (Keyword)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
ALTER TABLE example
ADD COLUMN IF NOT EXISTS x INT64 OPTIONS(description = 'dummy'),
ADD COLUMN y STRUCT<z INT64 NOT NULL>;
",
            "\
self: ALTER (AlterTableStatement)
add_columns:
- self: ADD (AddColumnClause)
  comma:
    self: , (Symbol)
  if_not_exists:
  - self: IF (Keyword)
  - self: NOT (Keyword)
  - self: EXISTS (Keyword)
  type_declaration:
    self: x (TypeDeclaration)
    type:
      self: INT64 (Type)
      options:
        self: OPTIONS (KeywordWithGroupedXXX)
        group:
          self: ( (GroupedExprs)
          exprs:
          - self: = (BinaryOperator)
            left:
              self: description (Identifier)
            right:
              self: 'dummy' (StringLiteral)
          rparen:
            self: ) (Symbol)
  what:
    self: COLUMN (Keyword)
- self: ADD (AddColumnClause)
  type_declaration:
    self: y (TypeDeclaration)
    type:
      self: STRUCT (Type)
      type_declaration:
        self: < (GroupedTypeDeclarationOrConstraints)
        declarations:
        - self: z (TypeDeclaration)
          type:
            self: INT64 (Type)
            not_null:
            - self: NOT (Keyword)
            - self: NULL (Keyword)
        rparen:
          self: > (Symbol)
  what:
    self: COLUMN (Keyword)
ident:
  self: example (Identifier)
semicolon:
  self: ; (Symbol)
what:
  self: TABLE (Keyword)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
ALTER TABLE ident ADD COLUMN col1 STRING COLLATE 'und:ci'
",
            "\
self: ALTER (AlterTableStatement)
add_columns:
- self: ADD (AddColumnClause)
  type_declaration:
    self: col1 (TypeDeclaration)
    type:
      self: STRING (Type)
      collate:
        self: COLLATE (KeywordWithExpr)
        expr:
          self: 'und:ci' (StringLiteral)
  what:
    self: COLUMN (Keyword)
ident:
  self: ident (Identifier)
what:
  self: TABLE (Keyword)
",
            0,
        )),
        // ADD CONSTRAINT
        // not allowed syntax but don't worry
        Box::new(SuccessTestCase::new(
            "\
ALTER TABLE example
ADD PRIMARY KEY (a) NOT ENFORCED,
ADD PRIMARY KEY (b)
",
            "\
self: ALTER (AlterTableStatement)
add_constraints:
- self: ADD (AddConstraintClause)
  comma:
    self: , (Symbol)
  what:
    self: PRIMARY (Constraint)
    columns:
      self: ( (GroupedExprs)
      exprs:
      - self: a (Identifier)
      rparen:
        self: ) (Symbol)
    enforced:
      self: NOT (KeywordSequence)
      next_keyword:
        self: ENFORCED (Keyword)
    key:
      self: KEY (Keyword)
- self: ADD (AddConstraintClause)
  what:
    self: PRIMARY (Constraint)
    columns:
      self: ( (GroupedExprs)
      exprs:
      - self: b (Identifier)
      rparen:
        self: ) (Symbol)
    key:
      self: KEY (Keyword)
ident:
  self: example (Identifier)
what:
  self: TABLE (Keyword)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
ALTER TABLE example
ADD CONSTRAINT IF NOT EXISTS foo FOREIGN KEY (a) REFERENCES tablename(x),
ADD CONSTRAINT bar FOREIGN KEY (b, c) REFERENCES tablename(y) NOT ENFORCED,
ADD FOREIGN KEY (d) REFERENCES tablename(z)
",
            "\
self: ALTER (AlterTableStatement)
add_constraints:
- self: ADD (AddConstraintClause)
  comma:
    self: , (Symbol)
  what:
    self: FOREIGN (Constraint)
    columns:
      self: ( (GroupedExprs)
      exprs:
      - self: a (Identifier)
      rparen:
        self: ) (Symbol)
    constraint:
      self: CONSTRAINT (Keyword)
    ident:
      self: foo (Identifier)
    if_not_exists:
    - self: IF (Keyword)
    - self: NOT (Keyword)
    - self: EXISTS (Keyword)
    key:
      self: KEY (Keyword)
    references:
      self: REFERENCES (KeywordWithExpr)
      expr:
        self: ( (CallingFunction)
        args:
        - self: x (Identifier)
        func:
          self: tablename (Identifier)
        rparen:
          self: ) (Symbol)
- self: ADD (AddConstraintClause)
  comma:
    self: , (Symbol)
  what:
    self: FOREIGN (Constraint)
    columns:
      self: ( (GroupedExprs)
      exprs:
      - self: b (Identifier)
        comma:
          self: , (Symbol)
      - self: c (Identifier)
      rparen:
        self: ) (Symbol)
    constraint:
      self: CONSTRAINT (Keyword)
    enforced:
      self: NOT (KeywordSequence)
      next_keyword:
        self: ENFORCED (Keyword)
    ident:
      self: bar (Identifier)
    key:
      self: KEY (Keyword)
    references:
      self: REFERENCES (KeywordWithExpr)
      expr:
        self: ( (CallingFunction)
        args:
        - self: y (Identifier)
        func:
          self: tablename (Identifier)
        rparen:
          self: ) (Symbol)
- self: ADD (AddConstraintClause)
  what:
    self: FOREIGN (Constraint)
    columns:
      self: ( (GroupedExprs)
      exprs:
      - self: d (Identifier)
      rparen:
        self: ) (Symbol)
    key:
      self: KEY (Keyword)
    references:
      self: REFERENCES (KeywordWithExpr)
      expr:
        self: ( (CallingFunction)
        args:
        - self: z (Identifier)
        func:
          self: tablename (Identifier)
        rparen:
          self: ) (Symbol)
ident:
  self: example (Identifier)
what:
  self: TABLE (Keyword)
",
            0,
        )),
        // RENAME TO
        Box::new(SuccessTestCase::new(
            "\
ALTER TABLE dataset_name.t
RENAME TO u;
",
            "\
self: ALTER (AlterTableStatement)
ident:
  self: . (DotOperator)
  left:
    self: dataset_name (Identifier)
  right:
    self: t (Identifier)
rename:
  self: RENAME (Keyword)
semicolon:
  self: ; (Symbol)
to:
  self: TO (KeywordWithExpr)
  expr:
    self: u (Identifier)
what:
  self: TABLE (Keyword)
",
            0,
        )),
        // RENAME COLUMN
        Box::new(SuccessTestCase::new(
            "\
ALTER TABLE t
RENAME COLUMN u TO v
",
            "\
self: ALTER (AlterTableStatement)
ident:
  self: t (Identifier)
rename_columns:
- self: RENAME (RenameColumnClause)
  column:
    self: COLUMN (Keyword)
  ident:
    self: u (Identifier)
  to:
    self: TO (KeywordWithExpr)
    expr:
      self: v (Identifier)
what:
  self: TABLE (Keyword)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
ALTER TABLE t
RENAME COLUMN u TO v,
RENAME COLUMN IF EXISTS w TO x
;
",
            "\
self: ALTER (AlterTableStatement)
ident:
  self: t (Identifier)
rename_columns:
- self: RENAME (RenameColumnClause)
  column:
    self: COLUMN (Keyword)
  comma:
    self: , (Symbol)
  ident:
    self: u (Identifier)
  to:
    self: TO (KeywordWithExpr)
    expr:
      self: v (Identifier)
- self: RENAME (RenameColumnClause)
  column:
    self: COLUMN (Keyword)
  ident:
    self: w (Identifier)
  if_exists:
    self: IF (KeywordSequence)
    next_keyword:
      self: EXISTS (Keyword)
  to:
    self: TO (KeywordWithExpr)
    expr:
      self: x (Identifier)
semicolon:
  self: ; (Symbol)
what:
  self: TABLE (Keyword)
",
            0,
        )),
        // DROP COLUMN
        Box::new(SuccessTestCase::new(
            "\
ALTER TABLE example
DROP COLUMN IF EXISTS x,
DROP COLUMN y
",
            "\
self: ALTER (AlterTableStatement)
drop_columns:
- self: DROP (AlterTableDropClause)
  comma:
    self: , (Symbol)
  ident:
    self: x (Identifier)
  if_exists:
  - self: IF (Keyword)
  - self: EXISTS (Keyword)
  what:
    self: COLUMN (Keyword)
- self: DROP (AlterTableDropClause)
  ident:
    self: y (Identifier)
  what:
    self: COLUMN (Keyword)
ident:
  self: example (Identifier)
what:
  self: TABLE (Keyword)
",
            0,
        )),
        // DROP CONSTRAINT
        Box::new(SuccessTestCase::new(
            "\
ALTER TABLE example
DROP PRIMARY KEY,
DROP PRIMARY KEY IF EXISTS,
DROP CONSTRAINT ident
",
            "\
self: ALTER (AlterTableStatement)
drop_columns:
- self: DROP (AlterTableDropClause)
  comma:
    self: , (Symbol)
  what:
    self: PRIMARY (KeywordWithExpr)
    expr:
      self: KEY (Keyword)
- self: DROP (AlterTableDropClause)
  comma:
    self: , (Symbol)
  if_exists:
  - self: IF (Keyword)
  - self: EXISTS (Keyword)
  what:
    self: PRIMARY (KeywordWithExpr)
    expr:
      self: KEY (Keyword)
- self: DROP (AlterTableDropClause)
  ident:
    self: ident (Identifier)
  what:
    self: CONSTRAINT (Keyword)
ident:
  self: example (Identifier)
what:
  self: TABLE (Keyword)
",
            0,
        )),
        // ----- ALTER COLUMN statement -----
        // DROP NOT NULL
        Box::new(SuccessTestCase::new(
            "\
ALTER TABLE t
ALTER COLUMN c DROP NOT NULL;
",
            "\
self: ALTER (AlterTableStatement)
alter_column_stmt:
  self: ALTER (AlterColumnStatement)
  drop_not_null:
  - self: DROP (Keyword)
  - self: NOT (Keyword)
  - self: NULL (Keyword)
  ident:
    self: c (Identifier)
  what:
    self: COLUMN (Keyword)
ident:
  self: t (Identifier)
semicolon:
  self: ; (Symbol)
what:
  self: TABLE (Keyword)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
ALTER TABLE IF EXISTS t
ALTER COLUMN IF EXISTS c DROP NOT NULL
",
            "\
self: ALTER (AlterTableStatement)
alter_column_stmt:
  self: ALTER (AlterColumnStatement)
  drop_not_null:
  - self: DROP (Keyword)
  - self: NOT (Keyword)
  - self: NULL (Keyword)
  ident:
    self: c (Identifier)
  if_exists:
  - self: IF (Keyword)
  - self: EXISTS (Keyword)
  what:
    self: COLUMN (Keyword)
ident:
  self: t (Identifier)
if_exists:
- self: IF (Keyword)
- self: EXISTS (Keyword)
what:
  self: TABLE (Keyword)
",
            0,
        )),
        // DROP DEFAULT
        Box::new(SuccessTestCase::new(
            "\
ALTER TABLE t
ALTER COLUMN c DROP DEFAULT
",
            "\
self: ALTER (AlterTableStatement)
alter_column_stmt:
  self: ALTER (AlterColumnStatement)
  drop_default:
  - self: DROP (Keyword)
  - self: DEFAULT (Keyword)
  ident:
    self: c (Identifier)
  what:
    self: COLUMN (Keyword)
ident:
  self: t (Identifier)
what:
  self: TABLE (Keyword)
",
            0,
        )),
        // SET OPTIONS
        Box::new(SuccessTestCase::new(
            "\
ALTER TABLE t
ALTER COLUMN c SET OPTIONS(description = 'abc');
",
            "\
self: ALTER (AlterTableStatement)
alter_column_stmt:
  self: ALTER (AlterColumnStatement)
  ident:
    self: c (Identifier)
  options:
    self: OPTIONS (KeywordWithGroupedXXX)
    group:
      self: ( (GroupedExprs)
      exprs:
      - self: = (BinaryOperator)
        left:
          self: description (Identifier)
        right:
          self: 'abc' (StringLiteral)
      rparen:
        self: ) (Symbol)
  set:
    self: SET (Keyword)
  what:
    self: COLUMN (Keyword)
ident:
  self: t (Identifier)
semicolon:
  self: ; (Symbol)
what:
  self: TABLE (Keyword)
",
            0,
        )),
        // SET DATA TYPE
        Box::new(SuccessTestCase::new(
            "\
ALTER TABLE t ALTER COLUMN int
SET DATA TYPE NUMERIC;
",
            "\
self: ALTER (AlterTableStatement)
alter_column_stmt:
  self: ALTER (AlterColumnStatement)
  data_type:
  - self: DATA (Keyword)
  - self: TYPE (Keyword)
  ident:
    self: int (Identifier)
  set:
    self: SET (Keyword)
  type:
    self: NUMERIC (Type)
  what:
    self: COLUMN (Keyword)
ident:
  self: t (Identifier)
semicolon:
  self: ; (Symbol)
what:
  self: TABLE (Keyword)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
ALTER TABLE t ALTER COLUMN s
SET DATA TYPE STRING COLLATE 'und:ci'
",
            "\
self: ALTER (AlterTableStatement)
alter_column_stmt:
  self: ALTER (AlterColumnStatement)
  data_type:
  - self: DATA (Keyword)
  - self: TYPE (Keyword)
  ident:
    self: s (Identifier)
  set:
    self: SET (Keyword)
  type:
    self: STRING (Type)
    collate:
      self: COLLATE (KeywordWithExpr)
      expr:
        self: 'und:ci' (StringLiteral)
  what:
    self: COLUMN (Keyword)
ident:
  self: t (Identifier)
what:
  self: TABLE (Keyword)
",
            0,
        )),
        // SET DEFAULT
        Box::new(SuccessTestCase::new(
            "\
ALTER TABLE t ALTER COLUMN s
SET DEFAULT CURRENT_TIMESTAMP()
",
            "\
self: ALTER (AlterTableStatement)
alter_column_stmt:
  self: ALTER (AlterColumnStatement)
  default:
    self: DEFAULT (KeywordWithExpr)
    expr:
      self: ( (CallingFunction)
      func:
        self: CURRENT_TIMESTAMP (Identifier)
      rparen:
        self: ) (Symbol)
  ident:
    self: s (Identifier)
  set:
    self: SET (Keyword)
  what:
    self: COLUMN (Keyword)
ident:
  self: t (Identifier)
what:
  self: TABLE (Keyword)
",
            0,
        )),
        // ----- ALTER VECTOR INDEX statement -----
        Box::new(SuccessTestCase::new(
            "\
ALTER VECTOR INDEX index_name ON table_name REBUILD;
",
            "\
self: ALTER (AlterVectorIndexStatement)
ident:
  self: index_name (Identifier)
on:
  self: ON (KeywordWithExpr)
  expr:
    self: table_name (Identifier)
operation:
  self: REBUILD (Keyword)
semicolon:
  self: ; (Symbol)
what:
  self: VECTOR (KeywordSequence)
  next_keyword:
    self: INDEX (Keyword)
",
            0,
        )),
        // ----- ALTER VIEW statement -----
        Box::new(SuccessTestCase::new(
            "\
ALTER VIEW example SET OPTIONS(
  dummy = 'dummy',
  description = 'abc'
);
",
            "\
self: ALTER (AlterViewStatement)
ident:
  self: example (Identifier)
options:
  self: OPTIONS (KeywordWithGroupedXXX)
  group:
    self: ( (GroupedExprs)
    exprs:
    - self: = (BinaryOperator)
      comma:
        self: , (Symbol)
      left:
        self: dummy (Identifier)
      right:
        self: 'dummy' (StringLiteral)
    - self: = (BinaryOperator)
      left:
        self: description (Identifier)
      right:
        self: 'abc' (StringLiteral)
    rparen:
      self: ) (Symbol)
semicolon:
  self: ; (Symbol)
set:
  self: SET (Keyword)
what:
  self: VIEW (Keyword)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
ALTER VIEW viewname
alter column colname set options(dummy='dummy');",
            "\
self: ALTER (AlterViewStatement)
alter_column_stmt:
  self: alter (AlterColumnStatement)
  ident:
    self: colname (Identifier)
  options:
    self: options (KeywordWithGroupedXXX)
    group:
      self: ( (GroupedExprs)
      exprs:
      - self: = (BinaryOperator)
        left:
          self: dummy (Identifier)
        right:
          self: 'dummy' (StringLiteral)
      rparen:
        self: ) (Symbol)
  set:
    self: set (Keyword)
  what:
    self: column (Keyword)
ident:
  self: viewname (Identifier)
semicolon:
  self: ; (Symbol)
what:
  self: VIEW (Keyword)
",
            0,
        )),
        // MATERIALIZED
        Box::new(SuccessTestCase::new(
            "\
ALTER MATERIALIZED VIEW example SET OPTIONS(dummy = 'dummy');
",
            "\
self: ALTER (AlterViewStatement)
ident:
  self: example (Identifier)
materialized:
  self: MATERIALIZED (Keyword)
options:
  self: OPTIONS (KeywordWithGroupedXXX)
  group:
    self: ( (GroupedExprs)
    exprs:
    - self: = (BinaryOperator)
      left:
        self: dummy (Identifier)
      right:
        self: 'dummy' (StringLiteral)
    rparen:
      self: ) (Symbol)
semicolon:
  self: ; (Symbol)
set:
  self: SET (Keyword)
what:
  self: VIEW (Keyword)
",
            0,
        )),
        // ----- ALTER ORGANIZATION statement -----
        Box::new(SuccessTestCase::new(
            "\
ALTER ORGANIZATION
SET OPTIONS (`region-us.default_time_zone` = 'Asia/Tokyo')
",
            "\
self: ALTER (AlterOrganizationStatement)
options:
  self: OPTIONS (KeywordWithGroupedXXX)
  group:
    self: ( (GroupedExprs)
    exprs:
    - self: = (BinaryOperator)
      left:
        self: `region-us.default_time_zone` (Identifier)
      right:
        self: 'Asia/Tokyo' (StringLiteral)
    rparen:
      self: ) (Symbol)
set:
  self: SET (Keyword)
what:
  self: ORGANIZATION (Keyword)
",
            0,
        )),
        // ----- ALTER PROJECT statement -----
        Box::new(SuccessTestCase::new(
            "\
ALTER PROJECT
SET OPTIONS (
  `region-us.default_time_zone` = 'Asia/Tokyo',
  `region-us.default_job_query_timeout_ms` = 1800000
);
",
            "\
self: ALTER (AlterProjectStatement)
options:
  self: OPTIONS (KeywordWithGroupedXXX)
  group:
    self: ( (GroupedExprs)
    exprs:
    - self: = (BinaryOperator)
      comma:
        self: , (Symbol)
      left:
        self: `region-us.default_time_zone` (Identifier)
      right:
        self: 'Asia/Tokyo' (StringLiteral)
    - self: = (BinaryOperator)
      left:
        self: `region-us.default_job_query_timeout_ms` (Identifier)
      right:
        self: 1800000 (NumericLiteral)
    rparen:
      self: ) (Symbol)
semicolon:
  self: ; (Symbol)
set:
  self: SET (Keyword)
what:
  self: PROJECT (Keyword)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
ALTER PROJECT `project-id`
SET OPTIONS (`region-us.default_time_zone` = 'Asia/Tokyo')
",
            "\
self: ALTER (AlterProjectStatement)
ident:
  self: `project-id` (Identifier)
options:
  self: OPTIONS (KeywordWithGroupedXXX)
  group:
    self: ( (GroupedExprs)
    exprs:
    - self: = (BinaryOperator)
      left:
        self: `region-us.default_time_zone` (Identifier)
      right:
        self: 'Asia/Tokyo' (StringLiteral)
    rparen:
      self: ) (Symbol)
set:
  self: SET (Keyword)
what:
  self: PROJECT (Keyword)
",
            0,
        )),
        // ----- ALTER BI_CAPACITY statement -----
        Box::new(SuccessTestCase::new(
            "\
ALTER BI_CAPACITY `project.region-us.default` SET OPTIONS(
  preferred_tables = ['table1', 'table2']
)
",
            "\
self: ALTER (AlterBICapacityStatement)
ident:
  self: `project.region-us.default` (Identifier)
options:
  self: OPTIONS (KeywordWithGroupedXXX)
  group:
    self: ( (GroupedExprs)
    exprs:
    - self: = (BinaryOperator)
      left:
        self: preferred_tables (Identifier)
      right:
        self: [ (ArrayLiteral)
        exprs:
        - self: 'table1' (StringLiteral)
          comma:
            self: , (Symbol)
        - self: 'table2' (StringLiteral)
        rparen:
          self: ] (Symbol)
    rparen:
      self: ) (Symbol)
set:
  self: SET (Keyword)
what:
  self: BI_CAPACITY (Keyword)
",
            0,
        )),
        // ----- ALTER RESERVATION statement -----
        Box::new(SuccessTestCase::new(
            "\
ALTER RESERVATION ident SET OPTIONS(plan='FLEX')
",
            "\
self: ALTER (AlterReservationStatement)
ident:
  self: ident (Identifier)
options:
  self: OPTIONS (KeywordWithGroupedXXX)
  group:
    self: ( (GroupedExprs)
    exprs:
    - self: = (BinaryOperator)
      left:
        self: plan (Identifier)
      right:
        self: 'FLEX' (StringLiteral)
    rparen:
      self: ) (Symbol)
set:
  self: SET (Keyword)
what:
  self: RESERVATION (Keyword)
",
            0,
        )),
        // ----- DROP statement -----
        // general
        Box::new(SuccessTestCase::new(
            "\
DROP TABLE example;
",
            "\
self: DROP (DropStatement)
ident:
  self: example (Identifier)
semicolon:
  self: ; (Symbol)
what:
  self: TABLE (Keyword)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
DROP EXTERNAL TABLE IF EXISTS example;
",
            "\
self: DROP (DropStatement)
external:
  self: EXTERNAL (Keyword)
ident:
  self: example (Identifier)
if_exists:
- self: IF (Keyword)
- self: EXISTS (Keyword)
semicolon:
  self: ; (Symbol)
what:
  self: TABLE (Keyword)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
DROP MATERIALIZED VIEW example;
",
            "\
self: DROP (DropStatement)
ident:
  self: example (Identifier)
materialized:
  self: MATERIALIZED (Keyword)
semicolon:
  self: ; (Symbol)
what:
  self: VIEW (Keyword)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
DROP SCHEMA example CASCADE;
",
            "\
self: DROP (DropStatement)
cascade_or_restrict:
  self: CASCADE (Keyword)
ident:
  self: example (Identifier)
semicolon:
  self: ; (Symbol)
what:
  self: SCHEMA (Keyword)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
DROP TABLE FUNCTION ident;
",
            "\
self: DROP (DropStatement)
ident:
  self: ident (Identifier)
semicolon:
  self: ; (Symbol)
table:
  self: TABLE (Keyword)
what:
  self: FUNCTION (Keyword)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
DROP SEARCH INDEX ident ON tablename
",
            "\
self: DROP (DropStatement)
ident:
  self: ident (Identifier)
on:
  self: ON (KeywordWithExpr)
  expr:
    self: tablename (Identifier)
what:
  self: SEARCH (KeywordSequence)
  next_keyword:
    self: INDEX (Keyword)
",
            0,
        )),
        // row access policy
        Box::new(SuccessTestCase::new(
            "\
DROP ROW ACCESS POLICY ident ON tablename;
",
            "\
self: DROP (DropRowAccessPolicyStatement)
ident:
  self: ident (Identifier)
on:
  self: ON (KeywordWithExpr)
  expr:
    self: tablename (Identifier)
semicolon:
  self: ; (Symbol)
what:
- self: ROW (Keyword)
- self: ACCESS (Keyword)
- self: POLICY (Keyword)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
DROP ROW ACCESS POLICY IF EXISTS ident ON tablename;
",
            "\
self: DROP (DropRowAccessPolicyStatement)
ident:
  self: ident (Identifier)
if_exists:
- self: IF (Keyword)
- self: EXISTS (Keyword)
on:
  self: ON (KeywordWithExpr)
  expr:
    self: tablename (Identifier)
semicolon:
  self: ; (Symbol)
what:
- self: ROW (Keyword)
- self: ACCESS (Keyword)
- self: POLICY (Keyword)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
DROP ALL ROW ACCESS POLICIES ON tablename;
",
            "\
self: DROP (DropRowAccessPolicyStatement)
on:
  self: ON (KeywordWithExpr)
  expr:
    self: tablename (Identifier)
semicolon:
  self: ; (Symbol)
what:
- self: ALL (Keyword)
- self: ROW (Keyword)
- self: ACCESS (Keyword)
- self: POLICIES (Keyword)
",
            0,
        )),
        // ----- DORP RESERVATION statement -----
        Box::new(SuccessTestCase::new(
            "\
DROP ASSIGNMENT IF EXISTS project.location.reservation.assignment
",
            "\
self: DROP (DropStatement)
ident:
  self: . (DotOperator)
  left:
    self: . (DotOperator)
    left:
      self: . (DotOperator)
      left:
        self: project (Identifier)
      right:
        self: location (Identifier)
    right:
      self: reservation (Identifier)
  right:
    self: assignment (Identifier)
if_exists:
- self: IF (Keyword)
- self: EXISTS (Keyword)
what:
  self: ASSIGNMENT (Keyword)
",
            0,
        )),
        // ----- UNDROP statement -----
        Box::new(SuccessTestCase::new(
            "\
UNDROP SCHEMA datasetname;
",
            "\
self: UNDROP (UndropStatement)
ident:
  self: datasetname (Identifier)
semicolon:
  self: ; (Symbol)
what:
  self: SCHEMA (Keyword)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
UNDROP SCHEMA IF NOT EXISTS projectname.datasetname
",
            "\
self: UNDROP (UndropStatement)
ident:
  self: . (DotOperator)
  left:
    self: projectname (Identifier)
  right:
    self: datasetname (Identifier)
if_not_exists:
- self: IF (Keyword)
- self: NOT (Keyword)
- self: EXISTS (Keyword)
what:
  self: SCHEMA (Keyword)
",
            0,
        )),
    ];
    for t in test_cases {
        t.test();
    }
}
