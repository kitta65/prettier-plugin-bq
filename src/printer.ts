import * as bq2cst from "@dr666m1/bq2cst";
import {
  reservedKeywords,
  globalFunctions,
  keysFunctions,
  aeadFunctions,
  hllCountFunctions,
  netFunctions,
} from "./keywords";
import { doc } from "prettier";
import type { Doc, AstPath } from "prettier";

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

export type Children<T extends bq2cst.BaseNode> = T["children"];

export type NodeChild = { Node: bq2cst.BaseNode };

export type NodeVecChild = { NodeVec: bq2cst.BaseNode[] };

export type NodeKeyof<T> = {
  [k in keyof T]-?: T[k] extends { Node: bq2cst.BaseNode } | undefined
    ? k
    : never;
}[keyof T];

export type NodeVecKeyof<T> = {
  [k in keyof T]-?: T[k] extends { NodeVec: bq2cst.BaseNode[] } | undefined
    ? k
    : never;
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

type PrintFunc<T extends bq2cst.BaseNode> = (
  path: AstPath,
  oprions: Options,
  print: (path: AstPath) => Doc,
  node: T
) => Doc;

type Docs<T extends bq2cst.BaseNode> =
  | {
      [k in keyof T["children"]]-?: T["children"][k] extends undefined
        ? never
        : k;
    }[keyof T["children"]]
  | "self";

type Options = Record<string, unknown>;

class Printer<T extends bq2cst.BaseNode> {
  /**
   * Children<T> is needed because `keyof T["children"]` throws error
   * https://github.com/microsoft/TypeScript/issues/36631
   */
  constructor(
    private readonly path: AstPath,
    private readonly options: Options,
    private readonly print: (path: AstPath) => Doc,
    readonly node: T,
    private readonly children: Children<T>
  ) {}
  child(
    key: NodeKeyof<Children<T>>,
    transform?: (x: Doc) => Doc,
    consumeLeadingComments?: boolean
  ): Doc;
  child(
    key: NodeVecKeyof<Children<T>>,
    transform?: (x: Doc) => Doc,
    consumeLeadingComments?: boolean,
    sep?: Doc
  ): Doc;
  child(
    key: NodeKeyof<Children<T>> | NodeVecKeyof<Children<T>>,
    transform?: (x: Doc) => Doc,
    consumeLeadingComments?: boolean,
    sep?: Doc
  ): Doc {
    const child = this.children[key];
    let f = (x: Doc) => x;
    if (isNodeChild(child)) {
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
          (p) => p.call((p) => f(p.call(this.print, "Node")), key),
          "children"
        ),
      ];
    } else if (isNodeVecChild(child)) {
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
  consumeAllCommentsOfX(key: NodeKeyof<Children<T>>) {
    let res: Doc = "";
    const child = this.children[key];
    if (isNodeChild(child)) {
      const leading_comments = child.Node.children.leading_comments;
      if (leading_comments) {
        res = leading_comments.NodeVec.map((x) =>
          lineSuffix([" ", x.token.literal])
        );
      }
      const trailing_comments = child.Node.children.trailing_comments;
      if (trailing_comments) {
        res = [
          res,
          trailing_comments.NodeVec.map((x) =>
            lineSuffix([" ", x.token.literal])
          ),
        ];
      }
    }
    return res;
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
  consumeLeadingCommentsOfX(key: keyof Children<T>) {
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
  getFirstNode(key: keyof Children<T>) {
    const child = this.children[key];
    let firstNode;
    if (isNodeChild(child)) {
      firstNode = getFirstNode(child.Node);
    } else if (isNodeVecChild(child)) {
      firstNode = getFirstNode(child.NodeVec[0]);
    } else {
      return null;
    }
    return firstNode;
  }
  has(key: keyof Children<T>) {
    const child = this.children[key];
    if (child) {
      return true;
    }
    false;
  }
  hasLeadingComments(key: keyof Children<T>) {
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
  len(key: NodeVecKeyof<Children<T>>) {
    const nodeVec = this.children[key];
    if (isNodeVecChild(nodeVec)) {
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
  setBreakRecommended(key: NodeKeyof<Children<T>>) {
    const child = this.children[key];
    if (isNodeChild(child)) {
      child.Node.breakRecommended = true;
    }
  }
  setLiteral(key: NodeKeyof<Children<T>>, literal: string) {
    const child = this.children[key];
    if (isNodeChild(child)) {
      const token = child.Node.token;
      if (token) {
        token.literal = literal;
      }
    }
  }
  setNotRoot(key: keyof Children<T>) {
    const child = this.children[key];
    if (isNodeChild(child)) {
      child.Node.notRoot = true;
    } else if (isNodeVecChild(child)) {
      child.NodeVec.forEach((x) => {
        x.notRoot = true;
      });
    }
  }
  setNotGlobal(key: NodeKeyof<Children<T>>) {
    const child = this.children[key];
    if (isNodeChild(child)) {
      child.Node.notGlobal = true;
    }
  }
  toUpper(key: keyof Children<T>) {
    const child = this.children[key];
    if (isNodeChild(child)) {
      const token = child.Node.token;
      if (token) {
        token.literal = token.literal.toUpperCase();
      }
    } else if (isNodeVecChild(child)) {
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

const getFirstNode = (node: bq2cst.BaseNode): bq2cst.BaseNode => {
  const candidates = [];
  for (const [k, v] of Object.entries(node.children)) {
    if (["leading_comments", "trailing_comments"].includes(k)) {
      continue;
    }
    if (isNodeChild(v)) {
      candidates.push(getFirstNode(v.Node));
    } else if (isNodeVecChild(v)) {
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

export const printSQL = (
  path: AstPath,
  options: Options,
  print: (path: AstPath) => Doc
): Doc => {
  const node: bq2cst.UnknownNode | bq2cst.UnknownNode[] = path.getValue();

  if (Array.isArray(node)) {
    for (let i = 0; i < node.length - 1; i++) {
      const endNode = node[i];
      if ("semicolon" in endNode.children) {
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
          while (startNode.node_type === "SetOperator") {
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
      return printAddColumnClause(path, options, print, node);
    case "AlterColumnStatement":
      return printAlterColumnStatement(path, options, print, node);
    case "AlterSchemaStatement":
      return printAlterSchemaStatement(path, options, print, node);
    case "AlterTableStatement":
      return printAlterTableStatement(path, options, print, node);
    case "AlterViewStatement":
      return printAlterViewStatement(path, options, print, node);
    case "ArrayAccessing":
      return printArrayAccessing(path, options, print, node);
    case "ArrayLiteral":
      return printArrayLiteral(path, options, print, node);
    case "AssertStatement":
      return printAssertStatement(path, options, print, node);
    case "Asterisk":
      return printAsterisk(path, options, print, node);
    case "BeginStatement":
      return printBeginStatement(path, options, print, node);
    case "BetweenOperator":
      return printBetweenOperator(path, options, print, node);
    case "BooleanLiteral":
      return printBooleanLiteral(path, options, print, node);
    case "BinaryOperator":
      return printBinaryOperator(path, options, print, node);
    case "CallingFunction":
      return printCallingFunction(path, options, print, node);
    case "CallingUnnest":
      return printCallingUnnest(path, options, print, node);
    case "CallStatement":
      return printCallStatement(path, options, print, node);
    case "CaseArm":
      return printCaseArm(path, options, print, node);
    case "CaseExpr":
      return printCaseExpr(path, options, print, node);
    case "CastArgument":
      return printCastArgument(path, options, print, node);
    case "Comment":
      return printComment(path, options, print, node);
    case "CreateFunctionStatement":
      return printCreateFunctionStatement(path, options, print, node);
    case "CreateProcedureStatement":
      return printCreateProcedureStatement(path, options, print, node);
    case "CreateSchemaStatement":
      return printCreateSchemaStatement(path, options, print, node);
    case "CreateTableStatement":
      return printCreateTableStatement(path, options, print, node);
    case "CreateViewStatement":
      return printCreateViewStatement(path, options, print, node);
    case "DeclareStatement":
      return printDeclareStatement(path, options, print, node);
    case "DeleteStatement":
      return printDeleteStatement(path, options, print, node);
    case "DotOperator":
      return printDotOperator(path, options, print, node);
    case "DropColumnClause":
      return printDropColumnClause(path, options, print, node);
    case "DropStatement":
      return printDropStatement(path, options, print, node);
    case "ElseIfClause":
      return printElseIfClause(path, options, print, node);
    case "EOF":
      return printEOF(path, options, print, node);
    case "ExecuteStatement":
      return printExecuteStatement(path, options, print, node);
    case "ExportStatement":
      return printExportStatement(path, options, print, node);
    case "ExtractArgument":
      return printExtractArgument(path, options, print, node);
    case "ForSystemTimeAsOfClause":
      return printForSystemTimeAsOfclause(path, options, print, node);
    case "GroupedExpr":
      return printGroupedExpr(path, options, print, node);
    case "GroupedExprs":
      return printGroupedExprs(path, options, print, node);
    case "GroupedStatement":
      return printGroupedStatement(path, options, print, node);
    case "GroupedType":
      return printGroupedType(path, options, print, node);
    case "GroupedTypeDeclarations":
      return printGroupedTypeDeclarations(path, options, print, node);
    case "Identifier":
      return printIdentifier(path, options, print, node);
    case "IfStatement":
      return printIfStatement(path, options, print, node);
    case "InOperator":
      return printInOperator(path, options, print, node);
    case "InsertStatement":
      return printInsertStatement(path, options, print, node);
    case "IntervalLiteral":
      return printIntervalLiteral(path, options, print, node);
    case "JoinOperator":
      return printJoinOperator(path, options, print, node);
    case "Keyword":
      return printKeyword(path, options, print, node);
    case "KeywordWithExpr":
      return printKeywordWithExpr(path, options, print, node);
    case "KeywordWithExprs":
      return printKeywordWithExprs(path, options, print, node);
    case "KeywordWithGroupedXXX":
      return printKeywordWithGroupedXXX(path, options, print, node);
    case "KeywordWithStatement":
      return printKeywordWithStatement(path, options, print, node);
    case "KeywordWithStatements":
      return printKeywordWithStatements(path, options, print, node);
    case "KeywordWithType":
      return printKeywordWithType(path, options, print, node);
    case "LanguageSpecifier":
      return printLanguageSpecifier(path, options, print, node);
    case "LimitClause":
      return printLimitClause(path, options, print, node);
    case "LoopStatement":
      return printLoopStatement(path, options, print, node);
    case "MergeStatement":
      return printMergeStatement(path, options, print, node);
    case "NullLiteral":
      return printNullLiteral(path, options, print, node);
    case "NumericLiteral":
      return printNumericLiteral(path, options, print, node);
    case "OverClause":
      return printOverClause(path, options, print, node);
    case "Parameter":
      return printIdentifier(path, options, print, node);
    case "PivotConfig":
      return printPivotConfig(path, options, print, node);
    case "PivotOperator":
      return printPivotOperator(path, options, print, node);
    case "RaiseStatement":
      return printRaiseStatement(path, options, print, node);
    case "SelectStatement":
      return printSelectStatement(path, options, print, node);
    case "SetOperator":
      return printSetOperator(path, options, print, node);
    case "SetStatement":
      return printSetStatement(path, options, print, node);
    case "SingleTokenStatement":
      return printSingleTokenStatement(path, options, print, node);
    case "StringLiteral":
      return printStringLiteral(path, options, print, node);
    case "StructLiteral":
      return printStructLiteral(path, options, print, node);
    case "Symbol":
      return printSymbol(path, options, print, node);
    case "TableSampleClause":
      return printTableSampleClause(path, options, print, node);
    case "TableSampleRatio":
      return printTableSampleRatio(path, options, print, node);
    case "TruncateStatement":
      return printTruncateStatement(path, options, print, node);
    case "Type":
      return printType(path, options, print, node);
    case "TypeDeclaration":
      return printTypeDeclaration(path, options, print, node);
    case "UnaryOperator":
      return printUnaryOperator(path, options, print, node);
    case "UnpivotConfig":
      return printUnpivotConfig(path, options, print, node);
    case "UnpivotOperator":
      return printUnpivotOperator(path, options, print, node);
    case "UpdateStatement":
      return printUpdateStatement(path, options, print, node);
    case "WhenClause":
      return printWhenClause(path, options, print, node);
    case "WhileStatement":
      return printWhileStatement(path, options, print, node);
    case "WindowClause":
      return printWindowClause(path, options, print, node);
    case "WindowExpr":
      return printWindowExpr(path, options, print, node);
    case "WindowFrameClause":
      return printWindowFrameClause(path, options, print, node);
    case "WindowSpecification":
      return printWindowSpecification(path, options, print, node);
    case "WithClause":
      return printWithClause(path, options, print, node);
    case "WithPartitionColumnsClause":
      return printWithPartitionColumnsClause(path, options, print, node);
    case "WithQuery":
      return printWithQuery(path, options, print, node);
    case "XXXByExprs":
      return printXXXByExprs(path, options, print, node);
    default:
      return "not implemented";
  }
};

const printAddColumnClause: PrintFunc<bq2cst.AddColumnClause> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<bq2cst.AddColumnClause>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print, node),
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

const printAlterColumnStatement: PrintFunc<bq2cst.AlterColumnStatement> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<bq2cst.AlterColumnStatement>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print, node),
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

const printAlterSchemaStatement: PrintFunc<bq2cst.AlterSchemaStatement> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<bq2cst.AlterSchemaStatement>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print, node),
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

const printAlterTableStatement: PrintFunc<bq2cst.AlterTableStatement> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<bq2cst.AlterTableStatement>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print, node),
    what: p.child("what", asItIs, true),
    if_exists: p.child("if_exists", (x) => group([line, x])),
    ident: p.child("ident", asItIs, true),
    // SET
    set: p.child("set"),
    options: p.child("options", asItIs, true),
    // ADD COLUMNS
    add_columns: p.child("add_columns", (x) => [line, x]),
    // RENAMTE TO
    rename: p.child("rename"),
    to: p.child("to", asItIs, true),
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
      p.has("rename") ? line : "",
      docs.rename,
      p.has("rename") ? " " : "",
      docs.to,
      docs.drop_columns,
      p.has("alter_column_stmt") ? hardline : "",
      docs.alter_column_stmt,
      softline,
      docs.semicolon,
    ]),
    p.newLine(),
  ];
};

const printAlterViewStatement: PrintFunc<bq2cst.AlterViewStatement> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<bq2cst.AlterViewStatement>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print, node),
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

const printAsterisk: PrintFunc<bq2cst.Asterisk> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<bq2cst.Asterisk>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self(),
    trailing_comments: printTrailingComments(path, options, print, node),
    except: p.child("except", (x) => [" ", x], true),
    replace: p.child("replace", (x) => [" ", x], true),
    as: "", // eslint-disable-line unicorn/no-unused-properties
    alias: printAlias(path, options, print, node),
    comma: printComma(path, options, print, node),
  };
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

const printArrayAccessing: PrintFunc<bq2cst.ArrayAccessing> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<bq2cst.ArrayAccessing>]: Doc } = {
    leading_comments: "", // eslint-disable-line unicorn/no-unused-properties
    left: p.child("left"),
    self: p.self("asItIs", true),
    trailing_comments: printTrailingComments(path, options, print, node),
    right: p.child("right"),
    rparen: p.child("rparen"),
    as: "", // eslint-disable-line unicorn/no-unused-properties
    alias: printAlias(path, options, print, node),
    order: printOrder(path, options, print, node),
    null_order: "", // eslint-disable-line unicorn/no-unused-properties
    comma: printComma(path, options, print, node),
  };
  return [
    group([
      docs.left,
      docs.self,
      docs.trailing_comments,
      indent([softline, docs.right]),
      softline,
      docs.rparen,
      docs.alias,
      docs.order,
    ]),
    docs.comma,
  ];
};

const printArrayLiteral: PrintFunc<bq2cst.ArrayLiteral> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<bq2cst.ArrayLiteral>]: Doc } = {
    type: p.child("type"),
    leading_comments: p.has("type")
      ? ""
      : printLeadingComments(path, options, print, node),
    self: p.has("type") ? p.self("asItIs", true) : p.self(),
    trailing_comments: printTrailingComments(path, options, print, node),
    exprs: p.child("exprs", (x) => group(x), false, line),
    rparen: p.child("rparen"),
    as: "", // eslint-disable-line unicorn/no-unused-properties
    alias: printAlias(path, options, print, node),
    order: printOrder(path, options, print, node),
    null_order: "", // eslint-disable-line unicorn/no-unused-properties
    comma: printComma(path, options, print, node),
  };
  return [
    group([
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
      ]),
    ]),
    docs.comma,
  ];
};

