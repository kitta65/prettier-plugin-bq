import { reservedKeywords, globalFunctions } from "./keywords";
import { doc } from "prettier";
import type { Doc, FastPath } from "prettier";

const {
  builders: {
    //group,
    //hardline,
    //indent,
    //join,
    //line,
    //lineSuffix,
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

type RawNode = {
  token: Token | null;
  children: { [key: string]: { Node: RawNode } | { NodeVec: RawNode[] } };
  node_type: string;
  emptyLines?: number;
};

class Node {
  private node: RawNode;
  constructor(
    private readonly path: FastPath,
    private readonly printFunc: (path: FastPath) => Doc
  ) {
    /**
     * NOTE
     * you can assume type of `path.getValue()` to be `Node`
     * because `Node[]` has been splitted in `printSQL`.
     */
    this.node = path.getValue();
  }
  print(key: string) {
    if (key in this.node) {
      return this.path.call((p) => p.call(this.printFunc, key), "children");
    } else {
      return "";
    }
  }
}

export const printSQL = (
  path: FastPath,
  _: Object, // options
  print: (path: FastPath) => Doc
): Doc | Doc[] => {
  /**
   * NOTE
   * you can assume type of `path.getValue()` to be `Node | Node[]`.
   * it is tested by `@dr666m1/bq2cst`
   */
  const node: RawNode | RawNode[] = path.getValue();

  if (Array.isArray(node)) {
    for (let i = 0; i < node.length - 1; i++) {
      if ("semicolon" in node[i].children) {
        // end of statement
        const semicolon = node[i].children.semicolon as { Node: RawNode };
        let endNode = semicolon.Node;
        const endToken = endNode.token;
        if (endToken == null) {
          throw new Error(`semicolon must have a \`token\` property but not found!`);
        }
        let endLine = endToken.line;
        if ("following_comments" in endNode.children) {
          const following_comments = endNode.children.following_comments as {
            NodeVec: RawNode[];
          };
          const len = following_comments.NodeVec.length;
          endNode = following_comments.NodeVec[len - 1];
          const endLiteral = endToken.literal;
          let newLines = endLiteral.match(/\n/g);
          if (newLines) {
            endLine = endToken.line + newLines.length;
          }
        }
        // start of statement
        let startNode = node[i + 1];
        while (startNode.node_type === "SetOperator") {
          const left = startNode.children.left as { Node: RawNode };
          startNode = left.Node;
        }
        let startLine;
        let startToken = startNode.token;
        if (startToken) {
          startLine = startToken.line;
        } else {
          // EOF
          startLine = endLine + 1;
        }
        if ("leading_comments" in startNode.children) {
          const leading_comments = startNode.children.leading_comments as {
            NodeVec: RawNode[];
          };
          startToken = leading_comments.NodeVec[0].token;
          if (startToken == null) {
            throw new Error(`leading_comments must have a \`token\` property but not found!`);
          }
          startLine = startToken.line;
        }
        node[i].emptyLines = startLine - endLine - 1;
      }
    }
    return path.map(print);
  }
  switch (node.node_type) {
    case "SelectStatement":
      return "SELECT";
    case "EOF":
      return "EOF";
    default:
      return "not implemented";
  }
};
