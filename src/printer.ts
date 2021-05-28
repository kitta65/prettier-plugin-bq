import { reservedKeywords } from "./keywords";
import { doc } from "prettier";
import type { Doc, FastPath } from "prettier";
import * as N from "./nodes";

const {
  builders: {
    concat, // TODO remove
    group,
    hardline,
    indent,
    join,
    line,
    lineSuffix,
    softline,
  },
} = doc;

type PrintFunc = (
  path: FastPath,
  options: Options,
  print: (path: FastPath) => Doc
) => Doc;

// used with type assertion
type FastPathOf<_ extends N.BaseNode> = FastPath & {
  readonly brand: unique symbol;
};

type Docs<T extends N.BaseNode> =
  | {
      [k in keyof T["children"]]-?: T["children"][k] extends undefined
        ? never
        : k;
    }[keyof T["children"]]
  | "self";

type Options = Record<string, unknown>;

class Printer<T extends N.BaseNode> {
  /**
   * N.Children<T> is needed because `keyof T["children"]` throws error
   * https://github.com/microsoft/TypeScript/issues/36631
   */
  constructor(
    private readonly path: FastPath,
    private readonly print: (path: FastPath) => Doc,
    private readonly node: T,
    private readonly children: N.Children<T>
  ) {}
  hasLeadingComments(
    key: N.NodeKeyof<N.Children<T>> | N.NodeVecKeyof<N.Children<T>>
  ) {
    const child = this.children[key];
    let firstNode;
    if (N.isNode(child)) {
      firstNode = getFirstNode(child.Node);
    } else if (N.isNodeVec(child)) {
      firstNode = getFirstNode(child.NodeVec[0]);
      throw new Error();
    } else {
      return false;
    }
    return "leading_comments" in firstNode.children;
  }
  child(key: N.NodeKeyof<N.Children<T>>, transform?: (x: Doc) => Doc): Doc;
  child(
    key: N.NodeVecKeyof<N.Children<T>>,
    sep: Doc,
    transform?: (x: Doc) => Doc
  ): Doc;
  child(
    key: N.NodeKeyof<N.Children<T>> | N.NodeVecKeyof<N.Children<T>>,
    sepOrTransform?: Doc | ((x: Doc) => Doc),
    transform?: (x: Doc) => Doc
  ): Doc {
    const child = this.children[key];
    let f = (x: Doc) => x;
    if (N.isNode(child)) {
      if (typeof sepOrTransform === "function") {
        f = sepOrTransform;
      }
      return this.path.call(
        (p) => p.call((p) => f(p.call(this.print, "Node")), key),
        "children"
      );
    } else if (N.isNodeVec(child)) {
      if (transform) {
        f = transform;
      }
      if (sepOrTransform == null || typeof sepOrTransform === "function") {
        throw new Error(`2nd argument must be Doc`);
      }
      return this.path.call(
        (p) =>
          p.call(
            (p) => join(sepOrTransform, p.map(this.print, "NodeVec").map(f)),
            key
          ),
        "children"
      );
    }
    // in the case of `children` is undefined
    return concat([]);
  }
  has(key: keyof N.Children<T>) {
    const child = this.children[key];
    if (child) {
      return true;
    }
    false;
  }
  includedIn(arr: string[]) {
    const token = this.node.token;
    if (!token) {
      return false;
    }
    const literal = token.literal.toUpperCase();
    const upperCaseArr = arr.map((x) => x.toUpperCase());
    return upperCaseArr.includes(literal);
  }
  len(key: N.NodeVecKeyof<N.Children<T>>) {
    const nodeVec = this.children[key];
    if (N.isNodeVec(nodeVec)) {
      return nodeVec.NodeVec.length;
    }
    throw new Error();
  }
  newLine() {
    if (this.node.notRoot) return concat([]);
    if (this.node.emptyLines && 0 < this.node.emptyLines) {
      return concat([hardline, hardline]);
    }
    return hardline;
  }
  self(upperOrLower?: "upper" | "lower") {
    const token = this.node.token;
    if (!token) {
      return concat([]);
    }
    let literal = token.literal;
    if (upperOrLower === "upper") {
      literal = literal.toUpperCase();
    } else if (upperOrLower === "lower") {
      literal = literal.toLowerCase();
    } else if (!this.node.notGlobal && this.includedIn(reservedKeywords)) {
      literal = literal.toUpperCase();
    }
    return literal;
  }
  setNotRoot(key: N.NodeKeyof<N.Children<T>>) {
    const child = this.children[key];
    if (N.isNode(child)) {
      child.Node.notRoot = true;
    }
  }
  setNoGlobal(key: N.NodeKeyof<N.Children<T>>) {
    const child = this.children[key];
    if (N.isNode(child)) {
      child.Node.notGlobal = true;
    }
  }
}

