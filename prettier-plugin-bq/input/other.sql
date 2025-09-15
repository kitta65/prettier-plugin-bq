----- EXPORT statement -----
export data options(
  uri = 'gs://bucket/folder/*.csv',
  format = 'CSV'
) as select 1;

export data with connection conn
options(
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

load data overwrite ident
-- comment
overwrite partitions(_partitiontime = ts)
from files (dummy = 'dummy');

load data overwrite ident
-- comment
partitions(_partitiontime = ts)
(dt date)
from files (dummy = 'dummy');
