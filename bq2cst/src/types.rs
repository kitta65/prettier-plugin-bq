use wasm_bindgen::prelude::*;

#[wasm_bindgen(typescript_custom_section)]
const NODES: &'static str = r#"
export function parse(code: string): UnknownNode[];
export function tokenize(code: string): Token[];

export type UnknownNode =
  | AccessOperator
  | AddColumnClause
  | AddConstraintClause
  | AggregatePipeOperator
  | AlterBICapacityStatement
  | AlterColumnStatement
  | AlterModelStatement
  | AlterOrganizationStatement
  | AlterProjectStatement
  | AlterReservationStatement
  | AlterSchemaStatement
  | AlterTableDropClause
  | AlterTableStatement
  | AlterVectorIndexStatement
  | AlterViewStatement
  | ArrayLiteral
  | AssertStatement
  | Asterisk
  | BasePipeOperator
  | BinaryOperator
  | BeginStatement
  | BetweenOperator
  | BooleanLiteral
  | BreakContinueStatement
  | CallingFunction
  | CallingTableFunction
  | CallingUnnest
  | CallStatement
  | CaseExpr
  | CaseExprArm
  | CaseStatement
  | CaseStatementArm
  | CastArgument
  | Comment
  | Constraint
  | CreateFunctionStatement
  | CreateIndexStatement
  | CreateModelStatement
  | CreateProcedureStatement
  | CreateReservationStatement
  | CreateRowAccessPolicyStatement
  | CreateSchemaStatement
  | CreateTableStatement
  | CreateViewStatement
  | DeclareStatement
  | DeleteStatement
  | DifferentialPrivacyClause
  | DotOperator
  | DropRowAccessPolicyStatement
  | DropStatement
  | ElseIfClause
  | EmptyStruct
  | EOF
  | ExecuteStatement
  | ExportDataStatement
  | ExportModelStatement
  | ExtractArgument
  | ForStatement
  | ForSystemTimeAsOfClause
  | FromStatement
  | FunctionChain
  | GrantStatement
  | GroupByExprs
  | GroupedExpr
  | GroupedExprs
  | GroupedIdentWithOptions
  | GroupedPattern
  | GroupedStatement
  | GroupedTypeDeclarationOrConstraints
  | GroupedType
  | Identifier
  | IfStatement
  | IdentWithOptions
  | InOperator
  | InsertStatement
  | IntervalLiteral
  | IsDistinctFromOperator
  | JoinOperator
  | JoinPipeOperator
  | Keyword
  | KeywordSequence
  | KeywordWithExpr
  | KeywordWithExprs
  | KeywordWithGroupedXXX
  | KeywordWithStatement
  | KeywordWithStatements
  | KeywordWithType
  | LimitClause
  | LimitPipeOperator
  | LoadStatement
  | LoopStatement
  | MatchRecognizeClause
  | MatchRecognizeConfig
  | MatchRecognizePipeOperator
  | MergeStatement
  | MultiTokenIdentifier
  | NullLiteral
  | NumericLiteral
  | OrPattern
  | OverClause
  | OverwritePartitionsClause
  | Parameter
  | Pattern
  | PatternClause
  | PatternQuantifier
  | PipeStatement
  | PivotOperator
  | PivotPipeOperator
  | PivotConfig
  | RaiseStatement
  | RangeLiteral
  | RenameColumnClause
  | RepeatStatement
  | RevokeStatement
  | SelectStatement
  | SelectPipeOperator
  | SetOperator
  | SetStatement
  | SingleTokenStatement
  | StringLiteral
  | StructLiteral
  | Symbol_
  | TableSampleClause
  | TableSamplePipeOperator
  | TableSampleRatio
  | Template
  | TransactionStatement
  | TrainingDataCustomHolidayClause
  | TruncateStatement
  | Type
  | TypeDeclaration
  | UnaryOperator
  | UndropStatement
  | UnionPipeOperator
  | UnpivotConfig
  | UnpivotPipeOperator
  | UnpivotOperator
  | UpdateStatement
  | WhenClause
  | WhileStatement
  | WindowClause
  | WindowExpr
  | WindowFrameClause
  | WindowSpecification
  | WithClause
  | WithOffsetClause
  | WithPipeOperator
  | WithPartitionColumnsClause
  | WithQuery
  | XXXByExprs;

export type Token = {
  line: number;
  column: number;
  literal: string;
};

interface BaseNode {
  token: Token | null;
  node_type: string;
  children: {
    leading_comments?: { NodeVec: Comment[] };
    trailing_comments?: { NodeVec: Comment[] };
  };
}

export type NodeChild = { Node: UnknownNode };
export type NodeVecChild = { NodeVec: UnknownNode[] };

// ----- sub types of BaseNode (abstract) -----
export type CallingFunctionGeneral = Expr & {
  children: {
    func: { Node: IdentifierGeneral & UnknownNode };
    distinct?: NodeChild;
    args?: { NodeVec: (Expr & UnknownNode | SelectStatement)[] };
    ignore_nulls?: NodeVecChild;
    orderby?: NodeChild;
    limit?: NodeChild;
    having?: NodeChild;
    rparen: NodeChild;
    over?: NodeChild;
  };
};

