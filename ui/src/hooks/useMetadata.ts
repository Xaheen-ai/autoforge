import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

/**
 * Hook for managing project metadata (ideation, context, roadmap, knowledge base)
 */

// Ideation
export function useIdeationMetadata(projectName: string) {
    const queryClient = useQueryClient()

    const { data, isLoading } = useQuery({
        queryKey: ['metadata', 'ideation', projectName],
        queryFn: async () => {
            const res = await fetch(`/api/projects/${projectName}/metadata/ideation`)
            if (!res.ok) throw new Error('Failed to fetch ideation')
            return res.json()
        },
    })

    const updateMutation = useMutation({
        mutationFn: async (content: string) => {
            const res = await fetch(`/api/projects/${projectName}/metadata/ideation`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content }),
            })
            if (!res.ok) throw new Error('Failed to update ideation')
            return res.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['metadata', 'ideation', projectName] })
        },
    })

    return {
        content: data?.content || '',
        isLoading,
        update: updateMutation.mutate,
        isUpdating: updateMutation.isPending,
    }
}

// Context
export function useContextMetadata(projectName: string) {
    const queryClient = useQueryClient()

    const { data, isLoading } = useQuery({
        queryKey: ['metadata', 'context', projectName],
        queryFn: async () => {
            const res = await fetch(`/api/projects/${projectName}/metadata/context`)
            if (!res.ok) throw new Error('Failed to fetch context')
            return res.json()
        },
    })

    const updateMutation = useMutation({
        mutationFn: async (context: any) => {
            const res = await fetch(`/api/projects/${projectName}/metadata/context`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(context),
            })
            if (!res.ok) throw new Error('Failed to update context')
            return res.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['metadata', 'context', projectName] })
        },
    })

    return {
        context: data || {},
        isLoading,
        update: updateMutation.mutate,
        isUpdating: updateMutation.isPending,
    }
}

// Knowledge Base
export function useKnowledgeBase(projectName: string) {
    const queryClient = useQueryClient()

    const { data: items, isLoading } = useQuery({
        queryKey: ['metadata', 'knowledge', projectName],
        queryFn: async () => {
            const res = await fetch(`/api/projects/${projectName}/metadata/knowledge`)
            if (!res.ok) throw new Error('Failed to fetch knowledge items')
            const json = await res.json()
            return json.items || []
        },
    })

    const getItemQuery = (filename: string) => useQuery({
        queryKey: ['metadata', 'knowledge', projectName, filename],
        queryFn: async () => {
            const res = await fetch(`/api/projects/${projectName}/metadata/knowledge/${filename}`)
            if (!res.ok) throw new Error('Failed to fetch knowledge item')
            return res.json()
        },
        enabled: !!filename,
    })

    const saveMutation = useMutation({
        mutationFn: async ({ filename, content }: { filename: string; content: string }) => {
            const res = await fetch(`/api/projects/${projectName}/metadata/knowledge/${filename}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content }),
            })
            if (!res.ok) throw new Error('Failed to save knowledge item')
            return res.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['metadata', 'knowledge', projectName] })
        },
    })

    const deleteMutation = useMutation({
        mutationFn: async (filename: string) => {
            const res = await fetch(`/api/projects/${projectName}/metadata/knowledge/${filename}`, {
                method: 'DELETE',
            })
            if (!res.ok) throw new Error('Failed to delete knowledge item')
            return res.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['metadata', 'knowledge', projectName] })
        },
    })

    return {
        items: items || [],
        isLoading,
        getItem: getItemQuery,
        save: saveMutation.mutate,
        isSaving: saveMutation.isPending,
        deleteItem: deleteMutation.mutate,
        isDeleting: deleteMutation.isPending,
    }
}

// Roadmap
export function useRoadmapMetadata(projectName: string) {
    const queryClient = useQueryClient()

    const { data, isLoading } = useQuery({
        queryKey: ['metadata', 'roadmap', projectName],
        queryFn: async () => {
            const res = await fetch(`/api/projects/${projectName}/metadata/roadmap`)
            if (!res.ok) throw new Error('Failed to fetch roadmap')
            return res.json()
        },
    })

    const updateMutation = useMutation({
        mutationFn: async (roadmap: any) => {
            const res = await fetch(`/api/projects/${projectName}/metadata/roadmap`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(roadmap),
            })
            if (!res.ok) throw new Error('Failed to update roadmap')
            return res.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['metadata', 'roadmap', projectName] })
        },
    })

    return {
        roadmap: data || { phases: [], milestones: [], currentPhase: null },
        isLoading,
        update: updateMutation.mutate,
        isUpdating: updateMutation.isPending,
    }
}
