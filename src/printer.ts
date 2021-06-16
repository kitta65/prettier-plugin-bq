import { reservedKeywords, globalFunctions } from "./keywords";
import { doc } from "prettier";
import type { Doc, AstPath } from "prettier";
import * as N from "./nodes";

const {
  builders: {
    group,
    hardline,
    ifBreak,
    indent,
    join,
    line,
    lineSuffix,
    softline,
  },
} = doc;

type PrintFunc = (
  path: AstPath,
  options: Options,
  print: (path: AstPath) => Doc
) => Doc;

// used with type assertion
type AstPathOf<_ extends N.BaseNode> = AstPath & {
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
    private readonly path: AstPath,
    private readonly options: Options,
    private readonly print: (path: AstPath) => Doc,
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
    if (N.isNodeChild(child)) {
      if (typeof transform === "function") {
        f = transform;
      }
      let comments: Doc = "";
      if (consumeLeadingComments) {
        comments = this.consumeLeadingCommentsOfX(
          key as N.NodeKeyof<N.Children<T>>
        );
      }
      return [
        comments,
        this.path.call(
          (p) => p.call((p) => f(p.call(this.print, "Node")), key),
          "children"
        ),
      ];
    } else if (N.isNodeVecChild(child)) {
      if (typeof transform === "function") {
        f = transform;
      }
      let comments: Doc = "";
      if (consumeLeadingComments) {
        comments = this.consumeLeadingCommentsOfX(key);
      }
      return [
        comments,
        this.path.call(
          (p) =>
            p.call(
              (p) => join(sep || "", p.map(this.print, "NodeVec").map(f)),
              key
            ),
          "children"
        ),
      ];
    }
    // in the case of `child` is undefined
    return "";
  }
  consumeLeadingCommentsOfSelf() {
    const leading_comments = this.children["leading_comments"];
    if (leading_comments) {
      const res = leading_comments.NodeVec.map((x) =>
        lineSuffix([" ", x.token.literal])
      );
      delete this.children.leading_comments;
      return res;
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
        lineSuffix([" ", x.token.literal])
      );
      delete firstNode.children.leading_comments;
      return res;
    } else {
      return "";
    }
  }
  getFirstNode(key: keyof N.Children<T>) {
    const child = this.children[key];
    let firstNode;
    if (N.isNodeChild(child)) {
      firstNode = getFirstNode(child.Node);
    } else if (N.isNodeVecChild(child)) {
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
    if (N.isNodeVecChild(nodeVec)) {
      return nodeVec.NodeVec.length;
    }
    return 0;
  }
  newLine() {
    if (this.node.notRoot) return "";
    if (this.node.emptyLines && 0 < this.node.emptyLines) {
      return [hardline, hardline];
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
    if (upperOrLower === "lower") {
      literal = literal.toLowerCase();
    } else if (this.options.printKeywordsInUpperCase) {
      if (upperOrLower === "upper") {
        literal = literal.toUpperCase();
      } else if (!this.node.notGlobal && this.includedIn(reservedKeywords)) {
        literal = literal.toUpperCase();
      } else if (
        this.options.printPseudoColumnsInUpperCase &&
        (literal.match(/^_PARTITION/i) ||
          literal.match(/^_TABLE_/i) ||
          literal.match(/^_FILE_/i) ||
          literal.match(/^_RAW_TIMESTAMP/i))
      ) {
        /**
         * NOTE
         * Field names are not allowed to start with the (case-insensitive) prefixes _PARTITION, _TABLE_, _FILE_ and _ROW_TIMESTAMP.
         * On the other hand, you can create a table named `_partitiondate` (that may cause an error).
         */
        literal = literal.toUpperCase();
      }
    }
    let comments: Doc = "";
    if (consumeLeadingComments) {
      comments = this.consumeLeadingCommentsOfSelf();
    }
    return [comments, literal];
  }
  setBreakRecommended(key: N.NodeKeyof<N.Children<T>>) {
    const child = this.children[key];
    if (N.isNodeChild(child)) {
      child.Node.breakRecommended = true;
    }
  }
  setCallable(key: N.NodeKeyof<N.Children<T>>) {
    const child = this.children[key];
    if (N.isNodeChild(child)) {
      child.Node.callable = true;
    }
  }
  setLiteral(key: N.NodeKeyof<N.Children<T>>, literal: string) {
    const child = this.children[key];
    if (N.isNodeChild(child)) {
      const token = child.Node.token;
      if (token) {
        token.literal = literal;
      }
    }
  }
  setNotRoot(key: keyof N.Children<T>) {
    const child = this.children[key];
    if (N.isNodeChild(child)) {
      child.Node.notRoot = true;
    } else if (N.isNodeVecChild(child)) {
      child.NodeVec.forEach((x) => {
        x.notRoot = true;
      });
    }
  }
  setNoGlobal(key: N.NodeKeyof<N.Children<T>>) {
    const child = this.children[key];
    if (N.isNodeChild(child)) {
      child.Node.notGlobal = true;
    }
  }
  toUpper(key: keyof N.Children<T>) {
    const child = this.children[key];
    if (N.isNodeChild(child)) {
      const token = child.Node.token;
      if (token) {
        token.literal = token.literal.toUpperCase();
      }
    } else if (N.isNodeVecChild(child)) {
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
    if (N.isNodeChild(v)) {
      candidates.push(getFirstNode(v.Node));
    } else if (N.isNodeVecChild(v)) {
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
    return path.map(print);
  }
  switch (node.node_type) {
    case "AddColumnClause":
      return printAddColumnClause(path, options, print);
    case "AlterColumnStatement":
      return printAlterColumnStatement(path, options, print);
    case "AlterSchemaStatement":
      return printAlterSchemaStatement(path, options, print);
    case "AlterTableStatement":
      return printAlterTableStatement(path, options, print);
    case "AlterViewStatement":
      return printAlterViewStatement(path, options, print);
    case "ArrayAccessing":
      return printArrayAccessing(path, options, print);
    case "ArrayLiteral":
      return printArrayLiteral(path, options, print);
    case "AssertStatement":
      return printAssertStatement(path, options, print);
    case "Asterisk":
      return printAsterisk(path, options, print);
    case "BeginStatement":
      return printBeginStatement(path, options, print);
    case "BetweenOperator":
      return printBetweenOperator(path, options, print);
    case "BooleanLiteral":
      return printBooleanLiteral(path, options, print);
    case "BinaryOperator":
      return printBinaryOperator(path, options, print);
    case "CallingFunction":
      return printCallingFunction(
        path as AstPathOf<N.CallingFunction>,
        options,
        print
      );
    case "CallingDatePartFunction":
      return printCallingDatePartFunction(path, options, print);
    case "CallingUnnest":
      return printCallingUnnest(path, options, print);
    case "CallStatement":
      return printCallStatement(path, options, print);
    case "CaseArm":
      return printCaseArm(path, options, print);
    case "CaseExpr":
      return printCaseExpr(path, options, print);
    case "CastArgument":
      return printCastArgument(path, options, print);
    case "Comment":
      return printComment(path, options, print);
    case "CreateFunctionStatement":
      return printCreateFunctionStatement(path, options, print);
    case "CreateProcedureStatement":
      return printCreateProcedureStatement(path, options, print);
    case "CreateSchemaStatement":
      return printCreateSchemaStatement(path, options, print);
    case "CreateTableStatement":
      return printCreateTableStatement(path, options, print);
    case "CreateViewStatement":
      return printCreateViewStatement(path, options, print);
    case "DeclareStatement":
      return printDeclareStatement(path, options, print);
    case "DotOperator":
      return printDotOperator(path, options, print);
    case "DropColumnClause":
      return printDropColumnClause(path, options, print);
    case "DropStatement":
      return printDropStatement(path, options, print);
    case "ElseIfClause":
      return printElseIfClause(path, options, print);
    case "EOF":
      return printEOF(path, options, print);
    case "ExecuteStatement":
      return printExecuteStatement(path, options, print);
    case "ExportStatement":
      return printExportStatement(path, options, print);
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
    case "IfStatement":
      return printIfStatement(path, options, print);
    case "InOperator":
      return printInOperator(path, options, print);
    case "IntervalLiteral":
      return printIntervalLiteral(path, options, print);
    case "JoinOperator":
      return printJoinOperator(path, options, print);
    case "Keyword":
      return printKeyword(path, options, print);
    case "KeywordWithExpr":
      return printKeywordWithExpr(
        path as AstPathOf<N.KeywordWithExpr>,
        options,
        print
      );
    case "KeywordWithExprs":
      return printKeywordWithExprs(path, options, print);
    case "KeywordWithGroupedExpr":
      return printKeywordWithGroupedExpr(path, options, print);
    case "KeywordWithGroupedExprs":
      return printKeywordWithGroupedExprs(path, options, print);
    case "KeywordWithStatement":
      return printKeywordWithStatement(path, options, print);
    case "KeywordWithStatements":
      return printKeywordWithStatements(path, options, print);
    case "KeywordWithType":
      return printKeywordWithType(path, options, print);
    case "LanguageSpecifier":
      return printLanguageSpecifier(path, options, print);
    case "LimitClause":
      return printLimitClause(path, options, print);
    case "LoopStatement":
      return printLoopStatement(path, options, print);
    case "NullLiteral":
      return printNullLiteral(path, options, print);
    case "NumericLiteral":
      return printNumericLiteral(path, options, print);
    case "OverClause":
      return printOverClause(path, options, print);
    case "Parameter":
      return printIdentifier(path, options, print);
    case "PivotConfig":
      return printPivotConfig(path, options, print);
    case "PivotOperator":
      return printPivotOperator(path, options, print);
    case "RaiseStatement":
      return printRaiseStatement(path, options, print);
    case "SelectStatement":
      return printSelectStatement(path, options, print);
    case "SetOperator":
      return printSetOperator(path, options, print);
    case "SetStatement":
      return printSetStatement(path, options, print);
    case "SingleTokenStatement":
      return printSingleTokenStatement(path, options, print);
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
    case "WhileStatement":
      return printWhileStatement(path, options, print);
    case "WindowClause":
      return printWindowClause(path, options, print);
    case "WindowExpr":
      return printWindowExpr(path, options, print);
    case "WindowFrameClause":
      return printWindowFrameClause(path, options, print);
    case "WindowSpecification":
      return printWindowSpecification(path, options, print);
    case "WithClause":
      return printWithClause(path, options, print);
    case "WithPartitionColumnsClause":
      return printWithPartitionColumnsClause(path, options, print);
    case "WithQuery":
      return printWithQuery(path, options, print);
    case "XXXByExprs":
      return printXXXByExprs(path, options, print);
    default:
      return "not implemented";
  }
};

const printAddColumnClause: PrintFunc = (path, options, print) => {
  type ThisNode = N.AddColumnClause;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print),
    column: p.child("column", asItIs, true),
    if_not_exists: p.child("if_not_exists", (x) => group([line, x])),
    type_declaration: p.child("type_declaration"),
    comma: p.child("comma", asItIs, true),
  };
  return [
    docs.leading_comments,
    group([
      docs.self,
      docs.trailing_comments,
      " ",
      docs.column,
      docs.if_not_exists,
      " ",
      docs.type_declaration,
      docs.comma,
    ]),
  ];
};

const printAlterColumnStatement: PrintFunc = (path, options, print) => {
  type ThisNode = N.AlterColumnStatement;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print),
    what: p.child("what", asItIs, true),
    if_exists: p.child("if_exists", (x) => group([line, x])),
    ident: p.child("ident", asItIs, true),
    drop_not_null: p.child("drop_not_null", (x) => group([line, x])),
  };
  return [
    docs.leading_comments,
    group([
      docs.self,
      docs.trailing_comments,
      " ",
      docs.what,
      docs.if_exists,
      " ",
      docs.ident,
      docs.drop_not_null,
    ]),
  ];
};

