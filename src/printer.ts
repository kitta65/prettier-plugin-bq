import { reservedKeywords, globalFunctions } from "./keywords";
import { doc } from "prettier";
import type { Doc, FastPath } from "prettier";

const {
  builders: {
    concat,
    //group,
    hardline,
    //indent,
    //join,
    //line,
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

type Node = {
  token: Token | null;
  children: { [key: string]: {Node: Node} | {NodeVec: Node[]} };
  NodeType: string;
};

export const printSQL = (
  path: FastPath,
  _: Object, // options
  print: (path: FastPath) => Doc
): Doc => {
  // NOTE the type of `node` is any!
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
  switch (node.node_type) {
    case "SelectStatement":
      return printSelf(path, print);
    default:
      return printSelf(path, print);
  }
};

const call = (
  path: FastPath,
  key: string,
  print: (path: FastPath) => Doc
): Doc => {
  return path.call((p) => p.call(print, key), "children");
};

const printSelf = (
  path: FastPath,
  print: (path: FastPath) => Doc
): Doc => {
  const node = path.getValue();
  // leading_comments
  let leading_comments: Doc = "";
  if ("leading_comments" in node) {
    leading_comments = node.leading_comments.NodeVec.map(
      (x: Node) => {
        if (x.token == null) {
          return [];
        }
        return [x.token.literal, hardline];
      } // literallineWithoutBreakParent may be better
    );
  }
  // self
  let self;
  if (node.token == null) {
    self = "";
  } else {
    self = node.token.literal;
  }
  if (!node.notGlobal) {
    if (
      reservedKeywords.indexOf(self.toUpperCase()) !== -1 ||
      // Field names are not allowed to start with the (case-insensitive) prefixes _PARTITION, _TABLE_, _FILE_ and _ROW_TIMESTAMP
      self.match(/^_PARTITION/i) ||
      self.match(/^_TABLE_/i) ||
      self.match(/^_FILE_/i) ||
      self.match(/^_ROW_TIMESTAMP/i)
    ) {
      self = self.toUpperCase();
    }
  }
  // except
  let except: Doc = "";
  if ("except" in node) {
    except = concat([" ", call(path, "except", print)]);
  }
  // replace
  let replace: Doc = "";
  if ("replace" in node) {
    node.replace.Node.token.literal =
      node.replace.Node.token.literal.toUpperCase();
    replace = concat([" ", call(path, "replace", print)]);
  }
  // order
  let order: Doc = "";
  let null_order: Doc = "";
  if ("order" in node) {
    order = concat([" ", call(path, "order", print)]);
  }
  if ("null_order" in node) {
    null_order = concat([
      " ",
      call(path, "null_order", print),
    ]);
  }
  // comma
  let comma: Doc = "";
  if ("comma" in node) {
    comma = call(path, "comma", print);
  }
  // following_comments
  let following_comments: Doc = "";
  if ("following_comments" in node) {
    following_comments = lineSuffix(
      node.following_comments.NodeVec.map((x: Node) => {
        if (x.token == null) {
          return [];
        }
        return concat([" ", x.token.literal]);
      })
    );
  }
  // alias
  let alias: Doc[] = [""];
  if ("as" in node) {
    alias = [" ", call(path, "as", print)];
  }
  return concat([
    leading_comments,
    self,
    except,
    replace,
    order,
    null_order,
    alias,
    comma,
    following_comments,
  ]);
};
