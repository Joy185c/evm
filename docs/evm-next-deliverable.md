# Classroom EVM Voting App — Next Deliverable (React + Node + Postgres)

This document provides the implementation-ready artifacts requested:

1. REST API endpoint list
2. SQL schema (copy/paste)
3. Realtime event contract
4. UI wireframe structure

---

## 1) REST API Endpoints

Base URL: `/api/v1`

Auth model:
- Teacher/Admin routes require JWT bearer token with `role=admin`.
- Student routes use either authenticated student JWT (login mode) or issued `session_member_token` (token mode).

### 1.1 Auth

#### `POST /auth/admin/login`
Admin login.

Request:
```json
{
  "email": "teacher@dept.edu",
  "password": "***"
}
```

Response:
```json
{
  "access_token": "jwt",
  "user": { "id": "uuid", "name": "Prof A", "role": "admin" }
}
```

#### `POST /auth/student/login` (optional, login-based mode)
Student login.

Request:
```json
{
  "student_id": "CSE2026001",
  "password": "***"
}
```

Response:
```json
{
  "access_token": "jwt",
  "user": { "id": "uuid", "name": "Student", "role": "student" }
}
```

---

### 1.2 Session Management

#### `POST /sessions` (admin)
Create class session.

Request:
```json
{
  "dept_id": "uuid"
}
```

Response:
```json
{
  "id": "uuid",
  "session_code": "AB12CD",
  "status": "active",
  "created_at": "2026-01-01T10:00:00Z"
}
```

#### `GET /sessions/:sessionId` (admin)
Fetch session details + summary.

#### `GET /sessions/:sessionId/polls` (admin)
List polls in a session.

#### `POST /sessions/:sessionId/end` (admin)
End session (`active -> ended`).

#### `POST /sessions/join` (student)
Join with code / QR payload.

Request:
```json
{
  "session_code": "AB12CD",
  "name": "Student Name"
}
```

Response (token mode):
```json
{
  "session_id": "uuid",
  "member_id": "uuid",
  "session_member_token": "opaque_token",
  "joined_at": "2026-01-01T10:01:00Z"
}
```

---

### 1.3 Poll CRUD + Lifecycle

#### `POST /sessions/:sessionId/polls` (admin)
Create poll in `draft`.

Request:
```json
{
  "title": "Choose class representative",
  "description": "Vote now",
  "is_anonymous": true,
  "show_live_results_to_students": false,
  "publish_final_results_to_students": true,
  "start_at": null,
  "end_at": null,
  "options": [
    { "label": "Alice", "sort_order": 1 },
    { "label": "Bob", "sort_order": 2 }
  ]
}
```

#### `GET /polls/:pollId` (admin/student)
Return poll details filtered by role.

#### `PATCH /polls/:pollId` (admin)
Edit draft-only fields.

#### `POST /polls/:pollId/open` (admin)
Transition `draft -> open`.

#### `POST /polls/:pollId/close` (admin)
Transition `open -> closed`.

#### `POST /polls/:pollId/archive` (admin)
Transition `closed -> archived`.

#### `POST /polls/:pollId/reset` (admin)
Delete votes and reset tally (allowed in `draft` or `closed` pre-archive).

#### `POST /polls/:pollId/settings` (admin)
Toggle visibility flags.

Request:
```json
{
  "show_live_results_to_students": false,
  "publish_final_results_to_students": true
}
```

---

### 1.4 Voting + Results

#### `POST /polls/:pollId/votes` (student)
Cast one vote.

Request:
```json
{
  "option_id": "uuid"
}
```

Responses:
- `201 Created` vote accepted
- `409 Conflict` already voted
- `400/403` invalid state or access

Success response:
```json
{
  "vote_id": "uuid",
  "confirmation": {
    "poll_id": "uuid",
    "option_label": "Alice",
    "timestamp": "2026-01-01T10:05:00Z",
    "receipt_code": "VVPAT-7K2M"
  }
}
```

#### `GET /polls/:pollId/results` (admin/student)
- Admin always sees full results.
- Student sees based on `show_live_results_to_students` and `publish_final_results_to_students`.

Response:
```json
{
  "poll_id": "uuid",
  "status": "closed",
  "total_votes": 42,
  "options": [
    { "option_id": "uuid", "label": "Alice", "count": 24, "percent": 57.14 },
    { "option_id": "uuid", "label": "Bob", "count": 18, "percent": 42.86 }
  ],
  "winner": { "type": "single", "option_ids": ["uuid"] }
}
```

#### `GET /polls/:pollId/vvpats/:voteId` (student)
Fetch vote confirmation slip.

---

### 1.5 Audit + History + Export

