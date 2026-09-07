/**
 * BRAID Self-Improvement Loop Flow Generator
 */

async function runBraidSelfImprovementLoop(brain, conversationText) {
  const braidPrompt = `BRAID Generation Prompt
You are an expert at generating clear, structured Mermaid flowcharts to plan responses in multi-turn conversations.
Task:
• Read the entire conversation history.
• Extract constraints, user-provided facts, references (including version references), and goals.
• Produce a flowchart plan that guides producing the best final assistant reply to the last user turn.
• Do NOT include the response itself—only the plan.
• Start exactly with 'flowchart TD;'
Conversation:
${conversationText}
Output Requirements:
1. Output ONLY Mermaid code, no extra text/markdown.
2. Start exactly with 'flowchart TD;'
3. Each node should represent constraints, facts, or steps to produce the final reply.
4. End nodes should indicate checks against constraints or rubric-related requirements (if implied).`;

  let response = await brain.callLLM(braidPrompt);

  const improvementPrompt = `Here is the initial flowchart plan generated:
${response}

Review this plan against all constraints and facts in the conversation:
${conversationText}

Please perform one iteration of self-improvement to optimize and correct any inaccuracies, ensuring it strictly follows:
1. Output ONLY Mermaid code, no extra text/markdown.
2. Start exactly with 'flowchart TD;'
3. End nodes check all constraints.
Output the improved flowchart plan now:`;

  const improvedResponse = await brain.callLLM(improvementPrompt);
  return improvedResponse;
}

module.exports = {
  runBraidSelfImprovementLoop
};
