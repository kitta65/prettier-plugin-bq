----- INSERT statement -----
insert into v
-- break
values('one', 1);

insert v (str, int)
values
  ('one', 1),
  -- break
  ('two', 2)
;

insert v (str, int) select 'one', 1;

----- DELETE statement -----
delete t where true;

delete t temp where true;

delete
-- from
from /* from */ t as temp
-- break
where not exists (select * from t where true);

----- TRUNCATE -----
truncate table t;