const printAlterSchemaStatement: PrintFunc = (path, options, print) => {
  type ThisNode = N.AlterSchemaStatement;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print),
    what: p.child("what", asItIs, true),
    if_exists: p.child("if_exists", (x) => group([line, x])),
    ident: p.child("ident", asItIs, true),
    set: p.child("set"),
    options: p.child("options", asItIs, true),
    semicolon: p.child("semicolon"),
  };
  return [
    docs.leading_comments,
    group([
      docs.self,
      docs.trailing_comments,
      " ",
      docs.what,
      docs.if_exists,
      p.has("ident") ? " " : "",
      docs.ident,
      line,
      docs.set,
      " ",
      docs.options,
      softline,
      docs.semicolon,
    ]),
    p.newLine(),
  ];
};

const printAlterTableStatement: PrintFunc = (path, options, print) => {
  type ThisNode = N.AlterTableStatement;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print),
    what: p.child("what", asItIs, true),
    if_exists: p.child("if_exists", (x) => group([line, x])),
    ident: p.child("ident", asItIs, true),
    // SET
    set: p.child("set"),
    options: p.child("options", asItIs, true),
    // ADD COLUMNS
    add_columns: p.child("add_columns", (x) => [line, x]),
    // DROP COLUMNS
    drop_columns: p.child("drop_columns", (x) => [line, x]),
    // ALTER COLUMN satatement
    alter_column_stmt: p.child("alter_column_stmt"),
    semicolon: p.child("semicolon"),
  };
  return [
    docs.leading_comments,
    group([
      docs.self,
      docs.trailing_comments,
      " ",
      docs.what,
      docs.if_exists,
      p.has("ident") ? " " : "",
      docs.ident,
      p.has("set") ? line : "",
      docs.set,
      p.has("set") ? " " : "",
      docs.options,
      docs.add_columns,
      docs.drop_columns,
      p.has("alter_column_stmt") ? hardline : "",
      docs.alter_column_stmt,
      softline,
      docs.semicolon,
    ]),
    p.newLine(),
  ];
};

const printAlterViewStatement: PrintFunc = (path, options, print) => {
  type ThisNode = N.AlterViewStatement;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print),
    materialized: p.child("materialized", asItIs, true),
    what: p.child("what", asItIs, true),
    if_exists: p.child("if_exists", (x) => group([line, x])),
    ident: p.child("ident", asItIs, true),
    set: p.child("set"),
    options: p.child("options", asItIs, true),
    semicolon: p.child("semicolon"),
  };
  return [
    docs.leading_comments,
    group([
      docs.self,
      docs.trailing_comments,
      p.has("materialized") ? " " : "",
      docs.materialized,
      " ",
      docs.what,
      docs.if_exists,
      p.has("ident") ? " " : "",
      docs.ident,
      line,
      docs.set,
      " ",
      docs.options,
      softline,
      docs.semicolon,
    ]),
    p.newLine(),
  ];
};

const printAsterisk: PrintFunc = (path, options, print) => {
  type ThisNode = N.Asterisk;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print),
    self: p.self(),
    trailing_comments: printTrailingComments(path, options, print),
    except: p.child("except", (x) => [" ", x], true),
    replace: p.child("replace", (x) => [" ", x], true),
    alias: printAlias(path as AstPathOf<ThisNode>, options, print),
    comma: p.child("comma", asItIs, true),
    // not used
    as: "",
  };
  docs.as;
  return [
    docs.leading_comments,
    docs.self,
    docs.trailing_comments,
    docs.except,
    docs.replace,
    docs.alias,
    docs.comma,
  ];
};

const printArrayAccessing: PrintFunc = (path, options, print) => {
  type ThisNode = N.ArrayAccessing;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    left: p.child("left"),
    self: p.self("asItIs", true),
    trailing_comments: printTrailingComments(path, options, print),
    right: p.child("right"),
    rparen: p.child("rparen"),
    alias: printAlias(path as AstPathOf<ThisNode>, options, print),
    order: printOrder(path as AstPathOf<ThisNode>, options, print),
    comma: p.child("comma", asItIs, true),
    // not used
    leading_comments: "",
    as: "",
    null_order: "",
  };
  docs.leading_comments;
  docs.as;
  docs.null_order;
  return [
    docs.left,
    docs.self,
    docs.trailing_comments,
    indent([softline, docs.right]),
    softline,
    docs.rparen,
    docs.alias,
    docs.order,
    docs.comma,
  ];
};

const printArrayLiteral: PrintFunc = (path, options, print) => {
  type ThisNode = N.ArrayLiteral;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    type: p.child("type"),
    leading_comments: p.has("type")
      ? ""
      : printLeadingComments(path, options, print),
    self: p.has("type") ? p.self("asItIs", true) : p.self(),
    trailing_comments: printTrailingComments(path, options, print),
    exprs: p.child("exprs", (x) => group(x), false, line),
    rparen: p.child("rparen"),
    alias: printAlias(path as AstPathOf<ThisNode>, options, print),
    order: printOrder(path as AstPathOf<ThisNode>, options, print),
    comma: p.child("comma", asItIs, true),
    // not used
    as: "",
    null_order: "",
  };
  docs.as;
  docs.null_order;
  return [
    docs.type,
    docs.leading_comments,
    docs.self,
    docs.trailing_comments,
    indent([softline, docs.exprs]),
    softline,
    docs.rparen,
    docs.alias,
    docs.order,
    docs.comma,
  ];
};

const printAssertStatement: PrintFunc = (path, options, print) => {
  type ThisNode = N.AssertStatement;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print),
    // TODO define as function
    expr:
      !p.hasLeadingComments("expr") &&
      ["GroupedExpr", "GroupedStatement", "CallingFunction"].includes(
        node.children.expr.Node.node_type
      )
        ? [" ", p.child("expr", asItIs, true)]
        : indent([line, p.child("expr")]),
    as: p.child("as"),
    description: p.child("description", asItIs, true),
    semicolon: p.child("semicolon"),
  };
  return [
    docs.leading_comments,
    group([
      docs.self,
      docs.trailing_comments,
      docs.expr,
      p.has("as") ? line : "",
      docs.as,
      p.has("description") ? " " : "",
      docs.description,
      softline,
      docs.semicolon,
    ]),
    p.newLine(),
  ];
};

