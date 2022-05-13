----- EXPORT statement -----
export data options(
  uri = 'gs://bucket/folder/*.csv',
  format = 'CSV'
) as select 1;

