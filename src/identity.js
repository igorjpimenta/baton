// A usable layer names something: non-empty, and neither of the two tokens
// no key may carry ("unknown", "instance:*").
function isUsableLayer(v) {
  return (
    typeof v === "string" &&
    v.trim() !== "" &&
    !/^(unknown|instance:.*)$/i.test(v.trim())
  );
}

// The server is constructed with the harness it serves; the mint decides
// what that is per transport — BRAYER_HARNESS env for one-to-one stdio, the
// X-Brayer-Harness header at session creation for shared HTTP. Agent and
// session are never declared: they arrive per call, stamped by the calling
// harness's companion plugin.
export function assertDeclaration(base = {}) {
  const harness = base.harness ?? process.env.BRAYER_HARNESS;
  if (typeof harness !== "string" || !harness.trim()) {
    throw new Error("brayer: BRAYER_HARNESS is required");
  }
  if (/^(unknown|instance:.*)$/i.test(harness.trim())) {
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
