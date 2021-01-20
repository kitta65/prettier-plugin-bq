// you have to run node with `--experimental-repl-await` option
const { Parser } = require("node-sql-parser");
const parser = new Parser();
const prettier = require("prettier");

const read = (path) => {
  return new Promise((resolve, reject) => {
    fs.readFile(path, { encoding: "utf8" }, (err, data) => {
      resolve(data);
    });
  });
};
const format = (code) => {
  const res = prettier.format(code, {
    parser: "sql-parse",
    plugins: ["."],
  });
  return res;
};

const sql1 = await read("../sample.sql");
const sql2 = await read("../sample2.sql");

// check parser
const ast1 = parser.astify(sql1);
const ast2 = parser.astify(sql2);

// check prittier
console.log(format(sql1));
console.log(format(sql2));

// expr
ast1.with[0].stmt.ast.columns
ast1.orderby
ast1.having.left
ast2.from[0]