const printAssertStatement: PrintFunc<bq2cst.AssertStatement> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<bq2cst.AssertStatement>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print, node),
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

const printBeginStatement: PrintFunc<bq2cst.BeginStatement> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node, node.children);
  p.setNotRoot("stmts");
  const docs: { [Key in Docs<bq2cst.BeginStatement>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print, node),
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

const printBetweenOperator: PrintFunc<bq2cst.BetweenOperator> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<bq2cst.BetweenOperator>]: Doc } = {
    leading_comments: "", // eslint-disable-line unicorn/no-unused-properties
    left: p.child("left"),
    not: p.child("not", asItIs, true),
    self: p.self("upper", true),
    trailing_comments: printTrailingComments(path, options, print, node),
    right_min: p.child("right_min"),
    and: p.child("and"),
    right_max: p.child("right_max", asItIs, true),
    as: "", // eslint-disable-line unicorn/no-unused-properties
    alias: printAlias(path, options, print, node),
    order: printOrder(path, options, print, node),
    null_order: "", // eslint-disable-line unicorn/no-unused-properties
    comma: printComma(path, options, print, node),
  };
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
    ]),
    docs.comma,
  ];
};

const printBooleanLiteral: PrintFunc<bq2cst.BooleanLiteral> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<bq2cst.BooleanLiteral>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self(),
    trailing_comments: printTrailingComments(path, options, print, node),
    as: "", // eslint-disable-line unicorn/no-unused-properties
    alias: printAlias(path, options, print, node),
    order: printOrder(path, options, print, node),
    null_order: "", // eslint-disable-line unicorn/no-unused-properties
    comma: printComma(path, options, print, node),
  };
  return [
    docs.leading_comments,
    docs.self,
    docs.trailing_comments,
    docs.alias,
    docs.order,
    docs.comma,
  ];
};

