const parser = require("@dr666m1/bq2cst");
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
    parse: (text) => parser.parse(text),
    astFormat: "sql-ast",
  },
};

let currentDepth = 0; // it may not be the best approach

function printSQL(path, options, print) {
  const node = path.getValue()

  if (Array.isArray(node)) {
    return concat(path.map(print))
  }

  switch (get_node_type(node)) {
    default:
      return ''
  }
}

const get_node_type = (node) => {
  return ''
}

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