export type Expr = BaseNode & {
  token: Token;
  children: {
    as?: { Node: Keyword };
    alias?: { Node: Identifier };
    comma?: NodeChild;
    order?: NodeChild;
    null_order?: NodeVecChild;
  };
};

export type FromItemExpr = Expr & {
  children: {
    with_offset: NodeChild;
    pivot?: NodeChild;
    unpivot?: NodeChild;
    match_recognize?: NodeChild;
  };
};

export type LabelableStatement = XXXStatement & {
  children: {
    leading_label?: NodeChild;
    colon?: NodeChild;
    trailing_label?: NodeChild;
  };
};

export type IdentifierGeneral = FromItemExpr & {
  children: {
    // TABLESAMPLE SYSTEM can only be applied directly to base tables
    tablesample?: NodeChild;
    for_system_time_as_of?: NodeChild;
  };
};

export type XXXStatement = BaseNode & {
  token: Token;
  children: {
    semicolon?: { Node: Symbol_ };
  };
};

export type PipeOperator = BaseNode & {
  children: {
    keywords?: NodeChild;
    exprs?: NodeVecChild;
  };
}

// ----- sub types of BaseNode (concrete) -----
export type AddColumnClause = BaseNode & {
  node_type: "AddColumnClause";
  children: {
    what: NodeChild;
    if_not_exists?: NodeVecChild;
    type_declaration: NodeChild;
    comma?: NodeChild;
  };
};

export type AddConstraintClause = BaseNode & {
  node_type: "AddConstraintClause";
  children: {
    what?: NodeChild;
    comma?: NodeChild;
  };
};

export type AggregatePipeOperator = PipeOperator & {
  node_type: "AggregatePipeOperator";
  children: {
    groupby?: NodeChild;
  }
}

export type AlterBICapacityStatement = XXXStatement & {
  node_type: "AlterBICapacityStatement";
  children: {
    what: NodeChild;
    ident: NodeChild;
    set: NodeChild;
    options: NodeChild;
  };
};

export type AlterColumnStatement = BaseNode & {
  // NOTE this is not XXXStatement!
  node_type: "AlterColumnStatement";
  children: {
    what: NodeChild;
    if_exists?: NodeVecChild;
    ident: NodeChild;
    // SET
    set: NodeChild;
    options?: NodeChild;
    data_type?: NodeVecChild;
    type?: NodeChild;
    default?: NodeChild;
    // DROP
    drop_not_null?: NodeVecChild;
    drop_default?: NodeVecChild;
  };
};

export type AlterModelStatement = XXXStatement & {
  node_type: "AlterModelStatement";
  children: {
    what: NodeChild;
    if_exists?: NodeVecChild;
    ident: NodeChild;
    set: NodeChild;
    options: NodeChild;
  };
};

export type AlterOrganizationStatement = XXXStatement & {
  node_type: "AlterOrganizationStatement";
  children: {
    what: NodeChild;
    set: NodeChild;
    options: NodeChild;
  };
};

export type AlterProjectStatement = XXXStatement & {
  node_type: "AlterProjectStatement";
  children: {
    what: NodeChild;
    ident?: NodeChild;
    set: NodeChild;
    options: NodeChild;
  };
};

export type AlterReservationStatement = XXXStatement & {
  node_type: "AlterReservationStatement";
  children: {
    what: NodeChild;
    ident: NodeChild;
    set: NodeChild;
    options: NodeChild;
  };
};

export type AlterSchemaStatement = XXXStatement & {
  node_type: "AlterSchemaStatement";
  children: {
    what: NodeChild;
    if_exists?: NodeVecChild;
    ident: NodeChild;
    set?: NodeChild;
    add?: NodeChild;
    drop?: NodeChild;
    default_collate?: NodeChild;
    options?: NodeChild;
  };
};

export type AlterTableDropClause = BaseNode & {
  node_type: "AlterTableDropClause";
  children: {
    what: NodeChild;
    if_exists?: NodeVecChild;
    ident?: NodeChild;
    comma?: NodeChild;
  };
};

export type AlterTableStatement = XXXStatement & {
  node_type: "AlterTableStatement";
  children: {
    what: NodeChild;
    if_exists?: NodeVecChild;
    ident: NodeChild;
    // SET
    set?: NodeChild;
    options?: NodeChild;
    default_collate?: NodeChild;
    // ADD COLUMN
    add_columns?: NodeVecChild;
    // ADD CONSTRAINT
    add_constraints?: NodeVecChild;
    // RENAME TO
    rename?: NodeChild;
    to?: NodeChild;
    // RENAME COLUMN
    rename_columns?: NodeVecChild;
    // DROP COLUMN
    drop_columns?: NodeVecChild;
    // ALTER COLUMN statement
    alter_column_stmt?: NodeChild;
  };
};

export type AlterVectorIndexStatement = XXXStatement & {
  node_type: "AlterVectorIndexStatement";
  children: {
    what: NodeChild;
    if_exists?: NodeVecChild;
    ident: NodeChild;
    on: NodeChild;
    operation: NodeChild;
  };
};

