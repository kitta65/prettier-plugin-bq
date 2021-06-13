----- CREATE SCHAMA statement -----
create schema dataset_name;

create schema if not exists dataset_name
-- break
options();

----- CREATE TABLE statement -----
create table table_name (x int64);

create temporary table table_name (x int64, y int64);

create or replace table table_name (x int64 options(description = 'dummy'))
partition by _partitiondate
options(partition_expiration_days = 1);

create table if not exists table_name (x int64 not null)
cluster by x
as select 1 union all select 2;

-- EXTERNAL
create external table table_name
with partition columns
options (
  uris = ['dummy'],
  format = csv
);

create external table table_name
with partition columns (
    col1 string
)
options (
  uris = ['dummy'],
  format = csv
);

----- CREATE VIEW statement -----
create view view_name
as
  select *
  from t
;

create view view_name(uno, dos)
as select 1 one, 2 two
;

-- MATERIALIZED
create materialized view view_name
options(dummy = 'dummy')
as
  select count(*)
  from t
;

----- CREATE FUNCTION statement -----
