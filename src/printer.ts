//import { reservedKeywords, globalFunctions } from "./keywords";
import { doc } from "prettier";
import type { Doc, FastPath } from "prettier";

const {
  builders: {
    concat, // TODO remove
    group,
    hardline,
    indent,
    join,
    line,
    lineSuffix,
    //lineSuffixBoundary,
    //literalline,
    //softline,
  },
} = doc;

type Token = {
  line: number;
  column: number;
  literal: string;
};

type PrintFunc = (path: FastPath) => Doc;

type RawNode = {
  token: Token | null;
  children: { [key: string]: { Node: RawNode } | { NodeVec: RawNode[] } };
  node_type: string;
  emptyLines?: number;
  notRoot?: Boolean;
  done?: Boolean;
};

class Node {
  private node: RawNode;
  constructor(
    private readonly path: FastPath,
    private readonly printFunc: PrintFunc
  ) {
    /**
     * NOTE
     * you can assume type of `path.getValue()` to be `Node`
     * because `Node[]` has been splitted in `printSQL`.
     */
    this.node = path.getValue();
  }
  assertKey(key: string, printedOk = false) {
    if (!this.hasKey(key, printedOk)) {
      if (this.hasKey(key, true)) {
        throw new Error(`${key} was not found: ${JSON.stringify(this.node)}`);
      }
      throw new Error(
        `${key} has already been printed: ${JSON.stringify(this.node)}`
      );
    }
  }
  hasKey(key: string, printedOk = false) {
    const res = key in this.node.children;
    if (printedOk || !res) {
      return res;
    }
    // @ts-ignore
    if ("NodeVec" in this.node.children[key]) {
      const child = this.node.children[key] as { NodeVec: RawNode[] };
      return child.NodeVec.every((x) => !x.done);
    } else {
      const child = this.node.children[key] as { Node: RawNode };
      return !child.Node.done;
    }
  }
  lengthOf(key: string) {
    this.assertKey(key, true);
    // @ts-ignore
    if ("Node" in this.node.children[key]) {
      throw new Error(
        `${key} is not array: ${JSON.stringify(this.node.children[key])}`
      );
    }
    const nodeVec = this.node.children[key] as { NodeVec: RawNode[] };
    return nodeVec.NodeVec.length;
  }
  printNewLine() {
    if (this.node.notRoot) return "";
    if (this.node.emptyLines && 0 < this.node.emptyLines) {
      return concat([hardline, hardline]);
    }
    return hardline;
  }
  printX(key: string, transform = (x: Doc) => x) {
    this.assertKey(key);
    const res = this.path.call(
      (p) => p.call((p) => transform(p.call(this.printFunc, "Node")), key),
      "children"
    );
    const child = this.node.children[key] as { Node: RawNode };
    child.Node.done = true;
    return res;
  }
  printXIfExists(key: string, transform = (x: Doc) => x) {
    try {
      return this.printX(key, transform);
    } catch (e) {
      return "";
    }
  }
  printXs(key: string, sep: Doc, transform = (x: Doc) => x) {
    this.assertKey(key);
    const res = this.path.call(
      (p) =>
        p.call(
          (p) => join(sep, p.map(this.printFunc, "NodeVec").map(transform)),
          key
        ),
      "children"
    );
    const child = this.node.children[key] as { NodeVec: RawNode[] };
    child.NodeVec.forEach((x: RawNode) => (x.done = true));
    return res;
  }
  printXsIfExists(key: string, sep: Doc, transform = (x: Doc) => x) {
    try {
      return this.printXs(key, sep, transform);
    } catch (e) {
      return "";
    }
  }
  printSelf(toUpperCase = false) {
    let res: Doc = "";
    // leading_comments
    res = concat([
      res,
      this.printXsIfExists("leading_comments", "", (x) =>
        concat([x, hardline])
      ),
    ]);
    // self
    let self = this.node.token;
    if (self) {
      if (toUpperCase) {
        res = concat([res, self.literal.toUpperCase()]);
      } else {
        res = concat([res, self.literal]);
      }
    }
    // following_comments
    res = concat([
      res,
      lineSuffix(
        this.printXsIfExists("traillin_comments", "", (x) => concat([" ", x]))
      ),
    ]);
    return res;
  }
}

