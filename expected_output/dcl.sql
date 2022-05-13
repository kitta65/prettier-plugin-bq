GRANT `roles/bigquery.dataViewer`, `roles/bigquery.admin`
ON SCHEMA project_name.dataset_name
TO 'user:foo@example.com', 'user:bar@example.com'
;

REVOKE `roles/bigquery.admin`
ON SCHEMA dataset_name
FROM 'user:foo@example.com', 'user:bar@example.com'
;

CREATE CAPACITY project.location.commitment
AS JSON '''{
  'slot_count': 100,
  'plan': 'FLEX'
}'''
;

DROP RESERVATION IF EXISTS project.location.reservation;