#### `GET /sessions/:sessionId/audit-logs` (admin)
Paginated critical actions.

#### `GET /sessions/:sessionId/history` (admin)
Archived/closed poll history.

#### `GET /polls/:pollId/export.csv` (admin)
CSV export.

#### `GET /polls/:pollId/export.pdf` (admin)
PDF export.

---

## 2) PostgreSQL SQL Schema (Copy/Paste)

```sql
-- Enable useful extension for UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Enums
CREATE TYPE user_role AS ENUM ('admin', 'student');
CREATE TYPE session_status AS ENUM ('active', 'ended');
CREATE TYPE poll_status AS ENUM ('draft', 'open', 'closed', 'archived');
CREATE TYPE action_type AS ENUM (
  'CREATE_SESSION',
  'END_SESSION',
  'JOIN_SESSION',
  'CREATE_POLL',
  'UPDATE_POLL',
  'OPEN_POLL',
  'CAST_VOTE',
  'CLOSE_POLL',
  'RESET_POLL',
  'ARCHIVE_POLL',
  'PUBLISH_RESULTS',
  'EXPORT'
);

-- 2) Core tables
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  role user_role NOT NULL,
  dept_id UUID NOT NULL,
  student_id TEXT NULL,
  email TEXT NULL,
  password_hash TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX users_email_unique_idx
  ON users (email)
  WHERE email IS NOT NULL;

CREATE UNIQUE INDEX users_student_id_unique_idx
  ON users (student_id)
  WHERE student_id IS NOT NULL;

CREATE TABLE class_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dept_id UUID NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id),
  session_code VARCHAR(12) NOT NULL UNIQUE,
  status session_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ NULL
);

CREATE TABLE session_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES class_sessions(id) ON DELETE CASCADE,
  user_id UUID NULL REFERENCES users(id),
  member_name TEXT NULL,
  session_member_token_hash TEXT NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT session_members_unique_user UNIQUE (session_id, user_id),
  CONSTRAINT session_members_unique_token UNIQUE (session_id, session_member_token_hash)
);

CREATE TABLE polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES class_sessions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NULL,
  is_anonymous BOOLEAN NOT NULL DEFAULT TRUE,
  show_live_results_to_students BOOLEAN NOT NULL DEFAULT FALSE,
  publish_final_results_to_students BOOLEAN NOT NULL DEFAULT FALSE,
  status poll_status NOT NULL DEFAULT 'draft',
  start_at TIMESTAMPTZ NULL,
  end_at TIMESTAMPTZ NULL,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE poll_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  symbol TEXT NULL,
  sort_order INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT poll_options_unique_order UNIQUE (poll_id, sort_order)
);

CREATE TABLE votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES poll_options(id) ON DELETE RESTRICT,
  voter_user_id UUID NULL REFERENCES users(id),
  voter_hash TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT votes_identity_check CHECK (
    (voter_user_id IS NOT NULL AND voter_hash IS NULL)
    OR
    (voter_user_id IS NULL AND voter_hash IS NOT NULL)
  )
);

-- Duplicate prevention for two strategies
CREATE UNIQUE INDEX votes_unique_user_vote_idx
  ON votes (poll_id, voter_user_id)
  WHERE voter_user_id IS NOT NULL;

CREATE UNIQUE INDEX votes_unique_hash_vote_idx
  ON votes (poll_id, voter_hash)
  WHERE voter_hash IS NOT NULL;

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NULL REFERENCES class_sessions(id) ON DELETE SET NULL,
  poll_id UUID NULL REFERENCES polls(id) ON DELETE SET NULL,
  actor_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  action_type action_type NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3) Performance indexes
CREATE INDEX polls_session_status_idx ON polls (session_id, status);
CREATE INDEX votes_poll_option_idx ON votes (poll_id, option_id);
CREATE INDEX votes_poll_created_at_idx ON votes (poll_id, created_at);
CREATE INDEX audit_logs_session_created_idx ON audit_logs (session_id, created_at DESC);
CREATE INDEX audit_logs_poll_created_idx ON audit_logs (poll_id, created_at DESC);

-- 4) Helpful view for tally
CREATE OR REPLACE VIEW poll_results_view AS
SELECT
  p.id AS poll_id,
  po.id AS option_id,
  po.label,
  COUNT(v.id)::INT AS vote_count
FROM polls p
JOIN poll_options po ON po.poll_id = p.id
LEFT JOIN votes v ON v.poll_id = p.id AND v.option_id = po.id
GROUP BY p.id, po.id, po.label;
```

---

## 3) Realtime Event Contract

Transport: Socket.io (namespace: `/realtime`) or equivalent websocket bus.