const printBinaryOperator: PrintFunc<bq2cst.BinaryOperator> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node, node.children);
  p.setNotRoot("right");
  const docs: { [Key in Docs<bq2cst.BinaryOperator>]: Doc } = {
    leading_comments: "", // eslint-disable-line unicorn/no-unused-properties
    left: p.child("left"),
    not: p.child("not", asItIs, true),
    self: p.self("upper", true),
    trailing_comments: printTrailingComments(path, options, print, node),
    right: p.child("right", asItIs, true),
    as: "", // eslint-disable-line unicorn/no-unused-properties
    alias: printAlias(path, options, print, node),
    order: printOrder(path, options, print, node),
    null_order: "", // eslint-disable-line unicorn/no-unused-properties
    comma: printComma(path, options, print, node),
  };
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

const printCallingFunction: PrintFunc<bq2cst.CallingFunction> = (
  path,
  options,
  print,
  node
) => {
  return printCallingFunctionGeneral(path, options, print, node);
};

const printCallingFunctionGeneral: PrintFunc<bq2cst.CallingFunctionGeneral> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node, node.children);
  p.setNotRoot("args");

  let func = node.children.func.Node;
  let parent;
  let grandParent;
  if (node.isDatePart) {
    p.toUpper("func");
    p.toUpper("args");
  }

  if (func.node_type === "Identifier") {
    // SUBSTR("foo", 0, 2)
    if (globalFunctions.includes(func.token.literal.toUpperCase())) {
      func.isPreDefinedFunction = true;
    }
  } else if (func.node_type === "DotOperator") {
    parent = func.children.left.Node;
    func = func.children.right.Node;
    if (parent.node_type === "Identifier") {
      // SAFE.SUBSTR("foo", 0, 2)
      // KEYS.NEW_KEYSET('AEAD_AES_GCM_256')
      switch (parent.token.literal.toUpperCase()) {
        case "SAFE":
          if (globalFunctions.includes(func.token.literal.toUpperCase())) {
            func.isPreDefinedFunction = true;
            parent.token.literal = parent.token.literal.toUpperCase();
          }
          break;
        case "KEYS":
          if (keysFunctions.includes(func.token.literal.toUpperCase())) {
            func.isPreDefinedFunction = true;
            parent.token.literal = parent.token.literal.toUpperCase();
          }
          break;
        case "AEAD":
          if (aeadFunctions.includes(func.token.literal.toUpperCase())) {
            func.isPreDefinedFunction = true;
            parent.token.literal = parent.token.literal.toUpperCase();
          }
          break;
        case "NET":
          if (netFunctions.includes(func.token.literal.toUpperCase())) {
            func.isPreDefinedFunction = true;
            parent.token.literal = parent.token.literal.toUpperCase();
          }
          break;
        case "HLL_COUNT":
          if (hllCountFunctions.includes(func.token.literal.toUpperCase())) {
            func.isPreDefinedFunction = true;
            parent.token.literal = parent.token.literal.toUpperCase();
          }
          break;
      }
    } else if (parent.node_type === "DotOperator") {
      // SAFE.KEYS.NEW_KEYSET('AEAD_AES_GCM_256')
      grandParent = parent.children.left.Node;
      parent = parent.children.right.Node;
      if (grandParent.token.literal.toUpperCase() === "SAFE") {
        switch (parent.token.literal.toUpperCase()) {
          case "KEYS":
            if (keysFunctions.includes(func.token.literal.toUpperCase())) {
              func.isPreDefinedFunction = true;
              parent.token.literal = parent.token.literal.toUpperCase();
              grandParent.token.literal =
                grandParent.token.literal.toUpperCase();
            }
            break;
          case "AEAD":
            if (aeadFunctions.includes(func.token.literal.toUpperCase())) {
              func.isPreDefinedFunction = true;
              parent.token.literal = parent.token.literal.toUpperCase();
              grandParent.token.literal =
                grandParent.token.literal.toUpperCase();
            }
            break;
          case "NET":
            if (netFunctions.includes(func.token.literal.toUpperCase())) {
              func.isPreDefinedFunction = true;
              parent.token.literal = parent.token.literal.toUpperCase();
              grandParent.token.literal =
                grandParent.token.literal.toUpperCase();
            }
            break;
          case "HLL_COUNT":
            if (hllCountFunctions.includes(func.token.literal.toUpperCase())) {
              func.isPreDefinedFunction = true;
              parent.token.literal = parent.token.literal.toUpperCase();
              grandParent.token.literal =
                grandParent.token.literal.toUpperCase();
            }
            break;
        }
      }
    }
  }
  if (func.isPreDefinedFunction) {
    const func_literal = func.token.literal.toUpperCase();
    const args = node.children.args;
    if (args) {
      // NORMALIZE
      if (
        ["NORMALIZE", "NORMALIZE_AND_CASEFOLD"].includes(func_literal) &&
        2 <= p.len("args")
      ) {
        args.NodeVec[1].token.literal =
          args.NodeVec[1].token.literal.toUpperCase();
      }
      // XXX_DIFF
      if (
        ["DATE_DIFF", "DATETIME_DIFF", "TIME_DIFF", "TIMESTAMP_DIFF"].includes(
          func_literal
        )
      ) {
        args.NodeVec[2].isDatePart = true;
      }
      // XXX_TRUNC
      if (
        [
          "DATE_TRUNC",
          "DATETIME_TRUNC",
          "TIME_TRUNC",
          "TIMESTAMP_TRUNC",
        ].includes(func_literal)
      ) {
        args.NodeVec[1].isDatePart = true;
      }
      // LAST_DAY
      if (func === "LAST_DAY" && 2 <= p.len("args")) {
        args.NodeVec[1].isDatePart = true;
      }
    }
  }

  const docs: { [Key in Docs<bq2cst.CallingFunctionGeneral>]: Doc } = {
    leading_comments: "", // eslint-disable-line unicorn/no-unused-properties
    func: p.child("func"),
    self: p.self("asItIs", true),
    trailing_comments: printTrailingComments(path, options, print, node),
    distinct: p.child("distinct", (x) => [x, line]),
    args: p.child("args", (x) => group(x), false, line),
    ignore_nulls: p.child("ignore_nulls", asItIs, false, " "),
    orderby: p.child("orderby"),
    limit: p.child("limit"),
    rparen: p.child("rparen"),
    over: p.child("over", (x) => [" ", x], true),
    as: "", // eslint-disable-line unicorn/no-unused-properties
    alias: printAlias(path, options, print, node),
    order: printOrder(path, options, print, node),
    null_order: "", // eslint-disable-line unicorn/no-unused-properties
    comma: printComma(path, options, print, node),
  };
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

