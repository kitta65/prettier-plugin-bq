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
  res.push(printFromClause(path, options, print));
  //res.push(concat([hardline, ";"]));
  if (!node.union) return concat(res)
  return join(concat([hardline, node.union.toUpperCase()]), [concat(res), path.call(print, "_next")]);
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
  const res = concat([
    hardline,
    "SELECT",
    indent(join(",", path.map(print, "columns"))),
  ]);
  return res;
};

const printColumnRef = (path, options, print) => {
  const node = path.getValue();
  if (node.table === null) {
    return concat([hardline, node.column]);
  } else {
    return concat([hardline, node.table, ".", node.column]);
  }
};

const printFromClause = (path, options, print) => {
  const node = path.getValue();
  const _printTable = (table) => {
    let res = [hardline];
    if (table.join) res.push(`${table.join} `)
    if (table.db) res.push(`${table.db}.`);
    res.push(table.table);
    if (table.as) res.push(`AS ${table.as}`);
    res = concat(res)
    return res
    //if (!table.on) return res
    //return concat([res, indent(concat([hardline, "on", res.operator]))])
  };
  return concat([hardline, "FROM", indent(concat(node.from.map(_printTable)))]);
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
