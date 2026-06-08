import axios from 'axios';

export async function getAIResponse(prompt: string) {
  try {
    const response = await axios.post(process.env.OLLAMA_URL || 'http://localhost:11434/api/generate', {
      model: "deepseek-coder",
      prompt: prompt,
      stream: false
    }, { timeout: 3000 }); // Fast fail in 3s so test doesn't timeout
    return response.data.response;
  } catch (error: any) {
    console.log(`[AI Helper] Failed to reach Ollama: ${error.message}`);
    return "AI suggestion unavailable";
  }
}
