with data as (select id, value from server1 union all select id, value from server2)
select data.id, data.value from data inner join master on data.id = master.id and data.dt = master.dt
where data.dt between date '2021-01-01' and date '2021-01-03' and data.flag = 1
order by 1,data.value desc
limit 100
