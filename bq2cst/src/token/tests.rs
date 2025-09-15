use super::*;

#[test]
fn test_is_string() {
    assert!(Token::from_str0("'abc'").is_string());
    assert!(Token::from_str0("'''abc'''").is_string());
    assert!(Token::from_str0("\"abc\"").is_string());
    assert!(Token::from_str0("\"\"\"abc\"\"\"").is_string());
}

#[test]
fn test_is_identifier() {
    // valid
    assert!(Token::from_str0("`SELECT`").is_identifier());
    assert!(Token::from_str0("xxx").is_identifier());
    assert!(Token::from_str0("_xxx").is_identifier());
    assert!(Token::from_str0("__").is_identifier());
    assert!(Token::from_str0("x1").is_identifier());

    // invalid
    assert!(!Token::from_str0("SELECT").is_identifier());
    assert!(!Token::from_str0("select").is_identifier());
    assert!(!Token::from_str0("999").is_identifier());
    assert!(!Token::from_str0("").is_identifier());
}

#[test]
fn test_is_numeric() {
    // vald
    assert!(Token::from_str0("10").is_numeric());
    assert!(Token::from_str0("10e10").is_numeric());
    assert!(Token::from_str0("10e+10").is_numeric());
    assert!(Token::from_str0("10e-10").is_numeric());
    assert!(Token::from_str0(".11").is_numeric());
    assert!(Token::from_str0(".11e10").is_numeric());
    assert!(Token::from_str0(".11e+10").is_numeric());
    assert!(Token::from_str0(".11e-10").is_numeric());
    assert!(Token::from_str0("10.11").is_numeric());
    assert!(Token::from_str0("10.11E10").is_numeric());
    assert!(Token::from_str0("10.11E+10").is_numeric());
    assert!(Token::from_str0("10.11E-10").is_numeric());

    // invalid
    assert!(!Token::from_str0("e10").is_numeric());
    assert!(!Token::from_str0("xxx").is_numeric());
    assert!(!Token::from_str0("x01").is_numeric());
}

#[test]
fn test_is_comment() {
    assert!(Token::from_str0("-- comment").is_comment());
    assert!(Token::from_str0("/* xxx */").is_comment());
    assert!(Token::from_str0("/*\nxxx\n*/").is_comment());
    assert!(Token::from_str0("# xxx").is_comment());
}
