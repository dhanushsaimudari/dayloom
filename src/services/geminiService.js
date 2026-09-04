import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY || '';

let aiClient = null;
if (apiKey && apiKey !== 'mock_key_for_dev') {
  try {
    aiClient = new GoogleGenAI({ apiKey });
  } catch (err) {
    console.warn('[GeminiService] Failed to initialize GoogleGenAI client:', err.message);
  }
}

const PRIMARY_MODEL_CANDIDATES = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-3.5-flash'];

/**
 * System Instruction for Reflectra AI companion
 */
const DEFAULT_SYSTEM_INSTRUCTION = `
You are Reflectra, an attentive, empathetic, warm, grounded, and private personal growth AI companion for Dayloom.
Tagline: "Your days are threads. Your life is the pattern."

CORE ACTIVE LISTENER & EMPATHY GUIDELINES:
1. BE AN ACTIVE LISTENER: Pay close attention to EVERY specific experience, detail, frustration, achievement, or feeling the user shares (such as specific exams they took, university/work events, bank or money hurdles, movies/shows they enjoyed, social interactions, and their overall mood).
2. VALIDATE & CONNECT: Validate their emotions with genuine warmth and empathy. Acknowledge the relief of finishing a big task, the stress of unexpected glitches (like banking or reimbursement delays), and the simple joys (like comforting movies).
3. GROUNDED & FACTUAL: Never invent facts or assume details the user didn't mention. Distinctly separate observed facts from gentle reflections.
4. THOUGHTFUL & CONVERSATIONAL: Respond naturally and conversationally in 2-3 engaging paragraphs. Ask a thoughtful, open-ended question to help them reflect deeper on how they're unwinding or what they need right now.
5. NO ROBOTIC SHORT CUTOFFS: Avoid generic one-liners or cold robotic responses. Make the user feel truly heard, understood, and supported.
6. Respond in the user's preferred language.
`.trim();

/**
 * Generates an empathetic, grounded active listening response acknowledging specific user words
 */
function generateGroundedReflection(prompt, previousMessages = []) {
  const text = prompt.toLowerCase();

  // Name introduction check (strict match to avoid verbs like 'having', 'doing')
  const nameMatch = prompt.match(/(?:my name is|call me)\s+([a-zA-Z]+)/i);
  if (nameMatch && nameMatch[1]) {
    const name = nameMatch[1].charAt(0).toUpperCase() + nameMatch[1].slice(1);
    return `It's really good to meet you, ${name}. I'll remember to call you that. I'm right here with you—tell me, how has your day been treating you so far?`;
  }

  // Sadness / Loss / Stress / Money
  if (text.includes('lost') && (text.includes('money') || text.includes('wallet') || text.includes('card') || text.includes('cash'))) {
    return `I'm so sorry that happened. Losing money is deeply stressful and frustrating, and it makes complete sense that you're feeling down about it right now. Take a deep breath—it's okay to feel upset. Are you somewhere safe right now?`;
  }

  if (text.includes('sad') || text.includes('upset') || text.includes('crying') || text.includes('hurt') || text.includes('depressed') || text.includes('down')) {
    return `I hear how heavy things feel right now. It's completely valid to feel sad, and you don't have to carry it all alone. I'm right here listening. Would it help to let out a bit more of what's on your mind?`;
  }

  // First journal / don't know what to write
  if (text.includes('first journal') || text.includes("don't know what to write") || text.includes('dont know what') || text.includes('how to start')) {
    return `Welcome to your journaling journey! There's no right or wrong way to write in Dayloom. You can share a single moment from today, a thought you've been sitting with, or simply how your body and mind feel right now. What's one thing that caught your attention today?`;
  }

  // Exams / University / Work
  if (text.includes('exam') || text.includes('test') || text.includes('study') || text.includes('college') || text.includes('work') || text.includes('deadline')) {
    return `I hear you on that. Going through exams, work, and deadlines takes a lot of mental energy. How are you feeling now that you've got a moment to breathe?`;
  }

  // Joy / Happy / Grateful / Accomplishment
  if (text.includes('happy') || text.includes('excited') || text.includes('great') || text.includes('grateful') || text.includes('proud') || text.includes('won') || text.includes('passed')) {
    return `That is wonderful to hear! Celebrate those positive moments—they bring so much light to your journey. What part of that experience made you feel the happiest?`;
  }

  // Dynamic context reflection
  const words = prompt.trim().split(/\s+/).slice(0, 8).join(' ');
  return `I hear you when you say "${words}...". Thank you for trusting Dayloom with your thoughts. How are you feeling right now as you reflect on this?`;
}