Room strategy:
- `session:{sessionId}:admins`
- `session:{sessionId}:students`
- `poll:{pollId}`

Event envelope (common):
```json
{
  "event": "poll_opened",
  "version": 1,
  "session_id": "uuid",
  "poll_id": "uuid",
  "timestamp": "2026-01-01T10:02:00Z",
  "payload": {}
}
```

### Events

#### `session_active_poll_changed`
When teacher switches active poll.

Payload:
```json
{ "active_poll_id": "uuid" }
```

#### `poll_opened`
Broadcast on open.

Payload:
```json
{
  "status": "open",
  "start_at": "2026-01-01T10:02:00Z",
  "end_at": null,
  "title": "Choose class representative"
}
```

#### `vote_cast`
Emitted after successful vote insert.

Payload:
```json
{
  "total_votes": 21,
  "option_counts": [
    { "option_id": "uuid", "count": 11 },
    { "option_id": "uuid", "count": 10 }
  ]
}
```

Notes:
- Send `vote_cast` with full tallies only to admins.
- To students, only emit if live results are enabled.

#### `poll_closed`
Broadcast on close.

Payload:
```json
{
  "status": "closed",
  "end_at": "2026-01-01T10:15:00Z",
  "total_votes": 42
}
```

#### `results_published`
When teacher enables final results visibility.

Payload:
```json
{
  "publish_final_results_to_students": true,
  "results": {
    "total_votes": 42,
    "winner": { "type": "single", "option_ids": ["uuid"] }
  }
}
```

#### `poll_reset`
When votes are cleared.

Payload:
```json
{ "poll_id": "uuid", "total_votes": 0 }
```

#### `poll_archived`
When poll is archived.

Payload:
```json
{ "poll_id": "uuid", "status": "archived" }
```

---

## 4) UI Wireframe Structure

## 4.1 Teacher/Admin App

### Screen A: Session Dashboard
- Header: Department + Teacher profile + Logout
- Card: `Create Session` CTA
- Active session panel:
  - Session code (large)
  - QR code block
  - `End Session` button
- Poll list table:
  - Columns: Title, Status, Votes, Created At, Actions
  - Actions: Edit (draft), Open/Close, Results, Archive
- Side panel: Audit quick feed (latest 10)

### Screen B: Poll Builder (Draft)
- Form fields:
  - Poll title
  - Description
  - Option list editor (add/remove/reorder)
- Settings toggles:
  - Anonymous voting
  - Live results visible to students
  - Publish final results to students
  - Timed voting enable + datetime picker
- Footer actions:
  - Save Draft
  - Open Poll
  - Cancel

### Screen C: Live Control Panel (Open)
- Status chip: `OPEN`
- Timer (countdown if end_at exists)
- Total votes counter
- Live bar chart (admin only always visible)
- Buttons:
  - Close Poll
  - Toggle Live Results (student view)
  - Emergency Reset

### Screen D: Results + Export (Closed)
- Summary cards:
  - Total votes
  - Winner / Tie
  - Participation rate
- Results table:
  - Option, Count, %, Rank
- Actions:
  - Publish/Unpublish final results
  - Export CSV
  - Export PDF
  - Archive Poll

### Screen E: Audit Log Viewer
- Filters: session, poll, action type, actor, date range
- Timeline/table:
  - Timestamp, Actor, Action, Metadata JSON preview
- Pagination controls

---

## 4.2 Student App

### Screen S1: Join Session
- Input: session code
- QR scan button
- `Join` button
- Error hints (invalid code/session ended)

### Screen S2: Active Poll Voting
- Poll title
- Large option buttons/cards
- `Submit Vote` action
- Disabled state after selection submission

### Screen S3: Vote Confirmation (VVPAT-like)
- Message: “Your vote has been recorded.”
- Chosen option label
- Timestamp
- Receipt code
- CTA: Back to waiting room

### Screen S4: Waiting Room
- Message: “Awaiting next poll / poll closed.”
- Optional live status banner

### Screen S5: Results (if allowed)
- Final chart/table when teacher publishes
- If not allowed: explanatory lock message

---

## 5) Server Guardrails Checklist (Implementation Notes)

- Enforce state transitions in service layer and DB transaction.
- Validate option belongs to poll before insert.
- Vote endpoint transaction pattern:
  1. lock poll row (`SELECT ... FOR UPDATE`)
  2. verify status open and time window
  3. insert vote (let unique index enforce duplicate check)
  4. catch unique violation -> `409 Already voted`
- Always emit audit logs for create/open/vote/close/reset/archive/export.
- Never expose voter identity in anonymous mode result endpoints.