const printCallingUnnest: PrintFunc<bq2cst.CallingUnnest> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<bq2cst.CallingUnnest>]: Doc } = {
    self: printCallingFunctionGeneral(path, options, print, node),
    with_offset: p.child("with_offset", (x) => group([line, x])),
    offset_as: p.child("offset_as", asItIs, true),
    offset_alias: p.child("offset_alias", asItIs, true),
    pivot: printPivotOrUnpivotOperator(path, options, print, node),
    unpivot: "", // eslint-disable-line unicorn/no-unused-properties

    /* eslint-disable unicorn/no-unused-properties */
    leading_comments: "",
    func: "",
    trailing_comments: "",
    args: "",
    rparen: "",
    as: "",
    alias: "",
    /* eslint-enable unicorn/no-unused-properties */
  };
  return [
    docs.self,
    docs.with_offset,
    p.has("offset_alias") ? [" ", docs.offset_as || "AS"] : "",
    p.has("offset_alias") ? [" ", docs.offset_alias] : "",
    docs.pivot,
  ];
};

const printCallStatement: PrintFunc<bq2cst.CallStatement> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<bq2cst.CallStatement>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print, node),
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

const printCaseArm: PrintFunc<bq2cst.CaseArm> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<bq2cst.CaseArm>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self(),
    trailing_comments: printTrailingComments(path, options, print, node),
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

const printCaseExpr: PrintFunc<bq2cst.CaseExpr> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<bq2cst.CaseExpr>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self(),
    trailing_comments: printTrailingComments(path, options, print, node),
    expr: p.child("expr", asItIs, true),
    arms: p.child("arms", (x) => group(x), false, line),
    end: p.child("end", asItIs, true),
    as: "", // eslint-disable-line unicorn/no-unused-properties
    alias: printAlias(path, options, print, node),
    order: printOrder(path, options, print, node),
    null_order: "", // eslint-disable-line unicorn/no-unused-properties
    comma: printComma(path, options, print, node),
  };
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

const printCastArgument: PrintFunc<bq2cst.CastArgument> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<bq2cst.CastArgument>]: Doc } = {
    leading_comments: "", // eslint-disable-line unicorn/no-unused-properties
    cast_from: p.child("cast_from"),
    self: p.self("upper", true),
    trailing_comments: printTrailingComments(path, options, print, node),
    cast_to: p.child("cast_to", asItIs, true),
  };
  return [
    docs.cast_from,
    " ",
    docs.self,
    docs.trailing_comments,
    " ",
    docs.cast_to,
  ];
};

const printComment: PrintFunc<bq2cst.Comment> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<bq2cst.Comment>]: Doc } = {
    self: p.self(),
  };
  return docs.self;
};

const printCreateFunctionStatement: PrintFunc<bq2cst.CreateFunctionStatement> =
  (path, options, print, node) => {
    const p = new Printer(path, options, print, node, node.children);
    p.setLiteral("temp", "TEMP");
    const docs: { [Key in Docs<bq2cst.CreateFunctionStatement>]: Doc } = {
      leading_comments: printLeadingComments(path, options, print, node),
      self: p.self("upper"),
      trailing_comments: printTrailingComments(path, options, print, node),
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

const printCreateProcedureStatement: PrintFunc<bq2cst.CreateProcedureStatement> =
  (path, options, print, node) => {
    const p = new Printer(path, options, print, node, node.children);
    p.setNotRoot("stmt");
    const docs: { [Key in Docs<bq2cst.CreateProcedureStatement>]: Doc } = {
      leading_comments: printLeadingComments(path, options, print, node),
      self: p.self("upper"),
      trailing_comments: printTrailingComments(path, options, print, node),
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

const printCreateSchemaStatement: PrintFunc<bq2cst.CreateSchemaStatement> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<bq2cst.CreateSchemaStatement>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print, node),
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

const printCreateTableStatement: PrintFunc<bq2cst.CreateTableStatement> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node, node.children);
  p.setLiteral("temp", "TEMP");
  const docs: { [Key in Docs<bq2cst.CreateTableStatement>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print, node),
    or_replace: p.child("or_replace", (x) => group([line, x])),
    temp: p.child("temp", asItIs, true),
    external: p.child("external", asItIs, true),
    snapshot: p.child("snapshot", asItIs, true),
    what: p.child("what", asItIs, true),
    if_not_exists: p.child("if_not_exists", (x) => group([line, x])),
    ident: p.child("ident", asItIs, true),
    column_schema_group: p.child("column_schema_group", asItIs, true),
    partitionby: p.child("partitionby"),
    clusterby: p.child("clusterby"),
    with_partition_columns: p.child("with_partition_columns"),
    clone: p.child("clone"),
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
      p.has("temp") ? " " : "",
      docs.temp,
      p.has("external") ? " " : "",
      docs.external,
      p.has("snapshot") ? " " : "",
      docs.snapshot,
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
      p.has("clone") ? line : "",
      docs.clone,
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

const printCreateViewStatement: PrintFunc<bq2cst.CreateViewStatement> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<bq2cst.CreateViewStatement>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print, node),
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

const printDeclareStatement: PrintFunc<bq2cst.DeclareStatement> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<bq2cst.DeclareStatement>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print, node),
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

const printDeleteStatement: PrintFunc<bq2cst.DeleteStatement> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<bq2cst.DeleteStatement>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print, node),
    from: p.consumeAllCommentsOfX("from"),
    table_name: p.child("table_name", asItIs, true),
    where: p.child("where"),
    semicolon: p.child("semicolon"),
  };
  return [
    docs.leading_comments,
    group([
      docs.self,
      docs.trailing_comments,
      docs.from,
      " ",
      docs.table_name,
      line,
      docs.where,
      softline,
      docs.semicolon,
    ]),
    p.newLine(),
  ];
};

