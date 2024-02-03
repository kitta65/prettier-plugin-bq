export const reservedKeywords = [
  "ALL",
  "AND",
  "ANY",
  "ARRAY",
  "AS",
  "ASC",
  "ASSERT_ROWS_MODIFIED",
  "AT",
  "BETWEEN",
  "BY",
  "CASE",
  "CAST",
  "COLLATE",
  "CONTAINS",
  "CREATE",
  "CROSS",
  "CUBE",
  "CURRENT",
  "DEFAULT",
  "DEFINE",
  "DESC",
  "DISTINCT",
  "ELSE",
  "END",
  "ENUM",
  "ESCAPE",
  "EXCEPT",
  "EXCLUDE",
  "EXISTS",
  "EXTRACT",
  "FALSE",
  "FETCH",
  "FOLLOWING",
  "FOR",
  "FROM",
  "FULL",
  "GROUP",
  "GROUPING",
  "GROUPS",
  "HASH",
  "HAVING",
  "IF",
  "IGNORE",
  "IN",
  "INNER",
  "INTERSECT",
  "INTERVAL",
  "INTO",
  "IS",
  "JOIN",
  "LATERAL",
  "LEFT",
  "LIKE",
  "LIMIT",
  "LOOKUP",
  "MERGE",
  "NATURAL",
  "NEW",
  "NO",
  "NOT",
  "NULL",
  "NULLS",
  "OF",
  "ON",
  "OR",
  "ORDER",
  "OUTER",
  "OVER",
  "PARTITION",
  "PRECEDING",
  "PROTO",
  "RANGE",
  "RECURSIVE",
  "RESPECT",
  "RIGHT",
  "ROLLUP",
  "ROWS",
  "SELECT",
  "SET",
  "SOME",
  "STRUCT",
  "TABLESAMPLE",
  "THEN",
  "TO",
  "TREAT",
  "TRUE",
  "UNBOUNDED",
  "UNION",
  "UNNEST",
  "USING",
  "WHEN",
  "WHERE",
  "WINDOW",
  "WITH",
  "WITHIN",
];

