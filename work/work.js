/* eslint-disable */

// you have to run node...
// with `--experimental-repl-await` option
// in root directory of this project

const parser = require("@dr666m1/bq2cst");
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

const sql = await read("sql/sample.sql");

// check parser
const ast = parser.parse(sql);

// check prittier
console.log(format(sql));
