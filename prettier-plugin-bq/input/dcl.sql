grant `roles/bigquery.dataViewer`, `roles/bigquery.admin`
on schema project_name.dataset_name
to 'user:foo@example.com', 'user:bar@example.com'
;

revoke `roles/bigquery.admin`
on schema dataset_name
from 'user:foo@example.com', 'user:bar@example.com'
;

create capacity project.location.commitment
as json '''{
  'slot_count': 100,
  'plan': 'FLEX'
}'''
;

drop reservation if exists project.location.reservation;
