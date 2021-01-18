const { Parser } = require("node-sql-parser");
const parser = new Parser();
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
    parse: (text) => parser.astify(text),
    astFormat: "sql-ast",
  },
};

function printSQL(path, options, print) {
  const node = path.getValue();
  if (Array.isArray(node)) {
    return concat(path.map(print));
  }
  if ("expr" in node) {
    return path.call(print, "expr");
  } else if ("ast" in node) {
    return path.call(print, "ast");
  }
  switch (node.type) {
    case "select":
      return printSelectStatement(path, options, print);
    case "column_ref":
      return printColumnRef(path, options, print);
    default:
      return "default";
  }
}

const printSelectStatement = (path, options, print) => {
  const node = path.getValue();
  const res = [];
  if (node.with) {
    res.push(printWithClause(path, options, print));
  }
  res.push(printSelectClause(path, options, print));
  //res.push(concat([hardline, ";"]));
  return concat(res);
};


const printWithClause = (path, options, print) => {
  const node = path.getValue();
  const _printTempTable = (path, options, print) => {
    const node = path.getValue();
    return concat([
      hardline,
      node.name,
      " AS (",
      indent(path.call(print, "stmt")),
      hardline,
      ")",
    ]);
  };
  return concat([
    "WITH",
    concat([
      indent(
        join(
          concat([hardline, ","]),
          path.map((p) => {
            return _printTempTable(p, options, print);
          }, "with")
        )
      ),
      hardline,
    ]),
  ]);
};

const printSelectClause = (path, options, print) => {
  const node = path.getValue();
  const res =  concat([
    hardline,
    "SELECT",
    indent(concat(path.map(print, "columns"))),
  ]);
  return res
  if ("union" in node) {
    return join(node.union, [res, print.call(print, "_next")])
  } else {
    return res
  }
};

const printColumnRef = (path, options, print) => {
  const node = path.getValue();
  if (node.table === null) {
    return concat([hardline, node.column, ","]);
  } else {
    return concat([hardline, node.table, ".", node.column, ","]);
  }
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
