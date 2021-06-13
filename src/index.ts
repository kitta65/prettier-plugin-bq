import parser from "@dr666m1/bq2cst";
import { printSQL } from "./printer";

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

const CATEGORY_BQ = "BQ"

const options = {
  printKeywordsInUpperCase: {
    type: "boolean",
    category: CATEGORY_BQ,
    default: true,
    description: "Print reserved keywords and functions in upper case.",
  },
  printPseudoColumnsInUpperCase: {
    type: "boolean",
    category: CATEGORY_BQ,
    default: true,
    description: "Print pseudo columns in upper case."
  }
};

module.exports = {
  languages,
  parsers,
  printers,
  options,
};
