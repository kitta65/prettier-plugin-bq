----- CREATE SCHAMA statement -----
create schema dataset_name;

create schema if not exists dataset_name
-- break
options();

-- collate
create schema dataset_name default collate 'und:ci';

create schema dataset_name
-- before default
default
-- before collate
collate 'und:ci';

create external schema dataset_name with connection connection_name;

----- CREATE TABLE statement -----
create table table_name (x int64);

create table dataset-name.example (x int64);

create temporary table table_name (x int64, y string(10));

create or replace table table_name (x int64 options(description = 'dummy'))
partition by _partitiondate
options(partition_expiration_days = 1);

create table tablename (
  outer_col struct<inner_col numeric(5, 2) options(rounding_mode = 'round_half_even')>
);

create table if not exists table_name (x int64 not null)
cluster by x
as select 1 union all select 2;

create table new_table like source_table;

create table new_table copy source_table;

create table from_snap clone snap;

create table example (x string collate 'und:ci' not null);

create table example (x string)
default collate 'und:ci'
;

create table example (x string default 'hello');

create table example (
  x string,
  primary key (x),
  foreign key (x) references tablename(y) not enforced,
  constraint ident foreign key (x)
);

create table example (
  x string primary key not enforced,
  y string references tablename(col),
  z string constraint ident references tablename(col)
);

-- SNAPSHOT
create snapshot table snap
clone t for system_time as of current_timestamp()
options (description = "dummy")
;

-- SNAPSHOT
create table dataset.clone
clone t for system_time as of current_timestamp()
options (description = "dummy")
;

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

create external table dataset.new_table (
  col string
)
options (
  format = 'CSV',
  uris = ['dummy']
);

create external table dataset.new_table
with connection ident
options (dummy = 'dummy');

create external table tablename
with connection default
options (dummy = 'dummy');

