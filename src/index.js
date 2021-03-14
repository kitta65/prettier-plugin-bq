const parser = require("@dr666m1/bq2cst");
const {
  doc: {
    builders: { concat, hardline, group, indent, softline, join, line },
  },
  util,
} = require("prettier");

const languages = [
  {
    extensions: [".sql"],
    name: "sql",
    parsers: ["sql-parse"],
  },
];

const parsers = {
  "sql-parse": {
    parse: (text) => parser.parse(text),
    astFormat: "sql-ast",
  },
};

const printSQL = (path, options, print) => {
  const node = path.getValue();

  if (Array.isArray(node)) {
    return concat(path.map(print));
  }
  switch (get_node_type(node)) {
    case "selectStatement":
      return printSelectStatement(path, options, print);
    case "Node":
      return path.call(print, "Node");
    case "NodeVec":
      return path.call(print, "NodeVec");
    default:
      return node.token.literal;
  }
};

const printSelectStatement = (path, options, print) => {
  const node = path.getValue();
  if ("semicolon" in node.children) {
    semicolon = path.call((p) => p.call(print, "semicolon"), "children");
  } else {
    semicolon = "semicolon";
  }
  return concat([
    group(
      concat([
        printDefault(node),
        path.call((p) => p.call(print, "exprs"), "children"),
        semicolon,
      ])
    ),
    hardline,
  ]);
};

const printDefault = (node) => {
  if ("leading_comments" in node.children) {
    leading_comments = concat(
      node.children.leading_comments.NodeVec.map((x) =>
        concat([x.token.literal, hardline])
      )
    );
  } else {
    leading_comments = "";
  }
  if ("following_comments" in node.children) {
    following_comments = concat([
      concat(node.children.following_comments.NodeVec.map((x) => x.token.literal)),
      hardline,
    ]);
  } else {
    following_comments = "";
  }
  return concat([
    leading_comments,
    join(" ", [node.children.self.Node.token.literal, following_comments]),
  ]);
};

const printExpr = (path, options, print) => {
  return "printExpr";
};

const get_node_type = (node) => {
  if ("Node" in node) return "Node";
  if ("NodeVec" in node) return "NodeVec";
  if (node.children.self.Node.token.literal.toLowerCase() === "select")
    return "selectStatement";
  return "";
};

const printers = {
  "sql-ast": {
    print: printSQL,
  },
};

module.exports = {
  languages,
  parsers,
  printers,
};
