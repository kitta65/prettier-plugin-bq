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

parser.sqlify(ast);

// check prittier
format(sql)
console.log(format(sql));
