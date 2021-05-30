import { BigQuery } from "@google-cloud/bigquery";
import prettier from "prettier";
import * as fs from "fs";

jest.setTimeout(30 * 1000); // each test case must have shorter timeout than default
const client = new BigQuery();

const format = (sql: string) => {
  const res = prettier.format(sql, {
    parser: "sql-parse",
    plugins: ["."],
  });
  return res;
};

const dryRun = async (sql: string) => {
  const options = {
    query: sql,
    dryRun: true,
    defaultDataset: {
      datasetId: "prettier_plugin_bq_test",
    },
  };
  await client.createQueryJob(options);
};

const read = (path: string) => {
  return new Promise<string>((resolve) => {
    fs.readFile(path, { encoding: "utf8" }, (_, data) => {
      resolve(data);
    });
  });
};

test("core.sql", async () => {
  const sql = await read("./result/core.sql");
  await dryRun(format(sql));
});
