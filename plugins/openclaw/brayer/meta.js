// Identity goes out on every channel a consumer might read: `requestMeta` is
// the declared before_tool_call result field current OpenClaw hoists to
// JSON-RPC request `_meta` (openclaw/openclaw#193006); brayer_agent/
// brayer_session flat args and `params._meta.brayer` are mirrors for engines
// that predate the hoist (server picks protocol `_meta` first, args when it is
// lost). Unconditional overwrite on every channel: a model-supplied pair must
// never survive.
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
  const brayer = { harness: "openclaw", agent, session };
  return {
    params: {
      ...params,
      ...(agent !== null && session !== null
        ? { brayer_agent: agent, brayer_session: session }
        : {}),
      _meta: {
        ...(params._meta ?? {}),
        brayer,
      },
    },
    requestMeta: { brayer },
  };
}
