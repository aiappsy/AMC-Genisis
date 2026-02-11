import React, { useState, useEffect } from 'react';
import { PipelineStage, FullProject, VersionMetadata, UserProfile, Workspace, Plan, SystemSettings, TokenLedgerEntry, AuditLog } from './types';
import { apiService } from './services/apiService';

import Sidebar from './components/Sidebar';
import PipelineStatus from './components/PipelineStatus';
import ChatInterface from './components/ChatInterface';
import PreviewPanel from './components/PreviewPanel';
import DeploymentPanel from './components/DeploymentPanel';

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [view, setView] = useState<'genesis' | 'admin'>('genesis');
  const [adminTab, setAdminTab] = useState<'overview' | 'users' | 'plans' | 'tokens' | 'audit'>('overview');
  const [adminData, setAdminData] = useState<{
    summary?: any, users?: UserProfile[], plans?: Plan[], ledger?: TokenLedgerEntry[], audit?: AuditLog[], settings?: SystemSettings, deploys?: any[]
  }>({});
  const [adminError, setAdminError] = useState<string | null>(null);
  
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [projects, setProjects] = useState<FullProject[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [activeVersion, setActiveVersion] = useState<VersionMetadata | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    const savedToken = localStorage.getItem('dgbp_token');
    if (savedToken) {
      try {
        const payload = JSON.parse(atob(savedToken.split('.')[1]));
        setUser({ 
          id: payload.sub, email: payload.email, name: payload.name, picture: payload.picture,
          role: 'user', plan: 'Free', tokensRemaining: 0, tokensUsed: 0, status: 'active', createdAt: 0, lastLogin: 0
        });
      } catch (e) {
        localStorage.removeItem('dgbp_token');
      }
    }

    /* @ts-ignore */
    google.accounts.id.initialize({
      client_id: "910579541086-e6qi7447s24l5srnv96i41b8i9o4p132.apps.googleusercontent.com", 
      callback: async (res: any) => {
        localStorage.setItem('dgbp_token', res.credential);
        window.location.reload(); 
      },
      auto_select: false, itp_support: true
    });
    
    if (!user && !savedToken) {
      /* @ts-ignore */
      google.accounts.id.renderButton(document.getElementById("signin-btn"), { theme: "outline", size: "large", shape: "pill" });
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadWorkspaces();
      loadProjects();
    }
  }, [user]);

  const loadWorkspaces = async () => {
    const ws = await apiService.getWorkspaces();
    setWorkspaces(ws);
    if (ws.length > 0 && !activeWorkspaceId) setActiveWorkspaceId(ws[0].id);
  };

  const loadProjects = async () => {
    try {
      const data = await apiService.getProjects();
      setProjects(data);
      if (data.length > 0 && !activeProjectId) {
        selectProject(data[0].id, data[0].currentVersionId);
      }
    } catch (e) {
      addLog("Failed to load projects.");
    }
  };

  const loadAdminData = async () => {
    setAdminError(null);
    try {
      const [summary, u, p, ledger, audit, settings, deploys] = await Promise.all([
        apiService.getAdminSummary(),
        apiService.getAdminUsers(),
        apiService.getAdminPlans(),
        apiService.getAdminLedger(),
        apiService.getAdminAudit(),
        apiService.getAdminSettings(),
        apiService.getAdminDeploys()
      ]);
      setAdminData({ summary, users: u, plans: p, ledger, audit, settings, deploys });
    } catch (e: any) {
      setAdminError("You do not have administrative access to this system.");
      setView('genesis');
    }
  };

  useEffect(() => {
    if (view === 'admin' && user) {
      loadAdminData();
    }
  }, [view, user]);

  const updateUserRole = async (uid: string, newRole: 'admin' | 'user') => {
    await apiService.updateAdminUser(uid, { role: newRole });
    loadAdminData();
  };

  const toggleUserStatus = async (uid: string, current: string) => {
    await apiService.updateAdminUser(uid, { status: current === 'active' ? 'disabled' : 'active' });
    loadAdminData();
  };

  const selectProject = async (pId: string, vId: string) => {
    setActiveProjectId(pId);
    try {
      const ver = await apiService.getVersion(vId);
      setActiveVersion(ver);
    } catch (e) {
      addLog("Failed to load project version.");
    }
  };

  const startNewProject = async (idea: string) => {
    if (!activeWorkspaceId) return addLog("Error: Create a workspace first.");
    if (isGenerating) return;
    setIsGenerating(true);
    setLogs([]);
    try {
      const biz = await apiService.createBusiness(idea, activeWorkspaceId);
      setProjects(prev => [biz, ...prev]);
      setActiveProjectId(biz.id);
      setActiveVersion(biz.version);
      await runPipeline(biz.id, biz.version.id, idea);
    } catch (e) {
      addLog("Genesis failed to initiate.");
    } finally {
      setIsGenerating(false);
    }
  };

  const runPipeline = async (bizId: string, vId: string, idea: string) => {
    const stages = [PipelineStage.STRATEGY, PipelineStage.BRAND, PipelineStage.STRUCTURE, PipelineStage.ASSETS, PipelineStage.AGENT, PipelineStage.VALIDATE];
    let currentContext: any = { idea };
    for (const stage of stages) {
      addLog(`Initiating ${stage}...`);
      const result = await apiService.generateStage(bizId, vId, stage, currentContext);
      currentContext = { ...currentContext, [stage]: result };
      const updated = await apiService.getVersion(vId);
      setActiveVersion(updated);
      if (stage === PipelineStage.VALIDATE && !result.isValid) {
        addLog("Validation failed. Stopping pipeline.");
        break;
      }
    }
    if (activeVersion?.isValidated) {
      addLog("Architecting source code...");
      const b64 = (s: string) => btoa(unescape(encodeURIComponent(s)));
      const payload = {
        source: { files: [{ path: 'package.json', contentBase64: b64(JSON.stringify({ name: "app" })) }] },
        dist: { files: [{ path: 'index.html', contentBase64: b64('<html></html>') }] }
      };
      await apiService.persistFiles(vId, payload);
      addLog("Genesis build finalized.");
      setActiveVersion(await apiService.getVersion(vId));
    }
  };

  const addLog = (m: string) => setLogs(p => [...p.slice(-15), `[${new Date().toLocaleTimeString()}] ${m}`]);

  if (!user) return (
    <div className="h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-24 h-24 bg-indigo-600 rounded-3xl mb-8 flex items-center justify-center text-4xl font-black shadow-2xl shadow-indigo-500/20">G</div>
      <h1 className="text-5xl font-black mb-4 tracking-tighter">DGBP Architect</h1>
      <p className="text-slate-400 mb-10 max-w-sm text-lg leading-relaxed">Sign in with your Google account to access your architecture console.</p>
      <div id="signin-btn" className="flex justify-center"></div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-900 overflow-hidden text-slate-100">
      <Sidebar 
        projects={projects.filter(p => p.workspaceId === activeWorkspaceId)} workspaces={workspaces}
        activeId={activeProjectId} activeWorkspaceId={activeWorkspaceId}
        onSelect={(id) => { const p = projects.find(x => x.id === id); if (p) selectProject(p.id, p.currentVersionId); setView('genesis'); }} 
        onSelectWorkspace={setActiveWorkspaceId} onAddWorkspace={async (name) => { const ws = await apiService.createWorkspace(name); setWorkspaces([...workspaces, ws]); setActiveWorkspaceId(ws.id); }}
      />
      
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-slate-800 flex items-center justify-between px-8 bg-slate-950/50 backdrop-blur-xl shrink-0">
          <div className="flex items-center gap-4">
             <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center font-bold">G</div>
             <h1 className="font-bold tracking-tight">
               {view === 'admin' ? <span className="text-emerald-400">System Governance</span> : <span>Workspace: <span className="text-indigo-400">{workspaces.find(w => w.id === activeWorkspaceId)?.name || 'Default'}</span></span>}
             </h1>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setView(view === 'admin' ? 'genesis' : 'admin')} className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-lg ${view === 'admin' ? 'bg-indigo-600' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
              {view === 'admin' ? 'Back to Architect' : 'Admin Panel'}
            </button>
            <button onClick={() => { localStorage.removeItem('dgbp_token'); window.location.reload(); }} className="text-xs text-slate-500 hover:text-white">Sign Out</button>
            <img src={user.picture} className="w-10 h-10 rounded-full border-2 border-indigo-500/50" alt={user.name} />
          </div>
        </header>

        {adminError && <div className="bg-rose-600/20 text-rose-400 px-8 py-3 text-sm font-bold border-b border-rose-500/30">{adminError}</div>}

        <div className="flex-1 flex overflow-hidden">
          {view === 'genesis' ? (
            <>
              <div className="w-1/3 border-r border-slate-800 flex flex-col bg-slate-950/20">
                <ChatInterface onStart={startNewProject} isGenerating={isGenerating} logs={logs} />
                <div className="h-56 p-4 bg-black/40 font-mono text-[10px] text-slate-400 overflow-y-auto border-t border-slate-800 shrink-0">
                  {logs.map((l, i) => <div key={i} className="mb-1">{l}</div>)}
                </div>
              </div>
              <div className="flex-1 p-8 overflow-y-auto bg-slate-900/50">
                {activeVersion ? (
                  <div className="max-w-4xl mx-auto space-y-12">
                    <PipelineStatus currentStage={activeVersion.stage} />
                    <PreviewPanel project={activeVersion} />
                    {activeVersion.isValidated && activeVersion.filesStored && <DeploymentPanel project={activeVersion} />}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-600 opacity-50">
                    <p>Describe your idea or select a project to begin architecting.</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
              <nav className="flex bg-slate-950 shrink-0 px-8 border-b border-slate-800">
                {['overview', 'users', 'plans', 'tokens', 'audit'].map(t => (
                  <button key={t} onClick={() => setAdminTab(t as any)} className={`px-6 py-4 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-all ${adminTab === t ? 'border-indigo-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
                    {t}
                  </button>
                ))}
              </nav>

              <div className="flex-1 p-12 overflow-y-auto bg-slate-950/50">
                <div className="max-w-7xl mx-auto space-y-10">
                  {adminTab === 'overview' && (
                    <div className="space-y-10">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700 shadow-xl">
                          <div className="text-[10px] font-bold text-slate-500 uppercase mb-2">Gross Revenue</div>
                          <div className="text-4xl font-black text-emerald-400">${adminData.summary?.totalRevenue?.toLocaleString() || 0}</div>
                        </div>
                        <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700 shadow-xl">
                          <div className="text-[10px] font-bold text-slate-500 uppercase mb-2">Provider Cost</div>
                          <div className="text-4xl font-black text-rose-400">${adminData.summary?.totalCost?.toFixed(4) || 0}</div>
                        </div>
                        <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700 shadow-xl">
                          <div className="text-[10px] font-bold text-slate-500 uppercase mb-2">Gross Margin</div>
                          <div className="text-4xl font-black text-white">${adminData.summary?.grossMargin?.toFixed(2) || 0}</div>
                        </div>
                        <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700 shadow-xl">
                          <div className="text-[10px] font-bold text-slate-500 uppercase mb-2">Total Tokens</div>
                          <div className="text-4xl font-black text-indigo-400">{adminData.summary?.totalTokens?.toLocaleString() || 0}</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl">
                           <h3 className="text-xl font-bold mb-6">Recent Deploys</h3>
                           <div className="space-y-4">
                             {adminData.deploys?.slice(0, 5).map((d: any) => (
                               <div key={d.id} className="flex justify-between items-center bg-slate-800/40 p-4 rounded-xl">
                                 <div>
                                   <div className="text-sm font-bold text-indigo-400">{d.serviceName}</div>
                                   <div className="text-[10px] text-slate-500">{new Date(d.createdAt).toLocaleString()}</div>
                                 </div>
                                 <span className={`px-2 py-1 rounded text-[9px] font-bold ${d.status === 'SUCCESS' ? 'text-emerald-400 bg-emerald-400/10' : 'text-amber-400 bg-amber-400/10'}`}>{d.status}</span>
                               </div>
                             ))}
                           </div>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl">
                           <h3 className="text-xl font-bold mb-6">AI Settings</h3>
                           <div className="space-y-4 text-sm">
                             <div className="flex justify-between border-b border-slate-800 pb-2"><span className="text-slate-500">Default Model:</span><span className="mono text-indigo-400">{adminData.settings?.defaultModel}</span></div>
                             <div className="flex justify-between border-b border-slate-800 pb-2"><span className="text-slate-500">Reasoning Model:</span><span className="mono text-indigo-400">{adminData.settings?.reasoningModel}</span></div>
                             <div className="flex justify-between"><span className="text-slate-500">Guardrails:</span><span className="text-emerald-400 font-bold">{adminData.settings?.costGuardrails ? 'ON' : 'OFF'}</span></div>
                           </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {adminTab === 'users' && (
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-950 text-slate-500 uppercase text-[10px] font-black border-b border-slate-800">
                          <tr><th className="px-6 py-4">User</th><th className="px-6 py-4">Plan</th><th className="px-6 py-4">Status</th><th className="px-6 py-4">Tokens</th><th className="px-6 py-4 text-right">Actions</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                          {adminData.users?.map((u: any) => (
                            <tr key={u.id} className="hover:bg-white/5 transition-colors">
                              <td className="px-6 py-4 flex items-center gap-3">
                                <img src={u.picture} className="w-8 h-8 rounded-full border border-slate-700" />
                                <div><div className="font-bold">{u.name}</div><div className="text-slate-500 text-[10px]">{u.role}</div></div>
                              </td>
                              <td className="px-6 py-4"><span className="bg-indigo-500/10 text-indigo-400 px-2 py-1 rounded text-[10px] font-bold uppercase">{u.plan || 'Free'}</span></td>
                              <td className="px-6 py-4"><span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${u.status === 'active' ? 'text-emerald-500' : 'text-rose-500'}`}>{u.status || 'active'}</span></td>
                              <td className="px-6 py-4 mono">Rem: <span className="text-emerald-400">{u.tokensRemaining?.toLocaleString()}</span></td>
                              <td className="px-6 py-4 text-right space-x-2">
                                <button onClick={() => updateUserRole(u.id, u.role === 'admin' ? 'user' : 'admin')} className="text-indigo-400 hover:underline">Toggle Admin</button>
                                <button onClick={() => toggleUserStatus(u.id, u.status)} className="text-rose-400 hover:underline">{u.status === 'disabled' ? 'Enable' : 'Disable'}</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {adminTab === 'plans' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      {adminData.plans?.map((p: any) => (
                        <div key={p.id} className="bg-slate-900 p-8 rounded-3xl border border-slate-800 flex flex-col hover:border-indigo-500/50 transition-all">
                          <h4 className="text-2xl font-black mb-2">{p.name}</h4>
                          <div className="text-3xl font-black text-indigo-400 mb-6">${p.price}<span className="text-sm text-slate-500 font-normal">/mo</span></div>
                          <div className="space-y-3 flex-1 mb-8">
                            <div className="flex justify-between text-xs text-slate-400"><span>Tokens:</span><span>{p.monthlyTokens.toLocaleString()}</span></div>
                            <div className="flex justify-between text-xs text-slate-400"><span>Projects:</span><span>{p.maxProjects}</span></div>
                            <div className="flex justify-between text-xs text-slate-400"><span>Overage:</span><span>${p.overagePer1k}/1k</span></div>
                          </div>
                          <button className="w-full py-3 bg-slate-800 rounded-xl text-xs font-bold hover:bg-slate-700">Edit Plan</button>
                        </div>
                      ))}
                    </div>
                  )}

                  {adminTab === 'tokens' && (
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
                      <table className="w-full text-left text-[10px] font-mono">
                        <thead className="bg-slate-950 text-slate-500 uppercase font-black border-b border-slate-800">
                          <tr><th className="px-6 py-4">Time</th><th className="px-6 py-4">Model</th><th className="px-6 py-4">Tokens</th><th className="px-6 py-4 text-right">Cost USD</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                          {adminData.ledger?.map((e: any) => (
                            <tr key={e.id} className="hover:bg-white/5">
                              <td className="px-6 py-4 text-slate-500">{new Date(e.timestamp).toLocaleTimeString()}</td>
                              <td className="px-6 py-4 text-indigo-400">{e.modelId}</td>
                              <td className="px-6 py-4">I:{e.inputTokens} | O:{e.outputTokens}</td>
                              <td className="px-6 py-4 text-right text-rose-400">${e.providerCostUSD.toFixed(5)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {adminTab === 'audit' && (
                    <div className="space-y-4">
                      {adminData.audit?.map((log: any) => (
                        <div key={log.id} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex justify-between items-start">
                          <div>
                            <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{log.action}</div>
                            <div className="text-sm text-white mt-1">{log.details}</div>
                            <div className="text-[10px] text-slate-600 mt-2">Target: {log.targetId}</div>
                          </div>
                          <div className="text-right">
                             <div className="text-[10px] font-bold">{log.adminEmail}</div>
                             <div className="text-[10px] text-slate-600">{new Date(log.timestamp).toLocaleString()}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
