declare x int64;declare x,y default 1;
set x=5;set (x,y)=(1,2);set (x,y)=(select as struct 1,2);
execute immediate 'select 1';execute immediate 'select ?,?' into x,y using 1,2;execute immediate 'select @x' into x using 1 as x;
begin select 1;select 2;end;begin select 1;exception when error then select 2;end;begin exception when error then end;