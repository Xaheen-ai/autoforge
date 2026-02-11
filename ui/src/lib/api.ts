/**
 * API Client for the Autonomous Coding UI
 */

import type {
  ProjectSummary,
  ProjectDetail,
  ProjectPrompts,
  ProjectSettingsUpdate,
  FeatureListResponse,
  Feature,
  FeatureCreate,
  FeatureUpdate,
  FeatureBulkCreate,
  FeatureBulkCreateResponse,
  DependencyGraph,
  AgentStatusResponse,
  AgentActionResponse,
  SetupStatus,
  DirectoryListResponse,
  PathValidationResponse,
  AssistantConversation,
  AssistantConversationDetail,
  Settings,
  SettingsUpdate,
  ModelsResponse,
  ProvidersResponse,
  DevServerStatusResponse,
  DevServerConfig,
  TerminalInfo,
  Schedule,
  ScheduleCreate,
  ScheduleUpdate,
  ScheduleListResponse,
  NextRunResponse,
} from './types'

const API_BASE = '/api'

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }))
    throw new Error(error.detail || `HTTP ${response.status}`)
  }

  // Handle 204 No Content responses
  if (response.status === 204) {
    return undefined as T
  }

  return response.json()
}

// ============================================================================
// Projects API
// ============================================================================

export async function listProjects(): Promise<ProjectSummary[]> {
  return fetchJSON('/projects')
}

export async function createProject(
  name: string,
  path: string,
  specMethod: 'claude' | 'manual' = 'manual'
): Promise<ProjectSummary> {
  return fetchJSON('/projects', {
    method: 'POST',
    body: JSON.stringify({ name, path, spec_method: specMethod }),
  })
}

export async function getProject(name: string): Promise<ProjectDetail> {
  return fetchJSON(`/projects/${encodeURIComponent(name)}`)
}

export async function deleteProject(name: string): Promise<void> {
  await fetchJSON(`/projects/${encodeURIComponent(name)}`, {
    method: 'DELETE',
  })
}

export async function getProjectPrompts(name: string): Promise<ProjectPrompts> {
  return fetchJSON(`/projects/${encodeURIComponent(name)}/prompts`)
}

export async function updateProjectPrompts(
  name: string,
  prompts: Partial<ProjectPrompts>
): Promise<void> {
  await fetchJSON(`/projects/${encodeURIComponent(name)}/prompts`, {
    method: 'PUT',
    body: JSON.stringify(prompts),
  })
}

export async function updateProjectSettings(
  name: string,
  settings: ProjectSettingsUpdate
): Promise<ProjectDetail> {
  return fetchJSON(`/projects/${encodeURIComponent(name)}/settings`, {
    method: 'PATCH',
    body: JSON.stringify(settings),
  })
}

export interface ResetProjectResponse {
  success: boolean
  reset_type: 'quick' | 'full'
  deleted_files: string[]
  message: string
}

export async function resetProject(
  name: string,
  fullReset: boolean = false
): Promise<ResetProjectResponse> {
  const params = fullReset ? '?full_reset=true' : ''
  return fetchJSON(`/projects/${encodeURIComponent(name)}/reset${params}`, {
    method: 'POST',
  })
}

export interface ConvexInitResponse {
  success: boolean
  message: string
  convex_url?: string
  convex_deployment?: string
  project_id?: string
}

export async function initializeConvex(projectName: string): Promise<ConvexInitResponse> {
  return fetchJSON(`/projects/${encodeURIComponent(projectName)}/initialize-convex`, {
    method: 'POST',
  })
}

// ============================================================================
// Context Management API
// ============================================================================

export interface CodebaseAnalysis {
  analyzed_at: string
  total_files: number
  total_lines: number
  languages: Record<string, number>
  structure: {
    directories: string[]
    key_files: Array<{
      path: string
      lines: number
      language: string
      description: string
    }>
  }
}

