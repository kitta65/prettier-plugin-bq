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
    case "binaryOperator":
      return printBinaryOperator(path, options, print);
    default:
      return printSelf(path, options, print);
  }
};

const printSelectStatement = (path, options, print) => {
  const node = path.getValue();
  // from
  let from = "";
  if ("from" in node) {
    from = "from";
  }
  return concat([
    // select clause
    group(
      concat([
        markAsRoot(
          indent(
            concat([
              dedentToRoot(printSelf(path, options, print)),
              line,
              path.call((p) => join(line, p.map(print, "NodeVec")), "exprs"),
            ])
          )
        ),
        line, // needs to be placed out of indent()
      ])
    ),
    from,
    path.call((p) => p.call(print, "Node"), "semicolon"),
    line,
  ]);
};

const printFunc = (path, options, print) => {
  const node = path.getValue();
  let comma = "";
  if ("comma" in node) {
    comma = path.call((p) => p.call(print, "Node"), "comma");
  }
  return concat([
    path.call((p) => p.call(print, "Node"), "func"),
    printSelf(path, options, print, false),
    path.call((p) => join(" ", p.map(print, "NodeVec")), "args"),
    path.call((p) => p.call(print, "Node"), "rparen"),
    comma,
  ]);
};

const printBinaryOperator = (path, options, print) => {
  const node = path.getValue();
  let comma = "";
  if ("comma" in node) {
    comma = path.call((p) => p.call(print, "Node"), "comma");
  }
  return concat([
    join(" ", [
      path.call((p) => p.call(print, "Node"), "left"),
      printSelf(path, options, print, false),
      path.call((p) => p.call(print, "Node"), "right"),
    ]),
    comma,
  ]);
};

const printSelf = (path, options, print, printComma = true) => {
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
  if (printComma) {
    if ("comma" in node) {
      comma = path.call((p) => p.call(print, "Node"), "comma");
    }
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
    comma,
    following_comments,
  ]);
};

const guess_node_type = (node) => {
  if ("children" in node) {
    return "parent";
  } else {
    if ("func" in node) return "func";
    if ("Node" in node.self) {
      if (node.self.Node.token.literal.toLowerCase() === "select") {
        return "selectStatement";
      }
    }
    if ("right" in node && "left" in node) return "binaryOperator";
  }
  return ""; // default
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
