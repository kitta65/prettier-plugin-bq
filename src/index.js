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
      lineSuffix,
      lineSuffixBoundary,
      markAsRoot,
      dedentToRoot,
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
    case "func":
      return printFunc(path, options, print);
    case "error":
      return JSON.stringify(node);
    default:
      //return "default";
      return printSelf(path, options, print); // TODO
  }
};

const printSelectStatement = (path, options, print) => {
  const node = path.getValue();
  return concat([
    // select clause
    group(
      markAsRoot(
        indent(
          concat([
            dedentToRoot(printSelf(path, options, print)),
            line,
            path.call((p) => concat(p.map(print, "NodeVec")), "exprs"),
          ])
        )
      )
    ),
    path.call((p) => p.call(print, "Node"), "semicolon"),
    line,
  ]);
};

const printFunc = (path, options, print) => {
  const node = path.getValue();
  return concat([
    path.call((p) => p.call(print, "Node"), "func"),
    printSelf(path, options, print),
    path.call((p) => concat(p.map(print, "NodeVec")), "args"),
    path.call((p) => p.call(print, "Node"), "rparen"),
  ]);
  // comma
  //let comma;
  //if ("comma" in node.children) {
  //  comma = node.children.comma.Node.token.literal;
  //} else {
  //  comma = "";
  //}
  //return concat([
  //  node.children.func.Node.token.literal,
  //  path.call((p) => p.call(print, "self"), "children"),
  //  path.call((p) => p.call(print, "args"), "children"),
  //  path.call((p) => p.call(print, "rparen"), "children"),
  //  comma,
  //]);
};

const printSelf = (path, options, print) => {
  const node = path.getValue();
  // leading_comments
  let leading_comments = "";
  if ("leading_comments" in node) {
    leading_comments = concat([
      // leading lineSuffixBoundary might be needed
      concat(
        node.leading_comments.NodeVec.map(
          (x) => concat([x.token.literal, hardline]) // literallineWithoutBreakParent may be better
        )
      ),
    ]);
  }
  // comma
  let comma = "";
  if ("comma" in node) {
    comma = path.call((p) => p.call(print, "Node"), "comma"); // TODO
  }
  // following_comments
  let following_comments = "";
  if ("following_comments" in node) {
    following_comments = lineSuffix(
      concat(
        node.following_comments.NodeVec.map((x) =>
          concat([" ", x.token.literal])
        )
      )
    );
  }
  return concat([
    leading_comments,
    node.self.Node.token.literal,
    following_comments,
  ]);
};

const guess_node_type = (node) => {
  if ("children" in node) {
    //const basicProperties = [
    //  "self",
    //  "as",
    //  "comma",
    //  "leading_comments",
    //  "following_comments",
    //];
    //if (
    //  0 <
    //  Object.keys(node.children).filter(
    //    (x) => basicProperties.indexOf(x) === -1
    //  ).length
    //) {
    return "parent";
    //} else {
    //  return ""; // default
    //}
  } else {
    if ("func" in node) return "func";
    if ("Node" in node.self) {
      if (node.self.Node.token.literal.toLowerCase() === "select") {
        return "selectStatement";
      }
    }
    return "";
  }
  return "error";
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
