/**
 * AgentBrain Core - Modular Architecture
 * Refactored into lib/brain/* modules:
 *  - lib/brain/stuck_detector.js
 *  - lib/brain/token_tracker.js
 *  - lib/brain/session_memory.js
 *  - lib/brain/prompt_builder.js
 *  - lib/brain/bug_scanner.js
 *  - lib/brain/llm_caller.js
 *  - lib/brain/replay_recorder.js
 *  - lib/brain/braid_flow.js
 *  - lib/brain/agent_brain_refactored.js
 */

const AgentBrain = require('../lib/brain/agent_brain_refactored');

module.exports = AgentBrain;
