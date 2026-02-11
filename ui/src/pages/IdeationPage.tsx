
import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    Lightbulb,
    Loader2,
    AlertCircle,
    Save,
    Trash2,
    ArrowLeft,
    Filter,
    Sparkles
} from 'lucide-react';
import {
    generateIdeas,
    getSavedIdeas,
    saveIdea,
    deleteIdea,
    getIdeaStats,
    type Idea,
    type IdeaStats
} from '../lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AIProgressModal } from '../components/AIProgressModal'

export function IdeationPage() {
    const { projectName } = useParams<{ projectName: string }>()
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const [selectedCategory, setSelectedCategory] = useState<string>('all')
    const [selectedPriority, setSelectedPriority] = useState<string>('all')
    const [showProgressModal, setShowProgressModal] = useState(false)
    const [progressStage, setProgressStage] = useState(0)
    const [progress, setProgress] = useState(0)
    const [aiThought, setAiThought] = useState('')

    // Fetch saved ideas
    const { data: savedIdeas = [], isLoading: loadingSaved } = useQuery({
        queryKey: ['saved-ideas', projectName],
        queryFn: () => projectName ? getSavedIdeas(projectName) : Promise.resolve([]),
        enabled: !!projectName
    })

    // Fetch stats
    const { data: stats } = useQuery({
        queryKey: ['idea-stats', projectName],
        queryFn: () => projectName ? getIdeaStats(projectName) : Promise.resolve({} as IdeaStats),
        enabled: !!projectName
    })

    // Generate ideas mutation
    const generateMutation = useMutation({
        mutationFn: async () => {
            if (!projectName) throw new Error('No project selected')

            // Simulate progress stages
            const stages = [
                { stage: 0, progress: 25, thought: "Scanning codebase to understand project architecture" },
                { stage: 1, progress: 50, thought: "Analyzing recent changes and project documentation" },
                { stage: 2, progress: 75, thought: "Considering UI improvements, performance optimizations, and new features" }
            ]

            // Advance through stages
            for (const { stage, progress: p, thought } of stages) {
                await new Promise(resolve => setTimeout(resolve, 800))
                setProgressStage(stage)
                setProgress(p)
                setAiThought(thought)
            }

            // Generate ideas
            const result = await generateIdeas(projectName)

            // Complete
            setProgressStage(3)
            setProgress(100)
            await new Promise(resolve => setTimeout(resolve, 1000))

            return result
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['saved-ideas', projectName] })
            setTimeout(() => setShowProgressModal(false), 1500)
        },
        onError: () => {
            setShowProgressModal(false)
        }
    })

    // Save idea mutation
    const saveMutation = useMutation({
        mutationFn: async (idea: Idea) => {
            if (!projectName) throw new Error('No project selected')
            return saveIdea(projectName, idea)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['saved-ideas', projectName] })
            queryClient.invalidateQueries({ queryKey: ['idea-stats', projectName] })
        }
    })

    // Delete idea mutation
    const deleteMutation = useMutation({
        mutationFn: async (ideaId: string) => {
            if (!projectName) throw new Error('No project selected')
            return deleteIdea(projectName, ideaId)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['saved-ideas', projectName] })
            queryClient.invalidateQueries({ queryKey: ['idea-stats', projectName] })
        }
    })

    const generatedIdeas = generateMutation.data || []

    // Filter ideas
    const filterIdeas = (ideas: Idea[]) => {
        return ideas.filter(idea => {
            const categoryMatch = selectedCategory === 'all' || idea.category === selectedCategory
            const priorityMatch = selectedPriority === 'all' || idea.priority === selectedPriority
            return categoryMatch && priorityMatch
        })
    }

    const filteredGenerated = filterIdeas(generatedIdeas)
    const filteredSaved = filterIdeas(savedIdeas)

    const getCategoryColor = (category: string) => {
        const colors: Record<string, string> = {
            feature: 'bg-blue-500',
            refactor: 'bg-purple-500',
            optimization: 'bg-green-500',
            'bug-fix': 'bg-red-500'
        }
        return colors[category] || 'bg-gray-500'
    }

    const getPriorityColor = (priority: string) => {
        const colors: Record<string, string> = {
            low: 'bg-gray-500',
            medium: 'bg-yellow-500',
            high: 'bg-orange-500'
        }
        return colors[priority] || 'bg-gray-500'
    }

    const getEffortBadge = (effort: string) => {
        const badges: Record<string, string> = {
            small: '🟢 Small',
            medium: '🟡 Medium',
            large: '🔴 Large'
        }
        return badges[effort] || effort
    }

    return (
        <div className="min-h-screen bg-background p-6">
            {/* Header */}
            <div className="max-w-7xl mx-auto mb-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate('/')}
                        >
                            <ArrowLeft className="mr-2" size={16} />
                            Back to Projects
                        </Button>
                        <div>
                            <h1 className="text-3xl font-bold flex items-center gap-2">
                                <Lightbulb className="text-yellow-500" size={32} />
                                Ideation
                            </h1>
                            <p className="text-muted-foreground">
                                AI-powered improvement suggestions for {projectName}
                            </p>
                        </div>
                    </div>
                    <Button
                        onClick={() => {
                            console.log('🔵 Generate Ideas clicked!')
                            console.log('🔵 Setting showProgressModal to true')
                            // Show modal immediately when button is clicked
                            setShowProgressModal(true)
                            setProgressStage(0)
                            setProgress(0)
                            console.log('🔵 Calling generateMutation.mutate()')
                            // Start the mutation
                            generateMutation.mutate()
                        }}
                        disabled={generateMutation.isPending}
                        size="lg"
                    >
                        {generateMutation.isPending ? (
                            <>
                                <Loader2 className="animate-spin mr-2" size={20} />
                                Generating...
                            </>
                        ) : (
                            <>
                                <Sparkles className="mr-2" size={20} />
                                Generate Ideas
                            </>
                        )}
                    </Button>
                </div>

                {/* Stats */}
                {stats && stats.total > 0 && (
                    <div className="grid grid-cols-4 gap-4 mb-6">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium">Total Ideas</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats.total}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium">High Priority</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats.by_priority?.high || 0}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium">Features</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats.by_category?.feature || 0}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium">Optimizations</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats.by_category?.optimization || 0}</div>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto">
                <Tabs defaultValue="generated" className="w-full">
                    <TabsList className="grid w-full max-w-md grid-cols-2">
                        <TabsTrigger value="generated">
                            <Sparkles className="mr-2" size={16} />
                            Generated Ideas ({filteredGenerated.length})
                        </TabsTrigger>
                        <TabsTrigger value="saved">
                            <Save className="mr-2" size={16} />
                            Saved Ideas ({filteredSaved.length})
                        </TabsTrigger>
                    </TabsList>

                    {/* Filters */}
                    <div className="flex gap-4 my-4">
                        <div className="flex items-center gap-2">
                            <Filter size={16} />
                            <select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                className="px-3 py-1 border rounded-md"
                            >
                                <option value="all">All Categories</option>
                                <option value="feature">Feature</option>
                                <option value="refactor">Refactor</option>
                                <option value="optimization">Optimization</option>
                                <option value="bug-fix">Bug Fix</option>
                            </select>
                        </div>
                        <div className="flex items-center gap-2">
                            <select
                                value={selectedPriority}
                                onChange={(e) => setSelectedPriority(e.target.value)}
                                className="px-3 py-1 border rounded-md"
                            >
                                <option value="all">All Priorities</option>
                                <option value="high">High</option>
                                <option value="medium">Medium</option>
                                <option value="low">Low</option>
                            </select>
                        </div>
                    </div>

                    {/* Generated Ideas Tab */}
                    <TabsContent value="generated" className="space-y-4">
                        {generateMutation.isError && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                    {generateMutation.error instanceof Error ? generateMutation.error.message : 'Failed to generate ideas'}
                                </AlertDescription>
                            </Alert>
                        )}

                        {generateMutation.isSuccess && filteredGenerated.length === 0 && (
                            <Alert>
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                    No ideas match the current filters. Try adjusting your filter settings.
                                </AlertDescription>
                            </Alert>
                        )}

                        {!generateMutation.isSuccess && !generateMutation.isPending && (
                            <Card>
                                <CardContent className="flex flex-col items-center justify-center py-12">
                                    <Lightbulb className="text-muted-foreground mb-4" size={48} />
                                    <p className="text-muted-foreground text-center">
                                        Click "Generate Ideas" to get AI-powered improvement suggestions
                                    </p>
                                </CardContent>
                            </Card>
                        )}

                        <div className="grid gap-4">
                            {filteredGenerated.map((idea) => (
                                <IdeaCard
                                    key={idea.id}
                                    idea={idea}
                                    onSave={() => saveMutation.mutate(idea)}
                                    isSaving={saveMutation.isPending}
                                    getCategoryColor={getCategoryColor}
                                    getPriorityColor={getPriorityColor}
                                    getEffortBadge={getEffortBadge}
                                />
                            ))}
                        </div>
                    </TabsContent>

                    {/* Saved Ideas Tab */}
                    <TabsContent value="saved" className="space-y-4">
                        {loadingSaved && (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="animate-spin mr-2" size={24} />
                                <span>Loading saved ideas...</span>
                            </div>
                        )}

                        {!loadingSaved && filteredSaved.length === 0 && (
                            <Card>
                                <CardContent className="flex flex-col items-center justify-center py-12">
                                    <Save className="text-muted-foreground mb-4" size={48} />
                                    <p className="text-muted-foreground text-center">
                                        No saved ideas yet. Generate some ideas and save the ones you like!
                                    </p>
                                </CardContent>
                            </Card>
                        )}

                        <div className="grid gap-4">
                            {filteredSaved.map((idea) => (
                                <IdeaCard
                                    key={idea.id}
                                    idea={idea}
                                    onDelete={() => deleteMutation.mutate(idea.id)}
                                    isDeleting={deleteMutation.isPending}
                                    getCategoryColor={getCategoryColor}
                                    getPriorityColor={getPriorityColor}
                                    getEffortBadge={getEffortBadge}
                                    isSaved
                                />
                            ))}
                        </div>
                    </TabsContent>
                </Tabs>
            </div>

            {/* AI Progress Modal */}
            <AIProgressModal
                isOpen={showProgressModal}
                operation="ideation"
                currentStage={progressStage}
                progress={progress}
                aiThought={aiThought}
                onClose={() => setShowProgressModal(false)}
            />
        </div>
    )
}

