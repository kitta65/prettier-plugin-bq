// to run the following tests
// you have to run `wasm-pack test --node`

#![cfg(target_arch = "wasm32")]

use bq2cst;
use wasm_bindgen_test::*;

#[wasm_bindgen_test]
fn pass() {
    bq2cst::parse("select 1;".to_string()).expect("Failed to parse code.");
    bq2cst::tokenize("select 1;".to_string()).expect("Failed to tokenize code.");
}
