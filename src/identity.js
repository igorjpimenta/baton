// A usable layer names something: non-empty, and neither of the tokens no
// key may carry ("unknown", "any", "instance:*" — "any" was the shared-HTTP
// env sentinel; the header mint makes it meaningless as a harness name).
function isUsableLayer(v) {
  return (
    typeof v === "string" &&
    v.trim() !== "" &&
    !/^(unknown|any|instance:.*)$/i.test(v.trim())
  );
}

// The declaration arrives only from the caller side — never from process env.
// serve() injects BRAYER_HARNESS as the stdio base (one-to-one pipe); the
// shared HTTP mint passes the X-Brayer-Harness header at session creation.
// Keeping the env read out of here is what stops a streaming session from
// ever minting a construction-time harness. Agent and session are never
// declared: they arrive per call, stamped by the calling harness's plugin.
export function assertDeclaration(base = {}) {
  const harness = base?.harness;
  if (typeof harness !== "string" || !harness.trim()) {
    throw new Error("brayer: harness must be declared (BRAYER_HARNESS env for stdio serve, X-Brayer-Harness header for HTTP)");
  }
  if (!isUsableLayer(harness)) {
    throw new Error(`brayer: refused declaration (reserved: harness). "${harness}" cannot identify a consumer — declare the real harness name.`);
  }
  return { ...base, harness: harness.trim() };
}

export function resolveIdentity({ meta, args, base } = {}) {
  const declared = assertDeclaration(base);
  const stamped = meta?.brayer ?? {};

  // Whole pairs only: a _meta half never splices with an args half, so no
  // call can assemble an identity across trust channels.
  const usable = (v) => (typeof v === "string" && v.trim() ? v.trim() : null);
  const mAgent = usable(stamped.agent);
  const mSession = usable(stamped.session);
  const aAgent = usable(args?.brayer_agent);
  const aSession = usable(args?.brayer_session);
  const pair =
    mAgent && mSession
      ? { agent: mAgent, session: mSession, via: "meta" }
      : aAgent && aSession
        ? { agent: aAgent, session: aSession, via: "args" }
        : null;
  if (!pair) {
    if ((mAgent || aAgent) && (mSession || aSession)) {
      throw new Error("brayer: refused caller identity (halves in different channels — pairs never splice). Stamp a whole agent+session pair in one channel: _meta.brayer or brayer_agent/brayer_session args.");
    }
    const bad = [];
    if (!mAgent && !aAgent) bad.push("agent");
    if (!mSession && !aSession) bad.push("session");
    throw new Error(`brayer: ${bad.join(" and ")} must be stamped on the call`);
  }

  return { harness: declared.harness, agent: pair.agent, session: pair.session, via: pair.via };
}

export function identityKey(identity) {
  return `${identity.harness}:${identity.agent}:${identity.session}`;
}
