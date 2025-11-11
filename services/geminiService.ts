
import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { SYSTEM_PROMPT, QUERY_OPTIMIZER_PROMPT } from '../constants';
import type { ChatbotResponse, SearchResult } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

export const getOptimizedQuery = async (userQuery: string): Promise<string> => {
  const prompt = QUERY_OPTIMIZER_PROMPT.replace('{USER_QUESTION}', userQuery);
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    return response.text.trim();
  } catch (error) {
    console.error("Error optimizing query:", error);
    // Fallback to the original query if optimization fails
    return userQuery;
  }
};

const buildPrompt = (originalQuery: string, optimizedQuery: string, context: SearchResult[]): string => {
  const contextString = context
    .map(result => `Document ${result.document.id} (Similarity: ${result.similarity.toFixed(4)}):\n${result.document.content}`)
    .join('\n\n---\n\n');
  
  const topSimilarity = context.length > 0 ? context[0].similarity.toFixed(4) : "N/A";

  return `
Original User Question: "${originalQuery}"
Optimized Search Query: "${optimizedQuery}"
Top Document Similarity Score: ${topSimilarity}

Context:
${contextString}
  `;
};

export const getLLMResponse = async (originalQuery: string, optimizedQuery: string, context: SearchResult[]): Promise<ChatbotResponse | null> => {
  const prompt = buildPrompt(originalQuery, optimizedQuery, context);

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            decision: { type: Type.STRING, enum: ["answerable", "not_answerable"] },
            similarity_top: { type: Type.NUMBER },
            used_context_ids: {
              type: Type.ARRAY,
              items: {
                type: Type.STRING,
              },
            },
            answer_korean: { type: Type.STRING },
            notes: { type: Type.STRING },
          },
          required: ["decision", "similarity_top", "used_context_ids", "answer_korean", "notes"]
        },
      },
    });

    const text = response.text;
    const parsedJson = JSON.parse(text) as ChatbotResponse;
    parsedJson.optimized_query = optimizedQuery; // Add optimized query to the final response object

    return parsedJson;

  } catch (error) {
    console.error("Error generating content from Gemini:", error);
    return {
      decision: "not_answerable",
      similarity_top: context.length > 0 ? context[0].similarity : 0,
      used_context_ids: [],
      answer_korean: "AI 응답을 처리하는 중 오류가 발생했습니다. 다시 시도해 주세요.",
      notes: error instanceof Error ? error.message : "An unknown error occurred.",
      optimized_query: optimizedQuery
    };
  }
};