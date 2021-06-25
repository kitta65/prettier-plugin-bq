// TODO check why i get warning
// https://stackoverflow.com/questions/46493253/typescript-extend-third-party-declaration-files
import { BaseNode } from "@dr666m1/bq2cst"; // eslint-disable-line

declare module "@dr666m1/bq2cst" {
  interface BaseNode {
    /**
     * # breakRecommended
     * if it is true, `hardline` is used at left side of `AND`, `OR` and `JOIN`.
     *
     * # isFinalColumn
     * if it is true, the node is the final column of SELECT statement.
     *
     * # notGlobal
     * if it is true, the node follows `.` operator.
     *
     * # notRoot
     * if it is true, the statement is a part of another statement.
     */
    breakRecommended?: true;
    emptyLines?: number;
    isDatePart?: true;
    isFinalColumn?: true;
    isPreDefinedFunction?: true;
    notGlobal?: true;
    notRoot?: true;
  }
}