const printDotOperator: PrintFunc<bq2cst.DotOperator> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node, node.children);
  p.setNotGlobal("right");
  const docs: { [Key in Docs<bq2cst.DotOperator>]: Doc } = {
    leading_comments: "", // eslint-disable-line unicorn/no-unused-properties
    left: p.child("left"),
    self: p.self("upper", true),
    trailing_comments: printTrailingComments(path, options, print, node),
    right: p.child("right", asItIs, true),
    as: "", // eslint-disable-line unicorn/no-unused-properties
    alias: printAlias(path, options, print, node),
    for_system_time_as_of: p.child("for_system_time_as_of", asItIs, true),
    pivot: printPivotOrUnpivotOperator(path, options, print, node),
    unpivot: "", // eslint-disable-line unicorn/no-unused-properties
    tablesample: p.child("tablesample", asItIs, true),
    order: printOrder(path, options, print, node),
    null_order: "", // eslint-disable-line unicorn/no-unused-properties
    comma: printComma(path, options, print, node),
  };
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

const printDropColumnClause: PrintFunc<bq2cst.DropColumnClause> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<bq2cst.DropColumnClause>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print, node),
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

const printDropStatement: PrintFunc<bq2cst.DropStatement> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<bq2cst.DropStatement>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print, node),
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

const printElseIfClause: PrintFunc<bq2cst.ElseIfClause> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<bq2cst.ElseIfClause>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print, node),
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

const printEOF: PrintFunc<bq2cst.EOF> = (path, options, print, node) => {
  const docs: { [Key in Docs<bq2cst.EOF>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: "", // eslint-disable-line unicorn/no-unused-properties
  };
  return docs.leading_comments;
};

const printExecuteStatement: PrintFunc<bq2cst.ExecuteStatement> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<bq2cst.ExecuteStatement>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print, node),
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

const printExportStatement: PrintFunc<bq2cst.ExportStatement> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<bq2cst.ExportStatement>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print, node),
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

const printExtractArgument: PrintFunc<bq2cst.ExtractArgument> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node, node.children);
  node.children.extract_datepart.Node.isDatePart = true;
  const docs: { [Key in Docs<bq2cst.ExtractArgument>]: Doc } = {
    leading_comments: "", // eslint-disable-line unicorn/no-unused-properties
    extract_datepart: p.child("extract_datepart"),
    self: p.self("upper", true),
    trailing_comments: printTrailingComments(path, options, print, node),
    extract_from: p.child("extract_from", asItIs, true),
    at_time_zone: p.child("at_time_zone", asItIs, false, " "),
    time_zone: p.child("time_zone", asItIs, true),
  };
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

const printForSystemTimeAsOfclause: PrintFunc<bq2cst.ForSystemTimeAsOfClause> =
  (path, options, print, node) => {
    const p = new Printer(path, options, print, node, node.children);
    const docs: { [Key in Docs<bq2cst.ForSystemTimeAsOfClause>]: Doc } = {
      leading_comments: printLeadingComments(path, options, print, node),
      self: p.self("upper"),
      trailing_comments: printTrailingComments(path, options, print, node),
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

const printGroupedExpr: PrintFunc<bq2cst.GroupedExpr> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<bq2cst.GroupedExpr>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self(),
    trailing_comments: printTrailingComments(path, options, print, node),
    expr: p.child("expr"),
    rparen: p.child("rparen"),
    as: "", // eslint-disable-line unicorn/no-unused-properties
    alias: printAlias(path, options, print, node),
    pivot: printPivotOrUnpivotOperator(path, options, print, node),
    unpivot: "", // eslint-disable-line unicorn/no-unused-properties
    order: printOrder(path, options, print, node),
    null_order: "", // eslint-disable-line unicorn/no-unused-properties
    comma: printComma(path, options, print, node),
  };
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

const printGroupedExprs: PrintFunc<bq2cst.GroupedExprs> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<bq2cst.GroupedExprs>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self(),
    trailing_comments: printTrailingComments(path, options, print, node),
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
    ]),
    docs.comma,
  ];
};

const printGroupedStatement: PrintFunc<bq2cst.GroupedStatement> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node, node.children);
  p.setNotRoot("stmt");
  const docs: { [Key in Docs<bq2cst.GroupedStatement>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self(),
    trailing_comments: printTrailingComments(path, options, print, node),
    stmt: p.child("stmt"),
    rparen: p.child("rparen"),
    as: "", // eslint-disable-line unicorn/no-unused-properties
    alias: printAlias(path, options, print, node),
    pivot: printPivotOrUnpivotOperator(path, options, print, node),
    unpivot: "", // eslint-disable-line unicorn/no-unused-properties
    order: printOrder(path, options, print, node),
    null_order: "", // eslint-disable-line unicorn/no-unused-properties
    comma: printComma(path, options, print, node),
    semicolon: p.child("semicolon", asItIs, true),
  };
  return [
    docs.leading_comments,
    group([
      docs.self,
      indent([softline, group([docs.trailing_comments, docs.stmt])]),
      softline,
      docs.rparen,
      docs.pivot,
    ]),
    docs.alias,
    docs.order,
    docs.comma,
    docs.semicolon,
    p.newLine(),
  ];
};

const printGroupedType: PrintFunc<bq2cst.GroupedType> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<bq2cst.GroupedType>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self(),
    trailing_comments: printTrailingComments(path, options, print, node),
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

const printGroupedTypeDeclarations: PrintFunc<bq2cst.GroupedTypeDeclarations> =
  (path, options, print, node) => {
    const p = new Printer(path, options, print, node, node.children);
    const docs: { [Key in Docs<bq2cst.GroupedTypeDeclarations>]: Doc } = {
      leading_comments: printLeadingComments(path, options, print, node),
      self: p.self(),
      trailing_comments: printTrailingComments(path, options, print, node),
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

const printIdentifier: PrintFunc<bq2cst.Identifier | bq2cst.Parameter> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<bq2cst.Identifier>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self:
      node.isPreDefinedFunction || node.isDatePart ? p.self("upper") : p.self(),
    trailing_comments: printTrailingComments(path, options, print, node),
    as: "", // eslint-disable-line unicorn/no-unused-properties
    alias: printAlias(path, options, print, node),
    for_system_time_as_of: p.child("for_system_time_as_of", asItIs, true),
    pivot: printPivotOrUnpivotOperator(path, options, print, node),
    unpivot: "", // eslint-disable-line unicorn/no-unused-properties
    tablesample: p.child("tablesample", asItIs, true),
    order: printOrder(path, options, print, node),
    null_order: "", // eslint-disable-line unicorn/no-unused-properties
    comma: printComma(path, options, print, node),
  };
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

const printIfStatement: PrintFunc<bq2cst.IfStatement> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<bq2cst.IfStatement>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print, node),
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

