#[cfg(test)]
mod tests;

use crate::token::Token;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fmt;

#[derive(PartialEq, Debug, Clone, Serialize, Deserialize)]
pub enum ContentType {
    Node(Node),
    NodeVec(Vec<Node>),
}

#[derive(PartialEq, Debug, Clone, Serialize, Deserialize)]
pub enum NodeType {
    AccessOperator,        // arr[OFFSET(1)] | json['path']
    AddColumnClause,       // ADD COLUMN x INT64 OPTIONS()
    AddConstraintClause,   // ADD PRIMARY KEY (a) | ADD REFERENCES `table`(col) NOT ENFORCED
    AggregatePipeOperator, // AGGREGATE COUNT(*) GROUP BY col
    AlterColumnStatement,
    AlterBICapacityStatement,
    AlterModelStatement,
    AlterOrganizationStatement,
    AlterTableDropClause, // DROP COLUMN x
    AlterProjectStatement,
    AlterReservationStatement,
    AlterSchemaStatement,
    AlterTableStatement,
    AlterVectorIndexStatement,
    AlterViewStatement,
    ArrayLiteral, // [1, 2]
    AssertStatement,
    Asterisk,
    BasePipeOperator, // SELECT a, b | LIMIT 10
    BinaryOperator,   // + | - | = | ...
    BeginStatement,
    BetweenOperator,
    BooleanLiteral, // TRUE | FALSE
    BreakContinueStatement,
    CallingFunction,      // (
    CallingTableFunction, // (
    CallingUnnest,        // UNNEST([1, 2])
    CallStatement,        // CALL procedure_name (arg);
    Constraint,           // PRIMARY KEY (a) | CONSTRAINT name REFERENCES `table`(col) NOT ENFORCED
    CaseExpr,             // CASE WHEN a then b ELSE c END
    CaseExprArm,          // WHEN a THEN b
    CaseStatement,
    CaseStatementArm,
    CastArgument, // x AS INT64
    CreateFunctionStatement,
    CreateIndexStatement,
    CreateModelStatement,
    CreateProcedureStatement,
    CreateReservationStatement, // CREATE CAPACITY `ident` AS JSON '{}' | ...
    CreateRowAccessPolicyStatement,
    CreateSchemaStatement,
    CreateTableStatement,
    CreateViewStatement,
    Comment,
    DeclareStatement,
    DeleteStatement,
    DifferentialPrivacyClause, // WITH DIFFERENTIAL_PRIVACY OPTIONS ()
    DotOperator,
    DropStatement,
    DropRowAccessPolicyStatement,
    ElseIfClause, // ELSEIF true SELECT;
    EOF,
    EmptyStruct,      // ()
    ExecuteStatement, // EXECUTE IMMEDIATE 'SELECT 1;'
    ExportDataStatement,
    ExportModelStatement,
    ExtractArgument,         // DAY FROM expr
    ForSystemTimeAsOfClause, // FOR SYSTEM_TIME AS OF ts
    ForStatement,
    FromStatement, // FROM table_name;
    FunctionChain,
    GrantStatement,
    GroupByExprs,
    GroupedIdentWithOptions,             // (col OPTIONS())
    GroupedExpr,                         // (1)
    GroupedExprs,                        // (1, 2, 3)
    GroupedPattern,                      // (symbol1 symbol2)
    GroupedStatement,                    // (SELECT 1)
    GroupedType,                         // <INT64>
    GroupedTypeDeclarationOrConstraints, // <x INT64, y FLOAT64> | (x INT64, y FLOAT64)
    Keyword,
    KeywordSequence,
    KeywordWithExpr,       // WHEN expr
    KeywordWithExprs,      // USING 1, 2
    KeywordWithType,       // RETURNS INT64
    KeywordWithGroupedXXX, // AS (1 + 1)
    KeywordWithStatement,  // THEN INSERT ROW
    KeywordWithStatements, // THEN SELECT 1;
    Identifier,
    IdentWithOptions,
    IfStatement,
    InsertStatement,
    IntervalLiteral,
    InOperator,
    IsDistinctFromOperator,
    JoinOperator,     // JOIN | ,
    JoinPipeOperator, // JOIN | INNER JOIN
    LimitClause,
    LimitPipeOperator,
    LoadStatement,
    LoopStatement,
    MatchRecognizeClause, // MATCH_RECOGNIZE ()
    MatchRecognizeConfig, // (PARTITION BY x ORDER BY y MEASURES ...)
    MatchRecognizePipeOperator,
    MergeStatement,
    MultiTokenIdentifier,
    NumericLiteral, // 1 | 1.1 | .1E10
    NullLiteral,
    OrPattern,                 // symbol1 | symbol2
    OverClause,                // OVER (PARTITON BY x, y)
    OverwritePartitionsClause, // OVERWRITE PARTITIONS (_PARTITIONTIME = ts)
    Parameter,                 // ? | @param
    Pattern,                   // symbol*?
    PatternClause,             // PATTERN (A B+ C)
    PatternQuantifier,         // {m,n}
    PipeStatement,             // |>
    PivotConfig,               // (SUM(c1) FOR c2 IN (v1, v2))
    PivotOperator,
    PivotPipeOperator,
    RaiseStatement,
    RangeLiteral, // RANGE<DATE> '[2023-01-01, 2024-01-01)'
    RenameColumnClause,
    RepeatStatement,
    RevokeStatement,
    SelectPipeOperator,
    SelectStatement,      // SELECT 1;
    SetOperator,          // UNION | INTERSECT | EXCEPT
    SetStatement,         // SET x = 5
    SingleTokenStatement, // BREAK; | LEAVE; | ...
    StringLiteral,
    StructLiteral,
    Symbol,            // ) | ] | * | ...
    TableSampleClause, // TABLESAMPLE SYSTEM (10 PERCENT)
    TableSamplePipeOperator,
    TableSampleRatio,                // (10 PERCENT)
    Template,                        // {{variable}}
    TrainingDataCustomHolidayClause, // (training_data AS (SELECT ...), custom_holiday AS (SELECT ...))
    TransactionStatement,            // BEGIN | COMMIT | ROLLBACK
    TruncateStatement,
    Type,            // INT64
    TypeDeclaration, // x INT64
    UnaryOperator,   // - | + | TIMESTAMP | ...
    Unknown,
    UndropStatement,
    UnionPipeOperator, // UNION ALL (SELECT 1) | INTERSECT DISTINCT (SELECT 1)
    UnpivotOperator,
    UnpivotPipeOperator,
    UnpivotConfig, // ((c1, c2) FOR v IN ((v1, v2) 1, (v3, v4) 3))
    UpdateStatement,
    WhenClause, // WHEN MATCHED THEN DELETE
    WhileStatement,
    WindowClause,        // WINDOW x AS (PARTITION BY c1)
    WindowExpr,          // x AS (PARTITION BY c1 ORDER BY c2)
    WindowFrameClause,   // ROWS BETWEEN 2 PRECEDING AND 2 FOLLOWING
    WindowSpecification, // PARTITION BY c1 ORDER BY c2 ROWS UNBOUNDED PRECEDING
    WithClause,          // WITH x AS (SELECT 1)
    WithOffsetClause,
    WithPipeOperator,
    WithPartitionColumnsClause, // WITH PARTITION COLUMNS (c1 INT64, c2 FLOAT64)
    WithQuery,                  // x AS (SELECT 1)
    XXXByExprs,                 // ORDER BY expr
}

