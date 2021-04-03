declare x int64;declare x,y default 1;
set x=5;set (x,y)=(1,2);set (x,y)=(select as struct 1,2);

