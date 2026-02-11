import express from 'express';
import { GoogleGenAI, Type } from "@google/genai";
import { OAuth2Client } from 'google-auth-library';
import * as admin from 'firebase-admin';
import { CloudBuildClient } from '@google-cloud/cloudbuild';
import { Storage } from '@google-cloud/storage';
import { ServicesClient } from '@google-cloud/run';
import path from 'path';
import { fileURLToPath } from 'url';
import { uploadFileTree } from './storage.js';
import archiver from 'archiver';
import { Buffer } from 'buffer';
import process from 'process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const PORT = Number(process.env.PORT) || 8080;
const API_KEY = process.env.API_KEY; 
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT;
const BUCKET_NAME = process.env.GCS_BUCKET_NAME;

// Admin bootstrap list
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "").split(",").map(e => e.trim().toLowerCase()).filter(Boolean);

if (admin.apps.length === 0) {
  admin.initializeApp();
}
const db = admin.firestore();

const app = express();
app.use(express.json({ limit: '50mb' }));

/**
 * Audit Logger Helper
 */
async function logAudit(req: any, action: string, targetId: string, details: string) {
  const auditRef = db.collection('audit_logs').doc();
  await auditRef.set({
    id: auditRef.id,
    adminId: req.user.id,
    adminEmail: req.user.email,
    action,
    targetId,
    details,
    timestamp: Date.now()
  });
}

/**
 * Token Ledger Logger Helper
 */
async function logLedgerEntry(userId: string, projectId: string, modelId: string, inputTokens: number, outputTokens: number) {
  const ledgerRef = db.collection('token_ledger').doc();
  const totalTokens = inputTokens + outputTokens;
  
  // Cost estimates based on generic Gemini Pro/Flash pricing
  const costPer1M = modelId.includes('pro') ? 3.5 : 0.075; 
  const providerCostUSD = (totalTokens / 1000000) * costPer1M;

  await ledgerRef.set({
    id: ledgerRef.id,
    userId,
    projectId,
    modelId,
    inputTokens,
    outputTokens,
    totalTokens,
    providerCostUSD,
    chargedTokens: totalTokens,
    timestamp: Date.now()
  });
  
  // Update user counters
  await db.collection('users').doc(userId).update({
    tokensUsed: admin.firestore.FieldValue.increment(totalTokens),
    tokensRemaining: admin.firestore.FieldValue.increment(-totalTokens)
  });
}

/**
 * Auth Middleware - Enhances req.user with Firestore data & Role Sync
 */
const authenticate = async (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).send('Unauthorized');
  }
  const token = authHeader.split('Bearer ')[1];
  try {
    const ticket = await authClient.verifyIdToken({ idToken: token, audience: CLIENT_ID });
    const payload = ticket.getPayload();
    if (!payload) throw new Error("Invalid payload");

    const userRef = db.collection('users').doc(payload.sub);
    const userDoc = await userRef.get();
    
    // Role Sync Logic
    let currentRole = 'user';
    if (ADMIN_EMAILS.includes(payload.email!.toLowerCase())) {
      currentRole = 'admin';
    }

    const userDataBase = {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
      lastLogin: Date.now(),
    };

    if (!userDoc.exists) {
      const newUser = {
        ...userDataBase,
        role: currentRole,
        plan: 'Free',
        tokensRemaining: 10000,
        tokensUsed: 0,
        createdAt: Date.now(),
        status: 'active'
      };
      await userRef.set(newUser);
      req.user = newUser;
    } else {
      const existing = userDoc.data();
      if (existing?.status === 'disabled') {
        return res.status(403).send('Account disabled');
      }
      
      // Update dynamic fields, potentially upgrade role if ENV changed
      const roleToUpdate = (existing.role === 'admin' || currentRole === 'admin') ? 'admin' : 'user';
      await userRef.update({ ...userDataBase, role: roleToUpdate });
      req.user = { ...existing, ...userDataBase, role: roleToUpdate };
    }

    next();
  } catch (err) {
    res.status(401).send('Unauthorized');
  }
};

const requireAdmin = (req: any, res: any, next: any) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).send('Forbidden: Admin access required');
  }
  next();
};

const authClient = new OAuth2Client(CLIENT_ID);
const buildClient = new CloudBuildClient();
const storage = new Storage();
const runClient = new ServicesClient();

