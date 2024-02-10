// NOTE NODE_OPTIONS='--experimental-vm-modules' is needed before jest v30
// https://github.com/prettier/prettier/issues/15769
import prettier from "prettier";
import * as fs from "fs";

const format = (sql: string) => {
  const res = prettier.format(sql, {
    parser: "sql-parse",
    plugins: ["."],
  });
  return res;
};

const targets = [
  "core.sql",
  "select.sql",
  "ddl.sql",
  "dml.sql",
  "dcl.sql",
  "script.sql",
  "debug.sql",
  "other.sql",
  "ml.sql",
];

beforeAll(async () => {
  for (const t of targets) {
    const input = fs.readFileSync("./input/" + t, "utf8");
    const actualOutput = await format(input);
    fs.writeFileSync("./actual_output/" + t, actualOutput);
  }
});

for (const t of targets) {
  describe(t, () => {
    test("Additional formatting does not make any changes", async () => {
      const actualOutput = fs.readFileSync("./actual_output/" + t, "utf8");
      expect(actualOutput).toBe(await format(actualOutput));
    });

    test("Compare actual_output with expected_output", () => {
      const actualOutput = fs.readFileSync("./actual_output/" + t, "utf8");
      const expectedOutput = fs.readFileSync("./expected_output/" + t, "utf8");
      expect(actualOutput).toBe(expectedOutput);
    });
  });
}