const printInOperator: PrintFunc<bq2cst.InOperator> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<bq2cst.InOperator>]: Doc } = {
    leading_comments: "", // eslint-disable-line unicorn/no-unused-properties
    left: p.child("left"),
    not: p.child("not"),
    self: p.self("asItIs", true),
    trailing_comments: printTrailingComments(path, options, print, node),
    right: p.child("right", asItIs, true),
    as: "", // eslint-disable-line unicorn/no-unused-properties
    alias: printAlias(path, options, print, node),
    order: printOrder(path, options, print, node),
    null_order: "", // eslint-disable-line unicorn/no-unused-properties
    comma: printComma(path, options, print, node),
  };
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

const printInsertStatement: PrintFunc<bq2cst.InsertStatement> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node, node.children);
  p.setNotRoot("input");
  const docs: { [Key in Docs<bq2cst.InsertStatement>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print, node),
    into: p.consumeAllCommentsOfX("into"),
    target_name: p.child("target_name", asItIs, true),
    columns: p.child("columns", asItIs, true),
    input: p.child("input"),
    semicolon: p.child("semicolon"),
  };
  return [
    docs.leading_comments,
    group([
      docs.self,
      docs.trailing_comments,
      docs.into,
      p.has("target_name") ? " " : "",
      docs.target_name,
      p.has("columns") ? " " : "",
      docs.columns,
      line,
      docs.input,
      softline,
      docs.semicolon,
    ]),
    p.newLine(),
  ];
};

const printIntervalLiteral: PrintFunc<bq2cst.IntervalLiteral> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<bq2cst.IntervalLiteral>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print, node),
    right: p.child("right", asItIs, true),
    date_part: p.child("date_part", asItIs, true),
    as: "", // eslint-disable-line unicorn/no-unused-properties
    alias: printAlias(path, options, print, node),
    comma: printComma(path, options, print, node),
  };
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

const printJoinOperator: PrintFunc<bq2cst.JoinOperator> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node, node.children);
  p.setNotRoot("left");
  p.setNotRoot("right");
  const docs: { [Key in Docs<bq2cst.JoinOperator>]: Doc } = {
    leading_comments: "", // eslint-disable-line unicorn/no-unused-properties
    left: p.child("left"),
    join_type: p.child("join_type"),
    outer: p.consumeAllCommentsOfX("outer"),
    self: p.self("upper", true),
    trailing_comments: printTrailingComments(path, options, print, node),
    right: p.child("right", asItIs, true),
    on: p.child("on", asItIs, true),
    using: p.child("using", asItIs, true),
    as: "", // eslint-disable-line unicorn/no-unused-properties
    alias: printAlias(path, options, print, node),
    pivot: printPivotOrUnpivotOperator(path, options, print, node),
    unpivot: "", // eslint-disable-line unicorn/no-unused-properties
  };
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

const printKeyword: PrintFunc<bq2cst.Keyword> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<bq2cst.Keyword>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print, node),
  };
  return [docs.leading_comments, docs.self, docs.trailing_comments];
};

const printKeywordWithExpr: PrintFunc<bq2cst.KeywordWithExpr> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node, node.children);
  p.setNotRoot("expr");
  p.setBreakRecommended("expr");
  const docs: { [Key in Docs<bq2cst.KeywordWithExpr>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print, node),
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

const printKeywordWithExprs: PrintFunc<bq2cst.KeywordWithExprs> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<bq2cst.KeywordWithExprs>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print, node),
    exprs: p.child("exprs", (x) => [line, x]),
  };
  let res: Doc = [docs.self, docs.trailing_comments, indent(docs.exprs)];
  if (p.len("exprs") === 1) {
    res = group(res);
  }
  return [docs.leading_comments, res];
};

const printKeywordWithGroupedXXX: PrintFunc<bq2cst.KeywordWithGroupedXXX> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<bq2cst.KeywordWithGroupedXXX>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print, node),
    group: p.child("group", asItIs, true),
  };
  return [
    docs.leading_comments,
    group([docs.self, docs.trailing_comments, " ", docs.group]),
  ];
};

const printKeywordWithStatement: PrintFunc<bq2cst.KeywordWithStatement> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node, node.children);
  p.setNotRoot("stmt");
  const docs: { [Key in Docs<bq2cst.KeywordWithStatement>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print, node),
    stmt: p.child("stmt"),
  };
  return [
    docs.leading_comments,
    group([docs.self, docs.trailing_comments, indent([line, docs.stmt])]),
  ];
};

const printKeywordWithStatements: PrintFunc<bq2cst.KeywordWithStatements> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node, node.children);
  p.setNotRoot("stmts");
  const docs: { [Key in Docs<bq2cst.KeywordWithStatements>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print, node),
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

const printKeywordWithType: PrintFunc<bq2cst.KeywordWithType> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<bq2cst.KeywordWithType>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print, node),
    type: p.child("type"),
  };
  return [
    docs.leading_comments,
    group([docs.self, docs.trailing_comments, indent([line, docs.type])]),
  ];
};

const printLanguageSpecifier: PrintFunc<bq2cst.LanguageSpecifier> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<bq2cst.LanguageSpecifier>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print, node),
    language: p.child("language"),
  };
  return [
    docs.leading_comments,
    group([docs.self, docs.trailing_comments, indent([line, docs.language])]),
  ];
};

const printLimitClause: PrintFunc<bq2cst.LimitClause> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node, node.children);
  p.setNotRoot("expr");
  const docs: { [Key in Docs<bq2cst.LimitClause>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print, node),
    expr:
      !p.hasLeadingComments("expr") &&
      ["GroupedStatement"].includes(node.children.expr.Node.node_type)
        ? [" ", p.child("expr", asItIs, true)] // in the case of `FROM (SELECT ...)`
        : indent([line, p.child("expr")]),
    offset: p.child("offset", asItIs, true),
  };
  return [
    docs.leading_comments,
    group([docs.self, docs.trailing_comments, docs.expr]),
    p.has("offset") ? " " : "",
    docs.offset,
  ];
};

const printLoopStatement: PrintFunc<bq2cst.LoopStatement> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node, node.children);
  p.setNotRoot("stmts");
  const docs: { [Key in Docs<bq2cst.LoopStatement>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print, node),
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

const printMergeStatement: PrintFunc<bq2cst.MergeStatement> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<bq2cst.MergeStatement>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print, node),
    into: p.consumeAllCommentsOfX("into"),
    table_name: p.child("table_name", asItIs, true),
    using: p.child("using"),
    on: p.child("on"),
    whens: p.child("whens", (x) => [line, x]),
    semicolon: p.child("semicolon"),
  };
  return [
    docs.leading_comments,
    group([
      docs.self,
      docs.trailing_comments,
      docs.into,
      " ",
      docs.table_name,
      line,
      docs.using,
      line,
      docs.on,
      docs.whens,
      softline,
      docs.semicolon,
    ]),
    p.newLine(),
  ];
};

