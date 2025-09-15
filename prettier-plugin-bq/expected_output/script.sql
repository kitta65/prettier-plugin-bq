----- DECLARE statement -----
DECLARE a INT64;

DECLARE b, c DEFAULT 1;

DECLARE
  -- break
  d,
  e
INT64
DEFAULT 1
;

-- parameterized data type
DECLARE x NUMERIC(5);

DECLARE y BIGNUMERIC(5, 2);

----- SET statement -----
SET a = 5;

SET (b, c) = (1, 2);

SET
  -- break
  (b, c) = (SELECT AS STRUCT 1, 2)
;

----- EXECUTE statement -----
EXECUTE IMMEDIATE 'SELECT 1';

EXECUTE IMMEDIATE 'SELECT ?' USING 1;

EXECUTE IMMEDIATE 'SELECT @a' INTO a USING 1 AS a;

EXECUTE IMMEDIATE 'SELECT ?, ?'
-- break
INTO
  b,
  c
USING
  1,
  2
;

----- BEGIN statement -----
BEGIN
  SELECT 1;
  SELECT 2;
END
;

BEGIN
  SELECT 1;
EXCEPTION WHEN ERROR THEN
  SELECT 2;
END
;

BEGIN
EXCEPTION WHEN ERROR THEN
END
;

----- case statement -----
CASE
  WHEN TRUE THEN
    SELECT 1;
END CASE
;

CASE
  WHEN TRUE THEN
    SELECT 1;
    SELECT 2;
  WHEN TRUE THEN
    SELECT 3;
END CASE
;

CASE expr
  WHEN 'x' THEN
    SELECT 1;
  ELSE
    SELECT 2;
END CASE
;

CASE WHEN TRUE THEN ELSE END CASE;

----- IF statement -----
IF TRUE THEN SELECT 1; END IF;

IF TRUE THEN
  SELECT 1;
  SELECT 2;
ELSEIF TRUE THEN
  SELECT 1;
ELSEIF TRUE THEN
  SELECT 2;
  SELECT 3;
ELSE
  SELECT 1;
END IF
;

----- LOOP statement -----
LOOP SELECT 1; END LOOP;

LOOP
  SELECT 1;
  BREAK;
END LOOP
;

label: LOOP
  SELECT 1;
  BREAK;
END LOOP label
;

----- REPEAT statement -----
REPEAT SELECT 1; UNTIL TRUE END REPEAT;

label: REPEAT
  SELECT 1;
  BREAK label;
UNTIL TRUE
END REPEAT label
;

----- WHILE statement -----
WHILE TRUE DO
  ITERATE;
  LEAVE;
  CONTINUE;
  RETURN;
END WHILE
;

WHILE
  1 = 1
  AND 2 = 2
DO
  SELECT 1;
  SELECT 2;
END WHILE
;

-- comment before label
-- comment before while
label: WHILE TRUE DO BREAK; END WHILE;

----- transaction statement -----
BEGIN
  BEGIN TRANSACTION;
  COMMIT TRANSACTION;
EXCEPTION WHEN ERROR THEN
  ROLLBACK;
END
;

----- FOR statement -----
FOR record IN (
  -- break
  SELECT 1
) DO
  SELECT record;
END FOR
;

label: FOR record IN (SELECT 1) DO
  BREAK label;
  BREAK label;
END FOR label
;

----- RAISE statement -----
BEGIN
EXCEPTION WHEN ERROR THEN
  RAISE;
  RAISE USING message = 'error';
END
;

----- CALL statement -----
CALL mydataset.myprocedure(1);

CALL mydataset.myprocedure(
  -- break
  1
)
;

----- system varialbes (@@xxx) -----
BEGIN
EXCEPTION WHEN ERROR THEN
  SELECT @@error.message;
END
;
