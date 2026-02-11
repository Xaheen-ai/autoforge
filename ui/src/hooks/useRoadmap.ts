import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getRoadmap, generateRoadmap as apiGenerateRoadmap } from '../lib/api'

export function useRoadmap(projectName: string | null) {
    const queryClient = useQueryClient()

    // Generate roadmap mutation
    const generateMutation = useMutation({
        mutationFn: async (timeframe: string) => {
            if (!projectName) throw new Error('No project selected')
            return apiGenerateRoadmap(projectName, timeframe)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['roadmap', projectName] })
        },
    })

    // Get roadmap query
    const roadmapQuery = useQuery({
        queryKey: ['roadmap', projectName],
        queryFn: async () => {
            if (!projectName) return null
            return getRoadmap(projectName)
        },
        enabled: !!projectName,
    })

    return {
        roadmap: roadmapQuery.data || null,
        isLoading: roadmapQuery.isLoading,
        error: roadmapQuery.error,

        generateRoadmap: generateMutation.mutate,
        generateRoadmapAsync: generateMutation.mutateAsync,
        isGenerating: generateMutation.isPending,
        generateError: generateMutation.error,
    }
}
