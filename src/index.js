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
    case "select":
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
  return concat(["SELECT", path.call(p => p.call(print, "exprs"), "children")]);
};

const printExpr = (path, options, print) => {
  return "printExpr";
};

const get_node_type = (node) => {
  if ("Node" in node) return "Node"
  if ("NodeVec" in node) return "NodeVec"
  if (node.children.self.Node.token.literal.toLowerCase() === "select") return "select";
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
