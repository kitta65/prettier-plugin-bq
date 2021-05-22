// ----- core -----
type Token = {
  line: number;
  column: number;
  literal: string;
};

export type BaseNode = {
  token: Token | null;
  children: {
    leading_comments?: { NodeVec: BaseNode[] };
    trailling_comments?: { NodeVec: BaseNode[] };
  };
  node_type: string;
  emptyLines?: number;
  notRoot?: Boolean;
  done?: Boolean;
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
// Comment
export type Comment = BaseNode & {
  token: Token;
};

export const isComment = (n: BaseNode | undefined): n is Comment => {
  if (n && Object.keys(n.children).length === 0) {
    return true;
  }
  return false;
};

// XXXStatement
export type XXXStatement = BaseNode & {
  token: Token;
  children: {
    semicolon?: { Node: BaseNode };
  };
};

export const isXXXStatement = (n: BaseNode | undefined): n is XXXStatement => {
  if (n) {
    return true;
  }
  return false;
};

// SelectStatement
export type SelectStatement = XXXStatement & {
  token: Token;
  children: {
    exprs: { NodeVec: BaseNode[] };
  };
};

export const isSelectStatement = (
  n: BaseNode | undefined
): n is SelectStatement => {
  if (n && "exprs" in n.children) {
    return true;
  }
  return false;
};

// SetOperator
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
    "distinct_or_all" in n.children &&
    "left" in n.children &&
    "right" in n.children
  ) {
    return true;
  }
  return false;
};

// Symbol
export type Symbol = BaseNode & {
  token: Token;
};

export const isSymbol = (n: BaseNode | undefined): n is Symbol => {
  if (n) {
    return true;
  }
  return false;
};

