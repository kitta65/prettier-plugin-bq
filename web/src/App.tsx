import clsx from "clsx";
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/solid";
import { useState } from "react";
import * as prettier from "prettier/standalone";
import * as prettierPluginBq from "prettier-plugin-bq";

async function prettify(sql: string) {
  // TODO: exec prettier
  const res = await prettier.format(sql, {
    parser: "sql-parse",
    plugins: [
      // @ts-expect-error: ignore
      prettierPluginBq,
    ],
  });
  return res;
}

function App() {
  const [sql, setSql] = useState("select 1;");
  return (
    <>
      <header className={clsx("p-4", "font-extrabold text-5xl")}>
        Prettier Plugin BQ
      </header>
      <textarea
        id="sql"
        className={clsx(
          "shadow bg-white rounded-md",
          // TODO: responsive width
          "w-100 p-4 flex-grow m-4",
          "outline-none outline-4 outline-dark focus:outline-solid",
        )}
        value={sql}
        onChange={(e) => setSql(e.target.value)}
      />
      <div className="p-4">
        {/* TODO: add options */}
        <button
          className={clsx(
            "bg-dark text-background px-2 py-1 rounded-md font-bold",
            "hover:bg-background hover:outline-4 hover:outline-dark hover:text-dark hover:-outline-offset-4",
            "cursor-pointer shadow",
          )}
          onClick={() => {
            prettify(sql).then((sql) => setSql(sql));
          }}
        >
          FORMAT
        </button>
      </div>
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
              "cursor-pointer",
              "flex items-center justify-center gap-x-1",
            )}
          >
            <span className="hover:underline">GitHub</span>
            <ArrowTopRightOnSquareIcon className="size-4 inline" />
          </a>
        </div>
        Copyright © 2025 kitta65
      </footer>
    </>
  );
}

export default App;
