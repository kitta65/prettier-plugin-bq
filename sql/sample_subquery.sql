select
  case
    when score < 50 then bad
    when score < 70 then normal
    else good end as score
from (
  select dt, score
  from data
  where dt = date '2020-01-01'
) as sub
