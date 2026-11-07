import { createBrayerHooks } from "./hooks.js";
import { setup } from "./setup.js";

// The legacy V1 path object-hook form, kept until the compatibility window
// closes. V1 hosts call server(); they cannot read id/setup().
export async function BrayerLegacy() {
  return createBrayerHooks();
}

// setup() first: it is the entry. server() is the legacy V1 path. Each side
// stays on its own API — sharing the export does not translate one into the
// other.
export default { id: "brayer", setup, server: BrayerLegacy };