#[derive(PartialEq, Debug, Clone, Serialize, Deserialize)]
pub struct Node {
    pub token: Option<Token>,
    pub node_type: NodeType,
    pub children: HashMap<String, ContentType>,
}

impl Node {
    pub fn new(token: Token, node_type: NodeType) -> Node {
        Node {
            token: Some(token),
            node_type,
            children: HashMap::new(),
        }
    }
    pub fn empty(node_type: NodeType) -> Node {
        Node {
            token: None,
            node_type,
            children: HashMap::new(),
        }
    }
    fn format(&self, indent: usize, is_array: bool) -> String {
        let mut res = Vec::new();
        // self & node_type
        let literal = match self.token.clone() {
            Some(t) => t.literal,
            None => "None".to_string(),
        };
        let self_;
        if is_array {
            self_ = format!("{}- self: {}", " ".repeat((indent - 1) * 2), literal);
        } else {
            self_ = format!("{}self: {}", " ".repeat(indent * 2), literal);
        }
        let type_ = format!("{:?}", self.node_type);
        res.push(format!("{} ({})", self_, type_));
        // children
        let mut keys: Vec<&String> = self.children.keys().collect();
        keys.sort();
        for k in keys {
            match self.children.get(k) {
                Some(ContentType::Node(n)) => {
                    res.push(format!("{}{}:", " ".repeat(indent * 2), k));
                    res.push(n.format(indent + 1, false));
                }
                Some(ContentType::NodeVec(ns)) => {
                    let mut empty_array = " []";
                    if ns.len() != 0 {
                        empty_array = ""
                    };
                    res.push(format!("{}{}:{}", " ".repeat(indent * 2), k, empty_array));
                    for n in ns {
                        res.push(n.format(indent + 1, true));
                    }
                }
                None => panic!(),
            }
        }
        res.join("\n")
    }
    pub fn push_node(&mut self, key: &str, node: Node) {
        self.children
            .insert(key.to_string(), ContentType::Node(node));
    }
    pub fn push_node_vec(&mut self, key: &str, nodes: Vec<Node>) {
        self.children
            .insert(key.to_string(), ContentType::NodeVec(nodes));
    }
}

impl fmt::Display for Node {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "{}\n", self.format(0, false))
    }
}
