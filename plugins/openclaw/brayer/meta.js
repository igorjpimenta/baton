// OpenClaw can mutate request `_meta` but hosts without the JSON-RPC `_meta`
// hoist (the upstream 10.x catalog seam, openclaw/openclaw#193006) drop it
// before dispatch. The stamp therefore goes out on both channels: `_meta.brayer`
// where the server reads protocol-level identity, and brayer_agent/
// brayer_session args where the harness ships flat args (server picks `_meta`
// first, args when `_meta` is lost). Unconditional overwrite on both: a
// model-supplied pair must never survive.
export function isBrayerTool(name) {
  return typeof name === "string" && name.includes("brayer");
}

export function buildBrayerMeta(event, ctx) {
  const toolName = event?.toolName ?? ctx?.toolName;
  if (!isBrayerTool(toolName)) return undefined;

  const agent = ctx?.agentId ?? event?.agentId ?? null;
  const session = ctx?.sessionKey ?? ctx?.sessionId ?? ctx?.runId ?? event?.sessionId ?? event?.runId ?? null;
  if (agent === null && session === null) return undefined;

  const params = event?.params ?? {};
  return {
    params: {
      ...params,
      ...(agent !== null && session !== null
        ? { brayer_agent: agent, brayer_session: session }
        : {}),
      _meta: {
        ...(params._meta ?? {}),
        brayer: { harness: "openclaw", agent, session },
      },
    },
  };
}
