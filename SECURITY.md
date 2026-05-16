# Security

## Pseudonymization salt is ephemeral

Each `export --privacy-mode pseudonymized` run generates a new random salt in memory. This salt is **not persisted to disk**.

As a result, member hashes (e.g., `member_a3f19c2b`) produced in one run are **not the same** as hashes for the same member in a different run — even when exporting the same network data. Do not cross-reference pseudonymized archives from different runs to correlate members; doing so breaks the pseudonymization contract and re-identifies individuals.

To compare or re-process archives over time, keep the original raw JSONL and run `convert` on the same raw archive. The `convert` command re-derives CSV and Markdown from existing JSONL without making any API calls.

## Private key

The RSA private key file pointed to by `MEETUP_PRIVATE_KEY_PATH` must have permissions `600` (owner read/write only):

```bash
chmod 600 ./secrets/meetup-private-key.pem
```

Never commit this file to version control. Store it in the `secrets/` directory, which is already gitignored. The `doctor` command (`meetup-exit doctor`) verifies private key permissions automatically and reports any misconfiguration.

## Token handling

Access tokens and refresh tokens are never logged or printed to stdout/stderr. If an error occurs during authentication, only the error type and message are shown — the token value is masked. Never share application logs that may contain HTTP request details from auth flows.

Refresh tokens (used in `refresh-token` mode) are single-use: after each successful token refresh, the new refresh token is written back to `MEETUP_REFRESH_TOKEN_FILE` immediately. Do not share or log this file. If a refresh token is exposed, revoke the OAuth application credentials in the Meetup developer portal.

## Full-export sensitivity

A full export (`--privacy-mode full`) contains complete member data: names, email addresses, RSVP statuses, and all registration form answers. Treat the `exports/` directory as sensitive:

- Do not commit it to version control.
- Do not share the archive publicly.
- Restrict filesystem access to the user running the export.

The `public-archive` and `no-email` privacy modes exist to reduce PII in the output when sharing or publishing archives. Use `pseudonymized` when you need member-level data without exposing identities, keeping the ephemeral salt limitation in mind.

## Gitignore configuration

The following paths must be in `.gitignore` to prevent committing secrets or sensitive data:

- `.env` — contains credentials (auth tokens, client keys)
- `secrets/` — private key and other sensitive files
- `exports/` — export archives may contain member PII

These paths are already gitignored in this repository. Verify with:

```bash
git check-ignore -v .env secrets/ exports/
```
