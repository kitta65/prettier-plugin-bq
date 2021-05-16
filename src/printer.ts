//import { reservedKeywords, globalFunctions } from "./keywords";
import { doc } from "prettier";
import type { Doc, FastPath } from "prettier";

const {
  builders: {
    concat,
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

export const printSQL = (path: FastPath, options: Object, print: (path: FastPath) => Doc): Doc => {
  const node = path.getValue();
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length - 2; i++) {
      if ("semicolon" in node[i].children) {
        // end of statement
        let endNode = node[i].children.semicolon.Node;
        let endLine = endNode.token.line;
        if ("following_comments" in endNode.children) {
          const len = endNode.children.following_comments.NodeVec.length;
          endNode = endNode.children.following_comments.NodeVec[len - 1];
          const endLiteral = endNode.token.literal;
          let newLines = endLiteral.match(/\n/g);
          if (newLines) {
            endLine = endNode.token.line + newLines.length;
          }
        }
        // start of statement
        let startNode = node[i + 1];
        while (
          ["UNION", "INTERSECT", "EXCEPT"].indexOf(
            startNode.token.literal.toUpperCase()
          ) !== -1
        ) {
          if ("left" in startNode.children) {
            startNode = startNode.children.left.Node;
          } else if ("stmt" in startNode.children) {
            startNode = startNode.children.stmt.Node;
          } else {
            return JSON.stringify(node);
          }
        }
        let startLine = startNode.token.line;
        if ("leading_comments" in startNode.children) {
          startLine = startNode.children.leading_comments.NodeVec[0].token.line;
        }
        node[i].children.emptyLines = startLine - endLine - 1;
      }
    }
    return concat(path.map(print));
  }
  if ("children" in node) {
    node.children.node_type = node.node_type
    node.children.token = node.token
    return path.call(print, "children")
  }
  return concat(["aaa"])
};
