import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createStore } from "../../src/store.js";

const fixture = fileURLToPath(new URL("./fixture-resume.js", import.meta.url));

function runFixture(env) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [fixture], {
      env: { ...process.env, ...env },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code !== 0) {
        reject(new Error(`fixture exited ${code}\n${stderr.slice(-2000)}`));
        return;
      }
      try {
        resolve(JSON.parse(stdout.trim().split("\n").at(-1)));
      } catch (err) {
        reject(new Error(`fixture returned invalid JSON: ${stdout.slice(-2000)}`));
      }
    });
  });
}

test("proves true resume across reject and escalate verdicts", async () => {
  for (const harness of ["opencode", "openclaw"]) {
    for (const decision of ["reject", "escalate"]) {
      const dir = mkdtempSync(path.join(tmpdir(), `brayer-e2e-resume-${harness}-${decision}-`));
      const dbPath = path.join(dir, "store.sqlite");
      const blobsPath = path.join(dir, "blobs");
      const evidencePath = path.join(dir, "evidence.txt");
      writeFileSync(evidencePath, `${harness} ${decision} retry proof\n`);
      const setup = createStore({ dbPath, config: { blobsPath } });
      const order = setup.order.create({
        title: `${decision} resume`,
        goal: "prove retry after verdict",
        acceptance: "approved after resume",
        status: "ready",
      });
      setup.close();

      const verdictOut = await runFixture({
        BRAYER_DB: dbPath,
        BRAYER_BLOBS: blobsPath,
        BRAYER_TEST_HARNESS: harness,
        BRAYER_TEST_ORDER: order.id,
        BRAYER_TEST_PHASE: "verdict",
        BRAYER_TEST_DECISION: decision,
      });
      assert.equal(verdictOut.status, decision === "reject" ? "rejected" : "blocked");

      const retryOut = await runFixture({
        BRAYER_DB: dbPath,
        BRAYER_BLOBS: blobsPath,
        BRAYER_TEST_HARNESS: harness,
        BRAYER_TEST_ORDER: order.id,
        BRAYER_TEST_PHASE: "retry",
        BRAYER_TEST_DECISION: decision,
        BRAYER_TEST_FIRST_ATTEMPT: verdictOut.attemptId,
        BRAYER_TEST_EVIDENCE: evidencePath,
      });
      assert.equal(retryOut.status, "approved");
      assert.notEqual(retryOut.attemptId, verdictOut.attemptId);
      assert.equal(retryOut.resumedCheckpointId, verdictOut.checkpointId);

      const check = createStore({ dbPath, config: { blobsPath } });
      try {
        const final = check.order.get(order.id);
        assert.equal(final.status, "approved");

        const checkpoints = check.checkpoint.list({ workOrderId: order.id });
        assert.equal(checkpoints.length, 2);
        assert.equal(checkpoints[0].id, verdictOut.checkpointId);
        assert.equal(checkpoints[0].treeHash, `${decision}-tree`);
        assert.equal(checkpoints[1].id, retryOut.retryCheckpointId);
        assert.deepEqual(checkpoints[1].state, { next_step: "finish", resumed_from: verdictOut.checkpointId });

        const attempts = check.attempt.list({ workOrderId: order.id });
        assert.equal(attempts.length, 2);
        assert.equal(attempts[0].id, verdictOut.attemptId);
        assert.equal(attempts[0].status, "finished");
        assert.equal(attempts[1].id, retryOut.attemptId);
        assert.equal(attempts[1].status, "finished");
        assert.equal(attempts[1].checkpointId, retryOut.retryCheckpointId);

        const verdicts = check.verdict.list({ workOrderId: order.id });
        assert.equal(verdicts.length, 2);
        assert.equal(verdicts[0].decision, decision);
        assert.equal(verdicts[0].attemptId, verdictOut.attemptId);
        assert.equal(verdicts[1].decision, "approve");
        assert.equal(verdicts[1].attemptId, retryOut.attemptId);

        const kinds = check.event.list({ workOrderId: order.id }).map((event) => event.kind);
        assert.ok(kinds.includes("order.resumed"));
        assert.ok(kinds.includes("verdict.issued"));
      } finally {
        check.close();
        rmSync(dir, { recursive: true, force: true });
      }
    }
  }
});