async function verifyOwner(req: any, collection: string, docId: string) {
  const doc = await db.collection(collection).doc(docId).get();
  if (!doc.exists) return { status: 404, message: 'Not found' };
  const data = doc.data();
  if (data?.userId !== req.user.id) return { status: 403, message: 'Forbidden' };
  return { status: 200, data };
}

async function generateWithRetry(ai: GoogleGenAI, model: string, contents: string, schema: any, retries = 3): Promise<any> {
  let lastError: any;
  for (let i = 0; i < retries; i++) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents,
        config: { responseMimeType: "application/json", responseSchema: schema }
      });
      return JSON.parse(response.text || '{}');
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

// --- STANDARD API ROUTES ---

app.get('/api/workspaces', authenticate, async (req: any, res) => {
  const snapshot = await db.collection('workspaces').where('userId', '==', req.user.id).get();
  res.json(snapshot.docs.map(doc => doc.data()));
});

app.post('/api/workspaces', authenticate, async (req: any, res) => {
  const { name } = req.body;
  const ref = db.collection('workspaces').doc();
  const workspace = { id: ref.id, userId: req.user.id, name, timestamp: Date.now() };
  await ref.set(workspace);
  res.json(workspace);
});

app.post('/api/businesses', authenticate, async (req: any, res) => {
  const { idea, workspaceId } = req.body;
  const wsVerify = await verifyOwner(req, 'workspaces', workspaceId);
  if (wsVerify.status !== 200) return res.status(wsVerify.status).send(wsVerify.message);

  const bizRef = db.collection('businesses').doc();
  const verRef = db.collection('versions').doc();

  const business = {
    id: bizRef.id, userId: req.user.id, workspaceId, idea,
    currentVersionId: verRef.id, timestamp: Date.now()
  };

  const version = {
    id: verRef.id, businessId: bizRef.id, userId: req.user.id,
    stage: 'Strategy blueprint', isValidated: false, filesStored: false, timestamp: Date.now()
  };

  await db.runTransaction(async (t) => {
    t.set(bizRef, business);
    t.set(verRef, version);
  });

  res.json({ ...business, version });
});

app.get('/api/projects', authenticate, async (req: any, res) => {
  const snapshot = await db.collection('businesses')
    .where('userId', '==', req.user.id)
    .orderBy('timestamp', 'desc').get();
  res.json(snapshot.docs.map(doc => doc.data()));
});

app.post('/api/generateStage', authenticate, async (req: any, res) => {
  if (!API_KEY) return res.status(500).send("API_KEY not configured.");
  const { businessId, versionId, stage, context } = req.body;
  const verCheck = await verifyOwner(req, 'versions', versionId);
  if (verCheck.status !== 200) return res.status(verCheck.status).send(verCheck.message);

  const settingsDoc = await db.collection('systemSettings').doc('global').get();
  const settings = settingsDoc.exists ? settingsDoc.data() : { defaultModel: 'gemini-3-flash-preview', reasoningModel: 'gemini-3-pro-preview' };

  const isHighReasoning = ['Strategy blueprint', 'Brand kit', 'Structure schema', 'Build + Validate'].includes(stage);
  const model = isHighReasoning ? settings?.reasoningModel : settings?.defaultModel;

  try {
    const ai = new GoogleGenAI({ apiKey: API_KEY });
    const data = await generateWithRetry(
      ai, model!,
      `You are an AI Architect. Stage: ${stage}. Idea: ${context.idea}. Context: ${JSON.stringify(context)}.`,
      getSchemaForStage(stage)
    );

    if (stage === 'Build + Validate') {
      data.buildTestPassed = data.score >= 0.8;
      data.isValid = data.score >= 0.7;
    }

    const fieldMap: any = {
      'Strategy blueprint': 'blueprint',
      'Brand kit': 'brand',
      'Structure schema': 'structure',
      'Asset generation': 'assets',
      'AI Agent profile': 'agent',
      'Build + Validate': 'validation'
    };

    const update: any = { [fieldMap[stage]]: data, stage };
    if (stage === 'Build + Validate') update.isValidated = data.isValid;

    await db.collection('versions').doc(versionId).update(update);
    
    // Log Ledger
    await logLedgerEntry(req.user.id, businessId, model!, isHighReasoning ? 600 : 300, isHighReasoning ? 1200 : 400);

    res.json(data);
  } catch (err) {
    res.status(500).send('AI Pipeline Failure');
  }
});

