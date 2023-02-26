# prettier-plugin-bq
`@dr666m1/prettier-plugin-bq` is a [prettier](https://prettier.io/) plugin for **standardSQL**, which is a dialect of BigQuery.

⚠️ This plugin is still a work in progress, so the behavior would change frequently.

## Install
```
npm install --save-dev --save-exact prettier @dr666m1/prettier-plugin-bq
```

## Usage
As the prettier [document](https://prettier.io/docs/en/plugins.html) says, the plugin is automatically loaded.
> Plugins are automatically loaded if you have them installed in the same `node_modules` directory where prettier is located.

You can format `.sql` and `.bq` file by the following command.
```
npx prettier --write ./xxx.sql
```

For more information, please read the prettier document.

## Configuration
Below are the options that `@dr666m1/prettier-plugin-bq` currently supports.

|API Option|CLI Option|Default|Description|
|---|---|---|---|
|formatMultilineComment|format-multiline-comment|false|(experimental) Print multiline commnets in ["starred-block"](https://eslint.org/docs/rules/multiline-comment-style) style.|
|indentCte|indent-cte|true|Indent CTEs in with clause.|
|printBlankLineAfterCte|print-blank-line-after-cte|false|Print blank line after CTE in with clause.|
|printKeywordsInUpperCase|print-keywords-in-upper-case|true|Print [reserved keywords](https://cloud.google.com/bigquery/docs/reference/standard-sql/lexical#reserved_keywords) and functions in upper case.|
|printPseudoColumnsInUpperCase|print-pseudo-columns-in-upper-case|true|Print pseudo columns (e.g. `_PARTITIONDATE`, `_PARTITIONTIME`) in upper case. When `printKeywordsInUpperCase` is `false`, this option is ignored.|

## Coding style
This plugin doesn't follow any famous style guides,
because none of them satisfies me.

## Feedback
I'm not ready to accept pull requests, but your feedback is always welcome.
If you find any bugs, please feel free to create an issue.