/**
 * Multi-turn Conversational Reflection Turn with Reflectra
 */
export async function chatTurn({ prompt, previousMessages = [], userContext = {} }) {
  const dynamicFallback = generateGroundedReflection(prompt, previousMessages);

  if (!aiClient) {
    return {
      text: dynamicFallback,
      replyText: dynamicFallback,
      interactionId: `mock-session-${Date.now()}`
    };
  }

  try {
    // Construct multi-turn contents ensuring the first turn is ALWAYS 'user' and roles alternate
    const contents = [];

    for (const msg of previousMessages) {
      if (!msg.text || !msg.text.trim()) continue;

      const role = msg.role === 'user' ? 'user' : 'model';

      // Gemini requires the first history turn to have role 'user'
      if (contents.length === 0 && role !== 'user') {
        continue;
      }

      // Ensure alternating roles
      if (contents.length > 0 && contents[contents.length - 1].role === role) {
        contents[contents.length - 1].parts[0].text += `\n${msg.text}`;
      } else {
        contents.push({
          role,
          parts: [{ text: msg.text }]
        });
      }
    }

    // Add user context snippet
    let contextHeader = '';
    if (userContext.mood) contextHeader += `[User Mood Context: ${userContext.mood}] `;
    if (userContext.language) contextHeader += `[User Language: ${userContext.language}] `;

    const userTurnText = `${contextHeader ? contextHeader + '\n' : ''}${prompt}`;

    if (contents.length > 0 && contents[contents.length - 1].role === 'user') {
      contents[contents.length - 1].parts[0].text += `\n${userTurnText}`;
    } else {
      contents.push({
        role: 'user',
        parts: [{ text: userTurnText }]
      });
    }

    let response;
    let lastErr = null;

    for (const model of PRIMARY_MODEL_CANDIDATES) {
      try {
        response = await aiClient.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction: DEFAULT_SYSTEM_INSTRUCTION,
            temperature: 0.7,
            maxOutputTokens: 1000,
            store: false
          }
        });
        if (response && response.text) break;
      } catch (mErr) {
        lastErr = mErr;
        console.warn(`[GeminiService] Model ${model} try failed, trying fallback:`, mErr.message);
      }
    }

    const outputText = response?.text ? response.text.trim() : dynamicFallback;
    
    return {
      text: outputText,
      replyText: outputText,
      interactionId: `gemini-turn-${Date.now()}`
    };
  } catch (error) {
    console.error('[GeminiService] chatTurn error:', error);
    return {
      text: dynamicFallback,
      replyText: dynamicFallback,
      interactionId: `error-fallback-${Date.now()}`
    };
  }
}

/**
 * Audio Transcription (Voice Reflection)
 */
export async function transcribeAudio({ audioBuffer, mimeType = 'audio/webm' }) {
  if (!aiClient) {
    return { text: "[Voice Recording Demo Transcription]: Focused on my key habits and completed my daily work." };
  }

  try {
    const base64Data = audioBuffer.toString('base64');
    let response;
    for (const model of PRIMARY_MODEL_CANDIDATES) {
      try {
        response = await aiClient.models.generateContent({
          model,
          contents: [
            {
              role: 'user',
              parts: [
                {
                  inlineData: {
                    data: base64Data,
                    mimeType
                  }
                },
                {
                  text: "Please transcribe this spoken journal reflection accurately into text. Return only the transcription text."
                }
              ]
            }
          ],
          config: {
            store: false
          }
        });
        if (response && response.text) break;
      } catch (err) {
        console.warn(`[GeminiService] Transcribe with ${model} failed, trying next:`, err.message);
      }
    }

    const outputText = response?.text ? response.text.trim() : "";
    return { text: outputText };
  } catch (error) {
    console.error('[GeminiService] transcribeAudio error:', error);
    return { text: "" };
  }
}

