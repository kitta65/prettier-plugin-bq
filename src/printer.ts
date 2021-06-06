import { reservedKeywords, globalFunctions } from "./keywords";
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
  child(
    key: N.NodeKeyof<N.Children<T>>,
    transform?: (x: Doc) => Doc,
    consumeLeadingComments?: boolean
  ): Doc;
  child(
    key: N.NodeVecKeyof<N.Children<T>>,
    transform?: (x: Doc) => Doc,
    consumeLeadingComments?: boolean,
    sep?: Doc
  ): Doc;
  child(
    key: N.NodeKeyof<N.Children<T>> | N.NodeVecKeyof<N.Children<T>>,
    transform?: (x: Doc) => Doc,
    consumeLeadingComments?: boolean,
    sep?: Doc
  ): Doc {
    const child = this.children[key];
    let f = (x: Doc) => x;
    if (N.isNode(child)) {
      if (typeof transform === "function") {
        f = transform;
      }
      let comments: Doc = "";
      if (consumeLeadingComments) {
        comments = this.consumeLeadingCommentsOfX(
          key as N.NodeKeyof<N.Children<T>>
        );
      }
      return concat([
        comments,
        this.path.call(
          (p) => p.call((p) => f(p.call(this.print, "Node")), key),
          "children"
        ),
      ]);
    } else if (N.isNodeVec(child)) {
      if (typeof transform === "function") {
        f = transform;
      }
      let comments: Doc = "";
      if (consumeLeadingComments) {
        comments = this.consumeLeadingCommentsOfX(key);
      }
      return concat([
        comments,
        this.path.call(
          (p) =>
            p.call(
              (p) => join(sep || "", p.map(this.print, "NodeVec").map(f)),
              key
            ),
          "children"
        ),
      ]);
    }
    // in the case of `child` is undefined
    return "";
  }
  consumeLeadingCommentsOfSelf() {
    const leading_comments = this.children["leading_comments"];
    if (leading_comments) {
      const res = leading_comments.NodeVec.map((x) =>
        lineSuffix(concat([" ", x.token.literal]))
      );
      delete this.children.leading_comments;
      return concat(res);
    }
    return "";
  }
  consumeLeadingCommentsOfX(key: keyof N.Children<T>) {
    const firstNode = this.getFirstNode(key);
    if (!firstNode) {
      return "";
    }
    const leading_comments = firstNode.children.leading_comments;
    if (leading_comments) {
      const res = leading_comments.NodeVec.map((x) =>
        lineSuffix(concat([" ", x.token.literal]))
      );
      delete firstNode.children.leading_comments;
      return concat(res);
    } else {
      return "";
    }
  }
  getFirstNode(key: keyof N.Children<T>) {
    const child = this.children[key];
    let firstNode;
    if (N.isNode(child)) {
      firstNode = getFirstNode(child.Node);
    } else if (N.isNodeVec(child)) {
      firstNode = getFirstNode(child.NodeVec[0]);
    } else {
      return null;
    }
    return firstNode;
  }
  has(key: keyof N.Children<T>) {
    const child = this.children[key];
    if (child) {
      return true;
    }
    false;
  }
  hasLeadingComments(key: keyof N.Children<T>) {
    const firstNode = this.getFirstNode(key);
    if (!firstNode) {
      return false;
    }
    return "leading_comments" in firstNode.children;
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
    if (this.node.notRoot) return "";
    if (this.node.emptyLines && 0 < this.node.emptyLines) {
      return concat([hardline, hardline]);
    }
    return hardline;
  }
  self(
    upperOrLower?: "upper" | "lower" | "asItIs",
    consumeLeadingComments?: boolean
  ) {
    const token = this.node.token;
    if (!token) {
      return "";
    }
    let literal = token.literal;
    if (upperOrLower === "upper") {
      literal = literal.toUpperCase();
    } else if (upperOrLower === "lower") {
      literal = literal.toLowerCase();
    } else if (!this.node.notGlobal && this.includedIn(reservedKeywords)) {
      literal = literal.toUpperCase();
    }
    let comments: Doc = "";
    if (consumeLeadingComments) {
      comments = this.consumeLeadingCommentsOfSelf();
    }
    return concat([comments, literal]);
  }
  setCallable(key: N.NodeKeyof<N.Children<T>>) {
    const child = this.children[key];
    if (N.isNode(child)) {
      child.Node.callable = true;
    }
  }
  setNotRoot(key: keyof N.Children<T>) {
    const child = this.children[key];
    if (N.isNode(child)) {
      child.Node.notRoot = true;
    } else if (N.isNodeVec(child)) {
      child.NodeVec.forEach((x) => {
        x.notRoot = true;
      });
    }
  }
  setNoGlobal(key: N.NodeKeyof<N.Children<T>>) {
    const child = this.children[key];
    if (N.isNode(child)) {
      child.Node.notGlobal = true;
    }
  }
  toUpper(key: keyof N.Children<T>) {
    const child = this.children[key];
    if (N.isNode(child)) {
      const token = child.Node.token;
      if (token) {
        token.literal = token.literal.toUpperCase();
      }
    } else if (N.isNodeVec(child)) {
      child.NodeVec.forEach((x) => {
        const token = x.token;
        if (token) {
          token.literal = token.literal.toUpperCase();
        }
      });
    }
  }
}

const asItIs = (x: Doc) => {
  return x;
};

