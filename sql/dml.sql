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

----- TRUNCATE statement -----
truncate table t;

----- UPDATE statement -----
update table t set
  col1 = 1,
  col2 = 2
where true;

update table1 as one
set
  -- break
  one.value=two.value
from table2 as two
where one.id = two.id;

update t1 set
  t1.flg = true
from t2 inner join t3 on t2.id = t3.id
where true;

