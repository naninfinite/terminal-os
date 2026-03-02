
⸻

name: you-exe-supabase
description: Persistent YOU.EXE message board integration using Supabase backend with shared runtime state, polling, environment variables and API contract for M6.

YOU.EXE Supabase (M6)

Authority order
	1.	docs/you-exe/YOU-API-SOURCE-OF-TRUTH.md
	2.	docs/you-exe/SUPABASE-SETUP-AND-OPS.md
	3.	existing YOU.EXE code paths in src/
	4.	project‑wide conventions (testing, file structure, commits)

Scope (M6)
	•	Replace localStorage message persistence with backend API (read/write).
	•	Poll messages every 10 seconds while the panel/fullscreen is visible.
	•	Maintain a single shared runtime state for panel and fullscreen views.
	•	Posts are immutable (no edit or delete controls).
	•	No moderation tooling in M6.

When to use this skill

Use this skill when integrating or modifying the YOU.EXE message board backed by Supabase. It applies to backend API integration, polling the feed runtime state, handling schema expectations, environment variables, acceptance tests and UI behaviour related to messages and drafts. Do not trigger this skill for unrelated apps, generic chat implementations or general window management changes.

Trigger phrases
	•	you.exe
	•	message board
	•	Supabase
	•	API client
	•	polling
	•	draft
	•	rate limit
	•	runtime state

Do not trigger

Do not use for FileMan, Third or Connect subsystems, or for generic chat applications outside of YOU.EXE. Do not apply to ME.OS shell or window management logic.

Role

You integrate the YOU.EXE message board with the Supabase backend. You ensure messages are fetched and posted through the proxy or edge function API using environment variables for the base URL and anon key, manage local drafts responsibly, deduplicate messages when polling, respect server‑side validation and rate limits, and keep panel and fullscreen views in sync. You also adhere to the specified authority order and project conventions.

Rules
	•	Environment variables: Read the API base URL and anon key from environment variables (VITE_YOU_API_BASE_URL, etc.); never hard‑code credentials or endpoint URLs.
	•	Persistence: Do not store messages in localStorage. Only store unsent draft text and the last polling cursor locally so the user’s input survives reloads.
	•	API integration: Implement a YouApiClient wrapper with methods:
	•	listMessages({ before, limit }) calling GET /api/you/messages?before&limit (returns newest‑first messages).
	•	createMessage({ body, displayName }) calling POST /api/you/messages (CreateYouMessageInput).
	•	Message validation: Ensure body is 1–500 characters and displayName is at most 32 characters. Surface 400 validation errors from the server in the UI.
	•	Polling & deduplication: Poll for new messages every 10 seconds while the panel/fullscreen is visible. Merge new pages into the local store and deduplicate by message ID.
	•	Shared runtime state: Panel and fullscreen views must share a single store/hook containing the messages array, loading/error state and pagination cursor. Actions such as posting or clearing a draft update both views.
	•	Rate limits: Respect server‑side rate limits (e.g. posting twice within 8 seconds returns a 429). Display appropriate messages and prevent client crashes.
	•	Security: Do not add row‑level security policies that allow anonymous or public direct table access beyond the edge function/proxy.
	•	Implementation style: Keep changes small and testable; prefer one‑file or single‑concern diffs. Follow project conventions for file structure and testing.
	•	Immutability: The v1 API supports only creation and retrieval; do not implement edit or delete functionality for messages.

Required API behaviour
	•	GET /api/you/messages?before&limit: Retrieves messages in newest‑first order. Supports pagination via the before cursor and limit parameters.
	•	POST /api/you/messages: Creates a new message on the server. Accepts body and displayName as defined in CreateYouMessageInput.
	•	Error handling: Handle 400 (validation), 429 (rate limiting) and 5xx errors gracefully in the UI. Do not expose raw error details; provide user‑friendly feedback.

Deliverables (implementation phase)
	•	A YouApiClient wrapper as described above.
	•	A shared store/hook that exposes:
	•	messages array,
	•	loading and error state,
	•	startPolling() and stopPolling() controls,
	•	loadOlder() to fetch older messages via pagination.
	•	Unit tests covering message mapping, merging and deduplication logic.
	•	A manual verification checklist added to the docs log.

Acceptance criteria
	•	Posting and reading shared messages works across panel and fullscreen.
	•	Messages persist across refresh and devices via the backend (drafts persist locally).
	•	Panel and fullscreen share runtime state; messages and drafts stay in sync.
	•	No edit/delete controls are present.
	•	The build and tests remain green; other apps and subsystems remain unchanged.
	•	Environment variables can be changed without code changes to switch backends.

Verification
	•	Messages appear consistently in both panel and fullscreen after polling and posting.
	•	Draft text persists across reloads and disappears after posting.
	•	Posting a message shows up immediately in the UI and on subsequent polls.
	•	Exceeding the rate limit surfaces a clear error message and does not crash the app.
	•	Running unit tests and following the manual verification checklist confirms correct integration with Supabase and that all acceptance criteria are met.