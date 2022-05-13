----- EXPORT statement -----
EXPORT DATA
OPTIONS (uri = 'gs://bucket/folder/*.csv', format = 'CSV')
AS SELECT 1
;
