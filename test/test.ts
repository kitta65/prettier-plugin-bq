import { BigQuery } from "@google-cloud/bigquery";
import parser from "@dr666m1/bq2cst";
import printer from "../src/printer";
import prettier from "prettier";

const format = (sql: string) => {
  try {
    const res = prettier.format(sql, {
      parser: "sql-parse",
      plugins: ["."],
    });
    return res;
  } catch(err) {
    console.log(`
======================= Error executing \`prettier.format\` =======================
${err}
Query: ${sql}
===================================================================================`);
    throw err
  }
};

async function query(sql: string) {
  const client = new BigQuery();
  const options = {
    query: sql,
  };
  const [job] = await client.createQueryJob(options).catch((err) => {
    console.log(`
======================= Error executing \`createQueryJob\` =======================
${err}
Query: ${sql}
==================================================================================`);
    throw err;
  });
  await job.getQueryResults();
}

async function assertResultDoesNotChange(sql: string) {
  const client = new BigQuery();
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
}

beforeAll(
  async () => {
    await query(`DROP SCHEMA IF EXISTS prettier_plugin_bq_test CASCADE`);
    await query(`CREATE SCHEMA prettier_plugin_bq_test`);
    expect(1).toEqual(1);
  },
  10 * 1000
);

it("parser", async () => {
  await assertResultDoesNotChange(`select 1;`);
  expect(1).toEqual(1);
});