export const globalFunctions = [
  // AEAD encryption functions
  "DETERMINISTIC_DECRYPT_BYTES",
  "DETERMINISTIC_DECRYPT_STRING",
  "DETERMINISTIC_ENCRYPT",
  // aggregate functions
  "ANY_VALUE",
  "ARRAY_AGG",
  "ARRAY_CONCAT_AGG",
  "AVG",
  "BIT_AND",
  "BIT_OR",
  "BIT_XOR",
  "COUNT",
  "COUNTIF",
  "GROUPING",
  "LOGICAL_AND",
  "LOGICAL_OR",
  "MAX",
  "MAX_BY",
  "MIN",
  "MIN_BY",
  "STRING_AGG",
  "SUM",
  // statistical aggregate functions
  "CORR",
  "COVAR_POP",
  "COVAR_SAMP",
  "STDDEV_POP",
  "STDDEV_SAMP",
  "STDDEV",
  "VAR_POP",
  "VAR_SAMP",
  "VARIANCE",
  // approximate aggregate functions
  "APPROX_COUNT_DISTINCT",
  "APPROX_QUANTILES",
  "APPROX_TOP_COUNT",
  "APPROX_TOP_SUM",
  // DLP encryption functions
  "DLP_DETERMINISTIC_ENCRYPT",
  "DLP_DETERMINISTIC_DECRYPT",
  "DLP_KEY_CHAIN",
  // numbering functions
  "RANK",
  "DENSE_RANK",
  "PERCENT_RANK",
  "CUME_DIST",
  "NTILE",
  "ROW_NUMBER",
  // search functions
  "SEARCH",
  "VECTOR_SEARCH",
  // bit functions
  "BIT_COUNT",
  // built-in table functions
  "EXTERNAL_OBJECT_TRANSFORM",
  // conversion functions
  "CAST",
  "PARSE_BIGNUMERIC",
  "PARSE_NUMERIC",
  "SAFE_CAST",
  // mathematical functions
  "ABS",
  "SIGN",
  "IS_INF",
  "IS_NAN",
  "IEEE_DIVIDE",
  "RAND",
  "SQRT",
  "POW",
  "POWER",
  "EXP",
  "EUCLIDEAN_DISTANCE",
  "LN",
  "LOG",
  "LOG10",
  "GREATEST",
  "LEAST",
  "DIV",
  "SAFE_DIVIDE",
  "SAFE_MULTIPLY",
  "SAFE_NEGATE",
  "SAFE_ADD",
  "SAFE_SUBTRACT",
  "MOD",
  "ROUND",
  "TRUNC",
  "CEIL",
  "CEILING",
  "FLOOR",
  "COS",
  "COSH",
  "COSIGN_DISTANCE",
  "ACOS",
  "ACOSH",
  "COT",
  "COTH",
  "CSC",
  "CSCH",
  "SEC",
  "SECH",
  "SIN",
  "SINH",
  "ASIN",
  "ASINH",
  "TAN",
  "TANH",
  "ATAN",
  "ATANH",
  "ATAN2",
  "CBRT",
  "RANGE_BUCKET",
  // navigation functions
  "FIRST_VALUE",
  "LAST_VALUE",
  "NTH_VALUE",
  "LEAD",
  "LAG",
  "PERCENTILE_CONT",
  "PERCENTILE_DISC",
  // hash functions
  "FARM_FINGERPRINT",
  "MD5",
  "SHA1",
  "SHA256",
  "SHA512",
  // string functions
  "ASCII",
  "BYTE_LENGTH",
  "CHAR_LENGTH",
  "CHARACTER_LENGTH",
  "CHR",
  "CODE_POINTS_TO_BYTES",
  "CODE_POINTS_TO_STRING",
  "COLLATE",
  "CONCAT",
  "CONTAINS_SUBSTR",
  "EDIT_DISTANCE",
  "ENDS_WITH",
  "FORMAT",
  "FROM_BASE32",
  "FROM_BASE64",
  "FROM_HEX",
  "INITCAP",
  "INSTR",
  "LEFT",
  "LENGTH",
  "LPAD",
  "LOWER",
  "LTRIM",
  "NORMALIZE",
  "NORMALIZE_AND_CASEFOLD",
  "OCTET_LENGTH",
  "REGEXP_CONTAINS",
  "REGEXP_EXTRACT",
  "REGEXP_EXTRACT_ALL",
  "REGEXP_INSTR",
  "REGEXP_REPLACE",
  "REGEXP_SUBSTR",
  "REPLACE",
  "REPEAT",
  "REVERSE",
  "RIGHT",
  "RPAD",
  "RTRIM",
  "SAFE_CONVERT_BYTES_TO_STRING",
  "SOUNDEX",
  "SPLIT",
  "STARTS_WITH",
  "STRPOS",
  "SUBSTR",
  "SUBSTRING",
  "TO_BASE32",
  "TO_BASE64",
  "TO_CODE_POINTS",
  "TO_HEX",
  "TRANSLATE",
  "TRIM",
  "UNICODE",
  "UPPER",
  // json functions
  "BOOL",
  "FLOAT64",
  "INT64",
  "JSON_ARRAY",
  "JSON_ARRAY_APPEND",
  "JSON_ARRAY_INSERT",
  "JSON_EXTRACT",
  "JSON_EXTRACT_ARRAY",
  "JSON_EXTRACT_SCALAR",
  "JSON_EXTRACT_STRING_ARRAY",
  "JSON_OBJECT",
  "JSON_QUERY",
  "JSON_QUERY_ARRAY",
  "JSON_REMOVE",
  "JSON_SET",
  "JSON_STRIP_NULLS",
  "JSON_TYPE",
  "JSON_VALUE",
  "JSON_VALUE_ARRAY",
  "LAX_BOOL",
  "LAX_FLOAT64",
  "LAX_INT64",
  "LAX_STRING",
  "PARSE_JSON",
  "STRING",
  "TO_JSON",
  "TO_JSON_STRING",
  // array functions
  "ARRAY",
  "ARRAY_CONCAT",
  "ARRAY_LENGTH",
  "ARRAY_TO_STRING",
  "GENERATE_ARRAY",
  "GENERATE_DATE_ARRAY",
  "GENERATE_TIMESTAMP_ARRAY",
  "OFFSET",
  "ORDINAL",
  "ARRAY_REVERSE",
  "SAFE_OFFSET",
  "SAFE_ORDINAL",
  // date functions
  "CURRENT_DATE",
  "EXTRACT",
  "DATE",
  "DATE_ADD",
  "DATE_SUB",
  "DATE_DIFF",
  "DATE_TRUNC",
  "DATE_FROM_UNIX_DATE",
  "FORMAT_DATE",
  "LAST_DAY",
  "PARSE_DATE",
  "UNIX_DATE",
  // datetime functions
  "CURRENT_DATETIME",
  "DATETIME",
  "EXTRACT",
  "DATETIME_ADD",
  "DATETIME_SUB",
  "DATETIME_DIFF",
  "DATETIME_TRUNC",
  "FORMAT_DATETIME",
  "LAST_DAY",
  "PARSE_DATETIME",
  // time functions
  "CURRENT_TIME",
  "TIME",
  "EXTRACT",
  "TIME_ADD",
  "TIME_SUB",
  "TIME_DIFF",
  "TIME_TRUNC",
  "FORMAT_TIME",
  "PARSE_TIME",
  // text analyze functions
  "BAG_OF_WORDS",
  "TEXT_ANALYZE",
  "TF_IDF",
  // timestamp functions
  "CURRENT_TIMESTAMP",
  "EXTRACT",
  "STRING",
  "TIMESTAMP",
  "TIMESTAMP_ADD",
  "TIMESTAMP_SUB",
  "TIMESTAMP_DIFF",
  "TIMESTAMP_TRUNC",
  "FORMAT_TIMESTAMP",
  "PARSE_TIMESTAMP",
  "TIMESTAMP_SECONDS",
  "TIMESTAMP_MILLIS",
  "TIMESTAMP_MICROS",
  "UNIX_SECONDS",
  "UNIX_MILLIS",
  "UNIX_MICROS",
  // interval function
  "MAKE_INTERVAL",
  "EXTRACT",
  "JUSTIFY_DAYS",
  "JUSTIFY_HOURS",
  "JUSTIFY_INTERVAL",
  // geography functions
  "S2_COVERINGCELLIDS",
  "S2_CELLIDFROMPOINT",
  "ST_ANGLE",
  "ST_AREA",
  "ST_ASBINARY",
  "ST_ASGEOJSON",
  "ST_ASTEXT",
  "ST_AZIMUTH",
  "ST_BOUNDARY",
  "ST_BOUNDINGBOX",
  "ST_BUFFER",
  "ST_BUFFERWITHTOLERANCE",
  "ST_CENTROID",
  "ST_CENTROID_AGG",
  "ST_CLOSESTPOINT",
  "ST_CLUSTERDBSCAN",
  "ST_CONTAINS",
  "ST_CONVEXHULL",
  "ST_COVEREDBY",
  "ST_COVERS",
  "ST_DIFFERENCE",
  "ST_DIMENSION",
  "ST_DISJOINT",
  "ST_DISTANCE",
  "ST_DUMP",
  "ST_DWITHIN",
  "ST_ENDPOINT",
  "ST_EXTENT",
  "ST_EXTERIORRING",
  "ST_EQUALS",
  "ST_GEOGFROM",
  "ST_GEOGFROMGEOJSON",
  "ST_GEOGFROMTEXT",
  "ST_GEOGFROMWKB",
  "ST_GEOGPOINT",
  "ST_GEOGPOINTFROMGEOHASH",
  "ST_GEOHASH",
  "ST_GEOMETRYTYPE",
  "ST_HAUSDORFFDISTANCE",
  "ST_INTERIORRINGS",
  "ST_INTERSECTION",
  "ST_INTERSECTS",
  "ST_INTERSECTSBOX",
  "ST_ISCLOSED",
  "ST_ISCOLLECTION",
  "ST_ISEMPTY",
  "ST_ISRING",
  "ST_LENGTH",
  "ST_LINESUBSTRING",
  "ST_LINEINTERPOLATEPOINT",
  "ST_MAKELINE",
  "ST_MAKEPOLYGON",
  "ST_MAKEPOLYGONORIENTED",
  "ST_MAXDISTANCE",
  "ST_NPOINTS",
  "ST_NUMGEOMETRIES",
  "ST_NUMPOINTS",
  "ST_PERIMETER",
  "ST_POINTN",
  "ST_SIMPLIFY",
  "ST_SNAPTOGRID",
  "ST_STARTPOINT",
  "ST_TOUCHES",
  "ST_UNION",
  "ST_UNION_AGG",
  "ST_WITHIN",
  "ST_X",
  "ST_Y",
  // security functions
  "SESSION_USER",
  // uuid functions
  "GENERATE_UUID",
  // conditional
  "COALESCE",
  "IF",
  "IFNULL",
  "NULLIF",
  // debugging functions
  "ERROR",
  // federated query functions
  "EXTERNAL_QUERY",
];

