use super::*;
#[test]
fn test_parse_code_core() {
    let test_cases: Vec<Box<dyn TestCase>> = vec![
        Box::new(SuccessTestCase::new(
            "\
SELECT
  {{variable}},
  {variable},
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: {{variable}} (TemplateExpr)
  comma:
    self: , (Symbol)
- self: {variable} (TemplateExpr)
  comma:
    self: , (Symbol)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
-- leading comment
{{ config() }} -- trailing comment
SELECT 1
",
            "\
self: None (StandAloneExpr)
expr:
  self: {{ config() }} (TemplateExpr)
  leading_comments:
  - self: -- leading comment (Comment)
  trailing_comments:
  - self: -- trailing comment (Comment)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
{{ config() }}
SELECT 1;
{{ config() }}
SELECT 1;
",
            "\
self: None (StandAloneExpr)
expr:
  self: {{ config() }} (TemplateExpr)
",
            2,
        )),
    ];
    for t in test_cases {
        t.test();
    }
}
