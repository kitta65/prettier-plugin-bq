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
    return join(line, path.map(print));
  }

  switch (guess_node_type(node)) {
    case "selectStatement":
      return printSelectStatement(path, options, print);
    case "func":
      return printFunc(path, options, print);
    case "Node":
      return path.call(print, "Node");
    case "NodeVec":
      return path.call(print, "NodeVec");
    default:
      return printDefault(path, options, print);
  }
};

const printSelectStatement = (path, options, print) => {
  const node = path.getValue();
  // leading_comments
  let leading_comments;
  if ("leading_comments" in node.children) {
    leading_comments = concat(
      node.children.leading_comments.NodeVec.map((x) =>
        concat([x.token.literal, literalline])
      )
    );
  } else {
    leading_comments = "";
  }
  // following_comments
  let following_comments;
  if ("following_comments" in node.children) {
    following_comments = concat([
      concat(
        node.children.following_comments.NodeVec.map((x) =>
          concat([" ", x.token.literal])
        )
      ),
      hardline,
    ]);
  } else {
    following_comments = line;
  }
  let semicolon;
  if ("semicolon" in node.children) {
    semicolon = path.call((p) => p.call(print, "semicolon"), "children");
  } else {
    semicolon = ";";
  }
  return concat([
    group(
      concat([
        // select clause
        indent(
          concat([
            concat([leading_comments, "SELECT", following_comments]), // first line is not indented
            //line,
            group(path.call((p) => p.call(print, "exprs"), "children")),
          ])
        ),
        // from clause
        // where clause
        // limit clause
        semicolon,
      ])
    ),
    hardline,
  ]);
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

const printDefault = (path, options, print) => {
  const node = path.getValue();
  // leading_comments
  let leading_comments;
  if ("leading_comments" in node.children) {
    leading_comments = concat(
      node.children.leading_comments.NodeVec.map((x) =>
        concat([x.token.literal, literalline])
      )
    );
  } else {
    leading_comments = "";
  }
  // following_comments
  let following_comments;
  if ("following_comments" in node.children) {
    following_comments = concat([
      concat(
        node.children.following_comments.NodeVec.map((x) =>
          concat([" ", x.token.literal])
        )
      ),
      hardline,
    ]);
  } else {
    following_comments = "";
  }
  // comma
  let comma;
  if ("comma" in node.children) {
    comma = node.children.comma.Node.token.literal;
  } else {
    comma = "";
  }
  return concat([
    leading_comments,
    node.token.literal,
    following_comments,
    comma,
  ]);
};

const printExpr = (path, options, print) => {
  return "printExpr";
};

const guess_node_type = (node) => {
  if ("Node" in node) return "Node";
  if ("NodeVec" in node) return "NodeVec";
  if (node.children && "func" in node.children) {
    return "func";
  }
  if ("self" in node.children) {
    if (node.children.self.Node.token.literal.toLowerCase() === "select") {
      return "selectStatement";
    }
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
