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

  switch (node.type) {
    case "select":
      return printAllClause(node);
    default:
      return "";
  }
}

const printAllClause = (node) => {
  const res = [];
  if (node.with) {
    res.push(printWithClause(node));
  }
  res.push(printSelectClause(node));
  return concat(res);
};

const printWithClause = (node) => {
  return "with";
};

const printSelectClause = (node) => {
  return "select * from xxx";
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