export type AlterViewStatement = XXXStatement & {
  node_type: "AlterViewStatement";
  children: {
    materialized?: NodeChild;
    what: NodeChild;
    if_exists?: NodeVecChild;
    ident: NodeChild;
    // SET
    set?: NodeChild;
    options?: NodeChild;
    // ALTER COLUMN statement
    alter_column_stmt?: NodeChild;
  };
};

export type AccessOperator = Expr & {
  node_type: "AccessOperator";
  children: {
    not: undefined;
    left: NodeChild;
    right: NodeChild;
    rparen: NodeChild;
  };
};

export type ArrayLiteral = Expr & {
  node_type: "ArrayLiteral";
  children: {
    type?: NodeChild;
    exprs: NodeVecChild;
    rparen: NodeChild;
  };
};

export type AssertStatement = XXXStatement & {
  node_type: "AssertStatement";
  children: {
    expr: NodeChild;
    as: NodeChild;
    description: NodeChild;
  };
};

export type Asterisk = Expr & {
  node_type: "Asterisk";
  children: {
    except?: NodeChild;
    replace?: NodeChild;
    order: undefined;
    null_order: undefined;
  };
};

export type BasePipeOperator = PipeOperator & {
  node_type: "BasePipeOperator";
}

export type BinaryOperator = Expr & {
  node_type: "BinaryOperator";
  children: {
    not?: NodeChild;
    left: { Node: Expr & UnknownNode };
    quantifier?: NodeChild;
    right: { Node: Expr & UnknownNode };
  };
};

export type BeginStatement = LabelableStatement & {
  node_type: "BeginStatement";
  children: {
    stmts?: NodeVecChild;
    exception_when_error?: NodeVecChild;
    then?: NodeChild;
    end: NodeChild;
  };
};

export type BetweenOperator = Expr & {
  node_type: "BetweenOperator";
  children: {
    left: NodeChild;
    not?: NodeChild;
    right_min: NodeChild;
    right_max: NodeChild;
    and: NodeChild;
  };
};

export type BooleanLiteral = Expr & {
  node_type: "BooleanLiteral";
};

export type BreakContinueStatement = XXXStatement & {
  node_type: "BreakContinueStatement";
  children: {
    label?: NodeChild;
  };
};

export type CallingFunction = CallingFunctionGeneral & {
  node_type: "CallingFunction";
};

export type CallingTableFunction = FromItemExpr &
  CallingFunctionGeneral & {
    node_type: "CallingTableFunction";
    children: {
      distinct: undefined;
      ignore_nulls: undefined;
      orderby: undefined;
      limit: undefined;
      having: undefined;
      over: undefined;
      comma: undefined;
      order: undefined;
      null_order: undefined;
    };
  };

export type CallingUnnest = FromItemExpr &
  CallingFunctionGeneral & {
    node_type: "CallingUnnest";
    children: {
      distinct: undefined;
      ignore_nulls: undefined;
      orderby: undefined;
      limit: undefined;
      having: undefined;
      over: undefined;
      order: undefined;
      null_order: undefined;
      comma: undefined;
    };
  };

export type CallStatement = XXXStatement & {
  node_type: "CallStatement";
  children: {
    procedure: NodeChild;
  };
};

export type CaseExpr = Expr & {
  node_type: "CaseExpr";
  children: {
    expr?: NodeChild;
    arms: NodeVecChild;
    end: NodeChild;
  };
};

export type CaseExprArm = BaseNode & {
  node_type: "CaseExprArm";
  children: {
    expr?: NodeChild;
    then?: NodeChild;
    result: NodeChild;
  };
};

export type CaseStatement = XXXStatement & {
  node_type: "CaseStatement";
  children: {
    expr?: NodeChild;
    arms: NodeVecChild;
    end_case: NodeVecChild;
  };
};

export type CaseStatementArm = BaseNode & {
  node_type: "CaseStatementArm";
  children: {
    expr?: NodeChild;
    then?: NodeChild;
    stmts: NodeVecChild;
  };
};

export type CastArgument = BaseNode & {
  token: Token;
  node_type: "CastArgument";
  children: {
    cast_from: NodeChild;
    cast_to: NodeChild;
    format?: NodeChild;
  };
};

export type Comment = BaseNode & {
  token: Token;
  node_type: "Comment";
  children: {
    leading_comments: undefined;
    trailing_comments: undefined;
  };
};

export type Constraint = BaseNode & {
  token: Token;
  node_type: "Constraint";
  children: {
    constraint?: NodeChild;
    ident?: NodeChild;
    if_not_exists?: NodeVecChild;
    key: NodeChild;
    columns?: NodeChild;
    references?: NodeChild;
    enforced?: NodeChild;
    comma?: NodeChild;
  };
};

export type CreateFunctionStatement = XXXStatement & {
  node_type: "CreateFunctionStatement";
  children: {
    or_replace?: NodeVecChild;
    temp?: NodeChild;
    table?: NodeChild;
    aggregate?: NodeChild;
    what: NodeChild;
    if_not_exists?: NodeVecChild;
    ident: NodeChild;
    group: NodeChild;
    returns?: NodeChild;
    remote?: NodeChild;
    connection?: NodeChild;
    determinism?: NodeVecChild;
    language?: NodeChild;
    options?: NodeChild;
    as?: NodeChild;
  };
};

