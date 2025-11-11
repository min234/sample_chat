import React from 'react';
import type { ChatbotResponse } from '../types';

interface DebugInfoProps {
  debugInfo: ChatbotResponse;
}

const DebugInfo: React.FC<DebugInfoProps> = ({ debugInfo }) => {
  const decisionColor = debugInfo.decision === 'answerable' ? 'text-green-400' : 'text-amber-400';

  return (
    <div className="mt-2 p-3 bg-slate-900/50 rounded-lg text-xs text-slate-300 border border-slate-600">
      <h4 className="font-bold mb-2 text-slate-100">AI Decision Details</h4>
      <div className="grid grid-cols-3 gap-2">
        <div className="font-semibold">Decision:</div>
        <div className={`col-span-2 font-mono ${decisionColor}`}>{debugInfo.decision}</div>

        <div className="font-semibold">Top Similarity:</div>
        <div className="col-span-2 font-mono">{debugInfo.similarity_top.toFixed(4)}</div>

        {debugInfo.optimized_query && (
          <>
            <div className="font-semibold">Optimized Query:</div>
            <div className="col-span-2 font-mono text-cyan-400">{debugInfo.optimized_query}</div>
          </>
        )}

        <div className="font-semibold">Used Context IDs:</div>
        <div className="col-span-2 font-mono">{JSON.stringify(debugInfo.used_context_ids)}</div>
        
        <div className="font-semibold">Notes:</div>
        <div className="col-span-2 font-mono">{debugInfo.notes}</div>
      </div>
    </div>
  );
};

export default DebugInfo;