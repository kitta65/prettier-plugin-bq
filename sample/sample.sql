with data as (select dt, id, value, 1 as server from server1 union all select dt, id, value, 2 from server2)
select format_date('%Y%m%d', data.dt), sum(master.price)
from data inner join master on data.id = master.id and data.dt = master.dt
where data.dt between date '2021-01-01' and date '2021-01-03' and (data.flagA=1 or data.flagB=2)
group by data.dt
having sum(master.price) > 10000
order by 1,data.value desc
limit 100
