/**
 * Git API Client
 *
 * Functions for interacting with the Git integration endpoints.
 */

import type { GitRepoInfo, GitActionResponse } from './types'

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

  if (response.status === 204) {
    return undefined as T
  }

  return response.json()
}

// ============================================================================
// Git API
// ============================================================================

export async function getGitInfo(projectName: string): Promise<GitRepoInfo> {
  return fetchJSON(`/projects/${encodeURIComponent(projectName)}/git/info`)
}

export async function initGitRepo(
  projectName: string,
  branch?: string
): Promise<GitActionResponse> {
  return fetchJSON(`/projects/${encodeURIComponent(projectName)}/git/init`, {
    method: 'POST',
    body: JSON.stringify({ default_branch: branch ?? 'main' }),
  })
}

export async function configureRemote(
  projectName: string,
  url: string,
  token?: string
): Promise<GitActionResponse> {
  return fetchJSON(`/projects/${encodeURIComponent(projectName)}/git/remote`, {
    method: 'POST',
    body: JSON.stringify({ remote_url: url, token: token || undefined }),
  })
}