export type CreateModelStatement = XXXStatement & {
  node_type: "CreateModelStatement";
  children: {
    or_replace?: NodeVecChild;
    what: NodeChild;
    if_not_exists?: NodeVecChild;
    ident: NodeChild;
    transform?: NodeChild;
    output?: NodeChild;
    input?: NodeChild;
    remote?: NodeChild;
    options?: NodeChild;
    query?: NodeChild;
    training_data_custom_holiday?: NodeChild;
  };
};

export type CreateProcedureStatement = XXXStatement & {
  node_type: "CreateProcedureStatement";
  children: {
    or_replace?: NodeVecChild;
    what: NodeChild;
    if_not_exists?: NodeVecChild;
    ident: NodeChild;
    group: NodeChild;
    external?: NodeChild;
    with_connection?: NodeChild;
    options?: NodeChild;
    language?: NodeChild;
    stmt?: NodeChild;
    as?: NodeChild;
  };
};

export type CreateReservationStatement = XXXStatement & {
  node_type: "CreateReservationStatement";
  children: {
    what: NodeChild;
    ident: NodeChild;
    as?: NodeChild;
    json?: NodeChild;
    json_string?: NodeChild;
    options?: NodeChild;
  };
};

export type CreateRowAccessPolicyStatement = XXXStatement & {
  node_type: "CreateRowAccessPolicyStatement";
  children: {
    or_replace?: NodeVecChild;
    what: NodeVecChild;
    if_not_exists?: NodeVecChild;
    ident: NodeChild;
    on: NodeChild;
    grant?: NodeChild;
    to?: NodeChild;
    filter: NodeChild;
    using: NodeChild;
  };
};

export type CreateSchemaStatement = XXXStatement & {
  node_type: "CreateSchemaStatement";
  children: {
    external?: NodeChild;
    what: NodeChild;
    if_not_exists?: NodeVecChild;
    ident: NodeChild;
    default_collate: NodeChild;
    with_connection?: NodeChild;
    options?: NodeChild;
  };
};

export type CreateIndexStatement = XXXStatement & {
  node_type: "CreateIndexStatement";
  children: {
    or_replace?: NodeVecChild;
    what: NodeChild;
    if_not_exists?: NodeVecChild;
    ident: NodeChild;
    on: NodeChild;
    tablename: NodeChild;
    column_group: NodeChild;
    storing?: NodeChild;
    partitionby?: NodeChild;
    options?: NodeChild;
  };
};

export type CreateTableStatement = XXXStatement & {
  node_type: "CreateTableStatement";
  children: {
    or_replace?: NodeVecChild;
    temp?: NodeChild;
    external?: NodeChild;
    snapshot?: NodeChild;
    what: NodeChild;
    if_not_exists?: NodeVecChild;
    ident: NodeChild;
    like_or_copy: NodeChild;
    source_table: NodeChild;
    column_schema_group?: NodeChild;
    default_collate?: NodeChild;
    clone?: NodeChild;
    partitionby?: NodeChild;
    clusterby?: NodeChild;
    with_connection?: NodeChild;
    with_partition_columns?: NodeChild;
    options?: NodeChild;
    as?: NodeChild;
  };
};

export type CreateViewStatement = XXXStatement & {
  node_type: "CreateViewStatement";
  children: {
    or_replace?: NodeVecChild;
    materialized?: NodeChild;
    what: NodeChild;
    if_not_exists?: NodeVecChild;
    ident: NodeChild;
    column_name_list?: NodeChild;
    partitionby?: NodeChild;
    clusterby?: NodeChild;
    options?: NodeChild;
    as: NodeChild;
  };
};

export type DeclareStatement = XXXStatement & {
  node_type: "DeclareStatement";
  children: {
    idents: NodeVecChild;
    variable_type?: NodeChild;
    default?: NodeChild;
  };
};

export type DeleteStatement = XXXStatement & {
  node_type: "DeleteStatement";
  children: {
    from: NodeChild;
    table_name: NodeChild;
    where: NodeChild;
  };
};

export type DifferentialPrivacyClause = BaseNode & {
  token: Token;
  node_type: "DifferentialPrivacyClause";
  children: {
    differential_privacy: NodeChild;
    options?: NodeChild;
  };
};

export type DotOperator = IdentifierGeneral & {
  node_type: "DotOperator";
  children: {
    left: { Node: IdentifierGeneral & UnknownNode };
    right: { Node: IdentifierGeneral & UnknownNode };
  };
};

export type DropRowAccessPolicyStatement = XXXStatement & {
  node_type: "DropRowAccessPolicyStatement";
  children: {
    what: NodeVecChild;
    if_exists?: NodeVecChild;
    ident?: NodeChild;
    on: NodeChild;
  };
};

export type DropStatement = XXXStatement & {
  node_type: "DropStatement";
  children: {
    external?: NodeChild;
    materialized?: NodeChild;
    table?: NodeChild;
    what: NodeChild;
    if_exists?: NodeVecChild;
    ident: NodeChild;
    on?: NodeChild;
    cascade_or_restrict?: NodeChild;
  };
};