const printBeginStatement: PrintFunc = (path, options, print) => {
  type ThisNode = N.BeginStataement;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, options, print, node, node.children);
  p.setNotRoot("stmts");
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print),
    stmts:
      p.len("stmts") <= 1
        ? p.child("stmts", (x) => [line, x])
        : p.child("stmts", (x) => [hardline, x]),
    exception_when_error: group(
      p.child("exception_when_error", asItIs, false, line)
    ),
    then: p.child("then", asItIs, true),
    end: p.child("end"),
    semicolon: p.child("semicolon"),
  };
  return [
    docs.leading_comments,
    group([
      docs.self,
      docs.trailing_comments,
      indent(docs.stmts),
      p.has("exception_when_error") ? hardline : "",
      docs.exception_when_error,
      p.has("then") ? " " : "",
      docs.then,
      line,
      docs.end,
      softline,
      docs.semicolon,
    ]),
    p.newLine(),
  ];
};

const printBetweenOperator: PrintFunc = (path, options, print) => {
  type ThisNode = N.BetweenOperator;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    left: p.child("left"),
    not: p.child("not", asItIs, true),
    self: p.self("upper", true),
    trailing_comments: printTrailingComments(path, options, print),
    right_min: p.child("right_min"),
    and: p.child("and"),
    right_max: p.child("right_max", asItIs, true),
    alias: printAlias(path as AstPathOf<ThisNode>, options, print),
    order: printOrder(path as AstPathOf<ThisNode>, options, print),
    comma: p.child("comma", asItIs, true),
    // not used
    leading_comments: "",
    as: "",
    null_order: "",
  };
  docs.leading_comments;
  docs.as;
  docs.null_order;
  return [
    docs.left,
    " ",
    p.has("not") ? [docs.not, " "] : "",
    docs.self,
    docs.trailing_comments,
    indent([
      line,
      group(docs.right_min),
      line,
      group([docs.and, " ", docs.right_max]),
      docs.alias,
      docs.order,
      docs.comma,
    ]),
  ];
};

const printBooleanLiteral: PrintFunc = (path, options, print) => {
  type ThisNode = N.BooleanLiteral;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print),
    self: p.self(),
    trailing_comments: printTrailingComments(path, options, print),
    alias: printAlias(path as AstPathOf<ThisNode>, options, print),
    order: printOrder(path as AstPathOf<ThisNode>, options, print),
    comma: p.child("comma", asItIs, true),
    // not used
    as: "",
    null_order: "",
  };
  docs.as;
  docs.null_order;
  return [
    docs.leading_comments,
    docs.self,
    docs.trailing_comments,
    docs.alias,
    docs.order,
    docs.comma,
  ];
};

const printBinaryOperator: PrintFunc = (path, options, print) => {
  type ThisNode = N.BinaryOperator;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, options, print, node, node.children);
  p.setNotRoot("right");
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    left: p.child("left"),
    not: p.child("not", asItIs, true),
    self: p.self("upper", true),
    trailing_comments: printTrailingComments(path, options, print),
    right: p.child("right", asItIs, true),
    alias: printAlias(path as AstPathOf<ThisNode>, options, print),
    order: printOrder(path as AstPathOf<ThisNode>, options, print),
    comma: p.child("comma", asItIs, true),
    // not used
    leading_comments: "",
    as: "",
    null_order: "",
  };
  docs.leading_comments;
  docs.as;
  docs.null_order;
  return [
    docs.left,
    p.includedIn(["AND", "OR"])
      ? node.breakRecommended
        ? hardline
        : line
      : " ",
    p.has("not") && !p.includedIn(["IS"]) ? [docs.not, " "] : "",
    docs.self,
    p.has("not") && p.includedIn(["IS"]) ? [" ", docs.not] : "",
    " ",
    docs.trailing_comments,
    docs.right,
    docs.alias,
    docs.order,
    docs.comma,
  ];
};

const printCallingFunction = (
  path: AstPathOf<N.CallingFunction>,
  options: Options,
  print: (path: AstPath) => Doc
) => {
  type ThisNode = N.CallingFunction;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, options, print, node, node.children);
  p.setCallable("func");
  p.setNotRoot("args");
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    func: p.child("func"),
    self: p.self("asItIs", true),
    trailing_comments: printTrailingComments(path, options, print),
    distinct: p.child("distinct", (x) => [x, line]),
    args: p.child("args", (x) => group(x), false, line),
    ignore_nulls: p.child("ignore_nulls", asItIs, false, " "),
    orderby: p.child("orderby"),
    limit: p.child("limit"),
    rparen: p.child("rparen"),
    over: p.child("over", (x) => [" ", x], true),
    alias: printAlias(path as AstPathOf<ThisNode>, options, print),
    order: printOrder(path as AstPathOf<ThisNode>, options, print),
    comma: p.child("comma", asItIs, true),
    // not used
    leading_comments: "",
    as: "",
    null_order: "",
  };
  docs.leading_comments;
  docs.as;
  docs.null_order;
  return [
    // func often has leading_comments, so it is placed out of group
    docs.func,
    group([
      docs.self,
      docs.trailing_comments,
      indent([
        p.has("args") ? softline : "",
        docs.distinct,
        docs.args,
        p.has("ignore_nulls") ? line : "",
        group(docs.ignore_nulls),
        p.has("orderby") ? line : "",
        group(docs.orderby),
        p.has("limit") ? line : "",
        group(docs.limit),
      ]),
      p.has("args") ? softline : "",
      docs.rparen,
    ]),
    docs.over,
    docs.alias,
    docs.order,
    docs.comma,
  ];
};

const printCallingUnnest: PrintFunc = (path, options, print) => {
  type ThisNode = N.CallingUnnest;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    func: printCallingFunction(path as AstPathOf<ThisNode>, options, print),
    with_offset: p.child("with_offset", (x) => group([line, x])),
    offset_as: p.child("offset_as", asItIs, true),
    offset_alias: p.child("offset_alias", asItIs, true),
    pivot: printPivotOrUnpivotOperator(
      path as AstPathOf<ThisNode>,
      options,
      print
    ),
    // not used
    leading_comments: "",
    self: "",
    trailing_comments: "",
    args: "",
    rparen: "",
    alias: "",
    as: "",
    unpivot: "",
  };
  docs.leading_comments;
  docs.self;
  docs.trailing_comments;
  docs.args;
  docs.rparen;
  docs.alias;
  docs.as;
  docs.unpivot;
  return [
    docs.func,
    docs.with_offset,
    p.has("offset_alias") ? [" ", docs.offset_as || "AS"] : "",
    p.has("offset_alias") ? [" ", docs.offset_alias] : "",
    docs.pivot,
  ];
};

const printCallingDatePartFunction: PrintFunc = (path, options, print) => {
  type ThisNode = N.CallingDatePartFunction;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, options, print, node, node.children);
  p.toUpper("func");
  p.toUpper("args");
  return printCallingFunction(path as AstPathOf<ThisNode>, options, print);
};

const printCallStatement: PrintFunc = (path, options, print) => {
  type ThisNode = N.CallStatement;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print),
    self: p.self(),
    trailing_comments: printTrailingComments(path, options, print),
    procedure: p.child("procedure", asItIs, true),
    semicolon: p.child("semicolon"),
  };
  return [
    docs.leading_comments,
    group([
      docs.self,
      docs.trailing_comments,
      " ",
      docs.procedure,
      softline,
      docs.semicolon,
    ]),
    p.newLine(),
  ];
};

const printCaseArm: PrintFunc = (path, options, print) => {
  type ThisNode = N.CaseArm;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print),
    self: p.self(),
    trailing_comments: printTrailingComments(path, options, print),
    expr: p.child("expr", asItIs, true),
    then: p.child("then", asItIs),
    result: p.child("result"),
  };
  return [
    docs.leading_comments,
    docs.self,
    docs.trailing_comments,
    " ",
    docs.expr,
    indent([
      p.has("expr") ? line : "",
      group([docs.then, p.has("then") ? " " : "", docs.result]),
    ]),
  ];
};

const printCaseExpr: PrintFunc = (path, options, print) => {
  type ThisNode = N.CaseExpr;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print),
    self: p.self(),
    trailing_comments: printTrailingComments(path, options, print),
    expr: p.child("expr", asItIs, true),
    arms: p.child("arms", (x) => group(x), false, line),
    end: p.child("end", asItIs, true),
    alias: printAlias(path as AstPathOf<ThisNode>, options, print),
    order: printOrder(path as AstPathOf<ThisNode>, options, print),
    comma: p.child("comma", asItIs, true),
    // not used
    as: "",
    null_order: "",
  };
  docs.as;
  docs.null_order;
  return [
    docs.leading_comments,
    docs.self,
    docs.trailing_comments,
    " ",
    docs.expr,
    indent([p.has("expr") ? line : "", docs.arms]),
    " ",
    docs.end,
    docs.alias,
    docs.order,
    docs.comma,
  ];
};

