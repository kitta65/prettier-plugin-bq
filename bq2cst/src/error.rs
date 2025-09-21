use crate::token::Token;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
pub struct BQ2CSTError {
    pub line: usize,
    pub column: usize,
    message: String,
}

impl BQ2CSTError {
    pub fn new(line: usize, column: usize, message: String) -> Self {
        Self {
            line,
            column,
            message,
        }
    }
    pub fn from_token(token: &Token, message: String) -> Self {
        Self {
            line: token.line,
            column: token.column,
            message,
        }
    }
}

pub type BQ2CSTResult<T> = Result<T, BQ2CSTError>;