export type ElseIfClause = BaseNode & {
  token: Token;
  node_type: "ElseIfClause";
  children: {
    condition: NodeChild;
    then: NodeChild;
  };
};

export type EmptyStruct = Expr & {
  node_type: "EmptyStruct";
  children: {
    rparen: NodeChild
  };
};

export type EOF = BaseNode & {
  token: null;
  node_type: "EOF";
  children: {
    trailing_comments: undefined;
  };
};

export type ExecuteStatement = XXXStatement & {
  node_type: "ExecuteStatement";
  children: {
    immediate: NodeChild;
    sql_expr: NodeChild;
    into: NodeChild;
    using?: NodeChild;
  };
};

export type ExportDataStatement = XXXStatement & {
  node_type: "ExportDataStatement";
  children: {
    data: NodeChild;
    with_connection?: NodeChild;
    options: NodeChild;
    as: NodeChild;
  };
};

export type ExportModelStatement = XXXStatement & {
  node_type: "ExportModelStatement";
  children: {
    what: NodeChild;
    ident: NodeChild;
    options?: NodeChild;
  };
};

export type ExtractArgument = BaseNode & {
  token: Token;
  node_type: "ExtractArgument";
  children: {
    extract_datepart: NodeChild;
    extract_from: NodeChild;
    at_time_zone: NodeVecChild;
    time_zone: NodeChild;
  };
};

export type ForStatement = LabelableStatement & {
  node_type: "ForStatement";
  children: {
    ident: NodeChild;
    in: NodeChild;
    do: NodeChild;
    end_for: NodeVecChild;
  };
};

export type ForSystemTimeAsOfClause = BaseNode & {
  token: Token;
  node_type: "ForSystemTimeAsOfClause";
  children: {
    system_time_as_of: NodeVecChild;
    expr: NodeChild;
  };
};

export type FromStatement = XXXStatement & {
  node_type: "FromStatement";
  children: {
    with: NodeChild;
    expr: NodeChild;
  };
}

export type FunctionChain = FromItemExpr & {
  node_type: "FunctionChain";
  children: {
    left: NodeChild;
    right: NodeChild;
  };
}

export type GrantStatement = XXXStatement & {
  node_type: "GrantStatement";
  children: {
    roles: NodeVecChild;
    on: NodeChild;
    resource_type: NodeChild;
    ident: NodeChild;
    to: NodeChild;
  };
};

export type GroupByExprs = BaseNode & {
  token: Token;
  node_type: "GroupByExprs";
  children: {
    by: NodeChild;
    how?: NodeVecChild;
    exprs?: { NodeVec: Expr[] & UnknownNode[] };
  };
};

export type GroupedExpr = FromItemExpr & {
  node_type: "GroupedExpr";
  children: {
    expr: NodeChild;
    rparen: NodeChild;
  };
};

export type GroupedExprs = BaseNode & {
  token: Token;
  node_type: "GroupedExprs";
  children: {
    exprs?: NodeVecChild;
    rparen: NodeChild;
    // only in UNPIVOT operator
    as?: NodeChild;
    row_value_alias?: NodeChild;
    // only in INSERT statement
    comma?: NodeChild;
  };
};

export type GroupedIdentWithOptions = BaseNode & {
  token: Token;
  node_type: "GroupedIdentWithOptions";
  children: {
    idents: NodeVecChild;
    rparen: NodeChild;
  };
};

export type GroupedPattern = BaseNode & {
  token: Token;
  node_type: "GroupedPattern";
  children: {
    patterns: NodeVecChild;
    rparen: NodeChild;
    suffixes: NodeVecChild;
  };
};

export type GroupedStatement = FromItemExpr &
  XXXStatement & {
    node_type: "GroupedStatement";
    children: {
      with?: { Node: WithClause };
      stmt: NodeChild;
      rparen: NodeChild;
      orderby: NodeChild;
      limit: NodeChild;
    };
  };

export type GroupedTypeDeclarationOrConstraints = BaseNode & {
  node_type: "GroupedTypeDeclarationOrConstraints";
  children: {
    declarations: NodeVecChild;
    rparen: NodeChild;
  };
};

export type GroupedType = BaseNode & {
  node_type: "GroupedType";
  children: {
    type: NodeChild;
    rparen: NodeChild;
  };
};

export type Identifier = IdentifierGeneral & {
  node_type: "Identifier";
};

export type IdentWithOptions = Expr & {
  node_type: "IdentWithOptions";
  children: {
    as: undefined;
    alias: undefined;
    order: undefined;
    null_order: undefined;
    options?: NodeChild;
  };
};

export type IfStatement = XXXStatement & {
  node_type: "IfStatement";
  children: {
    condition: NodeChild;
    then: NodeChild;
    elseifs: NodeVecChild;
    else: NodeChild;
    end_if: NodeVecChild;
  };
};

export type InOperator = Expr & {
  node_type: "InOperator";
  children: {
    not?: NodeChild;
    left: NodeChild;
    right: NodeChild;
  };
};

export type InsertStatement = XXXStatement & {
  node_type: "InsertStatement";
  children: {
    into?: NodeChild;
    target_name?: NodeChild;
    columns?: NodeChild;
    input: NodeChild;
  };
};

