import { BigQuery } from "@google-cloud/bigquery";
import prettier from "prettier";

jest.setTimeout(30 * 1000) // each test case must have shorter timeout than default
const client = new BigQuery();

const format = (sql: string) => {
  try {
    const res = prettier.format(sql, {
      parser: "sql-parse",
      plugins: ["."],
    });
    return res;
  } catch (err) {
    console.log(`
==================== Error executing \`prettier.format\` =======================
${err}
Query: ${sql}
================================================================================`);
    throw err;
  }
};

const query = async (sql: string) => {
  const options = {
    query: sql,
  };
  const [job] = await client.createQueryJob(options).catch((err) => {
    console.log(`
==================== Error executing \`createQueryJob\` ========================
${err}
Query: ${sql}
================================================================================`);
    throw err;
  });
  await job.getQueryResults();
};

const assertResultDoesNotChange = async (sql: string) => {
  // original sql
  const options = {
    query: sql,
  };
  const [job] = await client.createQueryJob(options);
  const [rows] = await job.getQueryResults();

  // prettified sql
  const sql_after = format(sql);
  const options_after = {
    query: sql_after,
  };
  const [job_after] = await client
    .createQueryJob(options_after)
    .catch((err) => {
      console.log(`
======================= Error executing \`createQueryJob\` =======================
${err}
Original query: ${sql}
Formatted query: ${sql_after}
==================================================================================`);
      throw err;
    });
  const [rows_after] = await job_after.getQueryResults();
  expect(rows.length).toEqual(rows_after.length);
  rows.forEach((_, i) => expect(rows[i]).toEqual(rows_after[i]));
};

beforeAll(async () => {
  await query(`DROP SCHEMA IF EXISTS prettier_plugin_bq_test CASCADE`);
  await query(`CREATE SCHEMA prettier_plugin_bq_test`);
  expect(1).toEqual(1);
});

describe("SELECT statement", () => {
  beforeAll(async () => {
    await query(`
CREATE TABLE prettier_plugin_bq_test.test_select AS
SELECT  1 x,  1 y, 11 z UNION ALL
SELECT  2,    1,   12   UNION ALL
SELECT  3,    1,   13   UNION ALL
SELECT  4,    1,   14   UNION ALL
SELECT  5,    1,   15   UNION ALL
SELECT  6,    1, NULL   UNION ALL
SELECT  7,    1, NULL   UNION ALL
SELECT  8,    1, NULL   UNION ALL
SELECT  9,    1, NULL   UNION ALL
SELECT 10,    1, NULL   UNION ALL
SELECT 11,    2,   11   UNION ALL
SELECT 12,    2,   12   UNION ALL
SELECT 13,    2,   13   UNION ALL
SELECT 14,    2,   14   UNION ALL
SELECT 15,    2,   15   UNION ALL
SELECT 16, NULL,   16   UNION ALL
SELECT 17, NULL,   17   UNION ALL
SELECT 18, NULL,   18   UNION ALL
SELECT 19, NULL,   19   UNION ALL
SELECT 20, NULL,   20`)
  })
  test("minimum", async () => {
    await assertResultDoesNotChange(`select 1;`);
  });
});
