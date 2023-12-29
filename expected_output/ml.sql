----- CREATE MODEL statement -----
CREATE MODEL ident
TRANSFORM (expr_a AS alias_a, *, * EXCEPT (expr_b),)
INPUT (a INT64, b FLOAT64)
OUTPUT (c STRING)
REMOTE WITH CONNECTION ident
OPTIONS (endpoint = '')
AS (SELECT 1)
;

CREATE MODEL ident
AS (
  training_data AS (SELECT 1),
  custom_holiday AS (SELECT 1)
)
;

----- ALTER MODEL statement -----
ALTER MODEL IF EXISTS ident SET OPTIONS (description = "");

----- EXPORT MODEL statement -----
EXPORT MODEL ident OPTIONS (uri = '');
