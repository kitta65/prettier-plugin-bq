// ----- core -----
type Token = {
  line: number;
  column: number;
  literal: string;
};

/**
 * # callable
 * if it is true and it is `Identifier`, you can assume the node is global function.
 *
 * # notGlobal
 * if it is true, the node follows `.` operator.
 *
 * # notRoot
 * if it is true, the statement is a part of another statement.
 *
 * # breakRecommended
 * if it is true, `hardline` is used at left side of `AND`, `OR` and `JOIN`.
 */
export type BaseNode = {
  token: Token | null;
  children: {
    leading_comments?: { NodeVec: Comment[] };
    trailing_comments?: { NodeVec: Comment[] };
  };
  node_type: string;
  emptyLines?: number;
  callable?: true;
  notGlobal?: true;
  notRoot?: true;
  breakRecommended?: true;
};

export type Children<T extends BaseNode> = T["children"];

export type NodeChild = { Node: BaseNode };

export type NodeVecChild = { NodeVec: BaseNode[] };

export type NodeKeyof<T> = {
  [k in keyof T]-?: T[k] extends NodeChild | undefined ? k : never;
}[keyof T];

export type NodeVecKeyof<T> = {
  [k in keyof T]-?: T[k] extends NodeVecChild | undefined ? k : never;
}[keyof T];

export const isNodeChild = (child: unknown): child is NodeChild => {
  if (
    child &&
    typeof child === "object" &&
    Object.keys(child).length === 1 &&
    "Node" in child
  ) {
    return true;
  }
  return false;
};

export const isNodeVecChild = (child: unknown): child is NodeVecChild => {
  if (
    child &&
    typeof child === "object" &&
    Object.keys(child).length === 1 &&
    "NodeVec" in child
  ) {
    return true;
  }
  return false;
};

// ----- sub types of BaseNode -----
export type AddColumnClause = BaseNode & {
  children: {
    column: NodeChild;
    if_not_exists?: NodeVecChild;
    type_declaration: NodeChild;
    comma?: NodeChild;
  };
};

export type AlterColumnStatement = BaseNode & {
  // NOTE this is not XXXStatement!
  children: {
    what: NodeChild;
    if_exists?: NodeVecChild;
    ident: NodeChild;
    drop_not_null: NodeVecChild;
  };
};

export type AlterSchemaStatement = XXXStatement & {
  children: {
    what: NodeChild;
    if_exists?: NodeVecChild;
    ident: NodeChild;
    set: NodeChild;
    options: NodeChild;
  };
};

export type AlterTableStatement = XXXStatement & {
  children: {
    what: NodeChild;
    if_exists?: NodeVecChild;
    ident: NodeChild;
    // SET
    set?: NodeChild;
    options?: NodeChild;
    // ADD COLUMN
    add_columns?: NodeVecChild;
    // DROP COLUMN
    drop_columns?: NodeVecChild;
    // ALTER COLUMN statement
    alter_column_stmt?: NodeChild;
  };
};

export type AlterViewStatement = XXXStatement & {
  children: {
    materialized?: NodeChild;
    what: NodeChild;
    if_exists?: NodeVecChild;
    ident: NodeChild;
    set: NodeChild;
    options: NodeChild;
  };
};

export type ArrayAccessing = Expr & {
  children: {
    not: undefined;
    left: NodeChild;
    right: NodeChild;
    rparen: NodeChild;
  };
};

export type ArrayLiteral = Expr & {
  children: {
    type?: NodeChild;
    exprs: NodeVecChild;
    rparen: NodeChild;
  };
};

export type AssertStatement = XXXStatement & {
  children: {
    expr: NodeChild;
    as: NodeChild;
    description: NodeChild;
  };
};

export type Asterisk = Expr & {
  children: {
    except?: NodeChild;
    replace?: NodeChild;
    order: undefined;
    null_order: undefined;
  };
};

export type BinaryOperator = Expr & {
  children: {
    not?: NodeChild;
    left: NodeChild;
    right: NodeChild;
  };
};

export type BeginStataement = XXXStatement & {
  children: {
    stmts?: NodeVecChild;
    exception_when_error?: NodeVecChild;
    then?: NodeChild;
    end: NodeChild;
  };
};