const printNullLiteral: PrintFunc<bq2cst.NullLiteral> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<bq2cst.NullLiteral>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print, node),
    as: "", // eslint-disable-line unicorn/no-unused-properties
    alias: printAlias(path, options, print, node),
    order: printOrder(path, options, print, node),
    null_order: "", // eslint-disable-line unicorn/no-unused-properties
    comma: printComma(path, options, print, node),
  };
  return [
    docs.leading_comments,
    docs.self,
    docs.trailing_comments,
    docs.alias,
    docs.order,
    docs.comma,
  ];
};

const printNumericLiteral: PrintFunc<bq2cst.NumericLiteral> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<bq2cst.NumericLiteral>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self("lower"), // in the case of `3.14e10`
    trailing_comments: printTrailingComments(path, options, print, node),
    as: "", // eslint-disable-line unicorn/no-unused-properties
    alias: printAlias(path, options, print, node),
    order: printOrder(path, options, print, node),
    null_order: "", // eslint-disable-line unicorn/no-unused-properties
    comma: printComma(path, options, print, node),
  };
  return [
    docs.leading_comments,
    docs.self,
    docs.trailing_comments,
    docs.alias,
    docs.order,
    docs.comma,
  ];
};

const printOverClause: PrintFunc<bq2cst.OverClause> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<bq2cst.OverClause>]: Doc } = {
    leading_comments: "", // eslint-disable-line unicorn/no-unused-properties
    self: p.self("upper", true),
    trailing_comments: printTrailingComments(path, options, print, node),
    window: p.child("window", (x) => [" ", x], true),
  };
  return group([docs.self, docs.trailing_comments, docs.window]);
};

const printPivotConfig: PrintFunc<bq2cst.PivotConfig> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<bq2cst.PivotConfig>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print, node),
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

const printPivotOperator: PrintFunc<bq2cst.PivotOperator> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<bq2cst.PivotOperator>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print, node),
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

const printRaiseStatement: PrintFunc<bq2cst.RaiseStatement> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<bq2cst.RaiseStatement>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print, node),
    using: p.child("using", asItIs, true),
    semicolon: p.child("semicolon"),
  };
  return [
    docs.leading_comments,
    group([
      docs.self,
      docs.trailing_comments,
      p.has("using") ? " " : "",
      docs.using,
      softline,
      docs.semicolon,
    ]),
    p.newLine(),
  ];
};

const printSelectStatement: PrintFunc<bq2cst.SelectStatement> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node, node.children);
  p.setNotRoot("exprs");
  node.children.exprs.NodeVec[p.len("exprs") - 1].isFinalColumn = true;
  const docs: { [Key in Docs<bq2cst.SelectStatement>]: Doc } = {
    with: p.child("with"),
    leading_comments: printLeadingComments(path, options, print, node),
    // SELECT clause
    self: p.self("upper"),
    as_struct_or_value: p.child("as_struct_or_value", asItIs, true, " "),
    distinct_or_all: p.child("distinct_or_all"),
    trailing_comments: printTrailingComments(path, options, print, node),
    exprs: p.child("exprs", (x) => [line, x]),
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

const printSetOperator: PrintFunc<bq2cst.SetOperator> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node, node.children);
  p.setNotRoot("left");
  p.setNotRoot("right");
  const docs: { [Key in Docs<bq2cst.SetOperator>]: Doc } = {
    left: p.child("left"),
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print, node),
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

const printSetStatement: PrintFunc<bq2cst.SetStatement> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<bq2cst.SetStatement>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print, node),
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

const printSingleTokenStatement: PrintFunc<bq2cst.SingleTokenStatement> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<bq2cst.SingleTokenStatement>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print, node),
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

const printStringLiteral: PrintFunc<bq2cst.StringLiteral> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<bq2cst.StringLiteral>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self(),
    trailing_comments: printTrailingComments(path, options, print, node),
    as: "", // eslint-disable-line unicorn/no-unused-properties
    alias: printAlias(path, options, print, node),
    order: printOrder(path, options, print, node),
    null_order: "", // eslint-disable-line unicorn/no-unused-properties
    comma: printComma(path, options, print, node),
  };
  return [
    docs.leading_comments,
    docs.self,
    docs.trailing_comments,
    docs.alias,
    docs.order,
    docs.comma,
  ];
};

const printStructLiteral: PrintFunc<bq2cst.StructLiteral> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<bq2cst.StructLiteral>]: Doc } = {
    type: p.child("type"),
    leading_comments: p.has("type")
      ? ""
      : printLeadingComments(path, options, print, node),
    self: p.has("type") ? p.self("asItIs", true) : p.self(),
    trailing_comments: printTrailingComments(path, options, print, node),
    exprs: p.child("exprs", (x) => group(x), false, line),
    rparen: p.child("rparen"),
    as: "", // eslint-disable-line unicorn/no-unused-properties
    alias: printAlias(path, options, print, node),
    order: printOrder(path, options, print, node),
    null_order: "", // eslint-disable-line unicorn/no-unused-properties
    comma: printComma(path, options, print, node),
  };
  return [
    group([
      docs.type,
      docs.leading_comments,
      group([
        docs.self,
        docs.trailing_comments,
        indent([softline, docs.exprs]),
        softline,
        docs.rparen,
      ]),
    ]),
    docs.alias,
    docs.order,
    docs.comma,
  ];
};

const printSymbol: PrintFunc<bq2cst.Symbol_> = (path, options, print, node) => {
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<bq2cst.Symbol_>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print, node),
  };
  return [docs.leading_comments, docs.self, docs.trailing_comments];
};

const printTableSampleClause: PrintFunc<bq2cst.TableSampleClause> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<bq2cst.TableSampleClause>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self("upper"),
    system: p.child("system", asItIs, true),
    trailing_comments: printTrailingComments(path, options, print, node),
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

const printTableSampleRatio: PrintFunc<bq2cst.TableSampleRatio> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<bq2cst.TableSampleRatio>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self("upper"),
    expr: p.child("expr", asItIs, true),
    trailing_comments: printTrailingComments(path, options, print, node),
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

const printTruncateStatement: PrintFunc<bq2cst.TruncateStatement> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<bq2cst.TruncateStatement>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self("upper"),
    table: p.child("table", asItIs, true),
    trailing_comments: printTrailingComments(path, options, print, node),
    table_name: p.child("table_name", asItIs, true),
    semicolon: p.child("semicolon", asItIs, true),
  };
  return [
    docs.leading_comments,
    docs.self,
    docs.trailing_comments,
    " ",
    docs.table,
    " ",
    docs.table_name,
    docs.semicolon,
    p.newLine(),
  ];
};

const printType: PrintFunc<bq2cst.Type> = (path, options, print, node) => {
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<bq2cst.Type>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print, node),
    type: p.child("type", asItIs, true),
    type_declaration: p.child("type_declaration", asItIs, true),
    parameter: p.child("parameter", asItIs, true),
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
    docs.parameter,
    docs.not_null,
    p.has("options") ? " " : "",
    docs.options,
  ];
};

const printTypeDeclaration: PrintFunc<bq2cst.TypeDeclaration> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<bq2cst.TypeDeclaration>]: Doc } = {
    leading_comments: "", // eslint-disable-line unicorn/no-unused-properties
    in_out: p.child("in_out"),
    self: p.self("asItIs", true),
    trailing_comments: printTrailingComments(path, options, print, node),
    type: p.child("type", asItIs, true),
    comma: p.child("comma", asItIs, true),
  };
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

