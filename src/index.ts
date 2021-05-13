import parser from "@dr666m1/bq2cst";
import printSQL from "./printer";

const languages = [
  {
    extensions: [".sql", ".bq"],
    name: "sql",
    parsers: ["sql-parse"],
  },
];

const parsers = {
  "sql-parse": {
    parse: (text: string) => parser.parse(text),
    astFormat: "sql-ast",
  },
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


