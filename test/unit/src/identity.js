import test from "node:test";
import assert from "node:assert/strict";
import { assertDeclaration, resolveIdentity, identityKey } from "../../../src/identity.js";

test("declaration is required", () => {
  assert.throws(() => assertDeclaration({}), /harness must be declared/);
  assert.equal(assertDeclaration({ harness: "claude" }).harness, "claude");
});

test("process env never mints a declaration", () => {
  const prev = process.env.BRAYER_HARNESS;
  process.env.BRAYER_HARNESS = "any";
  try {
    assert.throws(() => assertDeclaration({}), /harness must be declared/);
  } finally {
    if (prev === undefined) delete process.env.BRAYER_HARNESS;
    else process.env.BRAYER_HARNESS = prev;
  }
});

test("any non-empty harness name mints a declaration", () => {
  assert.equal(assertDeclaration({ harness: "unknown" }).harness, "unknown");
  assert.equal(assertDeclaration({ harness: "any" }).harness, "any");
  assert.equal(assertDeclaration({ harness: "instance:7" }).harness, "instance:7");
  assert.equal(assertDeclaration({ harness: " unknown " }).harness, "unknown");
});

test("meta stamp wins over args and no halves splice", () => {
  const id = resolveIdentity({
    meta: { brayer: { agent: "worker", session: "s1" } },
    args: { brayer_agent: "spoofed", brayer_session: "spoofed" },
    base: { harness: "claude" },
  });
  assert.deepEqual(id, { harness: "claude", agent: "worker", session: "s1", via: "meta" });
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
  assert.equal(id.via, "args");
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
