select distinct *
from log
where
  dt between date '2020-01-01' and date '2020-01-31'
  and flgA = 1 and not flgB = 1
  and flgC in (1, 2, 3)
  and (flgD = 1 or flgF = 1)