const printCastArgument: PrintFunc = (path, options, print) => {
  type ThisNode = N.CastArgument;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    cast_from: p.child("cast_from"),
    self: p.self("upper", true),
    trailing_comments: printTrailingComments(path, options, print),
    cast_to: p.child("cast_to", asItIs, true),
    // not used
    leading_comments: "",
  };
  docs.leading_comments;
  return [
    docs.cast_from,
    " ",
    docs.self,
    docs.trailing_comments,
    " ",
    docs.cast_to,
  ];
};

const printComment: PrintFunc = (path, options, print) => {
  type ThisNode = N.Comment;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    self: p.self(),
  };
  return docs.self;
};

const printCreateFunctionStatement: PrintFunc = (path, options, print) => {
  type ThisNode = N.CreateFunctionStatement;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, options, print, node, node.children);
  p.setLiteral("temp", "TEMP");
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print),
    or_replace: p.child("or_replace", (x) => group([line, x])),
    temp: p.child("temp", asItIs, true),
    what: p.child("what", asItIs, true),
    if_not_exists: p.child("if_not_exists", (x) => group([line, x])),
    ident: p.child("ident", asItIs, true),
    group: p.child("group", asItIs, true),
    returns: p.child("returns"),
    determinism: group(p.child("determinism", asItIs, false, line)),
    language: p.child("language"),
    options: p.child("options"),
    as: p.child("as"),
    semicolon: p.child("semicolon"),
  };
  return [
    docs.leading_comments,
    group([
      group([
        docs.self,
        docs.trailing_comments,
        docs.or_replace,
        p.has("temp") ? " " : "",
        docs.temp,
        " ",
        docs.what,
        docs.if_not_exists,
        " ",
        docs.ident,
        docs.group,
      ]),
      p.has("returns") ? line : "",
      docs.returns,
      p.has("determinism") ? line : "",
      docs.determinism,
      p.has("language") ? line : "",
      docs.language,
      p.has("options") ? line : "",
      docs.options,
      line,
      docs.as,
      softline,
      docs.semicolon,
    ]),
    p.newLine(),
  ];
};

const printCreateProcedureStatement: PrintFunc = (path, options, print) => {
  type ThisNode = N.CreateProcedureStatement;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, options, print, node, node.children);
  p.setNotRoot("stmt");
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print),
    or_replace: p.child("or_replace", (x) => group([line, x])),
    what: p.child("what", asItIs, true),
    if_not_exists: p.child("if_not_exists", (x) => group([line, x])),
    ident: p.child("ident", asItIs, true),
    group: p.child("group", asItIs, true),
    options: p.child("options"),
    stmt: p.child("stmt"),
    semicolon: p.child("semicolon"),
  };
  return [
    docs.leading_comments,
    group([
      group([
        docs.self,
        docs.trailing_comments,
        docs.or_replace,
        " ",
        docs.what,
        docs.if_not_exists,
        " ",
        docs.ident,
        docs.group,
      ]),
      p.has("options") ? line : "",
      docs.options,
      line,
      docs.stmt,
      softline,
      docs.semicolon,
    ]),
    p.newLine(),
  ];
};

const printCreateSchemaStatement: PrintFunc = (path, options, print) => {
  type ThisNode = N.CreateSchemaStatement;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print),
    what: p.child("what", asItIs, true),
    if_not_exists: p.child("if_not_exists", (x) => group([line, x])),
    ident: p.child("ident", asItIs, true),
    options: p.child("options"),
    semicolon: p.child("semicolon"),
  };
  return [
    docs.leading_comments,
    group([
      docs.self,
      docs.trailing_comments,
      " ",
      docs.what,
      docs.if_not_exists,
      " ",
      docs.ident,
      line,
      docs.options,
      softline,
      docs.semicolon,
    ]),
    p.newLine(),
  ];
};

const printCreateTableStatement: PrintFunc = (path, options, print) => {
  type ThisNode = N.CreateTableStatement;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, options, print, node, node.children);
  p.setLiteral("temp", "TEMP");
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print),
    or_replace: p.child("or_replace", (x) => group([line, x])),
    external: p.child("external", asItIs, true),
    temp: p.child("temp", asItIs, true),
    what: p.child("what", asItIs, true),
    if_not_exists: p.child("if_not_exists", (x) => group([line, x])),
    ident: p.child("ident", asItIs, true),
    column_schema_group: p.child("column_schema_group", asItIs, true),
    partitionby: p.child("partitionby"),
    clusterby: p.child("clusterby"),
    with_partition_columns: p.child("with_partition_columns"),
    options: p.child("options"),
    as: p.child("as", asItIs, true),
    semicolon: p.child("semicolon"),
  };
  return [
    docs.leading_comments,
    group([
      docs.self,
      docs.trailing_comments,
      docs.or_replace,
      p.has("external") ? " " : "",
      docs.external,
      p.has("temp") ? " " : "",
      docs.temp,
      " ",
      docs.what,
      docs.if_not_exists,
      " ",
      docs.ident,
      p.has("column_schema_group") ? " " : "",
      docs.column_schema_group,
      p.has("partitionby") ? line : "",
      docs.partitionby,
      p.has("clusterby") ? line : "",
      docs.clusterby,
      p.has("with_partition_columns") ? line : "",
      docs.with_partition_columns,
      p.has("options") ? line : "",
      docs.options,
      p.has("as") ? line : "",
      docs.as,
      softline,
      docs.semicolon,
    ]),
    p.newLine(),
  ];
};

const printCreateViewStatement: PrintFunc = (path, options, print) => {
  type ThisNode = N.CreateViewStatement;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print),
    or_replace: p.child("or_replace", (x) => group([line, x])),
    materialized: p.child("materialized", asItIs, true),
    what: p.child("what", asItIs, true),
    if_not_exists: p.child("if_not_exists", (x) => group([line, x])),
    ident: p.child("ident", asItIs, true),
    column_name_list: p.child("column_name_list", asItIs, true),
    partitionby: p.child("partitionby"),
    clusterby: p.child("clusterby"),
    options: p.child("options"),
    as: p.child("as", asItIs, true),
    semicolon: p.child("semicolon"),
  };
  return [
    docs.leading_comments,
    group([
      docs.self,
      docs.trailing_comments,
      docs.or_replace,
      p.has("materialized") ? " " : "",
      docs.materialized,
      " ",
      docs.what,
      docs.if_not_exists,
      " ",
      docs.ident,
      p.has("column_name_list") ? " " : "",
      docs.column_name_list,
      p.has("partitionby") ? line : "",
      docs.partitionby,
      p.has("clusterby") ? line : "",
      docs.clusterby,
      p.has("options") ? line : "",
      docs.options,
      line,
      docs.as,
      softline,
      docs.semicolon,
    ]),
    p.newLine(),
  ];
};

const printDeclareStatement: PrintFunc = (path, options, print) => {
  type ThisNode = N.DeclareStatement;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print),
    idents: p.child("idents", (x) => [line, x]),
    variable_type: p.child("variable_type"),
    default: p.child("default"),
    semicolon: p.child("semicolon"),
  };
  return [
    docs.leading_comments,
    group([
      docs.self,
      docs.trailing_comments,
      indent(docs.idents),
      p.has("variable_type") ? line : "",
      docs.variable_type,
      p.has("default") ? line : "",
      docs.default,
      softline,
      docs.semicolon,
    ]),
    p.newLine(),
  ];
};

const printDotOperator: PrintFunc = (path, options, print) => {
  type ThisNode = N.DotOperator;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    left: p.child("left"),
    self: p.self("upper", true),
    trailing_comments: printTrailingComments(path, options, print),
    right: p.child("right"),
    alias: printAlias(path as AstPathOf<ThisNode>, options, print),
    for_system_time_as_of: p.child("for_system_time_as_of", asItIs, true),
    pivot: printPivotOrUnpivotOperator(
      path as AstPathOf<ThisNode>,
      options,
      print
    ),
    tablesample: p.child("tablesample", asItIs, true),
    order: printOrder(path as AstPathOf<ThisNode>, options, print),
    comma: p.child("comma", asItIs, true),
    // not used
    leading_comments: "",
    as: "",
    null_order: "",
    unpivot: "",
  };
  docs.leading_comments;
  docs.as;
  docs.null_order;
  docs.unpivot;
  return [
    docs.left,
    docs.self,
    docs.trailing_comments,
    docs.right,
    docs.alias,
    p.has("for_system_time_as_of") ? [" ", docs.for_system_time_as_of] : "",
    docs.pivot,
    p.has("tablesample") ? [" ", docs.tablesample] : "",
    docs.order,
    docs.comma,
  ];
};