export interface ContextConfig {
  include_codebase_structure: boolean
  include_dependencies: boolean
  include_recent_changes: boolean
  max_context_size: number
}

export interface ProjectContext {
  notes: string
  codebase_analysis: CodebaseAnalysis | null
  config: ContextConfig
}

export async function getProjectContext(projectName: string): Promise<ProjectContext> {
  return fetchJSON(`/projects/${encodeURIComponent(projectName)}/context`)
}

export async function updateProjectNotes(projectName: string, notes: string): Promise<{ success: boolean; message: string }> {
  return fetchJSON(`/projects/${encodeURIComponent(projectName)}/context/notes`, {
    method: 'PUT',
    body: JSON.stringify(notes),
    headers: {
      'Content-Type': 'application/json',
    },
  })
}

export async function analyzeCodebase(projectName: string): Promise<{ success: boolean; analysis: CodebaseAnalysis }> {
  return fetchJSON(`/projects/${encodeURIComponent(projectName)}/context/analyze`, {
    method: 'POST',
  })
}

export async function updateContextConfig(
  projectName: string,
  config: Partial<ContextConfig>
): Promise<{ success: boolean; message: string }> {
  return fetchJSON(`/projects/${encodeURIComponent(projectName)}/context/config`, {
    method: 'PUT',
    body: JSON.stringify(config),
  })
}

// ============================================================================
// Features API
// ============================================================================

export async function listFeatures(projectName: string): Promise<FeatureListResponse> {
  return fetchJSON(`/projects/${encodeURIComponent(projectName)}/features`)
}

export async function createFeature(projectName: string, feature: FeatureCreate): Promise<Feature> {
  return fetchJSON(`/projects/${encodeURIComponent(projectName)}/features`, {
    method: 'POST',
    body: JSON.stringify(feature),
  })
}

export async function getFeature(projectName: string, featureId: number): Promise<Feature> {
  return fetchJSON(`/projects/${encodeURIComponent(projectName)}/features/${featureId}`)
}

export async function deleteFeature(projectName: string, featureId: number): Promise<void> {
  await fetchJSON(`/projects/${encodeURIComponent(projectName)}/features/${featureId}`, {
    method: 'DELETE',
  })
}

export async function skipFeature(projectName: string, featureId: number): Promise<void> {
  await fetchJSON(`/projects/${encodeURIComponent(projectName)}/features/${featureId}/skip`, {
    method: 'PATCH',
  })
}

export async function updateFeature(
  projectName: string,
  featureId: number,
  update: FeatureUpdate
): Promise<Feature> {
  return fetchJSON(`/projects/${encodeURIComponent(projectName)}/features/${featureId}`, {
    method: 'PATCH',
    body: JSON.stringify(update),
  })
}

export async function createFeaturesBulk(
  projectName: string,
  bulk: FeatureBulkCreate
): Promise<FeatureBulkCreateResponse> {
  return fetchJSON(`/projects/${encodeURIComponent(projectName)}/features/bulk`, {
    method: 'POST',
    body: JSON.stringify(bulk),
  })
}

// ============================================================================
// Dependency Graph API
// ============================================================================

export async function getDependencyGraph(projectName: string): Promise<DependencyGraph> {
  return fetchJSON(`/projects/${encodeURIComponent(projectName)}/features/graph`)
}

export async function addDependency(
  projectName: string,
  featureId: number,
  dependencyId: number
): Promise<{ success: boolean; feature_id: number; dependencies: number[] }> {
  return fetchJSON(
    `/projects/${encodeURIComponent(projectName)}/features/${featureId}/dependencies/${dependencyId}`,
    { method: 'POST' }
  )
}

export async function removeDependency(
  projectName: string,
  featureId: number,
  dependencyId: number
): Promise<{ success: boolean; feature_id: number; dependencies: number[] }> {
  return fetchJSON(
    `/projects/${encodeURIComponent(projectName)}/features/${featureId}/dependencies/${dependencyId}`,
    { method: 'DELETE' }
  )
}