export const keysFunctions = [
  // AEAD encryption functions
  "NEW_KEYSET",
  "NEW_WRAPPED_KEYSET",
  "REWRAP_KEYSET",
  "ADD_KEY_FROM_RAW_BYTES",
  "KEYSET_CHAIN",
  "KEYSET_FROM_JSON",
  "KEYSET_TO_JSON",
  "ROTATE_KEYSET",
  "ROTATE_WRAPPED_KEYSET",
  "KEYSET_LENGTH",
];

export const aeadFunctions = [
  // AEAD encryption functions
  "DECRYPT_BYTES",
  "DECRYPT_STRING",
  "ENCRYPT",
];

export const hllCountFunctions = [
  // HLL functions
  "INIT",
  "MERGE",
  "MERGE_PARTIAL",
  "EXTRACT",
];

export const netFunctions = [
  // net functions
  "IP_FROM_STRING",
  "SAFE_IP_FROM_STRING",
  "IP_TO_STRING",
  "IP_NET_MASK",
  "IP_TRUNC",
  "IPV4_FROM_INT64",
  "IPV4_TO_INT64",
  "HOST",
  "PUBLIC_SUFFIX",
  "REG_DOMAIN",
];

export const mlFunctions = [
  "TRANSFORM",
  "FEATURE_INFO",
  // general functions
  "IMPUTER",
  // numerical functions
  "BUCKETIZE",
  "MAX_ABS_SCALER",
  "MIN_MAX_SCALER",
  "NORMALIZER",
  "POLYNOMIAL_EXPAND",
  "QUANTILE_BUCKETIZE",
  "ROBUST_SCALER",
  "STANDARD_SCALER",
  // categorical functions
  "FEATURE_CROSS",
  "HASH_BUCKETIZE",
  "LABEL_ENCODER",
  "MULTI_HOT_ENCODER",
  "ONE_HOT_ENCODER",
  // text analysis functions
  "NGRAMS",
  "BAG_OF_WORDS",
  "TF_IDF",
  // image functions
  "CONVERT_COLOR_SPACE",
  "CONVERT_IMAGE_TYPE",
  "DECODE_IMAGE",
  "RESIZE_IMAGE",
  // point-in-time lookup functions
  "FEATURES_AT_TIME",
  "ENTITY_FEATURES_AT_TIME",
  // hyperparameter tuning functions
  "TRIAL_INFO",
  // evaluation functions
  "EVALUATE",
  "ROC_CURVE",
  "CONFUSION_MATRIX",
  "ARIMA_EVALUATE",
  "TRAINING_INFO",
  "RECONSTRUCTION_LOSS",
  "HOLIDAY_INFO",
  // inference functions
  "PREDICT",
  "FORECAST",
  "RECOMMEND",
  "DETECT_ANOMALIES",
  // generative ai functions
  "GENERATE_TEXT",
  "GENERATE_TEXT_EMBEDDING",
  // ai functions
  "UNDERSTAND_TEXT",
  "TRANSLATE",
  "PROCESS_DOCUMENT",
  "TRANSCRIBE",
  "ANNOTATE_IMAGE",
  // ai explanation functions
  "ARIMA_COEFFICIENTS",
  "EXPLAIN_FORECAST",
  "GLOBAL_EXPLAIN",
  "FEATURE_IMPORTANCE",
  "ADVANCED_WEIGHTS",
  // model weights functions
  "WEIGHTS",
  "CENTROIDS",
  "PRINCIPAL_COMPONENTS",
  "PRINCIPAL_COMPONENT_INFO",
  "ARIMA_COEFFICIENTS",
  // math utility functions
  "DISTANCE",
  "LP_NORM",
];