const printDropColumnClause: PrintFunc = (path, options, print) => {
  type ThisNode = N.DropColumnClause;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print),
    column: p.child("column", asItIs, true),
    if_exists: p.child("if_exists", (x) => group([line, x])),
    ident: p.child("ident", asItIs, true),
    comma: p.child("comma", asItIs, true),
  };
  return [
    docs.leading_comments,
    group([
      docs.self,
      " ",
      docs.column,
      docs.trailing_comments,
      docs.if_exists,
      " ",
      docs.ident,
      docs.comma,
    ]),
  ];
};

const printDropStatement: PrintFunc = (path, options, print) => {
  type ThisNode = N.DropStatement;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print),
    external: p.child("external", asItIs, true),
    materialized: p.child("materialized", asItIs, true),
    what: p.child("what", asItIs, true),
    if_exists: p.child("if_exists", (x) => group([line, x])),
    ident: p.child("ident", asItIs, true),
    cascade_or_restrict: p.child("cascade_or_restrict", asItIs, true),
    semicolon: p.child("semicolon"),
  };
  return [
    docs.leading_comments,
    group([
      docs.self,
      docs.trailing_comments,
      p.has("external") ? " " : "",
      docs.external,
      p.has("materialized") ? " " : "",
      docs.materialized,
      " ",
      docs.what,
      docs.if_exists,
      " ",
      docs.ident,
      p.has("cascade_or_restrict") ? " " : "",
      docs.cascade_or_restrict,
      softline,
      docs.semicolon,
    ]),
    p.newLine(),
  ];
};

const printElseIfClause: PrintFunc = (path, options, print) => {
  type ThisNode = N.ElseIfClause;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print),
    condition: p.child("condition", asItIs, true),
    then: p.child("then", asItIs, true),
  };
  return [
    docs.leading_comments,
    docs.self,
    docs.trailing_comments,
    " ",
    docs.condition,
    " ",
    docs.then,
  ];
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

const printExecuteStatement: PrintFunc = (path, options, print) => {
  type ThisNode = N.ExecuteStatement;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print),
    immediate: p.child("immediate", asItIs, true),
    sql_expr: p.child("sql_expr", asItIs, true),
    into: p.child("into"),
    using: p.child("using"),
    semicolon: p.child("semicolon"),
  };
  return [
    docs.leading_comments,
    group([
      docs.self,
      docs.trailing_comments,
      " ",
      docs.immediate,
      " ",
      docs.sql_expr,
      p.has("into") ? line : "",
      docs.into,
      p.has("using") ? line : "",
      docs.using,
      softline,
      docs.semicolon,
    ]),
    p.newLine(),
  ];
};

const printExportStatement: PrintFunc = (path, options, print) => {
  type ThisNode = N.ExportStatement;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print),
    data: p.child("data", asItIs, true),
    options: p.child("options"),
    as: p.child("as"),
    semicolon: p.child("semicolon"),
  };
  return [
    docs.leading_comments,
    group([
      docs.self,
      docs.trailing_comments,
      " ",
      docs.data,
      line,
      docs.options,
      line,
      docs.as,
      softline,
      docs.semicolon,
    ]),
    p.newLine(),
  ];
};

const printExtractArgument: PrintFunc = (path, options, print) => {
  type ThisNode = N.ExtractArgument;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, options, print, node, node.children);
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
  return [
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
  ];
};

const printForSystemTimeAsOfclause: PrintFunc = (path, options, print) => {
  type ThisNode = N.ForSystemTimeAsOfClause;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print),
    system_time_as_of: p.child("system_time_as_of", (x) => group([line, x])),
    expr: p.child("expr", asItIs, true),
  };
  return [
    docs.leading_comments,
    docs.self,
    docs.trailing_comments,
    docs.system_time_as_of,
    " ",
    docs.expr,
  ];
};

const printGroupedExpr: PrintFunc = (path, options, print) => {
  type ThisNode = N.GroupedExpr;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print),
    self: p.self(),
    trailing_comments: printTrailingComments(path, options, print),
    expr: p.child("expr"),
    rparen: p.child("rparen"),
    alias: printAlias(path as AstPathOf<ThisNode>, options, print),
    pivot: printPivotOrUnpivotOperator(
      path as AstPathOf<ThisNode>,
      options,
      print
    ),
    order: printOrder(path as AstPathOf<ThisNode>, options, print),
    comma: p.child("comma", asItIs, true),
    // not used
    as: "",
    null_order: "",
    unpivot: "",
  };
  docs.unpivot;
  docs.as;
  docs.null_order;
  return [
    docs.leading_comments,
    group([
      docs.self,
      docs.trailing_comments,
      indent([softline, docs.expr]),
      softline,
      docs.rparen,
    ]),
    docs.alias,
    docs.pivot,
    docs.order,
    docs.comma,
  ];
};

const printGroupedExprs: PrintFunc = (path, options, print) => {
  type ThisNode = N.GroupedExprs;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, options, print, node, node.children);
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
  return [
    docs.leading_comments,
    group([
      docs.self,
      docs.trailing_comments,
      indent([softline, docs.exprs]),
      softline,
      docs.rparen,
      p.has("row_value_alias") ? [" ", docs.as] : "",
      p.has("row_value_alias") ? [" ", docs.row_value_alias] : "",
      docs.comma,
    ]),
  ];
};

const printGroupedStatement: PrintFunc = (path, options, print) => {
  type ThisNode = N.GroupedStatement;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, options, print, node, node.children);
  p.setNotRoot("stmt");
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print),
    self: p.self(),
    trailing_comments: printTrailingComments(path, options, print),
    stmt: p.child("stmt"),
    rparen: p.child("rparen"),
    alias: printAlias(path as AstPathOf<ThisNode>, options, print),
    pivot: printPivotOrUnpivotOperator(
      path as AstPathOf<ThisNode>,
      options,
      print
    ),
    order: printOrder(path as AstPathOf<ThisNode>, options, print),
    comma: p.child("comma", asItIs, true),
    semicolon: p.child("semicolon", asItIs, true),
    // not used
    as: "",
    null_order: "",
    unpivot: "",
  };
  docs.as;
  docs.null_order;
  docs.unpivot;
  return [
    docs.leading_comments,
    group([
      docs.self,
      indent([softline, group([docs.trailing_comments, docs.stmt])]),
      softline,
      docs.rparen,
      docs.pivot,
      docs.alias,
      docs.order,
      docs.comma,
      docs.semicolon,
    ]),
    p.newLine(),
  ];
};

const printGroupedType: PrintFunc = (path, options, print) => {
  type ThisNode = N.GroupedType;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print),
    self: p.self(),
    trailing_comments: printTrailingComments(path, options, print),
    type: p.child("type"),
    rparen: p.child("rparen"),
  };
  return [
    docs.leading_comments,
    docs.self,
    docs.trailing_comments,
    indent([softline, docs.type]),
    softline,
    docs.rparen,
  ];
};

const printGroupedTypeDeclarations: PrintFunc = (path, options, print) => {
  type ThisNode = N.GroupedTypeDeclarations;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print),
    self: p.self(),
    trailing_comments: printTrailingComments(path, options, print),
    declarations: p.child("declarations", (x) => group(x), false, line),
    rparen: p.child("rparen"),
  };
  return [
    docs.leading_comments,
    docs.self,
    docs.trailing_comments,
    indent([p.has("declarations") ? softline : "", docs.declarations]),
    p.has("declarations") ? softline : "",
    docs.rparen,
  ];
};

const printIdentifier: PrintFunc = (path, options, print) => {
  type ThisNode = N.Identifier;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print),
    self:
      node.callable && p.includedIn(globalFunctions)
        ? p.self("upper")
        : p.self(),
    trailing_comments: printTrailingComments(path, options, print),
    alias: printAlias(path as AstPathOf<ThisNode>, options, print),
    for_system_time_as_of: p.child("for_system_time_as_of", asItIs, true),
    pivot: printPivotOrUnpivotOperator(
      path as AstPathOf<ThisNode>,
      options,
      print
    ),
    tablesample: p.child("tablesample", asItIs, true),
    order: printOrder(path as AstPathOf<ThisNode>, options, print),
    comma: p.child("comma", asItIs, true),
    // not used
    unpivot: "",
    as: "",
    null_order: "",
  };
  docs.unpivot;
  docs.as;
  docs.null_order;
  return [
    docs.leading_comments,
    docs.self,
    docs.trailing_comments,
    docs.alias,
    p.has("for_system_time_as_of") ? [" ", docs.for_system_time_as_of] : "",
    docs.pivot,
    p.has("tablesample") ? [" ", docs.tablesample] : "",
    docs.order,
    docs.comma,
  ];
};

const printIfStatement: PrintFunc = (path, options, print) => {
  type ThisNode = N.IfStatement;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print),
    condition: p.child("condition", asItIs, true),
    then: p.child("then", asItIs, true),
    elseifs: p.child("elseifs", (x) => [hardline, x]),
    else: p.child("else"),
    end_if: group(p.child("end_if", asItIs, false, line)),
    semicolon: p.child("semicolon"),
  };
  return [
    docs.leading_comments,
    group([
      docs.self,
      docs.trailing_comments,
      " ",
      docs.condition,
      " ",
      docs.then,
      docs.elseifs,
      p.has("else") ? hardline : "",
      docs.else,
      line,
      docs.end_if,
      softline,
      docs.semicolon,
    ]),
    p.newLine(),
  ];
};