const getFirstNode = (node: N.BaseNode): N.BaseNode => {
  const candidates = [];
  for (const [k, v] of Object.entries(node.children)) {
    if (["leading_comments", "trailing_comments"].includes(k)) {
      continue;
    }
    if (N.isNode(v)) {
      candidates.push(getFirstNode(v.Node));
    } else if (N.isNodeVec(v)) {
      // NOTE maybe you don't have to check 2nd, 3rd, or latter node
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
          const leading_comments = startNode.children.leading_comments;
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
    case "Asterisk":
      return printAsterisk(path, options, print);
    case "ArrayAccessing":
      return printArrayAccessing(path, options, print);
    case "ArrayLiteral":
      return printArrayLiteral(path, options, print);
    case "BetweenOperator":
      return printBetweenOperator(path, options, print);
    case "BooleanLiteral":
      return printBooleanLiteral(path, options, print);
    case "BinaryOperator":
      return printBinaryOperator(path, options, print);
    case "CallingFunction":
      return printCallingFunction(
        path as FastPathOf<N.CallingFunction>,
        options,
        print
      );
    case "CallingDatePartFunction":
      return printCallingDatePartFunction(path, options, print);
    case "CaseArm":
      return printCaseArm(path, options, print);
    case "CaseExpr":
      return printCaseExpr(path, options, print);
    case "CastArgument":
      return printCastArgument(path, options, print);
    case "Comment":
      return printComment(path, options, print);
    case "DotOperator":
      return printDotOperator(path, options, print);
    case "EOF":
      return printEOF(path, options, print);
    case "ExtractArgument":
      return printExtractArgument(path, options, print);
    case "ForSystemTimeAsOfClause":
      return printForSystemTimeAsOfclause(path, options, print);
    case "GroupedExpr":
      return printGroupedExpr(path, options, print);
    case "GroupedExprs":
      return printGroupedExprs(path, options, print);
    case "GroupedStatement":
      return printGroupedStatement(path, options, print);
    case "GroupedType":
      return printGroupedType(path, options, print);
    case "GroupedTypeDeclarations":
      return printGroupedTypeDeclarations(path, options, print);
    case "Identifier":
      return printIdentifier(path, options, print);
    case "InOperator":
      return printInOperator(path, options, print);
    case "IntervalLiteral":
      return printIntervalLiteral(path, options, print);
    case "Keyword":
      return printKeyword(path, options, print);
    case "KeywordWithExpr":
      return printKeywordWithExpr(path, options, print);
    case "KeywordWithGroupedExprs":
      return printKeywordWithGroupedExprs(path, options, print);
    case "NullLiteral":
      return printNullLiteral(path, options, print);
    case "NumericLiteral":
      return printNumericLiteral(path, options, print);
    case "OverClause":
      return printOverClause(path, options, print);
    case "PivotConfig":
      return printPivotConfig(path, options, print);
    case "PivotOperator":
      return printPivotOperator(path, options, print);
    case "SelectStatement":
      return printSelectStatement(path, options, print);
    case "SetOperator":
      return printSetOperator(path, options, print);
    case "StringLiteral":
      return printStringLiteral(path, options, print);
    case "StructLiteral":
      return printStructLiteral(path, options, print);
    case "Symbol":
      return printSymbol(path, options, print);
    case "TableSampleClause":
      return printTableSampleClause(path, options, print);
    case "TableSampleRatio":
      return printTableSampleRatio(path, options, print);
    case "Type":
      return printType(path, options, print);
    case "TypeDeclaration":
      return printTypeDeclaration(path, options, print);
    case "UnaryOperator":
      return printUnaryOperator(path, options, print);
    case "UnpivotConfig":
      return printUnpivotConfig(path, options, print);
    case "UnpivotOperator":
      return printUnpivotOperator(path, options, print);
    case "WindowFrameClause":
      return printWindowFrameClause(path, options, print);
    case "WindowSpecification":
      return printWindowSpecification(path, options, print);
    case "WithClause":
      return printWithClause(path, options, print);
    case "WithQuery":
      return printWithQuery(path, options, print);
    case "XXXByExprs":
      return printXXXByExprs(path, options, print);
    default:
      return "not implemented";
  }
};

const printAsterisk: PrintFunc = (path, options, print) => {
  type ThisNode = N.Asterisk;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print),
    self: p.self(),
    trailing_comments: printTrailingComments(path, options, print),
    except: p.child("except", (x) => concat([" ", x]), true),
    replace: p.child("replace", (x) => concat([" ", x]), true),
    alias: printAlias(path as FastPathOf<ThisNode>, options, print),
    order: p.child("order", (x) => concat([" ", x]), true),
    comma: p.child("comma", asItIs, true),
    // not used
    as: "",
  };
  docs.as;
  return concat([
    docs.leading_comments,
    docs.self,
    docs.trailing_comments,
    docs.except,
    docs.replace,
    docs.alias,
    docs.order,
    docs.comma,
  ]);
};

const printArrayAccessing: PrintFunc = (path, options, print) => {
  type ThisNode = N.ArrayAccessing;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    left: p.child("left"),
    self: p.self("asItIs", true),
    trailing_comments: printTrailingComments(path, options, print),
    right: p.child("right"),
    rparen: p.child("rparen"),
    alias: printAlias(path as FastPathOf<ThisNode>, options, print),
    order: p.child("order", (x) => concat([" ", x]), true),
    comma: p.child("comma", asItIs, true),
    // not used
    leading_comments: "",
    as: "",
  };
  docs.leading_comments;
  docs.as;
  return concat([
    docs.left,
    docs.self,
    docs.trailing_comments,
    indent(concat([softline, docs.right])),
    softline,
    docs.rparen,
    docs.alias,
    docs.order,
    docs.comma,
  ]);
};

