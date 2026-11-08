const test = require("node:test");
const assert = require("node:assert/strict");
test("RAJA BHAI demo configuration", () => {
  const pkg = require("../package.json");
  assert.equal(pkg.name, "raja-bhai-demo");
  assert.ok(pkg.dependencies.express);
  assert.ok(pkg.dependencies["better-sqlite3"]);
});
