use super::*;
use crate::lexer::Lexer;
use difference::Changeset;

mod tests_core;
mod tests_dcl;
mod tests_ddl;
mod tests_debug;
mod tests_dml;
mod tests_ml;
mod tests_other;
mod tests_pipe;
mod tests_script;
mod tests_select;

trait TestCase {
    fn test(&self);
}

struct SuccessTestCase {
    code: String,
    expected_output: String,
    target_idx: usize,
}

impl SuccessTestCase {
    pub fn new(code: &str, expected_output: &str, target_idx: usize) -> Self {
        Self {
            code: code.to_string(),
            expected_output: expected_output.to_string(),
            target_idx,
        }
    }
}

impl TestCase for SuccessTestCase {
    fn test(&self) {
        let l = Lexer::new(self.code.clone());
        let mut p = Parser::new(l.tokenize_code().expect("Failed to tokenize code."));
        let stmts = p.parse_code().expect("Failed to parse code.");
        println!(
            "\
========== testing ==========
{}
=============================
",
            self.code.trim()
        );
        let result = stmts[self.target_idx].to_string();
        let changeset = Changeset::new(self.expected_output.as_str(), result.as_str(), "\n");
        println!("{}\n", changeset.to_string());
        assert_eq!(self.expected_output, result);
    }
}

struct ErrorTestCase {
    code: String,
    expected_error_position: [usize; 2],
    actual_error_position: [usize; 2],
}

impl ErrorTestCase {
    pub fn new(code: &str, expected_error_line: usize, expected_error_column: usize) -> Self {
        let l = Lexer::new(code.to_string());
        let mut p = Parser::new(l.tokenize_code().expect("Failed to tokenize code."));
        let error = match p.parse_code() {
            Ok(_) => panic!("Unexpectedly successed to parse code."),
            Err(e) => e,
        };
        Self {
            code: code.to_string(),
            expected_error_position: [expected_error_line, expected_error_column],
            actual_error_position: [error.line, error.column],
        }
    }
}

impl TestCase for ErrorTestCase {
    fn test(&self) {
        println!(
            "\
========== testing ==========
{}
=============================
",
            self.code.trim()
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
