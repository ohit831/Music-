# Apna Music Firestore Security Specification

## 1. Data Invariants
1. **Zero Passwords / Zero Secrets**: No document in `/login_events`, `/users`, or `/users/{userId}/private/info` may contain `password`, `passwordHash`, `token`, `accessToken`, `secret`, or any unlisted ghost field. Enforced via `keys().hasAll(...) && keys().hasOnly(...)`.
2. **Owner-Only Global Login Audit Visibility**: Only the verified site owner (`request.auth.token.email == 'rohitrrathod1958@gmail.com' && request.auth.token.email_verified == true`) can `list` or read all `/login_events`. Regular authenticated users may only create their own event (`incoming().uid == request.auth.uid`) and read their own event.
3. **Append-Only Audit Trail**: Nobody can `update` or `delete` documents in `/login_events/{eventId}` from the client SDK.
4. **Verified Identity & Temporal Integrity**: All writes require `request.auth != null && request.auth.token.email_verified == true`, exact `uid == request.auth.uid`, valid ID pattern `^[a-zA-Z0-9_\\-]+$`, and `loggedInAt == request.time` / `updatedAt == request.time`.
5. **PII Isolation**: User emails live in `/users/{userId}/private/info` rather than public profiles, restricted to `request.auth.uid == userId || isOwner()`.
6. **Per-User Track Metadata & Tag Isolation**: Custom track metadata edits and tags under `/users/{userId}/track_metadata/{trackId}` are strictly private to `request.auth.uid == userId`, bounded (`tags.size() <= 10`, string lengths capped, `releaseYear` 1900–2100, `bpm` 0 or 30–300), and verified via `updatedAt == request.time`.

## 2. Adversarial "Dirty Dozen" Payloads (Expected: PERMISSION_DENIED)
1. **Password Smuggling**: Creating `/login_events/evt_1` with `{ ..., "password": "secret123" }` -> denied by `keys().hasOnly(...)`.
2. **PasswordHash Smuggling**: Creating `/login_events/evt_2` with `{ ..., "passwordHash": "apna_pwd_123" }` -> denied by `keys().hasOnly(...)`.
3. **UID Spoofing**: Authenticated user A (`uid_a`) creates `/login_events/evt_3` claiming `uid: "uid_b"` -> denied by `incoming().uid == request.auth.uid`.
4. **Ghost Role Injection**: Creating `/users/uid_a` with `{ ..., "isAdmin": true }` -> denied by `keys().hasOnly(...)`.
5. **Owner Email Spoofing (Unverified)**: Listing `/login_events` when `email == 'rohitrrathod1958@gmail.com'` and `email_verified == false` -> denied by `request.auth.token.email_verified == true`.
6. **Non-Owner Scraping Login Events**: Authenticated visitor `other@gmail.com` attempting `list` on `/login_events` -> denied by `isOwner()`.
7. **Unauthenticated Access**: Unauthenticated read or write on any path -> denied by `isVerifiedUser()` & default-deny catch-all.
8. **ID Poisoning**: Creating `/login_events/bad$id..1500chars` -> denied by `isValidId(eventId)`.
9. **Client Timestamp Backdating**: Creating `/login_events/evt_4` with `loggedInAt` != `request.time` -> denied by `incoming().loggedInAt == request.time`.
10. **Audit Tampering / Deletion**: Visitor attempting `update` or `delete` on `/login_events/evt_4` -> denied by `allow update, delete: if false;`.
11. **Oversized String Exhaustion (DoW)**: Creating `/login_events/evt_5` with 50KB `visitorName` -> denied by `visitorName.size() <= 80`.
12. **Cross-User PII & Metadata Read/Write**: Visitor A reading/writing `/users/uid_b/private/info` or `/users/uid_b/track_metadata/trk-1` -> denied by `request.auth.uid == userId`.
13. **Unbounded Tag Array Exhaustion**: Creating `/users/uid_a/track_metadata/trk-1` with 25 tags or oversized tags -> denied by `data.tags.size() <= 10` and item length checks.
