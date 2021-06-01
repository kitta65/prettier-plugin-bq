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

export type BinaryOperator = Expr & {
  children: {
    not?: { Node: BaseNode };
    left: { Node: BaseNode };
    right: { Node: BaseNode };
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

export type EOF = BaseNode & {
  token: null;
  children: {
    trailing_comments: undefined;
  };
};

export type Expr = BaseNode & {
  token: Token;
  children: {
    as?: { Node: BaseNode };
    alias?: { Node: BaseNode };
    comma?: { Node: BaseNode };
    order?: { Node: BaseNode };
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

export type GroupedExpr = Expr & {
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

export type GroupedStatement = Expr &
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

export type Keyword = BaseNode & {
  token: Token;
};

export type Identifier = Expr;

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
  };
};

export type KeywordWithExpr = Keyword & {
  children: {
    expr: { Node: BaseNode };
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

export type SelectStatement = XXXStatement & {
  token: Token;
  children: {
    with: { Node: BaseNode };
    exprs: { NodeVec: BaseNode[] };
    from: { Node: BaseNode };
    where: { Node: BaseNode };
    orderby: { Node: BaseNode };
  };
};

export type SetOperator = XXXStatement & {
  token: Token;
  children: {
    distinct_or_all: { Node: BaseNode };
    left: { Node: BaseNode };
    right: { Node: BaseNode };
  };
};

export type StringLiteral = Expr;

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
    exprs: { NodeVec: BaseNode[] };
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