const printUnaryOperator: PrintFunc<bq2cst.UnaryOperator> = (
  path,
  options,
  print,
  node
) => {
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
  const docs: { [Key in Docs<bq2cst.UnaryOperator>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.includedIn(lowerCaseOperators) ? p.self("lower") : p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print, node),
    right: p.child("right", asItIs, true),
    as: "", // eslint-disable-line unicorn/no-unused-properties
    alias: printAlias(path, options, print, node),
    order: printOrder(path, options, print, node),
    null_order: "", // eslint-disable-line unicorn/no-unused-properties
    comma: printComma(path, options, print, node),
  };
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

const printUnpivotConfig: PrintFunc<bq2cst.UnpivotConfig> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<bq2cst.UnpivotConfig>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print, node),
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

const printUnpivotOperator: PrintFunc<bq2cst.UnpivotOperator> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<bq2cst.UnpivotOperator>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self("upper"),
    include_or_exclude_nulls: p.child("include_or_exclude_nulls", (x) =>
      group([line, x])
    ),
    trailing_comments: printTrailingComments(path, options, print, node),
    config: p.child("config", asItIs, true),
    as: p.child("as", asItIs, true),
    alias: p.child("alias", asItIs, true),
  };
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

const printUpdateStatement: PrintFunc<bq2cst.UpdateStatement> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<bq2cst.UpdateStatement>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print, node),
    table_name: p.child("table_name", asItIs, true),
    set: p.child("set"),
    from: p.child("from"),
    where: p.child("where"),
    semicolon: p.child("semicolon"),
  };
  return [
    docs.leading_comments,
    group([
      docs.self,
      docs.trailing_comments,
      p.has("table_name") ? " " : "",
      docs.table_name,
      line,
      docs.set,
      p.has("from") ? line : "",
      docs.from,
      line,
      docs.where,
      softline,
      docs.semicolon,
    ]),
    p.newLine(),
  ];
};

const printWhenClause: PrintFunc<bq2cst.WhenClause> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<bq2cst.WhenClause>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self("upper"),
    not: p.child("not", asItIs, true),
    trailing_comments: printTrailingComments(path, options, print, node),
    matched: p.child("matched", asItIs, true),
    by_target_or_source: p.child("by_target_or_source", (x) =>
      group([line, x])
    ),
    and: p.child("and", asItIs, true),
    then: p.child("then", asItIs, true),
  };
  return [
    docs.leading_comments,
    group([
      group([
        docs.self,
        docs.trailing_comments,
        p.has("not") ? " " : "",
        docs.not,
        " ",
        docs.matched,
        docs.by_target_or_source,
        p.has("and") ? " " : "",
        docs.and,
        " ",
        docs.then,
      ]),
    ]),
  ];
};

const printWhileStatement: PrintFunc<bq2cst.WhileStatement> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node, node.children);
  p.setBreakRecommended("condition");
  const docs: { [Key in Docs<bq2cst.WhileStatement>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print, node),
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

const printWindowClause: PrintFunc<bq2cst.WindowClause> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<bq2cst.WindowClause>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print, node),
    window_exprs:
      p.len("window_exprs") === 1
        ? p.child("window_exprs", (x) => [" ", group(x)], true)
        : p.child("window_exprs", (x) => [line, group(x)]),
  };
  return [
    docs.leading_comments,
    docs.self,
    docs.trailing_comments,
    indent(docs.window_exprs),
  ];
};

const printWindowExpr: PrintFunc<bq2cst.WindowExpr> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<bq2cst.WindowExpr>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self(),
    trailing_comments: printTrailingComments(path, options, print, node),
    as: p.child("as", asItIs, true),
    window: p.child("window", asItIs, true),
    comma: p.child("comma", asItIs, true),
  };
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

const printWindowFrameClause: PrintFunc<bq2cst.WindowFrameClause> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<bq2cst.WindowFrameClause>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print, node),
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

const printWindowSpecification: PrintFunc<bq2cst.WindowSpecification> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node, node.children);
  const empty = !(
    p.has("name") ||
    p.has("partitionby") ||
    p.has("orderby") ||
    p.has("frame")
  );
  const docs: { [Key in Docs<bq2cst.WindowSpecification>]: Doc } = {
    leading_comments: "", // eslint-disable-line unicorn/no-unused-properties
    self: p.self("upper", true),
    trailing_comments: printTrailingComments(path, options, print, node),
    name: p.child("name"),
    partitionby: p.child("partitionby", (x) => group(x)),
    orderby: p.child("orderby", (x) => group(x)),
    frame: p.child("frame", (x) => group(x)),
    rparen: p.child("rparen", asItIs),
  };
  return [
    docs.self,
    docs.trailing_comments,
    indent([
      empty ? "" : softline,
      join(
        line,
        [docs.name, docs.partitionby, docs.orderby, docs.frame].filter((x) => x)
      ),
    ]),
    empty ? "" : softline,
    docs.rparen,
  ];
};

const printWithClause: PrintFunc<bq2cst.WithClause> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<bq2cst.WithClause>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print, node),
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

const printWithPartitionColumnsClause: PrintFunc<bq2cst.WithPartitionColumnsClause> =
  (path, options, print, node) => {
    const p = new Printer(path, options, print, node, node.children);
    const docs: { [Key in Docs<bq2cst.WithPartitionColumnsClause>]: Doc } = {
      leading_comments: printLeadingComments(path, options, print, node),
      self: p.self(),
      trailing_comments: printTrailingComments(path, options, print, node),
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

const printWithQuery: PrintFunc<bq2cst.WithQuery> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node, node.children);
  p.setNotRoot("stmt");
  const docs: { [Key in Docs<bq2cst.WithQuery>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self(),
    trailing_comments: printTrailingComments(path, options, print, node),
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

const printXXXByExprs: PrintFunc<bq2cst.XXXByExprs> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node, node.children);
  const docs: { [Key in Docs<bq2cst.XXXByExprs>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print, node),
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
const printAlias: PrintFunc<bq2cst.Expr> = (path, options, print, node) => {
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

const printComma: PrintFunc<bq2cst.Expr> = (path, options, print, node) => {
  const p = new Printer(path, options, print, node, node.children);
  if (p.node.isFinalColumn) {
    return ifBreak(
      p.child("comma", asItIs, true) || ",",
      p.consumeAllCommentsOfX("comma")
    );
  } else {
    return p.child("comma", asItIs, true);
  }
};

const printLeadingComments: PrintFunc<bq2cst.BaseNode> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node, node.children);
  return p.child("leading_comments", (x) => [x, hardline]);
};

const printOrder: PrintFunc<bq2cst.Expr> = (path, options, print, node) => {
  const p = new Printer(path, options, print, node, node.children);
  return [
    p.has("order") ? [" ", p.child("order", asItIs, true)] : "",
    p.has("null_order") ? p.child("null_order", (x) => group([line, x])) : "",
  ];
};

const printPivotOrUnpivotOperator: PrintFunc<bq2cst.FromItemExpr> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node, node.children);
  const pivot = p.has("pivot") ? [" ", p.child("pivot", asItIs, true)] : "";
  const unpivot = p.has("unpivot")
    ? [" ", p.child("unpivot", asItIs, true)]
    : "";
  return [pivot, unpivot];
};

const printTrailingComments: PrintFunc<bq2cst.BaseNode> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node, node.children);
  return lineSuffix(p.child("trailing_comments", (x) => [" ", x]));
};
