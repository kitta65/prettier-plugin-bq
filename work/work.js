// you have to run node with `--experimental-repl-await` option
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

const sql1 = await read("../sql/sample.sql");
const sql2 = await read("../sql/sample_subquery.sql");
const sql3 = await read("../sql/sample_window.sql");
const sql4 = await read("../sql/sample_complicated_where.sql");

// check parser
cst = parser.parse(`
select -- end
1,func(1);
`);
cst[0].children.exprs.NodeVec[1]
Object.keys(cst[0].children).map((x) => {
  console.log;
  ("a");
});
{a: "aa"}.length
Object.keys(cst[0].children.semicolon);
const ast1 = parser.parse(sql1);
const ast2 = parser.parse(sql2);
const ast3 = parser.parse(sql3);
const ast4 = parser.parse(sql4);

// check prittier
console.log(format(sql1));
console.log(format(sql2));
console.log(format(sql3));
console.log(format(sql4));

// expr
ast1.with[0].stmt.ast.columns;
ast1.orderby;
ast1.having.left;
ast2.from;

//expr_list
ast1.columns[0].expr;
ast1.where;
let a, b;
a = { a: "aaa", b: "bbb" };
b = { chile: a };
b;
b = { ...a, c: "ccc" };