const printArrayLiteral: PrintFunc = (path, options, print) => {
  type ThisNode = N.ArrayLiteral;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    type: p.child("type"),
    leading_comments: p.has("type")
      ? ""
      : printLeadingComments(path, options, print),
    self: p.has("type") ? p.self("asItIs", true) : p.self(),
    trailing_comments: printTrailingComments(path, options, print),
    exprs: p.child("exprs", (x) => group(x), false, line),
    rparen: p.child("rparen"),
    alias: printAlias(path as FastPathOf<ThisNode>, options, print),
    order: p.child("order", (x) => concat([" ", x]), true),
    comma: p.child("comma", asItIs, true),
    // not used
    as: "",
  };
  docs.as;
  return concat([
    docs.type,
    docs.leading_comments,
    docs.self,
    docs.trailing_comments,
    indent(concat([softline, docs.exprs])),
    softline,
    docs.rparen,
    docs.alias,
    docs.order,
    docs.comma,
  ]);
};

const printBetweenOperator: PrintFunc = (path, options, print) => {
  type ThisNode = N.BetweenOperator;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    left: p.child("left"),
    not: p.child("not", asItIs, true),
    self: p.self("upper", true),
    trailing_comments: printTrailingComments(path, options, print),
    right_min: p.child("right_min"),
    and: p.child("and"),
    right_max: p.child("right_max", asItIs, true),
    alias: printAlias(path as FastPathOf<ThisNode>, options, print),
    order: p.child("order", (x) => concat([" ", x]), true),
    comma: p.child("comma", asItIs, true),
    // not used
    leading_comments: "",
    as: "",
  };
  docs.leading_comments;
  docs.as;
  return concat([
    docs.left,
    " ",
    p.has("not") ? concat([docs.not, " "]) : "",
    docs.self,
    docs.trailing_comments,
    indent(
      concat([
        line,
        group(docs.right_min),
        line,
        group(concat([docs.and, " ", docs.right_max])),
        docs.alias,
        docs.order,
        docs.comma,
      ])
    ),
  ]);
};

const printBooleanLiteral: PrintFunc = (path, options, print) => {
  type ThisNode = N.BooleanLiteral;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print),
    self: p.self(),
    trailing_comments: printTrailingComments(path, options, print),
    alias: printAlias(path as FastPathOf<ThisNode>, options, print),
    order: p.child("order", (x) => concat([" ", x]), true),
    comma: p.child("comma", asItIs, true),
    // not used
    as: "",
  };
  docs.as;
  return concat([
    docs.leading_comments,
    docs.self,
    docs.trailing_comments,
    docs.alias,
    docs.order,
    docs.comma,
  ]);
};

const printBinaryOperator: PrintFunc = (path, options, print) => {
  type ThisNode = N.BinaryOperator;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    left: p.child("left"),
    not: p.child("not", asItIs, true),
    self: p.self("upper", true),
    trailing_comments: printTrailingComments(path, options, print),
    right: p.child("right", asItIs, true),
    alias: printAlias(path as FastPathOf<ThisNode>, options, print),
    order: p.child("order", (x) => concat([" ", x]), true),
    comma: p.child("comma", asItIs, true),
    // not used
    leading_comments: "",
    as: "",
  };
  docs.leading_comments;
  docs.as;
  return concat([
    docs.left,
    " ",
    p.has("not") && !p.includedIn(["IS"]) ? concat([docs.not, " "]) : "",
    docs.self,
    p.has("not") && p.includedIn(["IS"]) ? concat([" ", docs.not]) : "",
    " ",
    docs.trailing_comments,
    docs.right,
    docs.alias,
    docs.order,
    docs.comma,
  ]);
};

const printCallingFunction = (
  path: FastPathOf<N.CallingFunction>,
  options: Options,
  print: (path: FastPath) => Doc
) => {
  type ThisNode = N.CallingFunction;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, print, node, node.children);
  p.setCallable("func");
  p.setNotRoot("args");
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    func: p.child("func"),
    self: p.self("asItIs", true),
    trailing_comments: printTrailingComments(path, options, print),
    distinct: p.child("distinct", (x) => concat([x, line])),
    args: p.child("args", (x) => group(x), false, line),
    ignore_nulls: p.child("ignore_nulls", asItIs, false, " "),
    orderby: p.child("orderby"),
    limit: p.child("limit"),
    rparen: p.child("rparen"),
    over: p.child("over", (x) => concat([" ", x]), true),
    alias: printAlias(path as FastPathOf<ThisNode>, options, print),
    order: p.child("order", (x) => concat([" ", x]), true),
    comma: p.child("comma", asItIs, true),
    // not used
    leading_comments: "",
    as: "",
  };
  docs.leading_comments;
  docs.as;
  return concat([
    // func often has leading_comments, so it is placed out of group
    docs.func,
    group(
      concat([
        docs.self,
        docs.trailing_comments,
        indent(
          concat([
            p.has("args") ? softline : "",
            docs.distinct,
            docs.args,
            p.has("ignore_nulls") ? line : "",
            group(docs.ignore_nulls),
            p.has("orderby") ? line : "",
            group(docs.orderby),
            p.has("limit") ? line : "",
            group(docs.limit),
          ])
        ),
        p.has("args") ? softline : "",
        docs.rparen,
      ])
    ),
    docs.over,
    docs.alias,
    docs.order,
    docs.comma,
  ]);
};

