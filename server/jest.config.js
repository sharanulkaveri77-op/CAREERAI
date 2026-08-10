const { createDefaultPreset } = require("ts-jest");

// Transpile-only mode: faster tests and — importantly — ts-jest will never
// emit declaration/sourcemap artifacts next to the sources (which previously
// leaked build output into src/ and broke jest's own test discovery).
const tsJestTransformCfg = createDefaultPreset({
  isolatedModules: true,
}).transform;

/** @type {import("jest").Config} **/
module.exports = {
  testEnvironment: "node",
  // Only run tests from the TS source tree — never the tsc output in /dist
  roots: ["<rootDir>/src"],
  testPathIgnorePatterns: ["/node_modules/", "/dist/"],
  transform: {
    ...tsJestTransformCfg,
  },
};