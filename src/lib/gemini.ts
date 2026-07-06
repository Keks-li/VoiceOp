import { GoogleGenAI } from '@google/genai';
import { Course } from '../types';

/**
 * Resolves the Gemini API Key from multiple sources:
 * 1. Provided parameter
 * 2. Environment variable (VITE_GEMINI_API_KEY)
 * 3. LocalStorage fallback
 */
export function getApiKey(): string {
  // Try Vite environment variable first
  const envKey = (import.meta as any).env.VITE_GEMINI_API_KEY;
  if (envKey && envKey !== 'MY_GEMINI_API_KEY') {
    return envKey;
  }
  
  // Try localStorage fallback
  const localKey = localStorage.getItem('voiceop_gemini_api_key');
  if (localKey) {
    return localKey;
  }

  return '';
}

/**
 * Initializes and returns a GoogleGenAI client
 */
export function getGeminiClient(customApiKey?: string): GoogleGenAI {
  const apiKey = customApiKey || getApiKey();
  if (!apiKey) {
    throw new Error('Gemini API key is missing. Please add your key in the Accessibility Settings panel.');
  }
  return new GoogleGenAI({ apiKey });
}

/**
 * Generate a 4-week course syllabus based on a topic using Gemini
 */
export async function generateAICourse(topic: string, customApiKey?: string): Promise<Course> {
  const ai = getGeminiClient(customApiKey);
  
  const prompt = `You are an expert curriculum developer. Generate a comprehensive 4-week e-learning course syllabus on the topic: "${topic}".
  The course outline must include a main title, course description, and details for each of the 4 weeks.
  Each week must contain:
  1. A title.
  2. Educational content explaining the week's concepts in detail (about 200-300 words, rich with facts and clear explanations).
  3. A quiz containing 3 multiple-choice questions based on the week's material, complete with options and a 0-indexed correct answer index.

  Return ONLY a valid JSON object matching the following structure. Do not include markdown code block formatting (like \`\`\`json) or any intro/outro text.
  
  {
    "title": "Course Title",
    "description": "A high-level course overview description.",
    "weeks": [
      {
        "weekNumber": 1,
        "title": "Week 1 Title",
        "content": "Full week 1 content text here...",
        "quiz": [
          {
            "question": "A conceptual question about Week 1 content?",
            "options": ["Option A", "Option B", "Option C", "Option D"],
            "correctAnswerIndex": 0
          }
        ]
      }
    ]
  }`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      }
    });

    const responseText = response.text || '';
    // Strip markdown formatting if the model still outputs it despite prompts
    const jsonString = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(jsonString);

    // Map output to match the Course type
    return {
      id: `ai_${Date.now()}`,
      title: parsed.title || `${topic} Course`,
      instructorName: 'Gemini AI Assistant',
      description: parsed.description || `An AI generated course about ${topic}`,
      weeks: (parsed.weeks || []).map((w: any, index: number) => ({
        id: `week_${Date.now()}_${index}`,
        weekNumber: w.weekNumber || index + 1,
        title: w.title || `Week ${index + 1}`,
        content: w.content || '',
        quiz: w.quiz || []
      }))
    };
  } catch (error: any) {
    console.error('Error generating AI course:', error);
    throw new Error(error.message || 'Failed to generate course. Please verify your Gemini API key and network connection.');
  }
}

/**
 * Simplifies a paragraph of educational content using Gemini
 */
export async function simplifyWeekContent(content: string, customApiKey?: string): Promise<string> {
  const ai = getGeminiClient(customApiKey);
  
  const prompt = `You are a helpful and expert learning accessibility assistant. 
  Rewrite the following course material to make it extremely simple, easy to read, and clear for beginners.
  Use short sentences, clear headings, and structured bullet points to summarize the key takeaways.
  Keep it engaging, educational, and direct. Keep the formatting as clean markdown.
  
  Original Content:
  ---
  ${content}
  ---`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || 'Unable to simplify content.';
  } catch (error: any) {
    console.error('Error simplifying content:', error);
    throw new Error(error.message || 'Failed to simplify content.');
  }
}

/**
 * Interacts with the AI Study Buddy Chatbot using Gemini
 */
export async function chatWithStudyBuddy(
  courseTitle: string,
  weekContent: string,
  question: string,
  chatHistory: { sender: 'user' | 'assistant'; text: string }[],
  customApiKey?: string
): Promise<string> {
  const ai = getGeminiClient(customApiKey);

  // Map history to the format expected by the Gemini chat API
  // or construct a conversational prompt block
  const historyText = chatHistory
    .map((msg) => `${msg.sender === 'user' ? 'Student' : 'Study Buddy'}: ${msg.text}`)
    .join('\n');

  const prompt = `You are the "AI Study Buddy" - a warm, encouraging, and clear AI tutor for an online class.
  You are helping a student understand the course: "${courseTitle}".
  Here is the text for the current week's lesson that the student is studying:
  ---
  ${weekContent}
  ---

  Conversation History:
  ${historyText}

  New Student Question:
  "${question}"

  Instructions for Study Buddy:
  - Respond directly, warmly, and helpfully.
  - Explain the concepts using simple examples.
  - Keep your explanation concise (under 120 words) so it's easy for the student to read or listen to.
  - Answer the question accurately based on the lesson or general knowledge if the question expands slightly.
  - Do not mention that you have context or are looking at text unless appropriate. Act like a live tutor.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || 'I am sorry, I could not answer that. Can you try again?';
  } catch (error: any) {
    console.error('Error in study buddy chat:', error);
    throw new Error(error.message || 'Failed to get answer from study buddy.');
  }
}
