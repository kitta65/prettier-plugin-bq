#[cfg(test)]
mod tests;

use crate::error::{BQ2CSTError, BQ2CSTResult};
use crate::token::Token;

pub struct Lexer {
    input: Vec<char>,
    position: usize,
    line: usize,
    column: usize,
    type_declaration_depth: usize,
    pub tokens: Vec<Token>,
}

impl Lexer {
    // ----- pub -----
    pub fn new(input: String) -> Lexer {
        let chars: Vec<char> = input.chars().collect();
        Lexer {
            input: chars,
            position: 0,
            line: 1,
            column: 1,
            type_declaration_depth: 0,
            tokens: Vec::new(),
        }
    }
    pub fn tokenize_code(mut self) -> BQ2CSTResult<Vec<Token>> {
        let mut token = self.next_token()?;
        while !token.is_none() {
            token = self.next_token()?;
        }
        self.tokens.push(Token::eof());
        Ok(self.tokens)
    }
    // ----- core -----
    fn construct_token(&mut self, line: usize, column: usize, literal: String) -> &Token {
        let token = Token::new(line, column, literal);
        self.tokens.push(token);
        &self.tokens.last().unwrap()
    }
    fn get_char(&self, offset: usize) -> Option<char> {
        if self.position + offset < self.input.len() {
            return Some(self.input[self.position + offset]);
        } else {
            return None; // EOF
        }
    }
    fn next_char(&mut self) -> BQ2CSTResult<()> {
        if self.position < self.input.len() {
            if self.input[self.position] == '\n' {
                self.column = 1;
                self.line += 1;
            } else {
                self.column += 1;
            }
            self.position += 1;
            Ok(())
        } else if self.position == self.input.len() {
            Err(BQ2CSTError::new(
                self.line,
                self.column,
                "Unexpected EOF.".to_string(),
            ))
        } else {
            panic!("Something went wrong!")
        }
    }
    fn next_token(&mut self) -> BQ2CSTResult<Option<&Token>> {
        self.skip_whitespace()?;
        let ch = match self.get_char(0) {
            Some(ch) => ch,
            None => {
                return Ok(None); // EOF
            }
        };
        let line = self.line;
        let column = self.column;
        let token = match ch {
            '.' => match self.get_char(1) {
                Some('0'..='9') => {
                    let literal = self.read_number()?;
                    self.construct_token(line, column, literal)
                }
                _ => {
                    self.next_char()?;
                    self.construct_token(line, column, ch.to_string())
                }
            },
            '#' => {
                let literal = self.read_comment()?;
                self.construct_token(line, column, literal)
            }
            // quotation
            '`' => {
                let literal = self.read_back_quoted()?;
                self.construct_token(line, column, literal)
            }
            '"' | '\'' => {
                let quote = ch;
                if self.get_char(1) == Some(quote) && self.get_char(2) == Some(quote) {
                    let literal = self.read_multiline_string()?;
                    self.construct_token(line, column, literal)
                } else {
                    let literal = self.read_string()?;
                    self.construct_token(line, column, literal)
                }
            }
            '-' => {
                if self.get_char(1) == Some('-') {
                    let literal = self.read_comment()?;
                    self.construct_token(line, column, literal)
                } else {
                    self.next_char()?;
                    self.construct_token(line, column, ch.to_string())
                }
            }
            '/' => {
                if self.get_char(1) == Some('*') {
                    let literal = self.read_multiline_comment()?;
                    self.construct_token(line, column, literal)
                } else {
                    self.next_char()?;
                    self.construct_token(line, column, ch.to_string())
                }
            }
            '|' => {
                if self.get_char(1) == Some('|') {
                    self.next_char()?;
                    self.next_char()?;
                    self.construct_token(line, column, "||".to_string())
                } else if self.get_char(1) == Some('>') {
                    self.next_char()?;
                    self.next_char()?;
                    self.construct_token(line, column, "|>".to_string())
                } else {
                    self.next_char()?;
                    self.construct_token(line, column, ch.to_string())
                }
            }
            '<' => {
                if self.get_char(1) == Some('<') {
                    self.next_char()?;
                    self.next_char()?;
                    self.construct_token(line, column, "<<".to_string())
                } else if self.get_char(1) == Some('=') {
                    self.next_char()?;
                    self.next_char()?;
                    self.construct_token(line, column, "<=".to_string())
                } else if self.get_char(1) == Some('>') {
                    self.next_char()?;
                    self.next_char()?;
                    self.construct_token(line, column, "<>".to_string())
                } else {
                    if self.tokens.last().unwrap().literal.to_uppercase() == "ARRAY"
                        || self.tokens.last().unwrap().literal.to_uppercase() == "STRUCT"
                    {
                        self.type_declaration_depth += 1;
                    }
                    self.next_char()?;
                    self.construct_token(line, column, ch.to_string())
                }
            }
            '>' => {
                if 0 < self.type_declaration_depth {
                    self.type_declaration_depth -= 1;
                    self.next_char()?;
                    self.construct_token(line, column, ch.to_string())
                } else if self.get_char(1) == Some('>') {
                    self.next_char()?;
                    self.next_char()?;
                    self.construct_token(line, column, ">>".to_string())
                } else if self.get_char(1) == Some('=') {
                    self.next_char()?;
                    self.next_char()?;
                    self.construct_token(line, column, ">=".to_string())
                } else {
                    self.next_char()?;
                    self.construct_token(line, column, ch.to_string())
                }
            }
            '=' => {
                if self.get_char(1) == Some('>') {
                    self.next_char()?;
                    self.next_char()?;
                    self.construct_token(line, column, "=>".to_string())
                } else {
                    self.next_char()?;
                    self.construct_token(line, column, ch.to_string())
                }
            }
            '!' => {
                if self.get_char(1) == Some('=') {
                    self.next_char()?;
                    self.next_char()?;
                    self.construct_token(line, column, "!=".to_string())
                } else {
                    self.next_char()?;
                    self.construct_token(line, column, ch.to_string())
                }
            }
            // parameter
            '@' => {
                let literal = self.read_parameter()?;
                self.construct_token(line, column, literal)
            }
            // template
            '{' => {
                let first_position = self.position;
                let mut count = 0;
                while self.get_char(0) == Some('{') {
                    count += 1;
                    self.next_char()?; // { ->
                }
                let after_brace = self.get_char(0);
                if count == 1
                    && (&after_brace == &Some('@')
                        || is_digit(&after_brace)
                        || after_brace == Some(','))
                {
                    // maybe it is pattern quantifier like {m,n}
                    self.construct_token(line, column, ch.to_string())
                } else {
                    let mut end = false;
                    'outer: while !end {
                        self.next_char()?;
                        for i in 0..count {
                            if self.get_char(i) != Some('}') {
                                continue 'outer;
                            };
                        }
                        end = true
                    }
                    for _ in 0..count {
                        self.next_char()?
                    } // } ->
                    let res = self.input[first_position..self.position]
                        .into_iter()
                        .collect();
                    self.construct_token(line, column, res)
                }
            }
            // int64 or float64 literal
            '0'..='9' => {
                let literal = self.read_number()?;
                self.construct_token(line, column, literal)
            }
            // other
            _ => {
                if is_valid_1st_char_of_ident(&Some(ch)) {
                    let literal = self.read_identifier()?;
                    self.construct_token(line, column, literal)
                } else {
                    self.next_char()?;
                    self.construct_token(line, column, ch.to_string())
                }
            }
        };
        Ok(Some(token))
    }
    fn skip_whitespace(&mut self) -> BQ2CSTResult<()> {
        while is_whitespace(&self.get_char(0)) {
            self.next_char()?;
        }
        Ok(())
    }
    // ----- read -----
    fn read_back_quoted(&mut self) -> BQ2CSTResult<String> {
        let quote = self.get_char(0);
        let first_position = self.position;
        self.next_char()?;
        while self.get_char(0) != quote {
            self.next_char()?;
        }
        self.next_char()?; // ' -> next_ch
        let res = self.input[first_position..self.position]
            .into_iter()
            .collect();
        Ok(res)
    }
    fn read_comment(&mut self) -> BQ2CSTResult<String> {
        let first_position = self.position;
        while !is_end_of_line(&self.get_char(0)) {
            self.next_char()?;
        }
        let res = self.input[first_position..self.position]
            .into_iter()
            .collect::<String>()
            .trim_end()
            .to_string();
        Ok(res)
    }
    fn read_identifier(&mut self) -> BQ2CSTResult<String> {
        let first_position = self.position;
        let first_char = self.get_char(0);
        if !is_valid_1st_char_of_ident(&first_char) {
            return Err(BQ2CSTError::new(
                self.line,
                self.column,
                "Invalid character as an identifier.".to_string(),
            ));
        }
        self.next_char()?;
        while is_valid_char_of_ident(&self.get_char(0)) {
            self.next_char()?;
        }
        let res = self.input[first_position..self.position]
            .into_iter()
            .collect();
        Ok(res)
    }
    fn read_multiline_comment(&mut self) -> BQ2CSTResult<String> {
        let first_position = self.position;
        while !(self.get_char(0) == Some('*') && self.get_char(1) == Some('/')) {
            self.next_char()?;
        }
        self.next_char()?; // * -> /
        self.next_char()?; // / -> next_char
        let res = self.input[first_position..self.position]
            .into_iter()
            .collect();
        Ok(res)
    }
    fn read_multiline_string(&mut self) -> BQ2CSTResult<String> {
        // NOTE '''abc''' is OK. ''''abc'''' should throw an error.
        let first_position = self.position;
        let ch = self.get_char(0);
        let mut odd_backslashes = false;
        self.next_char()?; // 1st ' -> 2nd '
        self.next_char()?; // 2nd ' -> 3rd '
        self.next_char()?; // 3rd ' ->
        loop {
            if !odd_backslashes
                && self.get_char(0) == ch
                && self.get_char(1) == ch
                && self.get_char(2) == ch
            {
                break;
            }
            if self.get_char(0) == Some('\\') {
                odd_backslashes = !odd_backslashes;
            } else {
                odd_backslashes = false;
            }
            self.next_char()?;
        }
        self.next_char()?; // 1st ' -> 2nd '
        self.next_char()?; // 2nd ' -> 3rd '
        self.next_char()?; // 3rd ' ->  next_ch
        let res = self.input[first_position..self.position]
            .into_iter()
            .collect();
        Ok(res)
    }
    fn read_number(&mut self) -> BQ2CSTResult<String> {
        let first_position = self.position;
        while is_digit(&self.get_char(0)) {
            self.next_char()?;
        } // 9 -> .
        if self.get_char(0) == Some('.') {
            self.next_char()?;
            while is_digit(&self.get_char(0)) {
                self.next_char()?;
            }
        }
        if let Some('E') | Some('e') = self.get_char(0) {
            self.next_char()?; // e -> 9, +, -
            if let Some('+') | Some('-') = self.get_char(0) {
                self.next_char()?; // +, - -> 9
            }
            while is_digit(&self.get_char(0)) {
                self.next_char()?;
            }
        }
        let res = self.input[first_position..self.position]
            .into_iter()
            .collect();
        Ok(res)
    }
    fn read_parameter(&mut self) -> BQ2CSTResult<String> {
        let first_position = self.position;
        while self.get_char(0) == Some('@') {
            self.next_char()?;
        }
        if self.get_char(0) == Some('`') {
            self.read_back_quoted()?;
        } else {
            self.read_identifier()?;
        }
        let res = self.input[first_position..self.position]
            .into_iter()
            .collect();
        Ok(res)
    }
    fn read_string(&mut self) -> BQ2CSTResult<String> {
        let quote = self.get_char(0);
        let first_position = self.position;
        let mut odd_backslashes = false;
        self.next_char()?; // " ->
        loop {
            if !odd_backslashes && self.get_char(0) == quote {
                break;
            }
            if self.get_char(0) == Some('\\') {
                odd_backslashes = !odd_backslashes;
            } else {
                odd_backslashes = false;
            }
            self.next_char()?;
        }
        self.next_char()?; // " ->
        let res = self.input[first_position..self.position]
            .into_iter()
            .collect();
        Ok(res)
    }
}

fn is_digit(ch: &Option<char>) -> bool {
    match ch {
        Some(ch) => ch.is_digit(10),
        None => false,
    }
}

fn is_end_of_line(ch: &Option<char>) -> bool {
    match ch {
        Some(ch) => ch == &'\n',
        None => true, // EOF is treated as end of line
    }
}

fn is_valid_1st_char_of_ident(ch: &Option<char>) -> bool {
    match ch {
        Some(ch) => ch.is_alphabetic() || ch == &'_',
        None => false,
    }
}

fn is_valid_char_of_ident(ch: &Option<char>) -> bool {
    match ch {
        Some(ch) => ch.is_alphabetic() || ch.is_digit(10) || ch == &'_',
        None => false,
    }
}

fn is_whitespace(ch: &Option<char>) -> bool {
    match ch {
        Some(ch) => ch.is_whitespace(), // specified in the Unicode Character Database
        None => false,                  // EOF is treated as end of line
    }
}
