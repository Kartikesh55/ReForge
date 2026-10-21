import axios from 'axios';
import type { 
  Project, Analysis, Architecture, ImpactResult, 
  MigrationPlan, VerificationResponse 
} from '../types';

const api = axios.create({
  baseURL: '/api',
});

// Projects
export const createProject = async (data: { name: string; description?: string; source: string }) => {
  const res = await api.post<Project>('/projects', data);
  return res.data;
};

export const getProjects = async () => {
  const res = await api.get<{ projects: Project[] }>('/projects');
  return res.data.projects;
};

export const getProject = async (id: string) => {
  const res = await api.get<Project>(`/projects/${id}`);
  return res.data;
};

export const deleteProject = async (id: string) => {
  await api.delete(`/projects/${id}`);
};

export const uploadProjectZip = async (id: string, file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await api.post(`/projects/${id}/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

// Analysis & Architecture
export const analyzeProject = async (id: string) => {
  const res = await api.post(`/projects/${id}/analyze`);
  return res.data;
};

export const getAnalysis = async (id: string) => {
  const res = await api.get<Analysis>(`/projects/${id}/analysis`);
  return res.data;
};

export const getArchitecture = async (id: string) => {
  const res = await api.get<Architecture>(`/projects/${id}/architecture`);
  return res.data;
};

export const getImpact = async (id: string, nodeId: string) => {
  const res = await api.get<ImpactResult>(`/projects/${id}/impact/${nodeId}`);
  return res.data;
};

// Files & Code Explorer
export const getProjectFiles = async (id: string) => {
  const res = await api.get<{ files: string[] }>(`/projects/${id}/files`);
  return res.data.files;
};

export const getFileContent = async (id: string, path: string) => {
  const res = await api.get<{ path: string; content: string }>(`/projects/${id}/file-content`, {
    params: { path },
  });
  return res.data;
};

// Codebase Chat
export const getChatInitialContext = async (id: string) => {
  const res = await api.get(`/projects/${id}/chat/initial`);
  return res.data;
};

export const askCodebaseChat = async (id: string, message: string) => {
  const res = await api.post(`/projects/${id}/chat`, { message });
  return res.data;
};

export const getChatHistory = async (id: string) => {
  const res = await api.get<{ history: any[] }>(`/projects/${id}/chat/history`);
  return res.data.history;
};

// Migration Plan & Execution
export const createMigrationPlan = async (id: string, targetStack: Record<string, string>) => {
  const res = await api.post<MigrationPlan>(`/projects/${id}/migration/plan`, { target_stack: targetStack });
  return res.data;
};

export const getMigrationPlan = async (id: string) => {
  const res = await api.get<MigrationPlan>(`/projects/${id}/migration/plan`);
  return res.data;
};

export const startMigration = async (id: string, targetStack?: Record<string, string>) => {
  const res = await api.post(`/projects/${id}/migration/start`, { target_stack: targetStack });
  return res.data;
};

export const getMigrationDiff = async (id: string, component: string = 'order') => {
  const res = await api.get(`/projects/${id}/migration/diff`, { params: { component } });
  return res.data;
};

export const getDownloadTargetUrl = (id: string) => {
  return `/api/projects/${id}/download`;
};

// Behavioral Verification
export const startVerification = async (id: string, autoRepair: boolean = true) => {
  const res = await api.post(`/projects/${id}/verification/run`, { auto_repair: autoRepair });
  return res.data;
};

export const getVerificationResults = async (id: string) => {
  const res = await api.get<VerificationResponse>(`/projects/${id}/verification/results`);
  return res.data;
};

// Comprehensive Report
export const getFullReport = async (id: string) => {
  const res = await api.get<{ markdown: string; summary: any }>(`/projects/${id}/report`);
  return res.data;
};

// Quick Demo Project Generator
export const createDemoProject = async () => {
  const res = await api.post<Project>('/projects', {
    name: 'Legacy Order System (Golden Demo)',
    description: 'E-commerce API with Node.js, Express, Mongoose, and Jest',
    source: 'demo',
  });
  return res.data;
};
