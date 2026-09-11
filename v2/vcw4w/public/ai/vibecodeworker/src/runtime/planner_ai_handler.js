/**
 * Interactive Hub Game Planner AI Handler
 */
const pool = require('../modules/vocabulary_pool');

async function callPlannerAI(agentBrain, userInput, plannerStep, plannerSpecs, plannerHistory) {
  plannerHistory.push({ role: 'user', content: userInput });
  const useFallback = !agentBrain.config.apiKey && agentBrain.config.provider !== 'local';
  
  if (useFallback) {
    const step = plannerStep;
    let agentResponse = "";
    let choices = [];
    let isCompleted = false;

    if (step === 0) {
      plannerSpecs.name = userInput.replace(/^\d+\.\s*/, '');
      agentResponse = `Excellent! "${plannerSpecs.name}" is a great name. Let's decide on the Core Mechanic. What type of gameplay fits this game?`;
      choices = [
        "1. " + pool.mechanics[Math.floor(Math.random() * pool.mechanics.length)],
        "2. " + pool.mechanics[Math.floor(Math.random() * pool.mechanics.length)],
        "3. " + pool.mechanics[Math.floor(Math.random() * pool.mechanics.length)]
      ];
      return { agentResponse, choices, nextStep: 1, isCompleted: false };
    } else if (step === 1) {
      plannerSpecs.mechanic = userInput.replace(/^\d+\.\s*/, '');
      agentResponse = `Got it. For "${plannerSpecs.name}", we are using: "${plannerSpecs.mechanic}". Next, let's pick a Visual Theme / Aesthetic:`;
      choices = [
        "1. " + pool.themes[Math.floor(Math.random() * pool.themes.length)],
        "2. " + pool.themes[Math.floor(Math.random() * pool.themes.length)],
        "3. " + pool.themes[Math.floor(Math.random() * pool.themes.length)]
      ];
      return { agentResponse, choices, nextStep: 2, isCompleted: false };
    } else if (step === 2) {
      plannerSpecs.theme = userInput.replace(/^\d+\.\s*/, '');
      agentResponse = `Perfect choice. With a theme of "${plannerSpecs.theme}", what should be the main Winning Goal or Win/Lose Condition?`;
      choices = [
        "1. Collect 50 stardust fragments to win",
        "2. Survive as long as possible (endless loop)",
        "3. Clear 10 waves of accelerating hazards"
      ];
      return { agentResponse, choices, nextStep: 3, isCompleted: false };
    } else {
      plannerSpecs.goal = userInput.replace(/^\d+\.\s*/, '');
      agentResponse = `[Plan Complete] Your plan document has been written to: games_plan/${plannerSpecs.name.replace(/\s+/g, '_')}_plan.txt. You can copy/paste it into Cursor or another AI code editor or select the folder from the hub view!`;
      choices = ["Draft Saved", "Spec Completed", "Saved to workspace"];
      return { agentResponse, choices, nextStep: 4, isCompleted: true };
    }
  }

  const systemPrompt = `You are an expert game designer helping a user design a viral browser HTML5 game.
We are building a specification document. The current spec state is:
Name: ${plannerSpecs.name || 'Not set'}
Mechanic: ${plannerSpecs.mechanic || 'Not set'}
Theme: ${plannerSpecs.theme || 'Not set'}
Goal: ${plannerSpecs.goal || 'Not set'}

Your task:
Review the conversation history, then guide the user to design the next part of the game or complete it.
You MUST respond with a JSON object matching this schema:
{
  "agentResponse": "Your helpful response to the user chat",
  "choices": ["Option 1", "Option 2", "Option 3"],
  "specs": {
    "name": "Game Name (update if decided)",
    "mechanic": "Core Mechanic (update if decided)",
    "theme": "Visual Theme (update if decided)",
    "goal": "Main Goal (update if decided)"
  },
  "isCompleted": false
}`;

  const promptText = `Instructions:\n${systemPrompt}\n\nUser:\n${userInput}\n\nAssistant Response (JSON ONLY):`;
  try {
    const rawResult = await agentBrain.callLLM(promptText);
    const data = typeof rawResult === 'string' ? JSON.parse(rawResult) : rawResult;
    return {
      agentResponse: data.agentResponse,
      choices: data.choices || [],
      nextStep: data.isCompleted ? 4 : plannerStep + 1,
      isCompleted: !!data.isCompleted,
      specs: data.specs
    };
  } catch (err) {
    return {
      agentResponse: "Failed to query AI model. Saved design locally.",
      choices: ["Continue", "Retry", "Exit"],
      nextStep: plannerStep,
      isCompleted: false
    };
  }
}

module.exports = {
  callPlannerAI
};
