/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "jsdom",
  // Playwright specs live under tests/e2e and use Playwright's own runner/
  // syntax — Jest can't (and shouldn't) parse them. Without this, `npm test`
  // fails immediately trying to load tests/e2e/smoke.spec.ts.
  testPathIgnorePatterns: ["<rootDir>/node_modules/", "<rootDir>/tests/e2e/"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
};
