create temp function abc(x int64) as (x);create function if not exists abc(x array<int64>, y int64) returns int64 as (x+y);
create or replace function abc() as((select "tooLongToPrintInSingleLineTooLongToPrintInSingleLineTooLongToPrint"));
create function abc() returns int64 deterministic language js options(library=['dummy']) as '''return 1''';
create function abc() returns int64 language js options() as '''return 1''';
create function abc() returns int64 not deterministic language js as '''
return 1
''';