/**
 * Memento Photo Memory Captioning & Reflection
 */
export async function captionImageMemory({ imageBuffer, mimeType = 'image/jpeg', userPrompt = '' }) {
  if (!aiClient) {
    const defaultText = "A meaningful Memento memory photo attached to today's journal.";
    return { text: defaultText, reflectionText: defaultText };
  }

  try {
    const base64Data = imageBuffer.toString('base64');
    const promptText = userPrompt 
      ? `User note for this Memento photo: "${userPrompt}". Describe this photo briefly and offer a warm 1-sentence reflection.`
      : "Describe this Memento photo briefly and offer a warm 1-sentence reflection for the user's daily journal.";

    let response;
    for (const model of PRIMARY_MODEL_CANDIDATES) {
      try {
        response = await aiClient.models.generateContent({
          model,
          contents: [
            {
              role: 'user',
              parts: [
                {
                  inlineData: {
                    data: base64Data,
                    mimeType
                  }
                },
                { text: promptText }
              ]
            }
          ],
          config: {
            systemInstruction: DEFAULT_SYSTEM_INSTRUCTION,
            store: false
          }
        });
        if (response && response.text) break;
      } catch (err) {
        console.warn(`[GeminiService] Caption with ${model} failed, trying next:`, err.message);
      }
    }

    const outputText = response?.text ? response.text.trim() : "Memento photo captured.";
    return { text: outputText, reflectionText: outputText };
  } catch (error) {
    console.error('[GeminiService] captionImageMemory error:', error);
    return { text: "Memento photo attached to journal.", reflectionText: "Memento photo attached to journal." };
  }
}

/**
 * Grounded Monthly AI Narrative Generation using Deterministic Backend Stats
 */
export async function generateMonthlyReportNarrative({ statsData, userLanguage = 'en' }) {
  const prompt = `
Generate a warm, encouraging month-end personal growth summary based ONLY on these aggregated deterministic metrics.

DETERMINISTIC AGGREGATED METRICS:
- Month: ${statsData.monthId}
- Total Journal Entries: ${statsData.entryCount} (vs ${statsData.previousMonthCount} last month, Change: ${statsData.monthOverMonthChange}%)
- Journaling Consistency: ${statsData.consistencyPercent}% of month
- Average Mood Score (-1.0 to +1.0): ${statsData.avgMoodScore}
- Weekday vs Weekend Split: ${statsData.weekdayVsWeekend.weekdayCount} weekdays vs ${statsData.weekdayVsWeekend.weekendCount} weekend days
- Time-of-Day Pattern: ${JSON.stringify(statsData.timeOfDayPattern)}
- Habit Growth Comparison: ${JSON.stringify(statsData.habitComparison)}

CRITICAL INSTRUCTIONS:
1. Clearly distinguish OBSERVED DATA from INTERPRETATION.
2. Base all statements strictly on the provided numbers. Do NOT invent unmentioned habits, life events, or causes.
3. Language: ${userLanguage}
4. Return a JSON object with keys:
   - summaryText: (string, 2-3 encouraging paragraphs summarizing consistency, rhythm, and habit patterns)
   - positiveHighlights: (array of strings, 2-3 key achievements grounded in numbers)
   - areasForGrowth: (array of strings, 1-2 gentle non-judgmental suggestions)
`.trim();

  if (!aiClient) {
    return {
      summaryText: `In ${statsData.monthId}, you logged ${statsData.entryCount} journal days (${statsData.consistencyPercent}% consistency). Your reflection patterns show steady commitment to your routines.`,
      positiveHighlights: [
        `Logged ${statsData.entryCount} reflections (${statsData.monthOverMonthChange >= 0 ? '+' : ''}${statsData.monthOverMonthChange}% vs previous month)`,
        `Maintained routine habit tracking`
      ],
      areasForGrowth: [
        `Consider setting a gentle reminder for weekend days to capture full-week momentum`
      ]
    };
  }

  try {
    let response;
    for (const model of PRIMARY_MODEL_CANDIDATES) {
      try {
        const apiCall = aiClient.models.generateContent({
          model,
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: {
            temperature: 0.4,
            responseMimeType: 'application/json',
            store: false
          }
        });

        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Narrative timeout')), 7000)
        );

        response = await Promise.race([apiCall, timeoutPromise]);
        if (response && response.text) break;
      } catch (err) {
        console.warn(`[GeminiService] Monthly narrative with ${model} failed, trying next:`, err.message);
      }
    }

    let parsed = null;
    if (response && response.text) {
      try {
        parsed = JSON.parse(response.text);
      } catch (e) {
        console.warn('[GeminiService] Failed to parse narrative JSON:', e.message);
      }
    }

    return parsed || {
      summaryText: `In ${statsData.monthId}, you completed ${statsData.entryCount} reflections. Keep building your daily momentum!`,
      positiveHighlights: [`Recorded ${statsData.entryCount} total entries`],
      areasForGrowth: [`Continue tracking habits daily`]
    };
  } catch (error) {
    console.error('[GeminiService] generateMonthlyReportNarrative error:', error);
    return {
      summaryText: `In ${statsData.monthId}, you completed ${statsData.entryCount} reflections. Keep building your daily momentum!`,
      positiveHighlights: [`Recorded ${statsData.entryCount} total entries`],
      areasForGrowth: [`Continue tracking habits daily`]
    };
  }
}

