//import { reservedKeywords, globalFunctions } from "./keywords";
import { doc } from "prettier";
import type { Doc, FastPath } from "prettier";
import * as N from "./nodes";

const {
  builders: {
    concat, // TODO remove
    //group,
    hardline,
    //indent,
    join,
    //line,
    //lineSuffix,
    //lineSuffixBoundary,
    //literalline,
    //softline,
  },
} = doc;

type PrintFunc = (path: FastPath) => Doc;


class Printer<T extends N.BaseNode> {
  constructor(
    // Children<T> is needed because `keyof T["children"]` throws error
    // https://github.com/microsoft/TypeScript/issues/36631
    private readonly path: FastPath,
    private readonly printFunc: (path: FastPath) => Doc,
    private readonly node: T,
    private readonly children: N.Children<T>
  ) {}
  lengthOfX(key: N.NodeVecKeyof<N.Children<T>>) {
    const nodeVec = this.children[key];
    if (N.isNodeVec(nodeVec)) {
      return nodeVec.NodeVec;
    }
    throw new Error();
  }
  printNewLine() {
    if (this.node.notRoot) return "";
    if (this.node.emptyLines && 0 < this.node.emptyLines) {
      return concat([hardline, hardline]);
    }
    return hardline;
  }
  printSelf(toUpper=false) {
    const token = this.node.token
    if (!token) {
      return concat([])
    }
    let literal = token.literal
    if (toUpper) {
      literal = literal.toUpperCase()
    }
    return literal
  }
  printX(key: N.NodeKeyof<N.Children<T>>, transform?: (x: Doc) => Doc): Doc;
  printX(
    key: N.NodeVecKeyof<N.Children<T>>,
    sep: Doc,
    transform?: (x: Doc) => Doc
  ): Doc;
  printX(
    key: N.NodeKeyof<N.Children<T>> | N.NodeVecKeyof<N.Children<T>>,
    sepOrTransform?: Doc | ((x: Doc) => Doc),
    transform?: (x: Doc) => Doc
  ): Doc {
    const children = this.children[key];
    let f = (x: Doc) => x;
    if (N.isNode(children)) {
      if (typeof sepOrTransform === "function") {
        f = sepOrTransform;
      }
      return this.path.call(
        (p) => p.call((p) => f(p.call(this.printFunc, "Node")), key),
        "children"
      );
    } else if (N.isNodeVec(children)) {
      if (transform) {
        f = transform;
      }
      if (!sepOrTransform || typeof sepOrTransform === "function") {
        throw new Error(`2nd argument must be Doc`);
      }
      return this.path.call(
        (p) =>
          p.call(
            (p) =>
              join(sepOrTransform, p.map(this.printFunc, "NodeVec").map(f)),
            key
          ),
        "children"
      );
    }
    // in the case of `children` is undefined
    return concat([]);
  }
}

export const printSQL = (
  path: FastPath,
  _: object, // options
  print: PrintFunc
): Doc => {
  /**
   * NOTE
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
        if (semicolon && N.isSymbol(semicolon.Node)) {
          let endLine = semicolon.Node.token.line;
          const trailling_comments = semicolon.Node.children.trailling_comments;
          if (trailling_comments) {
            const comments = trailling_comments.NodeVec;
            const len = comments.length;
            const last_comments = comments[len - 1];
            if (N.isComment(last_comments)) {
              endLine = last_comments.token.line;
              const endLiteral = last_comments.token.literal;
              const newLines = endLiteral.match(/\n/g);
              if (newLines) {
                endLine += newLines.length;
              }
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
            if (N.isComment(first_comments)) {
              startLine = first_comments.token.line;
            }
          }
          node[i].emptyLines = startLine - endLine - 1; // >= 0
        }
      }
    }
    return concat(path.map(print));
  }
  switch (node.node_type) {
    case "SelectStatement":
      return printSelectStatement(path, print);
    default:
      return "not implemented";
  }
};

const printSelectStatement = (path: FastPath, print: PrintFunc): Doc => {
  const node = path.getValue();
  if (!N.isSelectStatement(node)) {
    throw new Error("invalid node for SELECT statement");
  }
  const children = node.children;
  const p = new Printer(path, print, node, children);
  // following comments
  //p.printX("exprs", "aa")
  //const leading_comments = node.printXsIfExists("leading_comments", "", (x) =>
  //  concat([x, hardline])
  //);
  // SELECT clause
  let select: Doc = p.printSelf(true);
  //const exprs = node.printXs("exprs", line, (x: Doc) => group(x));
  //select = concat([select, indent(concat([line, exprs]))]);
  //if (node.lengthOf("exprs") === 1) {
  //  select = group(select);
  //}
  return concat([select]);
};
