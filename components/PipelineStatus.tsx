
import React from 'react';
import { PipelineStage } from '../types';

interface PipelineStatusProps {
  currentStage: PipelineStage;
}

const PipelineStatus: React.FC<PipelineStatusProps> = ({ currentStage }) => {
  const stages = [
    PipelineStage.STRATEGY,
    PipelineStage.BRAND,
    PipelineStage.STRUCTURE,
    PipelineStage.ASSETS,
    PipelineStage.AGENT,
    PipelineStage.VALIDATE
  ];

  const getStatus = (stage: PipelineStage) => {
    const currentIndex = stages.indexOf(currentStage);
    const stageIndex = stages.indexOf(stage);

    if (currentStage === PipelineStage.COMPLETE) return 'complete';
    if (currentIndex > stageIndex) return 'complete';
    if (currentIndex === stageIndex) return 'active';
    return 'pending';
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {stages.map((stage, i) => {
        const status = getStatus(stage);
        return (
          <div key={stage} className={`relative p-4 rounded-xl border transition-all ${
            status === 'complete' ? 'bg-emerald-500/10 border-emerald-500/30' :
            status === 'active' ? 'bg-indigo-500/10 border-indigo-500 shadow-[0_0_15px_-5px_rgba(99,102,241,0.5)]' :
            'bg-slate-800/50 border-slate-700 opacity-50'
          }`}>
            <div className="flex flex-col items-center text-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 text-xs font-bold ${
                status === 'complete' ? 'bg-emerald-500 text-white' :
                status === 'active' ? 'bg-indigo-600 text-white animate-pulse' :
                'bg-slate-700 text-slate-400'
              }`}>
                {status === 'complete' ? (
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                ) : (i + 1)}
              </div>
              <div className="text-[10px] font-bold uppercase tracking-tighter opacity-80 truncate w-full">
                {stage}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default PipelineStatus;
