import { getAIResponse } from './ollama_api_connector';

export async function selfHeal(error: any, requestBody: any) {
  // Gracefully bypass if AI self-healing is not explicitly enabled in .env
  if (process.env.ENABLE_AI_HEALING !== 'true') {
    return;
  }

  const prompt = `
  API Test Failed.
  Error: ${error}
  Request: ${JSON.stringify(requestBody)}
  Suggest fix.
  `;

  const fix = await getAIResponse(prompt);
  console.log("AI Suggestion:", fix);
}
