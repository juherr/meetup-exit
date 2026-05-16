---
status: issues_found
files_reviewed: 5
findings:
  critical: 0
  warning: 4
  info: 5
  total: 9
---

# Code Review — Phase 03 (Ops & Docs)

Files reviewed:
- `src/cli/commands/doctor.ts`
- `src/cli/main.ts`
- `SECURITY.md`
- `README.md`
- `.env.example`

---

## Findings

### Warning — W-01

**File**: `src/cli/commands/doctor.ts`, line 22  
**Severity**: Warning  
**Description**: `MODES_REQUIRING_KEY_CHECK` includes `"refresh-token"`, but `REQUIRED_ENV_VARS["refresh-token"]` does not include `MEETUP_PRIVATE_KEY_PATH`. The refresh-token flow uses a client secret and a token file, not an RSA private key. Triggering the key-permissions check for `refresh-token` mode is therefore incorrect: it will always fail (or pass coincidentally) because no private key is required for that flow, and the fallback path `./secrets/meetup-private-key.pem` is meaningless in that context.  
**Suggested fix**: Remove `"refresh-token"` from `MODES_REQUIRING_KEY_CHECK`. The key-permissions check should be exclusive to `jwt-bearer` mode.

```ts
// Before
const MODES_REQUIRING_KEY_CHECK: ValidAuthMode[] = ["jwt-bearer", "refresh-token"];

// After
const MODES_REQUIRING_KEY_CHECK: ValidAuthMode[] = ["jwt-bearer"];
```

---

### Warning — W-02

**File**: `src/cli/commands/doctor.ts`, line 78  
**Severity**: Warning  
**Description**: The private-key permissions check accepts only exactly `0o600`. On some POSIX systems (and when files are created programmatically) the sticky/setuid/setgid bits in `stat.mode` can differ from the plain 9-bit mask. The current comparison `mode === 0o600` is correct for the 9-bit masked result (the `& 0o777` on line 77 strips higher bits), but the check is overly strict about group/other bits: it rejects `0o640` (read for group, sometimes intentional) or `0o400` (read-only). More importantly, it does **not** warn when the key is group-readable (`0o640`) — it silently treats it as a failure rather than a distinct diagnostic. A user who inadvertently sets `0o640` sees the same message as a user who has `0o755`, which makes troubleshooting harder.  
**Suggested fix**: Distinguish between "too permissive" and "too restrictive" in the diagnostic message, e.g. warn explicitly if group/other read bits are set.

---

### Warning — W-03

**File**: `src/cli/commands/doctor.ts`, lines 102–111  
**Severity**: Warning  
**Description**: The output directory writability check is hardcoded to `"./exports"`. The actual output directory can be overridden by the user (via `--out` CLI flag or an env var). When a user configures a non-default output path, `doctor` will validate the wrong directory and give a false positive or false negative result.  
**Suggested fix**: Read the output directory from an env var (e.g., `MEETUP_OUTPUT_DIR` or equivalent) with `./exports` as the default, mirroring how the `export` command resolves it.

---

### Warning — W-04

**File**: `src/cli/main.ts`, line 12  
**Severity**: Warning  
**Description**: The version `"0.1.0"` is hardcoded as a string literal in the program definition. This will inevitably drift from `package.json` as the project evolves. There is no mechanism to keep the two in sync.  
**Suggested fix**: Import the version from `package.json` (Bun supports JSON imports natively) so there is a single source of truth.

```ts
import pkg from "../../package.json" with { type: "json" };
// ...
program.version(pkg.version)
```

---

### Info — I-01

**File**: `src/cli/commands/doctor.ts`, lines 33–41  
**Severity**: Info  
**Description**: The Bun version check validates only the major version (`>= 1`). The project's tooling (`.mise.toml`) likely pins a more specific minimum. Checking only the major version gives a false "pass" for any Bun 1.x release, including early pre-release builds that may lack features used by the codebase.  
**Suggested fix**: Read the minimum version from `.mise.toml` or a constant, and perform a proper semver comparison (major.minor.patch).

---

### Info — I-02

**File**: `src/cli/commands/doctor.ts`, lines 85–96  
**Severity**: Info  
**Description**: The catch block of the private-key stat check has a slightly redundant structure: `message` is derived from `error` unconditionally, and then `isNotFound` is checked to decide which message to show. When `isNotFound` is true, `message` is still computed but never used. This is harmless but mildly confusing.  
**Suggested fix**: Move the `message` assignment inside the `else` branch, or restructure to a single clear conditional.

---

### Info — I-03

**File**: `src/cli/commands/doctor.ts`, lines 60–68  
**Severity**: Info  
**Description**: The env var check (check 3) does not validate that the value is non-whitespace. A value of `"   "` (spaces only) would pass the `value !== ""` guard but would fail at runtime when the value is actually used. This is a low-risk issue for most vars, but `MEETUP_AUTHORIZED_MEMBER_ID` (expected to be a numeric ID) and `MEETUP_PRIVATE_KEY_PATH` (expected to be a valid path) could silently pass doctor while being functionally empty.  
**Suggested fix**: Use `value.trim() !== ""` in the check condition.

---

### Info — I-04

**File**: `SECURITY.md`  
**Severity**: Info  
**Description**: The SECURITY.md covers threat model and usage guidance well, but omits a disclosure policy section: there is no contact address, no preferred disclosure channel (e.g., GitHub private vulnerability reporting), and no mention of whether a CVE process exists. For an open-source tool handling OAuth credentials and PII, a minimal responsible disclosure section is standard practice.  
**Suggested fix**: Add a "Reporting a vulnerability" section with a contact email or GitHub security advisory URL.

---

### Info — I-05

**File**: `.env.example`, line 18  
**Severity**: Info  
**Description**: `MEETUP_REFRESH_TOKEN_FILE` has a default value of `./secrets/meetup-refresh-token.txt` pre-filled in the example. Because refresh tokens are single-use and highly sensitive (as noted in SECURITY.md), pre-populating a path may encourage users to store the token in a predictable location. The line comment does not remind users to ensure this file is also `chmod 600`.  
**Suggested fix**: Add an inline comment reminding users to `chmod 600` this file, mirroring the guidance already given for the private key path.
