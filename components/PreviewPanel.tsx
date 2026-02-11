
import React from 'react';
import { VersionMetadata } from '../types';

interface PreviewPanelProps {
  project: VersionMetadata;
}

const PreviewPanel: React.FC<PreviewPanelProps> = ({ project }) => {
  const { blueprint, brand, assets, agent } = project;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Brand & Strategy Overview */}
      <section className="bg-slate-800 rounded-3xl overflow-hidden border border-slate-700 shadow-xl">
        <div 
          className="h-32 px-8 flex items-end pb-4"
          style={{ backgroundColor: brand?.colors.primary || '#4f46e5' }}
        >
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-slate-900 shadow-xl font-black text-2xl">
              {brand?.name?.charAt(0) || "B"}
            </div>
            <div className="text-white">
              <h2 className="text-3xl font-black tracking-tighter">{brand?.name || "Genesis Brand"}</h2>
              <p className="text-white/80 font-medium italic">{brand?.tagline}</p>
            </div>
          </div>
        </div>
        
        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Core Strategy</h3>
            <div className="space-y-4">
              <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700">
                <span className="text-[10px] text-indigo-400 block mb-1">NICHE & ICP</span>
                <p className="text-sm leading-relaxed">{blueprint?.niche} targeting {blueprint?.icp}</p>
              </div>
              <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700">
                <span className="text-[10px] text-indigo-400 block mb-1">OFFER</span>
                <p className="text-sm leading-relaxed">{blueprint?.offer}</p>
              </div>
              <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700">
                <span className="text-[10px] text-indigo-400 block mb-1">VALUE PROP</span>
                <p className="text-sm leading-relaxed">{blueprint?.valueProp}</p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Visual Identity</h3>
            <div className="grid grid-cols-2 gap-4">
               {brand && Object.entries(brand.colors).map(([key, value]) => (
                 <div key={key} className="bg-slate-900/50 p-3 rounded-xl border border-slate-700 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg shadow-inner" style={{ backgroundColor: value }}></div>
                    <div>
                      <div className="text-[8px] uppercase text-slate-500">{key}</div>
                      <div className="text-xs mono">{value}</div>
                    </div>
                 </div>
               ))}
               <div className="col-span-2 bg-slate-900/50 p-4 rounded-xl border border-slate-700">
                 <div className="text-[10px] text-indigo-400 block mb-2 uppercase tracking-widest">Typography</div>
                 <div className="flex justify-between items-center">
                   <div style={{ fontFamily: 'Inter' }}>
                      <p className="text-xs text-slate-500">Heading</p>
                      <p className="text-lg font-bold">{brand?.fonts.heading}</p>
                   </div>
                   <div style={{ fontFamily: 'Inter' }}>
                      <p className="text-xs text-slate-500">Body</p>
                      <p className="text-lg">{brand?.fonts.body}</p>
                   </div>
                 </div>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* Assets & Marketing */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-slate-800 p-8 rounded-3xl border border-slate-700 h-full">
           <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
             Landing Page Content
           </h3>
           <div className="prose prose-invert max-w-none">
              <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 max-h-64 overflow-y-auto font-serif text-sm italic text-slate-300">
                {assets?.landingPageCopy}
              </div>
           </div>
        </div>

        <div className="bg-slate-800 p-8 rounded-3xl border border-slate-700 h-full">
           <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
             AI Agent Profile
           </h3>
           <div className="space-y-4">
              <div className="bg-indigo-600/10 p-4 rounded-xl border border-indigo-500/20">
                <p className="text-[10px] text-indigo-400 font-bold uppercase mb-1">PERSONA</p>
                <p className="text-sm">{agent?.persona}</p>
              </div>
              <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">GUARDRAILS</p>
                <p className="text-xs text-slate-400">{agent?.guardrails}</p>
              </div>
           </div>
        </div>
      </section>

      {/* Social Pack Preview */}
      <section className="bg-slate-800 p-8 rounded-3xl border border-slate-700">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">Social Pack (First 4 of 30)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {assets?.socialPack.slice(0, 4).map((post: any, i: number) => (
            <div key={i} className="bg-slate-900 p-4 rounded-2xl border border-slate-700 flex flex-col justify-between h-40">
              <p className="text-xs leading-relaxed line-clamp-4">{post}</p>
              <div className="flex items-center gap-2 mt-2">
                <div className="w-6 h-6 rounded-full bg-indigo-500"></div>
                <div className="text-[10px] text-slate-500">Genesis Day {i + 1}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default PreviewPanel;