// Deployment logic
app.post('/api/deploy/:versionId', authenticate, async (req: any, res) => {
  if (!PROJECT_ID || !BUCKET_NAME) return res.status(500).send("Cloud configuration missing");
  const verId = req.params.versionId;
  const check = await verifyOwner(req, 'versions', verId);
  if (check.status !== 200) return res.status(check.status).send(check.message);

  const region = 'us-central1';
  const serviceName = `biz-${verId.slice(0, 10)}`;
  const repoName = `${region}-docker.pkg.dev/${PROJECT_ID}/dgbp-apps/${serviceName}:latest`;
  
  try {
    const [operation] = await buildClient.createBuild({
      projectId: PROJECT_ID,
      build: {
        steps: [
          { name: 'gcr.io/cloud-builders/gsutil', args: ['rsync', '-r', `gs://${BUCKET_NAME}/versions/${verId}/source`, '.'] },
          { name: 'gcr.io/cloud-builders/npm', args: ['install'] },
          { name: 'gcr.io/cloud-builders/npm', args: ['run', 'build'] },
          { name: 'gcr.io/cloud-builders/docker', args: ['build', '-t', repoName, '.'] },
          { name: 'gcr.io/cloud-builders/docker', args: ['push', repoName] },
          { 
            name: 'gcr.io/google.com/cloudsdktool/cloud-sdk', 
            entrypoint: 'gcloud', 
            args: ['run', 'deploy', serviceName, '--image', repoName, '--platform', 'managed', '--region', region, '--allow-unauthenticated'] 
          }
        ]
      }
    });
    const buildId = operation.metadata?.build?.id;
    const deployInfo = { id: buildId, status: 'WORKING', serviceName, region, createdAt: Date.now() };
    
    await db.collection('versions').doc(verId).update({ lastBuild: deployInfo });
    await db.collection('deployments').doc(verId).set({
      ...deployInfo, projectId: verId, userId: req.user.id, versionId: verId
    });

    res.json({ buildId });
  } catch (err) {
    res.status(500).send('Build failed');
  }
});

app.get('/api/deploy/status/:buildId', authenticate, async (req: any, res) => {
  const snapshot = await db.collection('deployments').where('userId', '==', req.user.id).where('id', '==', req.params.buildId).get();
  if (snapshot.empty) return res.status(404).send('Not found');
  const [build] = await buildClient.getBuild({ id: req.params.buildId, projectId: PROJECT_ID! });
  res.json({ status: build.status });
});

app.post('/api/versions/:versionId/files', authenticate, async (req: any, res) => {
  if (!BUCKET_NAME) return res.status(500).send("GCS_BUCKET_NAME not configured.");
  const { versionId } = req.params;
  const check = await verifyOwner(req, 'versions', versionId);
  if (check.status !== 200) return res.status(check.status).send(check.message);
  const { source, dist } = req.body;
  if (source?.files) await uploadFileTree(BUCKET_NAME, `versions/${versionId}/source`, source.files);
  if (dist?.files) await uploadFileTree(BUCKET_NAME, `versions/${versionId}/dist`, dist.files);
  await db.collection('versions').doc(versionId).update({ filesStored: true });
  res.json({ ok: true });
});

app.get('/api/versions/:id', authenticate, async (req: any, res) => {
  const check = await verifyOwner(req, 'versions', req.params.id);
  if (check.status !== 200) return res.status(check.status).send(check.message);
  res.json(check.data);
});

// --- ADMIN API ROUTES ---

app.get('/api/admin/summary', authenticate, requireAdmin, async (req, res) => {
  const users = await db.collection('users').get();
  const ledger = await db.collection('token_ledger').get();
  const deploys = await db.collection('deployments').get();
  
  let totalCost = 0;
  let totalTokens = 0;
  ledger.forEach(doc => {
    const d = doc.data();
    totalCost += d.providerCostUSD || 0;
    totalTokens += d.totalTokens || 0;
  });

  // Mock revenue based on active plans
  const totalRevenue = users.docs.length * 19; // Simplified

  res.json({
    totalRevenue,
    totalCost,
    grossMargin: totalRevenue - totalCost,
    totalTokens,
    userCount: users.size,
    deployCount: deploys.size
  });
});

