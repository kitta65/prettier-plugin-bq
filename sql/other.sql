----- ASSERT statement -----
assert 1 + 1 = 3;

assert
  -- break
  false
as 'description';

----- EXPORT statement -----
export data options(
  uri = 'gs://bucket/folder/*.csv',
  format = 'CSV'
) as select 1;