export type BetweenOperator = Expr & {
  children: {
    left: NodeChild;
    not?: NodeChild;
    right_min: NodeChild;
    right_max: NodeChild;
    and: NodeChild;
  };
};

export type BooleanLiteral = Expr;

export type CallingFunction = Expr & {
  children: {
    func: NodeChild;
    distinct?: NodeChild;
    args?: NodeVecChild;
    ignore_nulls?: NodeVecChild;
    orderby?: NodeChild;
    limit?: NodeChild;
    rparen: NodeChild;
    over?: NodeChild;
  };
};

export type CallingUnnest = CallingFunction &
  FromItemExpr & {
    children: {
      with_offset: NodeChild;
      offset_alias: NodeChild;
      offset_as: NodeChild;
      distinct: undefined;
      ignore_nulls: undefined;
      orderby: undefined;
      limit: undefined;
      over: undefined;
      order: undefined;
      null_order: undefined;
      comma: undefined;
    };
  };

export type CallingDatePartFunction = CallingFunction;

export type CallStatement = XXXStatement & {
  children: {
    procedure: NodeChild;
  };
};

export type CaseArm = BaseNode & {
  children: {
    expr?: NodeChild;
    then?: NodeChild;
    result: NodeChild;
  };
};

export type CaseExpr = Expr & {
  children: {
    expr?: NodeChild;
    arms: NodeVecChild;
    end: NodeChild;
  };
};

export type CastArgument = BaseNode & {
  token: Token;
  children: {
    cast_from: NodeChild;
    cast_to: NodeChild;
  };
};

export type Comment = BaseNode & {
  token: Token;
  children: {
    leading_comments: undefined;
    trailing_comments: undefined;
  };
};

export type CreateFunctionStatement = XXXStatement & {
  children: {
    or_replace?: NodeVecChild;
    temp?: NodeChild;
    what: NodeChild;
    if_not_exists?: NodeVecChild;
    ident: NodeChild;
    group: NodeChild;
    returns?: NodeChild;
    determinism?: NodeVecChild;
    language?: NodeChild;
    options?: NodeChild;
    as: NodeChild;
  };
};

export type CreateProcedureStatement = XXXStatement & {
  children: {
    or_replace?: NodeVecChild;
    what: NodeChild;
    if_not_exists?: NodeVecChild;
    ident: NodeChild;
    group: NodeChild;
    options?: NodeChild;
    stmt: NodeChild;
  };
};

export type CreateSchemaStatement = XXXStatement & {
  children: {
    what: NodeChild;
    if_not_exists?: NodeVecChild;
    ident: NodeChild;
    options?: NodeChild;
  };
};

export type CreateTableStatement = XXXStatement & {
  children: {
    or_replace?: NodeVecChild;
    external?: NodeChild;
    temp?: NodeChild;
    what: NodeChild;
    if_not_exists?: NodeVecChild;
    ident: NodeChild;
    column_schema_group?: NodeChild;
    partitionby?: NodeChild;
    clusterby?: NodeChild;
    with_partition_columns?: NodeChild;
    options?: NodeChild;
    as?: NodeChild;
  };
};

export type CreateViewStatement = XXXStatement & {
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
  children: {
    idents: NodeVecChild;
    variable_type?: NodeChild;
    default?: NodeChild;
  };
};

export type DotOperator = Identifier &
  BinaryOperator & {
    node_type: "Identifier" | "Parameter";
    children: {
      not: undefined;
    };
  };

export type DropColumnClause = BaseNode & {
  children: {
    column: NodeChild;
    if_exists?: NodeVecChild;
    ident: NodeChild;
    comma?: NodeChild;
  };
};

export type ElseIfClause = BaseNode & {
  token: Token;
  children: {
    condition: NodeChild;
    then: NodeChild;
  };
};

export type EOF = BaseNode & {
  token: null;
  children: {
    trailing_comments: undefined;
  };
};

export type ExecuteStatement = XXXStatement & {
  children: {
    immediate: NodeChild;
    sql_expr: NodeChild;
    into: NodeChild;
    using?: NodeChild;
  };
};

