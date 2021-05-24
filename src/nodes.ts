// ----- core -----
type Token = {
  line: number;
  column: number;
  literal: string;
};

export type BaseNode = {
  token: Token | null;
  children: {
    leading_comments?: { NodeVec: Comment[] };
    trailling_comments?: { NodeVec: Comment[] };
  };
  node_type: string;
  emptyLines?: number;
  notRoot?: Boolean;
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
export type Comment = BaseNode & {
  token: Token;
};

export type EOF = BaseNode & {
  token: null;
};

/**
 * following node_types are included
 * - BooleanLiteral
 * - Identifier
 * - NumericLiteral
 */
export type Expr = BaseNode & {
  token: Token;
  children: {
    as?: { Node: BaseNode };
    alias?: { Node: BaseNode };
    comma?: { Node: BaseNode };
  };
};

export type GroupedStatement = Expr & XXXStatement & {
  children: {
    stmt: { Node: BaseNode };
    rparen: { Node: BaseNode };
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

export type SelectStatement = XXXStatement & {
  token: Token;
  children: {
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

export const isSetOperator = (n: BaseNode | undefined): n is SetOperator => {
  if (
    n &&
    n.node_type === "SetOperator" &&
    "distinct_or_all" in n.children &&
    "left" in n.children &&
    "right" in n.children
  ) {
    return true;
  }
  return false;
};

export type Symbol = BaseNode & {
  token: Token;
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
    semicolon?: { Node: Symbol };
  };
};

export const isXXXStatement = (n: BaseNode | undefined): n is XXXStatement => {
  if (
    n &&
    n.node_type.endsWith("Statement") &&
    !n.node_type.endsWith("WithStatement")
  ) {
    return true;
  }
  return false;
};
