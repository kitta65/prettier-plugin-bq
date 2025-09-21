# prettier-plugin-bq

`prettier-plugin-bq` is a [prettier](https://prettier.io/) plugin for **GoogleSQL**, which is a dialect of BigQuery.

## Features

- support [pipe syntax](https://cloud.google.com/bigquery/docs/reference/standard-sql/pipe-syntax)
- support [procedural language](https://cloud.google.com/bigquery/docs/reference/standard-sql/procedural-language) (a.k.a BigQuery Scripting)
- try to handle jinja templates (though not perfect)

## Install

```
npm install --save-dev prettier prettier-plugin-bq
```

## Usage

You can format `.sql` and `.bq` file by the following command.

```
npx prettier --write ./xxx.sql --plugin=prettier-plugin-bq
```

If you want to omit `--plugin=prettier-plugin-bq`, add the plugin to your `.prettierrc`.

```jsonc
// .prettierrc
{
  "plugins": ["prettier-plugin-bq"]
}
```

For more information, please read the prettier document.

## Configuration

`prettier-plugin-bq` supports the options below.

| API Option               | CLI Option                   | Default | Description                                                                                                    |
| ------------------------ | ---------------------------- | ------- | -------------------------------------------------------------------------------------------------------------- |
| indentCte                | indent-cte                   | true    | Indent CTEs in with clause.                                                                                    |
| printBlankLineAfterCte   | print-blank-line-after-cte   | false   | Print blank line after CTE in with clause.                                                                     |
| printKeywordsInUpperCase | print-keywords-in-upper-case | true    | Print keywords, built-in functions and pseudo columns (e.g. `_PARTITIONDATE`, `_PARTITIONTIME`) in upper case. |

> [!NOTE]
>
> `printPseudoColumnsInUpperCase` was merged into printKeywordsInUpperCase.

## Coding style

This plugin doesn't follow any famous style guides,
because none of them account for GoogleSQL's latest syntax (such as pipe syntax).

## Feedback

I'm not ready to accept pull requests, but your feedback is always welcome.
If you find any bugs, please feel free to create an issue.