const printCallingDatePartFunction: PrintFunc = (path, options, print) => {
  type ThisNode = N.CallingDatePartFunction;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, print, node, node.children);
  p.toUpper("func");
  p.toUpper("args");
  return printCallingFunction(path as FastPathOf<ThisNode>, options, print);
};

const printCaseArm: PrintFunc = (path, options, print) => {
  type ThisNode = N.CaseArm;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print),
    self: p.self(),
    trailing_comments: printTrailingComments(path, options, print),
    expr: p.child("expr", asItIs, true),
    then: p.child("then", asItIs),
    result: p.child("result"),
  };
  return concat([
    docs.leading_comments,
    docs.self,
    docs.trailing_comments,
    " ",
    docs.expr,
    indent(
      concat([
        p.has("expr") ? line : "",
        group(concat([docs.then, p.has("then") ? " " : "", docs.result])),
      ])
    ),
  ]);
};

const printCaseExpr: PrintFunc = (path, options, print) => {
  type ThisNode = N.CaseExpr;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print),
    self: p.self(),
    trailing_comments: printTrailingComments(path, options, print),
    expr: p.child("expr", asItIs, true),
    arms: p.child("arms", (x) => group(x), false, line),
    end: p.child("end", asItIs, true),
    alias: printAlias(path as FastPathOf<ThisNode>, options, print),
    order: p.child("order", (x) => concat([" ", x]), true),
    comma: p.child("comma", asItIs, true),
    // not used
    as: "",
  };
  docs.as;
  return concat([
    docs.leading_comments,
    docs.self,
    docs.trailing_comments,
    " ",
    docs.expr,
    indent(concat([p.has("expr") ? line : "", docs.arms])),
    " ",
    docs.end,
    docs.alias,
    docs.order,
    docs.comma,
  ]);
};

const printCastArgument: PrintFunc = (path, options, print) => {
  type ThisNode = N.CastArgument;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    cast_from: p.child("cast_from"),
    self: p.self("upper", true),
    trailing_comments: printTrailingComments(path, options, print),
    cast_to: p.child("cast_to", asItIs, true),
    // not used
    leading_comments: "",
  };
  docs.leading_comments;
  return concat([
    docs.cast_from,
    " ",
    docs.self,
    docs.trailing_comments,
    " ",
    docs.cast_to,
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

const printDotOperator: PrintFunc = (path, options, print) => {
  type ThisNode = N.DotOperator;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    left: p.child("left"),
    self: p.self("upper", true),
    trailing_comments: printTrailingComments(path, options, print),
    right: p.child("right"),
    alias: printAlias(path as FastPathOf<ThisNode>, options, print),
    for_system_time_as_of: p.child("for_system_time_as_of", asItIs, true),
    pivot: printPivotOrUnpivotOperator(
      path as FastPathOf<ThisNode>,
      options,
      print
    ),
    tablesample: p.child("tablesample", asItIs, true),
    order: p.child("order", (x) => concat([" ", x]), true),
    comma: p.child("comma", asItIs, true),
    // not used
    leading_comments: "",
    as: "",
    unpivot: "",
  };
  docs.leading_comments;
  docs.unpivot, docs.as;
  return concat([
    docs.left,
    docs.self,
    docs.trailing_comments,
    docs.right,
    docs.alias,
    p.has("for_system_time_as_of")
      ? concat([" ", docs.for_system_time_as_of])
      : "",
    docs.pivot,
    p.has("tablesample") ? concat([" ", docs.tablesample]) : "",
    docs.order,
    docs.comma,
  ]);
};

const printEOF: PrintFunc = (path, options, print) => {
  type ThisNode = N.EOF;
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print),
    // not used
    self: "",
  };
  docs.self;
  return docs.leading_comments;
};

const printExtractArgument: PrintFunc = (path, options, print) => {
  type ThisNode = N.ExtractArgument;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    extract_datepart: p.child("extract_datepart"),
    self: p.self("upper", true),
    trailing_comments: printTrailingComments(path, options, print),
    extract_from: p.child("extract_from", asItIs, true),
    at_time_zone: p.child("at_time_zone", asItIs, false, " "),
    time_zone: p.child("time_zone", asItIs, true),
    // not used
    leading_comments: "",
  };
  docs.leading_comments;
  return concat([
    docs.extract_datepart,
    " ",
    docs.self,
    docs.trailing_comments,
    " ",
    docs.extract_from,
    p.has("at_time_zone") ? line : "",
    docs.at_time_zone,
    p.has("time_zone") ? " " : "",
    docs.time_zone,
  ]);
};

const printForSystemTimeAsOfclause: PrintFunc = (path, options, print) => {
  type ThisNode = N.ForSystemTimeAsOfClause;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print),
    system_time_as_of: p.child("system_time_as_of", (x) =>
      group(concat([line, x]))
    ),
    expr: p.child("expr", asItIs, true),
  };
  return concat([
    docs.leading_comments,
    docs.self,
    docs.trailing_comments,
    docs.system_time_as_of,
    " ",
    docs.expr,
  ]);
};

