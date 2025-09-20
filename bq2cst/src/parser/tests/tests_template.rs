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
            // fault tolerance (comma is missing here)
            "\
{{ config() }}
SELECT 1
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
        Box::new(SuccessTestCase::new(
            "\
{# leading comment #}
SELECT 1 {# trailing comment #}
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: 1 (NumericLiteral)
  trailing_comments:
  - self: {# trailing comment #} (Comment)
leading_comments:
- self: {# leading comment #} (Comment)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
SELECT
  {% for i in range(10) %}
    {{ i }},
  {% endfor %}
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: {% for i in range(10) %} (TemplateExprStart)
  continues: []
  end:
    self: {% endfor %} (TemplateExprEnd)
  exprs:
  - self: {{ i }} (TemplateExpr)
    comma:
      self: , (Symbol)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
SELECT
  {% for i in range(10) %}
    {{ i }},
  {% endfor %}
  100,
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: {% for i in range(10) %} (TemplateExprStart)
  continues: []
  end:
    self: {% endfor %} (TemplateExprEnd)
  exprs:
  - self: {{ i }} (TemplateExpr)
    comma:
      self: , (Symbol)
- self: 100 (NumericLiteral)
  comma:
    self: , (Symbol)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
SELECT
  {% if true %}
    foo
  {% else %}
    bar
  {% endif %},
  100,
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: {% if true %} (TemplateExprStart)
  comma:
    self: , (Symbol)
  continues:
  - self: {% else %} (TemplateExprContinue)
    exprs:
    - self: bar (Identifier)
  end:
    self: {% endif %} (TemplateExprEnd)
  exprs:
  - self: foo (Identifier)
- self: 100 (NumericLiteral)
  comma:
    self: , (Symbol)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
SELECT {% block exprs %}{% endblock %}
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: {% block exprs %} (TemplateExprStart)
  continues: []
  end:
    self: {% endblock %} (TemplateExprEnd)
  exprs: []
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
SELECT
  {% for i in range(10) %}
    {% for j in range(10) %}
      {{ i }} + {{ j }},
    {% endfor %}
  {% endfor %}
  100,
",
            "\
self: SELECT (SelectStatement)
exprs:
- self: {% for i in range(10) %} (TemplateExprStart)
  continues: []
  end:
    self: {% endfor %} (TemplateExprEnd)
  exprs:
  - self: {% for j in range(10) %} (TemplateExprStart)
    continues: []
    end:
      self: {% endfor %} (TemplateExprEnd)
    exprs:
    - self: + (BinaryOperator)
      comma:
        self: , (Symbol)
      left:
        self: {{ i }} (TemplateExpr)
      right:
        self: {{ j }} (TemplateExpr)
- self: 100 (NumericLiteral)
  comma:
    self: , (Symbol)
",
            0,
        )),
    ];
    for t in test_cases {
        t.test();
    }
}
