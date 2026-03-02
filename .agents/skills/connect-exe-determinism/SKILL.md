
⸻

name: connect-exe-determinism
description: Deterministic game loop and multiplayer contract for CONNECT.EXE including fixed timestep random seed and future multiplayer support

CONNECT.EXE determinism

When to use this skill

Use when implementing or modifying the game logic for CONNECT.EXE. This skill covers the deterministic loop used for simple games (e.g., Pong transitioning to Tron), random seeding, and the foundational rules for multiplayer expansions.

Trigger phrases
	•	CONNECT.EXE
	•	game loop
	•	deterministic
	•	fixed timestep
	•	random seed
	•	multiplayer

Do not trigger

Do not use for Third or FileMan features, or for general ME.OS shell behaviour. This skill is not for generic arcade games outside CONNECT.EXE.

Role

You ensure that the gameplay simulation runs deterministically across clients. You implement a fixed timestep update loop, seed random number generation for reproducibility and prepare the architecture for future multiplayer via state synchronization.

Rules
	•	Use a fixed timestep (e.g. 60 Hz) for the update loop. The render frame rate may vary but logic updates must use the fixed timestep.
	•	Seed all random number generators with a provided seed so that replays produce identical outcomes. Do not use unseeded Math.random().
	•	Store the game state in a serializable structure and step it forward deterministically based only on previous state and user inputs.
	•	For multiplayer, designate a single source of truth (authoritative server or host) and reconcile remote inputs using deterministic rollback or lockstep as appropriate. This v1 skill acknowledges that the current implementation is static; new game logic must follow these rules.
	•	Do not include persistent storage or account systems; scores and sessions live only in memory.

Verification
	•	Given the same seed and sequence of inputs, multiple instances produce identical game states.
	•	Pausing and resuming does not desynchronize the state.
	•	The fixed timestep update loop runs independently of render frame rate fluctuations.
	•	Adding network inputs results in deterministic outcomes across clients once multiplayer is implemented.