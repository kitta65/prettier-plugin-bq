## Prerequisite
### authentication
In order to execute tests, you have to setup authentication.
The easiest way is using the Google Cloud SDK (your default GCP project will be used).

```
gcloud auth application-default login
```

### dataset and table
Run the following query to creat dataset and table.

```
CREATE SCHEMA IF NOT EXISTS prettier_plugin_bq_test;
CREATE OR REPLACE TABLE prettier_plugin_bq_test.t (
  str STRING,
  int INT64,
  float FLOAT64,
  ts TIMESTAMP,
  dt DATE,
  bool BOOLEAN,
  nested STRUCT<
    arr ARRAY<INT64>,
    str STRING,
    int INT64
  >
);
CREATE OR REPLACE TABLE prettier_plugin_bq_test.u AS
SELECT * FROM prettier_plugin_bq_test.t
;
CREATE OR REPLACE TABLE prettier_plugin_bq_test.v (str STRING, int INT64);
```

## How to execute tests?
All you have to do is run the following command.

```
npm test
```
