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

export type NodeKeyof<T> = {
  [k in keyof T]-?: T[k] extends { Node: BaseNode } | undefined ? k : never;
}[keyof T];

export type NodeVecKeyof<T> = {
  [k in keyof T]-?: T[k] extends { NodeVec: BaseNode[] } | undefined
    ? k
    : never;
}[keyof T];

// `<T extends BaseNode, U extends keyof Children<T>>(child: Children<T>[U])` is invalid
// because `Children<T>[U]` might not be super type of `{ Node: BaseNode }`
export const isNode = (child: unknown): child is { Node: BaseNode } => {
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

export const isNodeVec = (child: unknown): child is { NodeVec: BaseNode[] } => {
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
export type ArrayAccessing = Expr & {
  children: {
    not: undefined;
    left: { Node: BaseNode };
    right: { Node: BaseNode };
    rparen: { Node: BaseNode };
  };
};

export type ArrayLiteral = Expr & {
  children: {
    type?: { Node: BaseNode };
    exprs: { NodeVec: BaseNode[] };
    rparen: { Node: BaseNode };
  };
};

export type AssertStatement = XXXStatement & {
  children: {
    expr: { Node: BaseNode };
    as: { Node: BaseNode };
    description: { Node: BaseNode };
  };
};

export type Asterisk = Expr & {
  children: {
    except?: { Node: BaseNode };
    replace?: { Node: BaseNode };
    order: undefined;
    null_order: undefined;
  };
};

export type BinaryOperator = Expr & {
  children: {
    not?: { Node: BaseNode };
    left: { Node: BaseNode };
    right: { Node: BaseNode };
  };
};

export type BeginStataement = XXXStatement & {
  children: {
    stmts?: { NodeVec: BaseNode[] };
    exception_when_error?: { NodeVec: BaseNode[] };
    then?: { Node: BaseNode };
    end: { Node: BaseNode };
  };
};

export type BetweenOperator = Expr & {
  children: {
    left: { Node: BaseNode };
    not?: { Node: BaseNode };
    right_min: { Node: BaseNode };
    right_max: { Node: BaseNode };
    and: { Node: BaseNode };
  };
};

export type BooleanLiteral = Expr;

export type CallingFunction = Expr & {
  children: {
    func: { Node: BaseNode };
    distinct?: { Node: BaseNode };
    args?: { NodeVec: BaseNode[] };
    ignore_nulls?: { NodeVec: BaseNode[] };
    orderby?: { Node: BaseNode };
    limit?: { Node: BaseNode };
    rparen: { Node: BaseNode };
    over?: { Node: BaseNode };
  };
};

export type CallingUnnest = CallingFunction &
  FromItemExpr & {
    children: {
      with_offset: { Node: BaseNode };
      offset_alias: { Node: BaseNode };
      offset_as: { Node: BaseNode };
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

export type CaseArm = BaseNode & {
  children: {
    expr?: { Node: BaseNode };
    then?: { Node: BaseNode };
    result: { Node: BaseNode };
  };
};

export type CaseExpr = Expr & {
  children: {
    expr?: { Node: BaseNode };
    arms: { NodeVec: BaseNode[] };
    end: { Node: BaseNode };
  };
};

export type CastArgument = BaseNode & {
  token: Token;
  children: {
    cast_from: { Node: BaseNode };
    cast_to: { Node: BaseNode };
  };
};

export type Comment = BaseNode & {
  token: Token;
  children: {
    leading_comments: undefined;
    trailing_comments: undefined;
  };
};

export type DeclareStatement = XXXStatement & {
  children: {
    idents: { NodeVec: BaseNode[] };
    variable_type?: { Node: BaseNode };
    default?: { Node: BaseNode };
  };
};

export type DotOperator = Identifier &
  BinaryOperator & {
    children: {
      not: undefined;
    };
  };

export type ElseIfClause = BaseNode & {
  token: Token;
  children: {
    condition: { Node: BaseNode };
    then: { Node: BaseNode };
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
    immediate: { Node: BaseNode };
    sql_expr: { Node: BaseNode };
    into: { Node: BaseNode };
    using?: { Node: BaseNode };
  };
};

export type ExportStatement = XXXStatement & {
  children: {
    data: { Node: BaseNode };
    options: { Node: BaseNode };
    as: { Node: BaseNode };
  };
};

export type Expr = BaseNode & {
  token: Token;
  children: {
    as?: { Node: BaseNode };
    alias?: { Node: BaseNode };
    comma?: { Node: BaseNode };
    order?: { Node: BaseNode };
    null_order?: { NodeVec: BaseNode[] };
  };
};

export type ExtractArgument = BaseNode & {
  token: Token;
  children: {
    extract_datepart: { Node: BaseNode };
    extract_from: { Node: BaseNode };
    at_time_zone: { NodeVec: BaseNode[] };
    time_zone: { Node: BaseNode };
  };
};

export type ForSystemTimeAsOfClause = BaseNode & {
  token: Token;
  children: {
    system_time_as_of: { NodeVec: BaseNode[] };
    expr: { Node: BaseNode };
  };
};

export type FromItemExpr = Expr & {
  children: {
    pivot?: { Node: BaseNode };
    unpivot?: { Node: BaseNode };
  };
};

export type GroupedExpr = FromItemExpr & {
  children: {
    expr: { Node: BaseNode };
    rparen: { Node: BaseNode };
  };
};

export type GroupedExprs = BaseNode & {
  token: Token;
  children: {
    exprs: { NodeVec: BaseNode[] };
    rparen: { Node: BaseNode };
    // only in UNPIVOT operator
    as?: { Node: BaseNode };
    row_value_alias?: { Node: BaseNode };
    // only in INSERT statement
    comma?: { Node: BaseNode };
  };
};

export type GroupedStatement = FromItemExpr &
  XXXStatement & {
    children: {
      stmt: { Node: BaseNode };
      rparen: { Node: BaseNode };
    };
  };

export type GroupedTypeDeclarations = BaseNode & {
  children: {
    declarations: { NodeVec: BaseNode[] };
    rparen: { Node: BaseNode };
  };
};

export type GroupedType = BaseNode & {
  children: {
    type: { Node: BaseNode };
    rparen: { Node: BaseNode };
  };
};

export type Identifier = FromItemExpr & {
  children: {
    // TABLESAMPLE SYSTEM can only be applied directly to base tables
    tablesample: { Node: BaseNode };
    for_system_time_as_of: { Node: BaseNode };
  };
};

export type IfStatement = XXXStatement & {
  children: {
    condition: { Node: BaseNode };
    then: { Node: BaseNode };
    elseifs: { NodeVec: BaseNode[] };
    else: { Node: BaseNode };
    end_if: { NodeVec: BaseNode[] };
  };
};

export type InOperator = Expr & {
  children: {
    not?: { Node: BaseNode };
    left: { Node: BaseNode };
    right: { Node: BaseNode };
  };
};

export type IntervalLiteral = Expr & {
  children: {
    date_part: { Node: BaseNode };
    right: { Node: BaseNode };
    order: undefined;
    null_order: undefined;
  };
};

export type JoinOperator = FromItemExpr & {
  children: {
    join_type: { Node: BaseNode };
    outer: { Node: BaseNode };
    left: { Node: BaseNode };
    right: { Node: BaseNode };
    on: { Node: BaseNode };
    using: { Node: BaseNode };
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
    expr: { Node: BaseNode };
  };
};

export type KeywordWithExprs = Keyword & {
  children: {
    exprs: { NodeVec: BaseNode[] };
  };
};

export type KeywordWithGroupedExprs = Keyword & {
  children: {
    group: { Node: BaseNode };
  };
};

export type KeywordWithStatement = Keyword & {
  children: {
    stmt: { Node: BaseNode };
  };
};

export type KeywordWithStatements = Keyword & {
  children: {
    stmts: { NodeVec: BaseNode[] };
  };
};

export type LimitClause = KeywordWithExpr & {
  children: {
    offset?: { Node: BaseNode };
  };
};

export type LoopStatement = XXXStatement & {
  children: {
    stmts?: { NodeVec: BaseNode[] };
    end_loop: { NodeVec: BaseNode[] };
  };
};

export type NullLiteral = Expr;

export type NumericLiteral = Expr;

export type OverClause = BaseNode & {
  token: Token;
  children: {
    window: { Node: BaseNode };
  };
};

export type PivotOperator = BaseNode & {
  token: Token;
  children: {
    config: { Node: BaseNode };
    as?: { Node: BaseNode };
    alias?: { Node: BaseNode };
  };
};

export type PivotConfig = BaseNode & {
  token: Token;
  children: {
    exprs: { NodeVec: BaseNode[] };
    for: { Node: BaseNode };
    in: { Node: BaseNode };
    rparen: { Node: BaseNode };
  };
};

export type SelectStatement = XXXStatement & {
  token: Token;
  children: {
    with?: { Node: BaseNode };
    as_struct_or_value?: { NodeVec: BaseNode[] };
    distinct_or_all?: { Node: BaseNode };
    exprs: { NodeVec: BaseNode[] };
    from?: { Node: BaseNode };
    where?: { Node: BaseNode };
    groupby?: { Node: BaseNode };
    having?: { Node: BaseNode };
    qualify?: { Node: BaseNode };
    window?: { Node: BaseNode };
    orderby?: { Node: BaseNode };
    limit?: { Node: BaseNode };
  };
};

export type SetOperator = XXXStatement & {
  children: {
    distinct_or_all: { Node: BaseNode };
    left: { Node: BaseNode };
    right: { Node: BaseNode };
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
    expr: { Node: BaseNode };
  };
};

export type SingleTokenStatement = XXXStatement;

export type StringLiteral = Expr;

export type StructLiteral = Expr & {
  children: {
    type?: { Node: BaseNode };
    exprs: { NodeVec: BaseNode[] };
    rparen: { Node: BaseNode };
  };
};

export type Symbol_ = BaseNode & {
  token: Token;
};

export type TableSampleClause = BaseNode & {
  token: Token;
  children: {
    system: { Node: BaseNode };
    group: { Node: BaseNode };
  };
};

export type TableSampleRatio = BaseNode & {
  token: Token;
  children: {
    expr: { Node: BaseNode };
    percent: { Node: BaseNode };
    rparen: { Node: BaseNode };
  };
};

export type Type = BaseNode & {
  token: Token;
  children: {
    type_declaration?: { Node: BaseNode };
  };
};

export type TypeDeclaration = BaseNode & {
  token: Token;
  children: {
    type: { Node: BaseNode };
    comma?: { Node: BaseNode };
  };
};

export type UnaryOperator = Expr & {
  token: Token;
  children: {
    right: { Node: BaseNode };
  };
};

export type UnpivotConfig = BaseNode & {
  token: Token;
  children: {
    expr: { Node: BaseNode };
    for: { Node: BaseNode };
    in: { Node: BaseNode };
    rparen: { Node: BaseNode };
  };
};

export type UnpivotOperator = BaseNode & {
  token: Token;
  children: {
    include_or_exclude_nulls: { NodeVec: BaseNode[] };
    config: { Node: BaseNode };
    as?: { Node: BaseNode };
    alias?: { Node: BaseNode };
  };
};

export type WindowClause = BaseNode & {
  token: Token;
  children: {
    window_exprs: { NodeVec: BaseNode[] };
  };
};

export type WindowExpr = BaseNode & {
  token: Token;
  children: {
    as: { Node: BaseNode };
    window: { Node: BaseNode };
    comma?: { Node: BaseNode };
  };
};

export type WindowFrameClause = BaseNode & {
  token: Token;
  children: {
    between?: { Node: BaseNode };
    start: { NodeVec: BaseNode[] };
    and?: { Node: BaseNode };
    end?: { NodeVec: BaseNode[] };
  };
};

export type WindowSpecification = BaseNode & {
  token: Token;
  children: {
    name?: { Node: BaseNode };
    partitionby: { Node: BaseNode };
    orderby: { Node: BaseNode };
    frame: { Node: BaseNode };
    rparen: { Node: BaseNode };
  };
};

export type WithClause = BaseNode & {
  token: Token;
  children: {
    queries: { NodeVec: BaseNode[] };
  };
};

export type WithQuery = BaseNode & {
  token: Token;
  children: {
    as: { Node: BaseNode };
    stmt: { Node: BaseNode };
    comma: { Node: BaseNode };
  };
};

export type XXXByExprs = Keyword & {
  token: Token;
  children: {
    by: { Node: BaseNode };
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
