use super::*;

#[test]
fn test_parse_code_other() {
    let test_cases = vec![
        // ----- EXPORT statement -----
        Box::new(SuccessTestCase::new(
            "\
EXPORT DATA OPTIONS(
  uri = 'gs://bucket/folder/*.csv',
  format = 'CSV'
) AS SELECT 1;
",
            "\
self: EXPORT (ExportDataStatement)
as:
  self: AS (KeywordWithStatement)
  stmt:
    self: SELECT (SelectStatement)
    exprs:
    - self: 1 (NumericLiteral)
data:
  self: DATA (Keyword)
options:
  self: OPTIONS (KeywordWithGroupedXXX)
  group:
    self: ( (GroupedExprs)
    exprs:
    - self: = (BinaryOperator)
      comma:
        self: , (Symbol)
      left:
        self: uri (Identifier)
      right:
        self: 'gs://bucket/folder/*.csv' (StringLiteral)
    - self: = (BinaryOperator)
      left:
        self: format (Identifier)
      right:
        self: 'CSV' (StringLiteral)
    rparen:
      self: ) (Symbol)
semicolon:
  self: ; (Symbol)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
EXPORT DATA
WITH CONNECTION conn
OPTIONS(
  format = 'CSV'
) AS SELECT 1
",
            "\
self: EXPORT (ExportDataStatement)
as:
  self: AS (KeywordWithStatement)
  stmt:
    self: SELECT (SelectStatement)
    exprs:
    - self: 1 (NumericLiteral)
data:
  self: DATA (Keyword)
options:
  self: OPTIONS (KeywordWithGroupedXXX)
  group:
    self: ( (GroupedExprs)
    exprs:
    - self: = (BinaryOperator)
      left:
        self: format (Identifier)
      right:
        self: 'CSV' (StringLiteral)
    rparen:
      self: ) (Symbol)
with_connection:
  self: WITH (KeywordSequence)
  next_keyword:
    self: CONNECTION (KeywordWithExpr)
    expr:
      self: conn (Identifier)
",
            0,
        )),
        // ----- LOAD statement -----
        Box::new(SuccessTestCase::new(
            "\
LOAD DATA INTO `mydataset.tablename`
FROM FILES (
  uris = ['azure://sample.com/sample.parquet'],
  format = 'PARQUET'
)
WITH CONNECTION `dummy.connection`
",
            "\
self: LOAD (LoadStatement)
connection:
  self: CONNECTION (Keyword)
connection_name:
  self: `dummy.connection` (Identifier)
data:
  self: DATA (Keyword)
files:
  self: FILES (Keyword)
from:
  self: FROM (Keyword)
from_files:
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
      - self: 'azure://sample.com/sample.parquet' (StringLiteral)
      rparen:
        self: ] (Symbol)
  - self: = (BinaryOperator)
    left:
      self: format (Identifier)
    right:
      self: 'PARQUET' (StringLiteral)
  rparen:
    self: ) (Symbol)
ident:
  self: `mydataset.tablename` (Identifier)
into:
  self: INTO (Keyword)
with:
  self: WITH (Keyword)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
LOAD DATA INTO `ident` (dt date, s STRING)
PARTITION BY dt
CLUSTER BY s
OPTIONS (dummy = 'dummy')
FROM FILES (dummy = 'dummy')
WITH CONNECTION `dummy.connection`
",
            "\
self: LOAD (LoadStatement)
clusterby:
  self: CLUSTER (XXXByExprs)
  by:
    self: BY (Keyword)
  exprs:
  - self: s (Identifier)
column_group:
  self: ( (GroupedTypeDeclarationOrConstraints)
  declarations:
  - self: dt (TypeDeclaration)
    comma:
      self: , (Symbol)
    type:
      self: date (Type)
  - self: s (TypeDeclaration)
    type:
      self: STRING (Type)
  rparen:
    self: ) (Symbol)
connection:
  self: CONNECTION (Keyword)
connection_name:
  self: `dummy.connection` (Identifier)
data:
  self: DATA (Keyword)
files:
  self: FILES (Keyword)
from:
  self: FROM (Keyword)
from_files:
  self: ( (GroupedExprs)
  exprs:
  - self: = (BinaryOperator)
    left:
      self: dummy (Identifier)
    right:
      self: 'dummy' (StringLiteral)
  rparen:
    self: ) (Symbol)
ident:
  self: `ident` (Identifier)
into:
  self: INTO (Keyword)
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
  - self: dt (Identifier)
with:
  self: WITH (Keyword)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
LOAD DATA OVERWRITE ident
FROM FILES (dummy = 'dummy')
WITH PARTITION COLUMNS (x STRING)
",
            "\
self: LOAD (LoadStatement)
data:
  self: DATA (Keyword)
files:
  self: FILES (Keyword)
from:
  self: FROM (Keyword)
from_files:
  self: ( (GroupedExprs)
  exprs:
  - self: = (BinaryOperator)
    left:
      self: dummy (Identifier)
    right:
      self: 'dummy' (StringLiteral)
  rparen:
    self: ) (Symbol)
ident:
  self: ident (Identifier)
into:
  self: OVERWRITE (Keyword)
with_partition_columns:
  self: WITH (WithPartitionColumnsClause)
  column_schema_group:
    self: ( (GroupedTypeDeclarationOrConstraints)
    declarations:
    - self: x (TypeDeclaration)
      type:
        self: STRING (Type)
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
LOAD DATA OVERWRITE ident
OVERWRITE PARTITIONS(_PARTITIONTIME = ts)
FROM FILES (dummy = 'dummy')
",
            "\
self: LOAD (LoadStatement)
data:
  self: DATA (Keyword)
files:
  self: FILES (Keyword)
from:
  self: FROM (Keyword)
from_files:
  self: ( (GroupedExprs)
  exprs:
  - self: = (BinaryOperator)
    left:
      self: dummy (Identifier)
    right:
      self: 'dummy' (StringLiteral)
  rparen:
    self: ) (Symbol)
ident:
  self: ident (Identifier)
into:
  self: OVERWRITE (Keyword)
overwrite_partitions:
  self: PARTITIONS (OverwritePartitionsClause)
  grouped_expr:
    self: ( (GroupedExpr)
    expr:
      self: = (BinaryOperator)
      left:
        self: _PARTITIONTIME (Identifier)
      right:
        self: ts (Identifier)
    rparen:
      self: ) (Symbol)
  overwrite:
    self: OVERWRITE (Keyword)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
LOAD DATA OVERWRITE ident
PARTITIONS(_PARTITIONTIME = ts)
(dt date)
FROM FILES (dummy = 'dummy')
",
            "\
self: LOAD (LoadStatement)
column_group:
  self: ( (GroupedTypeDeclarationOrConstraints)
  declarations:
  - self: dt (TypeDeclaration)
    type:
      self: date (Type)
  rparen:
    self: ) (Symbol)
data:
  self: DATA (Keyword)
files:
  self: FILES (Keyword)
from:
  self: FROM (Keyword)
from_files:
  self: ( (GroupedExprs)
  exprs:
  - self: = (BinaryOperator)
    left:
      self: dummy (Identifier)
    right:
      self: 'dummy' (StringLiteral)
  rparen:
    self: ) (Symbol)
ident:
  self: ident (Identifier)
into:
  self: OVERWRITE (Keyword)
overwrite_partitions:
  self: PARTITIONS (OverwritePartitionsClause)
  grouped_expr:
    self: ( (GroupedExpr)
    expr:
      self: = (BinaryOperator)
      left:
        self: _PARTITIONTIME (Identifier)
      right:
        self: ts (Identifier)
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
