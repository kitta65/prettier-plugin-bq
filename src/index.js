const parser = require("@dr666m1/bq2cst");
const {
  doc: {
    builders: {
      concat,
      hardline,
      group,
      indent,
      softline,
      join,
      line,
      literalline,
    },
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

  switch (guess_node_type(node)) {
    case "parent":
      return path.call(print, "children");
    case "selectStatement":
      return printSelectStatement(path, options, print);
    default:
      return "default";
  }
};

const printSelectStatement = (path, options, print) => {
  const node = path.getValue();
  return concat([concatCommentsToSelf(node)]);
};

const printFunc = (path, options, print) => {
  const node = path.getValue();
  // comma
  let comma;
  if ("comma" in node.children) {
    comma = node.children.comma.Node.token.literal;
  } else {
    comma = "";
  }
  return concat([
    node.children.func.Node.token.literal,
    path.call((p) => p.call(print, "self"), "children"),
    path.call((p) => p.call(print, "args"), "children"),
    path.call((p) => p.call(print, "rparen"), "children"),
    comma,
  ]);
};

const printExpr = (path, options, print) => {
  return "printExpr";
};

const concatCommentsToSelf = (node) => {
  // leading_comments
  let leading_comments;
  if ("leading_comments" in node) {
    leading_comments = concat([
      node.leading_comments.NodeVec.map((x) =>
        concat([x.token.literal, literalline])
      ),
    ]);
  } else {
    leading_comments = "";
  }
  // following_comments
  let following_comments;
  if ("following_comments" in node) {
    following_comments = concat([concat(
      node.following_comments.NodeVec.map((x) => concat([" ", x.token.literal]))
    ), hardline]);
  } else {
    following_comments = "";
  }
  return concat([
    group(
      concat([
        leading_comments,
        node.self.Node.token.literal,
        following_comments,
      ])
    ),
    line,
  ]);
};

const guess_node_type = (node) => {
  if ("children" in node) return "parent";
  if ("Node" in node.self) {
    if (node.self.Node.token.literal.toLowerCase() === "select")
      return "selectStatement";
  }
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
