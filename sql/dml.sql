insert into table values(1,2);insert table values(1),(2);insert table (col) select 1;
delete table where true;delete table t where true;delete from table as t where not exists (select * from t where true);
truncate table t;
update table t set col1=1,col2=2 where true;update table1 as one set one.value=two.value from table2 as two where one.id = two.id;
update t1 set t1.flg=true from t2 inner join t3 on t2.id=t3.id where t1.id=t3.id;
merge into t using s on t.id=s.id when matched then delete;
merge dataset.t t using dataset.s s on t.id=s.id
when not matched then insert row
when not matched by target then insert (id,value) values (1,'tooLongStringToPrintInSingleLine')
when not matched by source then update set id=999
when not matched by source and true then update set id=999,value=999
;

