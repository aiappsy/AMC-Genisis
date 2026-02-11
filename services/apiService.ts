import { PipelineStage, VersionMetadata, Workspace, Plan, SystemSettings, TokenLedgerEntry, AuditLog } from "../types";

const BASE_URL = '/api';

const getHeaders = () => {
  const token = localStorage.getItem('dgbp_token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

export const apiService = {
  async getWorkspaces(): Promise<Workspace[]> {
    const response = await fetch(`${BASE_URL}/workspaces`, { headers: getHeaders() });
    if (!response.ok) return [];
    return response.json();
  },

  async createWorkspace(name: string): Promise<Workspace> {
    const response = await fetch(`${BASE_URL}/workspaces`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ name })
    });
    return response.json();
  },

  async createBusiness(idea: string, workspaceId: string) {
    const response = await fetch(`${BASE_URL}/businesses`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ idea, workspaceId })
    });
    if (!response.ok) throw new Error(await response.text());
    return response.json();
  },

  async generateStage(businessId: string, versionId: string, stage: PipelineStage, context: any) {
    const response = await fetch(`${BASE_URL}/generateStage`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ businessId, versionId, stage, context })
    });
    if (!response.ok) throw new Error(await response.text());
    return response.json();
  },

  async persistFiles(versionId: string, payload: { source: { files: any[] }, dist: { files: any[] } }) {
    const response = await fetch(`${BASE_URL}/versions/${versionId}/files`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(await response.text());
    return response.json();
  },

  async getProjects() {
    const response = await fetch(`${BASE_URL}/projects`, {
      headers: getHeaders()
    });
    if (!response.ok) return [];
    return response.json();
  },

  async getVersion(versionId: string): Promise<VersionMetadata> {
    const response = await fetch(`${BASE_URL}/versions/${versionId}`, {
      headers: getHeaders()
    });
    if (!response.ok) throw new Error("Unauthorized or not found");
    return response.json();
  },

  async deployVersion(versionId: string) {
    const response = await fetch(`${BASE_URL}/deploy/${versionId}`, {
      method: 'POST',
      headers: getHeaders()
    });
    return response.json();
  },

  async getDeployStatus(buildId: string) {
    const response = await fetch(`${BASE_URL}/deploy/status/${buildId}`, {
      headers: getHeaders()
    });
    return response.json();
  },

  async exportVersion(versionId: string) {
    const response = await fetch(`${BASE_URL}/export/${versionId}`, {
      method: 'POST',
      headers: getHeaders()
    });
    if (!response.ok) throw new Error("Export failed");
    return response.json();
  },

  // --- ADMIN ENDPOINTS ---
  async getAdminSummary() {
    const response = await fetch(`${BASE_URL}/admin/summary`, { headers: getHeaders() });
    if (!response.ok) throw new Error("Admin access denied");
    return response.json();
  },

  async getAdminUsers() {
    const response = await fetch(`${BASE_URL}/admin/users`, { headers: getHeaders() });
    if (!response.ok) throw new Error("Admin access denied");
    return response.json();
  },

  async updateAdminUser(uid: string, updates: any) {
    const response = await fetch(`${BASE_URL}/admin/users/${uid}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(updates)
    });
    return response.json();
  },

  async getAdminPlans(): Promise<Plan[]> {
    const response = await fetch(`${BASE_URL}/admin/plans`, { headers: getHeaders() });
    return response.json();
  },

  async createAdminPlan(plan: Partial<Plan>) {
    const response = await fetch(`${BASE_URL}/admin/plans`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(plan)
    });
    return response.json();
  },

  async updateAdminPlan(id: string, updates: Partial<Plan>) {
    const response = await fetch(`${BASE_URL}/admin/plans/${id}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(updates)
    });
    return response.json();
  },

  async getAdminLedger(): Promise<TokenLedgerEntry[]> {
    const response = await fetch(`${BASE_URL}/admin/ledger`, { headers: getHeaders() });
    return response.json();
  },

  async getAdminAudit(): Promise<AuditLog[]> {
    const response = await fetch(`${BASE_URL}/admin/audit`, { headers: getHeaders() });
    return response.json();
  },

  async getAdminSettings(): Promise<SystemSettings> {
    const response = await fetch(`${BASE_URL}/admin/settings`, { headers: getHeaders() });
    return response.json();
  },

  async updateAdminSettings(settings: Partial<SystemSettings>) {
    const response = await fetch(`${BASE_URL}/admin/settings`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(settings)
    });
    return response.json();
  },

  async getAdminDeploys() {
    const response = await fetch(`${BASE_URL}/admin/deploys`, { headers: getHeaders() });
    return response.json();
  },

  async getAdminWorkspaces() {
    const response = await fetch(`${BASE_URL}/admin/workspaces`, { headers: getHeaders() });
    return response.json();
  },

  async getAdminVersions() {
    const response = await fetch(`${BASE_URL}/admin/versions`, { headers: getHeaders() });
    return response.json();
  }
};
