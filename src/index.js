const { Parser } = require("node-sql-parser");
const parser = new Parser();
const {
  doc: {
    builders: { concat, hardline, group, indent, softline, join, line },
  },
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
    parse: (text) => parser.astify(text),
    astFormat: "sql-ast",
  },
};

function printSQL(path, options, print) {
  const node = path.getValue();

  if (Array.isArray(node)) {
    return concat(path.map(print));
  }
  if ("expr" in node || "stmt" in node) {
    return path.call(print, "expr");
  }
  switch (node.type) {
    case "select":
      return printSelectStatement(path, options, print);
    case "column_ref":
      return printColumnRef(path, options, print);
    default:
      return "";
  }
}

const printSelectStatement = (path, options, print) => {
  const node = path.getValue();
  const res = [];
  if (node.with) {
    res.push(printWithClause(path, options, print));
  }
  res.push(printSelectClause(path, options, print));
  res.push(";");
  return concat(res);
};

const printWithElement = (path, options, print) => {
  const node = path.getValue()
  return node.name;
};

const printWithClause = (path, options, print) => {
  const node = path.getValue();
  return concat([
    "WITH",
    hardline,
    indent(
      concat(
        path.map((p) => {
          return printWithElement(p, options, print);
        }, "with")
      )
    ),
  ]);
};

const printSelectClause = (path, options, print) => {
  const node = path.getValue();
  return concat([
    "SELECT",
    hardline,
    indent(concat(path.map(print, "columns"))),
    hardline,
  ]);
};

const printColumnRef = (path, options, print) => {
  const node = path.getValue();
  return concat([node.table, ".", node.column, ",", hardline]);
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
