export enum PipelineStage {
  STRATEGY = 'Strategy blueprint',
  BRAND = 'Brand kit',
  STRUCTURE = 'Structure schema',
  ASSETS = 'Asset generation',
  AGENT = 'AI Agent profile',
  VALIDATE = 'Build + Validate',
  COMPLETE = 'Complete'
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  picture: string;
  role: 'admin' | 'user';
  plan: string;
  tokensRemaining: number;
  tokensUsed: number;
  status: 'active' | 'disabled';
  createdAt: number;
  lastLogin: number;
}

export interface Workspace {
  id: string;
  userId: string;
  name: string;
  timestamp: number;
}

export interface BusinessBlueprint {
  niche: string;
  icp: string;
  offer: string;
  pricing: string;
  funnelModel: string;
  channels: string[];
  valueProp: string;
  positioning: string;
}

export interface BrandKit {
  name: string;
  tagline: string;
  tone: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
  logoConcept: string;
  voiceGuide: string;
}

export interface VersionMetadata {
  id: string;
  businessId: string;
  userId: string;
  stage: PipelineStage;
  blueprint?: BusinessBlueprint;
  brand?: BrandKit;
  structure?: any;
  assets?: any;
  agent?: any;
  validation?: {
    isValid: boolean;
    errors: string[];
    score: number;
    buildTestPassed: boolean;
  };
  isValidated: boolean;
  filesStored: boolean;
  timestamp: number;
  lastBuild?: {
    id: string;
    status: string;
    serviceUrl?: string;
    region?: string;
  };
}

export interface FullProject {
  id: string;
  userId: string;
  workspaceId: string;
  idea: string;
  currentVersionId: string;
  timestamp: number;
  brand?: BrandKit;
  currentStage: string;
}

export interface Plan {
  id: string;
  name: string;
  monthlyTokens: number;
  price: number;
  maxProjects: number;
  features: string[];
  overagePer1k: number;
  active: boolean;
}

export interface TokenLedgerEntry {
  id: string;
  userId: string;
  workspaceId?: string;
  projectId: string;
  modelId: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  providerCostUSD: number;
  chargedTokens: number;
  timestamp: number;
}

export interface AuditLog {
  id: string;
  adminId: string;
  adminEmail: string;
  action: string;
  targetId: string;
  details: string;
  timestamp: number;
}

export interface SystemSettings {
  defaultModel: string;
  temperature: number;
  maxTokens: number;
  reasoningModel: string;
  voiceModel: string;
  costGuardrails: boolean;
}

export interface AdminStats {
  users: UserProfile[];
  workspaces: Workspace[];
  versions: VersionMetadata[];
  deploys: any[];
  plans: Plan[];
  ledger: TokenLedgerEntry[];
  audit: AuditLog[];
  settings: SystemSettings;
  summary: {
    totalRevenue: number;
    totalCost: number;
    grossMargin: number;
    totalTokens: number;
  };
}