export type IntervalLiteral = Expr & {
  node_type: "IntervalLiteral";
  children: {
    expr: NodeChild;
    date_part: NodeChild;
    to?: NodeChild;
    to_date_part?: NodeChild;
    order: undefined;
    null_order: undefined;
  };
};

export type IsDistinctFromOperator = Expr & {
  node_type: "IsDistinctFromOperator";
  children: {
    not?: NodeChild;
    distinct: NodeChild;
    from: NodeChild;
    left: NodeChild;
    right: NodeChild;
  };
};

export type JoinOperator = FromItemExpr & {
  node_type: "JoinOperator";
  children: {
    join_type: NodeChild;
    outer: NodeChild;
    left: NodeChild;
    right: NodeChild;
    on: NodeChild;
    using: NodeChild;
    order: undefined;
    null_order: undefined;
    comma: undefined;
  };
};

export type JoinPipeOperator = PipeOperator & {
  node_type: "JoinPipeOperator";
  children: {
    method?: NodeChild;
    on?: NodeChild;
    using?: NodeChild;
  }
}

export type Keyword = BaseNode & {
  token: Token;
  node_type: "Keyword";
};

export type KeywordSequence = BaseNode & {
  node_type: "KeywordSequence";
  children: {
    next_keyword: { Node: Keyword | KeywordSequence | KeywordWithExpr | KeywordWithGroupedXXX };
  };
};

export type KeywordWithExpr = BaseNode & {
  node_type: "KeywordWithExpr";
  children: {
    expr: NodeChild;
  };
};

export type KeywordWithExprs = BaseNode & {
  node_type: "KeywordWithExprs";
  children: {
    exprs: NodeVecChild;
  };
};

export type KeywordWithGroupedXXX = BaseNode & {
  node_type: "KeywordWithGroupedXXX";
  children: {
    group: NodeChild;
  };
};

export type KeywordWithStatement = BaseNode & {
  node_type: "KeywordWithStatement";
  children: {
    stmt: NodeChild;
  };
};

export type KeywordWithStatements = BaseNode & {
  node_type: "KeywordWithStatements";
  children: {
    stmts: NodeVecChild;
  };
};

export type KeywordWithType = BaseNode & {
  node_type: "KeywordWithType";
  children: {
    type: NodeChild;
  };
};

export type LimitClause = BaseNode & {
  node_type: "LimitClause";
  children: {
    expr: NodeChild;
    offset?: NodeChild;
  };
};

export type LimitPipeOperator = PipeOperator & {
  node_type: "LimitPipeOperator";
  children: {
    offset?: NodeChild;
  }
}

export type MatchRecognizeClause = BaseNode & {
  token: Token;
  node_type: "MatchRecognizeClause";
  children: {
    as?: NodeChild;
    alias?: NodeChild;
    config: NodeChild;
  };
};

export type MatchRecognizeConfig = BaseNode & {
  token: Token;
  node_type: "MatchRecognizeConfig";
  children: {
    partitionby?: NodeChild;
    orderby?: NodeChild;
    measures?: NodeChild;
    skip_rule?: NodeChild;
    pattern: NodeChild;
    define?: NodeChild;
    options?: NodeChild;
    rparen: NodeChild;
  };
};

export type MatchRecognizePipeOperator = BaseNode & {
  token: Token;
  node_type: "MatchRecognizePipeOperator";
  children: MatchRecognizeClause["children"];
};

export type LoopStatement = LabelableStatement & {
  node_type: "LoopStatement";
  children: {
    stmts?: NodeVecChild;
    end_loop: NodeVecChild;
  };
};

export type LoadStatement = XXXStatement & {
  node_type: "LoadStatement";
  children: {
    data: NodeChild;
    into: NodeChild;
    ident: NodeChild;
    overwrite_partitions?: NodeChild;
    column_group?: NodeChild;
    partitionby?: NodeChild;
    clusterby?: NodeChild;
    options?: NodeChild;
    from: NodeChild;
    files: NodeChild;
    from_files: NodeChild;
    with_partition_columns?: NodeChild;
    with?: NodeChild;
    connection?: NodeChild;
    connection_name?: NodeChild;
  };
};

export type MergeStatement = XXXStatement & {
  node_type: "MergeStatement";
  children: {
    into?: NodeChild;
    table_name: NodeChild;
    using: NodeChild;
    on: NodeChild;
    whens: NodeVecChild;
  };
};

export type MultiTokenIdentifier = IdentifierGeneral & {
  node_type: "MultiTokenIdentifier";
  children: {
    trailing_idents: { NodeVec: (IdentifierGeneral & UnknownNode)[] };
  };
};

export type NullLiteral = Expr & {
  node_type: "NullLiteral";
};

export type NumericLiteral = Expr & {
  node_type: "NumericLiteral";
};

export type OrPattern = BaseNode & {
  token: Token;
  node_type: "OrPattern";
  children: {
    left: NodeVecChild;
    right: NodeVecChild;
  };
};


export type OverClause = BaseNode & {
  token: Token;
  node_type: "OverClause";
  children: {
    window: NodeChild;
  };
};