export type ExportStatement = XXXStatement & {
  children: {
    data: NodeChild;
    options: NodeChild;
    as: NodeChild;
  };
};

export type Expr = BaseNode & {
  token: Token;
  children: {
    as?: NodeChild;
    alias?: NodeChild;
    comma?: NodeChild;
    order?: NodeChild;
    null_order?: NodeVecChild;
  };
};

export type ExtractArgument = BaseNode & {
  token: Token;
  children: {
    extract_datepart: NodeChild;
    extract_from: NodeChild;
    at_time_zone: NodeVecChild;
    time_zone: NodeChild;
  };
};

export type ForSystemTimeAsOfClause = BaseNode & {
  token: Token;
  children: {
    system_time_as_of: NodeVecChild;
    expr: NodeChild;
  };
};

export type FromItemExpr = Expr & {
  children: {
    pivot?: NodeChild;
    unpivot?: NodeChild;
  };
};

export type GroupedExpr = FromItemExpr & {
  children: {
    expr: NodeChild;
    rparen: NodeChild;
  };
};

export type GroupedExprs = BaseNode & {
  token: Token;
  children: {
    exprs: NodeVecChild;
    rparen: NodeChild;
    // only in UNPIVOT operator
    as?: NodeChild;
    row_value_alias?: NodeChild;
    // only in INSERT statement
    comma?: NodeChild;
  };
};

export type GroupedStatement = FromItemExpr &
  XXXStatement & {
    children: {
      stmt: NodeChild;
      rparen: NodeChild;
    };
  };

export type GroupedTypeDeclarations = BaseNode & {
  children: {
    declarations: NodeVecChild;
    rparen: NodeChild;
  };
};

export type GroupedType = BaseNode & {
  children: {
    type: NodeChild;
    rparen: NodeChild;
  };
};

export type Identifier = FromItemExpr & {
  children: {
    // TABLESAMPLE SYSTEM can only be applied directly to base tables
    tablesample: NodeChild;
    for_system_time_as_of: NodeChild;
  };
};

export type IfStatement = XXXStatement & {
  children: {
    condition: NodeChild;
    then: NodeChild;
    elseifs: NodeVecChild;
    else: NodeChild;
    end_if: NodeVecChild;
  };
};

export type InOperator = Expr & {
  children: {
    not?: NodeChild;
    left: NodeChild;
    right: NodeChild;
  };
};

export type IntervalLiteral = Expr & {
  children: {
    date_part: NodeChild;
    right: NodeChild;
    order: undefined;
    null_order: undefined;
  };
};

