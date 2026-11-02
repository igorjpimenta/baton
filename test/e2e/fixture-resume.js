import { createStore } from "../../src/store.js";
import {
  attachEvidence,
  attachSession,
  checkpointSession,
  finishSession,
  resumeSession,
} from "../../plugins/shared/contract.js";

const harness = process.env.BRAYER_TEST_HARNESS;
const orderId = process.env.BRAYER_TEST_ORDER;
const phase = process.env.BRAYER_TEST_PHASE;
const decision = process.env.BRAYER_TEST_DECISION;
const session = { harness, agent: "worker", session: "s1" };
const identity = `${harness}:worker:s1`;

const store = createStore({
  dbPath: process.env.BRAYER_DB,
  config: { blobsPath: process.env.BRAYER_BLOBS },
});

function fail(message) {
  throw new Error(`resume fixture failed: ${message}`);
}

try {
  if (phase === "verdict") {
    if (decision !== "reject" && decision !== "escalate") fail(`unknown decision: ${decision}`);
    const attached = attachSession({ store, session, orderId });
    const checkpoint = checkpointSession({
      store,
      session,
      orderId,
      attemptId: attached.attempt.id,
      trigger: "stop",
      state: { next_step: "retry" },
      treeHash: `${decision}-tree`,
      summary: `${decision} path checkpoint`,
    });
    const finished = finishSession({ store, session, attemptId: attached.attempt.id, summary: "first pass" });
    if (finished.order.status !== "review") fail(`expected review, got ${finished.order.status}`);
    const verdict = store.verdict.issue({
      workOrderId: orderId,
      attemptId: attached.attempt.id,
      decision,
      reason: `${decision} for resume proof`,
      actor: identity,
    });
    const expected = decision === "reject" ? "rejected" : "blocked";
    if (verdict.order.status !== expected) fail(`expected ${expected}, got ${verdict.order.status}`);
    console.log(JSON.stringify({
      phase,
      attemptId: attached.attempt.id,
      checkpointId: checkpoint.id,
      status: verdict.order.status,
    }));
  } else if (phase === "retry") {
    const firstAttemptId = process.env.BRAYER_TEST_FIRST_ATTEMPT;
    if (!firstAttemptId) fail("first attempt id is required");
    const resumed = resumeSession({ store, session, orderId });
    if (!resumed.checkpoint) fail("resume returned no checkpoint");
    if (resumed.attempt.id === firstAttemptId) fail("resume reused the finished attempt");
    const retryCheckpoint = checkpointSession({
      store,
      session,
      orderId,
      attemptId: resumed.attempt.id,
      trigger: "manual",
      state: { next_step: "finish", resumed_from: resumed.checkpoint.id },
      treeHash: `${decision}-retry-tree`,
      summary: "retry checkpoint",
    });
    const evidence = attachEvidence({
      store,
      session,
      orderId,
      attemptId: resumed.attempt.id,
      kind: "log",
      path: process.env.BRAYER_TEST_EVIDENCE,
      summary: "retry proof",
    });
    const finished = finishSession({ store, session, attemptId: resumed.attempt.id, summary: "retry done" });
    if (finished.order.status !== "review") fail(`expected review, got ${finished.order.status}`);
    const verdict = store.verdict.issue({
      workOrderId: orderId,
      attemptId: resumed.attempt.id,
      decision: "approve",
      reason: "retry proof",
      actor: identity,
    });
    if (verdict.order.status !== "approved") fail(`expected approved, got ${verdict.order.status}`);
    console.log(JSON.stringify({
      phase,
      attemptId: resumed.attempt.id,
      resumedCheckpointId: resumed.checkpoint.id,
      retryCheckpointId: retryCheckpoint.id,
      evidenceId: evidence.id,
      verdictId: verdict.verdict.id,
      status: verdict.order.status,
    }));
  } else {
    fail(`unknown phase: ${phase}`);
  }
} finally {
  store.close();
}
