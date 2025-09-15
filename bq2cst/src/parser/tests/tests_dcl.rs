use super::*;

#[test]
fn test_parse_code_other() {
    let test_cases = vec![
        // ----- GRANT statement -----
        Box::new(SuccessTestCase::new(
            "\
GRANT `roles/bigquery.dataViewer`, `roles/bigquery.admin`
ON SCHEMA project_name.dataset_name
TO 'user:foo@example.com', 'user:bar@example.com'
",
            "\
self: GRANT (GrantStatement)
ident:
  self: . (DotOperator)
  left:
    self: project_name (Identifier)
  right:
    self: dataset_name (Identifier)
on:
  self: ON (Keyword)
resource_type:
  self: SCHEMA (Keyword)
roles:
- self: `roles/bigquery.dataViewer` (Identifier)
  comma:
    self: , (Symbol)
- self: `roles/bigquery.admin` (Identifier)
to:
  self: TO (KeywordWithExprs)
  exprs:
  - self: 'user:foo@example.com' (StringLiteral)
    comma:
      self: , (Symbol)
  - self: 'user:bar@example.com' (StringLiteral)
",
            0,
        )),
        // ----- REVOKE statement -----
        Box::new(SuccessTestCase::new(
            "\
REVOKE `roles/bigquery.admin`
ON SCHEMA dataset_name
FROM 'user:foo@example.com', 'user:bar@example.com'
;
",
            "\
self: REVOKE (RevokeStatement)
from:
  self: FROM (KeywordWithExprs)
  exprs:
  - self: 'user:foo@example.com' (StringLiteral)
    comma:
      self: , (Symbol)
  - self: 'user:bar@example.com' (StringLiteral)
ident:
  self: dataset_name (Identifier)
on:
  self: ON (Keyword)
resource_type:
  self: SCHEMA (Keyword)
roles:
- self: `roles/bigquery.admin` (Identifier)
semicolon:
  self: ; (Symbol)
",
            0,
        )),
    ];
    for t in test_cases {
        t.test();
    }
}