export async function setDependencies(
  projectName: string,
  featureId: number,
  dependencyIds: number[]
): Promise<{ success: boolean; feature_id: number; dependencies: number[] }> {
  return fetchJSON(
    `/projects/${encodeURIComponent(projectName)}/features/${featureId}/dependencies`,
    {
      method: 'PUT',
      body: JSON.stringify({ dependency_ids: dependencyIds }),
    }
  )
}

// ============================================================================
// Agent API
// ============================================================================

export async function getAgentStatus(projectName: string): Promise<AgentStatusResponse> {
  return fetchJSON(`/projects/${encodeURIComponent(projectName)}/agent/status`)
}

export async function startAgent(
  projectName: string,
  options: {
    yoloMode?: boolean
    parallelMode?: boolean
    maxConcurrency?: number
    testingAgentRatio?: number
  } = {}
): Promise<AgentActionResponse> {
  return fetchJSON(`/projects/${encodeURIComponent(projectName)}/agent/start`, {
    method: 'POST',
    body: JSON.stringify({
      yolo_mode: options.yoloMode ?? false,
      parallel_mode: options.parallelMode ?? false,
      max_concurrency: options.maxConcurrency,
      testing_agent_ratio: options.testingAgentRatio,
    }),
  })
}

export async function stopAgent(projectName: string): Promise<AgentActionResponse> {
  return fetchJSON(`/projects/${encodeURIComponent(projectName)}/agent/stop`, {
    method: 'POST',
  })
}

export async function pauseAgent(projectName: string): Promise<AgentActionResponse> {
  return fetchJSON(`/projects/${encodeURIComponent(projectName)}/agent/pause`, {
    method: 'POST',
  })
}

export async function resumeAgent(projectName: string): Promise<AgentActionResponse> {
  return fetchJSON(`/projects/${encodeURIComponent(projectName)}/agent/resume`, {
    method: 'POST',
  })
}

// ============================================================================
// Spec Creation API
// ============================================================================

export interface SpecFileStatus {
  exists: boolean
  status: 'complete' | 'in_progress' | 'not_started' | 'error' | 'unknown'
  feature_count: number | null
  timestamp: string | null
  files_written: string[]
}

export async function getSpecStatus(projectName: string): Promise<SpecFileStatus> {
  return fetchJSON(`/spec/status/${encodeURIComponent(projectName)}`)
}

// ============================================================================
// Setup API
// ============================================================================

export async function getSetupStatus(): Promise<SetupStatus> {
  return fetchJSON('/setup/status')
}

export async function healthCheck(): Promise<{ status: string }> {
  return fetchJSON('/health')
}

// ============================================================================
// Filesystem API
// ============================================================================

export async function listDirectory(path?: string): Promise<DirectoryListResponse> {
  const params = path ? `?path=${encodeURIComponent(path)}` : ''
  return fetchJSON(`/filesystem/list${params}`)
}

export async function createDirectory(fullPath: string): Promise<{ success: boolean; path: string }> {
  // Backend expects { parent_path, name }, not { path }
  // Split the full path into parent directory and folder name

  // Remove trailing slash if present
  const normalizedPath = fullPath.endsWith('/') ? fullPath.slice(0, -1) : fullPath

  // Find the last path separator
  const lastSlash = normalizedPath.lastIndexOf('/')

  let parentPath: string
  let name: string

  // Handle Windows drive root (e.g., "C:/newfolder")
  if (lastSlash === 2 && /^[A-Za-z]:/.test(normalizedPath)) {
    // Path like "C:/newfolder" - parent is "C:/"
    parentPath = normalizedPath.substring(0, 3) // "C:/"
    name = normalizedPath.substring(3)
  } else if (lastSlash > 0) {
    parentPath = normalizedPath.substring(0, lastSlash)
    name = normalizedPath.substring(lastSlash + 1)
  } else if (lastSlash === 0) {
    // Unix root path like "/newfolder"
    parentPath = '/'
    name = normalizedPath.substring(1)
  } else {
    // No slash - invalid path
    throw new Error('Invalid path: must be an absolute path')
  }

  if (!name) {
    throw new Error('Invalid path: directory name is empty')
  }

  return fetchJSON('/filesystem/create-directory', {
    method: 'POST',
    body: JSON.stringify({ parent_path: parentPath, name }),
  })
}

