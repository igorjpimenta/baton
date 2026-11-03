import test from "node:test";
import assert from "node:assert/strict";
import { assertDeclaration, resolveIdentity, identityKey } from "../../../src/identity.js";

test("declaration is required", () => {
  assert.throws(() => assertDeclaration({}), /BRAYER_HARNESS is required/);
  assert.equal(assertDeclaration({ harness: "claude" }).harness, "claude");
});

test("reserved harness names refuse the declaration", () => {
  assert.throws(() => assertDeclaration({ harness: "unknown" }), /refused declaration \(reserved: harness\)/);
  assert.throws(() => assertDeclaration({ harness: "instance:7" }), /refused declaration \(reserved: harness\)/);
  assert.throws(() => assertDeclaration({ harness: " unknown " }), /refused declaration/);
});

test("meta stamp wins over args and no halves splice", () => {
  const id = resolveIdentity({
    meta: { brayer: { agent: "worker", session: "s1" } },
    args: { brayer_agent: "spoofed", brayer_session: "spoofed" },
    base: { harness: "claude" },
  });
  assert.deepEqual(id, { harness: "claude", agent: "worker", session: "s1" });
});

test("halves across channels refuse instead of splicing", () => {
  assert.throws(() => resolveIdentity({
    meta: { brayer: { agent: "worker" } },
    args: { brayer_session: "s1" },
    base: { harness: "claude" },
  }), /pairs never splice/);
  assert.throws(() => resolveIdentity({
    meta: { brayer: { session: "s1" } },
    args: { brayer_agent: "worker" },
    base: { harness: "claude" },
  }), /pairs never splice/);
});

test("args are a fallback when meta is unreachable", () => {
  const id = resolveIdentity({
    args: { brayer_agent: "worker", brayer_session: "s1" },
    base: { harness: "codex" },
  });
  assert.equal(identityKey(id), "codex:worker:s1");
});

test("missing agent or session refuses", () => {
  assert.throws(() => resolveIdentity({ args: { brayer_session: "s1" }, base: { harness: "claude" } }), /agent must be stamped/);
  assert.throws(() => resolveIdentity({ args: { brayer_agent: "worker" }, base: { harness: "claude" } }), /session must be stamped/);
});

test("the harness is the declaration, never the stamp", () => {
  assert.equal(resolveIdentity({
    meta: { brayer: { harness: "codex", agent: "a", session: "s" } },
    base: { harness: "claude" },
  }).harness, "claude");
});
