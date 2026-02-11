import React, { useState, useEffect } from 'react';
import { VersionMetadata } from '../types';
import { apiService } from '../services/apiService';

interface DeploymentPanelProps {
  project: VersionMetadata;
}

const DeploymentPanel: React.FC<DeploymentPanelProps> = ({ project }) => {
  const [isDeploying, setIsDeploying] = useState(false);
  const [buildId, setBuildId] = useState<string | null>((project as any).lastBuild?.id || null);
  const [status, setStatus] = useState<string>((project as any).lastBuild?.status || 'IDLE');
  const [serviceUrl, setServiceUrl] = useState<string | null>((project as any).lastBuild?.serviceUrl || null);

  useEffect(() => {
    let interval: any;
    if (buildId && (status === 'WORKING' || status === 'QUEUED')) {
      interval = setInterval(async () => {
        try {
          const res = await apiService.getDeployStatus(buildId);
          setStatus(res.status);
          if (res.serviceUrl) setServiceUrl(res.serviceUrl);
          if (res.status === 'SUCCESS' || res.status === 'FAILURE') clearInterval(interval);
        } catch (e) {
          console.error(e);
        }
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [buildId, status]);

  const handleDeploy = async () => {
    setIsDeploying(true);
    try {
      const res = await apiService.deployVersion(project.id);
      setBuildId(res.buildId);
      setStatus('WORKING');
    } catch (err) {
      alert("Deployment failed to start");
    } finally {
      setIsDeploying(false);
    }
  };

  const handleExport = async () => {
    try {
      const res = await apiService.exportVersion(project.id);
      window.open(res.downloadUrl, '_blank');
    } catch (err) {
      alert("Export failed");
    }
  };

  return (
    <div className="mt-12 bg-indigo-600 rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl">
      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="flex-1">
          <h2 className="text-2xl font-black mb-2 tracking-tight">Production Readiness</h2>
          <p className="text-indigo-100 max-w-md opacity-90 text-sm">
            {status === 'SUCCESS' 
              ? "Your business is live on Cloud Run!" 
              : status === 'WORKING' 
              ? "Genesis in progress... Provisioning infrastructure."
              : status === 'FAILURE'
              ? "Deployment failed. Check Cloud Build logs."
              : "System built and validated. Ready for deployment."}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          <button 
            className="px-8 py-4 bg-white text-indigo-600 font-bold rounded-2xl shadow-xl hover:bg-indigo-50 transition-all active:scale-95 disabled:opacity-50"
            onClick={handleDeploy}
            disabled={isDeploying || status === 'WORKING'}
          >
            {status === 'WORKING' ? "Genesis Running..." : "Cloud Run Genesis"}
          </button>
          
          <button 
            onClick={handleExport}
            className="px-8 py-4 bg-indigo-700 text-white font-bold rounded-2xl border border-indigo-500 shadow-xl hover:bg-indigo-800 transition-all"
          >
            Download ZIP
          </button>
        </div>
      </div>

      {(status === 'WORKING' || status === 'QUEUED') && (
        <div className="mt-6 h-1 w-full bg-indigo-800 rounded-full overflow-hidden">
          <div className="h-full bg-white animate-pulse"></div>
        </div>
      )}
      
      {status === 'SUCCESS' && serviceUrl && (
        <div className="mt-4 p-4 bg-emerald-500/20 rounded-xl border border-emerald-400/30 text-xs flex justify-between items-center animate-in zoom-in-95">
          <span className="mono truncate flex-1">URL: {serviceUrl}</span>
          <a href={serviceUrl} target="_blank" rel="noopener noreferrer" className="ml-4 px-3 py-1 bg-emerald-500 text-white rounded font-bold hover:bg-emerald-600 transition-colors">Launch Genesis</a>
        </div>
      )}
    </div>
  );
};

export default DeploymentPanel;