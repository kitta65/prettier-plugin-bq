with data as (select id, value from server1 union all select id, value from server2)
select data.id, data.value from data inner join master on data.id = master.id
where data.dt = date '2021-01-01'
order by 1,2 desc
limit 100
