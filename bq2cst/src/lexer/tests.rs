use super::*;

trait TestCase {
    fn test(&self);
}

struct SuccessTestCase {
    code: String,
    expected_tokens: Vec<Token>,
    result_tokens: Vec<Token>,
}

impl SuccessTestCase {
    fn new(code: &str, expected_tokens_without_eof: Vec<Token>) -> SuccessTestCase {
        let code = code.to_string();
        let l = Lexer::new(code.clone());
        let tokens = l.tokenize_code();
        let result_tokens = tokens.expect("Failed to tokenize code.");
        let mut expected_tokens = expected_tokens_without_eof;
        expected_tokens.push(Token::eof());
        SuccessTestCase {
            code,
            expected_tokens,
            result_tokens,
        }
    }
}

impl TestCase for SuccessTestCase {
    fn test(&self) {
        println!(
            "========== testing ==========\n{:?}\n=============================",
            self.code
        );
        assert_eq!(self.expected_tokens.len(), self.result_tokens.len());
        for i in 0..self.expected_tokens.len() {
            assert_eq!(self.expected_tokens[i], self.result_tokens[i]);
        }
    }
}

struct ErrorTestCase {
    code: String,
    expected_error_position: [usize; 2],
    actual_error_position: [usize; 2],
}

impl ErrorTestCase {
    fn new(code: &str, expected_error_line: usize, expected_error_column: usize) -> ErrorTestCase {
        let code = code.to_string();
        let l = Lexer::new(code.clone());
        let error = match l.tokenize_code() {
            Ok(tokens) => panic!(
                "Unexpectedly successed to tokenize code.
code: {:?}
tokens: {:?}",
                code, tokens
            ),
            Err(error) => error,
        };
        ErrorTestCase {
            code,
            expected_error_position: [expected_error_line, expected_error_column],
            actual_error_position: [error.line, error.column],
        }
    }
}

impl TestCase for ErrorTestCase {
    fn test(&self) {
        println!(
            "========== testing ==========\n{:?}\n=============================",
            self.code
        );
        assert_eq!(
            self.expected_error_position[0],
            self.actual_error_position[0]
        );
        assert_eq!(
            self.expected_error_position[1],
            self.actual_error_position[1]
        );
    }
}

