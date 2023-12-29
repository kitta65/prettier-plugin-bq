----- CREATE MODEL statement -----
create model ident
transform (
  expr_a as alias_a,
  *,
  * except(expr_b),
)
input (a int64, b float64)
output (c string)
remote with connection ident
options (endpoint = '')
as (select 1)
;

create model ident
as (
  training_data as (select 1),
  custom_holiday as (select 1)
)
;

----- ALTER MODEL statement -----
alter model if exists ident
set options (description = "");

----- EXPORT MODEL statement -----
export model ident options(uri = '');