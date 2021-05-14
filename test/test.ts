import { BigQuery } from "@google-cloud/bigquery";
import printer from "../src/printer";
import parser from "@dr666m1/bq2cst";

async function query(sql: string) {
  const client = new BigQuery();
  const options = {
    query: sql,
  };
  const [job] = await client.createQueryJob(options).catch((err) => {
    console.log(`
============= something when wrong while calling \`createQueryJob\` =============
${err}
Query: ${sql}
=================================================================================`);
    throw err;
  });
  const [rows] = await job.getQueryResults();
  rows.forEach((row) => console.log(typeof row));
}

it("parser", async () => {
  await query("select 1 as one union ll select 2");
  expect(1).toEqual(1);
});