const printInOperator: PrintFunc = (path, options, print) => {
  type ThisNode = N.InOperator;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    left: p.child("left"),
    not: p.child("not"),
    self: p.self("asItIs", true),
    trailing_comments: printTrailingComments(path, options, print),
    right: p.child("right", asItIs, true),
    alias: printAlias(path as AstPathOf<ThisNode>, options, print),
    order: printOrder(path as AstPathOf<ThisNode>, options, print),
    comma: p.child("comma", asItIs, true),
    // not used
    leading_comments: "",
    as: "",
    null_order: "",
  };
  docs.leading_comments;
  docs.as;
  docs.null_order;
  return [
    docs.left,
    " ",
    p.has("not") ? [docs.not, " "] : "",
    docs.self,
    docs.trailing_comments,
    " ",
    docs.right,
    docs.alias,
    docs.order,
    docs.comma,
  ];
};

const printIntervalLiteral: PrintFunc = (path, options, print) => {
  type ThisNode = N.IntervalLiteral;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print),
    right: p.child("right", asItIs, true),
    date_part: p.child("date_part", asItIs, true),
    alias: printAlias(path as AstPathOf<ThisNode>, options, print),
    comma: p.child("comma", asItIs, true),
    // not used
    as: "",
  };
  docs.as;
  return [
    docs.leading_comments,
    docs.self,
    docs.trailing_comments,
    " ",
    docs.right,
    " ",
    docs.date_part,
    docs.alias,
    docs.comma,
  ];
};

const printJoinOperator: PrintFunc = (path, options, print) => {
  type ThisNode = N.JoinOperator;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, options, print, node, node.children);
  p.setNotRoot("left");
  p.setNotRoot("right");
  let outer: Doc = "";
  const outerChild = node.children.outer;
  if (outerChild) {
    const leading_comments = outerChild.Node.children.leading_comments;
    if (leading_comments) {
      outer = [
        outer,
        leading_comments.NodeVec.map((x) => lineSuffix([" ", x.token.literal])),
      ];
    }
    const trailing_comments = outerChild.Node.children.trailing_comments;
    if (trailing_comments) {
      outer = [
        outer,
        trailing_comments.NodeVec.map((x) =>
          lineSuffix([" ", x.token.literal])
        ),
      ];
    }
  }
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    left: p.child("left"),
    join_type: p.child("join_type"),
    outer: outer,
    self: p.self("upper", true),
    trailing_comments: printTrailingComments(path, options, print),
    right: p.child("right", asItIs, true),
    on: p.child("on", asItIs, true),
    using: p.child("using", asItIs, true),
    alias: printAlias(path as AstPathOf<ThisNode>, options, print),
    pivot: printPivotOrUnpivotOperator(
      path as AstPathOf<ThisNode>,
      options,
      print
    ),
    // not used
    leading_comments: "",
    as: "",
    unpivot: "",
  };
  docs.leading_comments;
  docs.as;
  docs.unpivot;
  return [
    docs.left,
    hardline,
    p.includedIn(["JOIN"]) ? [docs.join_type || "INNER", " "] : "",
    docs.outer,
    docs.self,
    docs.trailing_comments,
    " ",
    docs.right,
    p.has("on") || p.has("using") ? " " : "",
    docs.on,
    docs.using,
    docs.alias,
    docs.pivot,
  ];
};

const printKeyword: PrintFunc = (path, options, print) => {
  type ThisNode = N.Keyword;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print),
  };
  return [docs.leading_comments, docs.self, docs.trailing_comments];
};

const printKeywordWithExpr = (
  path: AstPathOf<N.KeywordWithExpr>,
  options: Options,
  print: (path: AstPath) => Doc
): Doc => {
  type ThisNode = N.KeywordWithExpr;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, options, print, node, node.children);
  p.setNotRoot("expr");
  p.setBreakRecommended("expr");
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print),
    expr:
      !p.hasLeadingComments("expr") &&
      ["GroupedStatement"].includes(node.children.expr.Node.node_type)
        ? [" ", p.child("expr", asItIs, true)] // in the case of `FROM (SELECT ...)`
        : indent([line, p.child("expr")]),
  };
  return [
    docs.leading_comments,
    group([docs.self, docs.trailing_comments, docs.expr]),
  ];
};

const printKeywordWithExprs: PrintFunc = (path, options, print) => {
  type ThisNode = N.KeywordWithExprs;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print),
    exprs: p.child("exprs", (x) => [line, x]),
  };
  return [
    docs.leading_comments,
    group([docs.self, docs.trailing_comments, indent(docs.exprs)]),
  ];
};

const printKeywordWithGroupedExpr: PrintFunc = (path, options, print) => {
  type ThisNode = N.KeywordWithGroupedExpr;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print),
    group: p.child("group", asItIs, true),
  };
  return [
    docs.leading_comments,
    group([docs.self, docs.trailing_comments, " ", docs.group]),
  ];
};

const printKeywordWithGroupedExprs: PrintFunc = (path, options, print) => {
  type ThisNode = N.KeywordWithGroupedExprs;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print),
    group: p.child("group", asItIs, true),
  };
  return [
    docs.leading_comments,
    group([docs.self, docs.trailing_comments, " ", docs.group]),
  ];
};

const printKeywordWithStatement: PrintFunc = (path, options, print) => {
  type ThisNode = N.KeywordWithStatement;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, options, print, node, node.children);
  p.setNotRoot("stmt");
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print),
    stmt: p.child("stmt", asItIs, true),
  };
  return [
    docs.leading_comments,
    group([docs.self, docs.trailing_comments, line, docs.stmt]),
  ];
};

const printKeywordWithStatements: PrintFunc = (path, options, print) => {
  type ThisNode = N.KeywordWithStatements;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, options, print, node, node.children);
  p.setNotRoot("stmts");
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print),
    stmts:
      p.len("stmts") <= 1
        ? p.child("stmts", (x) => [line, x])
        : p.child("stmts", (x) => [hardline, x]),
  };
  return [
    docs.leading_comments,
    docs.self,
    docs.trailing_comments,
    indent(docs.stmts),
  ];
};

const printKeywordWithType: PrintFunc = (path, options, print) => {
  type ThisNode = N.KeywordWithType;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print),
    type: p.child("type"),
  };
  return [
    docs.leading_comments,
    group([docs.self, docs.trailing_comments, indent([line, docs.type])]),
  ];
};

const printLanguageSpecifier: PrintFunc = (path, options, print) => {
  type ThisNode = N.LanguageSpecifier;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print),
    language: p.child("language"),
  };
  return [
    docs.leading_comments,
    group([docs.self, docs.trailing_comments, indent([line, docs.language])]),
  ];
};

const printLimitClause: PrintFunc = (path, options, print) => {
  type ThisNode = N.LimitClause;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, options, print, node, node.children);
  return [
    printKeywordWithExpr(path as AstPathOf<ThisNode>, options, print),
    " ",
    p.child("offset", asItIs, true),
  ];
};

const printLoopStatement: PrintFunc = (path, options, print) => {
  type ThisNode = N.LoopStatement;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, options, print, node, node.children);
  p.setNotRoot("stmts");
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print),
    stmts:
      p.len("stmts") <= 1
        ? p.child("stmts", (x) => [line, x])
        : p.child("stmts", (x) => [hardline, x]),
    end_loop: group(p.child("end_loop", asItIs, false, line)),
    semicolon: p.child("semicolon"),
  };
  return [
    docs.leading_comments,
    group([
      docs.self,
      docs.trailing_comments,
      indent(docs.stmts),
      line,
      docs.end_loop,
      softline,
      docs.semicolon,
    ]),
    p.newLine(),
  ];
};

const printNullLiteral: PrintFunc = (path, options, print) => {
  type ThisNode = N.NullLiteral;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print),
    alias: printAlias(path as AstPathOf<ThisNode>, options, print),
    order: printOrder(path as AstPathOf<ThisNode>, options, print),
    comma: p.child("comma", asItIs, true),
    // not used
    as: "",
    null_order: "",
  };
  docs.as;
  docs.null_order;
  return [
    docs.leading_comments,
    docs.self,
    docs.trailing_comments,
    docs.alias,
    docs.order,
    docs.comma,
  ];
};

const printNumericLiteral: PrintFunc = (path, options, print) => {
  type ThisNode = N.NumericLiteral;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print),
    self: p.self("lower"), // in the case of `3.14e10`
    trailing_comments: printTrailingComments(path, options, print),
    alias: printAlias(path as AstPathOf<ThisNode>, options, print),
    order: printOrder(path as AstPathOf<ThisNode>, options, print),
    comma: p.child("comma", asItIs, true),
    // not used
    as: "",
    null_order: "",
  };
  docs.as;
  docs.null_order;
  return [
    docs.leading_comments,
    docs.self,
    docs.trailing_comments,
    docs.alias,
    docs.order,
    docs.comma,
  ];
};

