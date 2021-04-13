create temp function abc(x int64) as (x);create function if not exists abc(x array<int64>, y int64) returns int64 as (x+y);
create or replace function abc() as((select "tooLongToPrintInSingleLineTooLongToPrintInSingleLineTooLongToPrint"));
create function abc() returns int64 deterministic language js options(library=['dummy']) as '''return 1''';
create function abc() returns int64 language js options() as '''return 1''';
create function abc() returns int64 not deterministic language js as '''
return 1
''';
create table example (x int64);create temp table _session.example (x int64, y int64);
CREATE  or replace TABLE dataset.example(x INT64 OPTIONS(description='dummy'))
PARTITION BY _PARTITIONDATE OPTIONS(partition_expiration_days=1);
create table if not exists example (x int64 not null) cluster by x as select 1;
create view dataset.new_table as select * from dataset.old_table;
create materialized view dataset.new_table options(dummy='dummy') as select count(*) from dataset.old_table;
CREATE EXTERNAL TABLE dataset.new_table
WITH PARTITION COLUMNS
OPTIONS (
  uris=['dummy'],
  format=csv
);
CREATE EXTERNAL TABLE dataset.new_table
WITH PARTITION COLUMNS (
    col1 string
)
OPTIONS (
  uris=['dummy'],
  format=csv
);
CREATE pROCEDURE if not exists dataset.procede() BEGIN SELECT 1; END;
CREATE PROCEDURE dataset.procede(inout x int64, y int64) options(dummy='dummy') BEGIN SELECT 1; END;
create schema dataset_name;create schema dataset_name options(dummy='dummy');
alter table example set options(dummy='dummy');
alter view example set options(dummy='dummy',description='abc');
alter materialized view example set options(dummy='dummy');
alter table example add column x int64;
alter table example add column if not exists x int64 options(description='dummy'),add column y struct<z int64 not null>;
drop table example;drop external table if exists example;drop materialized view example;
drop schema dataset_name restrict;
-- end comment
