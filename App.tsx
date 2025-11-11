import React, { useState, useEffect } from 'react';
import type { ChatMessage } from './types';
import ChatWindow from './components/ChatWindow';
import { initializeVectorDB, searchSimilarDocuments } from './services/vectorDbService';
import { getOptimizedQuery, getLLMResponse } from './services/geminiService';
import { SIMILARITY_THRESHOLD } from './constants';

const App: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDbInitialized, setIsDbInitialized] = useState(false);

  useEffect(() => {
    const initDB = async () => {
      await initializeVectorDB();
      setIsDbInitialized(true);
      setIsLoading(false);
      setMessages([
        { id: 1, role: 'bot', content: '안녕하세요! 에어빔랩 AI 챗봇입니다. 무엇을 도와드릴까요?' }
      ]);
    };
    initDB();
  }, []);

  const handleSendMessage = async (message: string) => {
    if (!isDbInitialized) {
      return;
    }
    
    const userMessage: ChatMessage = {
      id: Date.now(),
      role: 'user',
      content: message,
    };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const optimizedQuery = await getOptimizedQuery(message);
      const searchResults = await searchSimilarDocuments(optimizedQuery);
      
      if (searchResults.length === 0 || searchResults[0].similarity < SIMILARITY_THRESHOLD) {
         const botMessage: ChatMessage = {
          id: Date.now() + 1,
          role: 'bot',
          content: '죄송해요. 질문을 정확히 이해하지 못했어요. 어떤 정보를 찾으시나요? (회사 소개/제품/가격/AS/환불 등)',
          debugInfo: {
            decision: 'not_answerable',
            similarity_top: searchResults.length > 0 ? searchResults[0].similarity : 0,
            used_context_ids: [],
            answer_korean: '죄송해요. 질문을 정확히 이해하지 못했어요. 어떤 정보를 찾으시나요? (회사 소개/제품/가격/AS/환불 등)',
            notes: 'No relevant documents found or similarity score was below threshold.',
            optimized_query: optimizedQuery
          }
        };
        setMessages(prev => [...prev, botMessage]);
        setIsLoading(false);
        return;
      }
      
      const llmResponse = await getLLMResponse(message, optimizedQuery, searchResults);

      if (llmResponse) {
        const botMessage: ChatMessage = {
          id: Date.now() + 1,
          role: 'bot',
          content: llmResponse.answer_korean,
          debugInfo: llmResponse,
        };
        setMessages(prev => [...prev, botMessage]);
      } else {
        const errorMessage: ChatMessage = {
          id: Date.now() + 1,
          role: 'bot',
          content: '오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error("An error occurred:", error);
      const errorMessage: ChatMessage = {
        id: Date.now() + 1,
        role: 'bot',
        content: '처리 중 오류가 발생했습니다. 관리자에게 문의하세요.',
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 text-white min-h-screen flex flex-col items-center justify-center p-4 font-sans">
      <div className="w-full max-w-2xl mx-auto">
        <header className="mb-4 text-center">
          <h1 className="text-3xl font-bold text-indigo-400">AirBeam Lab AI 챗봇</h1>
          <p className="text-slate-400">실내 공기질에 대해 무엇이든 물어보세요.</p>
        </header>
        <main>
          <ChatWindow
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
          />
        </main>
      </div>
    </div>
  );
};

export default App;