const printGroupedExpr: PrintFunc = (path, options, print) => {
  type ThisNode = N.GroupedExpr;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print),
    self: p.self(),
    trailing_comments: printTrailingComments(path, options, print),
    expr: p.child("expr"),
    rparen: p.child("rparen"),
    alias: printAlias(path as FastPathOf<ThisNode>, options, print),
    pivot: printPivotOrUnpivotOperator(
      path as FastPathOf<ThisNode>,
      options,
      print
    ),
    order: p.child("order", (x) => concat([" ", x]), true),
    comma: p.child("comma", asItIs, true),
    // not used
    as: "",
    unpivot: "",
  };
  docs.unpivot;
  docs.as;
  return concat([
    docs.leading_comments,
    docs.self,
    docs.trailing_comments,
    indent(concat([softline, docs.expr])),
    softline,
    docs.rparen,
    docs.alias,
    docs.pivot,
    docs.order,
    docs.comma,
  ]);
};

const printGroupedExprs: PrintFunc = (path, options, print) => {
  type ThisNode = N.GroupedExprs;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print),
    self: p.self(),
    trailing_comments: printTrailingComments(path, options, print),
    exprs: p.child("exprs", asItIs, false, line),
    rparen: p.child("rparen"),
    as: p.has("as") ? p.child("as", asItIs, true) : "AS",
    row_value_alias: p.child("row_value_alias", asItIs, true),
    comma: p.child("comma", asItIs, true),
  };
  return concat([
    docs.leading_comments,
    group(
      concat([
        docs.self,
        docs.trailing_comments,
        indent(concat([softline, docs.exprs])),
        softline,
        docs.rparen,
        p.has("row_value_alias") ? concat([" ", docs.as]) : "",
        p.has("row_value_alias") ? concat([" ", docs.row_value_alias]) : "",
        docs.comma,
      ])
    ),
  ]);
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
    stmt: p.child("stmt"),
    rparen: p.child("rparen"),
    alias: printAlias(path as FastPathOf<ThisNode>, options, print),
    pivot: printPivotOrUnpivotOperator(
      path as FastPathOf<ThisNode>,
      options,
      print
    ),
    order: p.child("order", (x) => concat([" ", x]), true),
    comma: p.child("comma", asItIs, true),
    semicolon: p.child("semicolon", asItIs, true),
    // not used
    as: "",
    unpivot: "",
  };
  docs.as;
  docs.unpivot;
  return concat([
    docs.leading_comments,
    group(
      concat([
        docs.self,
        indent(
          concat([softline, group(concat([docs.trailing_comments, docs.stmt]))])
        ),
        softline,
        docs.rparen,
        docs.pivot,
        docs.alias,
        docs.order,
        docs.comma,
        docs.semicolon,
      ])
    ),
    p.newLine(),
  ]);
};

const printGroupedType: PrintFunc = (path, options, print) => {
  type ThisNode = N.GroupedType;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print),
    self: p.self(),
    trailing_comments: printTrailingComments(path, options, print),
    type: p.child("type"),
    rparen: p.child("rparen"),
  };
  return concat([
    docs.leading_comments,
    docs.self,
    docs.trailing_comments,
    indent(concat([softline, docs.type])),
    softline,
    docs.rparen,
  ]);
};

const printGroupedTypeDeclarations: PrintFunc = (path, options, print) => {
  type ThisNode = N.GroupedTypeDeclarations;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print),
    self: p.self(),
    trailing_comments: printTrailingComments(path, options, print),
    declarations: p.child("declarations", (x) => group(x), false, line),
    rparen: p.child("rparen"),
  };
  return concat([
    docs.leading_comments,
    docs.self,
    docs.trailing_comments,
    indent(concat([softline, docs.declarations])),
    softline,
    docs.rparen,
  ]);
};

const printIdentifier: PrintFunc = (path, options, print) => {
  type ThisNode = N.Identifier;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print),
    self:
      node.callable && p.includedIn(globalFunctions)
        ? p.self("upper")
        : p.self(),
    trailing_comments: printTrailingComments(path, options, print),
    alias: printAlias(path as FastPathOf<ThisNode>, options, print),
    for_system_time_as_of: p.child("for_system_time_as_of", asItIs, true),
    pivot: printPivotOrUnpivotOperator(
      path as FastPathOf<ThisNode>,
      options,
      print
    ),
    tablesample: p.child("tablesample", asItIs, true),
    order: p.child("order", (x) => concat([" ", x]), true),
    comma: p.child("comma", asItIs, true),
    // not used
    unpivot: "",
    as: "",
  };
  docs.unpivot;
  docs.as;
  return concat([
    docs.leading_comments,
    docs.self,
    docs.trailing_comments,
    docs.alias,
    p.has("for_system_time_as_of")
      ? concat([" ", docs.for_system_time_as_of])
      : "",
    docs.pivot,
    p.has("tablesample") ? concat([" ", docs.tablesample]) : "",
    docs.order,
    docs.comma,
  ]);
};