export async function validatePath(path: string): Promise<PathValidationResponse> {
  return fetchJSON('/filesystem/validate', {
    method: 'POST',
    body: JSON.stringify({ path }),
  })
}

// ============================================================================
// Assistant Chat API
// ============================================================================

export async function listAssistantConversations(
  projectName: string
): Promise<AssistantConversation[]> {
  return fetchJSON(`/assistant/conversations/${encodeURIComponent(projectName)}`)
}

export async function getAssistantConversation(
  projectName: string,
  conversationId: number
): Promise<AssistantConversationDetail> {
  return fetchJSON(
    `/assistant/conversations/${encodeURIComponent(projectName)}/${conversationId}`
  )
}

export async function createAssistantConversation(
  projectName: string
): Promise<AssistantConversation> {
  return fetchJSON(`/assistant/conversations/${encodeURIComponent(projectName)}`, {
    method: 'POST',
  })
}

export async function deleteAssistantConversation(
  projectName: string,
  conversationId: number
): Promise<void> {
  await fetchJSON(
    `/assistant/conversations/${encodeURIComponent(projectName)}/${conversationId}`,
    { method: 'DELETE' }
  )
}

// ============================================================================
// Settings API
// ============================================================================

export async function getAvailableModels(): Promise<ModelsResponse> {
  return fetchJSON('/settings/models')
}

export async function getAvailableProviders(): Promise<ProvidersResponse> {
  return fetchJSON('/settings/providers')
}

export async function getSettings(): Promise<Settings> {
  return fetchJSON('/settings')
}

export async function updateSettings(settings: SettingsUpdate): Promise<Settings> {
  return fetchJSON('/settings', {
    method: 'PATCH',
    body: JSON.stringify(settings),
  })
}

// ============================================================================
// Dev Server API
// ============================================================================

export async function getDevServerStatus(projectName: string): Promise<DevServerStatusResponse> {
  return fetchJSON(`/projects/${encodeURIComponent(projectName)}/devserver/status`)
}

export async function startDevServer(
  projectName: string,
  command?: string
): Promise<{ success: boolean; message: string }> {
  return fetchJSON(`/projects/${encodeURIComponent(projectName)}/devserver/start`, {
    method: 'POST',
    body: JSON.stringify({ command }),
  })
}

export async function stopDevServer(
  projectName: string
): Promise<{ success: boolean; message: string }> {
  return fetchJSON(`/projects/${encodeURIComponent(projectName)}/devserver/stop`, {
    method: 'POST',
  })
}

export async function getDevServerConfig(projectName: string): Promise<DevServerConfig> {
  return fetchJSON(`/projects/${encodeURIComponent(projectName)}/devserver/config`)
}

export async function updateDevServerConfig(
  projectName: string,
  customCommand: string | null
): Promise<DevServerConfig> {
  return fetchJSON(`/projects/${encodeURIComponent(projectName)}/devserver/config`, {
    method: 'PATCH',
    body: JSON.stringify({ custom_command: customCommand }),
  })
}

// ============================================================================
// Terminal API
// ============================================================================

export async function listTerminals(projectName: string): Promise<TerminalInfo[]> {
  return fetchJSON(`/terminal/${encodeURIComponent(projectName)}`)
}

export async function createTerminal(
  projectName: string,
  name?: string
): Promise<TerminalInfo> {
  return fetchJSON(`/terminal/${encodeURIComponent(projectName)}`, {
    method: 'POST',
    body: JSON.stringify({ name: name ?? null }),
  })
}