const getFirstNode = (node: N.BaseNode): N.BaseNode => {
  const candidates = [];
  for (const [k, v] of Object.entries(node.children)) {
    if (["leading_comments", "trailing_comments"].includes(k)) {
      continue;
    }
    if (N.isNode(v)) {
      candidates.push(getFirstNode(v.Node));
    } else if (N.isNodeVec(v)) {
      v.NodeVec.forEach((x) => candidates.push(getFirstNode(x)));
    }
  }
  let res = node;
  for (const c of candidates) {
    if (!c.token) {
      continue;
    }
    if (!res.token) {
      res = c;
      continue;
    }
    if (
      c.token.line < res.token.line ||
      (c.token.line === res.token.line && c.token.column < res.token.column)
    ) {
      res = c;
    }
  }
  return res;
};

export const printSQL: PrintFunc = (path, options, print) => {
  /**
   * you can assume type of `path.getValue()` to be `BaseNode | BaseNode[]`.
   * it is tested by `@dr666m1/bq2cst`
   */
  const node: N.BaseNode | N.BaseNode[] = path.getValue();

  if (Array.isArray(node)) {
    for (let i = 0; i < node.length - 1; i++) {
      const endNode = node[i];
      if (N.isXXXStatement(endNode)) {
        // end of statement
        const semicolon = endNode.children.semicolon;
        if (semicolon) {
          let endLine = semicolon.Node.token.line;
          const trailing_comments = semicolon.Node.children.trailing_comments;
          if (trailing_comments) {
            const comments = trailing_comments.NodeVec;
            const len = comments.length;
            const last_comments = comments[len - 1];
            endLine = last_comments.token.line;
            const endLiteral = last_comments.token.literal;
            const newLines = endLiteral.match(/\n/g);
            if (newLines) {
              endLine += newLines.length;
            }
          }
          // start of statement
          let startNode = node[i + 1];
          while (
            startNode.node_type === "SetOperator" &&
            N.isSetOperator(startNode)
          ) {
            startNode = startNode.children.left.Node;
          }
          let startLine;
          if (startNode.token) {
            startLine = startNode.token.line;
          } else {
            // EOF
            startLine = endLine + 1;
          }
          const leading_comments = startNode.children.trailing_comments;
          if (leading_comments) {
            const comments = leading_comments.NodeVec;
            const first_comments = comments[0];
            startLine = first_comments.token.line;
          }
          node[i].emptyLines = startLine - endLine - 1; // >= 0
        }
      }
    }
    return concat(path.map(print));
  }
  switch (node.node_type) {
    case "BetweenOperator":
      return printBetweenOperator(path, options, print);
    case "BooleanLiteral":
      return printBooleanLiteral(path, options, print);
    case "BinaryOperator":
      return printBinaryOperator(path, options, print);
    case "Comment":
      return printComment(path, options, print);
    case "EOF":
      return printEOF(path, options, print);
    case "GroupedStatement":
      return printGroupedStatement(path, options, print);
    case "Identifier":
      return printIdentifier(path, options, print);
    case "Keyword":
      return printKeyword(path, options, print);
    case "KeywordWithExpr":
      return printKeywordWithExpr(path, options, print);
    case "NumericLiteral":
      return printNumericLiteral(path, options, print);
    case "SelectStatement":
      return printSelectStatement(path, options, print);
    case "StringLiteral":
      return printStringLiteral(path, options, print);
    case "Symbol":
      return printSymbol(path, options, print);
    case "UnaryOperator":
      return printUnaryOperator(path, options, print);
    case "XXXByExprs":
      return printXXXByExprs(path, options, print);
    default:
      return "not implemented";
  }
};

