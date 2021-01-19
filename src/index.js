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
  switch (node.type) {
    case "select":
      return printSelectStatement(path, options, print);
    case "column_ref":
      return printColumnRef(path, options, print);
    case "binary_expr":
      return printBinaryExpr(path, options, print);
    case "ASC":
      return printAsc(path, options, print);
    case "DESC":
      return printDesc(path, options, print);
    case "date":
      return printDate(path, options, print);
    case "expr_list":
      return printExprList(path, options, print);
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
  if (!node.with) return ""
  const _printTempTable = (path, options, print) => {
  const node = path.getValue();
    return concat([
      hardline,
      `${node.name} AS (`,
      indent(path.call(p => p.call(print, "ast"), "stmt")),
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
  return concat([
    hardline,
    `SELECT${distinct}`,
    indent(
      concat([
        hardline,
        join(
          concat([hardline, ","]),
          path.map((p) => p.call(print, "expr"), "columns")
        ),
      ])
    ),
  ]);
};

const printColumnRef = (path, options, print) => {
  const node = path.getValue();
  const table = node.table ? `${node.table}.` : ""
  return `${table}${node.column}`;
};

const printFromClause = (path, options, print) => {
  const node = path.getValue();
  const _printTable = (path, options, print) => {
    const node = path.getValue();
    if ("expr" in node) {
      return concat([hardline, "(", indent(path.call((p) => p.call(print, "ast"), "expr")), hardline, ")"]);
    }
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
  // `=` `AND` `BETWEEN`...
  const node = path.getValue();
  if (Array.isArray(node.right)) {
    return "single";
    return `${node.operator} ${path.call(print, "left")} AND ${path.call(
      print,
      "right"
    )}`;
  } else {
    return `${path.call(print, "left")} ${node.operator} ${path.call(
      print,
      "right"
    )}`;
  }
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
  return concat([
    hardline,
    "ORDER BY ",
    join(", ", path.map(print, "orderby")),
  ]);
};

const printers = {
  "sql-ast": {
    print: printSQL,
  },
};

const printAsc = (path, options, print) => {
  const node = path.getValue();
  return path.call(print, "expr");
};

const printDesc = (path, options, print) => {
  const node = path.getValue();
  return `${path.call(print, "expr")} DESC`;
};

const printDate = (path, options, print) => {
  const node = path.getValue();
  return `DATE '${node.value}'`;
};

const printExprList = (path, options, print) => {
  const node = path.getValue();
  return "expr_list";
};

module.exports = {
  languages,
  parsers,
  printers,
};