export type OverwritePartitionsClause = BaseNode & {
  token: Token;
  node_type: "OverwritePartitionsClause";
  children: {
    overwrite?: NodeChild;
    grouped_expr: NodeChild;
  };
};

export type Parameter = IdentifierGeneral & {
  node_type: "Parameter";
};

export type Pattern = BaseNode & {
  token: Token;
  node_type: "Pattern";
  children: {
    suffixes: NodeVecChild;
  }
};

export type PatternClause = BaseNode & {
  token: Token;
  node_type: "PatternClause";
  children: {
    pattern: NodeChild;
  }
};

export type PatternQuantifier = BaseNode & {
  token: Token;
  node_type: "PatternQuantifier";
  children: {
    min?: NodeChild;
    comma?: NodeChild;
    max?: NodeChild;
    rbrace: NodeChild;
  }
};

export type PipeStatement = XXXStatement & {
  node_type: "PipeStatement";
  children: {
    left: NodeChild;
    right: NodeChild;
  };
}

export type PivotPipeOperator = PipeOperator & {
  node_type: "PivotPipeOperator";
  children: {
    exprs: undefined;
    config: NodeChild;
    as?: NodeChild;
    alias?: NodeChild;
  }
}

export type PivotOperator = BaseNode & {
  token: Token;
  node_type: "PivotOperator";
  children: {
    config: NodeChild;
    as?: NodeChild;
    alias?: NodeChild;
  };
};

export type PivotConfig = BaseNode & {
  token: Token;
  node_type: "PivotConfig";
  children: {
    exprs: NodeVecChild;
    for: NodeChild;
    in: NodeChild;
    rparen: NodeChild;
  };
};

export type RaiseStatement = XXXStatement & {
  node_type: "RaiseStatement";
  children: {
    using?: NodeChild;
  };
};

export type RangeLiteral = Expr & {
  node_type: "RangeLiteral";
  children: {
    type: NodeChild;
  };
};

export type RenameColumnClause = BaseNode & {
  token: Token;
  node_type: "RenameColumnClause";
  children: {
    column: NodeChild;
    if_exists?: NodeChild;
    ident: NodeChild;
    to: NodeChild;
    comma?: NodeChild;
  };
};

export type RepeatStatement = LabelableStatement & {
  node_type: "RepeatStatement";
  children: {
    stmts: NodeVecChild;
    until: NodeChild;
    end_repeat: NodeVecChild;
  };
};

export type RevokeStatement = XXXStatement & {
  node_type: "RevokeStatement";
  children: {
    roles: NodeVecChild;
    on: NodeChild;
    resource_type: NodeChild;
    ident: NodeChild;
    from: NodeChild;
  };
};

export type SelectStatement = XXXStatement & {
  token: Token;
  node_type: "SelectStatement";
  children: {
    with?: { Node: WithClause };
    differential_privacy?: NodeChild;
    as_struct_or_value?: NodeVecChild;
    distinct_or_all?: NodeChild;
    exprs: NodeVecChild;
    from?: NodeChild;
    where?: NodeChild;
    groupby?: NodeChild;
    having?: NodeChild;
    qualify?: NodeChild;
    window?: NodeChild;
    orderby?: NodeChild;
    limit?: NodeChild;
  };
};

export type SelectPipeOperator = PipeOperator & {
  node_type: "SelectPipeOperator";
  children: {
    window?: NodeChild;
  };
}


export type SetOperator = XXXStatement & {
  node_type: "SetOperator";
  children: {
    with?: { Node: WithClause };
    method?: NodeChild;
    by?: NodeChild;
    corresponding?: NodeChild;
    distinct_or_all: NodeChild;
    left: { Node: SetOperator | SelectStatement | GroupedStatement };
    right: { Node: SetOperator | SelectStatement | GroupedStatement };
  };
};

export type SetStatement = XXXStatement & {
  node_type: "SetStatement";
  children: {
    expr: NodeChild;
  };
};

export type SingleTokenStatement = XXXStatement & {
  node_type: "SingleTokenStatement";
};

export type StringLiteral = Expr & {
  node_type: "StringLiteral";
};

export type StructLiteral = Expr & {
  node_type: "StructLiteral";
  children: {
    type?: NodeChild;
    exprs: NodeVecChild;
    rparen: NodeChild;
  };
};

export type Symbol_ = BaseNode & {
  token: Token;
  node_type: "Symbol";
};

export type TableSampleClause = BaseNode & {
  token: Token;
  node_type: "TableSampleClause";
  children: {
    system: NodeChild;
    group: NodeChild;
  };
};

export type TableSamplePipeOperator = PipeOperator & {
  node_type: "TableSamplePipeOperator";
  children: {
    exprs: undefined;
    group?: NodeChild;
  }
}

export type TableSampleRatio = BaseNode & {
  token: Token;
  node_type: "TableSampleRatio";
  children: {
    expr: NodeChild;
    percent: NodeChild;
    rparen: NodeChild;
  };
};

export type Template = IdentifierGeneral & {
  node_type: "Template";
};

export type TransactionStatement = XXXStatement & {
  node_type: "TransactionStatement";
  children: {
    transaction?: NodeChild;
  };
};

