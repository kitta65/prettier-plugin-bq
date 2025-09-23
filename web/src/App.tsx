import clsx from "clsx";
import {
  ArrowTopRightOnSquareIcon,
  SparklesIcon,
} from "@heroicons/react/24/solid";
import { useState } from "react";
import * as prettier from "prettier/standalone";
import * as prettierPluginBq from "./prettier-plugin-bq";
import type { Plugin } from "prettier";

const SAMPLE_SQL = `\
-- BigQuery Scripting is supported
declare dt default current_date();
if extract(dayofweek from dt) = 1 then
  -- do nothing on Sunday
  return;
end if;

-- pipe syntax is supported
from tablename |> select x, y;

-- try to handle jinja template
{{ config(materialized='table') }}
select *
from tabelname
where
  {% target.name == 'dev' %} timestamp_sub(current_timestamp, interval 3 days) < ts {% else %} true {% endif %}
;
`;

async function prettify(sql: string) {
  const res = await prettier.format(sql, {
    parser: "sql-parse",
    plugins: [
      // @ts-expect-error: locStart, locEnd are missing
      prettierPluginBq as Plugin,
    ],
  });
  return res;
}

function App() {
  const [sql, setSql] = useState(SAMPLE_SQL);
  return (
    <>
      <header className={clsx("p-4", "font-extrabold text-5xl")}>
        Prettier Plugin BQ
      </header>
      <main
        className={clsx(
          "flex-grow p-4 gap-y-4 w-full", // shape
          "flex flex-col items-center justify-center", // flex
        )}
      >
        <textarea
          id="sql"
          className={clsx(
            "shadow bg-white", // appearance
            "max-w-2xl p-4 flex-grow rounded-md mx-4 w-full", // shape
            "outline-none outline-4 outline-dark focus:outline-solid", // outline
          )}
          value={sql}
          onChange={(e) => setSql(e.target.value)}
        />
        {/* TODO: enable to configure options */}
        <button
          className={clsx(
            [
              "-outline-offset-4", // base
              "hover:outline-4 hover:outline-dark", // hover
              "focus:outline-4 focus:outline-dark", // focus
            ], // outline
            [
              "bg-dark text-background", // base
              "hover:bg-background hover:text-dark", // hover
              "focus:bg-background focus:text-dark", // focus
            ], // color
            "flex items-center justify-center gap-x-1", // flex
            "cursor-pointer px-4 py-1 rounded-md font-bold",
          )}
          onClick={() => {
            prettify(sql).then((sql) => setSql(sql));
          }}
        >
          FORMAT
          <SparklesIcon className="size-4 inline" />
        </button>
      </main>
      <footer
        className={clsx(
          "p-4 bg-dark text-background w-full",
          "flex flex-col items-center justify-center gap-y-1",
        )}
      >
        <div>
          <a
            href="https://github.com/kitta65/prettier-plugin-bq"
            className={clsx(
              "flex items-center justify-center gap-x-1", // flex
              "cursor-pointer group", // hover
            )}
          >
            <span className="group-hover:underline">GitHub</span>
            <ArrowTopRightOnSquareIcon className="size-4 inline" />
          </a>
        </div>
        Copyright © 2025 kitta65
      </footer>
    </>
  );
}

export default App;
