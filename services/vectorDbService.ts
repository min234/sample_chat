

import { GoogleGenAI } from "@google/genai";
import type { Document, SearchResult } from '../types';
import { TOP_K, airBeamLabData, officeFAQData } from '../constants';

// In-memory vector database
let documentVectors: { [key: string]: number[] } = {};
let documents: Document[] = [];

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

const cosineSimilarity = (vecA: number[], vecB: number[]): number => {
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }
  return dotProduct / (magnitudeA * magnitudeB);
};

const processKnowledgeBase = (): Document[] => {
  // Process structured AirBeam Lab data
  const processedAirBeamDocs: Document[] = airBeamLabData
    .filter(item => item.type === 'intent' && item.answer)
    .map((item: any) => ({
      id: item.id,
      content: `카테고리: ${item.category}\n질문 의도: ${item.intent} (${item.user_utterances.join(', ')})\n답변: ${item.answer}`
    }));

  const companyProfile = airBeamLabData.find(item => item.type === 'company_profile') as any;
  if (companyProfile) {
    // Break down the company profile into smaller, more specific documents
    processedAirBeamDocs.push({
      id: `${companyProfile.id}-summary`,
      content: `회사명: ${companyProfile.brand}. 소개: ${companyProfile.one_liner}. 설립: ${companyProfile.founded}. 본사: ${companyProfile.hq}.`
    });
     processedAirBeamDocs.push({
      id: `${companyProfile.id}-products`,
      content: `에어빔랩 주요 제품: ${companyProfile.core_products.join(', ')}.`
    });
    processedAirBeamDocs.push({
      id: `${companyProfile.id}-contact`,
      content: `에어빔랩 고객센터 연락처: 이메일 ${companyProfile.contact.cs_email}, 전화 ${companyProfile.contact.cs_tel}, 카카오 채널 ${companyProfile.contact.kakao}. 운영시간: ${companyProfile.contact.biz_hours}.`
    });
    processedAirBeamDocs.push({
      id: `${companyProfile.id}-warranty`,
      content: `에어빔랩 보증 정책: ${companyProfile.policies.warranty}.`
    });
    processedAirBeamDocs.push({
      id: `${companyProfile.id}-return`,
      content: `에어빔랩 반품 정책: ${companyProfile.policies.return}.`
    });
     processedAirBeamDocs.push({
      id: `${companyProfile.id}-repair`,
      content: `에어빔랩 수리 정책: ${companyProfile.policies.repair}.`
    });
    processedAirBeamDocs.push({
      id: `${companyProfile.id}-subscription`,
      content: `에어빔랩 구독 정책: ${companyProfile.policies.subscription}.`
    });
  }
  
  // Combine with general office FAQ data
  return [...processedAirBeamDocs, ...officeFAQData];
};

export const initializeVectorDB = async () => {
  console.log("Initializing vector database with combined knowledge base...");
  documents = processKnowledgeBase();
  
  const CHUNK_SIZE = 20; // Process documents in smaller chunks to avoid potential server errors
  
  try {
    console.log(`Generating embeddings for ${documents.length} documents...`);
    const allEmbeddings: { [key: string]: number[] } = {};

    for (let i = 0; i < documents.length; i += CHUNK_SIZE) {
      const chunkDocs = documents.slice(i, i + CHUNK_SIZE);
      const chunkContents = chunkDocs.map(doc => doc.content);
      
      const embeddingPromises = chunkContents.map(content => 
        ai.models.embedContent({
          model: 'text-embedding-004',
          contents: content,
        })
      );
      
      const results = await Promise.all(embeddingPromises);
      
      results.forEach((result, index) => {
        const docId = chunkDocs[index].id;
        // FIX: The `embedContent` response object property is `embeddings` (an array) instead of `embedding`.
        allEmbeddings[docId] = result.embeddings[0].values;
      });

      console.log(`Processed chunk ${Math.floor(i / CHUNK_SIZE) + 1}/${Math.ceil(documents.length / CHUNK_SIZE)}`);
    }
    
    documentVectors = allEmbeddings;
    console.log(`Vector database initialized successfully with ${Object.keys(documentVectors).length} vectors.`);
  } catch (error) {
    console.error("Failed to initialize vector database:", error);
    documents = [];
    documentVectors = {};
  }
};

export const searchSimilarDocuments = async (query: string): Promise<SearchResult[]> => {
  if (Object.keys(documentVectors).length === 0) {
    console.warn("Vector DB not initialized or failed to initialize.");
    return [];
  }
  
  try {
    const queryEmbeddingResult = await ai.models.embedContent({
      model: "text-embedding-004",
      contents: query,
    });
    // FIX: The `embedContent` response object property is `embeddings` (an array) instead of `embedding`.
    const queryVector = queryEmbeddingResult.embeddings[0].values;

    const similarities = documents.map((doc, index) => {
      const docVector = documentVectors[doc.id];
      if (!docVector) return { id: index, similarity: 0, document: doc };
      return {
        id: index,
        similarity: cosineSimilarity(queryVector, docVector),
        document: doc
      };
    });

    similarities.sort((a, b) => b.similarity - a.similarity);

    return similarities.slice(0, TOP_K);
  } catch (error) {
    console.error("Error searching for similar documents:", error);
    return [];
  }
};