# 10 — Tests d'acceptation

## 1. Auth

### AT-001 — Verify auth with access token

Given a valid access token  
When I run `meetup-exit verify-auth --auth access-token`  
Then the command returns exit code 0  
And it displays the authenticated member id and name  
And it does not display the token.

### AT-002 — JWT bearer token

Given a valid OAuth Client and RSA signing key  
When I run `meetup-exit verify-auth --auth jwt-bearer`  
Then the tool signs a JWT assertion  
And exchanges it for an access token  
And successfully calls `self`.

### AT-003 — Invalid auth

Given invalid credentials  
When I run `meetup-exit verify-auth`  
Then the command exits with code 2  
And the error does not leak secrets.

## 2. Network

### AT-010 — Probe network

Given a valid token with access to the network  
When I run `meetup-exit probe-network --network elsassjug`  
Then it confirms the network is accessible  
And displays a group count or sample groups.

### AT-011 — Inaccessible network

Given a valid token without access  
When I run `probe-network`  
Then the command exits with code 3.

## 3. Export

### AT-020 — Export groups

When I run an export with `--include-groups`  
Then `raw/groups.jsonl` exists  
And `csv/groups.csv` exists  
And `manifest.json` contains the group count.

### AT-021 — Export events

When I run an export with `--include-events`  
Then `raw/events.jsonl` and `raw/event-details.jsonl` exist  
And `csv/events.csv` exists  
And Markdown files are generated.

### AT-022 — Export RSVPs full

When I run with `--include-rsvps --privacy-mode full`  
Then `csv/rsvps.csv` may contain member emails if Meetup returns them  
And `gdpr-review.md` marks the file as private.

### AT-023 — Export RSVPs no-email

When I run with `--include-rsvps --privacy-mode no-email`  
Then `csv/rsvps.csv` contains no email values  
And `gdpr-review.md` reflects the mode.

### AT-024 — Public archive

When I run with `--privacy-mode public-archive`  
Then Markdown files contain no RSVPs  
And no emails  
And no registration answers.

## 4. Rate limit

### AT-030 — RATE_LIMITED retry

Given Meetup returns `RATE_LIMITED` with `resetAt`  
When a request is executed  
Then the client waits until `resetAt`  
And retries the request.

### AT-031 — Repeated rate limit

Given Meetup repeatedly returns `RATE_LIMITED`  
When max retries is exceeded  
Then the entity is recorded as failed  
And the export continues if possible.

## 5. Archive

### AT-040 — Manifest

After an export  
Then `manifest.json` contains:

- tool version;
- startedAt;
- finishedAt;
- endpoint;
- networkUrlname;
- authMode;
- privacyMode;
- counts;
- metrics.

### AT-041 — Checksums

After an export  
Then `checksums/sha256.txt` contains checksums for generated files.

## 6. Convert

### AT-050 — Convert full archive to public archive

Given a full raw archive  
When I run `meetup-exit convert --privacy-mode public-archive`  
Then the output contains public Markdown  
And no private CSV.

## 7. Resume

### AT-060 — Resume does not duplicate

Given a partially completed export  
When I rerun with `--resume`  
Then already exported records are not duplicated  
And missing records are fetched.

## 8. Unit tests minimum

- auth providers;
- JWT assertion claims/header;
- refresh token persistence;
- paginator;
- rate-limit error extraction;
- privacy filters;
- CSV escaping;
- slugification;
- manifest generation.