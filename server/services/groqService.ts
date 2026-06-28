import fetch from "node-fetch";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_BASE_URL = "https://api.groq.com/openai/v1";

if (!GROQ_API_KEY) {
  console.warn("⚠️  GROQ_API_KEY not set - AI features will be mocked");
}

interface GroqMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

async function callGroqAPI(messages: GroqMessage[], model: string = "llama-3.1-70b-versatile") {
  if (!GROQ_API_KEY) {
    return null;
  }

  try {
    const response = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status}`);
    }

    const data = (await response.json()) as any;
    return data.choices?.[0]?.message?.content || null;
  } catch (error) {
    console.error("Error calling Groq API:", error);
    return null;
  }
}

export async function generateMeetingSummary(transcript: string): Promise<{
  summary: string;
  keyPoints: string[];
  actionItems: string[];
  decisions: string[];
} | null> {
  const messages: GroqMessage[] = [
    {
      role: "system",
      content: `You are a professional meeting assistant. Analyze the meeting transcript and provide:
1. A concise summary (2-3 sentences)
2. Key discussion points (3-5 bullet points)
3. Action items with owner suggestions (2-4 items)
4. Decisions made (2-3 items)

Format your response as JSON with keys: summary, keyPoints (array), actionItems (array), decisions (array)`,
    },
    {
      role: "user",
      content: `Please analyze this meeting transcript and provide a summary, key points, action items, and decisions:\n\n${transcript}`,
    },
  ];

  const response = await callGroqAPI(messages);

  if (!response) {
    return null;
  }

  try {
    // Extract JSON from response (it might be wrapped in markdown code blocks)
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : response;
    const parsed = JSON.parse(jsonStr);

    return {
      summary: parsed.summary || "",
      keyPoints: parsed.keyPoints || [],
      actionItems: parsed.actionItems || [],
      decisions: parsed.decisions || [],
    };
  } catch {
    console.error("Failed to parse Groq response:", response);
    return null;
  }
}

export async function answerMeetingQuestion(
  transcript: string,
  question: string
): Promise<string | null> {
  const messages: GroqMessage[] = [
    {
      role: "system",
      content: `You are a helpful meeting assistant. Answer questions about the provided meeting transcript. 
Only use information from the transcript. If the information is not in the transcript, say so clearly.
Keep your answer concise and relevant.`,
    },
    {
      role: "user",
      content: `Meeting transcript:\n\n${transcript}\n\nQuestion: ${question}`,
    },
  ];

  return await callGroqAPI(messages);
}

export async function extractKeyTopics(transcript: string): Promise<string[] | null> {
  const messages: GroqMessage[] = [
    {
      role: "system",
      content:
        "Extract the main topics discussed in this meeting transcript. Return as a JSON array of strings. Only return the JSON array, no other text.",
    },
    {
      role: "user",
      content: `Transcript:\n\n${transcript}`,
    },
  ];

  const response = await callGroqAPI(messages);

  if (!response) {
    return null;
  }

  try {
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    const jsonStr = jsonMatch ? jsonMatch[0] : response;
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

export function isMocked(): boolean {
  return !GROQ_API_KEY;
}
