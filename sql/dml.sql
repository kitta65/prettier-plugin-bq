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
