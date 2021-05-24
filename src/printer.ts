//import { reservedKeywords, globalFunctions } from "./keywords";
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
  _: object,
  print: (path: FastPath) => Doc
) => Doc;

type PrintFuncWithoutOptions = (
  path: FastPath,
  print: (path: FastPath) => Doc
) => Doc;

// used with type assertion
type FastPathOf<_ extends N.BaseNode> = FastPath & {
  readonly brand: unique symbol;
};

class Printer<T extends N.BaseNode> {
  /**
   * Children<T> is needed because `keyof T["children"]` throws error
   * https://github.com/microsoft/TypeScript/issues/36631
   */
  constructor(
    private readonly path: FastPath,
    private readonly print: (path: FastPath) => Doc,
    private readonly node: T,
    private readonly children: N.Children<T>
  ) {}
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
    }
    return literal;
  }
  setNotRoot(key: N.NodeKeyof<N.Children<T>>) {
    const child = this.children[key];
    if (N.isNode(child)) {
      child.Node.notRoot = true;
    }
  }
}

export const printSQL: PrintFunc = (path, _, print) => {
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
          const trailling_comments = semicolon.Node.children.trailling_comments;
          if (trailling_comments) {
            const comments = trailling_comments.NodeVec;
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
          const leading_comments = startNode.children.trailling_comments;
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
    case "BooleanLiteral":
      return printBooleanLiteral(path, print);
    case "Comment":
      return printComment(path, print);
    case "EOF":
      return printEOF(path, print);
    case "GroupedStatement":
      return printGroupedStatement(path, print);
    case "Identifier":
      return printIdentifier(path, print);
    case "Keyword":
      return printKeyword(path as FastPathOf<N.Keyword>, print);
    case "KeywordWithExpr":
      return printKeywordWithExpr(path, print);
    case "NumericLiteral":
      return printNumericLiteral(path, print);
    case "SelectStatement":
      return printSelectStatement(path, print);
    case "Symbol":
      return printSymbol(path, print);
    case "XXXByExprs":
      return printXXXByExprs(path, print);
    default:
      return "not implemented";
  }
};

const printBooleanLiteral: PrintFuncWithoutOptions = (path, print) => {
  const node: N.Expr = path.getValue();
  const p = new Printer(path, print, node, node.children);
  return concat([
    p.child("leading_comments", "", (x) => concat([x, hardline])),
    p.self("upper"),
    lineSuffix(p.child("trailling_comments", "", (x) => concat([" ", x]))),
    printAlias(path as FastPathOf<N.Expr>, print),
    p.child("comma"),
  ]);
};

const printComment: PrintFuncWithoutOptions = (path, print) => {
  const node: N.Comment = path.getValue();
  const p = new Printer(path, print, node, node.children);
  return p.self();
};

const printEOF: PrintFuncWithoutOptions = (path, print) => {
  const node: N.EOF = path.getValue();
  const p = new Printer(path, print, node, node.children);
  return p.child("leading_comments", hardline);
};

const printGroupedStatement: PrintFuncWithoutOptions = (path, print) => {
  const node: N.GroupedStatement = path.getValue();
  const p = new Printer(path, print, node, node.children);
  p.setNotRoot("stmt");
  return concat([
    p.child("leading_comments", "", (x) => concat([x, hardline])),
    group(
      concat([
        p.self(),
        lineSuffix(p.child("trailling_comments", "", (x) => concat([" ", x]))),
        indent(p.child("stmt", (x) => concat([softline, x]))),
        p.child("rparen", (x) => concat([softline, x])),
        printAlias(path as FastPathOf<N.GroupedStatement>, print),
        p.child("semicolon", (x) => concat([softline, x])),
      ])
    ),
    p.newLine(),
  ]);
};

