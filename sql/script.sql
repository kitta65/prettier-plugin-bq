----- DECLARE statement -----
declare a int64;

declare b, c default 1;

declare
  -- break
  d,
  e
int64
default 1
;

-- parameterized data type
declare x numeric(5);

declare y bignumeric(5, 2);

----- SET statement -----
set a = 5;

set (b, c) = (1,2);

set
 -- break
  (b, c) = (select as struct 1, 2)
;

----- EXECUTE statement -----
execute immediate 'SELECT 1';

execute immediate 'SELECT ?' using 1;

execute immediate 'SELECT @a' into a using 1 as a;

execute immediate 'SELECT ?, ?'
-- break
into b, c using 1, 2;

----- BEGIN statement -----
begin
  select 1;
  select 2;
end;

begin
  select 1;
exception when error then
  select 2;
end;

begin exception when error then end;

----- IF statement -----
if true then
  select 1;
end if;

if true then
  select 1;
  select 2;
elseif true then
  select 1;
elseif true then
  select 2;
  select 3;
else
  select 1;
end if;

----- LOOP statement -----
loop select 1; end loop;

loop select 1; break; end loop;

label: loop select 1; break; end loop label;

----- WHILE statement -----
while true do
  iterate;
  leave;
  continue;
  return;
end while;

while
  1 = 1
  and 2 = 2
do
  select 1;
  select 2;
end while;

-- comment before label
label:
-- comment before while
while true do
  break;
end while;

----- transaction statement -----
begin
  begin transaction;
  commit transaction;
exception when error then
  rollback;
end;

----- RAISE statement -----
begin
exception when error then
  raise;
  raise using message = 'error';
end;

----- CALL statement -----
call mydataset.myprocedure(1);

call mydataset.myprocedure(
  -- break
  1
)
;

----- system varialbes (@@xxx) -----
begin
exception when error then
  select @@error.message;
end;

