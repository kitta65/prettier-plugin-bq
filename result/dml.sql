----- INSERT statement -----
INSERT v
-- break
VALUES ('one', 1)
;

INSERT v (str, int)
VALUES
  ('one', 1),
  -- break
  ('two', 2)
;

INSERT v (str, int) SELECT 'one', 1;

----- DELETE statement -----
DELETE t WHERE TRUE;

DELETE t AS temp WHERE TRUE;

DELETE t AS temp -- from /* from */
-- break
WHERE NOT EXISTS(SELECT * FROM t WHERE TRUE)
;

----- TRUNCATE statement -----
TRUNCATE TABLE t;

----- UPDATE statement -----
UPDATE table AS t SET col1 = 1, col2 = 2 WHERE TRUE;

UPDATE table1 AS one
SET
  -- break
  one.value = two.value
FROM table2 AS two
WHERE one.id = two.id
;

UPDATE t1
SET t1.flg = TRUE
FROM
  t2
  INNER JOIN t3 ON t2.id = t3.id
WHERE TRUE
;

----- MERGE statement -----
-- DELETE
MERGE t USING s ON t.id = s.id WHEN MATCHED THEN DELETE;

-- INSERT
MERGE t1 AS t
USING t2 AS s
ON t.id = s.id
WHEN NOT MATCHED THEN INSERT ROW
WHEN NOT MATCHED BY TARGET THEN INSERT (id, value) VALUES (1, 2)
;

-- UPDATE
MERGE dataset.t AS t
USING dataset.s AS s
ON t.id = s.id
WHEN NOT MATCHED BY SOURCE THEN UPDATE SET id = 999
WHEN NOT MATCHED BY SOURCE AND TRUE THEN
  -- break
  UPDATE SET id = 999, value = 999
;