interface IdeaCardProps {
    idea: Idea
    onSave?: () => void
    onDelete?: () => void
    isSaving?: boolean
    isDeleting?: boolean
    isSaved?: boolean
    getCategoryColor: (category: string) => string
    getPriorityColor: (priority: string) => string
    getEffortBadge: (effort: string) => string
}

function IdeaCard({
    idea,
    onSave,
    onDelete,
    isSaving,
    isDeleting,
    isSaved,
    getCategoryColor,
    getPriorityColor,
    getEffortBadge
}: IdeaCardProps) {
    return (
        <Card>
            <CardHeader>
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <CardTitle className="text-xl mb-2">{idea.title}</CardTitle>
                        <CardDescription>{idea.description}</CardDescription>
                    </div>
                    <div className="flex gap-2">
                        {isSaved ? (
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={onDelete}
                                disabled={isDeleting}
                            >
                                {isDeleting ? (
                                    <Loader2 className="animate-spin" size={16} />
                                ) : (
                                    <>
                                        <Trash2 className="mr-2" size={16} />
                                        Delete
                                    </>
                                )}
                            </Button>
                        ) : (
                            <Button
                                variant="default"
                                size="sm"
                                onClick={onSave}
                                disabled={isSaving}
                            >
                                {isSaving ? (
                                    <Loader2 className="animate-spin" size={16} />
                                ) : (
                                    <>
                                        <Save className="mr-2" size={16} />
                                        Save
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex gap-2 flex-wrap">
                    <Badge className={getCategoryColor(idea.category)}>
                        {idea.category}
                    </Badge>
                    <Badge className={getPriorityColor(idea.priority)}>
                        {idea.priority} priority
                    </Badge>
                    <Badge variant="outline">
                        {getEffortBadge(idea.effort)}
                    </Badge>
                </div>
            </CardContent>
        </Card>
    )
}