export type JoinOperator = FromItemExpr & {
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

export type Keyword = BaseNode & {
  token: Token;
};

export type KeywordWithExpr = Keyword & {
  children: {
    expr: NodeChild;
  };
};

export type KeywordWithExprs = Keyword & {
  children: {
    exprs: NodeVecChild;
  };
};

export type KeywordWithGroupedExpr = Keyword & {
  children: {
    group: NodeChild;
  };
};

export type KeywordWithGroupedExprs = Keyword & {
  children: {
    group: NodeChild;
  };
};

export type KeywordWithStatement = Keyword & {
  children: {
    stmt: NodeChild;
  };
};

export type KeywordWithStatements = Keyword & {
  children: {
    stmts: NodeVecChild;
  };
};

export type KeywordWithType = Keyword & {
  children: {
    type: NodeChild;
  };
};

export type LanguageSpecifier = BaseNode & {
  children: {
    language: NodeChild;
  };
};

export type LimitClause = KeywordWithExpr & {
  children: {
    offset?: NodeChild;
  };
};

export type LoopStatement = XXXStatement & {
  children: {
    stmts?: NodeVecChild;
    end_loop: NodeVecChild;
  };
};

export type NullLiteral = Expr;

export type NumericLiteral = Expr;

export type OverClause = BaseNode & {
  token: Token;
  children: {
    window: NodeChild;
  };
};

export type PivotOperator = BaseNode & {
  token: Token;
  children: {
    config: NodeChild;
    as?: NodeChild;
    alias?: NodeChild;
  };
};

export type PivotConfig = BaseNode & {
  token: Token;
  children: {
    exprs: NodeVecChild;
    for: NodeChild;
    in: NodeChild;
    rparen: NodeChild;
  };
};

export type SelectStatement = XXXStatement & {
  token: Token;
  children: {
    with?: NodeChild;
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

export type RaiseStatement = XXXStatement & {
  children: {
    using?: NodeChild;
  };
};

export type SetOperator = XXXStatement & {
  children: {
    distinct_or_all: NodeChild;
    left: NodeChild;
    right: NodeChild;
  };
};

export const isSetOperator = (n: BaseNode): n is SetOperator => {
  if (
    n.node_type === "SetOperator" &&
    "distinct_or_all" in n.children &&
    "left" in n.children &&
    "right" in n.children
  ) {
    return true;
  }
  return false;
};

export type SetStatement = XXXStatement & {
  children: {
    expr: NodeChild;
  };
};

export type SingleTokenStatement = XXXStatement;

export type StringLiteral = Expr;

export type StructLiteral = Expr & {
  children: {
    type?: NodeChild;
    exprs: NodeVecChild;
    rparen: NodeChild;
  };
};

export type Symbol_ = BaseNode & {
  token: Token;
};

export type TableSampleClause = BaseNode & {
  token: Token;
  children: {
    system: NodeChild;
    group: NodeChild;
  };
};

export type TableSampleRatio = BaseNode & {
  token: Token;
  children: {
    expr: NodeChild;
    percent: NodeChild;
    rparen: NodeChild;
  };
};

export type Type = BaseNode & {
  token: Token;
  children: {
    type?: NodeChild; // ANY TYPE
    type_declaration?: NodeChild;
    not_null?: NodeVecChild;
    options?: NodeChild;
  };
};

export type TypeDeclaration = BaseNode & {
  token: Token;
  children: {
    in_out: NodeChild;
    type: NodeChild;
    comma?: NodeChild;
  };
};

export type UnaryOperator = Expr & {
  token: Token;
  children: {
    right: NodeChild;
  };
};

export type UnpivotConfig = BaseNode & {
  token: Token;
  children: {
    expr: NodeChild;
    for: NodeChild;
    in: NodeChild;
    rparen: NodeChild;
  };
};

export type UnpivotOperator = BaseNode & {
  token: Token;
  children: {
    include_or_exclude_nulls: NodeVecChild;
    config: NodeChild;
    as?: NodeChild;
    alias?: NodeChild;
  };
};

export type WhileStatement = XXXStatement & {
  children: {
    condition: NodeChild;
    do: NodeChild;
    end_while: NodeVecChild;
  };
};

export type WindowClause = BaseNode & {
  token: Token;
  children: {
    window_exprs: NodeVecChild;
  };
};

export type WindowExpr = BaseNode & {
  token: Token;
  children: {
    as: NodeChild;
    window: NodeChild;
    comma?: NodeChild;
  };
};

export type WindowFrameClause = BaseNode & {
  token: Token;
  children: {
    between?: NodeChild;
    start: NodeVecChild;
    and?: NodeChild;
    end?: NodeVecChild;
  };
};

export type WindowSpecification = BaseNode & {
  token: Token;
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
  children: {
    queries: NodeVecChild;
  };
};

export type WithPartitionColumnsClause = BaseNode & {
  token: Token;
  children: {
    partition_columns: NodeVecChild;
    column_schema_group: NodeChild;
  };
};

export type WithQuery = BaseNode & {
  token: Token;
  children: {
    as: NodeChild;
    stmt: NodeChild;
    comma: NodeChild;
  };
};

export type XXXByExprs = Keyword & {
  token: Token;
  children: {
    by: NodeChild;
    exprs: { NodeVec: Expr[] };
  };
};

export type XXXStatement = BaseNode & {
  token: Token;
  children: {
    semicolon?: { Node: Symbol_ };
  };
};

export const isXXXStatement = (n: BaseNode): n is XXXStatement => {
  if (isSetOperator(n)) {
    return true;
  } else if (
    n.node_type.endsWith("Statement") &&
    !n.node_type.endsWith("WithStatement")
  ) {
    return true;
  }
  return false;
};