const printBetweenOperator: PrintFunc = (path, options, print) => {
  type ThisNode = N.BetweenOperator;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, print, node, node.children);
  const right = path.call(
    (p) => p.call((p) => p.map(print, "NodeVec"), "right"),
    "children"
  );
  const right0 = right[0];
  const right1 = right[1];
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    left: p.child("left"),
    not: p.has("not")
      ? p.child("not", (x) => group(concat([line, x])))
      : concat([]),
    leading_comments: printLeadingComments(path, options, print),
    self: concat([line, p.self()]),
    trailing_comments: printTrailingComments(path, options, print),
    right: concat([
      group(concat([line, right0])),
      group(
        concat([
          group(concat([line, p.child("and")])),
          group(concat([line, right1])),
        ])
      ),
    ]),
    alias: printAlias(path as FastPathOf<ThisNode>, options, print),
    comma: p.child("comma"),
    // not used
    and: "",
    as: "",
  };
  docs.and;
  docs.as;
  return concat([
    docs.left,
    docs.not,
    docs.leading_comments,
    docs.self,
    docs.trailing_comments,
    indent(concat([docs.right, docs.alias, docs.comma])),
  ]);
};

const printBooleanLiteral: PrintFunc = (path, options, print) => {
  type ThisNode = N.Expr;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print),
    self: p.self(),
    trailing_comments: printTrailingComments(path, options, print),
    alias: printAlias(path as FastPathOf<ThisNode>, options, print),
    comma: p.child("comma"),
    // not used
    as: "",
  };
  docs.as;
  return concat([
    docs.leading_comments,
    docs.self,
    docs.trailing_comments,
    docs.alias,
    docs.comma,
  ]);
};

const printBinaryOperator: PrintFunc = (path, options, print) => {
  type ThisNode = N.BinaryOperator;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    left: p.child("left"),
    leading_comments: printLeadingComments(path, options, print),
    self: p.self(),
    trailing_comments: printTrailingComments(path, options, print),
    right: p.child("right"),
    alias: printAlias(path as FastPathOf<ThisNode>, options, print),
    comma: p.child("comma"),
    // not used
    as: "",
  };
  docs.as;
  return concat([
    docs.left,
    docs.leading_comments,
    p.includedIn(["."]) ? docs.self : group(concat([line, docs.self])), // TODO
    docs.trailing_comments,
    p.includedIn(["."]) ? docs.right : group(concat([line, docs.right])),
    docs.alias,
    docs.comma,
  ]);
};

const printComment: PrintFunc = (path, _, print) => {
  type ThisNode = N.Comment;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    self: p.self(),
  };
  return docs.self;
};

const printEOF: PrintFunc = (path, options, print) => {
  type ThisNode = N.EOF;
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print),
    // not used
    self: concat([]),
  };
  docs.self;
  return docs.leading_comments;
};

const printGroupedStatement: PrintFunc = (path, options, print) => {
  type ThisNode = N.GroupedStatement;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, print, node, node.children);
  p.setNotRoot("stmt");
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print),
    self: p.self(),
    trailing_comments: printTrailingComments(path, options, print),
    stmt: indent(p.child("stmt", (x) => concat([softline, x]))),
    rparen: p.child("rparen", (x) => concat([softline, x])),
    alias: printAlias(path as FastPathOf<ThisNode>, options, print),
    comma: p.child("comma"),
    semicolon: p.child("semicolon", (x) => concat([softline, x])),
    // not used
    as: "",
  };
  docs.as;
  return concat([
    docs.leading_comments,
    group(
      concat([
        docs.self,
        docs.trailing_comments,
        docs.stmt,
        docs.rparen,
        docs.alias,
        docs.comma,
        docs.semicolon,
      ])
    ),
    p.newLine(),
  ]);
};

const printIdentifier: PrintFunc = (path, options, print) => {
  type ThisNode = N.Expr;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print),
    self: p.self(),
    trailing_comments: printTrailingComments(path, options, print),
    alias: printAlias(path as FastPathOf<ThisNode>, options, print),
    comma: p.child("comma"),
    // not used
    as: "",
  };
  docs.as;
  return concat([
    docs.leading_comments,
    docs.self,
    docs.trailing_comments,
    docs.alias,
    docs.comma,
  ]);
};

const printKeyword: PrintFunc = (path, options, print) => {
  type ThisNode = N.Keyword;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print),
  };
  return concat([docs.leading_comments, docs.self, docs.trailing_comments]);
};

const printKeywordWithExpr: PrintFunc = (path, options, print) => {
  type ThisNode = N.KeywordWithExpr;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print),
    expr: indent(p.child("expr", (x) => concat([line, x]))),
  };
  return concat([
    docs.leading_comments,
    group(concat([docs.self, docs.trailing_comments, docs.expr])),
  ]);
};