const printOverClause: PrintFunc = (path, options, print) => {
  type ThisNode = N.OverClause;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    self: p.self("upper", true),
    trailing_comments: printTrailingComments(path, options, print),
    window: p.child("window", (x) => [" ", x], true),
    // not used
    leading_comments: "",
  };
  docs.leading_comments;
  return [docs.self, docs.trailing_comments, docs.window];
};

const printPivotConfig: PrintFunc = (path, options, print) => {
  type ThisNode = N.PivotConfig;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print),
    exprs: p.child("exprs", (x) => [x, line]),
    for: p.child("for"),
    in: p.child("in", asItIs, true),
    rparen: p.child("rparen"),
  };
  return [
    docs.leading_comments,
    docs.self,
    docs.trailing_comments,
    indent([softline, docs.exprs, docs.for, " ", docs.in]),
    softline,
    docs.rparen,
  ];
};

const printPivotOperator: PrintFunc = (path, options, print) => {
  type ThisNode = N.PivotOperator;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print),
    config: p.child("config", asItIs, true),
    as: p.child("as", asItIs, true),
    alias: p.child("alias", asItIs, true),
  };
  return [
    docs.leading_comments,
    docs.self,
    docs.trailing_comments,
    " ",
    docs.config,
    p.has("alias") ? [" ", docs.as || "AS"] : "",
    p.has("alias") ? [" ", docs.alias] : "",
  ];
};

const printRaiseStatement: PrintFunc = (path, options, print) => {
  type ThisNode = N.RaiseStatement;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print),
    using: p.child("using", asItIs, true),
    semicolon: p.child("semicolon"),
  };
  return [
    docs.leading_comments,
    group([
      docs.self,
      docs.trailing_comments,
      " ",
      docs.using,
      softline,
      docs.semicolon,
    ]),
  ];
};

const printSelectStatement: PrintFunc = (path, options, print) => {
  type ThisNode = N.SelectStatement;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, options, print, node, node.children);
  p.setNotRoot("exprs");
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    with: p.child("with"),
    leading_comments: printLeadingComments(path, options, print),
    // SELECT clause
    self: p.self("upper"),
    as_struct_or_value: p.child("as_struct_or_value", asItIs, true, " "),
    distinct_or_all: p.child("distinct_or_all"),
    trailing_comments: printTrailingComments(path, options, print),
    exprs: p.child("exprs", (x) => [line, group(x)]),
    // FROM clause
    from: p.child("from"),
    // WHERE clause
    where: p.child("where"),
    // GROUP BY clause
    groupby: p.child("groupby"),
    // HAVING clause
    having: p.child("having"),
    // QUALIFY clause
    qualify: p.child("qualify"),
    // WINDOW clause
    window: p.child("window"),
    // ORDER BY clause
    orderby: p.child("orderby"),
    // LIMIT clause
    limit: p.child("limit"),
    semicolon: p.child("semicolon", asItIs, true),
  };
  const select = [
    docs.self,
    p.has("as_struct_or_value") ? " " : "",
    docs.as_struct_or_value,
    p.has("distinct_or_all") ? " " : "",
    docs.distinct_or_all,
    indent(docs.exprs),
  ];
  return [
    docs.leading_comments,
    group([
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
      // GROUP BY clause
      p.has("groupby") ? line : "",
      docs.groupby,
      // HAVING clause
      p.has("having") ? line : "",
      docs.having,
      // QUALIFY clause
      p.has("qualify") ? line : "",
      docs.qualify,
      // WINDOW clause
      p.has("window") ? line : "",
      docs.window,
      // ORDER BY clause
      p.has("orderby") ? line : "",
      docs.orderby,
      // LIMIT clause
      p.has("limit") ? line : "",
      docs.limit,
      p.has("semicolon") ? [softline, docs.semicolon] : "",
    ]),
    p.newLine(),
  ];
};

const printSetOperator: PrintFunc = (path, options, print) => {
  type ThisNode = N.SetOperator;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, options, print, node, node.children);
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
  const res = [
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
  ];
  if (node.notRoot) {
    return res;
  } else {
    return group(res);
  }
};

const printSetStatement: PrintFunc = (path, options, print) => {
  type ThisNode = N.SetStatement;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print),
    expr: p.child("expr"),
    semicolon: p.child("semicolon"),
  };
  return [
    docs.leading_comments,
    group([
      docs.self,
      docs.trailing_comments,
      indent([line, docs.expr]),
      softline,
      docs.semicolon,
    ]),
    p.newLine(),
  ];
};

const printSingleTokenStatement: PrintFunc = (path, options, print) => {
  type ThisNode = N.SingleTokenStatement;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print),
    semicolon: p.child("semicolon"),
  };
  return [
    docs.leading_comments,
    docs.self,
    docs.trailing_comments,
    docs.semicolon,
    p.newLine(),
  ];
};

const printStringLiteral: PrintFunc = (path, options, print) => {
  type ThisNode = N.StringLiteral;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print),
    self: p.self(),
    trailing_comments: printTrailingComments(path, options, print),
    alias: printAlias(path as AstPathOf<ThisNode>, options, print),
    order: printOrder(path as AstPathOf<ThisNode>, options, print),
    comma: p.child("comma", asItIs, true),
    // not used
    as: "",
    null_order: "",
  };
  docs.as;
  docs.null_order;
  return [
    docs.leading_comments,
    docs.self,
    docs.trailing_comments,
    docs.alias,
    docs.order,
    docs.comma,
  ];
};

const printStructLiteral: PrintFunc = (path, options, print) => {
  type ThisNode = N.StructLiteral;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    type: p.child("type"),
    leading_comments: p.has("type")
      ? ""
      : printLeadingComments(path, options, print),
    self: p.has("type") ? p.self("asItIs", true) : p.self(),
    trailing_comments: printTrailingComments(path, options, print),
    exprs: p.child("exprs", (x) => group(x), false, line),
    rparen: p.child("rparen"),
    alias: printAlias(path as AstPathOf<ThisNode>, options, print),
    order: printOrder(path as AstPathOf<ThisNode>, options, print),
    comma: p.child("comma", asItIs, true),
    // not used
    as: "",
    null_order: "",
  };
  docs.as;
  docs.null_order;
  return [
    docs.type,
    docs.leading_comments,
    group([
      docs.self,
      docs.trailing_comments,
      indent([softline, docs.exprs]),
      softline,
      docs.rparen,
      docs.alias,
      docs.order,
      docs.comma,
    ]),
  ];
};

const printSymbol: PrintFunc = (path, options, print) => {
  type ThisNode = N.Symbol_;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print),
  };
  return [docs.leading_comments, docs.self, docs.trailing_comments];
};

const printTableSampleClause: PrintFunc = (path, options, print) => {
  type ThisNode = N.TableSampleClause;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print),
    self: p.self("upper"),
    system: p.child("system", asItIs, true),
    trailing_comments: printTrailingComments(path, options, print),
    group: p.child("group", asItIs, true),
  };
  return [
    docs.leading_comments,
    docs.self,
    docs.trailing_comments,
    " ",
    docs.system,
    " ",
    docs.group,
  ];
};

const printTableSampleRatio: PrintFunc = (path, options, print) => {
  type ThisNode = N.TableSampleRatio;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print),
    self: p.self("upper"),
    expr: p.child("expr", asItIs, true),
    trailing_comments: printTrailingComments(path, options, print),
    percent: p.child("percent", asItIs, true),
    rparen: p.child("rparen", asItIs, true),
  };
  return [
    docs.leading_comments,
    docs.self,
    docs.trailing_comments,
    docs.expr,
    " ",
    docs.percent,
    docs.rparen,
  ];
};

const printType: PrintFunc = (path, options, print) => {
  type ThisNode = N.Type;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print),
    type: p.child("type", asItIs, true),
    type_declaration: p.child("type_declaration", asItIs, true),
    not_null: p.child("not_null", (x) => group([line, x])),
    options: p.child("options", asItIs, true),
  };
  return [
    docs.leading_comments,
    docs.self,
    docs.trailing_comments,
    p.has("type") ? " " : "",
    docs.type,
    docs.type_declaration,
    docs.not_null,
    p.has("options") ? " " : "",
    docs.options,
  ];
};

const printTypeDeclaration: PrintFunc = (path, options, print) => {
  type ThisNode = N.TypeDeclaration;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    in_out: p.child("in_out"),
    self: p.self("asItIs", true),
    trailing_comments: printTrailingComments(path, options, print),
    type: p.child("type", asItIs, true),
    comma: p.child("comma", asItIs, true),
    // not used
    leading_comments: "",
  };
  docs.leading_comments;
  return [
    docs.in_out,
    p.has("in_out") ? " " : "",
    docs.self,
    node.token ? " " : "",
    docs.trailing_comments,
    docs.type,
    docs.comma,
  ];
};