export async function renameTerminal(
  projectName: string,
  terminalId: string,
  name: string
): Promise<TerminalInfo> {
  return fetchJSON(`/terminal/${encodeURIComponent(projectName)}/${terminalId}`, {
    method: 'PATCH',
    body: JSON.stringify({ name }),
  })
}

export async function deleteTerminal(
  projectName: string,
  terminalId: string
): Promise<void> {
  await fetchJSON(`/terminal/${encodeURIComponent(projectName)}/${terminalId}`, {
    method: 'DELETE',
  })
}

// ============================================================================
// Schedule API
// ============================================================================

export async function listSchedules(projectName: string): Promise<ScheduleListResponse> {
  return fetchJSON(`/projects/${encodeURIComponent(projectName)}/schedules`)
}

export async function createSchedule(
  projectName: string,
  schedule: ScheduleCreate
): Promise<Schedule> {
  return fetchJSON(`/projects/${encodeURIComponent(projectName)}/schedules`, {
    method: 'POST',
    body: JSON.stringify(schedule),
  })
}

export async function getSchedule(
  projectName: string,
  scheduleId: number
): Promise<Schedule> {
  return fetchJSON(`/projects/${encodeURIComponent(projectName)}/schedules/${scheduleId}`)
}

export async function updateSchedule(
  projectName: string,
  scheduleId: number,
  update: ScheduleUpdate
): Promise<Schedule> {
  return fetchJSON(`/projects/${encodeURIComponent(projectName)}/schedules/${scheduleId}`, {
    method: 'PATCH',
    body: JSON.stringify(update),
  })
}

export async function deleteSchedule(
  projectName: string,
  scheduleId: number
): Promise<void> {
  await fetchJSON(`/projects/${encodeURIComponent(projectName)}/schedules/${scheduleId}`, {
    method: 'DELETE',
  })
}

export async function getNextScheduledRun(projectName: string): Promise<NextRunResponse> {
  return fetchJSON(`/projects/${encodeURIComponent(projectName)}/schedules/next`)
}

// ============================================================================
// Ideation API
// ============================================================================

export interface Idea {
  id: string
  title: string
  description: string
  category: 'feature' | 'refactor' | 'optimization' | 'bug-fix'
  priority: 'low' | 'medium' | 'high'
  effort: 'small' | 'medium' | 'large'
  created_at: string
  saved: boolean
  saved_at?: string
  updated_at?: string
}

export interface IdeaStats {
  total: number
  by_category: Record<string, number>
  by_priority: Record<string, number>
  by_effort: Record<string, number>
}

export async function generateIdeas(projectName: string): Promise<Idea[]> {
  const response = await fetch(`${API_BASE}/projects/${projectName}/ideation/generate`, {
    method: 'POST'
  })
  if (!response.ok) throw new Error('Failed to generate ideas')
  const data = await response.json()
  return data.ideas
}

export async function getSavedIdeas(projectName: string): Promise<Idea[]> {
  const response = await fetch(`${API_BASE}/projects/${projectName}/ideation/ideas`)
  if (!response.ok) throw new Error('Failed to get saved ideas')
  const data = await response.json()
  return data.ideas
}

export async function saveIdea(projectName: string, idea: Idea): Promise<void> {
  const response = await fetch(`${API_BASE}/projects/${projectName}/ideation/ideas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idea })
  })
  if (!response.ok) throw new Error('Failed to save idea')
}

export async function deleteIdea(projectName: string, ideaId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/projects/${projectName}/ideation/ideas/${ideaId}`, {
    method: 'DELETE'
  })
  if (!response.ok) throw new Error('Failed to delete idea')
}

export async function getIdeaStats(projectName: string): Promise<IdeaStats> {
  const response = await fetch(`${API_BASE}/projects/${projectName}/ideation/stats`)
  if (!response.ok) throw new Error('Failed to get idea stats')
  return response.json()
}

// ============================================================================
// Roadmap API
// ============================================================================

