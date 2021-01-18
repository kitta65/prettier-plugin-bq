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
  if ("ast" in node) {
    //for with clause
    return path.call(print, "ast");
  }
  switch (node.type) {
    case "select":
      return printSelectStatement(path, options, print);
    case "column_ref":
      return printColumnRef(path, options, print);
    case "binary_expr":
      return printBinaryExpr(path, options, print);
    case "ASC":
      return "ASC";
    default:
      return node.value.toString();
  }
}

const printSelectStatement = (path, options, print) => {
  const node = path.getValue();
  const res = [];
  if (node.with) res.push(printWithClause(path, options, print));
  res.push(printSelectClause(path, options, print));
  res.push(printFromClause(path, options, print));
  if (node.where) res.push(printWhereClause(path, options, print));
  if (node.orderby) res.push(printOrderByClause(path, options, print));
  if (node.limit) res.push(printLimitClause(path, options, print));
  if (!node.union) return concat(res);
  return join(concat([hardline, node.union.toUpperCase()]), [
    concat(res),
    path.call(print, "_next"),
  ]);
  //res.push(concat([hardline, ";"]));
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
  const distinct = node.distinct ? " DISTINCT" : "";
  const res = concat([
    hardline,
    `SELECT${distinct}`,
    indent(
      concat([
        hardline,
        join(concat([hardline, ","]), path.map(p => p.call(print, "expr"), "columns")),
      ])
    ),
  ]);
  return res;
};

const printColumnRef = (path, options, print) => {
  const node = path.getValue();
  if (node.table === null) {
    return node.column;
  } else {
    return concat([node.table, ".", node.column]);
  }
};

const printFromClause = (path, options, print) => {
  const node = path.getValue();
  const _printTable = (path, options, print) => {
    const node = path.getValue();
    let res = [hardline];
    if (node.join) res.push(`${node.join} `);
    if (node.db) res.push(`${node.db}.`);
    res.push(node.table);
    if (node.as) res.push(`AS ${node.as}`);
    res = concat(res);
    if (!node.on) return res;
    return concat([
      res,
      indent(concat([hardline, "ON ", path.call(print, "on")])),
    ]);
  };
  return concat([
    hardline,
    "FROM",
    indent(concat(path.map((p) => _printTable(p, options, print), "from"))),
  ]);
};

const printBinaryExpr = (path, options, print) => {
  const node = path.getValue();
  return join(` ${node.operator} `, [
    path.call(print, "left"),
    path.call(print, "right"),
  ]);
};

const printWhereClause = (path, options, print) => {
  const node = path.getValue();
  return concat([
    hardline,
    "WHERE",
    indent(concat([hardline, path.call(print, "where")])),
  ]);
};

const printLimitClause = (path, options, print) => {
  const node = path.getValue();
  return concat([
    hardline,
    "LIMIT ",
    path.call((p) => p.call(print, "value"), "limit"),
  ]);
};

const printOrderByClause = (path, options, print) => {
  const node = path.getValue();
  return concat([hardline, "ORDER BY ", join(", ", path.map(p => p.call(print, "expr"), "orderby"))]);
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
