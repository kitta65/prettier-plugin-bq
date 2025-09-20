#[cfg(test)]
mod tests;

use crate::constants;
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::sync::LazyLock;

#[derive(PartialEq, Debug, Clone, Serialize, Deserialize)]
pub struct Token {
    pub line: usize,
    pub column: usize,
    pub literal: String,
}

pub enum TemplateType {
    Expr,
    // ExprStart,
    // ExprContinue,
    // ExprEnd,
    Comment,
    // CommentStart,
    // CommentEnd,
}

static NUMBER_RE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"^([0-9]+|([0-9]*\.[0-9]+))([eE][\+\-]?[0-9]+)?$").unwrap());
static TEMPLATE_JINJA_STATEMENT: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"^\{%-?\s*(\w+)").unwrap());
static TEMPLATE_OTHER: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"^\{.").unwrap());

impl Token {
    pub fn new(line: usize, column: usize, literal: String) -> Token {
        Token {
            line,
            column,
            literal,
        }
    }
    pub fn eof() -> Token {
        // `const EOF` is not allowed
        // because of `"".to_string()`
        Token {
            line: usize::MAX,
            column: usize::MAX,
            literal: "".to_string(),
        }
    }
    pub fn get_template_type(&self) -> Option<TemplateType> {
        if self.literal.starts_with("{{") {
            return Some(TemplateType::Expr);
        } else if self.literal.starts_with("{#") {
            return Some(TemplateType::Comment);
        } else if self.literal.starts_with("{%") {
            if let Some(caps) = TEMPLATE_JINJA_STATEMENT.captures(self.literal.as_str()) {
                match &caps[1] {
                    // TODO
                    _ => return None,
                }
            }
        } else if TEMPLATE_OTHER.is_match(self.literal.as_str()) {
            // python f-string or something (actually, out of scope)
            return Some(TemplateType::Expr);
        };

        return None;
    }
    pub fn is_string(&self) -> bool {
        if self.quoted_by('"') {
            true
        } else if self.quoted_by('\'') {
            true
        } else {
            false
        }
    }
    pub fn in_(&self, vec: &Vec<&str>) -> bool {
        for v in vec {
            if self.literal.to_uppercase() == v.to_uppercase() {
                return true;
            };
        }
        false
    }
    pub fn is(&self, literal: &str) -> bool {
        self.literal.to_uppercase() == literal.to_uppercase()
    }
    pub fn is_identifier(&self) -> bool {
        if self.quoted_by('`') {
            return true;
        }
        if self.is_reserved_keyword() {
            return false;
        }
        for kw in constants::KEYWORDS.iter() {
            // `PartialEq<&str>` is implemented for String
            if self.literal.to_uppercase() == *kw {
                return false;
            }
        }
        let mut iterator = self.literal.chars();
        match iterator.next() {
            Some('a'..='z') | Some('A'..='Z') | Some('_') => (),
            _ => return false, // "", ";", ...
        }
        for i in iterator {
            match i {
                'a'..='z' | 'A'..='Z' | '0'..='9' | '_' => (),
                _ => return false,
            }
        }
        true
    }
    pub fn is_parameter(&self) -> bool {
        let mut iterator = self.literal.chars();
        match iterator.next() {
            Some('?') | Some('@') => return true,
            _ => return false,
        }
    }
    pub fn is_numeric(&self) -> bool {
        NUMBER_RE.is_match(self.literal.as_str())
    }
    pub fn is_boolean(&self) -> bool {
        self.literal.to_uppercase() == "TRUE" || self.literal.to_uppercase() == "FALSE"
    }
    pub fn is_reserved_keyword(&self) -> bool {
        for kw in constants::KEYWORDS.iter() {
            // `PartialEq<&str>` is implemented for String
            if self.literal.to_uppercase() == *kw {
                return true;
            }
        }
        false
    }
    pub fn is_comment(&self) -> bool {
        let mut iter = self.literal.chars();
        let first_char = match iter.next() {
            Some(c) => match c {
                '-' | '/' => c,
                '#' => return true,
                _ => return false,
            },
            None => return false,
        };
        let second_char = match iter.next() {
            Some(c) => c,
            None => return false,
        };
        if first_char == '-' && second_char == '-' || first_char == '/' && second_char == '*' {
            true
        } else {
            false
        }
    }
    fn quoted_by(&self, ch: char) -> bool {
        if self.literal.len() < 2 {
            return false;
        }
        // unwrap is safe because the length is longer then 2
        self.literal.chars().next().unwrap() == ch && self.literal.chars().last().unwrap() == ch
    }
}

#[cfg(test)]
impl Token {
    pub fn from_str(line: usize, column: usize, literal: &str) -> Token {
        Token {
            line,
            column,
            literal: literal.to_string(),
        }
    }
    pub fn from_str0(literal: &str) -> Token {
        Token {
            line: 0,
            column: 0,
            literal: literal.to_string(),
        }
    }
}