const printInOperator: PrintFunc = (path, options, print) => {
  type ThisNode = N.InOperator;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    left: p.child("left"),
    not: p.child("not"),
    self: p.self("asItIs", true),
    trailing_comments: printTrailingComments(path, options, print),
    right: p.child("right", asItIs, true),
    alias: printAlias(path as FastPathOf<ThisNode>, options, print),
    order: p.child("order", (x) => concat([" ", x]), true),
    comma: p.child("comma", asItIs, true),
    // not used
    leading_comments: "",
    as: "",
  };
  docs.leading_comments;
  docs.as;
  return concat([
    docs.left,
    " ",
    p.has("not") ? concat([docs.not, " "]) : "",
    docs.self,
    docs.trailing_comments,
    " ",
    docs.right,
    docs.alias,
    docs.order,
    docs.comma,
  ]);
};

const printIntervalLiteral: PrintFunc = (path, options, print) => {
  type ThisNode = N.IntervalLiteral;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print),
    right: p.child("right", asItIs, true),
    date_part: p.child("date_part", asItIs, true),
    alias: printAlias(path as FastPathOf<ThisNode>, options, print),
    order: p.child("order", (x) => concat([" ", x]), true),
    comma: p.child("comma", asItIs, true),
    // not used
    as: "",
  };
  docs.as;
  return concat([
    docs.leading_comments,
    docs.self,
    docs.trailing_comments,
    " ",
    docs.right,
    " ",
    docs.date_part,
    docs.alias,
    docs.order,
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
  p.setNotRoot("expr");
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print),
    expr: p.hasLeadingComments("expr")
      ? indent(concat([line, p.child("expr")]))
      : concat([" ", p.child("expr", asItIs, true)]),
  };
  return concat([
    docs.leading_comments,
    group(concat([docs.self, docs.trailing_comments, docs.expr])),
  ]);
};

const printKeywordWithGroupedExprs: PrintFunc = (path, options, print) => {
  type ThisNode = N.KeywordWithGroupedExprs;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print),
    group: p.child("group", asItIs, true),
  };
  return concat([
    docs.leading_comments,
    group(concat([docs.self, docs.trailing_comments, " ", docs.group])),
  ]);
};

const printNullLiteral: PrintFunc = (path, options, print) => {
  type ThisNode = N.NullLiteral;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print),
    alias: printAlias(path as FastPathOf<ThisNode>, options, print),
    order: p.child("order", (x) => concat([" ", x]), true),
    comma: p.child("comma", asItIs, true),
    // not used
    as: "",
  };
  docs.as;
  return concat([
    docs.leading_comments,
    docs.self,
    docs.trailing_comments,
    docs.alias,
    docs.order,
    docs.comma,
  ]);
};

const printNumericLiteral: PrintFunc = (path, options, print) => {
  type ThisNode = N.NumericLiteral;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print),
    self: p.self("lower"), // in the case of `3.14e10`
    trailing_comments: printTrailingComments(path, options, print),
    alias: printAlias(path as FastPathOf<ThisNode>, options, print),
    order: p.child("order", (x) => concat([" ", x]), true),
    comma: p.child("comma", asItIs, true),
    // not used
    as: "",
  };
  docs.as;
  return concat([
    docs.leading_comments,
    docs.self,
    docs.trailing_comments,
    docs.alias,
    docs.order,
    docs.comma,
  ]);
};

const printOverClause: PrintFunc = (path, options, print) => {
  type ThisNode = N.OverClause;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    self: p.self("upper", true),
    trailing_comments: printTrailingComments(path, options, print),
    window: p.child("window", (x) => concat([" ", x]), true),
    // not used
    leading_comments: "",
  };
  docs.leading_comments;
  return concat([docs.self, docs.trailing_comments, docs.window]);
};

const printPivotConfig: PrintFunc = (path, options, print) => {
  type ThisNode = N.PivotConfig;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print),
    exprs: p.child("exprs", (x) => concat([x, line])),
    for: p.child("for"),
    in: p.child("in", asItIs, true),
    rparen: p.child("rparen"),
  };
  return concat([
    docs.leading_comments,
    docs.self,
    docs.trailing_comments,
    indent(concat([softline, docs.exprs, docs.for, " ", docs.in])),
    softline,
    docs.rparen,
  ]);
};

const printPivotOperator: PrintFunc = (path, options, print) => {
  type ThisNode = N.PivotOperator;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print),
    config: p.child("config", asItIs, true),
    as: p.child("as", asItIs, true),
    alias: p.child("alias", asItIs, true),
  };
  return concat([
    docs.leading_comments,
    docs.self,
    docs.trailing_comments,
    " ",
    docs.config,
    p.has("alias") ? concat([" ", docs.as || "AS"]) : "",
    p.has("alias") ? concat([" ", docs.alias]) : "",
  ]);
};

const printSelectStatement: PrintFunc = (path, options, print) => {
  type ThisNode = N.SelectStatement;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, print, node, node.children);
  p.setNotRoot("exprs");
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    with: p.child("with"),
    leading_comments: printLeadingComments(path, options, print),
    // SELECT clause
    self: p.self("upper"),
    as_struct_or_value: p.child("as_struct_or_value", asItIs, true, " "),
    distinct_or_all: p.child("distinct_or_all"),
    trailing_comments: printTrailingComments(path, options, print),
    exprs: p.child("exprs", (x) => concat([line, group(x)])),
    // FROM clause
    from: p.child("from"),
    // WHERE clause
    where: p.child("where"),
    // ORDER BY clause
    orderby: p.child("orderby"),
    semicolon: p.child("semicolon", asItIs, true),
  };
  const select = concat([
    docs.self,
    p.has("as_struct_or_value") ? " " : "",
    docs.as_struct_or_value,
    p.has("distinct_or_all") ? " " : "",
    docs.distinct_or_all,
    indent(docs.exprs),
  ]);
  return concat([
    docs.leading_comments,
    group(
      concat([
        // WITH clause
        docs.with,
        p.has("with") ? line : "",
        // SELECT clause
        docs.trailing_comments,
        p.len("exprs") === 1 ? group(select) : select,
        // FROM clause
        p.has("from") ? line : "",
        docs.from,
        // WHERE clause
        p.has("where") ? line : "",
        docs.where,
        // ORDER BY clause
        p.has("orderby") ? line : "",
        docs.orderby,
        p.has("semicolon") ? concat([softline, docs.semicolon]) : "",
      ])
    ),
    p.newLine(),
  ]);
};