/**
 * Synthesize Reflectra Chat Session into a clean First-Person Daily Journal Reflection Note
 */
export async function summarizeReflectraSession({ messages = [], userContext = {} }) {
  if (!messages.length) {
    return { summary: "Personal reflection session with Reflectra." };
  }

  const userMessages = messages.filter(m => m.role === 'user' && m.text && m.text.trim());
  if (!userMessages.length) {
    return { summary: "Personal reflection check-in." };
  }

  const rawUserText = userMessages.map(m => m.text).join('\n\n');

  if (!aiClient) {
    return { summary: rawUserText, text: rawUserText };
  }

  try {
    const transcript = messages
      .filter(m => m.text && m.text.trim())
      .map(m => `${m.role === 'user' ? 'Me' : 'Reflectra'}: ${m.text.trim()}`)
      .join('\n');

    const prompt = `
Synthesize everything the user shared in the reflection conversation below into a rich, cohesive first-person journal entry (written from the user's perspective: "Today...", "I...", "My day...").

CONVERSATION TRANSCRIPT:
${transcript}

RULES:
1. PRESERVE ALL DETAILS: Include all specific activities, movies/shows (like Bahubali), events, training, food, emotions, and thoughts mentioned by the user.
2. FIRST-PERSON VOICE ONLY: Write entirely as the user's diary entry ("Today I...", "Afterwards, I...").
3. DO NOT include headers, dialogue, or "Reflectra said". Output ONLY the synthesized journal entry (1 to 3 rich paragraphs).
4. Language: ${userContext.language || 'en'}.
`.trim();

    let response;
    for (const model of PRIMARY_MODEL_CANDIDATES) {
      try {
        // Run with a 6-second timeout race to ensure zero UI freezing
        const apiCall = aiClient.models.generateContent({
          model,
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: {
            temperature: 0.4,
            maxOutputTokens: 800,
            store: false
          }
        });

        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Synthesis timeout')), 7000)
        );

        response = await Promise.race([apiCall, timeoutPromise]);
        if (response && response.text) break;
      } catch (e) {
        console.warn(`[GeminiService] Model ${model} failed for summarize, trying next:`, e.message);
      }
    }

    const summaryText = response?.text ? response.text.trim() : rawUserText;
    return { summary: summaryText, text: summaryText };
  } catch (error) {
    console.error('[GeminiService] summarizeReflectraSession error:', error);
    return { summary: rawUserText, text: rawUserText };
  }
}

