use super::*;

#[test]
fn test_parse_code_other() {
    // ----- ASSERT statement -----
    let test_cases = vec![
        Box::new(SuccessTestCase::new(
            "\
ASSERT 1 + 1 = 3
",
            "\
self: ASSERT (AssertStatement)
expr:
  self: = (BinaryOperator)
  left:
    self: + (BinaryOperator)
    left:
      self: 1 (NumericLiteral)
    right:
      self: 1 (NumericLiteral)
  right:
    self: 3 (NumericLiteral)
",
            0,
        )),
        Box::new(SuccessTestCase::new(
            "\
ASSERT FALSE AS 'description'
",
            "\
self: ASSERT (AssertStatement)
as:
  self: AS (Keyword)
description:
  self: 'description' (StringLiteral)
expr:
  self: FALSE (BooleanLiteral)
",
            0,
        )),
    ];
    for t in test_cases {
        t.test();
    }
}