const printNumericLiteral: PrintFunc = (path, options, print) => {
  type ThisNode = N.Expr;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print),
    self: p.self("lower"), // in the case of `3.14e10`
    trailing_comments: printTrailingComments(path, options, print),
    alias: printAlias(path as FastPathOf<ThisNode>, options, print),
    comma: p.child("comma"),
    // not used
    as: "",
  };
  docs.as;
  return concat([
    docs.leading_comments,
    group(concat([docs.self, docs.trailing_comments, docs.alias, docs.comma])),
  ]);
};

const printSelectStatement: PrintFunc = (path, options, print) => {
  type ThisNode = N.SelectStatement;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print),
    // SELECT clause
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print),
    exprs: indent(p.child("exprs", "", (x) => concat([line, group(x)]))),
    // FROM clause
    from: p.has("from") ? concat([line, p.child("from")]) : concat([]),
    // WHERE clause
    where: p.has("where") ? concat([line, p.child("where")]) : concat([]),
    // ORDER BY clause
    orderby: p.has("orderby") ? concat([line, p.child("orderby")]) : concat([]),
    semicolon: p.child("semicolon", (x) => concat([softline, x])),
  };
  return concat([
    docs.leading_comments,
    group(
      concat([
        docs.trailing_comments,
        p.len("exprs") === 1
          ? group(concat([docs.self, docs.exprs]))
          : concat([docs.self, docs.exprs]),
        docs.from,
        docs.where,
        docs.orderby,
        docs.semicolon,
      ])
    ),
    p.newLine(),
  ]);
};

const printStringLiteral: PrintFunc = (path, options, print) => {
  type ThisNode = N.Expr;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print),
    self: p.self(),
    trailing_comments: printTrailingComments(path, options, print),
    alias: printAlias(path as FastPathOf<ThisNode>, options, print),
    comma: p.child("comma"),
    // not used
    as: "",
  };
  docs.as;
  return concat([
    docs.leading_comments,
    docs.self,
    docs.trailing_comments,
    docs.alias,
    docs.comma,
  ]);
};

const printUnaryOperator: PrintFunc = (path, options, print) => {
  type ThisNode = N.UnaryOperator;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, print, node, node.children);
  const lowerCaseOperators = ["b", "br", "r", "rb"];
  const noSpaceOperators = [
    "+",
    "-",
    "~",
    "br",
    "r",
    "rb",
    "b",
    "ARRAY",
    "STRUCT",
  ];
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print),
    self: p.includedIn(lowerCaseOperators) ? p.self("lower") : p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print),
    right: p.includedIn(noSpaceOperators)
      ? p.child("right")
      : p.child("right", (x) => concat([line, x])),
    alias: printAlias(path as FastPathOf<ThisNode>, options, print),
    comma: p.child("comma"),
    // not used
    as: "",
  };
  docs.as;
  return concat([
    docs.leading_comments,
    group(
      concat([
        docs.self,
        docs.trailing_comments,
        docs.right,
        docs.alias,
        docs.comma,
      ])
    ),
  ]);
};

const printXXXByExprs: PrintFunc = (path, options, print) => {
  type ThisNode = N.XXXByExprs;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print),
    by: p.child("by", (x) => concat([line, x])),
    exprs: indent(p.child("exprs", "", (x) => concat([line, x]))),
  };
  return concat([
    docs.leading_comments,
    group(
      concat([
        group(concat([docs.self, docs.trailing_comments, docs.by])),
        docs.exprs,
      ])
    ),
  ]);
};

const printSymbol: PrintFunc = (path, options, print) => {
  type ThisNode = N.Symbol_;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print),
  };
  return concat([docs.leading_comments, docs.self, docs.trailing_comments]);
};

// ----- utils -----
const printAlias = (
  path: FastPathOf<N.Expr>,
  _: Options,
  print: (path: FastPath) => Doc
): Doc => {
  type ThisNode = N.Expr;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, print, node, node.children);
  let as_: Doc;
  if (!p.has("alias")) {
    return concat([]);
  }
  if (p.has("as")) {
    as_ = p.child("as");
  } else {
    as_ = "AS";
  }
  return concat([line, as_, group(concat([line, p.child("alias")]))]);
};

const printLeadingComments: PrintFunc = (path, _, print) => {
  type ThisNode = N.BaseNode;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, print, node, node.children);
  return p.child("leading_comments", "", (x) => concat([x, hardline]));
};

const printTrailingComments: PrintFunc = (path, _, print) => {
  type ThisNode = N.BaseNode;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, print, node, node.children);
  return lineSuffix(p.child("trailing_comments", "", (x) => concat([" ", x])));
};
