# prettier-plugin-bq

`prettier-plugin-bq` is a [prettier](https://prettier.io/) plugin for **GoogleSQL**, which is a dialect of BigQuery.

## Install

```
npm install --save-dev prettier prettier-plugin-bq
```

## Usage

You can format `.sql` and `.bq` file by the following command.

```
npx prettier --write ./xxx.sql --plugin=prettier-plugin-bq
```

For more information, please read the prettier document.

## Configuration

Below are the options that `prettier-plugin-bq` currently supports.

| API Option                    | CLI Option                         | Default | Description                                                                                                                                       |
| ----------------------------- | ---------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| formatMultilineComment        | format-multiline-comment           | false   | (experimental) Print multiline commnets in ["starred-block"](https://eslint.org/docs/rules/multiline-comment-style) style.                        |
| indentCte                     | indent-cte                         | true    | Indent CTEs in with clause.                                                                                                                       |
| printBlankLineAfterCte        | print-blank-line-after-cte         | false   | Print blank line after CTE in with clause.                                                                                                        |
| printKeywordsInUpperCase      | print-keywords-in-upper-case       | true    | Print [reserved keywords](https://cloud.google.com/bigquery/docs/reference/standard-sql/lexical#reserved_keywords) and functions in upper case.   |
| printPseudoColumnsInUpperCase | print-pseudo-columns-in-upper-case | true    | Print pseudo columns (e.g. `_PARTITIONDATE`, `_PARTITIONTIME`) in upper case. When `printKeywordsInUpperCase` is `false`, this option is ignored. |

## Coding style

This plugin doesn't follow any famous style guides,
because none of them satisfies me.

## Feedback

I'm not ready to accept pull requests, but your feedback is always welcome.
If you find any bugs, please feel free to create an issue.