const printUnaryOperator: PrintFunc = (path, options, print) => {
  type ThisNode = N.UnaryOperator;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, options, print, node, node.children);
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
    alias: printAlias(path as AstPathOf<ThisNode>, options, print),
    order: printOrder(path as AstPathOf<ThisNode>, options, print),
    comma: p.child("comma", asItIs, true),
    // not used
    as: "",
    null_order: "",
  };
  docs.as;
  docs.null_order;
  return [
    docs.leading_comments,
    docs.self,
    docs.trailing_comments,
    p.includedIn(noSpaceOperators) ? "" : " ",
    docs.right,
    docs.alias,
    docs.order,
    docs.comma,
  ];
};

const printUnpivotConfig: PrintFunc = (path, options, print) => {
  type ThisNode = N.UnpivotConfig;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print),
    expr: p.child("expr"),
    for: p.child("for"),
    in: p.child("in", asItIs, true),
    rparen: p.child("rparen"),
  };
  return [
    docs.leading_comments,
    docs.self,
    docs.trailing_comments,
    indent([softline, docs.expr, line, docs.for, " ", docs.in]),
    softline,
    docs.rparen,
  ];
};

const printUnpivotOperator: PrintFunc = (path, options, print) => {
  type ThisNode = N.UnpivotOperator;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print),
    self: p.self("upper"),
    include_or_exclude_nulls: p.child("include_or_exclude_nulls", (x) =>
      group([line, x])
    ),
    trailing_comments: printTrailingComments(path, options, print),
    config: p.child("config", asItIs, true),
    as: p.child("as", asItIs, true),
    alias: p.child("alias", asItIs, true),
  };
  docs.as;
  return [
    docs.leading_comments,
    docs.self,
    docs.include_or_exclude_nulls,
    docs.trailing_comments,
    " ",
    docs.config,
    p.has("alias") ? [" ", docs.as || "AS"] : "",
    p.has("alias") ? [" ", docs.alias] : "",
  ];
};

const printWhileStatement: PrintFunc = (path, options, print) => {
  type ThisNode = N.WhileStatement;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, options, print, node, node.children);
  p.setBreakRecommended("condition");
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print),
    condition: p.child("condition"),
    do: p.child("do", asItIs, true),
    end_while: group(p.child("end_while", asItIs, false, line)),
    semicolon: p.child("semicolon"),
  };
  return [
    docs.leading_comments,
    group([
      group([
        docs.self,
        docs.trailing_comments,
        indent([line, docs.condition]),
        ifBreak(line, " "),
      ]),
      docs.do,
      line,
      docs.end_while,
      softline,
      docs.semicolon,
    ]),
    p.newLine(),
  ];
};

const printWindowClause: PrintFunc = (path, options, print) => {
  type ThisNode = N.WindowClause;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print),
    window_exprs:
      p.len("window_exprs") === 1
        ? p.child("window_exprs", (x) => [" ", group(x)], true)
        : p.child("window_exprs", (x) => [line, group(x)]),
  };
  docs.leading_comments;
  return [
    docs.leading_comments,
    docs.self,
    docs.trailing_comments,
    indent(docs.window_exprs),
  ];
};

const printWindowExpr: PrintFunc = (path, options, print) => {
  type ThisNode = N.WindowExpr;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print),
    self: p.self(),
    trailing_comments: printTrailingComments(path, options, print),
    as: p.child("as", asItIs, true),
    window: p.child("window", asItIs, true),
    comma: p.child("comma", asItIs, true),
  };
  docs.leading_comments;
  return [
    docs.leading_comments,
    docs.self,
    docs.trailing_comments,
    " ",
    docs.as,
    " ",
    docs.window,
    docs.comma,
  ];
};

const printWindowFrameClause: PrintFunc = (path, options, print) => {
  type ThisNode = N.WindowFrameClause;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, options, print, node, node.children);
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
  return [
    docs.leading_comments,
    docs.self,
    docs.trailing_comments,
    p.has("between") ? [" ", docs.between] : "",
    indent([
      line,
      group(docs.start),
      p.has("and") ? [line, group([docs.and, " ", group(docs.end)])] : "",
    ]),
  ];
};

const printWindowSpecification: PrintFunc = (path, options, print) => {
  type ThisNode = N.WindowSpecification;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    self: p.self("upper", true),
    trailing_comments: printTrailingComments(path, options, print),
    name: p.child("name"),
    partitionby: p.child("partitionby", (x) => group(x)),
    orderby: p.child("orderby", (x) => group(x)),
    frame: p.child("frame", (x) => group(x)),
    rparen: p.child("rparen", asItIs),
    // not used
    leading_comments: "",
  };
  docs.leading_comments;
  return [
    docs.self,
    docs.trailing_comments,
    indent([
      softline,
      join(
        line,
        [docs.name, docs.partitionby, docs.orderby, docs.frame].filter((x) => x)
      ),
    ]),
    softline,
    docs.rparen,
  ];
};

const printWithClause: PrintFunc = (path, options, print) => {
  type ThisNode = N.WithClause;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print),
    queries:
      p.len("queries") === 1 && !p.hasLeadingComments("queries")
        ? [" ", p.child("queries", asItIs)]
        : indent([line, p.child("queries", asItIs, false, line)]),
  };
  return [
    docs.leading_comments,
    docs.self,
    docs.trailing_comments,
    docs.queries,
  ];
};

const printWithPartitionColumnsClause: PrintFunc = (path, options, print) => {
  type ThisNode = N.WithPartitionColumnsClause;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print),
    self: p.self(),
    trailing_comments: printTrailingComments(path, options, print),
    partition_columns: p.child("partition_columns", (x) => group([line, x])),
    column_schema_group: p.child("column_schema_group", asItIs, true),
  };
  return [
    docs.leading_comments,
    group([
      docs.self,
      docs.trailing_comments,
      docs.partition_columns,
      p.has("column_schema_group") ? " " : "",
      docs.column_schema_group,
    ]),
  ];
};

const printWithQuery: PrintFunc = (path, options, print) => {
  type ThisNode = N.WithQuery;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, options, print, node, node.children);
  p.setNotRoot("stmt");
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print),
    self: p.self(),
    trailing_comments: printTrailingComments(path, options, print),
    as: p.child("as", asItIs, true),
    stmt: p.child("stmt", asItIs, true),
    comma: p.child("comma", asItIs, true),
  };
  return [
    docs.leading_comments,
    docs.self,
    docs.trailing_comments,
    " ",
    docs.as,
    " ",
    docs.stmt,
    docs.comma,
  ];
};

const printXXXByExprs: PrintFunc = (path, options, print) => {
  type ThisNode = N.XXXByExprs;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<ThisNode>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print),
    by: p.child("by", asItIs, true),
    exprs: indent(p.child("exprs", (x) => [line, x])),
  };
  return [
    docs.leading_comments,
    docs.self,
    docs.trailing_comments,
    " ",
    docs.by,
    node.children.exprs.NodeVec.every((x) =>
      x.token.literal.match(/^[0-9]+$/)
    ) || p.len("exprs") === 1
      ? group(docs.exprs)
      : docs.exprs,
  ];
};

// ----- utils -----
const printAlias = (
  path: AstPathOf<N.Expr>,
  options: Options,
  print: (path: AstPath) => Doc
): Doc => {
  type ThisNode = N.Expr;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, options, print, node, node.children);
  let as_: Doc;
  if (!p.has("alias")) {
    return "";
  }
  if (p.has("as")) {
    as_ = p.child("as", asItIs, true);
  } else {
    as_ = "AS";
  }
  return [" ", as_, " ", p.child("alias", asItIs, true)];
};

const printLeadingComments: PrintFunc = (path, options, print) => {
  type ThisNode = N.BaseNode;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, options, print, node, node.children);
  return p.child("leading_comments", (x) => [x, hardline]);
};

const printOrder = (
  path: AstPathOf<N.Expr>,
  options: Options,
  print: (path: AstPath) => Doc
): Doc => {
  type ThisNode = N.Expr;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, options, print, node, node.children);
  return [
    p.has("order") ? [" ", p.child("order", asItIs, true)] : "",
    p.has("null_order") ? p.child("null_order", (x) => group([line, x])) : "",
  ];
};

const printPivotOrUnpivotOperator = (
  path: AstPathOf<N.FromItemExpr>,
  options: Options,
  print: (path: AstPath) => Doc
): Doc => {
  type ThisNode = N.FromItemExpr;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, options, print, node, node.children);
  const pivot = p.has("pivot") ? [" ", p.child("pivot", asItIs, true)] : "";
  const unpivot = p.has("unpivot")
    ? [" ", p.child("unpivot", asItIs, true)]
    : "";
  return [pivot, unpivot];
};

const printTrailingComments: PrintFunc = (path, options, print) => {
  type ThisNode = N.BaseNode;
  const node: ThisNode = path.getValue();
  const p = new Printer(path, options, print, node, node.children);
  return lineSuffix(p.child("trailing_comments", (x) => [" ", x]));
};
