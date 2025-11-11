import React from 'react';
import type { ChatMessage } from '../types';
import DebugInfo from './DebugInfo';

interface ChatMessageProps {
  message: ChatMessage;
  isLoading?: boolean;
}

const ChatMessageItem: React.FC<ChatMessageProps> = ({ message, isLoading = false }) => {
  const isUser = message.role === 'user';

  const botAvatar = (
    <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center font-bold text-white text-sm shrink-0">
      AB
    </div>
  );

  const userAvatar = (
    <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center font-bold text-white text-sm shrink-0">
      U
    </div>
  );

  return (
    <div className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      {isUser ? userAvatar : botAvatar}
      <div className="flex flex-col">
        {!isUser && <p className="text-xs text-slate-400 mb-1">AirBeam Lab</p>}
        <div className={`p-3 rounded-lg max-w-lg ${isUser ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-200'}`}>
          {isLoading ? (
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse"></div>
            </div>
          ) : (
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatMessageItem;