export const printSQL = (
  path: FastPath,
  _: Object, // options
  print: PrintFunc
): Doc => {
  /**
   * NOTE
   * you can assume type of `path.getValue()` to be `Node | Node[]`.
   * it is tested by `@dr666m1/bq2cst`
   */
  const node: RawNode | RawNode[] = path.getValue();

  if (Array.isArray(node)) {
    for (let i = 0; i < node.length - 1; i++) {
      // @ts-ignore
      if ("semicolon" in node[i].children) {
        // end of statement
        // @ts-ignore
        const semicolon = node[i].children.semicolon as { Node: RawNode };
        let endNode = semicolon.Node;
        const endToken = endNode.token;
        if (!endToken) {
          throw new Error(
            `semicolon must have a \`token\` property but not found!`
          );
        }
        let endLine = endToken.line;
        if ("following_comments" in endNode.children) {
          const following_comments = endNode.children.following_comments as {
            NodeVec: RawNode[];
          };
          const len = following_comments.NodeVec.length;
          // @ts-ignore
          endNode = following_comments.NodeVec[len - 1];
          const endLiteral = endToken.literal;
          let newLines = endLiteral.match(/\n/g);
          if (newLines) {
            endLine = endToken.line + newLines.length;
          }
        }
        // start of statement
        let startNode = node[i + 1];
        // @ts-ignore
        while (startNode.node_type === "SetOperator") {
        // @ts-ignore
          const left = startNode.children.left as { Node: RawNode };
          startNode = left.Node;
        }
        let startLine;
        // @ts-ignore
        let startToken = startNode.token;
        if (startToken) {
          startLine = startToken.line;
        } else {
          // EOF
          startLine = endLine + 1;
        }
        // @ts-ignore
        if ("leading_comments" in startNode.children) {
          // @ts-ignore
          const leading_comments = startNode.children.leading_comments as {
            NodeVec: RawNode[];
          };
          // @ts-ignore
          startToken = leading_comments.NodeVec[0].token;
          if (!startToken) {
            throw new Error(
              `leading_comments must have a \`token\` property but not found!`
            );
          }
          startLine = startToken.line;
        }
        // @ts-ignore
        node[i].emptyLines = startLine - endLine - 1; // >= 0
      }
    }
    return concat(path.map(print));
  }
  switch (node.node_type) {
    case "Comment":
      return printComment(path, print);
    case "NumericLiteral":
      return printNumericLiteral(path, print);
    case "SelectStatement":
      return printSelectStatement(path, print);
    case "Symbol":
      return printSymbol(path, print);
    case "EOF":
      return printEOF(path, print);
    default:
      return "not implemented";
  }
};

const printComment = (path: FastPath, print: PrintFunc): Doc => {
  const node = new Node(path, print);
  return node.printSelf();
};

const printEOF = (path: FastPath, print: PrintFunc): Doc => {
  const node = new Node(path, print);
  return node.printSelf();
};

const printNumericLiteral = (path: FastPath, print: PrintFunc): Doc => {
  const node = new Node(path, print);
  return concat([node.printSelf(), node.printXIfExists("comma")]);
};

const printSelectStatement = (path: FastPath, print: PrintFunc): Doc => {
  const node = new Node(path, print);
  // following comments
  const leading_comments = node.printXsIfExists(
    "leading_comments",
    "",
    (x) => concat([x, hardline])
  );
  // SELECT clause
  let select: Doc = node.printSelf(true);
  const exprs = node.printXs("exprs", line, (x: Doc) => group(x));
  select = concat([select, indent(concat([line, exprs]))]);
  if (node.lengthOf("exprs") === 1) {
    select = group(select);
  }
  return concat([
    leading_comments,
    group(concat([select])),
    node.printNewLine(),
  ]);
};

const printSymbol = (path: FastPath, print: PrintFunc): Doc => {
  const node = new Node(path, print);
  return node.printSelf();
};
