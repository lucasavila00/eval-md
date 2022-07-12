/* eslint-disable */
const path = require("path");

require("ts-node").register({ transpileOnly: true });
require(path.resolve(__dirname, "./worker-ts.ts"));