-- autonomous embedding generation
create table datasetname.tablename (
  col_a string,
  col_a_embedding
    struct<result array<float64>, status string>
    generated always as (
      ai.embed(
        col_a,
        connection_id => 'conneciton_id',
        endpoint => 'endpoint'
      )
    )
    stored options(asynchronous = true),
  col_b int64
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

create view viewname(uno options(description='single'))
as select 1 one
;

create view viewname(uno options(description='single'), dos)
as select 1 one, 2 two
;

-- MATERIALIZED
create materialized view view_name
options(dummy = 'dummy')
as
  select count(*)
  from t
;

-- REPLICA
create materialized view ident1
as replica of ident2
;

----- CREATE FUNCTION statement -----
-- sql function definition
create or replace function abc() as ('abc');

create temporary function abc(x int64) as ('abc');

create function if not exists abc(x array<int64>, y any type)
returns int64
as ('dummy');

-- javascript function definition
create function abc() returns int64 language js
options()
as '''return 1''';

create function abc() returns int64 deterministic language js
options(library = ['dummy'])
as '''
  // break
  return 1
''';

create function abc() returns int64 not deterministic language js
as r'''
  // break
  return 1
''';

-- python function
create function abc() returns int64 laguage python
with connection default
options()
as '''return 1''';

-- TVF
create table function one()
as select 1 as one
;

create table function one()
-- break
returns table<one int64>
as
  -- break
  select 1 as one
;

create table function foo.bar (
  tablename table<col1 int64, col2 float64>
) as (
  select 1
);

-- remote function
create function dataset.abc()
returns int64
remote with connection `project.us.connection`
options (endpoint = 'https://region-project.cloudfunctions.net/function');

create aggregate function plus_one(n int64 not aggregate)
as (n + 1);

----- CREATE PROCEDURE statement -----
create procedure abc() begin select 'abc'; end;

create procedure abc(
  x int64,
  -- break
  inout y int64)
options(dummy = 'dummy')
begin select 'abc'; end;

-- apache spark
create procedure procedure_ident()
with connection connection_ident
options (dummy = 'dummy')
language python;

create procedure procedure_ident()
with connection connection_ident
language python as r'''
# python code
from pyspark.sql import SparkSession
''';

create procedure procedure_ident()
external security invoker
with connection connection_ident
language python as 'code';

----- CREATE ROW ACCESS POLICY statement -----
create row access policy filter_name
on t
filter using (true)
;

create or replace row access policy if not exists filter_name
on tablename
grant to ('a.example.com', 'b.example.com')
filter using (email = session_user())
;

----- CREATE SEARCH INDEX statement -----
create search index new_index on tablename(all columns);

create search index if not exists new_index
on tablename(a, b)
options (dummy = 'dummy')
;

create or replace vector index new_index
on tablename(col)
storing (a, b, c)
options (dummy = 'dummy')
;

create vector index new_index
on tablename(col)
partition by foo
options(dummy='dummy')
;

----- ALTER BI_CAPACITY statement -----
alter bi_capacity `project.region-us.default`
set options(preferred_tables = ['table1', 'table2']);

----- ALTER COLUMN statement -----
alter table t
alter column c drop default;

alter table t
alter column int drop not null;

alter table if exists t
alter column if exists int drop not null;

alter table t
alter column if exists int
-- break
set options (description = 'description')
;

alter table t
alter column int
set data type numeric
;

alter table t alter column s
set data type string collate 'und:ci'
;

alter table t alter column s
set default current_timestamp()
;

alter table t
rename column u to v
;
alter table t
rename column u to v,
rename column if exists w to x
;

----- ALTER ORGANIZATION statement -----
alter organization
set options (`region-us.default_time_zone` = 'Asia/Tokyo');

----- ALTER PROJECT statement -----
alter project
set options (
  `region-us.default_time_zone` = 'Asia/Tokyo',
  `region-us.default_job_query_timeout_ms` = 1800000
);
alter project `project-id`
set options (`region-us.default_time_zone` = 'Asia/Tokyo');

----- ALTER SCHEMA statement -----
alter reservation ident set options(plan='FLEX');

----- ALTER SCHEMA statement -----
alter schema prettier_plugin_bq_test set options();

alter schema if exists prettier_plugin_bq_test set options(dummy = 'dummy');

alter schema dataset_name set default collate 'und:ci';

alter schema dataset_name add replica replica_name;

alter schema dataset_name
-- break
drop replica replica_name;

----- ALTER TABLE statement -----
-- SET
alter table t set options (dummy='dummy');

alter table example set default collate 'und:ci';

-- ADD COLUMN
alter table t
add column x int64;

alter table t
add column if not exists x int64 options (description = 'dummy'),
add column y struct<z int64 not null>;

alter table ident add column col1 string collate 'und:ci';

-- ADD CONSTRAINT
alter table example
add primary key (a) not enforced,
add primary key (b);

alter table example
add constraint if not exists foo foreign key (a) references tablename(x),
add constraint bar foreign key (b, c) references tablename(y) not enforced,
add foreign key (d) references tablename(z);

-- RENAME
alter table if exists t1
-- break
rename to t2
;

-- DROP COLUMN
alter table t
drop column if exists int,
-- break
drop column float;

-- DROP CONSTRAINT
alter table example
drop primary key,
drop primary key if exists,
drop constraint ident;

----- ALTER VIEW statement -----
alter view example set options (
  dummy = 'dummy',
  description = 'abc'
);

alter view viewname
alter column colname set options(dummy='dummy')
;

-- MATERIALIZED
alter materialized view if exists example set options (dummy = 'dummy');

----- ALTER VECTOR INDEX statement -----
alter vector index index_name on table_name rebuild;

----- DROP statement -----
-- general
drop table example;

drop external table if exists example;

drop materialized view example;

drop schema example cascade;

drop table function prettier_plugin_bq_test.tvf;

drop search index ident on tablename;

-- row access policy
drop row access policy ident on t;

drop row access policy if exists ident on t;

drop all row access policies on t;

----- UNDROP statement -----
undrop schema datasetname;

undrop schema if not exists projectname.datasetname;
