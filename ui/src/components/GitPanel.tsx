/**
 * Git Panel Component
 *
 * Shows Git repository status for a project and provides actions to:
 * - Initialize a Git repository
 * - Add/update remote origins
 * - View current branch, remotes, and last commit
 */

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    GitBranch,
    GitCommitHorizontal,
    Globe,
    Plus,
    Loader2,
    Check,
    AlertCircle,
    ChevronDown,
    ChevronRight,
} from 'lucide-react'
import { getGitInfo, initGitRepo, configureRemote } from '../lib/git'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface GitPanelProps {
    projectName: string
}

export function GitPanel({ projectName }: GitPanelProps) {
    const [expanded, setExpanded] = useState(false)
    const [showRemoteForm, setShowRemoteForm] = useState(false)
    const [remoteUrl, setRemoteUrl] = useState('')
    const [remoteToken, setRemoteToken] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [successMsg, setSuccessMsg] = useState<string | null>(null)

    const queryClient = useQueryClient()

    const { data: gitInfo, isLoading } = useQuery({
        queryKey: ['gitInfo', projectName],
        queryFn: () => getGitInfo(projectName),
        refetchInterval: 10000,
        enabled: !!projectName,
    })

    const initMutation = useMutation({
        mutationFn: () => initGitRepo(projectName),
        onSuccess: (data) => {
            setSuccessMsg(data.message)
            setError(null)
            queryClient.invalidateQueries({ queryKey: ['gitInfo', projectName] })
            setTimeout(() => setSuccessMsg(null), 3000)
        },
        onError: (err: Error) => setError(err.message),
    })

    const remoteMutation = useMutation({
        mutationFn: () => configureRemote(projectName, remoteUrl, remoteToken || undefined),
        onSuccess: (data) => {
            setSuccessMsg(data.message)
            setError(null)
            setRemoteUrl('')
            setRemoteToken('')
            setShowRemoteForm(false)
            queryClient.invalidateQueries({ queryKey: ['gitInfo', projectName] })
            setTimeout(() => setSuccessMsg(null), 3000)
        },
        onError: (err: Error) => setError(err.message),
    })

    const isBusy = initMutation.isPending || remoteMutation.isPending

    if (isLoading) {
        return (
            <div className="flex items-center gap-2 text-sm text-muted-foreground px-1">
                <Loader2 size={14} className="animate-spin" />
                <span>Loading Git status...</span>
            </div>
        )
    }

    if (!gitInfo) return null

    return (
        <div className="space-y-2">
            {/* Compact header — always visible */}
            <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors w-full text-left"
            >
                {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <GitBranch size={14} />
                <span>Git</span>
                {gitInfo.initialized ? (
                    <Badge variant="outline" className="text-xs py-0 px-1.5 font-normal">
                        {gitInfo.branch ?? 'main'}
                    </Badge>
                ) : (
                    <Badge variant="secondary" className="text-xs py-0 px-1.5 font-normal">
                        Not initialized
                    </Badge>
                )}
                {gitInfo.remotes && Object.keys(gitInfo.remotes).length > 0 && (
                    <Globe size={12} className="text-muted-foreground" />
                )}
            </button>

            {/* Expanded content */}
            {expanded && (
                <div className="space-y-3 pl-5 border-l-2 border-border ml-1.5">
                    {/* Not initialized — show init button */}
                    {!gitInfo.initialized && (
                        <div className="space-y-2">
                            <p className="text-xs text-muted-foreground">
                                No Git repository found for this project.
                            </p>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => initMutation.mutate()}
                                disabled={isBusy}
                                className="gap-1.5"
                            >
                                {initMutation.isPending ? (
                                    <Loader2 size={14} className="animate-spin" />
                                ) : (
                                    <Plus size={14} />
                                )}
                                Initialize Git
                            </Button>
                        </div>
                    )}

                    {/* Initialized — show details */}
                    {gitInfo.initialized && (
                        <>
                            {/* Last commit */}
                            {gitInfo.last_commit && (
                                <div className="flex items-start gap-2 text-xs">
                                    <GitCommitHorizontal size={12} className="mt-0.5 text-muted-foreground shrink-0" />
                                    <div className="min-w-0">
                                        <span className="font-mono text-muted-foreground">
                                            {gitInfo.last_commit.hash.slice(0, 7)}
                                        </span>
                                        <span className="ml-1.5 text-foreground truncate">
                                            {gitInfo.last_commit.message}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Remotes */}
                            {Object.keys(gitInfo.remotes).length > 0 && (
                                <div className="space-y-1">
                                    {Object.entries(gitInfo.remotes).map(([name, url]) => (
                                        <div key={name} className="flex items-center gap-2 text-xs">
                                            <Globe size={12} className="text-muted-foreground shrink-0" />
                                            <span className="font-semibold">{name}</span>
                                            <span className="text-muted-foreground truncate font-mono text-[11px]">
                                                {url}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Add Remote button / form */}
                            {!showRemoteForm ? (
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setShowRemoteForm(true)}
                                    disabled={isBusy}
                                    className="gap-1.5 h-7 text-xs"
                                >
                                    <Plus size={12} />
                                    {Object.keys(gitInfo.remotes).length > 0 ? 'Update Remote' : 'Add Remote'}
                                </Button>
                            ) : (
                                <div className="space-y-2">
                                    <input
                                        type="text"
                                        value={remoteUrl}
                                        onChange={(e) => setRemoteUrl(e.target.value)}
                                        placeholder="https://github.com/user/repo.git"
                                        className="w-full py-1.5 px-2.5 text-xs border rounded-md bg-background font-mono"
                                        autoFocus
                                    />
                                    <input
                                        type="password"
                                        value={remoteToken}
                                        onChange={(e) => setRemoteToken(e.target.value)}
                                        placeholder="Token (optional, for private repos)"
                                        className="w-full py-1.5 px-2.5 text-xs border rounded-md bg-background"
                                    />
                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            onClick={() => remoteMutation.mutate()}
                                            disabled={!remoteUrl.trim() || isBusy}
                                            className="h-7 text-xs"
                                        >
                                            {remoteMutation.isPending ? (
                                                <Loader2 size={12} className="animate-spin" />
                                            ) : (
                                                'Save'
                                            )}
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => {
                                                setShowRemoteForm(false)
                                                setRemoteUrl('')
                                                setRemoteToken('')
                                            }}
                                            disabled={isBusy}
                                            className="h-7 text-xs"
                                        >
                                            Cancel
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* Status messages */}
                    {successMsg && (
                        <div className="flex items-center gap-1.5 text-xs text-green-600">
                            <Check size={12} />
                            {successMsg}
                        </div>
                    )}
                    {error && (
                        <Alert variant="destructive" className="py-2">
                            <AlertCircle className="h-3 w-3" />
                            <AlertDescription className="text-xs">{error}</AlertDescription>
                        </Alert>
                    )}
                </div>
            )}
        </div>
    )
}
