----- CREATE SCHAMA statement -----
CREATE SCHEMA dataset_name ;

CREATE SCHEMA IF NOT EXISTS dataset_name
-- break
OPTIONS ()
;

----- CREATE TABLE statement -----
CREATE TABLE table_name (x INT64);

CREATE TEMP TABLE table_name (x INT64, y STRING(10));

CREATE OR REPLACE TABLE table_name (
  x INT64 OPTIONS (description = 'dummy')
)
PARTITION BY _PARTITIONDATE
OPTIONS (partition_expiration_days = 1)
;

CREATE TABLE IF NOT EXISTS table_name (
  x INT64 NOT NULL
)
CLUSTER BY x
AS SELECT 1 UNION ALL SELECT 2
;

CREATE TABLE new_table LIKE source_table;

CREATE TABLE new_table COPY source_table;

CREATE TABLE from_snap CLONE snap;

-- SNAPSHOT
CREATE SNAPSHOT TABLE snap
CLONE t FOR SYSTEM_TIME AS OF CURRENT_TIMESTAMP()
OPTIONS (description = "dummy")
;

-- EXTERNAL
CREATE EXTERNAL TABLE table_name
WITH PARTITION COLUMNS
OPTIONS (uris = ['dummy'], format = csv)
;

CREATE EXTERNAL TABLE table_name
WITH PARTITION COLUMNS (col1 STRING)
OPTIONS (uris = ['dummy'], format = csv)
;

----- CREATE VIEW statement -----
CREATE VIEW view_name AS SELECT * FROM t;

CREATE VIEW view_name (uno, dos) AS SELECT 1 AS one, 2 AS two;

-- MATERIALIZED
CREATE MATERIALIZED VIEW view_name
OPTIONS (dummy = 'dummy')
AS SELECT COUNT(*) FROM t
;

----- CREATE FUNCTION statement -----
-- sql function definition
CREATE OR REPLACE FUNCTION abc() AS ('abc');

CREATE TEMP FUNCTION abc(x INT64) AS ('abc');

CREATE FUNCTION IF NOT EXISTS abc(x ARRAY<INT64>, y ANY TYPE)
RETURNS INT64
AS ('dummy')
;

-- javascript function definition
CREATE FUNCTION abc() RETURNS INT64 LANGUAGE js OPTIONS () AS '''return 1''';

CREATE FUNCTION abc()
RETURNS INT64
DETERMINISTIC
LANGUAGE js
OPTIONS (library = ['dummy'])
AS
  '''
  // break
  return 1
'''
;

CREATE FUNCTION abc()
RETURNS INT64
NOT DETERMINISTIC
LANGUAGE js
AS '''return 1'''
;

-- TVF
CREATE TABLE FUNCTION one() AS SELECT 1 AS one;

CREATE TABLE FUNCTION one()
-- break
RETURNS TABLE<one INT64>
AS
  -- break
  SELECT 1 AS one
;

----- CREATE PROCEDURE statement -----
CREATE PROCEDURE abc() BEGIN SELECT 'abc'; END;

CREATE PROCEDURE abc(
  x INT64,
  -- break
  INOUT y INT64
)
OPTIONS (dummy = 'dummy')
BEGIN SELECT 'abc'; END
;

----- ALTER SCHEMA statement -----
ALTER SCHEMA prettier_plugin_bq_test SET OPTIONS ();

ALTER SCHEMA IF EXISTS prettier_plugin_bq_test SET OPTIONS (dummy = 'dummy');

----- ALTER TABLE statement -----
-- SET
ALTER TABLE t SET OPTIONS (dummy = 'dummy');

-- ADD COLUMN
ALTER TABLE t ADD COLUMN x INT64;

ALTER TABLE t
ADD COLUMN IF NOT EXISTS x INT64 OPTIONS (description = 'dummy'),
ADD COLUMN y STRUCT<z INT64 NOT NULL>
;

-- RENAME
ALTER TABLE IF EXISTS t1
-- break
RENAME TO t2
;

-- DROP
ALTER TABLE t
DROP COLUMN IF EXISTS int,
-- break
DROP COLUMN float
;

----- ALTER COLUMN statement -----
ALTER TABLE t
ALTER COLUMN int DROP NOT NULL
;

ALTER TABLE IF EXISTS t
ALTER COLUMN IF EXISTS int DROP NOT NULL
;

ALTER TABLE t
ALTER COLUMN IF EXISTS int
-- break
SET OPTIONS (description = 'description')
;

ALTER TABLE t
ALTER COLUMN int SET DATA TYPE NUMERIC
;

----- ALTER VIEW statement -----
ALTER VIEW example SET OPTIONS (dummy = 'dummy', description = 'abc');

-- MATERIALIZED
ALTER MATERIALIZED VIEW IF EXISTS example SET OPTIONS (dummy = 'dummy');

----- DROP statement -----
DROP TABLE example;

DROP EXTERNAL TABLE IF EXISTS example;

DROP MATERIALIZED VIEW example;

DROP SCHEMA example CASCADE;