export type TrainingDataCustomHolidayClause = BaseNode & {
  node_type: "TrainingDataCustomHolidayClause";
  children: {
    training_data: NodeChild;
    custom_holiday: NodeChild;
    rparen: NodeChild;
  };
};

export type TruncateStatement = XXXStatement & {
  node_type: "TruncateStatement";
  children: {
    table: NodeChild;
    table_name: NodeChild;
  };
};

export type Type = BaseNode & {
  token: Token;
  node_type: "Type";
  children: {
    type?: NodeChild; // ANY TYPE
    type_declaration?: NodeChild;
    parameter?: NodeChild;
    not_null?: NodeVecChild;
    constraint?: NodeChild;
    primarykey?: NodeChild;
    references?: NodeChild;
    enforced?: NodeChild;
    default?: NodeChild;
    options?: NodeChild;
    collate?: NodeChild
    aggregate?: NodeChild;
  };
};

export type TypeDeclaration = BaseNode & {
  token: Token;
  node_type: "TypeDeclaration";
  children: {
    in_out: NodeChild;
    type: NodeChild;
    comma?: NodeChild;
  };
};

export type UnaryOperator = Expr & {
  token: Token;
  node_type: "UnaryOperator";
  children: {
    right: NodeChild;
  };
};

export type UndropStatement = XXXStatement & {
  node_type: "UndropStatement";
  children: {
    what: NodeChild;
    if_not_exists?: NodeVecChild;
    ident: NodeChild;
  };
};

export type UnionPipeOperator = PipeOperator & {
  node_type: "UnionPipeOperator";
  children: {
    method?: NodeChild;
    by?: NodeChild;
    corresponding?: NodeChild;
  }
}

export type UnpivotConfig = BaseNode & {
  token: Token;
  node_type: "UnpivotConfig";
  children: {
    expr: NodeChild;
    for: NodeChild;
    in: NodeChild;
    rparen: NodeChild;
  };
};

export type UnpivotPipeOperator = PipeOperator & {
  node_type: "UnpivotPipeOperator";
  children: {
    exprs: undefined;
    config: NodeChild;
    as?: NodeChild;
    alias?: NodeChild;
  }
}

export type UnpivotOperator = BaseNode & {
  token: Token;
  node_type: "UnpivotOperator";
  children: {
    include_or_exclude_nulls: NodeVecChild;
    config: NodeChild;
    as?: NodeChild;
    alias?: NodeChild;
  };
};

export type UpdateStatement = XXXStatement & {
  node_type: "UpdateStatement";
  children: {
    table_name?: NodeChild;
    set: NodeChild;
    from?: NodeChild;
    where: NodeChild;
  };
};

export type WhenClause = BaseNode & {
  node_type: "WhenClause";
  children: {
    not?: NodeChild;
    matched: NodeChild;
    by_target_or_source: NodeVecChild;
    and: NodeChild;
    then: NodeChild;
  };
};

export type WhileStatement = LabelableStatement & {
  node_type: "WhileStatement";
  children: {
    condition: NodeChild;
    do: NodeChild;
    end_while: NodeVecChild;
  };
};

export type WindowClause = BaseNode & {
  token: Token;
  node_type: "WindowClause";
  children: {
    window_exprs: NodeVecChild;
  };
};

export type WindowExpr = BaseNode & {
  token: Token;
  node_type: "WindowExpr";
  children: {
    as: NodeChild;
    window: NodeChild;
    comma?: NodeChild;
  };
};

export type WindowFrameClause = BaseNode & {
  token: Token;
  node_type: "WindowFrameClause";
  children: {
    between?: NodeChild;
    start: NodeVecChild;
    and?: NodeChild;
    end?: NodeVecChild;
  };
};

export type WindowSpecification = BaseNode & {
  token: Token;
  node_type: "WindowSpecification";
  children: {
    name?: NodeChild;
    partitionby: NodeChild;
    orderby: NodeChild;
    frame: NodeChild;
    rparen: NodeChild;
  };
};

export type WithClause = BaseNode & {
  token: Token;
  node_type: "WithClause";
  children: {
    queries: { NodeVec: WithQuery[] };
    recursive?: NodeChild;
  };
};

export type WithOffsetClause = BaseNode & {
  token: Token;
  node_type: "WithOffsetClause";
  children: {
    offset: { Node: Keyword };
    as?: { Node: Keyword };
    alias?: NodeChild;
  };
};

export type WithPipeOperator = BaseNode & {
  token: Token;
  node_type: "WithPipeOperator";
  children: WithClause["children"];
};

export type WithPartitionColumnsClause = BaseNode & {
  token: Token;
  node_type: "WithPartitionColumnsClause";
  children: {
    partition_columns: NodeVecChild;
    column_schema_group: NodeChild;
  };
};

export type WithQuery = BaseNode & {
  token: Token;
  node_type: "WithQuery";
  children: {
    as: { Node: Keyword };
    stmt: { Node: GroupedStatement };
    comma: NodeChild;
  };
};

export type XXXByExprs = BaseNode & {
  token: Token;
  node_type: "XXXByExprs";
  children: {
    by: NodeChild;
    exprs: { NodeVec: Expr[] & UnknownNode[] };
  };
};
"#;
