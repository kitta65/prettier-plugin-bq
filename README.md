# prettier-plugin-bq

`prettier-plugin-bq` is a [prettier](https://prettier.io/) plugin for **GoogleSQL**, which is a dialect of BigQuery.

## Features

- support [pipe syntax](https://cloud.google.com/bigquery/docs/reference/standard-sql/pipe-syntax)
- support [procedural language](https://cloud.google.com/bigquery/docs/reference/standard-sql/procedural-language) (a.k.a BigQuery Scripting)
- try to handle jinja templates (see below)

<details><summary>about jinja template support</summary>
<p>
Roughly speaking, jinja statements are expected to contain valid SQL expression(s).

```sql
SELECT
  -- OK! `foo * {{i}}` and `bar * {{i}}` are valid SQL expressions (alias is also allowed).
  {% for i in range(10) %}
    foo * {{i}} as `f_{{i}}`,
    bar * {{i}} as `b_{{i}}`,
  {% endfor %}
FROM tabelname
WHERE
  -- OK! `CURRENT_DATE() - 3 <= dt` and `TRUE` are valid SQL expressions.
  {% target.name == 'dev' %} CURRENT_DATE() - 3 <= dt {% else %} TRUE {% endif %}
;
```

```sql
SELECT *
FROM tabelname
-- Error! WHERE clause is not valid SQL expression.
{% target.name == 'dev' %} WHERE CURRENT_DATE() - 3 <= dt {% endif %}
;
```

</p>
</details>

## Playground

You can try `prettier-plugin-bq` online.

https://kitta65.github.io/prettier-plugin-bq/

<img width="1523" height="527" alt="image" src="https://github.com/user-attachments/assets/7ddb4cb0-821b-452a-a3ef-37302deb2f88" />

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
