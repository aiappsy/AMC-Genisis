import React from 'react';
import { FullProject, Workspace } from '../types';

interface SidebarProps {
  projects: FullProject[];
  workspaces: Workspace[];
  activeId: string | null;
  activeWorkspaceId: string | null;
  onSelect: (id: string) => void;
  onSelectWorkspace: (id: string) => void;
  onAddWorkspace: (name: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ projects, workspaces, activeId, activeWorkspaceId, onSelect, onSelectWorkspace, onAddWorkspace }) => {
  const handleAddWS = () => {
    const name = prompt("Enter Workspace Name:");
    if (name) onAddWorkspace(name);
  };

  return (
    <aside className="w-72 bg-slate-950 border-r border-slate-800 flex flex-col h-full hidden md:flex">
      <div className="p-6 border-b border-slate-800">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Workspaces</div>
        <div className="space-y-2">
          {workspaces.map(ws => (
            <button
              key={ws.id}
              onClick={() => onSelectWorkspace(ws.id)}
              className={`w-full py-2 px-4 rounded-lg text-sm flex items-center justify-between transition-colors ${
                activeWorkspaceId === ws.id ? 'bg-indigo-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
            >
              <span className="truncate">{ws.name}</span>
              {activeWorkspaceId === ws.id && <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>}
            </button>
          ))}
          <button 
            onClick={handleAddWS}
            className="w-full py-2 px-4 border border-dashed border-slate-700 hover:border-indigo-500 rounded-lg text-sm text-slate-500 hover:text-indigo-400 transition-all flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
            Add Workspace
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 px-2">Project History</div>
        <div className="space-y-1">
          {projects.length === 0 ? (
            <div className="px-2 py-8 text-center text-slate-600 italic text-sm">No projects in this workspace</div>
          ) : (
            projects.map(p => (
              <button
                key={p.id}
                onClick={() => onSelect(p.id)}
                className={`w-full text-left px-3 py-3 rounded-xl transition-all ${
                  activeId === p.id 
                  ? 'bg-indigo-600/10 border border-indigo-500/20 text-white' 
                  : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                }`}
              >
                <div className="font-medium text-sm truncate">{p.brand?.name || "New Genesis"}</div>
                <div className="text-[10px] opacity-60 mt-1 flex justify-between">
                  <span>{new Date(p.timestamp).toLocaleDateString()}</span>
                  <span className="uppercase">{p.currentStage}</span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="p-4 border-t border-slate-800">
        <div className="bg-slate-900 rounded-xl p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-slate-400">Project Quota</span>
            <span className="text-xs font-bold text-indigo-400">84%</span>
          </div>
          <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
            <div className="bg-indigo-500 h-full w-[84%]"></div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;