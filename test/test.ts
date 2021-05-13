import printer from "../src/printer";
import parser from "@dr666m1/bq2cst";

it("parser", () => {
  expect(parser.parse("SELECT 1")).toEqual(parser.parse("SELECT 1"));
});

it("parser", () => {
  expect(parser.parse("SELECT 1")).not.toEqual(parser.parse("select 1"));
});
