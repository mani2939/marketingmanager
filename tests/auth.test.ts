import test from "node:test";
import assert from "node:assert/strict";
import {
  authenticationConfig,
  credentialsMatch,
  credentialVersion,
  newSessionToken,
  sessionHash,
  validSessionToken,
  sameOrigin,
} from "../lib/auth-policy";
const password = "test-only-not-a-real-password";
const secret = "test-only-secret-with-at-least-32-characters";
test("admin auth fails closed with missing or short secrets", () => {
  assert.equal(authenticationConfig({}), null);
  assert.equal(
    authenticationConfig({
      STROZPY_ADMIN_PASSWORD: password,
      SESSION_SECRET: "short",
    }),
    null,
  );
  assert.ok(
    authenticationConfig({
      STROZPY_ADMIN_PASSWORD: password,
      SESSION_SECRET: secret,
    }),
  );
});
test("only the exact admin username and configured password are accepted", () => {
  assert.equal(credentialsMatch("StrozpyManager", password, password), true);
  assert.equal(credentialsMatch("strozpymanager", password, password), false);
  assert.equal(credentialsMatch("StrozpyManager", "wrong", password), false);
  assert.equal(credentialsMatch("", password, password), false);
});
test("changing password or secret invalidates prior credential versions", () => {
  const version = credentialVersion(password, secret);
  assert.equal(version, credentialVersion(password, secret));
  assert.notEqual(version, credentialVersion(password + "new", secret));
  assert.notEqual(version, credentialVersion(password, secret + "new"));
});
test("session tokens are unique, strictly validated, and hashed for storage", () => {
  const first = newSessionToken(),
    second = newSessionToken();
  assert.notEqual(first, second);
  assert.equal(validSessionToken(first), true);
  assert.equal(validSessionToken("arbitrary-cookie"), false);
  assert.equal(sessionHash(first).length, 64);
  assert.notEqual(sessionHash(first), first);
});
test("mutating auth requests require matching origin", () => {
  const url = "https://marketing.example.com/api/auth/login";
  assert.equal(
    sameOrigin(
      new Request(url, {
        headers: { origin: "https://marketing.example.com" },
      }),
    ),
    true,
  );
  assert.equal(
    sameOrigin(
      new Request(url, { headers: { origin: "https://attacker.example.com" } }),
    ),
    false,
  );
  assert.equal(sameOrigin(new Request(url)), false);
});
