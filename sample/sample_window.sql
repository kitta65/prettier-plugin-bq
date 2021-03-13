select
  date_trunc('month',dt) as month
 ,date_trunc('day',dt) as day
 ,sum(price) as sum_price
 ,rank() over(
   partition by
     date_trunc('month',dt)
   order by
     sum(price) desc) as monthly_rank
from log
group by 1,2
order by 1,2
