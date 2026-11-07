import test from "node:test";
import assert from "node:assert/strict";
import { buildBrayerMeta, isBrayerTool } from "../../../../../plugins/openclaw/brayer/meta.js";

test("matches brayer tools", () => {
  assert.equal(isBrayerTool("mcp__brayer__brayer_order_get"), true);
  assert.equal(isBrayerTool("exec"), false);
  assert.equal(isBrayerTool(null), false);
});

test("stamps harness/agent/session from hook context", () => {
  const out = buildBrayerMeta(
    { toolName: "mcp__brayer__brayer_order_get", params: { orderId: "WO-1" } },
    { agentId: "scout", sessionKey: "openclaw:scout:s1" }
  );
  assert.deepEqual(out.requestMeta.brayer, {
    harness: "openclaw",
    agent: "scout",
    session: "openclaw:scout:s1",
  });
  assert.deepEqual(out.params._meta.brayer, {
    harness: "openclaw",
    agent: "scout",
    session: "openclaw:scout:s1",
  });
  assert.deepEqual(out.params.brayer_agent, "scout");
  assert.deepEqual(out.params.brayer_session, "openclaw:scout:s1");
  assert.equal(out.params.orderId, "WO-1");
});

test("overwrites forged identity on every channel", () => {
  const out = buildBrayerMeta(
    {
      toolName: "mcp__brayer__brayer_order_get",
      params: {
        brayer_agent: "mallory",
        brayer_session: "forged",
        _meta: { brayer: { harness: "evil", agent: "mallory", session: "x" }, progressToken: "p1" },
      },
    },
    { agentId: "scout", sessionId: "sid-1" }
  );
  assert.deepEqual(out.requestMeta.brayer, {
    harness: "openclaw",
    agent: "scout",
    session: "sid-1",
  });
  assert.deepEqual(out.params._meta.brayer, {
    harness: "openclaw",
    agent: "scout",
    session: "sid-1",
  });
  assert.deepEqual(out.params.brayer_agent, "scout");
  assert.deepEqual(out.params.brayer_session, "sid-1");
  assert.equal(out.params._meta.progressToken, "p1");
});

test("ignores non-brayer tools", () => {
  assert.equal(buildBrayerMeta({ toolName: "exec" }, { agentId: "scout" }), undefined);
});
