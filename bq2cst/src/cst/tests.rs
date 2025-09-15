use super::*;

#[test]
fn test_to_string() {
    let mut son = Node::new(Token::from_str0("son"), NodeType::Unknown);
    son.push_node_vec(
        "grand_children",
        vec![
            Node::new(Token::from_str0("grand_child1"), NodeType::Unknown),
            Node::new(Token::from_str0("grand_child2"), NodeType::Unknown),
        ],
    );
    let mut daughter = Node::new(Token::from_str0("daughter"), NodeType::Unknown);
    daughter.push_node_vec(
        "grand_children",
        vec![Node::new(
            Token::from_str0("grand_child3"),
            NodeType::Unknown,
        )],
    );
    let mut parent = Node::new(Token::from_str0("parent"), NodeType::Unknown);
    parent.push_node("son", son);
    parent.push_node("daughter", daughter);
    let res = format!("{}", parent.to_string());

    println!("{}", res);
    assert_eq!(
        "\
self: parent (Unknown)
daughter:
  self: daughter (Unknown)
  grand_children:
  - self: grand_child3 (Unknown)
son:
  self: son (Unknown)
  grand_children:
  - self: grand_child1 (Unknown)
  - self: grand_child2 (Unknown)
",
        res
    );
}