app.get('/api/admin/users', authenticate, requireAdmin, async (req, res) => {
  const snapshot = await db.collection('users').get();
  res.json(snapshot.docs.map(doc => doc.data()));
});

app.patch('/api/admin/users/:uid', authenticate, requireAdmin, async (req, res) => {
  const { uid } = req.params;
  const updates = req.body;
  await db.collection('users').doc(uid).update(updates);
  await logAudit(req, 'UPDATE_USER', uid, JSON.stringify(updates));
  res.json({ ok: true });
});

app.get('/api/admin/plans', authenticate, requireAdmin, async (req, res) => {
  const snapshot = await db.collection('plans').get();
  res.json(snapshot.docs.map(doc => doc.data()));
});

app.post('/api/admin/plans', authenticate, requireAdmin, async (req, res) => {
  const plan = req.body;
  const ref = db.collection('plans').doc();
  const newPlan = { ...plan, id: ref.id };
  await ref.set(newPlan);
  await logAudit(req, 'CREATE_PLAN', newPlan.id, JSON.stringify(newPlan));
  res.json(newPlan);
});

app.patch('/api/admin/plans/:id', authenticate, requireAdmin, async (req, res) => {
  await db.collection('plans').doc(req.params.id).update(req.body);
  await logAudit(req, 'UPDATE_PLAN', req.params.id, JSON.stringify(req.body));
  res.json({ ok: true });
});

app.get('/api/admin/ledger', authenticate, requireAdmin, async (req, res) => {
  const snapshot = await db.collection('token_ledger').orderBy('timestamp', 'desc').limit(200).get();
  res.json(snapshot.docs.map(doc => doc.data()));
});

app.get('/api/admin/audit', authenticate, requireAdmin, async (req, res) => {
  const snapshot = await db.collection('audit_logs').orderBy('timestamp', 'desc').limit(200).get();
  res.json(snapshot.docs.map(doc => doc.data()));
});

app.get('/api/admin/settings', authenticate, requireAdmin, async (req, res) => {
  const doc = await db.collection('systemSettings').doc('global').get();
  res.json(doc.exists ? doc.data() : { defaultModel: 'gemini-3-flash-preview', reasoningModel: 'gemini-3-pro-preview' });
});

app.patch('/api/admin/settings', authenticate, requireAdmin, async (req, res) => {
  await db.collection('systemSettings').doc('global').set(req.body, { merge: true });
  await logAudit(req, 'UPDATE_SETTINGS', 'global', JSON.stringify(req.body));
  res.json({ ok: true });
});

app.get('/api/admin/deploys', authenticate, requireAdmin, async (req: any, res) => {
  const snapshot = await db.collection('deployments').orderBy('createdAt', 'desc').get();
  res.json(snapshot.docs.map(doc => doc.data()));
});

// Serve frontend
const distPath = path.join(process.cwd(), 'dist');
app.use(express.static(distPath));
app.get('*', (req, res) => {
  const indexPath = path.join(distPath, 'index.html');
  res.sendFile(indexPath);
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`DGBP Backend listening on port ${PORT}`);
});

function getSchemaForStage(stage: string) {
  switch(stage) {
    case 'Strategy blueprint':
      return { type: Type.OBJECT, properties: { niche: { type: Type.STRING }, icp: { type: Type.STRING }, offer: { type: Type.STRING }, pricing: { type: Type.STRING }, valueProp: { type: Type.STRING } }, required: ["niche", "icp", "offer", "valueProp"] };
    case 'Brand kit':
      return { type: Type.OBJECT, properties: { name: { type: Type.STRING }, tagline: { type: Type.STRING }, colors: { type: Type.OBJECT, properties: { primary: { type: Type.STRING }, background: { type: Type.STRING } } }, fonts: { type: Type.OBJECT, properties: { heading: { type: Type.STRING }, body: { type: Type.STRING } } } }, required: ["name", "colors", "fonts"] };
    case 'Build + Validate':
      return { type: Type.OBJECT, properties: { isValid: { type: Type.BOOLEAN }, errors: { type: Type.ARRAY, items: { type: Type.STRING } }, score: { type: Type.NUMBER } }, required: ["isValid", "score"] };
    default:
      return { type: Type.OBJECT, properties: { data: { type: Type.STRING } } };
  }
}
