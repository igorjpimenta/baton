# Releases

Versions are CalVer (`YYYY.MM.DD`, prereleases `YYYY.MM.DD-beta.N`).
[`publish.yml`](../.github/workflows/publish.yml) admits tags only — do not
publish by hand.

| Tag | Publishes | Channel |
| --- | --- | --- |
| `2026.11.7` (bare) | `@igorjpimenta/brayer` | `latest` |
| `2026.11.7-beta.2` | `@igorjpimenta/brayer` | `beta` |
| `brayer-openclaw-<calver>` | `@igorjpimenta/brayer-openclaw` | latest or beta by version shape |
| `brayer-opencode-<calver>` | `@igorjpimenta/brayer-opencode` | latest or beta by version shape |

Tag admission (enforced by the workflow, per package):

1. tag must be CalVer with an optional prerelease suffix;
2. tag must equal the package's `version` exactly;
3. the tag's date must equal the UTC publish date (no zero padding);
4. a version with a prerelease suffix publishes to `beta`, without one to
   `latest`;
5. a pre-existing GitHub release is reused, otherwise one is created with an
   npm link.

Each job runs `npm ci` and `npm test` before publishing, so a tag whose tests
fail publishes nothing.
