import test from "node:test";
import assert from "node:assert/strict";
import { contentSchema, csvCell } from "../lib/content";
import { isWorkspace } from "../lib/workspaces";
const item = {
  id: "7aacbe11-7f48-4aad-9aad-f94e9713f6cc",
  workspace: "foxyavenue",
  kind: "email",
  title: "New edit",
  body: "Hello",
  channel: "Email",
  status: "draft",
  scheduledAt: null,
  updatedAt: new Date().toISOString(),
};
test("valid drafts are accepted", () =>
  assert.equal(contentSchema.safeParse(item).success, true));
test("reject unknown workspaces", () => {
  assert.equal(
    contentSchema.safeParse({ ...item, workspace: "other" }).success,
    false,
  );
  assert.equal(isWorkspace("__proto__"), false);
});
test("planned content needs a future date", () => {
  for (const scheduledAt of [null, "2020-01-01T00:00:00.000Z"])
    assert.equal(
      contentSchema.safeParse({ ...item, status: "planned", scheduledAt })
        .success,
      false,
    );
  assert.equal(
    contentSchema.safeParse({
      ...item,
      status: "planned",
      scheduledAt: new Date(Date.now() + 86400000).toISOString(),
    }).success,
    true,
  );
});
test("reject external publication states and invalid channels", () => {
  assert.equal(
    contentSchema.safeParse({ ...item, status: "published" }).success,
    false,
  );
  assert.equal(
    contentSchema.safeParse({ ...item, channel: "TikTok" }).success,
    false,
  );
});
test("enforce title and content limits", () => {
  assert.equal(
    contentSchema.safeParse({ ...item, title: "   " }).success,
    false,
  );
  assert.equal(
    contentSchema.safeParse({ ...item, body: "x".repeat(20001) }).success,
    false,
  );
});
test("CSV neutralizes spreadsheet formulas and escapes quotes", () => {
  assert.equal(csvCell("=SUM(1,2)"), `"'=SUM(1,2)"`);
  assert.equal(csvCell('A "quote"'), '"A ""quote"""');
});
