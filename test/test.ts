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

test("select.sql", async () => {
  const sql = await read("./result/select.sql");
  await dryRun(format(sql));
});

test("dml.sql", async () => {
  const sql = await read("./result/dml.sql");
  await dryRun(format(sql));
});

test("ddl.sql", async () => {
  const sql = await read("./result/ddl.sql");
  await dryRun(format(sql));
});

test("dcl.sql", async () => {
  const sql = await read("./result/dcl.sql");
  await dryRun(format(sql));
});

test("script.sql", async () => {
  const sql = await read("./result/script.sql");
  await dryRun(format(sql));
});

test("debug.sql", async () => {
  const sql = await read("./result/debug.sql");
  await dryRun(format(sql));
});

test("other.sql", async () => {
  const sql = await read("./result/select.sql");
  await dryRun(format(sql));
});