export interface RoadmapFeature {
  id: string
  title: string
  description: string
  priority: number
  effort: 'small' | 'medium' | 'large'
  status: 'planned' | 'in-progress' | 'completed'
  dependencies: string[]
  milestone: string
  estimated_days: number
  created_at?: string
  updated_at?: string
  status_updated_at?: string
}

export interface RoadmapMilestone {
  name: string
  target_date: string
  features: number
}

export interface Roadmap {
  features: RoadmapFeature[]
  milestones: RoadmapMilestone[]
  generated_at?: string
  updated_at?: string
  total_estimated_days: number
}

export interface RoadmapStats {
  total_features: number
  by_status: Record<string, number>
  by_effort: Record<string, number>
  total_estimated_days: number
  milestones: number
}

export async function generateRoadmap(projectName: string, timeframe: string = '6 months'): Promise<Roadmap> {
  const response = await fetch(`${API_BASE}/projects/${projectName}/roadmap/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ timeframe })
  })
  if (!response.ok) throw new Error('Failed to generate roadmap')
  const data = await response.json()
  return data.roadmap
}

export async function getRoadmap(projectName: string): Promise<Roadmap> {
  const response = await fetch(`${API_BASE}/projects/${projectName}/roadmap`)
  if (!response.ok) throw new Error('Failed to get roadmap')
  const data = await response.json()

  // Transform backend structure to frontend structure
  // Backend: { milestones: [{ quarter, features: [...] }] }
  // Frontend: { features: [...], milestones: [...] }

  if (!data || !data.milestones) {
    return {
      features: [],
      milestones: [],
      total_estimated_days: 0
    }
  }

  // Flatten features from all milestones
  const features: RoadmapFeature[] = []
  const milestones: RoadmapMilestone[] = []

  data.milestones.forEach((milestone: any) => {
    // Add milestone info
    milestones.push({
      name: milestone.quarter,
      target_date: milestone.quarter,
      features: milestone.features?.length || 0
    })

    // Add features with milestone reference
    if (milestone.features) {
      milestone.features.forEach((feature: any) => {
        features.push({
          ...feature,
          milestone: milestone.quarter,
          priority: feature.priority === 'high' ? 3 : feature.priority === 'medium' ? 2 : 1,
          estimated_days: feature.effort === 'large' ? 10 : feature.effort === 'medium' ? 5 : 2
        })
      })
    }
  })

  return {
    features,
    milestones,
    generated_at: data.updated_at,
    updated_at: data.updated_at,
    total_estimated_days: features.reduce((sum, f) => sum + (f.estimated_days || 0), 0)
  }
}

export async function updateFeatureStatus(
  projectName: string,
  featureId: string,
  status: string
): Promise<void> {
  const response = await fetch(
    `${API_BASE}/projects/${projectName}/roadmap/features/${featureId}/status`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    }
  )
  if (!response.ok) throw new Error('Failed to update feature status')
}


export async function updateRoadmapFeature(
  projectName: string,
  featureId: string,
  updates: Partial<RoadmapFeature>
): Promise<void> {
  const response = await fetch(
    `${API_BASE}/projects/${projectName}/roadmap/features/${featureId}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    }
  )
  if (!response.ok) throw new Error('Failed to update feature')
}

export async function exportRoadmap(
  projectName: string,
  format: 'markdown' | 'json' | 'csv' = 'markdown'
): Promise<string> {
  const response = await fetch(
    `${API_BASE}/projects/${projectName}/roadmap/export?format=${format}`
  )
  if (!response.ok) throw new Error('Failed to export roadmap')
  const data = await response.json()
  return data.content
}

export async function getRoadmapStats(projectName: string): Promise<RoadmapStats> {
  const response = await fetch(`${API_BASE}/projects/${projectName}/roadmap/stats`)
  if (!response.ok) throw new Error('Failed to get roadmap stats')
  return response.json()
}
// Force rebuild
