----- EXPORT statement -----
export data options(
  uri = 'gs://bucket/folder/*.csv',
  format = 'CSV'
) as select 1;

----- LOAD statement -----
load data into `mydataset.tablename`
from files (
  uris = ['azure://sample.com/sample.parquet'],
  format = 'PARQUET'
)
with connection `dummy.connection`;

load data into `ident` (dt date, s string)
partition by dt
cluster by s
options (dummy = 'dummy')
from files (dummy = 'dummy')
with connection `dummy.connection`;

load data overwrite ident
from files (dummy = 'dummy')
with partition columns (x string);
