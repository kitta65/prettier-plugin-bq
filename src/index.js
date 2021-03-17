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
      return printDefault(path, options, print);
  }
};

const printSelectStatement = (path, options, print) => {
  const node = path.getValue();
  return concat([
    // select clause
    group(
      concat([
        concatCommentsToSelf(node),
        line,
        path.call((p) => concat(p.map(print, "NodeVec")), "exprs"),
      ])
    ),
    path.call((p) => p.call(print, "Node"), "semicolon"),
  ]);
};

const printDefault = (path, options, print) => {
  const node = path.getValue();
  const children = node.children;
  return concatCommentsToSelf(children);
};

const printFunc = (path, options, print) => {
  return "func";
  const node = path.getValue();
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

const concatCommentsToSelf = (node) => {
  // leading_comments
  let leading_comments;
  if ("leading_comments" in node) {
    let preprocess;
    if (node.leading_comments.NodeVec[0].token.line !== 0) {
      preprocess = concat([lineSuffix(""), lineSuffixBoundary]);
    } else {
      preprocess = "";
    }
    leading_comments = concat([
      preprocess,
      concat(
        node.leading_comments.NodeVec.map(
          (x) => concat([x.token.literal, literalline]) // literallineWithoutBreakParent may be better
        )
      ),
    ]);
  } else {
    leading_comments = "";
  }
  // following_comments
  let following_comments;
  if ("following_comments" in node) {
    following_comments = lineSuffix(
      concat(
        node.following_comments.NodeVec.map((x) =>
          concat([" ", x.token.literal])
        )
      )
    );
  } else {
    following_comments = "";
  }
  // self
  let self;
  if (node.self) {
    self = node.self.Node.token.literal;
  } else {
    self = JSON.stringify(node);
  }
  return concat([
    leading_comments,
    //node.self.Node.token.literal,
    self,
    following_comments,
  ]);
};

const guess_node_type = (node) => {
  if ("children" in node) {
    const basicProperties = ["self", "as", "comma"];
    if (
      0 <
      Object.keys(node.children).filter(
        (x) => basicProperties.indexOf(x) === -1
      ).length
    ) {
      return "parent"; // self and one more property
    }
  } else {
    if ("func" in node) return "func";
    if ("Node" in node.self) {
      if (node.self.Node.token.literal.toLowerCase() === "select") {
        return "selectStatement";
      }
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
