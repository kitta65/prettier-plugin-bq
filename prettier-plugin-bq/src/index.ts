import { parse } from "bq2cst";
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
    parse: (text: string) => parse(text),
    astFormat: "sql-ast",
  },
};

const printers = {
  "sql-ast": {
    print: printSQL,
  },
};

const CATEGORY_BQ = "BQ";

const options = {
  formatMultilineComment: {
    type: "boolean",
    category: CATEGORY_BQ,
    default: false,
    description: "Format multiline-comment.",
  },
  indentCte: {
    type: "boolean",
    category: CATEGORY_BQ,
    default: true,
    description: "Indent CTE in with clause.",
  },
  printBlankLineAfterCte: {
    type: "boolean",
    category: CATEGORY_BQ,
    default: false,
    description: "Print blank line after CTE in with clause.",
  },
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
    description: "Print pseudo columns in upper case.",
  },
};

module.exports = {
  languages,
  parsers,
  printers,
  options,
};
