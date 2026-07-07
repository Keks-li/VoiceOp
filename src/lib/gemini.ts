import { GoogleGenAI } from '@google/genai';
import { Course, ParsedVoiceCommand } from '../types';

/**
 * Returns the Gemini API Key from the environment variable.
 */
function getApiKey(): string {
  const metaEnv = typeof import.meta !== 'undefined' && (import.meta as any).env ? (import.meta as any).env : {};
  const procEnv = typeof process !== 'undefined' && process.env ? process.env : {};
  return procEnv.GEMINI_API_KEY || procEnv.VITE_GEMINI_API_KEY || metaEnv.GEMINI_API_KEY || metaEnv.VITE_GEMINI_API_KEY || '';
}

/**
 * Initializes and returns a GoogleGenAI client using the environment API key.
 */
function getGeminiClient(): GoogleGenAI {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('Gemini API key is not configured. Please set GEMINI_API_KEY in your environment.');
  }
  return new GoogleGenAI({ apiKey });
}


/**
 * Generate a 4-week course syllabus based on a topic using Gemini
 */
export async function generateAICourse(topic: string): Promise<Course> {
  const ai = getGeminiClient();
  
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
export async function simplifyWeekContent(content: string): Promise<string> {
  const ai = getGeminiClient();
  
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
  instructorName: string
): Promise<string> {
  const ai = getGeminiClient();

  // Map history to the format expected by the Gemini chat API
  const historyText = chatHistory
    .map((msg) => `${msg.sender === 'user' ? 'Student' : (instructorName || 'Instructor')}: ${msg.text}`)
    .join('\n');

  const prompt = `You are roleplaying as the actual course instructor: "${instructorName || 'the teacher'}". You are a warm, encouraging, and clear online class teacher.
  You are answering questions for a student in your class: "${courseTitle}".
  Adopt the persona, name, and authority of "${instructorName || 'the teacher'}" (never refer to yourself as an "AI study buddy" or "Gemini Assistant").
  Here is the text for the current week's lesson that the student is studying:
  ---
  ${weekContent}
  ---

  Conversation History:
  ${historyText}

  New Student Question:
  "${question}"

  Instructions for you:
  - Respond directly, warmly, and helpfully as their teacher.
  - Explain the concepts using simple examples.
  - Keep your explanation concise (under 120 words) so it's easy for the student to read or listen to.
  - Answer the question accurately based on the lesson or general knowledge if the question expands slightly.
  - Act like their actual live instructor.`;

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




/**
 * Parses a voice transcript into a structured navigation or accessibility command using Gemini.
 */
function getXaiApiKey(): string {
  const metaEnv = typeof import.meta !== 'undefined' && (import.meta as any).env ? (import.meta as any).env : {};
  const procEnv = typeof process !== 'undefined' && process.env ? process.env : {};
  return procEnv.XAI_API_KEY || procEnv.VITE_XAI_API_KEY || metaEnv.XAI_API_KEY || metaEnv.VITE_XAI_API_KEY || '';
}

/**
 * Parses a voice transcript into a structured navigation or accessibility command.
 * Connects to Grok AI if the API key is set; otherwise falls back to Gemini.
 */
export async function parseVoiceCommand(transcript: string): Promise<ParsedVoiceCommand> {
  const xaiKey = getXaiApiKey();

  const prompt = `You are a voice command intent classifier for the VoiceOp e-learning platform.
  Analyze the spoken speech input and map it to the correct command using semantic reasoning. Speech recognition transcripts can have spelling errors, homophones (e.g. "be" instead of "B", "one" instead of "1"), or informal phrasings. Map them intelligently!

  Here is the list of available commands and instructions:
  - "navigation:list": Go to "My Courses", syllabus list, or home. (e.g., "list courses", "go home", "my classes", "show classes", "courses list")
  - "navigation:create": Go to syllabus creation page. (e.g., "create new course", "add syllabus", "new course outline", "make a syllabus")
  - "navigation:assignments": Go to assignments workspace. (e.g., "show assignments", "my tasks", "view assignments", "open homework")
  - "navigation:students": Go to student roster/enrollments panel. (e.g., "show students", "roster list", "student list", "enrollment requests", "view class roster")
  - "navigation:catalog": Go to the course catalog. (e.g., "browse catalog", "course catalog", "search all courses", "open library")
  - "course:select": Open/select a course. Extract the title into 'courseTitle'. (e.g., "open modern javascript", "select the python class", "enter chemistry course", "go to advanced ai class")
  - "course:simplify": Simplify syllabus/module lesson text. (e.g., "make this simple", "summarize content", "simplify lesson", "easier explanation", "shorten week content")
  - "course:speak": Read syllabus lesson text out loud. (e.g., "read week content", "speak lesson text", "read aloud", "read page to me", "play audio summary")
  - "course:create_ai": Auto-create a course outline using AI. Extract topic into 'topic'. (e.g., "create a course on astrophysics", "make outline for global history", "generate syllabus about node js")
  - "accessibility:font_larger": Increase text/font scale. (e.g., "make text bigger", "increase font size", "larger letters", "zoom in text")
  - "accessibility:font_smaller": Decrease text/font scale. (e.g., "smaller font", "make text smaller", "shrink letters", "decrease font size")
  - "accessibility:theme_dark": Enable dark theme. (e.g., "dark mode", "enable black background", "switch to dark theme", "night mode")
  - "accessibility:theme_light": Enable light theme. (e.g., "light mode", "white theme", "normal background", "day mode")
  - "quiz:select": Select answer option for a quiz question. Extract 'questionNumber' as integer (e.g. 1) and 'optionLetter' as uppercase string (e.g. "A"). Resolve "B" from "be/bee", "A" from "ay/eh", "C" from "see/sea", "D" from "dee", "1" from "one/won", "2" from "two/too/to", "3" from "three/tree", etc. (e.g., "select option A for question 1", "answer option B for question number 2", "choose C for number 3", "select option D for question 1")
  - "quiz:submit": Submit test/quiz. (e.g., "submit my answers", "finish test", "submit test responses", "submit quiz")
  - "assignment:submit": Save and submit draft response for the active assignment. (e.g., "submit my homework", "send assignment response", "submit assignment work")
  - "unknown": User statement does not represent any command. (e.g., general conversation, hello, questions about syllabus content, text inputs)

  EXAMPLES:
  1. Input: "make the letters bigger please"
     Output: {"command": "accessibility:font_larger"}
  2. Input: "switch to dark theme"
     Output: {"command": "accessibility:theme_dark"}
  3. Input: "i want to select option be for question number two"
     Output: {"command": "quiz:select", "params": {"questionNumber": 2, "optionLetter": "B"}}
  4. Input: "answer see for question three"
     Output: {"command": "quiz:select", "params": {"questionNumber": 3, "optionLetter": "C"}}
  5. Input: "generate course outline for organic chemistry"
     Output: {"command": "course:create_ai", "params": {"topic": "organic chemistry"}}
  6. Input: "select the course called modern javascript"
     Output: {"command": "course:select", "params": {"courseTitle": "modern javascript"}}
  7. Input: "read this week's lesson text"
     Output: {"command": "course:speak"}
  8. Input: "finish my quiz answers"
     Output: {"command": "quiz:submit"}

  User Speech: "${transcript}"

  Return ONLY a valid JSON object matching the schema below. Do NOT wrap the JSON in markdown code blocks like \`\`\`json.
  {
    "command": "navigation:list" | "navigation:create" | "navigation:assignments" | "navigation:students" | "navigation:catalog" | "course:select" | "course:simplify" | "course:speak" | "course:create_ai" | "accessibility:font_larger" | "accessibility:font_smaller" | "accessibility:theme_dark" | "accessibility:theme_light" | "quiz:select" | "quiz:submit" | "assignment:submit" | "unknown",
    "params": {
      "courseTitle": "optional extracted course title",
      "topic": "optional extracted course generation topic",
      "questionNumber": "optional extracted quiz question number as an integer",
      "optionLetter": "optional extracted option letter like 'A', 'B', 'C', 'D' as a string"
    }
  }`;

  const providers = [];
  if (xaiKey) {
    providers.push('grok');
  }
  providers.push('gemini');

  let lastError: any = null;

  for (const provider of providers) {
    try {
      if (provider === 'grok') {
        console.log('Parsing voice command using Grok AI...');
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2500);

        const response = await fetch('https://api.x.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${xaiKey}`,
          },
          body: JSON.stringify({
            messages: [
              {
                role: 'system',
                content: 'You are a precise voice command parser for an e-learning platform. Return JSON strictly matching the requested format.',
              },
              {
                role: 'user',
                content: prompt,
              },
            ],
            model: 'grok-beta',
            temperature: 0,
            stream: false,
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          const result = await response.json();
          const text = result.choices?.[0]?.message?.content?.trim() || '{}';
          const cleanText = text.replace(/^```json\s*/i, '').replace(/```$/, '');
          return JSON.parse(cleanText) as ParsedVoiceCommand;
        } else {
          const errText = await response.text();
          throw new Error(`Grok status ${response.status}: ${errText}`);
        }
      } else if (provider === 'gemini') {
        console.log('Parsing voice command using Gemini...');
        const ai = getGeminiClient();
        
        const geminiCall = ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          },
        });

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Gemini API Timeout')), 2500)
        );

        const response = await Promise.race([geminiCall, timeoutPromise]) as any;
        const text = response.text?.trim() || '{}';
        const cleanText = text.replace(/^```json\s*/i, '').replace(/```$/, '');
        return JSON.parse(cleanText) as ParsedVoiceCommand;
      }
    } catch (err: any) {
      console.warn(`Voice parser provider "${provider}" failed:`, err.message || err);
      lastError = err;
    }
  }

  throw lastError || new Error('All voice parsing providers failed');
}

