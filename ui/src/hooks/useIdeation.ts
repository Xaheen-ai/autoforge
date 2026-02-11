import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

interface Idea {
    id: string
    title: string
    description: string
    category: 'feature' | 'refactor' | 'optimization' | 'bug-fix'
    priority: 'high' | 'medium' | 'low'
    effort: 'small' | 'medium' | 'large'
    created_at: string
    saved: boolean
    saved_at?: string
}

interface GenerateIdeasResponse {
    success: boolean
    ideas: Idea[]
}

interface SavedIdeasResponse {
    success: boolean
    ideas: Idea[]
}

export function useIdeation(projectName: string | null) {
    const queryClient = useQueryClient()
    const [generatedIdeas, setGeneratedIdeas] = useState<Idea[]>([])

    // Generate ideas mutation
    const generateMutation = useMutation({
        mutationFn: async () => {
            if (!projectName) throw new Error('No project selected')

            const response = await fetch(`/api/projects/${projectName}/ideation/generate`, {
                method: 'POST',
            })

            if (!response.ok) {
                throw new Error('Failed to generate ideas')
            }

            return response.json() as Promise<GenerateIdeasResponse>
        },
        onSuccess: (data) => {
            setGeneratedIdeas(data.ideas)
        },
    })

    // Get saved ideas query
    const savedIdeasQuery = useQuery({
        queryKey: ['ideas', projectName, 'saved'],
        queryFn: async () => {
            if (!projectName) return { success: true, ideas: [] }

            const response = await fetch(`/api/projects/${projectName}/ideation/ideas`)

            if (!response.ok) {
                throw new Error('Failed to fetch saved ideas')
            }

            return response.json() as Promise<SavedIdeasResponse>
        },
        enabled: !!projectName,
    })

    // Save idea mutation
    const saveIdeaMutation = useMutation({
        mutationFn: async (idea: Idea) => {
            if (!projectName) throw new Error('No project selected')

            const response = await fetch(`/api/projects/${projectName}/ideation/ideas`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(idea),
            })

            if (!response.ok) {
                throw new Error('Failed to save idea')
            }

            return response.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ideas', projectName, 'saved'] })
        },
    })

    // Delete idea mutation
    const deleteIdeaMutation = useMutation({
        mutationFn: async (ideaId: string) => {
            if (!projectName) throw new Error('No project selected')

            const response = await fetch(`/api/projects/${projectName}/ideation/ideas/${ideaId}`, {
                method: 'DELETE',
            })

            if (!response.ok) {
                throw new Error('Failed to delete idea')
            }

            return response.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['ideas', projectName, 'saved'] })
        },
    })

    // Dismiss idea (remove from generated list)
    const dismissIdea = (ideaId: string) => {
        setGeneratedIdeas((prev) => prev.filter((idea) => idea.id !== ideaId))
    }

    // Save idea (move from generated to saved)
    const saveIdea = async (idea: Idea) => {
        await saveIdeaMutation.mutateAsync(idea)
        dismissIdea(idea.id)
    }

    return {
        // Generated ideas
        generatedIdeas,
        isGenerating: generateMutation.isPending,
        generateError: generateMutation.error,
        generateIdeas: generateMutation.mutate,

        // Saved ideas
        savedIdeas: savedIdeasQuery.data?.ideas || [],
        isSavedIdeasLoading: savedIdeasQuery.isLoading,
        savedIdeasError: savedIdeasQuery.error,

        // Actions
        saveIdea,
        dismissIdea,
        deleteIdea: deleteIdeaMutation.mutate,
        isSaving: saveIdeaMutation.isPending,
        isDeleting: deleteIdeaMutation.isPending,
    }
}
