----- EXPORT statement -----
EXPORT DATA
OPTIONS (uri = 'gs://bucket/folder/*.csv', format = 'CSV')
AS SELECT 1
;

EXPORT DATA
WITH CONNECTION conn
OPTIONS (uri = 'gs://bucket/folder/*.csv', format = 'CSV')
AS SELECT 1
;

----- LOAD statement -----
LOAD DATA INTO `mydataset.tablename`
FROM FILES (uris = ['azure://sample.com/sample.parquet'], format = 'PARQUET')
WITH CONNECTION `dummy.connection`
;

LOAD DATA INTO `ident` (
  dt DATE,
  s STRING
)
PARTITION BY dt
CLUSTER BY s
OPTIONS (dummy = 'dummy')
FROM FILES (dummy = 'dummy')
WITH CONNECTION `dummy.connection`
;

LOAD DATA OVERWRITE ident
FROM FILES (dummy = 'dummy')
WITH PARTITION COLUMNS (x STRING)
;
