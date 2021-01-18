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

const sql = await read("../sample.sql");
console.log(sql);

// check parser
const ast = parser.astify(sql);
ast
ast.with
ast.with[0].stmt
ast.with[0].stmt.ast
ast.columns[0]
ast.orderby
parser.astify(`select 1;`);
parser.astify(`select 1;`)[0];
parser.astify(`update tb set id = null where id < 100`);

parser.sqlify(ast);

// check prittier
format(sql)
console.log(format(sql));
