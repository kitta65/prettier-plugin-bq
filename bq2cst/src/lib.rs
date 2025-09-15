// https://github.com/rustwasm/wasm-bindgen/issues/2882
#![allow(non_upper_case_globals)]

mod constants;
mod cst;
mod error;
mod lexer;
mod parser;
mod token;
mod types;
mod utils;

use serde::Serialize;
use serde_wasm_bindgen::Serializer;
use wasm_bindgen::prelude::*;

#[wasm_bindgen(skip_typescript)]
pub fn parse(code: String) -> Result<JsValue, JsValue> {
    utils::set_panic_hook();
    let l = lexer::Lexer::new(code);
    let s = Serializer::json_compatible();
    let mut p = parser::Parser::new(match l.tokenize_code() {
        Ok(tokens) => tokens,
        Err(bq2cst_error) => {
            return Err(bq2cst_error
                .serialize(&s)
                .expect("Problem converting error struct to json."))
        }
    });
    let stmts = match p.parse_code() {
        Ok(stmts) => stmts,
        Err(bq2cst_error) => {
            return Err(bq2cst_error
                .serialize(&s)
                .expect("Problem converting error struct to json."))
        }
    };
    Ok(stmts
        .serialize(&s)
        .expect("Problem converting stmts to json."))
}

#[wasm_bindgen(skip_typescript)]
pub fn tokenize(code: String) -> Result<JsValue, JsValue> {
    utils::set_panic_hook();
    let l = lexer::Lexer::new(code);
    let s = Serializer::json_compatible();
    let tokens = match l.tokenize_code() {
        Ok(tokens) => tokens,
        Err(bq2cst_error) => {
            return Err(bq2cst_error
                .serialize(&s)
                .expect("Problem converting error struct to json."))
        }
    };
    Ok(tokens
        .serialize(&s)
        .expect("Problem converting tokens to json."))
}