const printSetOperator: PrintFunc = (path, options, print) => {
  type ThisNode = N.SetOperator;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, print, node, node.children);
  p.setNotRoot("left");
  p.setNotRoot("right");
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    left: p.child("left"),
    leading_comments: printLeadingComments(path, options, print),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print),
    distinct_or_all: p.child("distinct_or_all", asItIs, true),
    right: p.child("right"),
    semicolon: p.child("semicolon", asItIs, true),
  };
  const res = concat([
    docs.left,
    line,
    docs.leading_comments,
    docs.self,
    docs.trailing_comments,
    " ",
    docs.distinct_or_all,
    line,
    docs.right,
    p.has("semicolon") ? softline : "",
    docs.semicolon,
    p.newLine(),
  ]);
  if (node.notRoot) {
    return res;
  } else {
    return group(res);
  }
};

const printStringLiteral: PrintFunc = (path, options, print) => {
  type ThisNode = N.StringLiteral;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print),
    self: p.self(),
    trailing_comments: printTrailingComments(path, options, print),
    alias: printAlias(path as FastPathOf<ThisNode>, options, print),
    order: p.child("order", (x) => concat([" ", x]), true),
    comma: p.child("comma", asItIs, true),
    // not used
    as: "",
  };
  docs.as;
  return concat([
    docs.leading_comments,
    docs.self,
    docs.trailing_comments,
    docs.alias,
    docs.order,
    docs.comma,
  ]);
};

const printStructLiteral: PrintFunc = (path, options, print) => {
  type ThisNode = N.StructLiteral;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    type: p.child("type"),
    leading_comments: p.has("type")
      ? ""
      : printLeadingComments(path, options, print),
    self: p.has("type") ? p.self("asItIs", true) : p.self(),
    trailing_comments: printTrailingComments(path, options, print),
    exprs: p.child("exprs", (x) => group(x), false, line),
    rparen: p.child("rparen"),
    alias: printAlias(path as FastPathOf<ThisNode>, options, print),
    order: p.child("order", (x) => concat([" ", x]), true),
    comma: p.child("comma", asItIs, true),
    // not used
    as: "",
  };
  docs.as;
  return concat([
    docs.type,
    docs.leading_comments,
    docs.self,
    docs.trailing_comments,
    indent(concat([softline, docs.exprs])),
    softline,
    docs.rparen,
    docs.alias,
    docs.order,
    docs.comma,
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

const printTableSampleClause: PrintFunc = (path, options, print) => {
  type ThisNode = N.TableSampleClause;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print),
    self: p.self("upper"),
    system: p.child("system", asItIs, true),
    trailing_comments: printTrailingComments(path, options, print),
    group: p.child("group", asItIs, true),
  };
  return concat([
    docs.leading_comments,
    docs.self,
    docs.trailing_comments,
    " ",
    docs.system,
    " ",
    docs.group,
  ]);
};

const printTableSampleRatio: PrintFunc = (path, options, print) => {
  type ThisNode = N.TableSampleRatio;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print),
    self: p.self("upper"),
    expr: p.child("expr", asItIs, true),
    trailing_comments: printTrailingComments(path, options, print),
    percent: p.child("percent", asItIs, true),
    rparen: p.child("rparen", asItIs, true),
  };
  return concat([
    docs.leading_comments,
    docs.self,
    docs.trailing_comments,
    docs.expr,
    " ",
    docs.percent,
    docs.rparen,
  ]);
};

const printType: PrintFunc = (path, options, print) => {
  type ThisNode = N.Type;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print),
    type_declaration: p.child("type_declaration", asItIs, true),
  };
  return concat([
    docs.leading_comments,
    docs.self,
    docs.trailing_comments,
    docs.type_declaration,
  ]);
};

const printTypeDeclaration: PrintFunc = (path, options, print) => {
  type ThisNode = N.TypeDeclaration;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print),
    self: p.self(),
    trailing_comments: printTrailingComments(path, options, print),
    type: p.child("type", asItIs, true),
    comma: p.child("comma", asItIs, true),
  };
  return concat([
    docs.leading_comments,
    docs.self,
    node.token ? " " : "",
    docs.trailing_comments,
    docs.type,
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
    right: p.child("right", asItIs, true),
    alias: printAlias(path as FastPathOf<ThisNode>, options, print),
    order: p.child("order", (x) => concat([" ", x]), true),
    comma: p.child("comma", asItIs, true),
    // not used
    as: "",
  };
  docs.as;
  return concat([
    docs.leading_comments,
    docs.self,
    docs.trailing_comments,
    p.includedIn(noSpaceOperators) ? "" : " ",
    docs.right,
    docs.alias,
    docs.order,
    docs.comma,
  ]);
};

