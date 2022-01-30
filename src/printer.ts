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
    breakParent,
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

// module augmentation
declare module "@dr666m1/bq2cst" {
  interface BaseNode {
    /**
     * # breakRecommended
     * if it is true, `hardline` is used at left side of `AND`, `OR` and `JOIN`.
     *
     * # isFinalColumn
     * if it is true, the node is the final column of SELECT statement.
     *
     * # notGlobal
     * if it is true, the node follows `.` operator.
     *
     * # notRoot
     * if it is true, the statement is a part of another statement.
     */
    breakRecommended?: true;
    groupRecommended?: true;
    emptyLines?: number;
    isDatePart?: true;
    isFinalColumn?: true;
    isPreDefinedFunction?: true;
    notGlobal?: true;
    notRoot?: true;
  }
}

export type Children<T extends bq2cst.UnknownNode> = T["children"];

export type NodeKeyof<T> = {
  [k in keyof T]-?: T[k] extends { Node: bq2cst.UnknownNode } | undefined
    ? k
    : never;
}[keyof T];

export type NodeVecKeyof<T> = {
  [k in keyof T]-?: T[k] extends { NodeVec: bq2cst.UnknownNode[] } | undefined
    ? k
    : never;
}[keyof T];

export const isNodeChild = (child: unknown): child is bq2cst.NodeChild => {
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

export const isNodeVecChild = (
  child: unknown
): child is bq2cst.NodeVecChild => {
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

type PrintFunc<T extends bq2cst.UnknownNode> = (
  path: AstPath,
  oprions: Options,
  print: (path: AstPath) => Doc,
  node: T
) => Doc;

type Docs<T extends bq2cst.UnknownNode> =
  | {
      [k in keyof T["children"]]-?: T["children"][k] extends undefined
        ? never
        : k;
    }[keyof T["children"]]
  | "self";

type Options = Record<string, unknown>;

type ConsumeTarget = "all" | "first" | "none";

class Printer<T extends bq2cst.UnknownNode> {
  /** NOTE
   * `.children` is needed because accessing by `.node.children[key]` throws error.
   * https://github.com/microsoft/TypeScript/issues/36631
   */
  readonly children: Children<T>;
  constructor(
    private readonly path: AstPath,
    private readonly options: Options,
    private readonly print: (path: AstPath) => Doc,
    readonly node: T
  ) {
    this.children = this.node.children as Children<T>;
  }
  child(
    key: NodeKeyof<Children<T>>,
    transform?: (x: Doc) => Doc,
    consumeLeadingComments?: ConsumeTarget
  ): Doc;
  child(
    key: NodeVecKeyof<Children<T>>,
    transform?: (x: Doc) => Doc,
    consumeLeadingComments?: ConsumeTarget,
    sep?: Doc
  ): Doc;
  child(
    key: NodeKeyof<Children<T>> | NodeVecKeyof<Children<T>>,
    transform?: (x: Doc) => Doc,
    consumeLeadingComments?: ConsumeTarget,
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
        comments = this.consumeLeadingCommentsOfX(
          key,
          true,
          consumeLeadingComments
        );
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
        comments = this.consumeLeadingCommentsOfX(
          key,
          true,
          consumeLeadingComments
        );
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
  consumeLeadingCommentsOfX(
    key: keyof Children<T>,
    asLineSuffix = true,
    target: ConsumeTarget = "first"
  ) {
    if (target === "first") {
      const firstNode = this.getFirstNode(key);
      if (!firstNode) {
        return "";
      }
      const leading_comments = firstNode.children.leading_comments;
      if (leading_comments) {
        const res = leading_comments.NodeVec.map((x) =>
          asLineSuffix
            ? lineSuffix([" ", x.token.literal])
            : [x.token.literal, hardline]
        );
        delete firstNode.children.leading_comments;
        return res;
      } else {
        return "";
      }
    } else if (target === "all") {
      const child = this.children[key];
      let firstNodes: bq2cst.UnknownNode[] = [];
      if (isNodeChild(child)) {
        firstNodes = [getFirstNode(child.Node)];
      } else if (isNodeVecChild(child)) {
        firstNodes = child.NodeVec.map((x) => getFirstNode(x));
      }
      const res: Doc[] = [];
      firstNodes.forEach((x) => {
        const leading_comments = x.children.leading_comments;
        if (leading_comments) {
          leading_comments.NodeVec.forEach((x) => {
            if (asLineSuffix) {
              res.push(lineSuffix([" ", x.token.literal]));
            } else {
              [x.token.literal, hardline];
            }
          });
          delete x.children.leading_comments;
        }
      });
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
  setGroupRecommended(key: keyof Children<T>) {
    /**
     * NOTE
     * You can use this method when simply using `group()` does not work.
     * e.g. when grouping a part of `this.child(key)`.
     */
    const child = this.children[key];
    if (isNodeChild(child)) {
      child.Node.groupRecommended = true;
    } else if (isNodeVecChild(child)) {
      child.NodeVec.forEach((x) => {
        x.groupRecommended = true;
      });
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
    if (!this.options.printKeywordsInUpperCase) {
      return;
    }
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

const getFirstNode = (
  node: bq2cst.UnknownNode,
  includeComment = false
): bq2cst.UnknownNode => {
  const candidates = [];
  for (const [k, v] of Object.entries(node.children)) {
    if (
      ["leading_comments", "trailing_comments"].includes(k) &&
      !includeComment
    ) {
      continue;
    }
    if (isNodeChild(v)) {
      candidates.push(getFirstNode(v.Node, includeComment));
    } else if (isNodeVecChild(v)) {
      // NOTE maybe you don't have to check 2nd, 3rd, or latter node
      v.NodeVec.forEach((x) =>
        candidates.push(getFirstNode(x, includeComment))
      );
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
          const startNode = getFirstNode(node[i + 1], true);
          let startLine;
          if (startNode.token) {
            startLine = startNode.token.line;
          } else {
            // EOF
            startLine = endLine + 1;
          }
          node[i].emptyLines = startLine - endLine - 1; // >= -1
        }
      }
    }
    return path.map(print);
  }
  switch (node.node_type) {
    case "AccessOperator":
      return printAccessOperator(path, options, print, node);
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
    case "BreakContinueStatement":
      return printBreakContinueStatement(path, options, print, node);
    case "CallingFunction":
      return printCallingFunction(path, options, print, node);
    case "CallingTableFunction":
      return printCallingTableFunction(path, options, print, node);
    case "CallingUnnest":
      return printCallingUnnest(path, options, print, node);
    case "CallStatement":
      return printCallStatement(path, options, print, node);
    case "CaseExprArm":
      return printCaseExprArm(path, options, print, node);
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
    case "CreateReservationStatement":
      return printCreateReservationStatement(path, options, print, node);
    case "CreateRowAccessPolicyStatement":
      return printCreateRowAccessPolicyStatement(path, options, print, node);
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
    case "DropRowAccessPolicyStatement":
      return printDropRowAccessPolicyStatement(path, options, print, node);
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
    case "ForStatement":
      return printForStatement(path, options, print, node);
    case "ForSystemTimeAsOfClause":
      return printForSystemTimeAsOfclause(path, options, print, node);
    case "GrantStatement":
      return printGrantStatement(path, options, print, node);
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
    case "MultiTokenIdentifier":
      return printMultiTokenIdentifier(path, options, print, node);
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
    case "RevokeStatement":
      return printRevokeStatement(path, options, print, node);
    case "RaiseStatement":
      return printRaiseStatement(path, options, print, node);
    case "RepeatStatement":
      return printRepeatStatement(path, options, print, node);
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
    case "TransactionStatement":
      return printTransactionStatement(path, options, print, node);
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
      throw new Error(`Not implemented node type: ${JSON.stringify(node)}`);
  }
};

const printAccessOperator: PrintFunc<bq2cst.AccessOperator> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node);
  const docs: { [Key in Docs<bq2cst.AccessOperator>]: Doc } = {
    leading_comments: "", // eslint-disable-line unicorn/no-unused-properties
    left: p.child("left"),
    self: p.self("asItIs", true),
    trailing_comments: printTrailingComments(path, options, print, node),
    right: p.child("right", asItIs, "all"),
    rparen: p.child("rparen", asItIs, "all"),
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
      docs.right,
      docs.rparen,
      docs.alias,
      docs.order,
    ]),
    docs.comma,
  ];
};

const printAddColumnClause: PrintFunc<bq2cst.AddColumnClause> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node);
  const docs: { [Key in Docs<bq2cst.AddColumnClause>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print, node),
    column: p.child("column", asItIs, "all"),
    if_not_exists: p.child("if_not_exists", (x) => group([line, x])),
    type_declaration: p.child("type_declaration"),
    comma: p.child("comma", asItIs, "all"),
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
  const p = new Printer(path, options, print, node);
  const docs: { [Key in Docs<bq2cst.AlterColumnStatement>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print, node),
    what: p.child("what", asItIs, "all"),
    if_exists: p.child("if_exists", (x) => group([line, x])),
    ident: p.child("ident", asItIs, "all"),
    set: p.child("set"),
    data_type: p.child("data_type", asItIs, "all", " "),
    type: p.child("type", asItIs, "all"),
    options: p.child("options", asItIs, "all"),
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
      p.has("set") ? line : "",
      docs.set,
      p.has("data_type") ? " " : "",
      docs.data_type,
      p.has("type") ? " " : "",
      docs.type,
      p.has("options") ? " " : "",
      docs.options,
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
  const p = new Printer(path, options, print, node);
  const docs: { [Key in Docs<bq2cst.AlterSchemaStatement>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print, node),
    what: p.child("what", asItIs, "all"),
    if_exists: p.child("if_exists", (x) => group([line, x])),
    ident: p.child("ident", asItIs, "all"),
    set: p.child("set"),
    options: p.child("options", asItIs, "all"),
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
  const p = new Printer(path, options, print, node);
  const docs: { [Key in Docs<bq2cst.AlterTableStatement>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print, node),
    what: p.child("what", asItIs, "all"),
    if_exists: p.child("if_exists", (x) => group([line, x])),
    ident: p.child("ident", asItIs, "all"),
    // SET
    set: p.child("set"),
    options: p.child("options", asItIs, "all"),
    // ADD COLUMNS
    add_columns: p.child("add_columns", (x) => [line, x]),
    // RENAMTE TO
    rename: p.child("rename"),
    to: p.child("to", asItIs, "all"),
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
  const p = new Printer(path, options, print, node);
  const docs: { [Key in Docs<bq2cst.AlterViewStatement>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print, node),
    materialized: p.child("materialized", asItIs, "all"),
    what: p.child("what", asItIs, "all"),
    if_exists: p.child("if_exists", (x) => group([line, x])),
    ident: p.child("ident", asItIs, "all"),
    set: p.child("set"),
    options: p.child("options", asItIs, "all"),
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
  const p = new Printer(path, options, print, node);
  const docs: { [Key in Docs<bq2cst.Asterisk>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self(),
    trailing_comments: printTrailingComments(path, options, print, node),
    except: p.child("except", (x) => [" ", x], "all"),
    replace: p.child("replace", (x) => [" ", x], "all"),
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

const printArrayLiteral: PrintFunc<bq2cst.ArrayLiteral> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node);
  const docs: { [Key in Docs<bq2cst.ArrayLiteral>]: Doc } = {
    type: p.child("type"),
    leading_comments: p.has("type")
      ? ""
      : printLeadingComments(path, options, print, node),
    self: p.has("type") ? p.self("asItIs", true) : p.self(),
    trailing_comments: printTrailingComments(path, options, print, node),
    exprs: p.child("exprs", (x) => group(x), "none", line),
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
  const p = new Printer(path, options, print, node);
  const docs: { [Key in Docs<bq2cst.AssertStatement>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print, node),
    expr:
      !p.hasLeadingComments("expr") &&
      ["GroupedExpr", "GroupedStatement", "CallingFunction"].includes(
        node.children.expr.Node.node_type
      )
        ? [" ", p.child("expr", asItIs, "all")]
        : indent([line, p.child("expr")]),
    as: p.child("as"),
    description: p.child("description", asItIs, "all"),
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
  const p = new Printer(path, options, print, node);
  p.setNotRoot("stmts");

  let leading_label_comments: Doc = "";
  if (
    node.children.leading_label &&
    node.children.leading_label.Node.children.leading_comments
  ) {
    leading_label_comments =
      node.children.leading_label.Node.children.leading_comments.NodeVec.map(
        (n) => [n.token.literal, hardline]
      );
    p.consumeLeadingCommentsOfX("leading_label");
  }

  const docs: { [Key in Docs<bq2cst.BeginStatement>]: Doc } = {
    leading_label: p.child("leading_label"),
    colon: p.child("colon", asItIs, "all"),
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print, node),
    stmts:
      p.len("stmts") <= 1
        ? p.child("stmts", (x) => [line, x])
        : p.child("stmts", (x) => [hardline, x]),
    exception_when_error: group(
      p.child("exception_when_error", asItIs, "none", line)
    ),
    then: p.child("then", asItIs, "all"),
    end: p.child("end"),
    trailing_label: p.child("trailing_label", asItIs, "all"),
    semicolon: p.child("semicolon"),
  };
  return [
    leading_label_comments,
    docs.leading_comments,
    group([
      docs.leading_label,
      docs.colon,
      p.has("leading_label") ? " " : "",
      docs.self,
      docs.trailing_comments,
      indent(docs.stmts),
      p.has("exception_when_error") ? hardline : "",
      docs.exception_when_error,
      p.has("then") ? " " : "",
      docs.then,
      line,
      docs.end,
      p.has("trailing_label") ? " " : "",
      docs.trailing_label,
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
  const p = new Printer(path, options, print, node);
  const docs: { [Key in Docs<bq2cst.BetweenOperator>]: Doc } = {
    leading_comments: "", // eslint-disable-line unicorn/no-unused-properties
    left: p.child("left"),
    not: p.child("not", asItIs, "all"),
    self: p.self("upper", true),
    trailing_comments: printTrailingComments(path, options, print, node),
    right_min: p.child("right_min"),
    and: p.child("and"),
    right_max: p.child("right_max", asItIs, "all"),
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
    group([
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
  const p = new Printer(path, options, print, node);
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

// TODO Define another function for AND, OR.
const printBinaryOperator: PrintFunc<bq2cst.BinaryOperator> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node);
  p.setNotRoot("left");
  p.setNotRoot("right");
  const leading_comments = p.consumeLeadingCommentsOfX("left", false);
  const logical = p.includedIn(["AND", "OR"]);
  const docs: { [Key in Docs<bq2cst.BinaryOperator>]: Doc } = {
    leading_comments: leading_comments,
    left: p.child("left"),
    not: p.child("not", asItIs, "all"),
    self: logical ? p.self("upper") : p.self("upper", true),
    trailing_comments: printTrailingComments(path, options, print, node),
    right: p.child("right", asItIs, "all"),
    as: "", // eslint-disable-line unicorn/no-unused-properties
    alias: printAlias(path, options, print, node),
    order: printOrder(path, options, print, node),
    null_order: "", // eslint-disable-line unicorn/no-unused-properties
    comma: printComma(path, options, print, node),
  };

  // NOTE
  // If you reassign `docs.left`, eslint-plugin-unicorn does not work.
  // So define new variable here.
  let left = docs.left;
  let right = docs.right;
  if (logical) {
    if (
      !["AND", "OR"].includes(p.children.left.Node.token.literal.toUpperCase())
    ) {
      left = group(docs.left);
    }
    if (
      !["AND", "OR"].includes(p.children.right.Node.token.literal.toUpperCase())
    ) {
      right = group(docs.right);
    }
  } else {
    if (p.children.left.Node.node_type !== "BinaryOperator") {
      left = group(docs.left);
    }
    if (p.children.right.Node.node_type !== "BinaryOperator") {
      right = group(docs.right);
    }
  }
  let res: Doc = [
    left,
    (logical && node.breakRecommended) || p.has("leading_comments")
      ? hardline
      : line,
    p.has("not") && !p.includedIn(["IS"]) ? [docs.not, " "] : "",
    // NOTE If self is not logical, leading_comments has already been consumed.
    printLeadingComments(path, options, print, node),
    docs.self,
    p.has("not") && p.includedIn(["IS"]) ? [" ", docs.not] : "",
    " ",
    docs.trailing_comments,
    right,
  ];
  if (node.groupRecommended) {
    res = group(res);
  }
  return [docs.leading_comments, res, docs.alias, docs.order, docs.comma];
};

const printBreakContinueStatement: PrintFunc<bq2cst.BreakContinueStatement> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node);
  const docs: { [Key in Docs<bq2cst.BreakContinueStatement>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print, node),
    label: p.child("label", asItIs, "all"),
    semicolon: p.child("semicolon"),
  };
  return [
    docs.leading_comments,
    docs.self,
    docs.trailing_comments,
    p.has("label") ? " " : "",
    docs.label,
    docs.semicolon,
    p.newLine(),
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

const printCallingFunctionGeneral: PrintFunc<
  bq2cst.CallingFunctionGeneral & bq2cst.UnknownNode
> = (path, options, print, node) => {
  const p = new Printer(path, options, print, node);
  p.setNotRoot("args");

  let func = node.children.func.Node;
  let parent;
  let grandParent;
  if (node.isDatePart) {
    p.toUpper("func");
    p.toUpper("args");
  }

  const toUpper = (x: bq2cst.Token) => {
    if (options.printKeywordsInUpperCase) {
      x.literal = x.literal.toUpperCase();
    }
    return x;
  };
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
            toUpper(parent.token);
          }
          break;
        case "KEYS":
          if (keysFunctions.includes(func.token.literal.toUpperCase())) {
            func.isPreDefinedFunction = true;
            toUpper(parent.token);
          }
          break;
        case "AEAD":
          if (aeadFunctions.includes(func.token.literal.toUpperCase())) {
            func.isPreDefinedFunction = true;
            toUpper(parent.token);
          }
          break;
        case "NET":
          if (netFunctions.includes(func.token.literal.toUpperCase())) {
            func.isPreDefinedFunction = true;
            toUpper(parent.token);
          }
          break;
        case "HLL_COUNT":
          if (hllCountFunctions.includes(func.token.literal.toUpperCase())) {
            func.isPreDefinedFunction = true;
            toUpper(parent.token);
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
              toUpper(parent.token);
              toUpper(grandParent.token);
            }
            break;
          case "AEAD":
            if (aeadFunctions.includes(func.token.literal.toUpperCase())) {
              func.isPreDefinedFunction = true;
              toUpper(parent.token);
              toUpper(grandParent.token);
            }
            break;
          case "NET":
            if (netFunctions.includes(func.token.literal.toUpperCase())) {
              func.isPreDefinedFunction = true;
              toUpper(parent.token);
              toUpper(grandParent.token);
            }
            break;
          case "HLL_COUNT":
            if (hllCountFunctions.includes(func.token.literal.toUpperCase())) {
              func.isPreDefinedFunction = true;
              toUpper(parent.token);
              toUpper(grandParent.token);
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
        toUpper(args.NodeVec[1].token);
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
      if (func_literal === "LAST_DAY" && 2 <= p.len("args")) {
        args.NodeVec[1].isDatePart = true;
      }
    }
  }

  const docs: {
    [Key in Docs<bq2cst.CallingFunctionGeneral & bq2cst.UnknownNode>]: Doc;
  } = {
    leading_comments: "", // eslint-disable-line unicorn/no-unused-properties
    func: p.child("func"),
    self: p.self("asItIs", true),
    trailing_comments: printTrailingComments(path, options, print, node),
    distinct: p.child("distinct", (x) => [x, line]),
    args: p.child("args", (x) => group(x), "none", line),
    ignore_nulls: p.child("ignore_nulls", asItIs, "none", line),
    orderby: p.child("orderby"),
    limit: p.child("limit"),
    rparen: p.child("rparen"),
    over: p.child("over", (x) => [" ", x], "all"),
    as: "", // eslint-disable-line unicorn/no-unused-properties
    alias: printAlias(path, options, print, node),
    order: printOrder(path, options, print, node),
    null_order: "", // eslint-disable-line unicorn/no-unused-properties
    comma: printComma(path, options, print, node),
  };
  const trailings = [docs.ignore_nulls, docs.orderby, docs.limit].filter(
    (x) => x !== ""
  );
  let noNewLine =
    !p.has("distinct") &&
    p.len("args") <= 1 &&
    !p.hasLeadingComments("args") &&
    trailings.length === 0 &&
    !p.hasLeadingComments("rparen")
      ? true
      : false;
  if (
    p.children.args &&
    !["GroupedExpr", "GroupedStatement", "CallingFunction"].includes(
      // TODO the same array appears in printAssertStatement. DRY!
      p.children.args.NodeVec[0].node_type
    )
  ) {
    noNewLine = false;
  }
  const insideParen = [
    noNewLine ? "" : softline,
    docs.distinct,
    docs.args,
    trailings.map((x) => [line, group(x)]),
  ];
  return [
    // func often has leading_comments, so it is placed out of group
    docs.func,
    group([
      docs.self,
      docs.trailing_comments,
      noNewLine ? insideParen : indent(insideParen),
      noNewLine ? "" : softline,
      docs.rparen,
    ]),
    docs.over,
    docs.alias,
    docs.order,
    docs.comma,
  ];
};

const printCallingTableFunction: PrintFunc<bq2cst.CallingTableFunction> = (
  path,
  options,
  print,
  node
) => {
  const docs: { [Key in Docs<bq2cst.CallingTableFunction>]: Doc } = {
    self: printCallingFunctionGeneral(path, options, print, node),
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
  return [docs.self, docs.pivot];
};

const printCallingUnnest: PrintFunc<bq2cst.CallingUnnest> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node);
  const docs: { [Key in Docs<bq2cst.CallingUnnest>]: Doc } = {
    self: printCallingFunctionGeneral(path, options, print, node),
    with_offset: p.child("with_offset", (x) => group([line, x])),
    offset_as: p.child("offset_as", asItIs, "all"),
    offset_alias: p.child("offset_alias", asItIs, "all"),
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
    p.has("offset_alias")
      ? [
          " ",
          docs.offset_as || (options.printKeywordsInUpperCase ? "AS" : "as"),
        ]
      : "",
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
  const p = new Printer(path, options, print, node);
  const docs: { [Key in Docs<bq2cst.CallStatement>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print, node),
    procedure: p.child("procedure", asItIs, "all"),
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

const printCaseExprArm: PrintFunc<bq2cst.CaseExprArm> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node);
  const docs: { [Key in Docs<bq2cst.CaseExprArm>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self(),
    trailing_comments: printTrailingComments(path, options, print, node),
    expr: p.child("expr", asItIs, "all"),
    then: p.child("then", asItIs),
    result: p.child("result"),
  };
  return [
    docs.leading_comments,
    docs.self,
    docs.trailing_comments,
    group([indent([p.has("expr") ? line : "", docs.expr])]),
    indent([p.has("then") ? line : "", group([docs.then, " ", docs.result])]),
  ];
};

const printCaseExpr: PrintFunc<bq2cst.CaseExpr> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node);
  const docs: { [Key in Docs<bq2cst.CaseExpr>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self(),
    trailing_comments: printTrailingComments(path, options, print, node),
    expr: p.child("expr", asItIs, "all"),
    arms: p.child("arms", (x) => [line, group(x)], "none"),
    end: p.child("end", asItIs, "all"),
    as: "", // eslint-disable-line unicorn/no-unused-properties
    alias: printAlias(path, options, print, node),
    order: printOrder(path, options, print, node),
    null_order: "", // eslint-disable-line unicorn/no-unused-properties
    comma: printComma(path, options, print, node),
  };
  let res: Doc = [
    docs.self,
    docs.trailing_comments,
    p.has("expr") ? " " : "",
    docs.expr,
    indent(docs.arms),
    " ",
    docs.end,
  ];
  if (p.len("arms") <= 2) {
    res = group(res);
  }
  return [docs.leading_comments, res, docs.alias, docs.order, docs.comma];
};

const printCastArgument: PrintFunc<bq2cst.CastArgument> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node);
  const docs: { [Key in Docs<bq2cst.CastArgument>]: Doc } = {
    leading_comments: "", // eslint-disable-line unicorn/no-unused-properties
    cast_from: p.child("cast_from"),
    self: p.self("upper", true),
    trailing_comments: printTrailingComments(path, options, print, node),
    cast_to: p.child("cast_to", asItIs, "all"),
    format: p.child("format", asItIs, "all"),
  };
  return [
    docs.cast_from,
    " ",
    docs.self,
    docs.trailing_comments,
    " ",
    docs.cast_to,
    p.has("format") ? " " : "",
    docs.format,
  ];
};

const printComment: PrintFunc<bq2cst.Comment> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node);
  const token = p.node.token;
  const splittedComment = token.literal.split("\n").map((x) => x.trim());
  if (options.formatMultilineComment && 2 <= splittedComment.length) {
    const formattedRows = [];
    const firstRow = splittedComment.shift();
    if (firstRow && 3 <= firstRow.length) {
      formattedRows.push(firstRow.slice(0, 2));
      formattedRows.push(" * " + firstRow.slice(2).trim());
    } else {
      formattedRows.push(firstRow);
    }
    const lastRow = splittedComment.pop();
    for (const row of splittedComment) {
      if (row.startsWith("*")) {
        formattedRows.push(" " + row);
      } else {
        formattedRows.push(" * " + row);
      }
    }
    if (lastRow && 3 <= lastRow.length) {
      const lastRowHead = lastRow.slice(0, -2).trim();
      if (lastRowHead.startsWith("*")) {
        formattedRows.push(" " + lastRowHead);
      } else {
        formattedRows.push(" * " + lastRowHead);
      }
      formattedRows.push(" " + lastRow.slice(-2));
    } else {
      formattedRows.push(" " + lastRow!.slice(-2)); // eslint-disable-line @typescript-eslint/no-non-null-assertion
    }
    token.literal = formattedRows.join("\n");
  }
  const docs: { [Key in Docs<bq2cst.Comment>]: Doc } = {
    self: p.self(),
  };
  return docs.self;
};

const printCreateFunctionStatement: PrintFunc<bq2cst.CreateFunctionStatement> =
  (path, options, print, node) => {
    const p = new Printer(path, options, print, node);
    p.setLiteral("temp", options.printKeywordsInUpperCase ? "TEMP" : "temp");
    const docs: { [Key in Docs<bq2cst.CreateFunctionStatement>]: Doc } = {
      leading_comments: printLeadingComments(path, options, print, node),
      self: p.self("upper"),
      trailing_comments: printTrailingComments(path, options, print, node),
      or_replace: p.child("or_replace", (x) => group([line, x])),
      temp: p.child("temp", asItIs, "all"),
      table: p.child("table", asItIs, "all"),
      what: p.child("what", asItIs, "all"),
      if_not_exists: p.child("if_not_exists", (x) => group([line, x])),
      ident: p.child("ident", asItIs, "all"),
      group: p.child("group", asItIs, "all"),
      returns: p.child("returns"),
      determinism: group(p.child("determinism", asItIs, "none", line)),
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
          p.has("table") ? " " : "",
          docs.table,
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
    const p = new Printer(path, options, print, node);
    p.setNotRoot("stmt");
    const docs: { [Key in Docs<bq2cst.CreateProcedureStatement>]: Doc } = {
      leading_comments: printLeadingComments(path, options, print, node),
      self: p.self("upper"),
      trailing_comments: printTrailingComments(path, options, print, node),
      or_replace: p.child("or_replace", (x) => group([line, x])),
      what: p.child("what", asItIs, "all"),
      if_not_exists: p.child("if_not_exists", (x) => group([line, x])),
      ident: p.child("ident", asItIs, "all"),
      group: p.child("group", asItIs, "all"),
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

const printCreateReservationStatement: PrintFunc<bq2cst.CreateReservationStatement> =
  (path, options, print, node) => {
    const p = new Printer(path, options, print, node);
    const docs: { [Key in Docs<bq2cst.CreateReservationStatement>]: Doc } = {
      leading_comments: printLeadingComments(path, options, print, node),
      self: p.self("upper"),
      trailing_comments: printTrailingComments(path, options, print, node),
      what: p.child("what", asItIs, "all"),
      ident: p.child("ident", asItIs, "all"),
      as: p.child("as"),
      json: p.child("json", asItIs, "all"),
      json_string: p.child("json_string", asItIs, "all"),
      semicolon: p.child("semicolon"),
    };
    return [
      docs.leading_comments,
      group([
        docs.self,
        docs.trailing_comments,
        " ",
        docs.what,
        " ",
        docs.ident,
        line,
        docs.as,
        " ",
        docs.json,
        " ",
        docs.json_string,
        softline,
        docs.semicolon,
      ]),
      p.newLine(),
    ];
  };

const printCreateRowAccessPolicyStatement: PrintFunc<bq2cst.CreateRowAccessPolicyStatement> =
  (path, options, print, node) => {
    const p = new Printer(path, options, print, node);
    const docs: { [Key in Docs<bq2cst.CreateRowAccessPolicyStatement>]: Doc } =
      {
        leading_comments: printLeadingComments(path, options, print, node),
        self: p.self("upper"),
        trailing_comments: printTrailingComments(path, options, print, node),
        or_replace: p.child("or_replace", (x) => group([line, x])),
        what: p.child("what", asItIs, "all", " "),
        if_not_exists: p.child("if_not_exists", (x) => group([line, x])),
        ident: p.child("ident", asItIs, "all"),
        on: p.child("on"),
        grant: p.child("grant"),
        to: p.child("to", asItIs, "all"),
        filter: p.child("filter"),
        using: p.child("using", asItIs, "all"),
        semicolon: p.child("semicolon"),
      };
    return [
      docs.leading_comments,
      group([
        docs.self,
        docs.trailing_comments,
        docs.or_replace,
        " ",
        docs.what,
        docs.if_not_exists,
        " ",
        docs.ident,
        line,
        docs.on,
        p.has("grant") ? line : "",
        docs.grant,
        p.has("to") ? " " : "",
        docs.to,
        line,
        docs.filter,
        " ",
        docs.using,
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
  const p = new Printer(path, options, print, node);
  const docs: { [Key in Docs<bq2cst.CreateSchemaStatement>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print, node),
    what: p.child("what", asItIs, "all"),
    if_not_exists: p.child("if_not_exists", (x) => group([line, x])),
    ident: p.child("ident", asItIs, "all"),
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
  const p = new Printer(path, options, print, node);
  p.setLiteral("temp", "TEMP");
  const docs: { [Key in Docs<bq2cst.CreateTableStatement>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print, node),
    or_replace: p.child("or_replace", (x) => group([line, x])),
    temp: p.child("temp", asItIs, "all"),
    external: p.child("external", asItIs, "all"),
    snapshot: p.child("snapshot", asItIs, "all"),
    what: p.child("what", asItIs, "all"),
    if_not_exists: p.child("if_not_exists", (x) => group([line, x])),
    ident: p.child("ident", asItIs, "all"),
    like_or_copy: p.child("like_or_copy"),
    source_table: p.child("source_table", asItIs, "all"),
    column_schema_group: p.child("column_schema_group", asItIs, "all"),
    partitionby: p.child("partitionby"),
    clusterby: p.child("clusterby"),
    with_partition_columns: p.child("with_partition_columns"),
    clone: p.child("clone"),
    options: p.child("options"),
    as: p.child("as", asItIs, "all"),
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
      p.has("like_or_copy") ? " " : "",
      docs.like_or_copy,
      p.has("source_table") ? " " : "",
      docs.source_table,
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
  const p = new Printer(path, options, print, node);
  const docs: { [Key in Docs<bq2cst.CreateViewStatement>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print, node),
    or_replace: p.child("or_replace", (x) => group([line, x])),
    materialized: p.child("materialized", asItIs, "all"),
    what: p.child("what", asItIs, "all"),
    if_not_exists: p.child("if_not_exists", (x) => group([line, x])),
    ident: p.child("ident", asItIs, "all"),
    column_name_list: p.child("column_name_list", asItIs, "all"),
    partitionby: p.child("partitionby"),
    clusterby: p.child("clusterby"),
    options: p.child("options"),
    as: p.child("as", asItIs, "all"),
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
  const p = new Printer(path, options, print, node);
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
  const p = new Printer(path, options, print, node);
  const docs: { [Key in Docs<bq2cst.DeleteStatement>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print, node),
    from: p.consumeAllCommentsOfX("from"),
    table_name: p.child("table_name", asItIs, "all"),
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
  const p = new Printer(path, options, print, node);
  p.setNotGlobal("right");
  const docs: { [Key in Docs<bq2cst.DotOperator>]: Doc } = {
    leading_comments: "", // eslint-disable-line unicorn/no-unused-properties
    left: p.child("left"),
    self: p.self("upper", true),
    trailing_comments: printTrailingComments(path, options, print, node),
    right: p.child("right", asItIs, "all"),
    as: "", // eslint-disable-line unicorn/no-unused-properties
    alias: printAlias(path, options, print, node),
    for_system_time_as_of: p.child("for_system_time_as_of", asItIs, "all"),
    pivot: printPivotOrUnpivotOperator(path, options, print, node),
    unpivot: "", // eslint-disable-line unicorn/no-unused-properties
    tablesample: p.child("tablesample", asItIs, "all"),
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
  const p = new Printer(path, options, print, node);
  const docs: { [Key in Docs<bq2cst.DropColumnClause>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print, node),
    column: p.child("column", asItIs, "all"),
    if_exists: p.child("if_exists", (x) => group([line, x])),
    ident: p.child("ident", asItIs, "all"),
    comma: p.child("comma", asItIs, "all"),
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

const printDropRowAccessPolicyStatement: PrintFunc<bq2cst.DropRowAccessPolicyStatement> =
  (path, options, print, node) => {
    const p = new Printer(path, options, print, node);
    const docs: { [Key in Docs<bq2cst.DropRowAccessPolicyStatement>]: Doc } = {
      leading_comments: printLeadingComments(path, options, print, node),
      self: p.self("upper"),
      trailing_comments: printTrailingComments(path, options, print, node),
      what: p.child("what", asItIs, "all", " "),
      if_exists: p.child("if_exists", (x) => group([line, x])),
      ident: p.child("ident", asItIs, "all"),
      on: p.child("on"),
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
        docs.on,
        softline,
        docs.semicolon,
      ]),
      p.newLine(),
    ];
  };

const printDropStatement: PrintFunc<bq2cst.DropStatement> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node);
  const docs: { [Key in Docs<bq2cst.DropStatement>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print, node),
    external: p.child("external", asItIs, "all"),
    table: p.child("table", asItIs, "all"),
    materialized: p.child("materialized", asItIs, "all"),
    what: p.child("what", asItIs, "all"),
    if_exists: p.child("if_exists", (x) => group([line, x])),
    ident: p.child("ident", asItIs, "all"),
    cascade_or_restrict: p.child("cascade_or_restrict", asItIs, "all"),
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
      p.has("table") ? " " : "",
      docs.table,
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
  const p = new Printer(path, options, print, node);
  const docs: { [Key in Docs<bq2cst.ElseIfClause>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print, node),
    condition: p.child("condition", asItIs, "all"),
    then: p.child("then", asItIs, "all"),
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
  const p = new Printer(path, options, print, node);
  const docs: { [Key in Docs<bq2cst.ExecuteStatement>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print, node),
    immediate: p.child("immediate", asItIs, "all"),
    sql_expr: p.child("sql_expr", asItIs, "all"),
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
  const p = new Printer(path, options, print, node);
  const docs: { [Key in Docs<bq2cst.ExportStatement>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print, node),
    data: p.child("data", asItIs, "all"),
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
  const p = new Printer(path, options, print, node);
  node.children.extract_datepart.Node.isDatePart = true;
  const docs: { [Key in Docs<bq2cst.ExtractArgument>]: Doc } = {
    leading_comments: "", // eslint-disable-line unicorn/no-unused-properties
    extract_datepart: p.child("extract_datepart"),
    self: p.self("upper", true),
    trailing_comments: printTrailingComments(path, options, print, node),
    extract_from: p.child("extract_from", asItIs, "all"),
    at_time_zone: p.child("at_time_zone", asItIs, "all", " "),
    time_zone: p.child("time_zone", asItIs, "all"),
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

const printForStatement: PrintFunc<bq2cst.ForStatement> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node);

  let leading_label_comments: Doc = "";
  if (
    node.children.leading_label &&
    node.children.leading_label.Node.children.leading_comments
  ) {
    leading_label_comments =
      node.children.leading_label.Node.children.leading_comments.NodeVec.map(
        (n) => [n.token.literal, hardline]
      );
    p.consumeLeadingCommentsOfX("leading_label");
  }

  const docs: { [Key in Docs<bq2cst.ForStatement>]: Doc } = {
    leading_label: p.child("leading_label"),
    colon: p.child("colon", asItIs, "all"),
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print, node),
    ident: p.child("ident", asItIs, "all"),
    in: p.child("in", asItIs, "all"),
    do: p.child("do", asItIs, "all"),
    end_for: group(p.child("end_for", asItIs, "none", line)),
    trailing_label: p.child("trailing_label", asItIs, "all"),
    semicolon: p.child("semicolon"),
  };
  return [
    leading_label_comments,
    docs.leading_comments,
    group([
      group([
        docs.leading_label,
        docs.colon,
        p.has("leading_label") ? " " : "",
        docs.self,
        docs.trailing_comments,
        " ",
        docs.ident,
        " ",
        docs.in,
      ]),
      " ",
      docs.do,
      line,
      docs.end_for,
      p.has("trailing_label") ? " " : "",
      docs.trailing_label,
      softline,
      docs.semicolon,
    ]),
    p.newLine(),
  ];
};

const printForSystemTimeAsOfclause: PrintFunc<bq2cst.ForSystemTimeAsOfClause> =
  (path, options, print, node) => {
    const p = new Printer(path, options, print, node);
    const docs: { [Key in Docs<bq2cst.ForSystemTimeAsOfClause>]: Doc } = {
      leading_comments: printLeadingComments(path, options, print, node),
      self: p.self("upper"),
      trailing_comments: printTrailingComments(path, options, print, node),
      system_time_as_of: p.child("system_time_as_of", (x) => group([line, x])),
      expr: p.child("expr", asItIs, "all"),
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

const printGrantStatement: PrintFunc<bq2cst.GrantStatement> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node);
  const docs: { [Key in Docs<bq2cst.GrantStatement>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print, node),
    roles: p.child("roles", (x) => [line, x]),
    on: p.child("on"),
    resource_type: p.child("resource_type", asItIs, "all"),
    ident: p.child("ident", asItIs, "all"),
    to: p.child("to"),
    semicolon: p.child("semicolon"),
  };
  return [
    docs.leading_comments,
    group([
      group([docs.self, docs.trailing_comments, docs.roles]),
      line,
      docs.on,
      " ",
      docs.resource_type,
      " ",
      docs.ident,
      line,
      group(docs.to),
      softline,
      docs.semicolon,
    ]),
    p.newLine(),
  ];
};

const printGroupedExpr: PrintFunc<bq2cst.GroupedExpr> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node);
  p.setNotRoot("expr");
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
  const p = new Printer(path, options, print, node);
  p.setGroupRecommended("exprs");
  const docs: { [Key in Docs<bq2cst.GroupedExprs>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self(),
    trailing_comments: printTrailingComments(path, options, print, node),
    exprs: p.child("exprs", asItIs, "none", line),
    rparen: p.child("rparen"),
    as: p.has("as")
      ? p.child("as", asItIs, "all")
      : options.printKeywordsInUpperCase
      ? "AS"
      : "as",
    row_value_alias: p.child("row_value_alias", asItIs, "all"),
    comma: p.child("comma", asItIs, "all"),
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
  const p = new Printer(path, options, print, node);
  p.setNotRoot("stmt");
  const docs: { [Key in Docs<bq2cst.GroupedStatement>]: Doc } = {
    with: p.child("with"),
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
    semicolon: p.child("semicolon", asItIs, "all"),
  };
  return [
    group([docs.with, p.has("with") ? hardline : ""]),
    docs.leading_comments,
    group([
      p.has("with") ? breakParent : "",
      group([
        docs.self,
        docs.trailing_comments,
        indent([softline, group(docs.stmt)]),
        softline,
        docs.rparen,
        docs.pivot,
      ]),
      p.has("semicolon") ? softline : "",
      docs.semicolon,
    ]),
    docs.alias,
    docs.order,
    docs.comma,
    p.newLine(),
  ];
};

const printGroupedType: PrintFunc<bq2cst.GroupedType> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node);
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
    const p = new Printer(path, options, print, node);
    const docs: { [Key in Docs<bq2cst.GroupedTypeDeclarations>]: Doc } = {
      leading_comments: printLeadingComments(path, options, print, node),
      self: p.self(),
      trailing_comments: printTrailingComments(path, options, print, node),
      declarations: p.child("declarations", (x) => group(x), "none", line),
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
  const p = new Printer(path, options, print, node);
  const docs: { [Key in Docs<bq2cst.Identifier>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self:
      node.isPreDefinedFunction || node.isDatePart ? p.self("upper") : p.self(),
    trailing_comments: printTrailingComments(path, options, print, node),
    as: "", // eslint-disable-line unicorn/no-unused-properties
    alias: printAlias(path, options, print, node),
    for_system_time_as_of: p.child("for_system_time_as_of", asItIs, "all"),
    pivot: printPivotOrUnpivotOperator(path, options, print, node),
    unpivot: "", // eslint-disable-line unicorn/no-unused-properties
    tablesample: p.child("tablesample", asItIs, "all"),
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
  const p = new Printer(path, options, print, node);
  const docs: { [Key in Docs<bq2cst.IfStatement>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print, node),
    condition: p.child("condition", asItIs, "all"),
    then: p.child("then", asItIs, "all"),
    elseifs: p.child("elseifs", (x) => [hardline, x]),
    else: p.child("else"),
    end_if: group(p.child("end_if", asItIs, "none", line)),
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
  const p = new Printer(path, options, print, node);
  p.setNotRoot("right");
  const docs: { [Key in Docs<bq2cst.InOperator>]: Doc } = {
    leading_comments: "", // eslint-disable-line unicorn/no-unused-properties
    left: p.child("left"),
    not: p.child("not"),
    self: p.self("asItIs", true),
    trailing_comments: printTrailingComments(path, options, print, node),
    right: p.child("right", asItIs, "all"),
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
  const p = new Printer(path, options, print, node);
  p.setNotRoot("input");
  const docs: { [Key in Docs<bq2cst.InsertStatement>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print, node),
    into: p.consumeAllCommentsOfX("into"),
    target_name: p.child("target_name", asItIs, "all"),
    columns: p.child("columns", asItIs, "all"),
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
  const p = new Printer(path, options, print, node);
  const docs: { [Key in Docs<bq2cst.IntervalLiteral>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print, node),
    expr: p.child("expr", asItIs, "all"),
    date_part: p.child("date_part", asItIs, "all"),
    to: p.child("to", asItIs, "all"),
    to_date_part: p.child("to_date_part", asItIs, "all"),
    as: "", // eslint-disable-line unicorn/no-unused-properties
    alias: printAlias(path, options, print, node),
    comma: printComma(path, options, print, node),
  };
  return [
    docs.leading_comments,
    docs.self,
    docs.trailing_comments,
    " ",
    group(docs.expr),
    " ",
    docs.date_part,
    p.has("to") ? " " : "",
    docs.to,
    p.has("to_date_part") ? " " : "",
    docs.to_date_part,
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
  const p = new Printer(path, options, print, node);
  p.setNotRoot("left");
  p.setNotRoot("right");
  const docs: { [Key in Docs<bq2cst.JoinOperator>]: Doc } = {
    leading_comments: "", // eslint-disable-line unicorn/no-unused-properties
    left: p.child("left"),
    join_type: p.child("join_type"),
    outer: p.consumeAllCommentsOfX("outer"),
    self: p.self("upper", true),
    trailing_comments: printTrailingComments(path, options, print, node),
    right: p.child("right", asItIs, "all"),
    on: p.child("on", asItIs, "all"),
    using: p.child("using", asItIs, "all"),
    as: "", // eslint-disable-line unicorn/no-unused-properties
    alias: printAlias(path, options, print, node),
    pivot: printPivotOrUnpivotOperator(path, options, print, node),
    unpivot: "", // eslint-disable-line unicorn/no-unused-properties
  };
  return [
    docs.left,
    hardline,
    p.includedIn(["JOIN"])
      ? [
          docs.join_type ||
            (options.printKeywordsInUpperCase ? "INNER" : "inner"),
          " ",
        ]
      : "",
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
  const p = new Printer(path, options, print, node);
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
  const p = new Printer(path, options, print, node);
  p.setNotRoot("expr");
  p.setBreakRecommended("expr"); // AND or OR
  p.setGroupRecommended("expr"); // other binary operator

  let indentExpr = true;
  if (!p.hasLeadingComments("expr")) {
    const token = node.children.expr.Node.token;
    if (!token) throw new Error("Something went wrong.");
    const node_type = node.children.expr.Node.node_type;
    if (node_type === "GroupedStatement") {
      // FROM (SELECT ...)
      indentExpr = false;
    } else if (
      node_type === "StringLiteral" &&
      token.literal.match(/^['"]{3}\n/)
    ) {
      // AS '''const x = "aaa"; return x'''
      indentExpr = false;
    } else if (
      node_type === "UnaryOperator" &&
      token.literal.match(/^[brBR]{1,2}$/)
    ) {
      // AS r'''const x = "aaa"; return x'''
      indentExpr = false;
    }
  }

  const docs: { [Key in Docs<bq2cst.KeywordWithExpr>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print, node),
    expr: indentExpr
      ? indent([line, p.child("expr")])
      : [" ", p.child("expr", asItIs, "all")],
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
  const p = new Printer(path, options, print, node);
  p.setGroupRecommended("exprs");
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
  const p = new Printer(path, options, print, node);
  p.setNotRoot("group");
  const docs: { [Key in Docs<bq2cst.KeywordWithGroupedXXX>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print, node),
    group: p.child("group", asItIs, "all"),
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
  const p = new Printer(path, options, print, node);
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
  const p = new Printer(path, options, print, node);
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
  const p = new Printer(path, options, print, node);
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
  const p = new Printer(path, options, print, node);
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
  const p = new Printer(path, options, print, node);
  p.setNotRoot("expr");
  const docs: { [Key in Docs<bq2cst.LimitClause>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print, node),
    // NOTE expr is literal or parameter value
    expr: p.child("expr"),
    offset: p.child("offset", asItIs, "all"),
  };
  return [
    docs.leading_comments,
    group([docs.self, docs.trailing_comments, " ", docs.expr]),
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
  const p = new Printer(path, options, print, node);
  p.setNotRoot("stmts");

  let leading_label_comments: Doc = "";
  if (
    node.children.leading_label &&
    node.children.leading_label.Node.children.leading_comments
  ) {
    leading_label_comments =
      node.children.leading_label.Node.children.leading_comments.NodeVec.map(
        (n) => [n.token.literal, hardline]
      );
    p.consumeLeadingCommentsOfX("leading_label");
  }

  const docs: { [Key in Docs<bq2cst.LoopStatement>]: Doc } = {
    leading_label: p.child("leading_label"),
    colon: p.child("colon", asItIs, "all"),
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print, node),
    stmts:
      p.len("stmts") <= 1
        ? p.child("stmts", (x) => [line, x])
        : p.child("stmts", (x) => [hardline, x]),
    end_loop: group(p.child("end_loop", asItIs, "none", line)),
    trailing_label: p.child("trailing_label", asItIs, "all"),
    semicolon: p.child("semicolon"),
  };
  return [
    leading_label_comments,
    docs.leading_comments,
    group([
      docs.leading_label,
      docs.colon,
      p.has("leading_label") ? " " : "",
      docs.self,
      docs.trailing_comments,
      indent(docs.stmts),
      line,
      docs.end_loop,
      p.has("trailing_label") ? " " : "",
      docs.trailing_label,
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
  const p = new Printer(path, options, print, node);
  const docs: { [Key in Docs<bq2cst.MergeStatement>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print, node),
    into: p.consumeAllCommentsOfX("into"),
    table_name: p.child("table_name", asItIs, "all"),
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

const printMultiTokenIdentifier: PrintFunc<bq2cst.MultiTokenIdentifier> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node);
  const docs: { [Key in Docs<bq2cst.MultiTokenIdentifier>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self(),
    trailing_comments:  printTrailingComments(path, options, print, node),
    trailing_idents: p.child("trailing_idents", asItIs, "all"),
    as: "", // eslint-disable-line unicorn/no-unused-properties
    alias: printAlias(path, options, print, node),
    for_system_time_as_of: p.child("for_system_time_as_of", asItIs, "all"),
    pivot: printPivotOrUnpivotOperator(path, options, print, node),
    unpivot: "", // eslint-disable-line unicorn/no-unused-properties
    tablesample: p.child("tablesample", asItIs, "all"),
    // NOTE order, null_order, comma may be unnecessary for the time being.
    order: printOrder(path, options, print, node),
    null_order: "", // eslint-disable-line unicorn/no-unused-properties
    comma: printComma(path, options, print, node),
  };
  return [
    docs.leading_comments,
    docs.self,
    docs.trailing_comments,
    docs.trailing_idents,
    docs.alias,
    p.has("for_system_time_as_of") ? [" ", docs.for_system_time_as_of] : "",
    docs.pivot,
    p.has("tablesample") ? [" ", docs.tablesample] : "",
    docs.order,
    docs.comma,
  ];
};

const printNullLiteral: PrintFunc<bq2cst.NullLiteral> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node);
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
  const p = new Printer(path, options, print, node);
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
  const p = new Printer(path, options, print, node);
  const docs: { [Key in Docs<bq2cst.OverClause>]: Doc } = {
    leading_comments: "", // eslint-disable-line unicorn/no-unused-properties
    self: p.self("upper", true),
    trailing_comments: printTrailingComments(path, options, print, node),
    window: p.child("window", (x) => [" ", x], "all"),
  };
  return group([docs.self, docs.trailing_comments, docs.window]);
};

const printPivotConfig: PrintFunc<bq2cst.PivotConfig> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node);
  const docs: { [Key in Docs<bq2cst.PivotConfig>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print, node),
    exprs: p.child("exprs", (x) => [x, line]),
    for: p.child("for"),
    in: p.child("in", asItIs, "all"),
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
  const p = new Printer(path, options, print, node);
  const docs: { [Key in Docs<bq2cst.PivotOperator>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print, node),
    config: p.child("config", asItIs, "all"),
    as: p.child("as", asItIs, "all"),
    alias: p.child("alias", asItIs, "all"),
  };
  return [
    docs.leading_comments,
    docs.self,
    docs.trailing_comments,
    " ",
    docs.config,
    p.has("alias")
      ? [" ", docs.as || (options.printKeywordsInUpperCase ? "AS" : "as")]
      : "",
    p.has("alias") ? [" ", docs.alias] : "",
  ];
};

const printRevokeStatement: PrintFunc<bq2cst.RevokeStatement> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node);
  const docs: { [Key in Docs<bq2cst.RevokeStatement>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print, node),
    roles: p.child("roles", (x) => [line, x]),
    on: p.child("on"),
    resource_type: p.child("resource_type", asItIs, "all"),
    ident: p.child("ident", asItIs, "all"),
    from: p.child("from"),
    semicolon: p.child("semicolon"),
  };
  return [
    docs.leading_comments,
    group([
      group([docs.self, docs.trailing_comments, docs.roles]),
      line,
      docs.on,
      " ",
      docs.resource_type,
      " ",
      docs.ident,
      line,
      group(docs.from),
      softline,
      docs.semicolon,
    ]),
    p.newLine(),
  ];
};

const printRaiseStatement: PrintFunc<bq2cst.RaiseStatement> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node);
  const docs: { [Key in Docs<bq2cst.RaiseStatement>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print, node),
    using: p.child("using", asItIs, "all"),
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

const printRepeatStatement: PrintFunc<bq2cst.RepeatStatement> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node);
  p.setNotRoot("stmts");

  let leading_label_comments: Doc = "";
  if (
    node.children.leading_label &&
    node.children.leading_label.Node.children.leading_comments
  ) {
    leading_label_comments =
      node.children.leading_label.Node.children.leading_comments.NodeVec.map(
        (n) => [n.token.literal, hardline]
      );
    p.consumeLeadingCommentsOfX("leading_label");
  }

  const docs: { [Key in Docs<bq2cst.RepeatStatement>]: Doc } = {
    leading_label: p.child("leading_label"),
    colon: p.child("colon", asItIs, "all"),
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print, node),
    stmts:
      p.len("stmts") <= 1
        ? p.child("stmts", (x) => [line, x])
        : p.child("stmts", (x) => [hardline, x]),
    until: p.child("until"),
    end_repeat: group(p.child("end_repeat", asItIs, "none", line)),
    trailing_label: p.child("trailing_label", asItIs, "all"),
    semicolon: p.child("semicolon"),
  };
  return [
    leading_label_comments,
    docs.leading_comments,
    group([
      docs.leading_label,
      docs.colon,
      p.has("leading_label") ? " " : "",
      docs.self,
      docs.trailing_comments,
      indent(docs.stmts),
      line,
      docs.until,
      line,
      docs.end_repeat,
      p.has("trailing_label") ? " " : "",
      docs.trailing_label,
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
  const p = new Printer(path, options, print, node);
  p.setNotRoot("exprs");
  p.setGroupRecommended("exprs");
  node.children.exprs.NodeVec[p.len("exprs") - 1].isFinalColumn = true;
  const docs: { [Key in Docs<bq2cst.SelectStatement>]: Doc } = {
    with: p.child("with"),
    leading_comments: printLeadingComments(path, options, print, node),
    // SELECT clause
    self: p.self("upper"),
    as_struct_or_value: p.child("as_struct_or_value", asItIs, "all", " "),
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
    semicolon: p.child("semicolon", asItIs, "all"),
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
    group([
      // WITH clause
      docs.with,
      p.has("with") ? hardline : "",
    ]),
    docs.leading_comments,
    group([
      p.has("with") ? breakParent : "",
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
  const p = new Printer(path, options, print, node);
  p.setNotRoot("left");
  p.setNotRoot("right");
  const docs: { [Key in Docs<bq2cst.SetOperator>]: Doc } = {
    with: p.child("with"),
    left: p.child("left"),
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print, node),
    distinct_or_all: p.child("distinct_or_all", asItIs, "all"),
    right: p.child("right"),
    semicolon: p.child("semicolon", asItIs, "all"),
  };
  const res = [
    docs.with,
    p.has("with") ? line : "",
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
  const p = new Printer(path, options, print, node);
  p.setGroupRecommended("expr");
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
  const p = new Printer(path, options, print, node);
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
  const p = new Printer(path, options, print, node);
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
    p.node.token.literal.includes("\n") ? breakParent : "",
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
  const p = new Printer(path, options, print, node);
  const docs: { [Key in Docs<bq2cst.StructLiteral>]: Doc } = {
    type: p.child("type"),
    leading_comments: p.has("type")
      ? ""
      : printLeadingComments(path, options, print, node),
    self: p.has("type") ? p.self("asItIs", true) : p.self(),
    trailing_comments: printTrailingComments(path, options, print, node),
    exprs: p.child("exprs", (x) => group(x), "none", line),
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
  const p = new Printer(path, options, print, node);
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
  const p = new Printer(path, options, print, node);
  const docs: { [Key in Docs<bq2cst.TableSampleClause>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self("upper"),
    system: p.child("system", asItIs, "all"),
    trailing_comments: printTrailingComments(path, options, print, node),
    group: p.child("group", asItIs, "all"),
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
  const p = new Printer(path, options, print, node);
  const docs: { [Key in Docs<bq2cst.TableSampleRatio>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self("upper"),
    expr: p.child("expr", asItIs, "all"),
    trailing_comments: printTrailingComments(path, options, print, node),
    percent: p.child("percent", asItIs, "all"),
    rparen: p.child("rparen", asItIs, "all"),
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

const printTransactionStatement: PrintFunc<bq2cst.TransactionStatement> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node);
  const docs: { [Key in Docs<bq2cst.TransactionStatement>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print, node),
    transaction: p.child("transaction", asItIs, "all"),
    semicolon: p.child("semicolon", asItIs, "all"),
  };
  return [
    docs.leading_comments,
    docs.self,
    docs.trailing_comments,
    p.has("transaction") ? " " : "",
    docs.transaction,
    docs.semicolon,
    p.newLine(),
  ];
};

const printTruncateStatement: PrintFunc<bq2cst.TruncateStatement> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node);
  const docs: { [Key in Docs<bq2cst.TruncateStatement>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self("upper"),
    table: p.child("table", asItIs, "all"),
    trailing_comments: printTrailingComments(path, options, print, node),
    table_name: p.child("table_name", asItIs, "all"),
    semicolon: p.child("semicolon", asItIs, "all"),
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
  const p = new Printer(path, options, print, node);
  const docs: { [Key in Docs<bq2cst.Type>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print, node),
    type: p.child("type", asItIs, "all"),
    type_declaration: p.child("type_declaration", asItIs, "all"),
    parameter: p.child("parameter", asItIs, "all"),
    not_null: p.child("not_null", (x) => group([line, x])),
    options: p.child("options", asItIs, "all"),
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
  const p = new Printer(path, options, print, node);
  const docs: { [Key in Docs<bq2cst.TypeDeclaration>]: Doc } = {
    leading_comments: "", // eslint-disable-line unicorn/no-unused-properties
    in_out: p.child("in_out"),
    self: p.self("asItIs", true),
    trailing_comments: printTrailingComments(path, options, print, node),
    type: p.child("type", asItIs, "all"),
    comma: p.child("comma", asItIs, "all"),
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
  const p = new Printer(path, options, print, node);
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
    right: p.child("right", asItIs, "all"),
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
  const p = new Printer(path, options, print, node);
  const docs: { [Key in Docs<bq2cst.UnpivotConfig>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print, node),
    expr: p.child("expr"),
    for: p.child("for"),
    in: p.child("in", asItIs, "all"),
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
  const p = new Printer(path, options, print, node);
  const docs: { [Key in Docs<bq2cst.UnpivotOperator>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self("upper"),
    include_or_exclude_nulls: p.child("include_or_exclude_nulls", (x) =>
      group([line, x])
    ),
    trailing_comments: printTrailingComments(path, options, print, node),
    config: p.child("config", asItIs, "all"),
    as: p.child("as", asItIs, "all"),
    alias: p.child("alias", asItIs, "all"),
  };
  return [
    docs.leading_comments,
    docs.self,
    docs.include_or_exclude_nulls,
    docs.trailing_comments,
    " ",
    docs.config,
    p.has("alias")
      ? [" ", docs.as || (options.printKeywordsInUpperCase ? "AS" : "as")]
      : "",
    p.has("alias") ? [" ", docs.alias] : "",
  ];
};

const printUpdateStatement: PrintFunc<bq2cst.UpdateStatement> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node);
  const docs: { [Key in Docs<bq2cst.UpdateStatement>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print, node),
    table_name: p.child("table_name", asItIs, "all"),
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
  const p = new Printer(path, options, print, node);
  const docs: { [Key in Docs<bq2cst.WhenClause>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self("upper"),
    not: p.child("not", asItIs, "all"),
    trailing_comments: printTrailingComments(path, options, print, node),
    matched: p.child("matched", asItIs, "all"),
    by_target_or_source: p.child("by_target_or_source", (x) =>
      group([line, x])
    ),
    and: p.child("and", asItIs, "all"),
    then: p.child("then", asItIs, "all"),
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
  const p = new Printer(path, options, print, node);

  p.setBreakRecommended("condition"); // AND or OR
  p.setGroupRecommended("condition"); // other binary operator

  let leading_label_comments: Doc = "";
  if (
    node.children.leading_label &&
    node.children.leading_label.Node.children.leading_comments
  ) {
    leading_label_comments =
      node.children.leading_label.Node.children.leading_comments.NodeVec.map(
        (n) => [n.token.literal, hardline]
      );
    p.consumeLeadingCommentsOfX("leading_label");
  }

  const docs: { [Key in Docs<bq2cst.WhileStatement>]: Doc } = {
    leading_label: p.child("leading_label"),
    colon: p.child("colon", asItIs, "all"),
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print, node),
    condition: p.child("condition"),
    do: p.child("do", asItIs, "all"),
    end_while: group(p.child("end_while", asItIs, "none", line)),
    trailing_label: p.child("trailing_label", asItIs, "all"),
    semicolon: p.child("semicolon"),
  };
  return [
    leading_label_comments,
    docs.leading_comments,
    group([
      group([
        docs.leading_label,
        docs.colon,
        p.has("leading_label") ? " " : "",
        docs.self,
        docs.trailing_comments,
        indent([line, docs.condition]),
        ifBreak(line, " "),
      ]),
      docs.do,
      line,
      docs.end_while,
      p.has("trailing_label") ? " " : "",
      docs.trailing_label,
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
  const p = new Printer(path, options, print, node);
  const docs: { [Key in Docs<bq2cst.WindowClause>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print, node),
    window_exprs:
      p.len("window_exprs") === 1
        ? p.child("window_exprs", (x) => [" ", group(x)], "all")
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
  const p = new Printer(path, options, print, node);
  const docs: { [Key in Docs<bq2cst.WindowExpr>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self(),
    trailing_comments: printTrailingComments(path, options, print, node),
    as: p.child("as", asItIs, "all"),
    window: p.child("window", asItIs, "all"),
    comma: p.child("comma", asItIs, "all"),
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
  const p = new Printer(path, options, print, node);
  const docs: { [Key in Docs<bq2cst.WindowFrameClause>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print, node),
    between: p.child("between", asItIs, "all"),
    start: p.child("start", asItIs, "none", line),
    and: p.child("and"),
    end: p.child("end", asItIs, "all", line),
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
  const p = new Printer(path, options, print, node);
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
  const p = new Printer(path, options, print, node);
  const docs: { [Key in Docs<bq2cst.WithClause>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print, node),
    queries:
      p.len("queries") === 1 && !p.hasLeadingComments("queries")
        ? [" ", p.child("queries", asItIs)]
        : indent([line, p.child("queries", asItIs, "none", line)]),
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
    const p = new Printer(path, options, print, node);
    const docs: { [Key in Docs<bq2cst.WithPartitionColumnsClause>]: Doc } = {
      leading_comments: printLeadingComments(path, options, print, node),
      self: p.self(),
      trailing_comments: printTrailingComments(path, options, print, node),
      partition_columns: p.child("partition_columns", (x) => group([line, x])),
      column_schema_group: p.child("column_schema_group", asItIs, "all"),
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
  const p = new Printer(path, options, print, node);
  p.setNotRoot("stmt");
  const docs: { [Key in Docs<bq2cst.WithQuery>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self(),
    trailing_comments: printTrailingComments(path, options, print, node),
    as: p.child("as", asItIs, "all"),
    stmt: p.child("stmt", asItIs, "all"),
    comma: p.child("comma", asItIs, "all"),
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
  const p = new Printer(path, options, print, node);
  p.setGroupRecommended("exprs");
  const docs: { [Key in Docs<bq2cst.XXXByExprs>]: Doc } = {
    leading_comments: printLeadingComments(path, options, print, node),
    self: p.self("upper"),
    trailing_comments: printTrailingComments(path, options, print, node),
    by: p.child("by", asItIs, "all"),
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
const printAlias: PrintFunc<bq2cst.Expr & bq2cst.UnknownNode> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node);
  let as_: Doc;
  if (!p.has("alias")) {
    return "";
  }
  if (p.has("as")) {
    as_ = p.child("as", asItIs, "all");
  } else {
    as_ = options.printKeywordsInUpperCase ? "AS" : "as";
  }
  return [" ", as_, " ", p.child("alias", asItIs, "all")];
};

const printComma: PrintFunc<bq2cst.Expr & bq2cst.UnknownNode> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node);
  if (p.node.isFinalColumn) {
    return ifBreak(
      p.child("comma", asItIs, "all") || ",",
      p.consumeAllCommentsOfX("comma")
    );
  } else {
    return p.child("comma", asItIs, "all");
  }
};

const printLeadingComments: PrintFunc<bq2cst.UnknownNode> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node);
  return p.child("leading_comments", (x) => [x, hardline]);
};

const printOrder: PrintFunc<bq2cst.Expr & bq2cst.UnknownNode> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node);
  return [
    p.has("order") ? [" ", p.child("order", asItIs, "all")] : "",
    p.has("null_order") ? p.child("null_order", (x) => group([line, x])) : "",
  ];
};

const printPivotOrUnpivotOperator: PrintFunc<
  bq2cst.FromItemExpr & bq2cst.UnknownNode
> = (path, options, print, node) => {
  const p = new Printer(path, options, print, node);
  const pivot = p.has("pivot") ? [" ", p.child("pivot", asItIs, "all")] : "";
  const unpivot = p.has("unpivot")
    ? [" ", p.child("unpivot", asItIs, "all")]
    : "";
  return [pivot, unpivot];
};

const printTrailingComments: PrintFunc<bq2cst.UnknownNode> = (
  path,
  options,
  print,
  node
) => {
  const p = new Printer(path, options, print, node);
  return lineSuffix(p.child("trailing_comments", (x) => [" ", x]));
};