const printIdentifier: PrintFuncWithoutOptions = (path, print) => {
  const node: N.Expr = path.getValue();
  const p = new Printer(path, print, node, node.children);
  return concat([
    p.child("leading_comments", "", (x) => concat([x, hardline])),
    p.self(),
    lineSuffix(p.child("trailling_comments", "", (x) => concat([" ", x]))),
    printAlias(path as FastPathOf<N.Expr>, print),
    p.child("comma"),
  ]);
};

const printKeyword = (
  path: FastPathOf<N.Keyword>,
  print: (path: FastPath) => Doc
) => {
  const node: N.Keyword = path.getValue();
  const p = new Printer(path, print, node, node.children);
  return concat([
    p.child("leading_comments", "", (x) => concat([x, hardline])),
    p.self("upper"),
    lineSuffix(p.child("trailling_comments", "", (x) => concat([" ", x]))),
  ]);
};

const printKeywordWithExpr: PrintFuncWithoutOptions = (path, print) => {
  const node: N.KeywordWithExpr = path.getValue();
  const p = new Printer(path, print, node, node.children);
  return concat([
    printKeyword(path as FastPathOf<N.KeywordWithExpr>, print),
    indent(p.child("expr", (x) => concat([line, x]))),
  ]);
};

const printNumericLiteral: PrintFuncWithoutOptions = (path, print) => {
  const node: N.Expr = path.getValue();
  const p = new Printer(path, print, node, node.children);
  return group(
    concat([
      p.child("leading_comments", "", (x) => concat([x, hardline])),
      p.self("lower"), // in the case of `3.14e10`
      lineSuffix(p.child("trailling_comments", "", (x) => concat([" ", x]))),
      printAlias(path as FastPathOf<N.Expr>, print),
      p.child("comma"),
    ])
  );
};

const printSelectStatement: PrintFuncWithoutOptions = (path, print) => {
  const node: N.SelectStatement = path.getValue();
  const p = new Printer(path, print, node, node.children);
  // SELECT clause
  let select: Doc = concat([
    p.self("upper"),
    lineSuffix(p.child("trailling_comments", "", (x) => concat([" ", x]))),
    indent(p.child("exprs", "", (x) => concat([line, group(x)]))),
  ]);
  if (p.len("exprs") === 1) {
    select = group(select);
  }
  // FROM clause
  let from: Doc = concat([]);
  if (p.has("from")) {
    from = concat([line, group(p.child("from"))]);
  }
  // WHERE clause
  let where: Doc = concat([]);
  if (p.has("where")) {
    where = concat([line, group(p.child("where"))]);
  }
  // ORDER BY clause
  let orderby: Doc = concat([]);
  if (p.has("orderby")) {
    orderby = concat([line, group(p.child("orderby"))]);
  }
  return concat([
    p.child("leading_comments", "", (x) => concat([x, hardline])),
    group(
      concat([
        select,
        from,
        where,
        orderby,
        p.child("semicolon", (x) => concat([softline, x])),
      ])
    ),
    p.newLine(),
  ]);
};

const printXXXByExprs: PrintFuncWithoutOptions = (path, print) => {
  const node: N.XXXByExprs = path.getValue();
  const p = new Printer(path, print, node, node.children);
  return concat([
    group(
      concat([
        printKeyword(path as FastPathOf<N.XXXByExprs>, print),
        line,
        p.child("by"),
      ])
    ),
    indent(p.child("exprs", "", (x) => concat([line, x]))),
  ]);
};

const printSymbol: PrintFuncWithoutOptions = (path, print) => {
  const node: N.Symbol = path.getValue();
  const p = new Printer(path, print, node, node.children);
  return concat([
    p.child("leading_comments", "", (x) => concat([x, hardline])),
    p.self(),
    lineSuffix(p.child("trailling_comments", "", (x) => concat([" ", x]))),
  ]);
};

// ----- utils -----
const printAlias = (
  path: FastPathOf<N.Expr>,
  print: (path: FastPath) => Doc
): Doc => {
  const node: N.Expr = path.getValue();
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
  return concat([line, group(concat([as_, line, p.child("alias")]))]);
};