const printUnpivotConfig: PrintFunc = (path, options, print) => {
  type ThisNode = N.UnpivotConfig;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print),
    expr: p.child("expr"),
    for: p.child("for"),
    in: p.child("in", asItIs, true),
    rparen: p.child("rparen"),
  };
  return concat([
    docs.leading_comments,
    docs.self,
    docs.trailing_comments,
    indent(concat([softline, docs.expr, line, docs.for, " ", docs.in])),
    softline,
    docs.rparen,
  ]);
};

const printUnpivotOperator: PrintFunc = (path, options, print) => {
  type ThisNode = N.UnpivotOperator;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print),
    self: p.self("upper"),
    include_or_exclude_nulls: p.child("include_or_exclude_nulls", (x) =>
      group(concat([line, x]))
    ),
    trailing_comments: printTrailingComments(path, options, print),
    config: p.child("config", asItIs, true),
    as: p.child("as", asItIs, true),
    alias: p.child("alias", asItIs, true),
  };
  docs.as;
  return concat([
    docs.leading_comments,
    docs.self,
    docs.include_or_exclude_nulls,
    docs.trailing_comments,
    " ",
    docs.config,
    p.has("alias") ? concat([" ", docs.as || "AS"]) : "",
    p.has("alias") ? concat([" ", docs.alias]) : "",
  ]);
};

const printWindowFrameClause: PrintFunc = (path, options, print) => {
  type ThisNode = N.WindowFrameClause;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print),
    between: p.child("between", asItIs, true),
    start: p.child("start", asItIs, false, line),
    and: p.child("and"),
    end: p.child("end", asItIs, true, line),
  };
  docs.leading_comments;
  return concat([
    docs.leading_comments,
    docs.self,
    docs.trailing_comments,
    p.has("between") ? concat([" ", docs.between]) : "",
    indent(
      concat([
        line,
        group(docs.start),
        p.has("and")
          ? concat([line, group(concat([docs.and, " ", group(docs.end)]))])
          : "",
      ])
    ),
  ]);
};

const printWindowSpecification: PrintFunc = (path, options, print) => {
  type ThisNode = N.WindowSpecification;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    self: p.self("upper", true),
    trailing_comments: printTrailingComments(path, options, print),
    partitionby: p.child("partitionby", (x) => group(x)),
    orderby: p.child("orderby", (x) => group(x)),
    frame: p.child("frame", (x) => group(x)),
    rparen: p.child("rparen", asItIs),
    // not used
    leading_comments: "",
  };
  docs.leading_comments;
  return concat([
    docs.self,
    docs.trailing_comments,
    indent(
      concat([
        softline,
        join(
          line,
          [docs.partitionby, docs.orderby, docs.frame].filter((x) => x)
        ),
      ])
    ),
    softline,
    docs.rparen,
  ]);
};

const printWithClause: PrintFunc = (path, options, print) => {
  type ThisNode = N.WithClause;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print),
    queries:
      p.len("queries") === 1 && !p.hasLeadingComments("queries")
        ? concat([" ", p.child("queries", asItIs)])
        : indent(concat([line, p.child("queries", asItIs, false, line)])),
  };
  return concat([
    docs.leading_comments,
    docs.self,
    docs.trailing_comments,
    docs.queries,
  ]);
};

const printWithQuery: PrintFunc = (path, options, print) => {
  type ThisNode = N.WithQuery;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, print, node, node.children);
  p.setNotRoot("stmt");
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print),
    as: p.child("as", asItIs, true),
    stmt: p.child("stmt", asItIs, true),
    comma: p.child("comma", asItIs, true),
  };
  return concat([
    docs.leading_comments,
    docs.self,
    docs.trailing_comments,
    " ",
    docs.as,
    " ",
    docs.stmt,
    docs.comma,
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
    by: p.child("by", asItIs, true),
    exprs: p.child("exprs", (x) => concat([line, x])),
  };
  return concat([
    docs.leading_comments,
    docs.self,
    docs.trailing_comments,
    " ",
    docs.by,
    indent(docs.exprs),
  ]);
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
    return "";
  }
  if (p.has("as")) {
    as_ = p.child("as", asItIs, true);
  } else {
    as_ = "AS";
  }
  return concat([" ", as_, " ", p.child("alias", asItIs, true)]);
};

const printLeadingComments: PrintFunc = (path, _, print) => {
  type ThisNode = N.BaseNode;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, print, node, node.children);
  return p.child("leading_comments", (x) => concat([x, hardline]));
};

const printPivotOrUnpivotOperator = (
  path: FastPathOf<N.FromItemExpr>,
  _: Options,
  print: (path: FastPath) => Doc
): Doc => {
  type ThisNode = N.FromItemExpr;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, print, node, node.children);
  const pivot = p.has("pivot")
    ? concat([" ", p.child("pivot", asItIs, true)])
    : "";
  const unpivot = p.has("unpivot")
    ? concat([" ", p.child("unpivot", asItIs, true)])
    : "";
  return concat([pivot, unpivot]);
};

const printTrailingComments: PrintFunc = (path, _, print) => {
  type ThisNode = N.BaseNode;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, print, node, node.children);
  return lineSuffix(p.child("trailing_comments", (x) => concat([" ", x])));
};
