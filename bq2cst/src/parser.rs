#[cfg(test)]
mod tests;

use crate::cst::ContentType;
use crate::cst::Node;
use crate::cst::NodeType;
use crate::error::{BQ2CSTError, BQ2CSTResult};
use crate::token::Token;

#[derive(Clone)]
pub struct Parser {
    position: usize,
    leading_comment_indices: Vec<usize>,
    trailing_comment_indices: Vec<usize>,
    tokens: Vec<Token>,
}

impl Parser {
    pub fn new(tokens: Vec<Token>) -> Parser {
        let mut p = Parser {
            position: 0,
            leading_comment_indices: Vec::new(),
            trailing_comment_indices: Vec::new(),
            tokens,
        };
        while p.tokens[p.position].is_comment() {
            p.leading_comment_indices.push(p.position);
            p.position += 1;
        }
        if p.position == p.tokens.len() - 1 {
            return p; // no statement was found
        }
        let mut trailing_comment_idx = p.position + 1;
        while p.tokens[trailing_comment_idx].is_comment()
            && p.tokens[p.position].line == p.tokens[trailing_comment_idx].line
        {
            p.trailing_comment_indices.push(trailing_comment_idx);
            trailing_comment_idx += 1;
        }
        p
    }
    pub fn parse_code(&mut self) -> BQ2CSTResult<Vec<Node>> {
        let mut stmts: Vec<Node> = Vec::new();
        while !self.is_eof(0) {
            let stmt = self.parse_statement(true)?;
            stmts.push(stmt);
            self.next_token()?;
        }
        stmts.push(self.construct_node(NodeType::EOF)?);
        Ok(stmts)
    }
    // ----- core -----
    fn construct_node(&self, node_type: NodeType) -> BQ2CSTResult<Node> {
        // NOTE
        // It is possible to avoid cloning tokens (see #20)
        // but it does not improve execution time.
        let curr_token = self.get_token(0)?;
        let mut node = match node_type {
            NodeType::EOF => Node::empty(node_type),
            NodeType::Unknown => {
                let mut node = Node::new(curr_token.clone(), node_type);
                if curr_token.is_identifier() {
                    node.node_type = NodeType::Identifier;
                } else if curr_token.is_numeric() {
                    node.node_type = NodeType::NumericLiteral;
                } else if curr_token.is_string() {
                    node.node_type = NodeType::StringLiteral;
                } else if curr_token.is_boolean() {
                    node.node_type = NodeType::BooleanLiteral;
                } else if curr_token.is_parameter() {
                    node.node_type = NodeType::Parameter;
                } else if curr_token.is_template() {
                    node.node_type = NodeType::Template;
                } else if curr_token.literal.to_uppercase() == "NULL" {
                    node.node_type = NodeType::NullLiteral;
                } else if let "(" | "." = self.get_token(1)?.literal.as_str() {
                    node.node_type = NodeType::Identifier;
                }
                node
            }
            _ => Node::new(self.get_token(0)?.clone(), node_type),
        };
        // leading_comments
        let mut leading_comment_nodes = Vec::new();
        for idx in &self.leading_comment_indices {
            leading_comment_nodes.push(Node::new(self.tokens[*idx].clone(), NodeType::Comment))
        }
        if 0 < leading_comment_nodes.len() {
            node.push_node_vec("leading_comments", leading_comment_nodes);
        }
        // trailing comments
        let mut trailing_comment_nodes = Vec::new();
        for idx in &self.trailing_comment_indices {
            trailing_comment_nodes.push(Node::new(self.tokens[*idx].clone(), NodeType::Comment))
        }
        if 0 < trailing_comment_nodes.len() {
            node.push_node_vec("trailing_comments", trailing_comment_nodes);
        }
        Ok(node)
    }
    fn get_precedence(&self, offset: usize) -> BQ2CSTResult<usize> {
        // https://cloud.google.com/bigquery/docs/reference/standard-sql/operators
        // 001... - (identifier e.g. region-us)
        // 002... DATE, TIMESTAMP, r'', b'' (literal)
        // 101... [], ., ( (calling function. it's not mentioned in documentation)
        // 102... +, - , ~ (unary operator)
        // 103... *, / , ||
        // 104... +, - (binary operator)
        // 105... <<, >>
        // 106... & (bit operator)
        // 107... ^ (bit operator)
        // 108... | (bit operator)
        // 109... =, <, >, like, between, in
        // 110... NOT
        // 111... AND
        // 112... OR
        // 200... => (ST_GEOGFROMGEOJSON)
        let precedence = match self.get_token(offset)?.literal.to_uppercase().as_str() {
            // return precedence of BINARY operator
            "(" | "[" => 101,
            "." => 102, // when used with chained function call (otherwise 101)
            "*" | "/" | "||" => 103,
            "+" | "-" => 104,
            "<<" | ">>" => 105,
            "&" => 106,
            "^" => 107,
            "|" => 108,
            "=" | "<" | ">" | "<=" | ">=" | "!=" | "<>" | "LIKE" | "BETWEEN" | "IN" | "IS" => 109,
            "NOT" => match self.get_token(offset + 1)?.literal.to_uppercase().as_str() {
                "IN" | "LIKE" | "BETWEEN" => 109,
                "ENFORCED" => usize::MAX,
                _ => {
                    return Err(BQ2CSTError::from_token(
                        self.get_token(offset + 1)?,
                        format!(
                            "Expected `IN`, `LIKE` or `BETWEEN` but got: {:?}",
                            self.get_token(offset + 1)?
                        ),
                    ))
                }
            },
            "AND" => 111,
            "OR" => 112,
            "=>" => 200,
            _ => usize::MAX,
        };
        Ok(precedence)
    }
    fn get_offset_index(&self, offset: usize) -> BQ2CSTResult<usize> {
        if offset == 0 {
            return Ok(self.position);
        }
        let mut cnt = 0;
        let mut idx = self.position + 1;
        loop {
            if idx < self.tokens.len() {
                if !self.tokens[idx].is_comment() {
                    cnt += 1;
                    if offset <= cnt {
                        break;
                    }
                }
                idx += 1;
            } else {
                return Err(BQ2CSTError::from_token(
                    &self.tokens[self.tokens.len() - 1],
                    "Followed by unexpected EOF".to_string(),
                ));
            }
        }
        Ok(idx)
    }
    fn get_token(&self, offset: usize) -> BQ2CSTResult<&Token> {
        let idx = self.get_offset_index(offset)?;
        Ok(&self.tokens[idx])
    }
    fn is_eof(&self, offset: usize) -> bool {
        let idx = match self.get_offset_index(offset) {
            Ok(i) => i,
            Err(_) => return true,
        };
        self.tokens.len() - 1 <= idx
    }
    fn next_token(&mut self) -> BQ2CSTResult<()> {
        // leading comments
        self.leading_comment_indices = Vec::new();
        let next_token_idx = self.get_offset_index(1)?;
        let from_idx = match self.trailing_comment_indices.last() {
            Some(n) => *n + 1,
            None => self.position + 1,
        };
        for i in from_idx..next_token_idx {
            self.leading_comment_indices.push(i);
        }
        self.position = next_token_idx;
        // trailing comments
        self.trailing_comment_indices = Vec::new();
        let next_token_idx = match self.get_offset_index(1) {
            Ok(i) => i,
            Err(_) => return Ok(()), // already reached EOF
        };
        let mut trailing_comment_idx = self.position + 1;
        while trailing_comment_idx < next_token_idx
            && self.get_token(0)?.line == self.tokens[trailing_comment_idx].line
        {
            self.trailing_comment_indices.push(trailing_comment_idx);
            trailing_comment_idx += 1;
        }
        Ok(())
    }
    fn parse_between_operator(&mut self, left: Node) -> BQ2CSTResult<Node> {
        let precedence = self.get_precedence(0)?;
        let mut between = self.construct_node(NodeType::BetweenOperator)?;
        between.push_node("left", left);
        self.next_token()?; // BETWEEN -> expr1

        // NOTE `AND` is not parsed as binary operator because of precedence
        between.push_node(
            "right_min",
            self.parse_expr(precedence, false, false, false, true)?,
        );
        self.next_token()?; // expr1 -> AND
        between.push_node("and", self.construct_node(NodeType::Keyword)?);
        self.next_token()?; // AND -> expr2
        between.push_node(
            "right_max",
            self.parse_expr(precedence, false, false, false, true)?,
        );
        Ok(between)
    }
    fn parse_binary_operator(&mut self, left: Node) -> BQ2CSTResult<Node> {
        let precedence = self.get_precedence(0)?;
        let mut node = self.construct_node(NodeType::BinaryOperator)?;
        if self.get_token(0)?.is("IS") && self.get_token(1)?.is("NOT") {
            self.next_token()?; // IS -> NOT
            node.push_node("not", self.construct_node(NodeType::Keyword)?);
        }
        if self.get_token(1)?.in_(&vec!["ALL", "ANY", "SOME"]) {
            self.next_token()?; // -> ALL | ANY | SOME
            node.push_node("quantifier", self.construct_node(NodeType::Keyword)?);
        }
        self.next_token()?; // binary_operator -> expr
        node.push_node("left", left);
        node.push_node(
            "right",
            self.parse_expr(precedence, false, false, false, true)?,
        );
        Ok(node)
    }
    fn parse_constraint(&mut self) -> BQ2CSTResult<Node> {
        let mut res;
        if self.get_token(0)?.is("CONSTRAINT") {
            let constraint = self.construct_node(NodeType::Keyword)?;
            if self.get_token(1)?.is("IF") {
                self.next_token()?; // -> IF
                let _if_not_exists = self.parse_n_keywords(3)?;
                self.next_token()?; // -> ident
                let ident = self.parse_identifier()?;
                self.next_token()?; // ident -> PRIMARY | FOREIGN
                res = self.construct_node(NodeType::Constraint)?;
                res.push_node("constraint", constraint);
                res.push_node_vec("if_not_exists", _if_not_exists);
                res.push_node("ident", ident);
            } else {
                self.next_token()?; // -> ident
                let ident = self.parse_identifier()?;
                self.next_token()?; // ident -> PRIMARY | FOREIGN
                res = self.construct_node(NodeType::Constraint)?;
                res.push_node("constraint", constraint);
                res.push_node("ident", ident);
            }
        } else {
            res = self.construct_node(NodeType::Constraint)?;
        }
        self.next_token()?; // -> KEY
        res.push_node("key", self.construct_node(NodeType::Keyword)?);
        if self.get_token(1)?.is("(") {
            self.next_token()?; // -> (
            res.push_node("columns", self.parse_grouped_exprs(false)?);
        }
        if self.get_token(1)?.is("REFERENCES") {
            self.next_token()?; // -> REFERENCES
            let mut references = self.construct_node(NodeType::KeywordWithExpr)?;
            self.next_token()?; // -> table_ident
            references.push_node(
                "expr",
                self.parse_expr(usize::MAX, false, true, false, true)?,
            );
            res.push_node("references", references);
        }
        if self.get_token(1)?.in_(&vec!["NOT", "ENFORCED"]) {
            self.next_token()?; // -> NOT | ENFORCED
            res.push_node("enforced", self.parse_enforced()?);
        }
        return Ok(res);
    }
    fn parse_cte(&mut self) -> BQ2CSTResult<Node> {
        let mut query = self.construct_node(NodeType::WithQuery)?;
        self.next_token()?; // ident -> AS
        query.push_node("as", self.construct_node(NodeType::Keyword)?);
        self.next_token()?; // AS -> (

        let mut grouped = self.construct_node(NodeType::GroupedStatement)?;
        self.next_token()?; // ( -> SELECT | FROM
        if self.get_token(0)?.is("FROM") {
            grouped.push_node("stmt", self.parse_from_statement()?);
        } else {
            grouped.push_node("stmt", self.parse_select_statement(false, true)?);
        }
        self.next_token()?; // stmt -> )
        if !self.get_token(0)?.is(")") {
            return Err(BQ2CSTError::from_token(
                self.get_token(0)?,
                "expected )".to_string(),
            ));
        }
        grouped.push_node("rparen", self.construct_node(NodeType::Symbol)?);

        query.push_node("stmt", grouped);
        if self.get_token(1)?.literal.as_str() == "," {
            self.next_token()?; // ) -> ,
            query.push_node("comma", self.construct_node(NodeType::Symbol)?);
        };
        Ok(query)
    }
    fn parse_enforced(&mut self) -> BQ2CSTResult<Node> {
        let mut enforced;
        if self.get_token(0)?.is("NOT") {
            enforced = self.construct_node(NodeType::KeywordSequence)?;
            self.next_token()?; // -> ENFORCED
            enforced.push_node("next_keyword", self.construct_node(NodeType::Keyword)?);
        } else {
            enforced = self.construct_node(NodeType::Keyword)?;
        }
        Ok(enforced)
    }
    fn parse_expr(
        &mut self,
        precedence: usize,
        alias: bool,
        as_table: bool,
        after_dot: bool,
        order: bool,
    ) -> BQ2CSTResult<Node> {
        let mut left = if after_dot {
            self.construct_node(NodeType::Identifier)?
        } else {
            self.construct_node(NodeType::Unknown)?
        };
        if as_table {
            left = self.parse_identifier()?;
        } else if !after_dot {
            // prefix or literal
            match self.get_token(0)?.literal.to_uppercase().as_str() {
                "*" => {
                    left.node_type = NodeType::Asterisk;
                    match self.get_token(1)?.literal.to_uppercase().as_str() {
                        "REPLACE" => {
                            self.next_token()?; // * -> REPLACE
                            let mut replace =
                                self.construct_node(NodeType::KeywordWithGroupedXXX)?;
                            self.next_token()?; // REPLACE -> (
                            replace.push_node("group", self.parse_grouped_exprs(true)?);
                            left.push_node("replace", replace);
                        }
                        "EXCEPT" => {
                            self.next_token()?; // * -> except
                            let mut except =
                                self.construct_node(NodeType::KeywordWithGroupedXXX)?;
                            self.next_token()?; // except -> (
                            except.push_node("group", self.parse_grouped_exprs(false)?);
                            left.push_node("except", except);
                        }
                        _ => (),
                    }
                }
                // STRUCT
                "(" => {
                    self.next_token()?; // ( -> expr
                    let mut exprs;
                    if self.get_token(0)?.in_(&vec!["WITH", "SELECT"]) {
                        left.node_type = NodeType::GroupedStatement;
                        left.push_node("stmt", self.parse_select_statement(false, true)?);
                        self.next_token()?; // expr -> )
                        left.push_node("rparen", self.construct_node(NodeType::Symbol)?);
                    } else if self.get_token(0)?.is(")") {
                        left.node_type = NodeType::EmptyStruct;
                        left.push_node("rparen", self.construct_node(NodeType::Symbol)?);
                    } else {
                        exprs = self.parse_exprs(&vec![], true, true)?; // parse alias in the case of struct
                        if exprs.len() == 1 {
                            left.node_type = NodeType::GroupedExpr;
                            left.push_node("expr", exprs.pop().unwrap());
                        } else {
                            left.node_type = NodeType::StructLiteral;
                            left.push_node_vec("exprs", exprs);
                        }
                        self.next_token()?; // expr -> )
                        left.push_node("rparen", self.construct_node(NodeType::Symbol)?);
                    }
                }
                "STRUCT" => {
                    let type_ = self.parse_type(false, false)?;
                    self.next_token()?; // STRUCT -> (, > -> (
                    let mut struct_literal = self.construct_node(NodeType::StructLiteral)?;
                    let mut exprs = vec![];
                    while !self.get_token(1)?.is(")") {
                        self.next_token()?; // -> expr
                        let mut expr = self.parse_expr(usize::MAX, true, false, false, true)?;
                        if self.get_token(1)?.is(",") {
                            self.next_token()?; // -> ,
                            expr.push_node("comma", self.construct_node(NodeType::Symbol)?);
                        }
                        exprs.push(expr)
                    }
                    self.next_token()?; // -> )
                    struct_literal.push_node("rparen", self.construct_node(NodeType::Symbol)?);
                    struct_literal.push_node_vec("exprs", exprs);
                    struct_literal.push_node("type", type_);
                    left = struct_literal;
                }
                "RANGE" => {
                    let type_ = self.parse_type(false, false)?;
                    self.next_token()?; // > -> '[lower, upper)'
                    let mut range_literal = self.construct_node(NodeType::RangeLiteral)?;
                    range_literal.push_node("type", type_);
                    left = range_literal;
                }
                // ARRAY
                "[" => {
                    left.node_type = NodeType::ArrayLiteral;
                    self.next_token()?; // [ -> exprs
                    if self.get_token(0)?.is("]") {
                        left.push_node_vec("exprs", vec![]);
                    } else {
                        left.push_node_vec("exprs", self.parse_exprs(&vec![], false, true)?);
                        self.next_token()?; // exprs -> ]
                    }
                    left.push_node("rparen", self.construct_node(NodeType::Symbol)?);
                }
                "ARRAY" => {
                    // when used as literal
                    if !self.get_token(1)?.is("(") {
                        let type_ = self.parse_type(false, false)?;
                        self.next_token()?; // > -> [
                        let mut arr = self.construct_node(NodeType::ArrayLiteral)?;
                        self.next_token()?; // [ -> exprs | ]
                        if self.get_token(0)?.is("]") {
                            arr.push_node_vec("exprs", vec![]);
                        } else {
                            arr.push_node_vec("exprs", self.parse_exprs(&vec![], false, true)?);
                            self.next_token()?; // exprs -> ]
                        }
                        arr.push_node("rparen", self.construct_node(NodeType::Symbol)?);
                        arr.push_node("type", type_);
                        left = arr;
                    }
                }
                "-" | "+" | "~" => {
                    left.node_type = NodeType::UnaryOperator;
                    self.next_token()?; // - -> expr
                    let right = self.parse_expr(102, false, false, false, true)?;
                    left.push_node("right", right);
                }
                "DATE" | "TIME" | "DATETIME" | "TIMESTAMP" | "NUMERIC" | "BIGNUMERIC"
                | "DECIMAL" | "BIGDECIMAL" | "JSON" => {
                    if self.get_token(1)?.is_string()
                        || self.get_token(1)?.in_(&vec!["b", "r", "br", "rb"])
                            && self.get_token(2)?.is_string()
                    {
                        left.node_type = NodeType::UnaryOperator;
                        self.next_token()?; // -> expr
                        let right = self.parse_expr(002, false, false, false, true)?;
                        left.push_node("right", right);
                    }
                }
                "INTERVAL" => {
                    left.node_type = NodeType::IntervalLiteral;
                    self.next_token()?; // INTERVAL -> expr
                    let right = self.parse_expr(usize::MAX, false, false, false, true)?;
                    self.next_token()?; // expr -> HOUR
                    left.push_node("date_part", self.construct_node(NodeType::Keyword)?);
                    if self.get_token(1)?.is("TO") {
                        self.next_token()?; // -> TO
                        left.push_node("to", self.construct_node(NodeType::Keyword)?);
                        self.next_token()?; // -> date_part
                        left.push_node("to_date_part", self.construct_node(NodeType::Keyword)?);
                    }
                    left.push_node("expr", right);
                }
                "TABLE" | "MODEL" => {
                    left.node_type = NodeType::UnaryOperator;
                    self.next_token()?; // TABLE -> ident
                    let right = self.parse_expr(002, false, true, false, true)?;
                    left.push_node("right", right);
                }
                "B" | "R" | "BR" | "RB" => {
                    if self.get_token(1)?.is_string() {
                        self.next_token()?; // R -> 'string'
                        let right = self.parse_expr(001, false, false, false, true)?;
                        left.push_node("right", right);
                        left.node_type = NodeType::UnaryOperator;
                    }
                }
                "WITH" => {
                    if !self.get_token(1)?.is("(") {
                        left = self.parse_select_statement(false, true)?;
                    }
                }
                "SELECT" => {
                    // in the case of `ARRAY(SELECT 1)`
                    left = self.parse_select_statement(false, true)?;
                }
                "NOT" => {
                    self.next_token()?; // NOT -> boolean
                    let right = self.parse_expr(110, false, false, false, true)?;
                    left.push_node("right", right);
                    left.node_type = NodeType::UnaryOperator;
                }
                "CASE" => {
                    left.node_type = NodeType::CaseExpr;
                    self.next_token()?; // CASE -> expr, CASE -> when
                    if !self.get_token(0)?.is("WHEN") {
                        left.push_node(
                            "expr",
                            self.parse_expr(usize::MAX, false, false, false, true)?,
                        );
                        self.next_token()?; // expr -> WHEN
                    }
                    let mut arms = Vec::new();
                    while self.get_token(0)?.is("WHEN") {
                        let mut arm = self.construct_node(NodeType::CaseExprArm)?;
                        self.next_token()?; // WHEN -> expr
                        arm.push_node(
                            "expr",
                            self.parse_expr(usize::MAX, false, false, false, true)?,
                        );
                        self.next_token()?; // expr ->THEN
                        arm.push_node("then", self.construct_node(NodeType::Keyword)?);
                        self.next_token()?; // THEN -> result_expr
                        arm.push_node(
                            "result",
                            self.parse_expr(usize::MAX, false, false, false, true)?,
                        );
                        self.next_token()?; // -> ELSE | WHEN | END
                        arms.push(arm);
                    }
                    if self.get_token(0)?.is("ELSE") {
                        let mut else_ = self.construct_node(NodeType::CaseExprArm)?;
                        self.next_token()?; // ELSE -> result_expr
                        else_.push_node(
                            "result",
                            self.parse_expr(usize::MAX, false, false, false, true)?,
                        );
                        arms.push(else_);
                        self.next_token()?; // result_expr -> end
                    }
                    left.push_node_vec("arms", arms);
                    left.push_node("end", self.construct_node(NodeType::Keyword)?);
                }
                _ => (),
            };
        }
        // infix
        while self.get_precedence(1)? < precedence {
            match self.get_token(1)?.literal.to_uppercase().as_str() {
                "(" => {
                    let func = self.get_token(0)?.literal.to_uppercase();
                    self.next_token()?; // ident -> (
                    let mut node = self.construct_node(NodeType::CallingFunction)?;
                    if self.get_token(1)?.is("distinct") {
                        self.next_token()?; // ( -> DISTINCT
                        node.push_node("distinct", self.construct_node(NodeType::Keyword)?);
                    }
                    self.next_token()?; // ( -> args
                    node.push_node("func", left);
                    if !self.get_token(0)?.is(")") {
                        match func.as_str() {
                            "CAST" | "SAFE_CAST" => {
                                let cast_from =
                                    self.parse_expr(usize::MAX, false, false, false, true)?;
                                self.next_token()?; // expr -> AS
                                let mut as_ = self.construct_node(NodeType::CastArgument)?;
                                as_.push_node("cast_from", cast_from);
                                self.next_token()?; // -> type
                                as_.push_node("cast_to", self.parse_type(false, false)?);
                                if self.get_token(1)?.is("FORMAT") {
                                    self.next_token()?; // -> FORMAT
                                    let mut format =
                                        self.construct_node(NodeType::KeywordWithExpr)?;
                                    self.next_token()?; // -> string
                                    format.push_node(
                                        "expr",
                                        self.parse_expr(usize::MAX, false, false, false, true)?,
                                    );
                                    as_.push_node("format", format);
                                }
                                node.push_node_vec("args", vec![as_]);
                            }
                            "EXTRACT" => {
                                let datepart =
                                    self.parse_expr(usize::MAX, false, false, false, true)?;
                                self.next_token()?; // expr -> FROM
                                let mut from = self.construct_node(NodeType::ExtractArgument)?;
                                self.next_token()?; // FROM -> timestamp_expr
                                from.push_node("extract_datepart", datepart);
                                from.push_node(
                                    "extract_from",
                                    self.parse_expr(usize::MAX, false, false, false, true)?,
                                );
                                if self.get_token(1)?.is("AT") {
                                    let mut at_time_zone = Vec::new();
                                    self.next_token()?; // timestamp_expr -> AT
                                    at_time_zone.push(self.construct_node(NodeType::Keyword)?);
                                    self.next_token()?; // AT -> TIME
                                    at_time_zone.push(self.construct_node(NodeType::Keyword)?);
                                    self.next_token()?; // TIME -> ZONE
                                    at_time_zone.push(self.construct_node(NodeType::Keyword)?);
                                    from.push_node_vec("at_time_zone", at_time_zone);
                                    self.next_token()?; // ZONE -> 'UTC'
                                    from.push_node(
                                        "time_zone",
                                        self.parse_expr(usize::MAX, false, false, false, true)?,
                                    );
                                }
                                node.push_node_vec("args", vec![from]);
                            }
                            _ => {
                                node.push_node_vec(
                                    "args",
                                    self.parse_exprs(&vec![], func == "WITH", true)?,
                                );
                            }
                        }
                        if self.get_token(1)?.in_(&vec!["RESPECT", "IGNORE"]) {
                            self.next_token()?; // expr -> RESPECT, IGNORE
                            let ignore_or_respect = self.construct_node(NodeType::Keyword)?;
                            self.next_token()?; // RESPECT, IGNORE -> NULLS
                            node.push_node_vec(
                                "ignore_nulls",
                                vec![ignore_or_respect, self.construct_node(NodeType::Keyword)?],
                            );
                        }
                        if self.get_token(1)?.is("ORDER") {
                            self.next_token()?; // expr -> ORDER
                            let mut orderby = self.construct_node(NodeType::XXXByExprs)?;
                            self.next_token()?; // ORDER -> BY
                            orderby.push_node("by", self.construct_node(NodeType::Keyword)?);
                            self.next_token()?; // BY -> expr
                            orderby.push_node_vec("exprs", self.parse_exprs(&vec![], false, true)?);
                            node.push_node("orderby", orderby);
                        }
                        if self.get_token(1)?.is("LIMIT") {
                            self.next_token()?; // -> LIMIT
                            let mut limit = self.construct_node(NodeType::KeywordWithExpr)?;
                            self.next_token()?;
                            limit.push_node(
                                "expr",
                                self.parse_expr(usize::MAX, false, false, false, true)?,
                            );
                            node.push_node("limit", limit);
                        }
                        if self.get_token(1)?.is("HAVING") {
                            // TODO
                            // check if parse order is collect
                            // this block shold be placed before RESPECT/IGNORE?
                            self.next_token()?; // expr -> HAVING
                            let mut having = self.construct_node(NodeType::KeywordSequence)?;
                            self.next_token()?; // -> MAX | MIN
                            let mut max = self.construct_node(NodeType::KeywordWithExpr)?;
                            self.next_token()?; // -> expr
                            max.push_node(
                                "expr",
                                self.parse_expr(usize::MAX, false, false, false, true)?,
                            );
                            having.push_node("next_keyword", max);
                            node.push_node("having", having);
                        }
                        self.next_token()?; // expr -> )
                    }
                    node.push_node("rparen", self.construct_node(NodeType::Symbol)?);
                    if self.get_token(1)?.is("over") {
                        self.next_token()?; // ) -> OVER
                        let mut over = self.construct_node(NodeType::OverClause)?;
                        self.next_token()?; // OVER -> (, OVER -> named_expr
                        over.push_node("window", self.parse_window_expr()?);
                        node.push_node("over", over);
                    }
                    left = node;
                }
                "[" => {
                    self.next_token()?; // expr -> [
                    let mut node = self.construct_node(NodeType::AccessOperator)?;
                    node.push_node("left", left);
                    self.next_token()?; // [ -> expr
                    node.push_node(
                        "right",
                        self.parse_expr(usize::MAX, false, false, false, true)?,
                    );
                    self.next_token()?; // expr -> ]
                    node.push_node("rparen", self.construct_node(NodeType::Symbol)?);
                    left = node;
                }
                "." => {
                    self.next_token()?; // -> .
                    let mut first_node = &left;
                    while first_node.node_type == NodeType::DotOperator {
                        match first_node.children.get("left") {
                            Some(ContentType::Node(n)) => first_node = n,
                            _ => break,
                        };
                    }
                    let is_chained_function = (
                        // check left side of operator
                        first_node.node_type != NodeType::Identifier
                    ) && (
                        // check right side of operator
                        self.get_token(1)?.is("(") || self.get_token(2)?.is("(")
                    );
                    let precedence = if is_chained_function {
                        self.get_precedence(0)?
                    } else {
                        101
                    };
                    let mut dot = if is_chained_function {
                        self.construct_node(NodeType::FunctionChain)?
                    } else {
                        self.construct_node(NodeType::DotOperator)?
                    };
                    self.next_token()?; // -> identifier
                    dot.push_node("left", left);
                    if self.get_token(0)?.literal.as_str() == "*" {
                        dot.push_node(
                            "right",
                            self.parse_expr(usize::MAX, false, false, false, true)?,
                        );
                    } else {
                        // after dot true means parse as identifier
                        dot.push_node(
                            "right",
                            self.parse_expr(
                                precedence,
                                false,
                                as_table,
                                !is_chained_function,
                                true,
                            )?,
                        );
                    }
                    left = dot;
                }
                "*" | "/" | "||" | "+" | "-" | "<<" | ">>" | "&" | "^" | "|" | "=" | "<" | ">"
                | "<=" | ">=" | "<>" | "!=" | "LIKE" | "AND" | "OR" | "=>" => {
                    self.next_token()?; // expr -> binary_operator
                    left = self.parse_binary_operator(left)?;
                }
                "IS" => {
                    self.next_token()?; // expr -> IS
                    if self.get_token(1)?.is("DISTINCT")
                        || (self.get_token(1)?.is("NOT") && self.get_token(2)?.is("DISTINCT"))
                    {
                        left = self.parse_is_distinct_from_operator(left)?
                    } else {
                        left = self.parse_binary_operator(left)?
                    }
                }
                "BETWEEN" => {
                    self.next_token()?; // expr -> BETWEEN
                    left = self.parse_between_operator(left)?;
                }
                "IN" => {
                    self.next_token()?; // expr -> IN
                    left = self.parse_in_operator(left)?;
                }
                "NOT" => {
                    self.next_token()?; // expr -> NOT
                    let not = self.construct_node(NodeType::Keyword)?;
                    self.next_token()?; // NOT -> IN, LIKE, BETWEEN
                    if self.get_token(0)?.is("IN") {
                        left = self.parse_in_operator(left)?;
                        left.push_node("not", not);
                    } else if self.get_token(0)?.is("LIKE") {
                        left = self.parse_binary_operator(left)?;
                        left.push_node("not", not);
                    } else if self.get_token(0)?.is("BETWEEN") {
                        left = self.parse_between_operator(left)?;
                        left.push_node("not", not);
                    } else {
                        return Err(BQ2CSTError::from_token(
                            self.get_token(1)?,
                            format!(
                                "Expected `LIKE`, `BETWEEN` or `IN` but got: {:?}",
                                self.get_token(1)?
                            ),
                        ));
                    }
                }
                _ => {
                    return Err(BQ2CSTError::from_token(
                        self.get_token(0)?,
                        "Something went wrong.".to_string(),
                    ))
                }
            }
        }
        // alias
        if alias {
            if self.get_token(1)?.is("AS") {
                self.next_token()?; // expr -> AS
                left.push_node("as", self.construct_node(NodeType::Keyword)?);
                self.next_token()?; // AS -> alias

                // NOTE: use parse_expr instead of parse_identifier in the case of WITH(a AS 'a', a)
                left.push_node(
                    "alias",
                    self.parse_expr(usize::MAX, false, false, false, false)?,
                );
            } else if self.get_token(1)?.is_identifier() {
                self.next_token()?; // expr -> alias
                left.push_node("alias", self.construct_node(NodeType::Identifier)?);
            }
        }
        if order {
            if self.get_token(1)?.in_(&vec!["ASC", "DESC"]) {
                self.next_token()?; // expr -> ASC, DESC
                let order = self.construct_node(NodeType::Keyword)?;
                left.push_node("order", order);
            }
            if self.get_token(1)?.in_(&vec!["NULLS"])
                && self.get_token(2)?.in_(&vec!["FIRST", "LAST"])
            {
                let mut nulls_first = Vec::new();
                self.next_token()?; // ASC -> NULLS
                nulls_first.push(self.construct_node(NodeType::Keyword)?);
                self.next_token()?; // NULLS -> FIRST, LAST
                nulls_first.push(self.construct_node(NodeType::Keyword)?);
                left.push_node_vec("null_order", nulls_first);
            }
        }
        Ok(left)
    }
    fn parse_exprs(
        &mut self,
        until: &Vec<&str>,
        alias: bool,
        order: bool,
    ) -> BQ2CSTResult<Vec<Node>> {
        let mut exprs: Vec<Node> = Vec::new();
        // first expr
        let mut expr = self.parse_expr(usize::MAX, alias, false, false, order)?;
        if self.get_token(1)?.is(",") {
            self.next_token()?; // expr -> ,
            expr.push_node("comma", self.construct_node(NodeType::Symbol)?);
        } else {
            return Ok(vec![expr]);
        }
        exprs.push(expr);
        // second expr and later
        while !self.get_token(1)?.in_(until) && !self.is_eof(1) {
            self.next_token()?;
            let mut expr = self.parse_expr(usize::MAX, alias, false, false, true)?;
            if self.get_token(1)?.is(",") {
                self.next_token()?; // expr -> ,
                expr.push_node("comma", self.construct_node(NodeType::Symbol)?);
                exprs.push(expr);
            } else {
                exprs.push(expr);
                break;
            }
        }
        Ok(exprs)
    }
    fn parse_grouped_exprs(&mut self, alias: bool) -> BQ2CSTResult<Node> {
        let mut group = self.construct_node(NodeType::GroupedExprs)?;
        if !self.get_token(1)?.is(")") {
            self.next_token()?; // ( -> exprs
            group.push_node_vec("exprs", self.parse_exprs(&vec![")"], alias, true)?);
        }
        self.next_token()?; // exprs -> )
        group.push_node("rparen", self.construct_node(NodeType::Symbol)?);
        Ok(group)
    }
    fn parse_grouped_type_declaration_or_constraints(
        &mut self,
        schema: bool,
        aggregate: bool,
    ) -> BQ2CSTResult<Node> {
        let mut group = self.construct_node(NodeType::GroupedTypeDeclarationOrConstraints)?;
        self.next_token()?; // ( -> INOUT | ident | type | PRIMARY | CONSTRAING | FOREIGN
        let mut type_declarations = Vec::new();
        let marker_tokens = vec![",", ">", ")", "TYPE", "<"];
        while !self.get_token(0)?.in_(&vec![">", ")"]) {
            let mut type_declaration;
            if self.get_token(0)?.in_(&vec!["IN", "OUT", "INOUT"])
                && !self.get_token(2)?.in_(&marker_tokens)
            {
                // `self.get_token(1).is_identifier()` does not work here
                // because `INT64` is also valid identifier
                // , ... INT64,
                // > ... INT64>
                // > ... INT64)
                // <... STRUCT<> | ARRAY<>
                // TYPE... ANY TYPE
                let in_out = self.construct_node(NodeType::Keyword)?;
                self.next_token()?; // -> ident
                type_declaration = self.construct_node(NodeType::TypeDeclaration)?;
                type_declaration.push_node("in_out", in_out);
                self.next_token()?; // -> type
                type_declaration.push_node("type", self.parse_type(schema, aggregate)?);
            } else if (self.get_token(0)?.is("PRIMARY") && self.get_token(1)?.is("KEY"))
                || (self.get_token(0)?.is("FOREIGN") && self.get_token(1)?.is("KEY"))
                || (self.get_token(0)?.is("CONSTRAINT") && !self.get_token(2)?.in_(&marker_tokens))
            {
                type_declaration = self.parse_constraint()?;
            } else if !self.get_token(1)?.in_(&marker_tokens) {
                type_declaration = self.construct_node(NodeType::TypeDeclaration)?;
                self.next_token()?; // -> type
                type_declaration.push_node("type", self.parse_type(schema, aggregate)?);
            } else {
                type_declaration = Node::empty(NodeType::TypeDeclaration);
                type_declaration.push_node("type", self.parse_type(schema, aggregate)?);
            }
            self.next_token()?; //  -> , | > | )
            if self.get_token(0)?.is(",") {
                type_declaration.push_node("comma", self.construct_node(NodeType::Symbol)?);
                self.next_token()?; // , -> type
            }
            type_declarations.push(type_declaration);
        }
        if 0 < type_declarations.len() {
            group.push_node_vec("declarations", type_declarations);
        }
        group.push_node("rparen", self.construct_node(NodeType::Symbol)?);
        Ok(group)
    }
    fn parse_identifier(&mut self) -> BQ2CSTResult<Node> {
        // NOTE
        // This method is used to parse only identifier.
        // If you want to parse table function, you have to use parse_expr().
        fn parse_single_or_multi_token_identifier(parser: &mut Parser) -> BQ2CSTResult<Node> {
            let mut root = parser.construct_node(NodeType::Identifier)?;
            let mut trailing_idents = vec![];
            loop {
                let curr_token = parser.get_token(0)?;
                if curr_token.literal.chars().next().unwrap() == '`' {
                    break;
                }
                let next_token = match parser.get_token(1) {
                    Ok(n) => n,
                    Err(_) => break, // in the case of EOF
                };
                if next_token.in_(&vec![",", ".", "(", ")", ";"]) {
                    break;
                }
                if !(curr_token.literal.chars().last().unwrap() == '.')
                    && !(curr_token.line == next_token.line
                        && curr_token.column + curr_token.literal.chars().count()
                            == next_token.column)
                {
                    break;
                }
                parser.next_token()?;
                trailing_idents.push(parser.construct_node(NodeType::Identifier)?);
            }
            if trailing_idents.len() > 0 {
                root.node_type = NodeType::MultiTokenIdentifier;
                root.push_node_vec("trailing_idents", trailing_idents);
            }
            Ok(root)
        }

        let mut left = parse_single_or_multi_token_identifier(self)?;
        while self.get_token(1)?.is(".") {
            self.next_token()?; // ident -> .
            let mut operator = self.construct_node(NodeType::DotOperator)?;
            operator.push_node("left", left);
            self.next_token()?; // . -> ident
            operator.push_node("right", parse_single_or_multi_token_identifier(self)?);
            left = operator;
        }
        Ok(left)
    }
    fn parse_in_operator(&mut self, left: Node) -> BQ2CSTResult<Node> {
        let mut node = self.construct_node(NodeType::InOperator)?;
        node.push_node("left", left);
        if self.get_token(1)?.is("UNNEST") {
            self.next_token()?; // IN -> UNNEST
            let mut unnest = self.parse_expr(
                102, // NOTE 102 is a little greater than `(` (calling function)
                false, false, false, true,
            )?;
            unnest.node_type = NodeType::CallingUnnest;
            node.push_node("right", unnest);
        } else {
            self.next_token()?; // IN -> (
            if self.get_token(1)?.in_(&vec!["SELECT", "WITH"]) {
                let mut lparen = self.construct_node(NodeType::GroupedStatement)?;
                self.next_token()?; // -> SELECT | WITH
                lparen.push_node("stmt", self.parse_select_statement(false, true)?);
                self.next_token()?; // -> )
                lparen.push_node("rparen", self.construct_node(NodeType::Symbol)?);
                node.push_node("right", lparen);
            } else {
                node.push_node("right", self.parse_grouped_exprs(false)?);
            }
        }
        Ok(node)
    }
    fn parse_is_distinct_from_operator(&mut self, left: Node) -> BQ2CSTResult<Node> {
        let precedence = self.get_precedence(0)?;
        let mut node = self.construct_node(NodeType::IsDistinctFromOperator)?;
        node.push_node("left", left);
        if self.get_token(1)?.is("NOT") {
            self.next_token()?; // IS -> NOT
            node.push_node("not", self.construct_node(NodeType::Keyword)?);
        }
        self.next_token()?; // -> DISTINCT
        node.push_node("distinct", self.construct_node(NodeType::Keyword)?);
        self.next_token()?; // DISTINCT -> FROM
        node.push_node("from", self.construct_node(NodeType::Keyword)?);
        self.next_token()?; // FROM -> expr
        node.push_node(
            "right",
            self.parse_expr(precedence, false, false, false, true)?,
        );
        Ok(node)
    }
    fn parse_keyword_with_grouped_exprs(&mut self, alias: bool) -> BQ2CSTResult<Node> {
        let mut keyword = self.construct_node(NodeType::KeywordWithGroupedXXX)?;
        self.next_token()?; // keyword -> (
        keyword.push_node("group", self.parse_grouped_exprs(alias)?);
        Ok(keyword)
    }
    fn parse_keyword_with_statements(&mut self, until: &Vec<&str>) -> BQ2CSTResult<Node> {
        let mut node = self.construct_node(NodeType::KeywordWithStatements)?;
        let mut stmts = Vec::new();
        while !self.get_token(1)?.in_(until) {
            self.next_token()?; // -> stmt
            stmts.push(self.parse_statement(true)?);
        }
        node.push_node_vec("stmts", stmts);
        Ok(node)
    }
    fn parse_n_keywords(&mut self, n: usize) -> BQ2CSTResult<Vec<Node>> {
        let mut nodes = Vec::new();
        nodes.push(self.construct_node(NodeType::Keyword)?);
        for _ in 1..n {
            self.next_token()?;
            nodes.push(self.construct_node(NodeType::Keyword)?);
        }
        Ok(nodes)
    }
    fn parse_set_operator(&mut self, left: Node) -> BQ2CSTResult<Node> {
        let mut operator: Node;

        // NOTE:
        // when you modify here, also modify parse_union_pipe_operator()
        if self
            .get_token(0)?
            .in_(&vec!["INNER", "FULL", "LEFT", "OUTER"])
        {
            let mut method;
            if self.get_token(1)?.is("OUTER") {
                method = self.construct_node(NodeType::KeywordSequence)?;
                self.next_token()?; // -> OUTER
                let outer = self.construct_node(NodeType::Keyword)?;
                method.push_node("next_keyword", outer);
            } else {
                method = self.construct_node(NodeType::Keyword)?;
            }

            self.next_token()?; // -> UNION
            operator = self.construct_node(NodeType::SetOperator)?;
            operator.push_node("method", method);
        } else {
            operator = self.construct_node(NodeType::SetOperator)?;
        }
        self.next_token()?; // ALL | DISTINCT
        operator.push_node("distinct_or_all", self.construct_node(NodeType::Keyword)?);

        if self.get_token(1)?.is("BY") {
            self.next_token()?; // -> BY
            operator.push_node("by", self.parse_by_name_clause()?);
        } else if self.get_token(1)?.in_(&vec!["STRICT", "CORRESPONDING"]) {
            self.next_token()?; // -> STRICT | CORRESPONDING
            operator.push_node("corresponding", self.parse_corresponding_clause()?);
        }
        operator.push_node("left", left);
        self.next_token()?; // DISTINCT -> stmt
        operator.push_node("right", self.parse_select_statement(false, false)?);
        Ok(operator)
    }
    fn parse_statement(&mut self, semicolon: bool) -> BQ2CSTResult<Node> {
        let node = match self.get_token(0)?.literal.to_uppercase().as_str() {
            // SELECT
            "WITH" | "SELECT" | "(" => {
                // actually, it may be pipe syntax
                self.parse_select_statement(semicolon, true)?
            }
            "FROM" => self.parse_from_statement()?, // pipe syntax
            // DML
            "INSERT" => self.parse_insert_statement(semicolon)?,
            "DELETE" => self.parse_delete_statement(semicolon)?,
            "TRUNCATE" => self.parse_truncate_statement(semicolon)?,
            "UPDATE" => self.parse_update_statement(semicolon)?,
            "MERGE" => self.parse_merge_statement(semicolon)?,
            // DDL
            "CREATE" => {
                let mut offset = 1;
                loop {
                    match self.get_token(offset)?.literal.to_uppercase().as_str() {
                        "SCHEMA" => return self.parse_create_schema_statement(semicolon),
                        "TABLE" => {
                            if self.get_token(offset + 1)?.literal.to_uppercase().as_str()
                                == "FUNCTION"
                            {
                                return self.parse_create_function_statement(semicolon);
                            } else {
                                return self.parse_create_table_statement(semicolon);
                            }
                        }
                        "VIEW" => return self.parse_create_view_statement(semicolon),
                        "FUNCTION" => return self.parse_create_function_statement(semicolon),
                        "PROCEDURE" => return self.parse_create_procedure_statement(semicolon),
                        "ROW" => return self.parse_create_row_access_policy_statement(semicolon),
                        "CAPACITY" | "RESERVATION" | "ASSIGNMENT" => {
                            return self.parse_create_reservation_statement(semicolon)
                        }
                        "SEARCH" | "VECTOR" => {
                            return self.parse_create_search_index_statement(semicolon)
                        }
                        "MODEL" => return self.parse_create_model_statement(semicolon),
                        _ => {
                            offset += 1;
                            if 5 < offset {
                                break;
                            }
                        }
                    }
                }
                return Err(BQ2CSTError::from_token(
                    self.get_token(0)?,
                    format!("Expected `SCHEMA`, `TABLE`, `VIEW`, `FUNCTION`, `PROCEDURE`, 'CAPACITY', 'RESERVATION' or 'ASSIGNMENT' but not found around here: {:?}", self.get_token(0)?)
                ));
            }
            "ALTER" => {
                let mut offset = 1;
                loop {
                    match self.get_token(offset)?.literal.to_uppercase().as_str() {
                        "SCHEMA" => return self.parse_alter_schema_statement(semicolon),
                        "TABLE" => return self.parse_alter_table_statement(semicolon),
                        "COLUMN" => return self.parse_alter_column_statement(semicolon),
                        "VIEW" => return self.parse_alter_view_statement(semicolon),
                        "VECTOR" => return self.parse_alter_vector_index_statement(semicolon),
                        "ORGANIZATION" => {
                            return self.parse_alter_organization_statement(semicolon)
                        }
                        "PROJECT" => return self.parse_alter_project_statement(semicolon),
                        "BI_CAPACITY" => return self.parse_alter_bicapacity_statement(semicolon),
                        "CAPACITY" | "RESERVATION" => {
                            return self.parse_alter_reservation_statement(semicolon)
                        }
                        "MODEL" => return self.parse_alter_model_statement(semicolon),
                        _ => {
                            offset += 1;
                            if 5 < offset {
                                break;
                            }
                        }
                    }
                }
                return Err(BQ2CSTError::from_token(
                    self.get_token(0)?,
                    format!(
                        "Expected `SCHEMA`, `TABLE` or `VIEW` but not found around here: {:?}",
                        self.get_token(0)?
                    ),
                ));
            }
            "DROP" => {
                if self.get_token(1)?.in_(&vec!["ALL", "ROW"]) {
                    self.parse_drop_row_access_policy_statement(semicolon)?
                } else {
                    self.parse_drop_statement_general(semicolon)?
                }
            }
            "UNDROP" => self.parse_undrop_statement(semicolon)?,
            // DCL
            "GRANT" => self.parse_grant_statement(semicolon)?,
            "REVOKE" => self.parse_revoke_statement(semicolon)?,
            // script
            "DECLARE" => self.parse_declare_statement(semicolon)?,
            "SET" => self.parse_set_statement(semicolon)?,
            "EXECUTE" => self.parse_execute_statement(semicolon)?,
            "IF" => self.parse_if_statement(semicolon)?,
            "BEGIN" => {
                if self.get_token(1)?.in_(&vec!["TRANSACTION", ";"]) || self.is_eof(1) {
                    return Ok(self.parse_transaction_statement(semicolon)?);
                }
                self.parse_begin_statement(semicolon)?
            }
            "CASE" => self.parse_case_statement(semicolon)?,
            "LOAD" => self.parse_load_statement(semicolon)?,
            "LOOP" => self.parse_loop_statement(semicolon)?,
            "REPEAT" => self.parse_repeat_statement(semicolon)?,
            "WHILE" => self.parse_while_statement(semicolon)?,
            "BREAK" | "LEAVE" | "CONTINUE" | "ITERATE" => {
                self.parse_break_continue_statement(semicolon)?
            }
            "FOR" => self.parse_for_statement(semicolon)?,
            "COMMIT" | "ROLLBACK" => self.parse_transaction_statement(semicolon)?,
            "RAISE" => self.parse_raise_statement(semicolon)?,
            "RETURN" => self.parse_single_token_statement(semicolon)?,
            "CALL" => self.parse_call_statement(semicolon)?,
            // DEBUG
            "ASSERT" => self.parse_assert_satement(semicolon)?,
            // other
            "EXPORT" => {
                if self.get_token(1)?.is("DATA") {
                    self.parse_export_data_statement(semicolon)?
                } else {
                    self.parse_export_model_statement(semicolon)?
                }
            }
            _ => self.parse_labeled_statement(semicolon)?,
        };
        Ok(node)
    }
    fn parse_table(&mut self, root: bool) -> BQ2CSTResult<Node> {
        let mut left: Node;
        match self.get_token(0)?.literal.to_uppercase().as_str() {
            "(" => {
                let mut group;
                let mut statement_flg = false;
                let mut offset = 0;
                loop {
                    offset += 1;
                    if self.get_token(offset)?.in_(&vec!["WITH", "SELECT", "FROM"]) {
                        statement_flg = true;
                        break;
                    } else if !self.get_token(offset)?.is("(") {
                        break;
                    }
                }
                if statement_flg {
                    let org = self.clone();
                    group = match self.parse_select_statement(false, false) {
                        Ok(stmt) => stmt,

                        // maybe that is a table quoted by ()! not a select statement!
                        Err(_) => {
                            // restore original state
                            self.position = org.position;
                            self.leading_comment_indices = org.leading_comment_indices;
                            self.trailing_comment_indices = org.trailing_comment_indices;
                            self.tokens = org.tokens;

                            // retry
                            let mut group = self.construct_node(NodeType::GroupedExpr)?;
                            self.next_token()?; // ( -> table
                            group.push_node("expr", self.parse_table(true)?);
                            self.next_token()?; // -> )
                            group.push_node("rparen", self.construct_node(NodeType::Symbol)?);
                            group
                        }
                    }
                } else {
                    group = self.construct_node(NodeType::GroupedExpr)?;
                    self.next_token()?; // ( -> expr
                    group.push_node("expr", self.parse_table(true)?);
                    self.next_token()?; // table -> )
                    group.push_node("rparen", self.construct_node(NodeType::Symbol)?);
                }
                left = group;
            }
            "UNNEST" => {
                left = self.parse_expr(usize::MAX, false, false, false, true)?;
                left.node_type = NodeType::CallingUnnest;
            }
            _ => {
                // tvf or identifier
                left = self.parse_expr(usize::MAX, false, true, false, true)?;
            }
        }
        if left.node_type == NodeType::CallingFunction {
            left.node_type = NodeType::CallingTableFunction; // EXTERNAL_QUERY() is included
        }
        // alias
        // NOTE PIVOT, UNPIVOT and MATCH_RECOGNIZE are not reserved keywords
        if !(self
            .get_token(1)?
            .in_(&vec!["PIVOT", "UNPIVOT", "MATCH_RECOGNIZE"])
            && self.get_token(2)?.in_(&vec!["(", "INCLUDE", "EXCLUDE"]))
        {
            left = self.push_trailing_alias(left)?;
        }
        // FOR SYSTEM_TIME AS OF
        if self.get_token(1)?.literal.to_uppercase() == "FOR" {
            self.next_token()?; // TABLE -> FOR
            let mut for_ = self.construct_node(NodeType::ForSystemTimeAsOfClause)?;
            self.next_token()?; // FOR -> SYSTEM_TIME
            let mut system_time_as_of = Vec::new();
            system_time_as_of.push(self.construct_node(NodeType::Keyword)?);
            self.next_token()?; // SYSTEM_TIME -> AS
            system_time_as_of.push(self.construct_node(NodeType::Keyword)?);
            self.next_token()?; // AS -> OF
            system_time_as_of.push(self.construct_node(NodeType::Keyword)?);
            for_.push_node_vec("system_time_as_of", system_time_as_of);
            self.next_token()?; // OF -> timestamp
            for_.push_node(
                "expr",
                self.parse_expr(usize::MAX, false, false, false, true)?,
            );
            left.push_node("for_system_time_as_of", for_);
        }
        // WITH, OFFSET
        if self.get_token(1)?.literal.to_uppercase() == "WITH" {
            self.next_token()?; // UNNEST() -> WITH
            let mut with = self.construct_node(NodeType::WithOffsetClause)?;
            self.next_token()?; // WITH -> OFFSET
            with.push_node("offset", self.construct_node(NodeType::Keyword)?);
            if self.get_token(1)?.is("AS") {
                self.next_token()?; // OFFSET -> AS
                with.push_node("as", self.construct_node(NodeType::Keyword)?);
                self.next_token()?; // AS -> alias
                with.push_node("alias", self.construct_node(NodeType::Identifier)?);
            } else if self.get_token(1)?.is_identifier() {
                self.next_token()?; // OFFSET -> alias
                with.push_node("alias", self.construct_node(NodeType::Identifier)?);
            }
            left.push_node("with_offset", with);
        }
        // PIVOT, UNPIVOT
        if self.get_token(1)?.is("PIVOT") {
            self.next_token()?; // -> PIVOT
            let mut pivot = self.construct_node(NodeType::PivotOperator)?;
            self.next_token()?; // -> (
            pivot.push_node("config", self.parse_pivot_config_clause()?);
            pivot = self.push_trailing_alias(pivot)?;
            left.push_node("pivot", pivot);
        } else if self.get_token(1)?.is("UNPIVOT") {
            self.next_token()?; // -> UNPIVOT
            let mut unpivot = self.construct_node(NodeType::UnpivotOperator)?;
            if self.get_token(1)?.in_(&vec!["INCLUDE", "EXCLUDE"]) {
                self.next_token()?; // -> INCLUDE | EXCLUDE
                unpivot.push_node_vec("include_or_exclude_nulls", self.parse_n_keywords(2)?);
            }
            self.next_token()?; // -> (
            unpivot.push_node("config", self.parse_unpivot_config_clause()?);
            unpivot = self.push_trailing_alias(unpivot)?;
            left.push_node("unpivot", unpivot);
        } else if self.get_token(1)?.is("MATCH_RECOGNIZE") {
            self.next_token()?; // -> MATCH_RECOGNIZE
            left.push_node("match_recognize", self.parse_match_recognize_clause()?);
        }
        // TABLESAMPLE
        if self.get_token(1)?.is("tablesample") {
            // TODO check when it becomes GA
            self.next_token()?; // -> TABLESAMPLE
            let mut tablesample = self.construct_node(NodeType::TableSampleClause)?;
            self.next_token()?; // -> SYSTEM
            tablesample.push_node("system", self.construct_node(NodeType::Keyword)?);
            self.next_token()?; // -> (
            tablesample.push_node("group", self.parse_table_sample_ratio()?);
            left.push_node("tablesample", tablesample);
        }
        // JOIN
        while self.get_token(1)?.in_(&vec![
            "left", "right", "cross", "inner", "full", "join", ",",
        ]) && root
        {
            self.next_token()?; // table -> LEFT, RIGHT, INNER, CROSS, FULL, JOIN, ","
            let mut join = if self.get_token(0)?.in_(&vec!["join", ","]) {
                let join = self.construct_node(NodeType::JoinOperator)?;
                join
            } else {
                let type_ = self.construct_node(NodeType::Keyword)?;
                self.next_token()?; // join_type -> OUTER, JOIN
                if self.get_token(0)?.is("OUTER") {
                    let outer = self.construct_node(NodeType::Keyword)?;
                    self.next_token()?; // OUTER -> JOIN
                    let mut join = self.construct_node(NodeType::JoinOperator)?;
                    join.push_node("join_type", type_);
                    join.push_node("outer", outer);
                    join
                } else {
                    let mut join = self.construct_node(NodeType::JoinOperator)?;
                    join.push_node("join_type", type_);
                    join
                }
            };
            self.next_token()?; // -> table
            let right = self.parse_table(false)?;
            if self.get_token(1)?.is("on") {
                self.next_token()?; // `table` -> ON
                let mut on = self.construct_node(NodeType::KeywordWithExpr)?;
                self.next_token()?; // ON -> expr
                on.push_node(
                    "expr",
                    self.parse_expr(usize::MAX, false, false, false, true)?,
                );
                join.push_node("on", on);
            } else if self.get_token(1)?.is("using") {
                self.next_token()?; // -> USING
                join.push_node(
                    "using",
                    self.parse_expr(usize::MAX, false, false, false, true)?,
                )
            }
            join.push_node("left", left);
            join.push_node("right", right);
            left = join;
        }
        Ok(left)
    }
    fn parse_type(&mut self, schema: bool, aggregate: bool) -> BQ2CSTResult<Node> {
        let mut res = match self.get_token(0)?.literal.to_uppercase().as_str() {
            "ARRAY" | "RANGE" => {
                let mut res = self.construct_node(NodeType::Type)?;
                if self.get_token(1)?.literal.as_str() == "<" {
                    self.next_token()?; // -> <
                    let mut type_ = self.construct_node(NodeType::GroupedType)?;
                    self.next_token()?; // < -> type
                    type_.push_node("type", self.parse_type(schema, false)?);
                    self.next_token()?; // type -> >
                    type_.push_node("rparen", self.construct_node(NodeType::Symbol)?);
                    res.push_node("type_declaration", type_);
                }
                res
            }
            "STRUCT" | "TABLE" => {
                let mut res = self.construct_node(NodeType::Type)?;
                if self.get_token(1)?.literal.as_str() == "<" {
                    self.next_token()?; // STRUCT -> <
                    let mut type_ =
                        self.construct_node(NodeType::GroupedTypeDeclarationOrConstraints)?;
                    self.next_token()?; // < -> type or ident
                    let mut type_declarations = Vec::new();
                    while !self.get_token(0)?.is(">") {
                        let mut type_declaration;
                        if !self.get_token(1)?.in_(&vec![",", ">", "TYPE", "<"]) {
                            // `is_identifier` is not availabe here,
                            // because `int64` is valid identifier
                            type_declaration = self.construct_node(NodeType::TypeDeclaration)?;
                            self.next_token()?; // ident -> type
                        } else {
                            type_declaration = Node::empty(NodeType::TypeDeclaration);
                        }
                        type_declaration.push_node("type", self.parse_type(schema, false)?);
                        self.next_token()?; // type -> , or next_declaration
                        if self.get_token(0)?.is(",") {
                            type_declaration
                                .push_node("comma", self.construct_node(NodeType::Symbol)?);
                            self.next_token()?; // , -> next_declaration
                        }
                        type_declarations.push(type_declaration);
                    }
                    type_.push_node("rparen", self.construct_node(NodeType::Symbol)?);
                    type_.push_node_vec("declarations", type_declarations);
                    res.push_node("type_declaration", type_);
                }
                res
            }
            "ANY" => {
                let mut res = self.construct_node(NodeType::Type)?;
                self.next_token()?; // ANY -> TYPE
                res.push_node("type", self.construct_node(NodeType::Keyword)?);
                res
            }
            _ => {
                let mut res = self.construct_node(NodeType::Type)?;
                if self.get_token(1)?.is("(") {
                    self.next_token()?; // -> (
                    res.push_node("parameter", self.parse_grouped_exprs(false)?);
                }
                res
            }
        };
        if self.get_token(1)?.is("COLLATE") {
            // run even if schema == false
            self.next_token()?; // -> COLLATE
            let mut collate = self.construct_node(NodeType::KeywordWithExpr)?;
            self.next_token()?; // -> 'und:ci'
            collate.push_node(
                "expr",
                // parse_expr is not needed here, construct_node is enough
                self.construct_node(NodeType::StringLiteral)?,
            );
            res.push_node("collate", collate);
        }
        if self.get_token(1)?.is("CONSTRAINT") {
            self.next_token()?; // -> constraint
            let mut constraint = self.construct_node(NodeType::KeywordWithExpr)?;
            self.next_token()?; // -> ident
            constraint.push_node("expr", self.parse_identifier()?);
            res.push_node("constraint", constraint);
        }
        if self.get_token(1)?.is("PRIMARY") {
            self.next_token()?; // -> PRIMARY
            let mut primary = self.construct_node(NodeType::KeywordSequence)?;
            self.next_token()?; // -> KEY
            let key = self.construct_node(NodeType::Keyword)?;
            primary.push_node("next_keyword", key);
            res.push_node("primarykey", primary);
            if self.get_token(1)?.in_(&vec!["NOT", "ENFORCED"]) {
                self.next_token()?; // -> NOT | ENFORCED
                res.push_node("enforced", self.parse_enforced()?);
            }
        }
        if self.get_token(1)?.is("REFERENCES") {
            self.next_token()?; // -> REFERENCES
            let mut references = self.construct_node(NodeType::KeywordWithExpr)?;
            self.next_token()?; // -> ident
            let col = self.parse_expr(usize::MAX, false, true, false, true)?;
            references.push_node("expr", col);
            res.push_node("references", references);
            if self.get_token(1)?.in_(&vec!["NOT", "ENFORCED"]) {
                self.next_token()?; // -> NOT | ENFORCED
                res.push_node("enforced", self.parse_enforced()?);
            }
        }
        if schema {
            if self.get_token(1)?.is("DEFAULT") {
                self.next_token()?; // -> DEFAULT
                let mut default = self.construct_node(NodeType::KeywordWithExpr)?;
                self.next_token()?; // -> expr
                default.push_node(
                    "expr",
                    self.parse_expr(usize::MAX, false, false, false, true)?,
                );
                res.push_node("default", default);
            }
            if self.get_token(1)?.is("NOT") {
                self.next_token()?; // -> NOT
                let not_ = self.construct_node(NodeType::Keyword)?;
                self.next_token()?; // -> null
                let null = self.construct_node(NodeType::Keyword)?;
                res.push_node_vec("not_null", vec![not_, null]);
            }
            if self.get_token(1)?.is("OPTIONS") {
                self.next_token()?; // -> OPTIONS
                let options = self.parse_keyword_with_grouped_exprs(false)?;
                res.push_node("options", options);
            }
        }
        if aggregate {
            if self.get_token(1)?.is("NOT") {
                self.next_token()?; // -> NOT
                let mut not_ = self.construct_node(NodeType::KeywordSequence)?;
                self.next_token()?; // -> AGGREGATE
                let null = self.construct_node(NodeType::Keyword)?;
                not_.push_node("next_keyword", null);
                res.push_node("aggregate", not_);
            }
        }
        Ok(res)
    }
    fn parse_window_expr(&mut self) -> BQ2CSTResult<Node> {
        if self.get_token(0)?.is("(") {
            let mut window = self.construct_node(NodeType::WindowSpecification)?;
            if self.get_token(1)?.is_identifier() {
                self.next_token()?; // ( -> identifier
                window.push_node("name", self.construct_node(NodeType::Identifier)?);
            }
            if self.get_token(1)?.is("PARTITION") {
                self.next_token()?; // ( -> PARTITION
                let mut partition = self.construct_node(NodeType::XXXByExprs)?;
                self.next_token()?; // PARTITION -> BY
                partition.push_node("by", self.construct_node(NodeType::Keyword)?);
                self.next_token()?; // BY -> exprs
                partition.push_node_vec("exprs", self.parse_exprs(&vec![], false, true)?);
                window.push_node("partitionby", partition);
            }
            if self.get_token(1)?.is("ORDER") {
                self.next_token()?; // ( -> ORDER
                let mut order = self.construct_node(NodeType::XXXByExprs)?;
                self.next_token()?; // ORDER -> BY
                order.push_node("by", self.construct_node(NodeType::Keyword)?);
                self.next_token()?; // BY -> exprs
                order.push_node_vec("exprs", self.parse_exprs(&vec![], false, true)?);
                window.push_node("orderby", order);
            }
            if self.get_token(1)?.in_(&vec!["RANGE", "ROWS"]) {
                self.next_token()?; // ( -> ROWS, expr -> ROWS
                let mut frame = self.construct_node(NodeType::WindowFrameClause)?;
                if self.get_token(1)?.is("BETWEEN") {
                    // frame_between
                    self.next_token()?; // ROWS -> BETWEEN
                    frame.push_node("between", self.construct_node(NodeType::Keyword)?);
                    // start
                    self.next_token()?; // BETWEEN -> UNBOUNDED, CURRENT
                    let mut frame_start = Vec::new();
                    if self.get_token(0)?.in_(&vec!["UNBOUNDED", "CURRENT"]) {
                        frame_start.push(self.construct_node(NodeType::Keyword)?);
                    } else {
                        frame_start.push(self.parse_expr(usize::MAX, false, false, false, true)?);
                    }
                    self.next_token()?; // -> PRECEDING, ROW
                    frame_start.push(self.construct_node(NodeType::Keyword)?);
                    frame.push_node_vec("start", frame_start);
                    self.next_token()?; // -> AND
                    frame.push_node("and", self.construct_node(NodeType::Keyword)?);
                    // end
                    self.next_token()?; // AND -> UNBOUNDED, CURRENT
                    let mut frame_end = Vec::new();
                    if self.get_token(0)?.in_(&vec!["UNBOUNDED", "CURRENT"]) {
                        frame_end.push(self.construct_node(NodeType::Keyword)?);
                    } else {
                        frame_end.push(self.parse_expr(usize::MAX, false, false, false, true)?);
                    }
                    self.next_token()?; // -> FOLLOWING, ROW
                    frame_end.push(self.construct_node(NodeType::Keyword)?);
                    frame.push_node_vec("end", frame_end);
                } else {
                    // frame_start
                    if !self.get_token(1)?.is(")") {
                        self.next_token()?; // ROWS -> UNBOUNDED, CURRENT
                        let mut frame_start = Vec::new();
                        if self.get_token(0)?.in_(&vec!["UNBOUNDED", "CURRENT"]) {
                            frame_start.push(self.construct_node(NodeType::Keyword)?);
                        } else {
                            frame_start.push(self.parse_expr(
                                usize::MAX,
                                false,
                                false,
                                false,
                                true,
                            )?);
                        }
                        self.next_token()?; // -> PRECEDING, ROW
                        frame_start.push(self.construct_node(NodeType::Keyword)?);
                        frame.push_node_vec("start", frame_start);
                    }
                }
                window.push_node("frame", frame)
            }
            self.next_token()?; // -> )
            window.push_node("rparen", self.construct_node(NodeType::Symbol)?);
            Ok(window)
        } else {
            Ok(self.construct_node(NodeType::Identifier)?)
        }
    }
    fn parse_with_connection_clause(&mut self) -> BQ2CSTResult<Node> {
        let mut with = self.construct_node(NodeType::KeywordSequence)?;
        self.next_token()?; // -> CONNECTION
        let mut connection = self.construct_node(NodeType::KeywordWithExpr)?;
        self.next_token()?; // -> ident | DEFAULT
        if self.get_token(0)?.is("DEFAULT") {
            connection.push_node("expr", self.construct_node(NodeType::Keyword)?);
        } else {
            connection.push_node("expr", self.parse_identifier()?);
        }
        with.push_node("next_keyword", connection);
        Ok(with)
    }
    fn parse_with_clause(&mut self) -> BQ2CSTResult<Node> {
        let mut with = self.construct_node(NodeType::WithClause)?;
        if self.get_token(1)?.is("RECURSIVE") {
            self.next_token()?; // -> RECURSIVE
            with.push_node("recursive", self.construct_node(NodeType::Keyword)?);
        }
        let mut queries = Vec::new();
        while self.get_token(1)?.literal.to_uppercase() != "SELECT"
            && self.get_token(1)?.literal != "("
            && self.get_token(1)?.literal != "|>"
            && self.get_token(1)?.literal.to_uppercase() != "FROM"
        {
            self.next_token()?; // WITH -> ident, ) -> ident
            queries.push(self.parse_cte()?);
        }
        with.push_node_vec("queries", queries);
        return Ok(with);
    }
    fn parse_window_clause(&mut self) -> BQ2CSTResult<Node> {
        let mut window = self.construct_node(NodeType::WindowClause)?;
        let mut window_exprs = Vec::new();
        while self.get_token(1)?.is_identifier() {
            self.next_token()?; // -> ident
            let mut window_expr = self.construct_node(NodeType::WindowExpr)?;
            self.next_token()?; // ident -> AS
            window_expr.push_node("as", self.construct_node(NodeType::Keyword)?);
            self.next_token()?; // AS -> (, AS -> named_window
            window_expr.push_node("window", self.parse_window_expr()?);
            if self.get_token(1)?.is(",") {
                self.next_token()?; // -> ,
                window_expr.push_node("comma", self.construct_node(NodeType::Symbol)?);
            }
            window_exprs.push(window_expr);
        }
        window.push_node_vec("window_exprs", window_exprs);
        return Ok(window);
    }
    fn parse_xxxby_exprs(&mut self) -> BQ2CSTResult<Node> {
        let mut xxxby = self.construct_node(NodeType::XXXByExprs)?;
        self.next_token()?; // xxx -> BY
        xxxby.push_node("by", self.construct_node(NodeType::Keyword)?);
        self.next_token()?; // BY -> expr
        xxxby.push_node_vec("exprs", self.parse_exprs(&vec![], false, true)?);
        Ok(xxxby)
    }
    fn parse_groupby_exprs(&mut self, alias: bool) -> BQ2CSTResult<Node> {
        let mut groupby = self.construct_node(NodeType::GroupByExprs)?;
        self.next_token()?; // GROUP -> BY
        groupby.push_node("by", self.construct_node(NodeType::Keyword)?);
        self.next_token()?; // -> ROLLUP | CUBE | GROUPING | ALL | exprs
        if self.get_token(0)?.in_(&vec!["ROLLUP", "CUBE"]) {
            groupby.push_node_vec("how", self.parse_n_keywords(1)?);
            self.next_token()?; // BY -> expr
            groupby.push_node_vec("exprs", self.parse_exprs(&vec![], alias, true)?);
        } else if self.get_token(0)?.in_(&vec!["GROUPING"]) {
            groupby.push_node_vec("how", self.parse_n_keywords(2)?);
            self.next_token()?; // BY -> expr
            groupby.push_node_vec("exprs", self.parse_exprs(&vec![], alias, true)?);
        } else if self.get_token(0)?.in_(&vec!["ALL"]) {
            groupby.push_node_vec("how", self.parse_n_keywords(1)?);
        } else {
            groupby.push_node_vec("exprs", self.parse_exprs(&vec![], alias, true)?);
        }
        Ok(groupby)
    }
    fn parse_table_sample_ratio(&mut self) -> BQ2CSTResult<Node> {
        let mut group = self.construct_node(NodeType::TableSampleRatio)?;
        self.next_token()?; // -> expr
        group.push_node(
            "expr",
            self.parse_expr(usize::MAX, false, false, false, true)?,
        );
        self.next_token()?; // -> PERCENT
        group.push_node("percent", self.construct_node(NodeType::Keyword)?);
        self.next_token()?; // -> )
        group.push_node("rparen", self.construct_node(NodeType::Symbol)?);
        Ok(group)
    }
    fn parse_pivot_config_clause(&mut self) -> BQ2CSTResult<Node> {
        let mut config = self.construct_node(NodeType::PivotConfig)?;
        self.next_token()?; // -> expr
        config.push_node_vec("exprs", self.parse_exprs(&vec![], true, true)?);
        self.next_token()?; // -> FOR
        let mut for_ = self.construct_node(NodeType::KeywordWithExpr)?;
        self.next_token()?; // -> expr
        for_.push_node("expr", self.construct_node(NodeType::Identifier)?);
        config.push_node("for", for_);
        self.next_token()?; // -> IN
        config.push_node("in", self.parse_keyword_with_grouped_exprs(true)?);
        self.next_token()?; // -> )
        config.push_node("rparen", self.construct_node(NodeType::Symbol)?);
        Ok(config)
    }
    fn parse_unpivot_config_clause(&mut self) -> BQ2CSTResult<Node> {
        let mut config = self.construct_node(NodeType::UnpivotConfig)?;
        self.next_token()?; // -> expr
        if self.get_token(0)?.is("(") {
            // in the case of multi column unpivot
            config.push_node("expr", self.parse_grouped_exprs(false)?);
        } else {
            config.push_node(
                "expr",
                self.parse_expr(usize::MAX, true, false, false, true)?,
            );
        }
        self.next_token()?; // -> FOR
        let mut for_ = self.construct_node(NodeType::KeywordWithExpr)?;
        self.next_token()?; // -> expr
        for_.push_node("expr", self.construct_node(NodeType::Identifier)?);
        config.push_node("for", for_);
        self.next_token()?; // -> IN
        let mut in_ = self.construct_node(NodeType::KeywordWithGroupedXXX)?;
        self.next_token()?; // -> (
        let mut group = self.construct_node(NodeType::GroupedExprs)?;
        let mut exprs = Vec::new();
        while !self.get_token(1)?.is(")") {
            self.next_token()?; // -> expr
            let mut expr;
            if self.get_token(0)?.is("(") {
                // in the case of multi column unpivot
                expr = self.parse_grouped_exprs(false)?;
            } else {
                expr = self.parse_expr(usize::MAX, false, false, false, true)?;
            }
            if self.get_token(1)?.is("AS") {
                self.next_token()?; // -> AS
                expr.push_node("as", self.construct_node(NodeType::Keyword)?);
            }
            if self.get_token(1)?.is_string() || self.get_token(1)?.is_numeric() {
                self.next_token()?; // -> row_value_alias
                expr.push_node(
                    "row_value_alias",
                    self.parse_expr(usize::MAX, false, false, false, true)?,
                );
            }
            if self.get_token(1)?.is(",") {
                self.next_token()?; // -> ,
                expr.push_node("comma", self.construct_node(NodeType::Symbol)?);
            } else {
                exprs.push(expr);
                break;
            }
            exprs.push(expr);
        }
        self.next_token()?; // -> )
        group.push_node("rparen", self.construct_node(NodeType::Symbol)?);
        group.push_node_vec("exprs", exprs);
        in_.push_node("group", group);
        config.push_node("in", in_);
        self.next_token()?; // -> )
        config.push_node("rparen", self.construct_node(NodeType::Symbol)?);
        Ok(config)
    }
    fn parse_match_recognize_clause(&mut self) -> BQ2CSTResult<Node> {
        let mut match_recognize = self.construct_node(NodeType::MatchRecognizeClause)?;
        self.next_token()?; // -> (
        match_recognize.push_node("config", self.parse_match_recognize_config()?);
        match_recognize = self.push_trailing_alias(match_recognize)?;
        Ok(match_recognize)
    }
    fn parse_match_recognize_config(&mut self) -> BQ2CSTResult<Node> {
        let mut config = self.construct_node(NodeType::MatchRecognizeConfig)?;
        if self.get_token(1)?.is("PARTITION") {
            self.next_token()?; // -> PARTITION
            config.push_node("partitionby", self.parse_xxxby_exprs()?);
        }
        if self.get_token(1)?.is("ORDER") {
            self.next_token()?; // -> ORDER
            config.push_node("orderby", self.parse_xxxby_exprs()?);
        }
        if self.get_token(1)?.is("MEASURES") {
            self.next_token()?; // -> MEASURES
            let mut measures = self.construct_node(NodeType::KeywordWithExprs)?;
            self.next_token()?; // -> expr

            // NOTE: currently trailing "," is not allowed
            measures.push_node_vec("exprs", self.parse_exprs(&vec![], true, false)?);
            config.push_node("measures", measures);
        }
        // NOTE: AFTER is not reserved keyword but it is not confusing. because ...
        // * measures does not allow trailing comma (so after is not consumed as expr)
        // * measures has alias (so after is not consumed as alias)
        if self.get_token(1)?.is("AFTER") {
            self.next_token()?; // -> AFTER
            let mut after = self.construct_node(NodeType::KeywordSequence)?;
            self.next_token()?; // -> MATCH
            let mut match_ = self.construct_node(NodeType::KeywordSequence)?;
            self.next_token()?; // -> SKIP
            let mut skip = self.construct_node(NodeType::KeywordSequence)?;
            self.next_token()?; // -> PAST | TO
            let mut past_to = self.construct_node(NodeType::KeywordSequence)?;
            self.next_token()?; // -> LAST | NEXT
            let mut last_next = self.construct_node(NodeType::KeywordSequence)?;
            self.next_token()?; // -> ROW
            let row = self.construct_node(NodeType::KeywordSequence)?;
            last_next.push_node("next_keyword", row);
            past_to.push_node("next_keyword", last_next);
            skip.push_node("next_keyword", past_to);
            match_.push_node("next_keyword", skip);
            after.push_node("next_keyword", match_);
            config.push_node("skip_rule", after);
        }
        if self.get_token(1)?.is("PATTERN") {
            self.next_token()?; // -> PATTERN
            let pattern = self.parse_pattern_clause()?;
            config.push_node("pattern", pattern);
        }
        if self.get_token(1)?.is("DEFINE") {
            self.next_token()?; // -> DEFINE
            let mut define = self.construct_node(NodeType::KeywordWithExprs)?;
            self.next_token()?; // -> expr

            // NOTE: currently trailing "," is not allowed
            define.push_node_vec("exprs", self.parse_exprs(&vec![], true, false)?);
            config.push_node("define", define);
        };
        if self.get_token(1)?.is("OPTIONS") {
            self.next_token()?; // -> OPTIONS
            config.push_node("options", self.parse_keyword_with_grouped_exprs(false)?);
        };
        self.next_token()?; // -> )
        config.push_node("rparen", self.construct_node(NodeType::Symbol)?);
        Ok(config)
    }
    fn parse_by_name_clause(&mut self) -> BQ2CSTResult<Node> {
        let mut by = self.construct_node(NodeType::KeywordSequence)?;
        self.next_token()?; // -> NAME
        let mut name: Node;
        if self.get_token(1)?.is("ON") {
            name = self.construct_node(NodeType::KeywordSequence)?;
            self.next_token()?; // -> ON
            let mut on = self.construct_node(NodeType::KeywordWithGroupedXXX)?;
            self.next_token()?; // -> (
            let columns = self.parse_grouped_exprs(false)?;

            on.push_node("group", columns);
            name.push_node("next_keyword", on);
        } else {
            name = self.construct_node(NodeType::Keyword)?;
        }
        by.push_node("next_keyword", name);
        Ok(by)
    }
    fn parse_pattern_clause(&mut self) -> BQ2CSTResult<Node> {
        let mut pattern = self.construct_node(NodeType::PatternClause)?;
        self.next_token()?; // -> (
        pattern.push_node("pattern", self.parse_pattern()?);
        Ok(pattern)
    }
    fn parse_grouped_pattern(&mut self) -> BQ2CSTResult<Node> {
        let mut group = self.construct_node(NodeType::GroupedPattern)?;
        let mut patterns = Vec::new();
        while !self.get_token(1)?.is(")") {
            self.next_token()?; // -> symbol | `|` | (
            if self.get_token(0)?.is("|") {
                let mut or = self.construct_node(NodeType::OrPattern)?;
                or.push_node_vec("left", patterns);
                let mut right_patterns = Vec::new();
                while !self.get_token(1)?.in_(&vec!["|", ")"]) {
                    self.next_token()?; // -> right
                    right_patterns.push(self.parse_pattern()?);
                }
                or.push_node_vec("right", right_patterns);
                patterns = vec![or];
            } else {
                patterns.push(self.parse_pattern()?);
            }
        }
        group.push_node_vec("patterns", patterns);
        self.next_token()?; // -> )
        group.push_node("rparen", self.construct_node(NodeType::Symbol)?);
        Ok(group)
    }
    fn parse_pattern(&mut self) -> BQ2CSTResult<Node> {
        let mut pattern;
        let curr_token = self.get_token(0)?;
        if curr_token.is("(") {
            pattern = self.parse_grouped_pattern()?;
        } else {
            pattern = self.construct_node(NodeType::Pattern)?; // ident | ^ | $
        }

        let mut suffixes = Vec::new();
        loop {
            match self.get_token(1)?.literal.as_str() {
                "?" | "+" | "*" => {
                    self.next_token()?;
                    suffixes.push(self.construct_node(NodeType::Symbol)?);
                }
                "{" => {
                    self.next_token()?; // -> {
                    suffixes.push(self.parse_quantifier()?);
                }
                _ => {
                    break;
                }
            }
        }
        pattern.push_node_vec("suffixes", suffixes);
        Ok(pattern)
    }
    fn parse_quantifier(&mut self) -> BQ2CSTResult<Node> {
        let mut quantifier = self.construct_node(NodeType::PatternQuantifier)?;
        if !self.get_token(1)?.is(",") {
            self.next_token()?; // -> m
            quantifier.push_node("min", self.construct_node(NodeType::NumericLiteral)?);
        }
        if self.get_token(1)?.is(",") {
            self.next_token()?; // -> ,
            quantifier.push_node("comma", self.construct_node(NodeType::Symbol)?);
            self.next_token()?; // -> n
            quantifier.push_node("max", self.construct_node(NodeType::NumericLiteral)?);
        }
        self.next_token()?; // -> }
        quantifier.push_node("rbrace", self.construct_node(NodeType::Symbol)?);
        Ok(quantifier)
    }
    fn parse_corresponding_clause(&mut self) -> BQ2CSTResult<Node> {
        let mut strict_exists = false;
        let mut strict = Node::empty(NodeType::Unknown);
        if self.get_token(0)?.is("STRICT") {
            strict_exists = true;
            strict = self.construct_node(NodeType::KeywordSequence)?;
            self.next_token()?; // ->  CORRESPONDING
        }
        let mut corresponding = self.construct_node(NodeType::Keyword)?;
        if self.get_token(1)?.is("BY") {
            corresponding.node_type = NodeType::KeywordSequence;
            self.next_token()?; // ->  BY
            let mut by = self.construct_node(NodeType::KeywordWithGroupedXXX)?;
            self.next_token()?; // ->  (
            by.push_node("group", self.parse_grouped_exprs(false)?);
            corresponding.push_node("next_keyword", by);
        }
        if strict_exists {
            strict.push_node("next_keyword", corresponding);
            corresponding = strict;
        }
        Ok(corresponding)
    }
    fn push_trailing_alias(&mut self, mut node: Node) -> BQ2CSTResult<Node> {
        if self.get_token(1)?.is("AS") {
            self.next_token()?; // -> AS
            node.push_node("as", self.construct_node(NodeType::Keyword)?);
            self.next_token()?; // AS -> ident
            node.push_node("alias", self.construct_node(NodeType::Identifier)?);
        } else if self.get_token(1)?.is_identifier() {
            self.next_token()?; // -> ident
            node.push_node("alias", self.construct_node(NodeType::Identifier)?);
        }
        Ok(node)
    }
    // ----- SELECT statement -----
    fn parse_select_statement(&mut self, semicolon: bool, root: bool) -> BQ2CSTResult<Node> {
        if self.get_token(0)?.literal.to_uppercase() == "(" {
            let mut node = self.construct_node(NodeType::GroupedStatement)?;
            self.next_token()?; // ( -> SELECT
            if self.get_token(0)?.is("FROM") {
                node.push_node("stmt", self.parse_from_statement()?);
            } else {
                node.push_node("stmt", self.parse_select_statement(false, true)?);
            }
            self.next_token()?; // stmt -> )
            if !self.get_token(0)?.is(")") {
                return Err(BQ2CSTError::from_token(
                    self.get_token(0)?,
                    "expected )".to_string(),
                ));
            }
            node.push_node("rparen", self.construct_node(NodeType::Symbol)?);
            while self.get_token(1)?.in_(&vec![
                "UNION",
                "INTERSECT",
                "EXCEPT",
                "INNER",
                "FULL",
                "LEFT",
                "OUTER",
            ]) && root
            {
                self.next_token()?;
                node = self.parse_set_operator(node)?;
            }
            // ORDER BY
            if self.get_token(1)?.is("ORDER") && root {
                self.next_token()?; // -> ORDER
                node.push_node("orderby", self.parse_xxxby_exprs()?);
            }
            // LIMIT
            if self.get_token(1)?.is("LIMIT") && root {
                self.next_token()?; // -> LIMIT
                let mut limit = self.construct_node(NodeType::LimitClause)?;
                self.next_token()?; // -> expr
                limit.push_node(
                    "expr",
                    self.parse_expr(usize::MAX, false, false, false, true)?,
                );
                if self.get_token(1)?.literal.to_uppercase() == "OFFSET" {
                    self.next_token()?; // expr -> OFFSET
                    let mut offset = self.construct_node(NodeType::KeywordWithExpr)?;
                    self.next_token()?; // OFFSET -> expr
                    offset.push_node(
                        "expr",
                        self.parse_expr(usize::MAX, false, false, false, true)?,
                    );
                    limit.push_node("offset", offset);
                }
                node.push_node("limit", limit);
            }
            if self.get_token(1)?.is(";") && semicolon && root {
                self.next_token()?; // expr -> ;
                node.push_node("semicolon", self.construct_node(NodeType::Symbol)?)
            } else if self.get_token(1)?.is("|>") {
                self.next_token()?; // -> |>
                return self.parse_pipe_statement(node);
            }
            return Ok(node);
        }
        if self.get_token(0)?.literal.to_uppercase() == "WITH" {
            let with = self.parse_with_clause()?;
            self.next_token()?; // -> SELECT | '(' | FROM
            let mut node = if self.get_token(0)?.is("FROM") {
                self.parse_from_statement()?
            } else {
                self.parse_select_statement(semicolon, true)?
            };
            node.push_node("with", with);
            return Ok(node);
        }
        // SELECT
        let mut node = self.construct_node(NodeType::SelectStatement)?;

        // WITH DIFFERENTIAL_PRIVACY
        if self.get_token(1)?.is("WITH") && !self.get_token(2)?.is("(") {
            self.next_token()?; // -> WITH
            let mut with = self.construct_node(NodeType::DifferentialPrivacyClause)?;
            self.next_token()?; // -> differential_privacy
            with.push_node(
                "differential_privacy",
                self.construct_node(NodeType::Keyword)?,
            );
            if self.get_token(1)?.is("OPTIONS") {
                self.next_token()?; // -> OPTIONS
                with.push_node("options", self.parse_keyword_with_grouped_exprs(false)?);
            };
            node.push_node("differential_privacy", with);
        }

        // DISTINCT
        if self.get_token(1)?.in_(&vec!["ALL", "DISTINCT"]) {
            self.next_token()?; // select -> all, distinct
            node.push_node("distinct_or_all", self.construct_node(NodeType::Keyword)?);
        }

        // AS STRUCT, VALUE
        if self.get_token(1)?.literal.to_uppercase() == "AS" {
            self.next_token()?; // SELECT -> AS
            let as_ = self.construct_node(NodeType::Keyword)?;
            self.next_token()?; // AS -> STRUCT, VALUE
            node.push_node_vec(
                "as_struct_or_value",
                vec![as_, self.construct_node(NodeType::Keyword)?],
            );
        }

        self.next_token()?; // -> expr

        // exprs
        node.push_node_vec(
            "exprs",
            self.parse_exprs(
                &vec![
                    "FROM",
                    "WHERE",
                    "GROUP",
                    "HAVING",
                    "QUALIFY",
                    "WINDOW",
                    "ORDER",
                    "LIMIT",
                    "UNION",
                    "INTERSECT",
                    "EXCEPT",
                    ";",
                    ")",
                ],
                true,
                true,
            )?,
        );
        // FROM
        if self.get_token(1)?.is("FROM") {
            self.next_token()?; // expr -> FROM
            let mut from = self.construct_node(NodeType::KeywordWithExpr)?;
            self.next_token()?; // FROM -> table
            from.push_node("expr", self.parse_table(true)?);
            node.push_node("from", from);
        }
        // WHERE
        if self.get_token(1)?.is("WHERE") {
            self.next_token()?; // expr -> WHERE
            let mut where_ = self.construct_node(NodeType::KeywordWithExpr)?;
            self.next_token()?; // WHERE -> expr
            where_.push_node(
                "expr",
                self.parse_expr(usize::MAX, false, false, false, true)?,
            );
            node.push_node("where", where_);
        }
        // GROUP BY
        if self.get_token(1)?.is("GROUP") {
            self.next_token()?; // expr -> GROUP
            node.push_node("groupby", self.parse_groupby_exprs(false)?);
        }
        // HAVING
        if self.get_token(1)?.is("HAVING") {
            self.next_token()?; // expr -> HAVING
            let mut having = self.construct_node(NodeType::KeywordWithExpr)?;
            self.next_token()?; // HAVING -> expr
            having.push_node(
                "expr",
                self.parse_expr(usize::MAX, false, false, false, true)?,
            );
            node.push_node("having", having);
        }
        // QUALIFY
        if self.get_token(1)?.is("QUALIFY") {
            self.next_token()?; // -> QUALIFY
            let mut qualify = self.construct_node(NodeType::KeywordWithExpr)?;
            self.next_token()?; // -> expr
            qualify.push_node(
                "expr",
                self.parse_expr(usize::MAX, false, false, false, true)?,
            );
            node.push_node("qualify", qualify);
        }
        // WINDOW
        if self.get_token(1)?.is("WINDOW") {
            self.next_token()?; // -> WINDOW
            node.push_node("window", self.parse_window_clause()?);
        }
        // ORDER BY
        if self.get_token(1)?.is("ORDER") {
            self.next_token()?; // expr -> ORDER
            node.push_node("orderby", self.parse_xxxby_exprs()?);
        }
        // LIMIT
        if self.get_token(1)?.is("LIMIT") {
            self.next_token()?; // expr -> LIMIT
            let mut limit = self.construct_node(NodeType::LimitClause)?;
            self.next_token()?; // LIMIT -> expr
            limit.push_node(
                "expr",
                self.parse_expr(usize::MAX, false, false, false, true)?,
            );
            if self.get_token(1)?.literal.to_uppercase() == "OFFSET" {
                self.next_token()?; // expr -> OFFSET
                let mut offset = self.construct_node(NodeType::KeywordWithExpr)?;
                self.next_token()?; // OFFSET -> expr
                offset.push_node(
                    "expr",
                    self.parse_expr(usize::MAX, false, false, false, true)?,
                );
                limit.push_node("offset", offset);
            }
            node.push_node("limit", limit);
        }
        // UNION
        while self.get_token(1)?.in_(&vec![
            "UNION",
            "INTERSECT",
            "EXCEPT",
            "INNER",
            "FULL",
            "LEFT",
            "OUTER",
        ]) && root
        {
            self.next_token()?;
            node = self.parse_set_operator(node)?;
        }
        // ;
        if self.get_token(1)?.is(";") && semicolon {
            self.next_token()?; // expr -> ;
            node.push_node("semicolon", self.construct_node(NodeType::Symbol)?)
        } else if self.get_token(1)?.is("|>") && root {
            self.next_token()?; // -> |>
            return self.parse_pipe_statement(node);
        }
        Ok(node)
    }
    fn parse_from_statement(&mut self) -> BQ2CSTResult<Node> {
        let mut from = self.construct_node(NodeType::FromStatement)?;
        self.next_token()?; // -> ident
        from.push_node("expr", self.parse_table(true)?);

        if self.get_token(1)?.is("|>") {
            self.next_token()?; // -> |>
            return self.parse_pipe_statement(from);
        }

        if self.get_token(1)?.is(";") {
            self.next_token()?; // -> ;
            from.push_node("semicolon", self.construct_node(NodeType::Symbol)?)
        };
        Ok(from)
    }
    fn parse_pipe_statement(&mut self, left: Node) -> BQ2CSTResult<Node> {
        let mut pipe = self.construct_node(NodeType::PipeStatement)?;
        pipe.push_node("left", left);
        self.next_token()?; // -> SELECT | LIMIT | ...

        let operator = match self.get_token(0)?.literal.to_uppercase().as_str() {
            "EXTEND" | "SET" | "DROP" | "RENAME" | "AS" | "WHERE" | "CALL" => {
                self.parse_base_pipe_operator(false)?
            }
            "ORDER" => self.parse_base_pipe_operator(true)?,
            "SELECT" => self.parse_select_pipe_operator()?,
            "LIMIT" => self.parse_limit_pipe_operator()?,
            "AGGREGATE" => self.parse_aggregate_pipe_operator()?,
            "UNION" | "INTERSECT" | "EXCEPT" => self.parse_union_pipe_operator()?,
            // "," is not abalable for cross join
            "JOIN" => self.parse_join_pipe_operator()?,
            "INNER" | "FULL" | "LEFT" | "RIGHT" | "CROSS" | "OUTER" => {
                if self.get_token(1)?.is("JOIN") || self.get_token(2)?.is("JOIN") {
                    self.parse_join_pipe_operator()?
                } else {
                    self.parse_union_pipe_operator()?
                }
            }
            "TABLESAMPLE" => self.parse_tablesample_pipe_operator()?,
            "PIVOT" => self.parse_pivot_pipe_operator()?,
            "UNPIVOT" => self.parse_unpivot_pipe_operator()?,
            "WITH" => self.parse_with_pipe_operator()?,
            "MATCH_RECOGNIZE" => self.parse_match_recognize_pipe_operator()?,
            "DISTINCT" => self.construct_node(NodeType::Keyword)?,
            _ => {
                return Err(BQ2CSTError::from_token(
                    self.get_token(0)?,
                    format!("Expected pipe operator but got: {:?}", self.get_token(0)?),
                ))
            }
        };
        pipe.push_node("right", operator);

        if self.get_token(1)?.is("|>") {
            self.next_token()?; // -> |>
            return self.parse_pipe_statement(pipe);
        }

        if self.get_token(1)?.is(";") {
            self.next_token()?; // -> ;
            pipe.push_node("semicolon", self.construct_node(NodeType::Symbol)?)
        };
        Ok(pipe)
    }
    fn parse_select_pipe_operator(&mut self) -> BQ2CSTResult<Node> {
        let mut operator = self.construct_node(NodeType::SelectPipeOperator)?;

        // WITH DIFFERENTIAL_PRIVACY seems not supported
        let mut keywords: Vec<Node> = vec![];
        if self.get_token(1)?.in_(&vec!["ALL", "DISTINCT"]) {
            self.next_token()?; // -> ALL | DISTINCT
            keywords.push(self.construct_node(NodeType::Keyword)?);
        }
        if self.get_token(1)?.is("AS") {
            self.next_token()?; // -> AS
            keywords.push(self.construct_node(NodeType::Keyword)?);
            self.next_token()?; // -> STRUCT | VALUE
            keywords.push(self.construct_node(NodeType::Keyword)?);
        }
        if 0 < keywords.len() {
            let mut temp = keywords.pop().unwrap();
            while let Some(mut kw) = keywords.pop() {
                kw.node_type = NodeType::KeywordSequence;
                kw.push_node("next_keyword", temp);
                temp = kw
            }
            operator.push_node("keywords", temp)
        }
        self.next_token()?; // -> expr
        let exprs = self.parse_exprs(&vec![";", "WINDOW"], true, true)?;
        operator.push_node_vec("exprs", exprs);
        if self.get_token(1)?.is("WINDOW") {
            self.next_token()?; // -> WINDOW
            let window = self.parse_window_clause()?;
            operator.push_node("window", window);
        }

        Ok(operator)
    }
    fn parse_limit_pipe_operator(&mut self) -> BQ2CSTResult<Node> {
        let mut operator = self.construct_node(NodeType::LimitPipeOperator)?;
        self.next_token()?; // -> expr
        let exprs = self.parse_exprs(&vec![";", "OFFSET"], false, true)?; // if alias is true, offset is handled as alias
        operator.push_node_vec("exprs", exprs);
        if self.get_token(1)?.is("OFFSET") {
            self.next_token()?; // -> OFFSET
            let mut offset = self.construct_node(NodeType::KeywordWithExpr)?;
            self.next_token()?; // -> expr
            offset.push_node(
                "expr",
                self.parse_expr(usize::MAX, false, false, false, true)?,
            );
            operator.push_node("offset", offset)
        }
        Ok(operator)
    }
    fn parse_aggregate_pipe_operator(&mut self) -> BQ2CSTResult<Node> {
        let mut operator = self.construct_node(NodeType::AggregatePipeOperator)?;
        self.next_token()?; // -> expr
        let exprs = self.parse_exprs(&vec![";", "GROUP"], true, true)?;
        operator.push_node_vec("exprs", exprs);
        if self.get_token(1)?.is("GROUP") {
            self.next_token()?; // expr -> GROUP
            operator.push_node("groupby", self.parse_groupby_exprs(true)?);
        }
        Ok(operator)
    }
    // INTERSECT and EXCEPT are also supported
    fn parse_union_pipe_operator(&mut self) -> BQ2CSTResult<Node> {
        let mut operator: Node;

        // NOTE:
        // when you modify here, also modify parse_set_operator()
        if self
            .get_token(0)?
            .in_(&vec!["INNER", "FULL", "LEFT", "OUTER"])
        {
            let mut method;
            if self.get_token(1)?.is("OUTER") {
                method = self.construct_node(NodeType::KeywordSequence)?;
                self.next_token()?; // -> OUTER
                let outer = self.construct_node(NodeType::Keyword)?;
                method.push_node("next_keyword", outer);
            } else {
                method = self.construct_node(NodeType::Keyword)?;
            }

            self.next_token()?; // -> UNION
            operator = self.construct_node(NodeType::UnionPipeOperator)?;
            operator.push_node("method", method);
        } else {
            operator = self.construct_node(NodeType::UnionPipeOperator)?;
        }

        self.next_token()?; // -> ALL | DISTINCT
        operator.push_node("keywords", self.construct_node(NodeType::Keyword)?);
        if self.get_token(1)?.is("BY") {
            self.next_token()?; // -> BY
            operator.push_node("by", self.parse_by_name_clause()?);
        } else if self.get_token(1)?.in_(&vec!["STRICT", "CORRESPONDING"]) {
            self.next_token()?; // -> STRICT | CORRESPONDING
            operator.push_node("corresponding", self.parse_corresponding_clause()?);
        }
        self.next_token()?; // -> expr
        let exprs = self.parse_exprs(&vec![";"], true, true)?;
        operator.push_node_vec("exprs", exprs);
        Ok(operator)
    }
    fn parse_join_pipe_operator(&mut self) -> BQ2CSTResult<Node> {
        let mut operator: Node;

        if self
            .get_token(0)?
            .in_(&vec!["INNER", "FULL", "LEFT", "RIGHT", "CROSS", "OUTER"])
        {
            let mut method;
            if self.get_token(1)?.is("OUTER") {
                method = self.construct_node(NodeType::KeywordSequence)?;
                self.next_token()?; // -> OUTER
                let outer = self.construct_node(NodeType::Keyword)?;
                method.push_node("next_keyword", outer);
            } else {
                method = self.construct_node(NodeType::Keyword)?;
            }

            self.next_token()?; // -> JOIN
            operator = self.construct_node(NodeType::JoinPipeOperator)?;
            operator.push_node("method", method);
        } else {
            operator = self.construct_node(NodeType::JoinPipeOperator)?;
        }

        self.next_token()?; // -> table
        operator.push_node_vec("exprs", vec![self.parse_table(false)?]);
        if self.get_token(1)?.is("on") {
            self.next_token()?; // `table` -> ON
            let mut on = self.construct_node(NodeType::KeywordWithExpr)?;
            self.next_token()?; // ON -> expr
            on.push_node(
                "expr",
                self.parse_expr(usize::MAX, false, false, false, true)?,
            );
            operator.push_node("on", on);
        } else if self.get_token(1)?.is("using") {
            self.next_token()?; // -> USING
            operator.push_node(
                "using",
                self.parse_expr(usize::MAX, false, false, false, true)?,
            )
        }
        Ok(operator)
    }
    fn parse_tablesample_pipe_operator(&mut self) -> BQ2CSTResult<Node> {
        let mut operator = self.construct_node(NodeType::TableSamplePipeOperator)?;
        self.next_token()?; // -> SYSTEM
        operator.push_node("keywords", self.construct_node(NodeType::Keyword)?);

        self.next_token()?; // -> (
        operator.push_node("group", self.parse_table_sample_ratio()?);
        Ok(operator)
    }
    fn parse_pivot_pipe_operator(&mut self) -> BQ2CSTResult<Node> {
        let mut operator = self.construct_node(NodeType::PivotPipeOperator)?;
        self.next_token()?; // -> (
        operator.push_node("config", self.parse_pivot_config_clause()?);
        operator = self.push_trailing_alias(operator)?;
        Ok(operator)
    }
    fn parse_unpivot_pipe_operator(&mut self) -> BQ2CSTResult<Node> {
        let mut operator = self.construct_node(NodeType::UnpivotPipeOperator)?;
        if self.get_token(1)?.in_(&vec!["INCLUDE", "EXCLUDE"]) {
            self.next_token()?; // -> INCLUDE | EXCLUDE
            let mut include_or_exclude = self.construct_node(NodeType::KeywordSequence)?;
            self.next_token()?; // -> NULLS
            include_or_exclude.push_node("next_keyword", self.construct_node(NodeType::Keyword)?);
            operator.push_node("keywords", include_or_exclude);
        }
        self.next_token()?; // -> (
        operator.push_node("config", self.parse_unpivot_config_clause()?);
        operator = self.push_trailing_alias(operator)?;
        Ok(operator)
    }
    fn parse_with_pipe_operator(&mut self) -> BQ2CSTResult<Node> {
        let mut operator = self.parse_with_clause()?;
        operator.node_type = NodeType::WithPipeOperator;
        Ok(operator)
    }
    fn parse_match_recognize_pipe_operator(&mut self) -> BQ2CSTResult<Node> {
        let mut operator = self.parse_match_recognize_clause()?;
        operator.node_type = NodeType::MatchRecognizePipeOperator;
        Ok(operator)
    }
    fn parse_base_pipe_operator(&mut self, keywords: bool) -> BQ2CSTResult<Node> {
        let mut operator = self.construct_node(NodeType::BasePipeOperator)?;
        // NOTE: for now, single keyword is only allowed
        if keywords {
            self.next_token()?; // -> keyword
            operator.push_node("keywords", self.construct_node(NodeType::Keyword)?);
        }
        self.next_token()?; // -> expr
        let exprs = self.parse_exprs(&vec![";"], true, true)?;
        operator.push_node_vec("exprs", exprs);
        Ok(operator)
    }
    // ----- DML -----
    fn parse_insert_statement(&mut self, semicolon: bool) -> BQ2CSTResult<Node> {
        let mut insert = self.construct_node(NodeType::InsertStatement)?;
        if self.get_token(1)?.is("INTO") {
            self.next_token()?; // INSERT -> INTO
            insert.push_node("into", self.construct_node(NodeType::Keyword)?);
        }
        if !self.get_token(1)?.in_(&vec!["(", "VALUES", "ROW"]) {
            // identifier does not appear when called by parse_merge_statement()
            self.next_token()?; // INSERT -> identifier
            insert.push_node("target_name", self.parse_identifier()?);
        }
        if self.get_token(1)?.is("(") {
            self.next_token()?; // identifier -> (
            insert.push_node("columns", self.parse_grouped_exprs(false)?);
        }
        if self.get_token(1)?.is("VALUES") {
            self.next_token()?; // ) -> values
            let mut values = self.construct_node(NodeType::KeywordWithExprs)?;
            let mut lparens = Vec::new();
            while self.get_token(1)?.is("(") {
                self.next_token()?; // VALUES -> (, ',' -> (
                let mut lparen = self.parse_grouped_exprs(false)?;
                if self.get_token(1)?.is(",") {
                    self.next_token()?; // ) -> ,
                    lparen.push_node("comma", self.construct_node(NodeType::Symbol)?);
                }
                lparens.push(lparen);
            }
            values.push_node_vec("exprs", lparens);
            insert.push_node("input", values);
        } else if self.get_token(1)?.is("ROW") {
            self.next_token()?; // -> ROW
            insert.push_node("input", self.construct_node(NodeType::Keyword)?);
        } else {
            self.next_token()?; // ) -> SELECT
            insert.push_node("input", self.parse_select_statement(false, true)?);
        }
        if self.get_token(1)?.is(";") && semicolon {
            self.next_token()?; // -> ;
            insert.push_node("semicolon", self.construct_node(NodeType::Symbol)?);
        }
        Ok(insert)
    }
    fn parse_delete_statement(&mut self, semicolon: bool) -> BQ2CSTResult<Node> {
        let mut delete = self.construct_node(NodeType::DeleteStatement)?;
        if self.get_token(1)?.is("FROM") {
            self.next_token()?; // DELETE -> FROM
            delete.push_node("from", self.construct_node(NodeType::Keyword)?);
        }
        self.next_token()?; // -> table_name
        let mut table_name = self.parse_identifier()?;
        if !self.get_token(1)?.is("WHERE") {
            self.next_token()?; // -> AS, ident
            if self.get_token(0)?.is("AS") {
                table_name.push_node("as", self.construct_node(NodeType::Keyword)?);
                self.next_token()?; // AS -> ident
            }
            table_name.push_node("alias", self.construct_node(NodeType::Identifier)?);
        }
        delete.push_node("table_name", table_name);
        self.next_token()?; // -> WHERE
        let mut where_ = self.construct_node(NodeType::KeywordWithExpr)?;
        self.next_token()?; // WHERE -> expr
        where_.push_node(
            "expr",
            self.parse_expr(usize::MAX, false, false, false, true)?,
        );
        delete.push_node("where", where_);
        if self.get_token(1)?.is(";") && semicolon {
            self.next_token()?; // -> ;
            delete.push_node("semicolon", self.construct_node(NodeType::Symbol)?);
        }
        Ok(delete)
    }
    fn parse_truncate_statement(&mut self, semicolon: bool) -> BQ2CSTResult<Node> {
        let mut truncate = self.construct_node(NodeType::TruncateStatement)?;
        self.next_token()?; // TRUNCATE -> TABLE
        truncate.push_node("table", self.construct_node(NodeType::Keyword)?);
        self.next_token()?; // TABLE -> ident
        truncate.push_node("table_name", self.parse_identifier()?);
        if self.get_token(1)?.is(";") && semicolon {
            self.next_token()?; // -> ;
            truncate.push_node("semicolon", self.construct_node(NodeType::Symbol)?);
        }
        Ok(truncate)
    }
    fn parse_update_statement(&mut self, semicolon: bool) -> BQ2CSTResult<Node> {
        let mut update = self.construct_node(NodeType::UpdateStatement)?;
        if !self.get_token(1)?.is("SET") {
            self.next_token()?; // -> table_name
            update.push_node("table_name", self.parse_table(true)?);
        }
        self.next_token()?; // -> SET
        let mut set = self.construct_node(NodeType::KeywordWithExprs)?;
        self.next_token()?; // SET -> exprs
        set.push_node_vec("exprs", self.parse_exprs(&vec![], false, true)?);
        if self.get_token(1)?.is("FROM") {
            self.next_token()?; // exprs -> FROM
            let mut from = self.construct_node(NodeType::KeywordWithExpr)?;
            self.next_token()?; // FROM -> target_name
            from.push_node("expr", self.parse_table(true)?);
            update.push_node("from", from);
        }
        update.push_node("set", set);
        if self.get_token(1)?.is("WHERE") {
            self.next_token()?; // exprs -> WHERE
            let mut where_ = self.construct_node(NodeType::KeywordWithExpr)?;
            self.next_token()?; // WHERE -> expr
            where_.push_node(
                "expr",
                self.parse_expr(usize::MAX, false, false, false, true)?,
            );
            update.push_node("where", where_);
        }
        if self.get_token(1)?.is(";") && semicolon {
            self.next_token()?; // -> ;
            update.push_node("semicolon", self.construct_node(NodeType::Symbol)?);
        }
        Ok(update)
    }
    fn parse_merge_statement(&mut self, semicolon: bool) -> BQ2CSTResult<Node> {
        let mut merge = self.construct_node(NodeType::MergeStatement)?;
        if self.get_token(1)?.is("INTO") {
            self.next_token()?; // MERGE -> INTO
            merge.push_node("into", self.construct_node(NodeType::Keyword)?);
        }
        self.next_token()?; // -> table_name
        merge.push_node("table_name", self.parse_table(true)?);
        self.next_token()?; // -> USING
        let mut using = self.construct_node(NodeType::KeywordWithExpr)?;
        self.next_token()?; // USING -> expr
        using.push_node(
            "expr",
            self.parse_expr(usize::MAX, true, false, false, true)?,
        );
        merge.push_node("using", using);
        if self.get_token(1)?.is(";") {
            self.next_token()?; // -> ;
            merge.push_node("semicolon", self.construct_node(NodeType::Symbol)?);
        }
        self.next_token()?; // -> ON
        let mut on = self.construct_node(NodeType::KeywordWithExpr)?;
        self.next_token()?; // ON -> expr
        on.push_node(
            "expr",
            self.parse_expr(usize::MAX, false, false, false, true)?,
        );
        merge.push_node("on", on);
        let mut whens = Vec::new();
        while self.get_token(1)?.is("when") {
            self.next_token()?; // -> WHEN
            let mut when = self.construct_node(NodeType::WhenClause)?;
            if self.get_token(1)?.is("NOT") {
                self.next_token()?; // WHEN -> NOT
                when.push_node("not", self.construct_node(NodeType::Keyword)?);
            }
            self.next_token()?; // -> MATCHED
            when.push_node("matched", self.construct_node(NodeType::Keyword)?);
            if self.get_token(1)?.is("BY") {
                self.next_token()?; // -> BY
                let by = self.construct_node(NodeType::Keyword)?;
                self.next_token()?; // -> TARGET, SOURCE
                let target = self.construct_node(NodeType::Keyword)?;
                when.push_node_vec("by_target_or_source", vec![by, target]);
            }
            if self.get_token(1)?.is("AND") {
                self.next_token()?; // -> AND
                let mut and = self.construct_node(NodeType::KeywordWithExpr)?;
                self.next_token()?; // -> expr
                let cond = self.parse_expr(usize::MAX, false, false, false, true)?;
                and.push_node("expr", cond);
                when.push_node("and", and);
            }
            self.next_token()?; // -> THEN
            let mut then = self.construct_node(NodeType::KeywordWithStatement)?;
            self.next_token()?; // THEN -> stmt
            let stmt = match self.get_token(0)?.literal.to_uppercase().as_str() {
                "DELETE" => self.construct_node(NodeType::SingleTokenStatement)?,
                "UPDATE" => self.parse_update_statement(false)?,
                "INSERT" => self.parse_insert_statement(false)?,
                _ => {
                    return Err(BQ2CSTError::from_token(
                        self.get_token(0)?,
                        format!(
                            "Expected `DELETE`, `UPDATE` or `INSERT` but got: {:?}",
                            self.get_token(0)?
                        ),
                    ))
                }
            };
            then.push_node("stmt", stmt);
            when.push_node("then", then);
            whens.push(when);
        }
        merge.push_node_vec("whens", whens);
        if self.get_token(1)?.is(";") && semicolon {
            self.next_token()?; // -> ;
            merge.push_node("semicolon", self.construct_node(NodeType::Symbol)?);
        }
        Ok(merge)
    }
    // ----- DDL -----
    fn parse_create_schema_statement(&mut self, semicolon: bool) -> BQ2CSTResult<Node> {
        let mut create = self.construct_node(NodeType::CreateSchemaStatement)?;
        if self.get_token(1)?.is("EXTERNAL") {
            self.next_token()?; // -> EXTERNAL
            create.push_node("external", self.construct_node(NodeType::Keyword)?);
        }
        self.next_token()?; // -> SCHEMA
        create.push_node("what", self.construct_node(NodeType::Keyword)?);
        if self.get_token(1)?.is("IF") {
            self.next_token()?; // -> IF
            create.push_node_vec("if_not_exists", self.parse_n_keywords(3)?);
        }
        self.next_token()?; // -> ident
        create.push_node("ident", self.parse_identifier()?);
        if self.get_token(1)?.is("DEFAULT") {
            self.next_token()?; // DEFAULT
            let mut default = self.construct_node(NodeType::KeywordSequence)?;
            self.next_token()?; // COLLATE
            let mut collate = self.construct_node(NodeType::KeywordWithExpr)?;
            self.next_token()?; // collate_specification
            collate.push_node(
                "expr",
                // parse_expr is not needed here, construct_node is enough
                self.parse_expr(usize::MAX, false, false, false, true)?,
            );
            default.push_node("next_keyword", collate);
            create.push_node("default_collate", default);
        }
        if self.get_token(1)?.is("WITH") && self.get_token(2)?.is("CONNECTION") {
            self.next_token()?; // -> WITH
            create.push_node("with_connection", self.parse_with_connection_clause()?);
        }
        if self.get_token(1)?.is("OPTIONS") {
            self.next_token()?; // OPTIONS
            create.push_node("options", self.parse_keyword_with_grouped_exprs(false)?);
        }
        if self.get_token(1)?.is(";") && semicolon {
            self.next_token()?; // -> ;
            create.push_node("semicolon", self.construct_node(NodeType::Symbol)?)
        }
        Ok(create)
    }
    fn parse_create_search_index_statement(&mut self, semicolon: bool) -> BQ2CSTResult<Node> {
        let mut create = self.construct_node(NodeType::CreateIndexStatement)?;
        if self.get_token(1)?.is("OR") {
            self.next_token()?; // -> OR
            create.push_node_vec("or_replace", self.parse_n_keywords(2)?);
        }
        self.next_token()?; // -> SEARCH | VECTOR
        let mut what = self.construct_node(NodeType::KeywordSequence)?;
        self.next_token()?; // -> INDEX
        what.push_node("next_keyword", self.construct_node(NodeType::Keyword)?);
        create.push_node("what", what);
        if self.get_token(1)?.is("IF") {
            self.next_token()?; // -> IF
            create.push_node_vec("if_not_exists", self.parse_n_keywords(3)?);
        }
        self.next_token()?; // -> ident
        create.push_node("ident", self.parse_identifier()?);
        self.next_token()?; // -> ON
        create.push_node("on", self.construct_node(NodeType::Keyword)?);
        self.next_token()?; // -> tablename
        create.push_node("tablename", self.parse_identifier()?);

        self.next_token()?; // -> (
        if self.get_token(1)?.is("ALL") {
            let mut group = self.construct_node(NodeType::GroupedExpr)?;
            self.next_token()?; // -> ALL
            let mut all = self.construct_node(NodeType::KeywordSequence)?;
            self.next_token()?; // -> COLLUMNS
            all.push_node("next_keyword", self.construct_node(NodeType::Keyword)?);
            group.push_node("expr", all);
            self.next_token()?; // -> )
            group.push_node("rparen", self.construct_node(NodeType::Symbol)?);
            create.push_node("column_group", group);
        } else {
            create.push_node("column_group", self.parse_grouped_exprs(false)?);
        }
        if self.get_token(1)?.is("STORING") {
            self.next_token()?; // -> STORING
            create.push_node("storing", self.parse_keyword_with_grouped_exprs(false)?);
        }
        if self.get_token(1)?.is("PARTITION") {
            self.next_token()?; // -> PARTITION
            create.push_node("partitionby", self.parse_xxxby_exprs()?);
        }
        if self.get_token(1)?.is("OPTIONS") {
            self.next_token()?; // -> OPTIONS
            create.push_node("options", self.parse_keyword_with_grouped_exprs(false)?);
        }
        if self.get_token(1)?.is(";") && semicolon {
            self.next_token()?; // -> ;
            create.push_node("semicolon", self.construct_node(NodeType::Symbol)?)
        }
        Ok(create)
    }
    fn parse_create_table_statement(&mut self, semicolon: bool) -> BQ2CSTResult<Node> {
        let mut create = self.construct_node(NodeType::CreateTableStatement)?;
        let mut external = false;
        let mut snapshot = false;
        if self.get_token(1)?.is("OR") {
            self.next_token()?; // -> OR
            create.push_node_vec("or_replace", self.parse_n_keywords(2)?);
        }
        // NOTE actually, TEMP is not allowed in CREATE EXTERNAL TABLE statement
        // but it is allowed here for simplicity
        if self.get_token(1)?.in_(&vec!["TEMP", "TEMPORARY"]) {
            self.next_token()?; // -> TEMP
            create.push_node("temp", self.construct_node(NodeType::Keyword)?);
        }
        if self.get_token(1)?.is("EXTERNAL") {
            external = true;
            self.next_token()?; // -> EXTERNAL
            create.push_node("external", self.construct_node(NodeType::Keyword)?);
        }
        if self.get_token(1)?.is("SNAPSHOT") {
            snapshot = true;
            self.next_token()?; // -> SNAPSHOT
            create.push_node("snapshot", self.construct_node(NodeType::Keyword)?);
        }
        self.next_token()?; // -> TABLE
        create.push_node("what", self.construct_node(NodeType::Keyword)?);
        if self.get_token(1)?.is("IF") {
            self.next_token()?; // -> IF
            create.push_node_vec("if_not_exists", self.parse_n_keywords(3)?);
        }
        self.next_token()?; // -> ident
        create.push_node("ident", self.parse_identifier()?);
        if self.get_token(1)?.in_(&vec!["LIKE", "COPY"]) {
            self.next_token()?; // LIKE | COPY
            create.push_node("like_or_copy", self.construct_node(NodeType::Keyword)?);
            self.next_token()?; // -> ident
            create.push_node("source_table", self.parse_identifier()?);
        }
        if self.get_token(1)?.is("(") {
            self.next_token()?; // -> (
            create.push_node(
                "column_schema_group",
                self.parse_grouped_type_declaration_or_constraints(true, false)?,
            );
        }
        if self.get_token(1)?.is("default") {
            self.next_token()?; // DEFAULT
            let mut default = self.construct_node(NodeType::KeywordSequence)?;
            self.next_token()?; // COLLATE
            let mut collate = self.construct_node(NodeType::KeywordWithExpr)?;
            self.next_token()?; // collate_specification
            collate.push_node(
                "expr",
                // parse_expr is not needed here, construct_node is enough
                self.construct_node(NodeType::StringLiteral)?,
            );
            default.push_node("next_keyword", collate);
            create.push_node("default_collate", default);
        }
        // NOTE actually, PARTITION BY has only one expr
        // but for simplicity use parse_xxxby_exprs() here
        if self.get_token(1)?.is("PARTITION") && !external && !snapshot {
            self.next_token()?; // -> PARTITION
            create.push_node("partitionby", self.parse_xxxby_exprs()?);
        }
        if self.get_token(1)?.is("CLUSTER") && !external && !snapshot {
            self.next_token()?; // -> CLUSTER
            create.push_node("clusterby", self.parse_xxxby_exprs()?);
        }
        if self.get_token(1)?.is("WITH") && self.get_token(2)?.is("CONNECTION") && external {
            self.next_token()?; // -> WITH
            create.push_node("with_connection", self.parse_with_connection_clause()?);
        }
        if self.get_token(1)?.is("WITH") && self.get_token(2)?.is("PARTITION") && external {
            self.next_token()?; // -> WITH
            let mut with = self.construct_node(NodeType::WithPartitionColumnsClause)?;
            self.next_token()?; // -> PARTITION
            with.push_node_vec("partition_columns", self.parse_n_keywords(2)?);
            if self.get_token(1)?.is("(") {
                self.next_token()?; // -> (
                with.push_node(
                    "column_schema_group",
                    self.parse_grouped_type_declaration_or_constraints(false, false)?,
                );
            }
            create.push_node("with_partition_columns", with);
        }
        if self.get_token(1)?.is("CLONE") {
            self.next_token()?; // -> CLONE
            let mut clone = self.construct_node(NodeType::KeywordWithExpr)?;
            self.next_token()?; // -> identifier
            clone.push_node("expr", self.parse_table(true)?);
            create.push_node("clone", clone);
        }
        if self.get_token(1)?.is("OPTIONS") {
            self.next_token()?; // -> OPTIONS
            create.push_node("options", self.parse_keyword_with_grouped_exprs(false)?);
        }
        if self.get_token(1)?.is("AS") {
            self.next_token()?; // -> AS
            let mut as_ = self.construct_node(NodeType::KeywordWithStatement)?;
            self.next_token()?; // -> SELECT
            as_.push_node("stmt", self.parse_select_statement(false, true)?);
            create.push_node("as", as_)
        }
        if self.get_token(1)?.is(";") && semicolon {
            self.next_token()?; // -> ;
            create.push_node("semicolon", self.construct_node(NodeType::Symbol)?)
        }
        Ok(create)
    }
    fn parse_create_view_statement(&mut self, semicolon: bool) -> BQ2CSTResult<Node> {
        // NOTE currently multi token ident is not supported
        let mut create = self.construct_node(NodeType::CreateViewStatement)?;
        let mut materialized = false;
        // NOTE actually, OR REPLACE is not allowed in CREATE MATERIALIZED VIEW statement
        // but it is allowed here for simplicity
        if self.get_token(1)?.is("OR") {
            self.next_token()?; // -> OR
            create.push_node_vec("or_replace", self.parse_n_keywords(2)?);
        }
        if self.get_token(1)?.is("MATERIALIZED") {
            materialized = true;
            self.next_token()?; // -> MATERIALIZED
            create.push_node("materialized", self.construct_node(NodeType::Keyword)?);
        }
        self.next_token()?; // -> VIEW
        create.push_node("what", self.construct_node(NodeType::Keyword)?);
        if self.get_token(1)?.is("IF") {
            self.next_token()?; // -> IF
            create.push_node_vec("if_not_exists", self.parse_n_keywords(3)?);
        }
        self.next_token()?; // -> ident
        create.push_node("ident", self.parse_identifier()?);
        if self.get_token(1)?.is("(") && !materialized {
            self.next_token()?; // -> (
            let mut column_name_list = self.construct_node(NodeType::GroupedIdentWithOptions)?;
            let mut idents = vec![];
            loop {
                self.next_token()?; // -> ident
                if self.get_token(0)?.is(")") {
                    column_name_list.push_node("rparen", self.construct_node(NodeType::Symbol)?);
                    break;
                }
                let mut ident = self.parse_identifier()?;
                ident.node_type = NodeType::IdentWithOptions;
                if self.get_token(1)?.is("OPTIONS") {
                    self.next_token()?; // -> OPTIONS
                    ident.push_node("options", self.parse_keyword_with_grouped_exprs(false)?);
                }
                if self.get_token(1)?.is(",") {
                    self.next_token()?; // -> ,
                    ident.push_node("comma", self.construct_node(NodeType::Symbol)?);
                }
                idents.push(ident);
            }
            column_name_list.push_node_vec("idents", idents);
            create.push_node("column_name_list", column_name_list)
        }
        if self.get_token(1)?.is("PARTITION") && materialized {
            self.next_token()?; // -> PARTITION
            create.push_node("partitionby", self.parse_xxxby_exprs()?);
        }
        if self.get_token(1)?.is("CLUSTER") && materialized {
            self.next_token()?; // -> CLUSTER
            create.push_node("clusterby", self.parse_xxxby_exprs()?);
        }
        if self.get_token(1)?.is("OPTIONS") {
            self.next_token()?; // -> OPTIONS
            create.push_node("options", self.parse_keyword_with_grouped_exprs(false)?);
        }
        if self.get_token(1)?.is("AS") {
            self.next_token()?; // -> AS
            if self.get_token(1)?.is("REPLICA") {
                let mut as_ = self.construct_node(NodeType::KeywordSequence)?;
                self.next_token()?; // -> REPLICA
                let mut replica = self.construct_node(NodeType::KeywordSequence)?;
                self.next_token()?; // -> OF
                let mut of = self.construct_node(NodeType::KeywordWithExpr)?;
                self.next_token()?; // -> ident

                of.push_node("expr", self.parse_identifier()?);
                replica.push_node("next_keyword", of);
                as_.push_node("next_keyword", replica);
                create.push_node("as", as_)
            } else {
                let mut as_ = self.construct_node(NodeType::KeywordWithStatement)?;
                self.next_token()?; // -> SELECT
                as_.push_node("stmt", self.parse_select_statement(false, true)?);
                create.push_node("as", as_)
            }
        }
        if self.get_token(1)?.is(";") && semicolon {
            self.next_token()?; // -> ;
            create.push_node("semicolon", self.construct_node(NodeType::Symbol)?)
        }
        Ok(create)
    }
    fn parse_create_function_statement(&mut self, semicolon: bool) -> BQ2CSTResult<Node> {
        let mut node = self.construct_node(NodeType::CreateFunctionStatement)?;
        let mut is_tvf = false;
        if self.get_token(1)?.literal.to_uppercase() == "OR" {
            self.next_token()?; // -> OR
            node.push_node_vec("or_replace", self.parse_n_keywords(2)?);
        }
        if self.get_token(1)?.in_(&vec!["TEMPORARY", "TEMP"]) {
            self.next_token()?; // -> TEMP
            node.push_node("temp", self.construct_node(NodeType::Keyword)?);
        }
        if self.get_token(1)?.is("TABLE") {
            self.next_token()?; // -> TABLE
            node.push_node("table", self.construct_node(NodeType::Keyword)?);
            is_tvf = true;
        }
        if self.get_token(1)?.is("AGGREGATE") {
            self.next_token()?; // -> AGGREGATE
            node.push_node("aggregate", self.construct_node(NodeType::Keyword)?);
        }
        self.next_token()?; // -> FUNCTION
        node.push_node("what", self.construct_node(NodeType::Keyword)?);
        if self.get_token(1)?.in_(&vec!["IF"]) {
            self.next_token()?; // -> IF
            node.push_node_vec("if_not_exists", self.parse_n_keywords(3)?);
        }
        self.next_token()?; // -> ident
        node.push_node("ident", self.parse_identifier()?);
        self.next_token()?; // -> (
        node.push_node(
            "group",
            self.parse_grouped_type_declaration_or_constraints(false, true)?,
        );
        if self.get_token(1)?.is("RETURNS") {
            self.next_token()?; // -> RETURNS
            let mut returns = self.construct_node(NodeType::KeywordWithType)?;
            self.next_token()?; // -> type
            returns.push_node("type", self.parse_type(false, false)?);
            node.push_node("returns", returns);
        }
        if self.get_token(1)?.is("REMOTE") {
            self.next_token()?; // -> REMOTE
            node.push_node("remote", self.construct_node(NodeType::Keyword)?);

            self.next_token()?; // -> WITH
            let mut with = self.construct_node(NodeType::KeywordSequence)?;
            self.next_token()?; // -> CONNECTION
            let mut connection = self.construct_node(NodeType::KeywordWithExpr)?;
            self.next_token()?; // -> ident
            connection.push_node("expr", self.parse_identifier()?);
            with.push_node("next_keyword", connection);
            node.push_node("connection", with);

            if self.get_token(1)?.is("OPTIONS") {
                self.next_token()?; // -> OPTIONS
                node.push_node("options", self.parse_keyword_with_grouped_exprs(false)?);
            }
        } else if self.get_token(1)?.is("AS") {
            // sql function definition
            self.next_token()?; // -> AS
            if is_tvf {
                let mut as_ = self.construct_node(NodeType::KeywordWithStatement)?;
                self.next_token()?; // SELECT
                as_.push_node("stmt", self.parse_select_statement(false, true)?);
                node.push_node("as", as_)
            } else {
                let mut as_ = self.construct_node(NodeType::KeywordWithGroupedXXX)?;
                self.next_token()?; // -> (
                let mut group = self.construct_node(NodeType::GroupedExpr)?;
                self.next_token()?; // ( -> expr
                group.push_node(
                    "expr",
                    self.parse_expr(usize::MAX, false, false, false, true)?,
                );
                self.next_token()?; // expr -> )
                group.push_node("rparen", self.construct_node(NodeType::Symbol)?);
                as_.push_node("group", group);
                node.push_node("as", as_);
            }
        } else {
            // javascript | python function definition
            if self.get_token(1)?.in_(&vec!["DETERMINISTIC", "NOT"]) {
                self.next_token()?; // -> DETERMINISTIC | NOT
                if self.get_token(0)?.is("NOT") {
                    node.push_node_vec("determinism", self.parse_n_keywords(2)?);
                } else {
                    node.push_node_vec("determinism", self.parse_n_keywords(1)?);
                }
            }
            self.next_token()?; // -> LANGUAGE
            let mut language = self.construct_node(NodeType::KeywordWithExpr)?;
            self.next_token()?; // -> js | python
            language.push_node("expr", self.construct_node(NodeType::Identifier)?);
            node.push_node("language", language);
            if self.get_token(1)?.is("WITH") {
                self.next_token()?; // -> WITH
                let mut with = self.construct_node(NodeType::KeywordSequence)?;
                self.next_token()?; // -> CONNECTION
                let mut connection = self.construct_node(NodeType::KeywordWithExpr)?;
                self.next_token()?; // -> ident
                connection.push_node("expr", self.parse_identifier()?);
                with.push_node("next_keyword", connection);
                node.push_node("connection", with);
            }
            if self.get_token(1)?.is("OPTIONS") {
                self.next_token()?; // -> OPTIONS
                node.push_node("options", self.parse_keyword_with_grouped_exprs(false)?);
            }
            self.next_token()?; // -> AS
            let mut as_ = self.construct_node(NodeType::KeywordWithExpr)?;
            self.next_token()?; // -> javascript_code
            as_.push_node(
                "expr",
                self.parse_expr(usize::MAX, false, false, false, true)?,
            );
            node.push_node("as", as_);
        }
        if self.get_token(1)?.is(";") && semicolon {
            self.next_token()?; // ) -> ;
            node.push_node("semicolon", self.construct_node(NodeType::Symbol)?);
        }
        Ok(node)
    }
    fn parse_create_procedure_statement(&mut self, semicolon: bool) -> BQ2CSTResult<Node> {
        let mut create = self.construct_node(NodeType::CreateProcedureStatement)?;
        if self.get_token(1)?.is("OR") {
            self.next_token()?; // -> OR
            create.push_node_vec("or_replace", self.parse_n_keywords(2)?);
        }
        self.next_token()?; // -> PROCEDURE
        create.push_node("what", self.construct_node(NodeType::Keyword)?);
        if self.get_token(1)?.is("IF") {
            self.next_token()?; // -> IF
            create.push_node_vec("if_not_exists", self.parse_n_keywords(3)?);
        }
        self.next_token()?; // -> ident
        create.push_node("ident", self.parse_identifier()?);
        self.next_token()?; // -> (
        create.push_node(
            "group",
            self.parse_grouped_type_declaration_or_constraints(true, false)?,
        );
        if self.get_token(1)?.is("EXTERNAL") {
            self.next_token()?; // -> EXTERNAL
            let mut external = self.construct_node(NodeType::KeywordSequence)?;
            self.next_token()?; // -> SECURITY
            let mut security = self.construct_node(NodeType::KeywordSequence)?;
            self.next_token()?; // -> INVOKER
            let external_security = self.construct_node(NodeType::Keyword)?;
            security.push_node("next_keyword", external_security);
            external.push_node("next_keyword", security);
            create.push_node("external", external);
        }
        if self.get_token(1)?.is("WITH") {
            self.next_token()?; // -> WITH
            create.push_node("with_connection", self.parse_with_connection_clause()?);
        }
        if self.get_token(1)?.is("OPTIONS") {
            self.next_token()?; // -> OPTIONS
            create.push_node("options", self.parse_keyword_with_grouped_exprs(false)?);
        }
        if self.get_token(1)?.is("LANGUAGE") {
            self.next_token()?; // -> LANGUAGE
            let mut language = self.construct_node(NodeType::KeywordWithExpr)?;
            self.next_token()?; // -> PYTHON | JAVA | SCALA
            language.push_node("expr", self.construct_node(NodeType::Identifier)?);
            create.push_node("language", language);
        }
        if self.get_token(1)?.is("BEGIN") {
            self.next_token()?; // -> BEGIN
            create.push_node("stmt", self.parse_begin_statement(false)?);
        } else if self.get_token(1)?.is("AS") {
            self.next_token()?; // -> AS
            let mut as_ = self.construct_node(NodeType::KeywordWithExpr)?;
            self.next_token()?; // -> "pyspark code"
            as_.push_node(
                "expr",
                self.parse_expr(usize::MAX, false, false, false, true)?,
            );
            create.push_node("as", as_);
        }
        if self.get_token(1)?.is(";") && semicolon {
            self.next_token()?; // -> ;
            create.push_node("semicolon", self.construct_node(NodeType::Symbol)?);
        }
        Ok(create)
    }
    fn parse_create_row_access_policy_statement(&mut self, semicolon: bool) -> BQ2CSTResult<Node> {
        let mut create = self.construct_node(NodeType::CreateRowAccessPolicyStatement)?;
        if self.get_token(1)?.is("OR") {
            self.next_token()?; // -> OR
            create.push_node_vec("or_replace", self.parse_n_keywords(2)?);
        }
        self.next_token()?; // -> ROW
        create.push_node_vec("what", self.parse_n_keywords(3)?);
        if self.get_token(1)?.is("IF") {
            self.next_token()?; // -> IF
            create.push_node_vec("if_not_exists", self.parse_n_keywords(3)?);
        }
        self.next_token()?; // -> ident
        create.push_node("ident", self.parse_identifier()?);
        self.next_token()?; // -> ON
        let mut on = self.construct_node(NodeType::KeywordWithExpr)?;
        self.next_token()?; // -> tablename
        on.push_node("expr", self.parse_identifier()?);
        create.push_node("on", on);
        if self.get_token(1)?.is("GRANT") {
            self.next_token()?; // -> GRANT
            create.push_node("grant", self.construct_node(NodeType::Keyword)?);
            self.next_token()?; // -> TO
            let mut to = self.construct_node(NodeType::KeywordWithGroupedXXX)?;
            self.next_token()?; // -> (
            to.push_node("group", self.parse_grouped_exprs(false)?);
            create.push_node("to", to);
        }
        self.next_token()?; // -> FILTER
        create.push_node("filter", self.construct_node(NodeType::Keyword)?);
        self.next_token()?; // -> USING
        let mut using = self.construct_node(NodeType::KeywordWithExpr)?;
        self.next_token()?; // -> (
        using.push_node(
            "expr",
            self.parse_expr(usize::MAX, false, false, false, true)?,
        );
        create.push_node("using", using);

        if self.get_token(1)?.is(";") && semicolon {
            self.next_token()?; // -> ;
            create.push_node("semicolon", self.construct_node(NodeType::Symbol)?);
        }
        Ok(create)
    }
    fn parse_create_model_statement(&mut self, semicolon: bool) -> BQ2CSTResult<Node> {
        let mut create = self.construct_node(NodeType::CreateModelStatement)?;
        if self.get_token(1)?.is("OR") {
            self.next_token()?; // -> OR
            create.push_node_vec("or_replace", self.parse_n_keywords(2)?);
        }
        self.next_token()?; // -> MODEL
        create.push_node("what", self.construct_node(NodeType::Keyword)?);
        if self.get_token(1)?.is("IF") {
            self.next_token()?; // -> IF
            create.push_node_vec("if_not_exists", self.parse_n_keywords(3)?);
        }
        self.next_token()?; // -> ident
        create.push_node("ident", self.parse_identifier()?);
        if self.get_token(1)?.is("TRANSFORM") {
            self.next_token()?; // -> TRANSFORM
            create.push_node("transform", self.parse_keyword_with_grouped_exprs(true)?);
        }
        if self.get_token(1)?.is("INPUT") {
            self.next_token()?; // -> INPUT
            let mut input = self.construct_node(NodeType::KeywordWithGroupedXXX)?;
            self.next_token()?; // -> (
            input.push_node(
                "group",
                self.parse_grouped_type_declaration_or_constraints(false, false)?,
            );
            create.push_node("input", input);
        }
        if self.get_token(1)?.is("OUTPUT") {
            self.next_token()?; // -> OUTPUT
            let mut output = self.construct_node(NodeType::KeywordWithGroupedXXX)?;
            self.next_token()?; // -> (
            output.push_node(
                "group",
                self.parse_grouped_type_declaration_or_constraints(false, false)?,
            );
            create.push_node("output", output);
        }
        if self.get_token(1)?.is("REMOTE") {
            self.next_token()?; // -> REMOTE
            let mut remote = self.construct_node(NodeType::KeywordSequence)?;
            self.next_token()?; // -> WITH
            let mut with = self.construct_node(NodeType::KeywordSequence)?;
            self.next_token()?; // -> CONNECTION
            let mut connection = self.construct_node(NodeType::KeywordWithExpr)?;
            self.next_token()?; // -> ident
            if self.get_token(0)?.is("DEFAULT") {
                connection.push_node("expr", self.construct_node(NodeType::Keyword)?);
            } else {
                connection.push_node("expr", self.parse_identifier()?);
            }
            with.push_node("next_keyword", connection);
            remote.push_node("next_keyword", with);
            create.push_node("remote", remote);
        }
        if self.get_token(1)?.is("OPTIONS") {
            self.next_token()?; // -> OPTIONS
            create.push_node("options", self.parse_keyword_with_grouped_exprs(false)?);
        }
        if self.get_token(1)?.is("AS") {
            self.next_token()?; // -> AS
            if self.get_token(2)?.is("training_data") {
                let mut as_ = self.construct_node(NodeType::KeywordWithGroupedXXX)?;
                self.next_token()?; // -> (
                let mut group = self.construct_node(NodeType::TrainingDataCustomHolidayClause)?;
                self.next_token()?; // -> trainin_data
                group.push_node("training_data", self.parse_cte()?);
                self.next_token()?; // -> custom_holiday
                group.push_node("custom_holiday", self.parse_cte()?);
                self.next_token()?; // -> )
                group.push_node("rparen", self.construct_node(NodeType::Symbol)?);
                as_.push_node("group", group);
                create.push_node("training_data_custom_holiday", as_)
            } else {
                let mut as_ = self.construct_node(NodeType::KeywordWithStatement)?;
                self.next_token()?; // -> SELECT
                as_.push_node("stmt", self.parse_select_statement(false, true)?);
                create.push_node("query", as_)
            }
        }
        if self.get_token(1)?.is(";") && semicolon {
            self.next_token()?; // -> ;
            create.push_node("semicolon", self.construct_node(NodeType::Symbol)?)
        }
        Ok(create)
    }
    fn parse_alter_schema_statement(&mut self, semicolon: bool) -> BQ2CSTResult<Node> {
        let mut alter = self.construct_node(NodeType::AlterSchemaStatement)?;
        self.next_token()?; // -> SCHEMA
        alter.push_node("what", self.construct_node(NodeType::Keyword)?);
        if self.get_token(1)?.is("IF") {
            self.next_token()?; // -> IF
            alter.push_node_vec("if_exists", self.parse_n_keywords(2)?);
        }
        self.next_token()?; // -> ident
        alter.push_node("ident", self.parse_identifier()?);
        self.next_token()?; // -> SET | ADD
        match self.get_token(0)?.literal.to_uppercase().as_str() {
            "SET" => {
                alter.push_node("set", self.construct_node(NodeType::Keyword)?);
                if self.get_token(1)?.is("DEFAULT") {
                    self.next_token()?; // DEFAULT
                    let mut default = self.construct_node(NodeType::KeywordSequence)?;
                    self.next_token()?; // COLLATE
                    let mut collate = self.construct_node(NodeType::KeywordWithExpr)?;
                    self.next_token()?; // collate_specification
                    collate.push_node(
                        "expr",
                        // parse_expr is not needed here, construct_node is enough
                        self.construct_node(NodeType::StringLiteral)?,
                    );
                    default.push_node("next_keyword", collate);
                    alter.push_node("default_collate", default);
                }
            }
            "ADD" => {
                let mut add = self.construct_node(NodeType::KeywordSequence)?;
                self.next_token()?; // -> REPLICA
                let mut replica = self.construct_node(NodeType::KeywordWithExpr)?;
                self.next_token()?; // -> ident
                let ident = self.parse_identifier()?;

                replica.push_node("expr", ident);
                add.push_node("next_keyword", replica);
                alter.push_node("add", add);
            }
            "DROP" => {
                let mut drop = self.construct_node(NodeType::KeywordSequence)?;
                self.next_token()?; // -> REPLICA
                let mut replica = self.construct_node(NodeType::KeywordWithExpr)?;
                self.next_token()?; // -> ident
                let ident = self.parse_identifier()?;

                replica.push_node("expr", ident);
                drop.push_node("next_keyword", replica);
                alter.push_node("drop", drop);
            }
            _ => {
                return Err(BQ2CSTError::from_token(
                    self.get_token(0)?,
                    format!(
                        "Expected `SET`, `ADD` or `DROP` but got: {:?}",
                        self.get_token(0)?
                    ),
                ))
            }
        }
        if self.get_token(1)?.is("OPTIONS") {
            self.next_token()?; // -> OPTIONS
            alter.push_node("options", self.parse_keyword_with_grouped_exprs(false)?);
        }
        if self.get_token(1)?.is(";") && semicolon {
            self.next_token()?; // -> ;
            alter.push_node("semicolon", self.construct_node(NodeType::Symbol)?);
        }
        Ok(alter)
    }
    fn parse_alter_table_statement(&mut self, semicolon: bool) -> BQ2CSTResult<Node> {
        let mut alter = self.construct_node(NodeType::AlterTableStatement)?;
        self.next_token()?; // -> TABLE
        alter.push_node("what", self.construct_node(NodeType::Keyword)?);
        if self.get_token(1)?.is("IF") {
            self.next_token()?; // -> IF
            alter.push_node_vec("if_exists", self.parse_n_keywords(2)?);
        }
        self.next_token()?; // -> ident
        alter.push_node("ident", self.parse_identifier()?);
        match self.get_token(1)?.literal.to_uppercase().as_str() {
            "SET" => {
                self.next_token()?; // -> SET
                alter.push_node("set", self.construct_node(NodeType::Keyword)?);
                if self.get_token(1)?.is("OPTIONS") {
                    self.next_token()?; // -> OPTIONS
                    alter.push_node("options", self.parse_keyword_with_grouped_exprs(false)?);
                } else if self.get_token(1)?.is("DEFAULT") {
                    self.next_token()?; // DEFAULT
                    let mut default = self.construct_node(NodeType::KeywordSequence)?;
                    self.next_token()?; // COLLATE
                    let mut collate = self.construct_node(NodeType::KeywordWithExpr)?;
                    self.next_token()?; // collate_specification
                    collate.push_node(
                        "expr",
                        // parse_expr is not needed here, construct_node is enough
                        self.construct_node(NodeType::StringLiteral)?,
                    );
                    default.push_node("next_keyword", collate);
                    alter.push_node("default_collate", default);
                }
            }
            "ADD" => {
                if self.get_token(2)?.is("COLUMN") {
                    let mut add_columns = Vec::new();
                    while self.get_token(1)?.is("ADD") {
                        self.next_token()?; // -> ADD
                        let mut add_column = self.construct_node(NodeType::AddColumnClause)?;
                        self.next_token()?; // -> COLUMN
                        add_column.push_node("what", self.construct_node(NodeType::Keyword)?);
                        if self.get_token(1)?.is("IF") {
                            self.next_token()?; // -> IF
                            add_column.push_node_vec("if_not_exists", self.parse_n_keywords(3)?);
                        }
                        self.next_token()?; // -> ident
                        let mut ident = self.construct_node(NodeType::TypeDeclaration)?;
                        self.next_token()?; // -> type
                        ident.push_node("type", self.parse_type(true, false)?);
                        add_column.push_node("type_declaration", ident);
                        if self.get_token(1)?.is(",") {
                            self.next_token()?; // -> ,
                            add_column.push_node("comma", self.construct_node(NodeType::Symbol)?);
                        }
                        add_columns.push(add_column);
                    }
                    alter.push_node_vec("add_columns", add_columns);
                } else {
                    let mut add_constraints = Vec::new();
                    while self.get_token(1)?.is("ADD") {
                        self.next_token()?; // -> ADD
                        let mut add_constraint =
                            self.construct_node(NodeType::AddConstraintClause)?;
                        self.next_token()?; // -> PRIMARY | CONSTRAINT | REFERENCES
                        let constraint = self.parse_constraint()?;
                        if self.get_token(1)?.is(",") {
                            self.next_token()?; // -> ,
                            add_constraint
                                .push_node("comma", self.construct_node(NodeType::Symbol)?);
                        }
                        add_constraint.push_node("what", constraint);
                        add_constraints.push(add_constraint);
                    }
                    alter.push_node_vec("add_constraints", add_constraints);
                }
            }
            "RENAME" => {
                if self.get_token(2)?.is("TO") {
                    self.next_token()?; // -> RENAME
                    alter.push_node("rename", self.construct_node(NodeType::Keyword)?);
                    self.next_token()?; // -> TO
                    let mut to = self.construct_node(NodeType::KeywordWithExpr)?;
                    self.next_token()?; // -> ident
                    to.push_node("expr", self.parse_identifier()?);
                    alter.push_node("to", to);
                } else {
                    let mut rename_columns = vec![];
                    while self.get_token(1)?.is("RENAME") {
                        self.next_token()?; // -> RENAME
                        let mut rename = self.construct_node(NodeType::RenameColumnClause)?;
                        self.next_token()?; // -> COLUMN
                        rename.push_node("column", self.construct_node(NodeType::Keyword)?);
                        if self.get_token(1)?.is("IF") {
                            self.next_token()?; // -> IF
                            let mut if_ = self.construct_node(NodeType::KeywordSequence)?;
                            self.next_token()?; // -> EXISTS
                            if_.push_node("next_keyword", self.construct_node(NodeType::Keyword)?);
                            rename.push_node("if_exists", if_);
                        }
                        self.next_token()?; // -> ident (original)
                        rename.push_node("ident", self.parse_identifier()?);
                        self.next_token()?; // -> TO
                        let mut to = self.construct_node(NodeType::KeywordWithExpr)?;
                        self.next_token()?; // -> ident (new)
                        to.push_node("expr", self.parse_identifier()?);
                        if self.get_token(1)?.is(",") {
                            self.next_token()?; // -> ;
                            rename.push_node("comma", self.construct_node(NodeType::Symbol)?);
                        }
                        rename.push_node("to", to);
                        rename_columns.push(rename);
                    }
                    alter.push_node_vec("rename_columns", rename_columns);
                }
            }
            "DROP" => {
                let mut drop_columns = Vec::new();
                while self.get_token(1)?.is("DROP") {
                    self.next_token()?; // -> DROP
                    let mut drop_column = self.construct_node(NodeType::AlterTableDropClause)?;
                    if self.get_token(1)?.is("PRIMARY") {
                        self.next_token()?; // -> PRIMARY
                        let mut pk = self.construct_node(NodeType::KeywordWithExpr)?;
                        self.next_token()?; // -> KEY
                        pk.push_node("expr", self.construct_node(NodeType::Keyword)?);
                        drop_column.push_node("what", pk);
                        if self.get_token(1)?.is("IF") {
                            self.next_token()?; // -> IF
                            drop_column.push_node_vec("if_exists", self.parse_n_keywords(2)?);
                        }
                    } else {
                        self.next_token()?; // -> COLUMN | CONSTRAINT
                        drop_column.push_node("what", self.construct_node(NodeType::Keyword)?);
                        if self.get_token(1)?.is("IF") {
                            self.next_token()?; // -> IF
                            drop_column.push_node_vec("if_exists", self.parse_n_keywords(2)?);
                        }
                        self.next_token()?; // -> ident
                        drop_column.push_node("ident", self.parse_identifier()?);
                    }
                    if self.get_token(1)?.is(",") {
                        self.next_token()?; // -> ,
                        drop_column.push_node("comma", self.construct_node(NodeType::Symbol)?);
                    }
                    drop_columns.push(drop_column);
                }
                alter.push_node_vec("drop_columns", drop_columns);
            }
            "ALTER" => {
                self.next_token()?; // -> ALTER
                alter.push_node(
                    "alter_column_stmt",
                    self.parse_alter_column_statement(false)?,
                );
            }
            _ => {
                return Err(BQ2CSTError::from_token(
                    self.get_token(1)?,
                    format!(
                        "Expected `SET`, `ADD` `RENAME` or `DROP` but got: {:?}",
                        self.get_token(1)?
                    ),
                ))
            }
        }
        if self.get_token(1)?.is(";") && semicolon {
            self.next_token()?; // -> ;
            alter.push_node("semicolon", self.construct_node(NodeType::Symbol)?);
        }
        Ok(alter)
    }
    fn parse_alter_column_statement(&mut self, semicolon: bool) -> BQ2CSTResult<Node> {
        let mut alter = self.construct_node(NodeType::AlterColumnStatement)?;
        self.next_token()?; // -> COLUMN
        alter.push_node("what", self.construct_node(NodeType::Keyword)?);
        if self.get_token(1)?.is("IF") {
            self.next_token()?;
            alter.push_node_vec("if_exists", self.parse_n_keywords(2)?);
        }
        self.next_token()?; // -> ident
        alter.push_node("ident", self.construct_node(NodeType::Identifier)?);
        self.next_token()?; // -> SET | DROP
        match self.get_token(0)?.literal.to_uppercase().as_str() {
            "SET" => {
                alter.push_node("set", self.construct_node(NodeType::Keyword)?);
                if self.get_token(1)?.is("OPTIONS") {
                    self.next_token()?; // -> OPTIONS
                    alter.push_node("options", self.parse_keyword_with_grouped_exprs(false)?);
                } else if self.get_token(1)?.is("DATA") {
                    self.next_token()?; // -> DATA
                    alter.push_node_vec("data_type", self.parse_n_keywords(2)?);
                    self.next_token()?; // -> type
                    alter.push_node("type", self.parse_type(false, false)?);
                } else {
                    self.next_token()?; // -> DEFAULT
                    let mut default = self.construct_node(NodeType::KeywordWithExpr)?;
                    self.next_token()?; // -> expr
                    default.push_node(
                        "expr",
                        self.parse_expr(usize::MAX, false, false, false, true)?,
                    );
                    alter.push_node("default", default);
                }
            }
            "DROP" => {
                if self.get_token(1)?.is("DEFAULT") {
                    alter.push_node_vec("drop_default", self.parse_n_keywords(2)?);
                } else {
                    alter.push_node_vec("drop_not_null", self.parse_n_keywords(3)?);
                }
            }
            _ => {
                return Err(BQ2CSTError::from_token(
                    self.get_token(0)?,
                    format!(
                        "Expected `SET` or `DROP` but got : {:?}",
                        self.get_token(0)?
                    ),
                ))
            }
        }
        if self.get_token(1)?.is(";") && semicolon {
            self.next_token()?; // -> ;
            alter.push_node("semicolon", self.construct_node(NodeType::Symbol)?);
        }
        Ok(alter)
    }
    fn parse_alter_vector_index_statement(&mut self, semicolon: bool) -> BQ2CSTResult<Node> {
        let mut alter = self.construct_node(NodeType::AlterVectorIndexStatement)?;
        self.next_token()?; // -> VECTOR
        let mut vector = self.construct_node(NodeType::KeywordSequence)?;
        self.next_token()?; // -> INDEX
        vector.push_node("next_keyword", self.construct_node(NodeType::Keyword)?);
        alter.push_node("what", vector);
        if self.get_token(1)?.is("IF") {
            self.next_token()?; // -> IF
            alter.push_node_vec("if_exists", self.parse_n_keywords(2)?);
        }
        self.next_token()?; // -> ident
        alter.push_node("ident", self.parse_identifier()?);

        self.next_token()?; // -> ON
        let mut on = self.construct_node(NodeType::KeywordWithExpr)?;
        self.next_token()?; // -> tablename
        on.push_node("expr", self.parse_identifier()?);
        alter.push_node("on", on);

        self.next_token()?; // -> REBUILD
        let operation = self.construct_node(NodeType::Keyword)?;
        alter.push_node("operation", operation);

        if self.get_token(1)?.is(";") && semicolon {
            self.next_token()?; // -> ;
            alter.push_node("semicolon", self.construct_node(NodeType::Symbol)?);
        }
        Ok(alter)
    }
    fn parse_alter_view_statement(&mut self, semicolon: bool) -> BQ2CSTResult<Node> {
        let mut alter = self.construct_node(NodeType::AlterViewStatement)?;
        if self.get_token(1)?.is("MATERIALIZED") {
            self.next_token()?; // -> MATERIALIZED
            alter.push_node("materialized", self.construct_node(NodeType::Keyword)?);
        }
        self.next_token()?; // -> VIEW
        alter.push_node("what", self.construct_node(NodeType::Keyword)?);
        if self.get_token(1)?.is("IF") {
            self.next_token()?; // -> IF
            alter.push_node_vec("if_exists", self.parse_n_keywords(2)?);
        }
        self.next_token()?; // -> ident
        alter.push_node("ident", self.parse_identifier()?);
        if self.get_token(1)?.is("ALTER") {
            self.next_token()?;
            let alter_column = self.parse_alter_column_statement(false)?;
            alter.push_node("alter_column_stmt", alter_column);
        } else {
            self.next_token()?; // -> SET
            alter.push_node("set", self.construct_node(NodeType::Keyword)?);
            self.next_token()?; // -> OPTIONS
            alter.push_node("options", self.parse_keyword_with_grouped_exprs(false)?);
        }
        if self.get_token(1)?.is(";") && semicolon {
            self.next_token()?; // -> ;
            alter.push_node("semicolon", self.construct_node(NodeType::Symbol)?);
        }
        Ok(alter)
    }
    fn parse_alter_organization_statement(&mut self, semicolon: bool) -> BQ2CSTResult<Node> {
        let mut alter = self.construct_node(NodeType::AlterOrganizationStatement)?;
        self.next_token()?; // -> ORGANIZATION
        alter.push_node("what", self.construct_node(NodeType::Keyword)?);
        self.next_token()?; // -> SET
        alter.push_node("set", self.construct_node(NodeType::Keyword)?);
        self.next_token()?; // -> OPTIONS
        alter.push_node("options", self.parse_keyword_with_grouped_exprs(false)?);
        if self.get_token(1)?.is(";") && semicolon {
            self.next_token()?; // -> ;
            alter.push_node("semicolon", self.construct_node(NodeType::Symbol)?);
        }
        Ok(alter)
    }
    fn parse_alter_project_statement(&mut self, semicolon: bool) -> BQ2CSTResult<Node> {
        let mut alter = self.construct_node(NodeType::AlterProjectStatement)?;
        self.next_token()?; // -> PROJECT
        alter.push_node("what", self.construct_node(NodeType::Keyword)?);
        if !self.get_token(1)?.is("SET") {
            self.next_token()?; // -> ident
            alter.push_node("ident", self.parse_identifier()?);
        }
        self.next_token()?; // -> SET
        alter.push_node("set", self.construct_node(NodeType::Keyword)?);
        self.next_token()?; // -> OPTIONS
        alter.push_node("options", self.parse_keyword_with_grouped_exprs(false)?);
        if self.get_token(1)?.is(";") && semicolon {
            self.next_token()?; // -> ;
            alter.push_node("semicolon", self.construct_node(NodeType::Symbol)?);
        }
        Ok(alter)
    }
    fn parse_alter_bicapacity_statement(&mut self, semicolon: bool) -> BQ2CSTResult<Node> {
        let mut alter = self.construct_node(NodeType::AlterBICapacityStatement)?;
        self.next_token()?; // -> BI_CAPACITY
        alter.push_node("what", self.construct_node(NodeType::Keyword)?);
        self.next_token()?; // -> ident
        alter.push_node("ident", self.parse_identifier()?);
        self.next_token()?; // -> SET
        alter.push_node("set", self.construct_node(NodeType::Keyword)?);
        self.next_token()?; // -> OPTIONS
        alter.push_node("options", self.parse_keyword_with_grouped_exprs(false)?);
        if self.get_token(1)?.is(";") && semicolon {
            self.next_token()?; // -> ;
            alter.push_node("semicolon", self.construct_node(NodeType::Symbol)?);
        }
        Ok(alter)
    }
    fn parse_alter_reservation_statement(&mut self, semicolon: bool) -> BQ2CSTResult<Node> {
        let mut alter = self.construct_node(NodeType::AlterReservationStatement)?;
        self.next_token()?; // -> CAPACITY | RESERVATION
        alter.push_node("what", self.construct_node(NodeType::Keyword)?);
        self.next_token()?; // -> ident
        alter.push_node("ident", self.parse_identifier()?);
        self.next_token()?; // -> SET
        alter.push_node("set", self.construct_node(NodeType::Keyword)?);
        self.next_token()?; // -> OPTIONS
        alter.push_node("options", self.parse_keyword_with_grouped_exprs(false)?);
        if self.get_token(1)?.is(";") && semicolon {
            self.next_token()?; // -> ;
            alter.push_node("semicolon", self.construct_node(NodeType::Symbol)?);
        }
        Ok(alter)
    }
    fn parse_alter_model_statement(&mut self, semicolon: bool) -> BQ2CSTResult<Node> {
        let mut alter = self.construct_node(NodeType::AlterModelStatement)?;
        self.next_token()?; // -> MODEL
        alter.push_node("what", self.construct_node(NodeType::Keyword)?);
        if self.get_token(1)?.is("IF") {
            self.next_token()?; // -> IF
            alter.push_node_vec("if_exists", self.parse_n_keywords(2)?);
        }
        self.next_token()?; // -> ident
        alter.push_node("ident", self.parse_identifier()?);
        self.next_token()?; // -> SET
        alter.push_node("set", self.construct_node(NodeType::Keyword)?);
        self.next_token()?; // -> OPTIONS
        alter.push_node("options", self.parse_keyword_with_grouped_exprs(false)?);
        if self.get_token(1)?.is(";") && semicolon {
            self.next_token()?; // -> ;
            alter.push_node("semicolon", self.construct_node(NodeType::Symbol)?);
        }
        Ok(alter)
    }
    fn parse_drop_row_access_policy_statement(&mut self, semicolon: bool) -> BQ2CSTResult<Node> {
        let mut drop = self.construct_node(NodeType::DropRowAccessPolicyStatement)?;
        self.next_token()?; // -> ROW | ALL
        if self.get_token(0)?.is("ROW") {
            drop.push_node_vec("what", self.parse_n_keywords(3)?);
        } else {
            drop.push_node_vec("what", self.parse_n_keywords(4)?);
        }
        if self.get_token(1)?.is("IF") {
            self.next_token()?; // -> IF
            drop.push_node_vec("if_exists", self.parse_n_keywords(2)?);
        }
        if !self.get_token(1)?.is("ON") {
            self.next_token()?; // -> ident
            drop.push_node("ident", self.parse_identifier()?);
        }
        self.next_token()?; // -> ON
        let mut on = self.construct_node(NodeType::KeywordWithExpr)?;
        self.next_token()?; // -> tablename
        on.push_node("expr", self.parse_identifier()?);
        drop.push_node("on", on);
        if self.get_token(1)?.is(";") && semicolon {
            self.next_token()?; // -> ;
            drop.push_node("semicolon", self.construct_node(NodeType::Symbol)?);
        }
        Ok(drop)
    }
    fn parse_drop_statement_general(&mut self, semicolon: bool) -> BQ2CSTResult<Node> {
        let mut drop = self.construct_node(NodeType::DropStatement)?;
        if self.get_token(1)?.is("EXTERNAL") {
            self.next_token()?; // -> EXTERNAL
            drop.push_node("external", self.construct_node(NodeType::Keyword)?);
        } else if self.get_token(1)?.is("MATERIALIZED") {
            self.next_token()?; // -> MATERIALIZED
            drop.push_node("materialized", self.construct_node(NodeType::Keyword)?);
        } else if self.get_token(1)?.is("TABLE") && self.get_token(2)?.is("FUNCTION") {
            self.next_token()?; // -> TABLE
            drop.push_node("table", self.construct_node(NodeType::Keyword)?)
        }
        self.next_token()?; // -> SCHEMA, TABLE, VIEW, FUNCTION, PROCEDURE, SEARCH
        if self.get_token(0)?.is("SEARCH") {
            let mut what = self.construct_node(NodeType::KeywordSequence)?;
            self.next_token()?; // -> INDEX
            what.push_node("next_keyword", self.construct_node(NodeType::Keyword)?);
            drop.push_node("what", what);
        } else {
            drop.push_node("what", self.construct_node(NodeType::Keyword)?);
        }
        if self.get_token(1)?.is("IF") {
            self.next_token()?; // -> IF
            drop.push_node_vec("if_exists", self.parse_n_keywords(2)?);
        }
        self.next_token()?; // -> ident
        drop.push_node("ident", self.parse_identifier()?);
        if self.get_token(1)?.in_(&vec!["CASCADE", "RESTRICT"]) {
            self.next_token()?; // -> CASCADE, RESTRICT
            drop.push_node(
                "cascade_or_restrict",
                self.construct_node(NodeType::Keyword)?,
            );
        }
        if self.get_token(1)?.is("on") {
            self.next_token()?; // -> ON
            let mut on = self.construct_node(NodeType::KeywordWithExpr)?;
            self.next_token()?; // -> tablename
            on.push_node("expr", self.parse_identifier()?);
            drop.push_node("on", on);
        }
        if self.get_token(1)?.is(";") && semicolon {
            self.next_token()?; // -> ;
            drop.push_node("semicolon", self.construct_node(NodeType::Symbol)?);
        }
        Ok(drop)
    }
    fn parse_undrop_statement(&mut self, semicolon: bool) -> BQ2CSTResult<Node> {
        let mut undrop = self.construct_node(NodeType::UndropStatement)?;
        self.next_token()?; // -> SCHEMA
        undrop.push_node("what", self.construct_node(NodeType::Keyword)?);
        if self.get_token(1)?.is("IF") {
            self.next_token()?; // -> IF
            undrop.push_node_vec("if_not_exists", self.parse_n_keywords(3)?);
        }
        self.next_token()?; // -> ident
        undrop.push_node("ident", self.parse_identifier()?);
        if self.get_token(1)?.is(";") && semicolon {
            self.next_token()?; // -> ;
            undrop.push_node("semicolon", self.construct_node(NodeType::Symbol)?);
        }
        Ok(undrop)
    }
    // ----- DCL -----
    fn parse_grant_statement(&mut self, semicolon: bool) -> BQ2CSTResult<Node> {
        let mut grant = self.construct_node(NodeType::GrantStatement)?;
        self.next_token()?; // -> role
        grant.push_node_vec("roles", self.parse_exprs(&vec![], false, true)?);
        self.next_token()?; // -> ON
        grant.push_node("on", self.construct_node(NodeType::Keyword)?);
        self.next_token()?; // -> resource_type
        grant.push_node("resource_type", self.construct_node(NodeType::Keyword)?);
        self.next_token()?; // -> ident
        grant.push_node("ident", self.parse_identifier()?);
        self.next_token()?; // -> TO
        let mut to = self.construct_node(NodeType::KeywordWithExprs)?;
        self.next_token()?; // -> user
        to.push_node_vec("exprs", self.parse_exprs(&vec![], false, true)?);
        grant.push_node("to", to);
        if self.get_token(1)?.is(";") && semicolon {
            self.next_token()?; // ;
            grant.push_node("semicolon", self.construct_node(NodeType::Symbol)?)
        }
        Ok(grant)
    }
    fn parse_revoke_statement(&mut self, semicolon: bool) -> BQ2CSTResult<Node> {
        let mut revoke = self.construct_node(NodeType::RevokeStatement)?;
        self.next_token()?; // -> role
        revoke.push_node_vec("roles", self.parse_exprs(&vec![], false, true)?);
        self.next_token()?; // -> ON
        revoke.push_node("on", self.construct_node(NodeType::Keyword)?);
        self.next_token()?; // -> resource_type
        revoke.push_node("resource_type", self.construct_node(NodeType::Keyword)?);
        self.next_token()?; // -> ident
        revoke.push_node("ident", self.parse_identifier()?);
        self.next_token()?; // -> FROM
        let mut from = self.construct_node(NodeType::KeywordWithExprs)?;
        self.next_token()?; // -> user
        from.push_node_vec("exprs", self.parse_exprs(&vec![], false, true)?);
        revoke.push_node("from", from);
        if self.get_token(1)?.is(";") && semicolon {
            self.next_token()?; // ;
            revoke.push_node("semicolon", self.construct_node(NodeType::Symbol)?)
        }
        Ok(revoke)
    }
    fn parse_create_reservation_statement(&mut self, semicolon: bool) -> BQ2CSTResult<Node> {
        let mut create = self.construct_node(NodeType::CreateReservationStatement)?;
        self.next_token()?; // -> CAPACITY | RESERVATION | ASSIGNMENT
        create.push_node("what", self.construct_node(NodeType::Keyword)?);
        self.next_token()?; // -> ident
        create.push_node("ident", self.parse_identifier()?);
        if self.get_token(1)?.is("AS") {
            // may be deprecated
            self.next_token()?; // -> AS
            create.push_node("as", self.construct_node(NodeType::Keyword)?);
            self.next_token()?; // -> JSON
            create.push_node("json", self.construct_node(NodeType::Keyword)?);
            self.next_token()?; // -> '''{}'''
            create.push_node(
                "json_string",
                self.parse_expr(usize::MAX, false, false, false, true)?,
            );
        } else if self.get_token(1)?.is("OPTIONS") {
            self.next_token()?; // -> OPTIONS
            create.push_node("options", self.parse_keyword_with_grouped_exprs(false)?);
        }
        if self.get_token(1)?.is(";") && semicolon {
            self.next_token()?; // ;
            create.push_node("semicolon", self.construct_node(NodeType::Symbol)?)
        }
        Ok(create)
    }
    // ----- script -----
    fn parse_declare_statement(&mut self, semicolon: bool) -> BQ2CSTResult<Node> {
        let mut declare = self.construct_node(NodeType::DeclareStatement)?;
        let mut idents = Vec::new();
        loop {
            self.next_token()?; // -> ident
            if self.get_token(1)?.is(",") {
                let mut ident = self.parse_identifier()?;
                self.next_token()?; // ident -> comma
                ident.push_node("comma", self.construct_node(NodeType::Symbol)?);
                idents.push(ident);
            } else {
                idents.push(self.parse_identifier()?);
                break;
            }
        }
        declare.push_node_vec("idents", idents);
        if !self.get_token(1)?.is("DEFAULT") {
            self.next_token()?; // ident -> variable_type
            declare.push_node("variable_type", self.parse_type(false, false)?);
        }
        if self.get_token(1)?.is("DEFAULT") {
            self.next_token()?; // -> DEFAULT
            let mut default = self.construct_node(NodeType::KeywordWithExpr)?;
            self.next_token()?; // DEFAULT -> expr
            default.push_node(
                "expr",
                self.parse_expr(usize::MAX, false, false, false, true)?,
            );
            declare.push_node("default", default);
        }
        if self.get_token(1)?.is(";") && semicolon {
            self.next_token()?;
            declare.push_node("semicolon", self.construct_node(NodeType::Symbol)?);
        }
        Ok(declare)
    }
    fn parse_set_statement(&mut self, semicolon: bool) -> BQ2CSTResult<Node> {
        let mut set = self.construct_node(NodeType::SetStatement)?;
        self.next_token()?; // set -> expr
        set.push_node(
            "expr",
            self.parse_expr(usize::MAX, false, false, false, true)?,
        );
        if self.get_token(1)?.is(";") && semicolon {
            self.next_token()?;
            set.push_node("semicolon", self.construct_node(NodeType::Symbol)?);
        }
        Ok(set)
    }
    fn parse_execute_statement(&mut self, semicolon: bool) -> BQ2CSTResult<Node> {
        let mut execute = self.construct_node(NodeType::ExecuteStatement)?;
        self.next_token()?; // EXECUTE -> IMMEDIATE
        execute.push_node("immediate", self.construct_node(NodeType::Keyword)?);
        self.next_token()?; // IMMEDIATE -> sql_expr
        execute.push_node(
            "sql_expr",
            self.parse_expr(usize::MAX, false, false, false, true)?,
        );
        if self.get_token(1)?.is("INTO") {
            self.next_token()?; // sql_expr -> INTO
            let mut into = self.construct_node(NodeType::KeywordWithExprs)?;
            let mut idents = Vec::new();
            loop {
                self.next_token()?; // -> ident
                if self.get_token(1)?.is(",") {
                    let mut ident = self.parse_identifier()?;
                    self.next_token()?; // ident -> ,
                    ident.push_node("comma", self.construct_node(NodeType::Symbol)?);
                    idents.push(ident);
                } else {
                    idents.push(self.parse_identifier()?);
                    break;
                }
            }
            into.push_node_vec("exprs", idents);
            execute.push_node("into", into);
        }
        if self.get_token(1)?.is("USING") {
            self.next_token()?; // -> using
            let mut using = self.construct_node(NodeType::KeywordWithExprs)?;
            self.next_token()?; // using -> exprs
            using.push_node_vec("exprs", self.parse_exprs(&vec![], true, true)?);
            execute.push_node("using", using);
        }
        if self.get_token(1)?.is(";") && semicolon {
            self.next_token()?;
            execute.push_node("semicolon", self.construct_node(NodeType::Symbol)?);
        }
        Ok(execute)
    }
    fn parse_begin_statement(&mut self, semicolon: bool) -> BQ2CSTResult<Node> {
        let mut begin = self.construct_node(NodeType::BeginStatement)?;
        let mut stmts = Vec::new();
        while !self.get_token(1)?.in_(&vec!["END", "EXCEPTION"]) {
            self.next_token()?; // -> stmt
            stmts.push(self.parse_statement(true)?);
        }
        if 0 < stmts.len() {
            begin.push_node_vec("stmts", stmts);
        }
        if self.get_token(1)?.is("exception") {
            self.next_token()?; // ; -> EXCEPTION
            let exception = self.construct_node(NodeType::Keyword)?;
            self.next_token()?; // EXCEPTION -> WHEN
            let when = self.construct_node(NodeType::Keyword)?;
            self.next_token()?; // WHEN -> ERROR
            let error = self.construct_node(NodeType::Keyword)?;
            begin.push_node_vec("exception_when_error", vec![exception, when, error]);
            self.next_token()?; // ERROR -> THEN
            begin.push_node("then", self.parse_keyword_with_statements(&vec!["END"])?);
        }
        self.next_token()?; // -> end
        begin.push_node("end", self.construct_node(NodeType::Keyword)?);
        if self.get_token(1)?.is(";") && semicolon {
            self.next_token()?; // -> ;
            begin.push_node("semicolon", self.construct_node(NodeType::Symbol)?);
        }
        Ok(begin)
    }
    fn parse_if_statement(&mut self, semicolon: bool) -> BQ2CSTResult<Node> {
        let mut if_ = self.construct_node(NodeType::IfStatement)?;
        self.next_token()?; // -> condition
        if_.push_node(
            "condition",
            self.parse_expr(usize::MAX, false, false, false, true)?,
        );

        self.next_token()?; // -> THEN
        if_.push_node(
            "then",
            self.parse_keyword_with_statements(&vec!["ELSEIF", "ELSE", "END"])?,
        );

        let mut elseifs = Vec::new();
        while self.get_token(1)?.is("ELSEIF") {
            self.next_token()?; // -> ELSEIF
            let mut elseif = self.construct_node(NodeType::ElseIfClause)?;
            self.next_token()?; // -> condition
            elseif.push_node(
                "condition",
                self.parse_expr(usize::MAX, false, false, false, true)?,
            );
            self.next_token()?; // -> THEN
            elseif.push_node(
                "then",
                self.parse_keyword_with_statements(&vec!["ELSEIF", "ELSE", "END"])?,
            );
            elseifs.push(elseif);
        }
        if 0 < elseifs.len() {
            if_.push_node_vec("elseifs", elseifs);
        }

        if self.get_token(1)?.is("ELSE") {
            self.next_token()?; // -> ELSE
            if_.push_node("else", self.parse_keyword_with_statements(&vec!["END"])?);
        }
        self.next_token()?; // -> END
        let end = self.construct_node(NodeType::Keyword)?;
        self.next_token()?; // -> IF
        if_.push_node_vec("end_if", vec![end, self.construct_node(NodeType::Keyword)?]);
        if self.get_token(1)?.is(";") && semicolon {
            self.next_token()?; // -> ;
            if_.push_node("semicolon", self.construct_node(NodeType::Symbol)?);
        }
        Ok(if_)
    }
    fn parse_labeled_statement(&mut self, semicolon: bool) -> BQ2CSTResult<Node> {
        let label = self.construct_node(NodeType::Identifier)?;
        self.next_token()?; // -> :
        let colon = self.construct_node(NodeType::Symbol)?;
        self.next_token()?; // -> stmt
        let mut stmt = self.parse_statement(false)?;
        if stmt
            .children
            .keys()
            .any(|k| k == "leading_label" || k == "colon")
        {
            return Err(BQ2CSTError::from_token(
                self.get_token(0)?,
                format!(
                    "The statement is not properly labeled: {:?}",
                    self.get_token(0)?
                ),
            ));
        };
        stmt.push_node("leading_label", label);
        stmt.push_node("colon", colon);
        if !self.get_token(1)?.is(";") {
            self.next_token()?; // -> trailing_label
            stmt.push_node("trailing_label", self.construct_node(NodeType::Identifier)?);
        }
        if self.get_token(1)?.is(";") && semicolon {
            self.next_token()?; // -> ;
            stmt.push_node("semicolon", self.construct_node(NodeType::Symbol)?);
        }
        Ok(stmt)
    }
    fn parse_break_continue_statement(&mut self, semicolon: bool) -> BQ2CSTResult<Node> {
        let mut node = self.construct_node(NodeType::BreakContinueStatement)?;
        if !self.get_token(1)?.is(";") {
            self.next_token()?; // -> label
            node.push_node("label", self.construct_node(NodeType::Identifier)?);
        }
        if self.get_token(1)?.is(";") && semicolon {
            self.next_token()?; // -> ;
            node.push_node("semicolon", self.construct_node(NodeType::Symbol)?);
        }
        Ok(node)
    }
    fn parse_loop_statement(&mut self, semicolon: bool) -> BQ2CSTResult<Node> {
        let mut loop_ = self.parse_keyword_with_statements(&vec!["END"])?;
        loop_.node_type = NodeType::LoopStatement;
        self.next_token()?; // -> END
        let end = self.construct_node(NodeType::Keyword)?;
        self.next_token()?; // -> LOOP
        loop_.push_node_vec(
            "end_loop",
            vec![end, self.construct_node(NodeType::Keyword)?],
        );
        if self.get_token(1)?.is(";") && semicolon {
            self.next_token()?; // -> ;
            loop_.push_node("semicolon", self.construct_node(NodeType::Symbol)?);
        }
        Ok(loop_)
    }
    fn parse_repeat_statement(&mut self, semicolon: bool) -> BQ2CSTResult<Node> {
        let mut repeat = self.parse_keyword_with_statements(&vec!["UNTIL"])?;
        repeat.node_type = NodeType::RepeatStatement;
        self.next_token()?; // -> UNTIL
        let mut until = self.construct_node(NodeType::KeywordWithExpr)?;
        self.next_token()?; // -> expr
        until.push_node(
            "expr",
            self.parse_expr(usize::MAX, false, false, false, true)?,
        );
        repeat.push_node("until", until);
        self.next_token()?; // -> END
        repeat.push_node_vec("end_repeat", self.parse_n_keywords(2)?);
        if self.get_token(1)?.is(";") && semicolon {
            self.next_token()?; // -> ;
            repeat.push_node("semicolon", self.construct_node(NodeType::Symbol)?);
        }
        Ok(repeat)
    }
    fn parse_while_statement(&mut self, semicolon: bool) -> BQ2CSTResult<Node> {
        let mut while_ = self.construct_node(NodeType::WhileStatement)?;
        self.next_token()?; // -> condition
        while_.push_node(
            "condition",
            self.parse_expr(usize::MAX, false, false, false, true)?,
        );
        self.next_token()?; // -> DO
        while_.push_node("do", self.parse_keyword_with_statements(&vec!["END"])?);
        self.next_token()?; // -> END
        let end = self.construct_node(NodeType::Keyword)?;
        self.next_token()?; // -> WHILE
        while_.push_node_vec(
            "end_while",
            vec![end, self.construct_node(NodeType::Keyword)?],
        );
        if self.get_token(1)?.is(";") && semicolon {
            self.next_token()?; // -> ;
            while_.push_node("semicolon", self.construct_node(NodeType::Symbol)?);
        }
        Ok(while_)
    }
    fn parse_single_token_statement(&mut self, semicolon: bool) -> BQ2CSTResult<Node> {
        let mut node = self.construct_node(NodeType::SingleTokenStatement)?;
        if self.get_token(1)?.is(";") && semicolon {
            self.next_token()?; // -> ;
            node.push_node("semicolon", self.construct_node(NodeType::Symbol)?);
        }
        Ok(node)
    }
    fn parse_for_statement(&mut self, semicolon: bool) -> BQ2CSTResult<Node> {
        let mut for_ = self.construct_node(NodeType::ForStatement)?;
        self.next_token()?; // -> ident
        for_.push_node("ident", self.construct_node(NodeType::Identifier)?);
        self.next_token()?; // -> IN
        let mut in_ = self.construct_node(NodeType::KeywordWithGroupedXXX)?;
        self.next_token()?; // -> (table_expression)
        in_.push_node("group", self.parse_select_statement(false, true)?);
        for_.push_node("in", in_);
        self.next_token()?; // -> DO
        for_.push_node("do", self.parse_keyword_with_statements(&vec!["END"])?);
        self.next_token()?; // -> END
        for_.push_node_vec("end_for", self.parse_n_keywords(2)?);
        if self.get_token(1)?.is(";") && semicolon {
            self.next_token()?; // -> ;
            for_.push_node("semicolon", self.construct_node(NodeType::Symbol)?);
        }
        Ok(for_)
    }
    fn parse_transaction_statement(&mut self, semicolon: bool) -> BQ2CSTResult<Node> {
        let mut node = self.construct_node(NodeType::TransactionStatement)?;
        if self.get_token(1)?.is("TRANSACTION") {
            self.next_token()?; // -> TRANSACTION
            node.push_node("transaction", self.construct_node(NodeType::Keyword)?);
        }
        if self.get_token(1)?.is(";") && semicolon {
            self.next_token()?; // -> ;
            node.push_node("semicolon", self.construct_node(NodeType::Symbol)?);
        }
        Ok(node)
    }
    fn parse_raise_statement(&mut self, semicolon: bool) -> BQ2CSTResult<Node> {
        let mut raise = self.construct_node(NodeType::RaiseStatement)?;
        if self.get_token(1)?.is("using") {
            self.next_token()?; // -> USING
            let mut using = self.construct_node(NodeType::KeywordWithExpr)?;
            self.next_token()?; // -> MESSAGE
            using.push_node(
                "expr",
                self.parse_expr(usize::MAX, false, false, false, true)?,
            );
            raise.push_node("using", using);
        }
        if self.get_token(1)?.is(";") && semicolon {
            self.next_token()?; // -> ;
            raise.push_node("semicolon", self.construct_node(NodeType::Symbol)?);
        }
        Ok(raise)
    }
    fn parse_case_statement(&mut self, semicolon: bool) -> BQ2CSTResult<Node> {
        let mut case = self.construct_node(NodeType::CaseStatement)?;
        if !self.get_token(1)?.is("WHEN") {
            self.next_token()?; // -> expr
            case.push_node(
                "expr",
                self.parse_expr(usize::MAX, false, false, false, true)?,
            );
        }
        let mut arms = Vec::new();
        while self.get_token(1)?.is("WHEN") {
            self.next_token()?; // -> WHEN
            let mut when = self.construct_node(NodeType::CaseStatementArm)?;
            self.next_token()?; // -> expr
            when.push_node(
                "expr",
                self.parse_expr(usize::MAX, false, false, false, true)?,
            );
            self.next_token()?; // -> THEN
            when.push_node("then", self.construct_node(NodeType::Keyword)?);
            let mut stmts = Vec::new();
            while !self.get_token(1)?.in_(&vec!["WHEN", "ELSE", "END"]) {
                self.next_token()?; // -> stmt
                stmts.push(self.parse_statement(true)?);
            }
            when.push_node_vec("stmts", stmts);
            arms.push(when)
        }
        if self.get_token(1)?.is("ELSE") {
            self.next_token()?; // -> ELSE
            let mut else_ = self.construct_node(NodeType::CaseStatementArm)?;
            let mut stmts = Vec::new();
            while !self.get_token(1)?.is("END") {
                self.next_token()?; // -> stmt
                stmts.push(self.parse_statement(true)?);
            }
            else_.push_node_vec("stmts", stmts);
            arms.push(else_);
        }
        case.push_node_vec("arms", arms);
        self.next_token()?; // -> END
        case.push_node_vec("end_case", self.parse_n_keywords(2)?);
        if self.get_token(1)?.is(";") && semicolon {
            self.next_token()?; // -> ;
            case.push_node("semicolon", self.construct_node(NodeType::Symbol)?);
        }
        Ok(case)
    }
    fn parse_call_statement(&mut self, semicolon: bool) -> BQ2CSTResult<Node> {
        let mut call = self.construct_node(NodeType::CallStatement)?;
        self.next_token()?; // -> procedure_name
        let procedure = self.parse_expr(usize::MAX, false, false, false, true)?;
        call.push_node("procedure", procedure);
        if self.get_token(1)?.is(";") && semicolon {
            self.next_token()?; // -> ;
            call.push_node("semicolon", self.construct_node(NodeType::Symbol)?);
        }
        Ok(call)
    }
    // ----- debug -----
    fn parse_assert_satement(&mut self, semicolon: bool) -> BQ2CSTResult<Node> {
        let mut assert = self.construct_node(NodeType::AssertStatement)?;
        self.next_token()?; // -> expr
        assert.push_node(
            "expr",
            self.parse_expr(usize::MAX, false, false, false, true)?,
        );
        if self.get_token(1)?.is("AS") {
            self.next_token()?; // -> AS
            assert.push_node("as", self.construct_node(NodeType::Keyword)?);
            self.next_token()?; // -> description
            assert.push_node(
                "description",
                self.parse_expr(usize::MAX, false, false, false, true)?,
            )
        }
        if self.get_token(1)?.is(";") && semicolon {
            self.next_token()?; // -> ;
            assert.push_node("semicolon", self.construct_node(NodeType::Symbol)?);
        }
        Ok(assert)
    }
    // ----- other -----
    fn parse_export_data_statement(&mut self, semicolon: bool) -> BQ2CSTResult<Node> {
        let mut export = self.construct_node(NodeType::ExportDataStatement)?;
        self.next_token()?; // -> DATA
        export.push_node("data", self.construct_node(NodeType::Keyword)?);
        if self.get_token(1)?.is("WITH") {
            self.next_token()?; // -> WITH
            export.push_node("with_connection", self.parse_with_connection_clause()?);
        }
        self.next_token()?; // -> OPTIONS
        export.push_node("options", self.parse_keyword_with_grouped_exprs(false)?);
        self.next_token()?; // -> AS
        let mut as_ = self.construct_node(NodeType::KeywordWithStatement)?;
        self.next_token()?; // -> stmt
        as_.push_node("stmt", self.parse_statement(false)?);
        export.push_node("as", as_);
        if self.get_token(1)?.is(";") && semicolon {
            self.next_token()?; // -> ;
            export.push_node("semicolon", self.construct_node(NodeType::Symbol)?);
        }
        Ok(export)
    }
    fn parse_export_model_statement(&mut self, semicolon: bool) -> BQ2CSTResult<Node> {
        let mut export = self.construct_node(NodeType::ExportModelStatement)?;
        self.next_token()?; // -> MODEL
        export.push_node("what", self.construct_node(NodeType::Keyword)?);
        self.next_token()?; // -> ident
        export.push_node("ident", self.parse_identifier()?);
        if self.get_token(1)?.is("OPTIONS") {
            self.next_token()?; // -> OPTIONS
            export.push_node("options", self.parse_keyword_with_grouped_exprs(false)?);
        }
        if self.get_token(1)?.is(";") && semicolon {
            self.next_token()?; // -> ;
            export.push_node("semicolon", self.construct_node(NodeType::Symbol)?);
        }
        Ok(export)
    }
    fn parse_load_statement(&mut self, semicolon: bool) -> BQ2CSTResult<Node> {
        let mut load = self.construct_node(NodeType::LoadStatement)?;
        self.next_token()?; // -> DATA
        load.push_node("data", self.construct_node(NodeType::Keyword)?);
        self.next_token()?; // -> INTO | OVERWRITE
        load.push_node("into", self.construct_node(NodeType::Keyword)?);
        self.next_token()?; // -> ident
        load.push_node("ident", self.parse_identifier()?);
        if self.get_token(1)?.in_(&vec!["OVERWRITE", "PARTITIONS"]) {
            self.next_token()?; // -> OVERWRITE | PARTITIONS
            let mut op = self.construct_node(NodeType::OverwritePartitionsClause)?;
            if self.get_token(0)?.is("OVERWRITE") {
                let mut o = op;
                o.node_type = NodeType::Keyword;
                self.next_token()?; // -> PARTITIONS
                op = self.construct_node(NodeType::OverwritePartitionsClause)?;
                op.push_node("overwrite", o);
            }
            self.next_token()?; // -> grouped expr

            // if precedence is usize::MAX
            // column_group is parsed as function arguments
            op.push_node(
                "grouped_expr",
                self.parse_expr(101, false, false, false, true)?,
            );
            load.push_node("overwrite_partitions", op);
        }
        if self.get_token(1)?.is("(") {
            self.next_token()?; // -> (
            load.push_node(
                "column_group",
                self.parse_grouped_type_declaration_or_constraints(false, false)?,
            );
        }
        if self.get_token(1)?.is("PARTITION") {
            self.next_token()?; // -> PARTITION
            load.push_node("partitionby", self.parse_xxxby_exprs()?);
        }
        if self.get_token(1)?.is("CLUSTER") {
            self.next_token()?; // -> CLUSTER
            load.push_node("clusterby", self.parse_xxxby_exprs()?);
        }
        if self.get_token(1)?.is("OPTIONS") {
            self.next_token()?; // -> OPTIONS
            load.push_node("options", self.parse_keyword_with_grouped_exprs(false)?);
        }
        self.next_token()?; // -> FROM
        load.push_node("from", self.construct_node(NodeType::Keyword)?);
        self.next_token()?; // -> FILES
        load.push_node("files", self.construct_node(NodeType::Keyword)?);
        self.next_token()?; // -> from_files
        load.push_node("from_files", self.parse_grouped_exprs(false)?);
        if self.get_token(1)?.is("WITH") && self.get_token(2)?.is("PARTITION") {
            self.next_token()?; // -> WITH
            let mut with = self.construct_node(NodeType::WithPartitionColumnsClause)?;
            self.next_token()?; // -> PARTITION
            with.push_node_vec("partition_columns", self.parse_n_keywords(2)?);
            if self.get_token(1)?.is("(") {
                self.next_token()?; // -> (
                with.push_node(
                    "column_schema_group",
                    self.parse_grouped_type_declaration_or_constraints(false, false)?,
                );
            }
            load.push_node("with_partition_columns", with);
        }
        if self.get_token(1)?.is("WITH") && self.get_token(2)?.is("CONNECTION") {
            self.next_token()?; // -> WITH
            load.push_node("with", self.construct_node(NodeType::Keyword)?);
            self.next_token()?; // -> CONNECTION
            load.push_node("connection", self.construct_node(NodeType::Keyword)?);
            self.next_token()?; // -> connection_name
            load.push_node("connection_name", self.parse_identifier()?);
        }

        if self.get_token(1)?.is(";") && semicolon {
            self.next_token()?; // -> ;
            load.push_node("semicolon", self.construct_node(NodeType::Symbol)?);
        }
        Ok(load)
    }
}