#[test]
fn test_tokenize_code() {
    let test_cases: Vec<Box<dyn TestCase>> = vec![
        // ----- SuccessTestCase -----
        Box::new(SuccessTestCase::new(
            "\
SELECT c1 FROM t WHERE true GROUP BY 1 ORDER BY 1;",
            vec![
                Token::from_str(1, 1, "SELECT"),
                Token::from_str(1, 8, "c1"),
                Token::from_str(1, 11, "FROM"),
                Token::from_str(1, 16, "t"),
                Token::from_str(1, 18, "WHERE"),
                Token::from_str(1, 24, "true"),
                Token::from_str(1, 29, "GROUP"),
                Token::from_str(1, 35, "BY"),
                Token::from_str(1, 38, "1"),
                Token::from_str(1, 40, "ORDER"),
                Token::from_str(1, 46, "BY"),
                Token::from_str(1, 49, "1"),
                Token::from_str(1, 50, ";"),
            ],
        )),
        // comment
        Box::new(SuccessTestCase::new(
            "\
#standardSQL
SELECT 1 /*
  comment
*/
; -- comment ",
            vec![
                Token::from_str(1, 1, "#standardSQL"),
                Token::from_str(2, 1, "SELECT"),
                Token::from_str(2, 8, "1"),
                Token::from_str(2, 10, "/*\n  comment\n*/"),
                Token::from_str(5, 1, ";"),
                Token::from_str(5, 3, "-- comment"),
            ],
        )),
        // string literal
        Box::new(SuccessTestCase::new(
            "\
SELECT
  'xxx',
  '''xxx''',
  '''
xxx
  ''',
  '\\\\',
  '''\\\\''',",
            vec![
                Token::from_str(1, 1, "SELECT"),
                Token::from_str(2, 3, "'xxx'"),
                Token::from_str(2, 8, ","),
                Token::from_str(3, 3, "'''xxx'''"),
                Token::from_str(3, 12, ","),
                Token::from_str(4, 3, "'''\nxxx\n  '''"),
                Token::from_str(6, 6, ","),
                Token::from_str(7, 3, "'\\\\'"),
                Token::from_str(7, 7, ","),
                Token::from_str(8, 3, "'''\\\\'''"),
                Token::from_str(8, 11, ","),
            ],
        )),
        Box::new(ErrorTestCase::new(
            "\
SELECT 'foo",
            1,
            12,
        )),
        Box::new(ErrorTestCase::new(
            "\
SELECT 'foo
",
            2,
            1,
        )),
        Box::new(ErrorTestCase::new(
            "\
SELECT '\\'",
            1,
            11, // unclosed string literal
        )),
        Box::new(ErrorTestCase::new(
            "\
SELECT ''''xxx''''",
            1,
            19, // unclosed string literal
        )),
        // NOTE this is wrong syntax but difficult to ditect
        // Box::new(ErrorTestCase::new(
        //     "SELECT '\\1'",
        //     1,
        //     11,
        // )),
        // string literal (raw)
        Box::new(SuccessTestCase::new(
            "\
SELECT
  r'xxx',
  r'\\1'
  r'''\\1''',
  r'\\\\',
  r'''\\\\''',
  rb'xxx',",
            vec![
                Token::from_str(1, 1, "SELECT"),
                Token::from_str(2, 3, "r"),
                Token::from_str(2, 4, "'xxx'"),
                Token::from_str(2, 9, ","),
                Token::from_str(3, 3, "r"),
                Token::from_str(3, 4, "'\\1'"),
                Token::from_str(4, 3, "r"),
                Token::from_str(4, 4, "'''\\1'''"),
                Token::from_str(4, 12, ","),
                Token::from_str(5, 3, "r"),
                Token::from_str(5, 4, "'\\\\'"),
                Token::from_str(5, 8, ","),
                Token::from_str(6, 3, "r"),
                Token::from_str(6, 4, "'''\\\\'''"),
                Token::from_str(6, 12, ","),
                Token::from_str(7, 3, "rb"),
                Token::from_str(7, 5, "'xxx'"),
                Token::from_str(7, 10, ","),
            ],
        )),
        Box::new(ErrorTestCase::new(
            "\
SELECT r'\\'",
            1,
            12, // unclosed raw string literal (not intuitive)
        )),
        Box::new(ErrorTestCase::new(
            "\
SELECT r'''\\'''",
            1,
            16, // unclosed raw string literal (not intuitive)
        )),
        // numeric literal
        Box::new(SuccessTestCase::new(
            "\
SELECT 1, 01, 1.1, .1, 1.1e+1, 1.1E-1, .1e10",
            vec![
                Token::from_str(1, 1, "SELECT"),
                Token::from_str(1, 8, "1"),
                Token::from_str(1, 9, ","),
                Token::from_str(1, 11, "01"),
                Token::from_str(1, 13, ","),
                Token::from_str(1, 15, "1.1"),
                Token::from_str(1, 18, ","),
                Token::from_str(1, 20, ".1"),
                Token::from_str(1, 22, ","),
                Token::from_str(1, 24, "1.1e+1"),
                Token::from_str(1, 30, ","),
                Token::from_str(1, 32, "1.1E-1"),
                Token::from_str(1, 38, ","),
                Token::from_str(1, 40, ".1e10"),
            ],
        )),
        // timestamp, date literal
        Box::new(SuccessTestCase::new(
            "\
SELECT date '2000-01-01', timestamp '2000-01-01'",
            vec![
                Token::from_str(1, 1, "SELECT"),
                Token::from_str(1, 8, "date"),
                Token::from_str(1, 13, "'2000-01-01'"),
                Token::from_str(1, 25, ","),
                Token::from_str(1, 27, "timestamp"),
                Token::from_str(1, 37, "'2000-01-01'"),
            ],
        )),
        // array literal
        Box::new(SuccessTestCase::new(
            "\
SELECT
  ARRAY<INT64>[1],
  ARRAY<STRUCT<INT64,INT64>>[(0,0)]",
            vec![
                Token::from_str(1, 1, "SELECT"),
                Token::from_str(2, 3, "ARRAY"),
                Token::from_str(2, 8, "<"),
                Token::from_str(2, 9, "INT64"),
                Token::from_str(2, 14, ">"),
                Token::from_str(2, 15, "["),
                Token::from_str(2, 16, "1"),
                Token::from_str(2, 17, "]"),
                Token::from_str(2, 18, ","),
                Token::from_str(3, 3, "ARRAY"),
                Token::from_str(3, 8, "<"),
                Token::from_str(3, 9, "STRUCT"),
                Token::from_str(3, 15, "<"),
                Token::from_str(3, 16, "INT64"),
                Token::from_str(3, 21, ","),
                Token::from_str(3, 22, "INT64"),
                Token::from_str(3, 27, ">"),
                Token::from_str(3, 28, ">"),
                Token::from_str(3, 29, "["),
                Token::from_str(3, 30, "("),
                Token::from_str(3, 31, "0"),
                Token::from_str(3, 32, ","),
                Token::from_str(3, 33, "0"),
                Token::from_str(3, 34, ")"),
                Token::from_str(3, 35, "]"),
            ],
        )),
        // identifier
        Box::new(SuccessTestCase::new(
            "\
SELECT _c1, `c-1`
FROM t",
            vec![
                Token::from_str(1, 1, "SELECT"),
                Token::from_str(1, 8, "_c1"),
                Token::from_str(1, 11, ","),
                Token::from_str(1, 13, "`c-1`"),
                Token::from_str(2, 1, "FROM"),
                Token::from_str(2, 6, "t"),
            ],
        )),
        Box::new(SuccessTestCase::new(
            "\
SELECT *
FROM `t_*`",
            vec![
                Token::from_str(1, 1, "SELECT"),
                Token::from_str(1, 8, "*"),
                Token::from_str(2, 1, "FROM"),
                Token::from_str(2, 6, "`t_*`"),
            ],
        )),
        // parameter
        Box::new(SuccessTestCase::new(
            "\
SELECT ?;
SELECT @param1, @`param2`;",
            vec![
                Token::from_str(1, 1, "SELECT"),
                Token::from_str(1, 8, "?"),
                Token::from_str(1, 9, ";"),
                Token::from_str(2, 1, "SELECT"),
                Token::from_str(2, 8, "@param1"),
                Token::from_str(2, 15, ","),
                Token::from_str(2, 17, "@`param2`"),
                Token::from_str(2, 26, ";"),
            ],
        )),
        Box::new(ErrorTestCase::new(
            "\
SELECT @+param;",
            1,
            9,
        )),
        // template
        Box::new(SuccessTestCase::new(
            "\
SELECT {{variable}};",
            vec![
                Token::from_str(1, 1, "SELECT"),
                Token::from_str(1, 8, "{{variable}}"),
                Token::from_str(1, 20, ";"),
            ],
        )),
        // operator
        Box::new(SuccessTestCase::new(
            "\
SELECT
  1-1+2/2*3,
  'a'||'b',
  2>>1",
            vec![
                Token::from_str(1, 1, "SELECT"),
                Token::from_str(2, 3, "1"),
                Token::from_str(2, 4, "-"),
                Token::from_str(2, 5, "1"),
                Token::from_str(2, 6, "+"),
                Token::from_str(2, 7, "2"),
                Token::from_str(2, 8, "/"),
                Token::from_str(2, 9, "2"),
                Token::from_str(2, 10, "*"),
                Token::from_str(2, 11, "3"),
                Token::from_str(2, 12, ","),
                Token::from_str(3, 3, "'a'"),
                Token::from_str(3, 6, "||"),
                Token::from_str(3, 8, "'b'"),
                Token::from_str(3, 11, ","),
                Token::from_str(4, 3, "2"),
                Token::from_str(4, 4, ">>"),
                Token::from_str(4, 6, "1"),
            ],
        )),
        // function
        Box::new(SuccessTestCase::new(
            "\
SELECT f(a1, a2)",
            vec![
                Token::from_str(1, 1, "SELECT"),
                Token::from_str(1, 8, "f"),
                Token::from_str(1, 9, "("),
                Token::from_str(1, 10, "a1"),
                Token::from_str(1, 12, ","),
                Token::from_str(1, 14, "a2"),
                Token::from_str(1, 16, ")"),
            ],
        )),
        // pipe
        Box::new(SuccessTestCase::new(
            "\
FROM table
|> SELECT column1",
            vec![
                Token::from_str(1, 1, "FROM"),
                Token::from_str(1, 6, "table"),
                Token::from_str(2, 1, "|>"),
                Token::from_str(2, 4, "SELECT"),
                Token::from_str(2, 11, "column1"),
            ],
        )),
        // MATCH_RECOGNIZE
        Box::new(SuccessTestCase::new(
            "\
FROM table
MATCH_RECOGNIZE (
  PATTERN ($ a? b?? c*? d+? e{10,@f}^)
)",
            // since `?` may be used as a positional parameter, `??` is lexed as two `?`
            vec![
                Token::from_str(1, 1, "FROM"),
                Token::from_str(1, 6, "table"),
                Token::from_str(2, 1, "MATCH_RECOGNIZE"),
                Token::from_str(2, 17, "("),
                Token::from_str(3, 3, "PATTERN"),
                Token::from_str(3, 11, "("),
                Token::from_str(3, 12, "$"),
                Token::from_str(3, 14, "a"),
                Token::from_str(3, 15, "?"),
                Token::from_str(3, 17, "b"),
                Token::from_str(3, 18, "?"),
                Token::from_str(3, 19, "?"),
                Token::from_str(3, 21, "c"),
                Token::from_str(3, 22, "*"),
                Token::from_str(3, 23, "?"),
                Token::from_str(3, 25, "d"),
                Token::from_str(3, 26, "+"),
                Token::from_str(3, 27, "?"),
                Token::from_str(3, 29, "e"),
                Token::from_str(3, 30, "{"),
                Token::from_str(3, 31, "10"),
                Token::from_str(3, 33, ","),
                Token::from_str(3, 34, "@f"),
                Token::from_str(3, 36, "}"),
                Token::from_str(3, 37, "^"),
                Token::from_str(3, 38, ")"),
                Token::from_str(4, 1, ")"),
            ],
        )),
        // empty
        Box::new(SuccessTestCase::new("", vec![])),
    ];
    for t in test_cases {
        t.test();
    }
}
