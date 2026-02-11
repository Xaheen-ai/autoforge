import { Lightbulb, Sparkles, Filter, Save, Trash2, Plus, ArrowLeft, Clock, Tag, Zap, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { AIProgressModal } from '@/components/AIProgressModal'
import { useIdeation } from '@/hooks/useIdeation'
import { useState, useEffect } from 'react'
import { useCreateFeature } from '@/hooks/useProjects'

interface IdeationContentProps {
    projectName: string
    onDetailChange?: (label: string | null) => void
    detailLabel?: string | null
}

export function IdeationContent({ projectName, onDetailChange, detailLabel }: IdeationContentProps) {
    const [activeTab, setActiveTab] = useState<'generated' | 'saved'>('generated')
    const [categoryFilter, setCategoryFilter] = useState<string>('all')
    const [priorityFilter, setPriorityFilter] = useState<string>('all')
    const [selectedIdea, setSelectedIdea] = useState<typeof generatedIdeas[0] | null>(null)

    // Progress modal state
    const [showProgress, setShowProgress] = useState(false)
    const [progressStage, setProgressStage] = useState(0)
    const [progress, setProgress] = useState(0)
    const [aiThought, setAiThought] = useState('')

    const {
        generatedIdeas,
        isGenerating,
        generateIdeasAsync,
        savedIdeas,
        saveIdea,
        dismissIdea,
        deleteIdea,
        isSaving,
        isDeleting,
    } = useIdeation(projectName)

    const createFeatureMutation = useCreateFeature(projectName)

    // Sync selectedIdea with detailLabel from parent
    useEffect(() => {
        if (detailLabel === null) {
            setSelectedIdea(null)
        }
    }, [detailLabel])

    const selectIdea = (idea: typeof generatedIdeas[0]) => {
        setSelectedIdea(idea)
        onDetailChange?.(idea.title)
    }

    const clearDetail = () => {
        setSelectedIdea(null)
        onDetailChange?.(null)
    }

    const getCategoryColor = (category: string) => {
        const colors: Record<string, string> = {
            feature: 'bg-category-7',
            refactor: 'bg-category-6',
            optimization: 'bg-category-3',
            'bug-fix': 'bg-category-1'
        }
        return colors[category] || 'bg-muted'
    }

    const getPriorityColor = (priority: string) => {
        const colors: Record<string, string> = {
            high: 'bg-warning',
            medium: 'bg-category-4',
            low: 'bg-muted'
        }
        return colors[priority] || 'bg-muted'
    }

    const getEffortLabel = (effort: string) => {
        return effort.charAt(0).toUpperCase() + effort.slice(1) + ' Effort'
    }

    // Filter ideas
    const filterIdeas = (ideas: typeof generatedIdeas) => {
        return ideas.filter((idea) => {
            if (categoryFilter !== 'all' && idea.category !== categoryFilter) return false
            if (priorityFilter !== 'all' && idea.priority !== priorityFilter) return false
            return true
        })
    }

    const filteredGeneratedIdeas = filterIdeas(generatedIdeas)
    const filteredSavedIdeas = filterIdeas(savedIdeas)

    const handleCreateFeature = async (idea: typeof generatedIdeas[0]) => {
        await createFeatureMutation.mutateAsync({
            category: idea.category,
            name: idea.title,
            description: idea.description,
            steps: [],
        })
        dismissIdea(idea.id)
    }

    const handleGenerate = async () => {
        setShowProgress(true)
        setProgressStage(0)
        setProgress(0)
        setAiThought('')

        const stages = [
            { stage: 0, progress: 25, thought: "Scanning codebase to understand project architecture" },
            { stage: 1, progress: 50, thought: "Analyzing recent changes and project documentation" },
            { stage: 2, progress: 75, thought: "Considering UI improvements, performance optimizations, and new features" }
        ]

        for (const { stage, progress: p, thought } of stages) {
            await new Promise(resolve => setTimeout(resolve, 800))
            setProgressStage(stage)
            setProgress(p)
            setAiThought(thought)
        }

        try {
            await generateIdeasAsync()
            setProgressStage(3)
            setProgress(100)
            await new Promise(resolve => setTimeout(resolve, 1200))
        } catch {
            // Error handled by mutation
        } finally {
            setShowProgress(false)
        }
    }

    // Detail page view
    if (selectedIdea) {
        return (
            <div className="space-y-6">
                {/* Page Header — matches list page style */}
                <div className="flex items-start justify-between">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-category-4/10 rounded-xl flex items-center justify-center">
                                <Lightbulb className="text-category-4" size={24} />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold tracking-tight">{selectedIdea.title}</h1>
                                <p className="text-muted-foreground">
                                    Idea details and actions
                                </p>
                            </div>
                        </div>
                    </div>

                    <Button variant="outline" onClick={clearDetail}>
                        <ArrowLeft className="mr-2" size={16} />
                        Back to Ideas
                    </Button>
                </div>

                {/* Badges */}
                <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={`${getCategoryColor(selectedIdea.category)} text-white`}>
                        {selectedIdea.category.charAt(0).toUpperCase() + selectedIdea.category.slice(1)}
                    </Badge>
                    <Badge className={`${getPriorityColor(selectedIdea.priority)} text-white`}>
                        {selectedIdea.priority.charAt(0).toUpperCase() + selectedIdea.priority.slice(1)} Priority
                    </Badge>
                    <Badge variant="outline">
                        {getEffortLabel(selectedIdea.effort)}
                    </Badge>
                </div>

                {/* Description */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Description</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground leading-relaxed">{selectedIdea.description}</p>
                    </CardContent>
                </Card>

                {/* Metadata grid */}
                <div className="grid grid-cols-3 gap-4">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                                <Tag size={14} />
                                Category
                            </div>
                            <p className="font-medium text-lg">{selectedIdea.category.charAt(0).toUpperCase() + selectedIdea.category.slice(1)}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                                <Zap size={14} />
                                Priority
                            </div>
                            <p className="font-medium text-lg">{selectedIdea.priority.charAt(0).toUpperCase() + selectedIdea.priority.slice(1)}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                                <Clock size={14} />
                                Effort
                            </div>
                            <p className="font-medium text-lg">{selectedIdea.effort.charAt(0).toUpperCase() + selectedIdea.effort.slice(1)}</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Timestamps */}
                {selectedIdea.created_at && (
                    <div className="text-sm text-muted-foreground">
                        Created {new Date(selectedIdea.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                        {selectedIdea.saved_at && (
                            <> &middot; Saved {new Date(selectedIdea.saved_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</>
                        )}
                    </div>
                )}

                {/* Actions */}
                <Card>
                    <CardContent className="flex items-center gap-3 py-4">
                        <Button onClick={() => { saveIdea(selectedIdea); clearDetail() }} disabled={isSaving}>
                            <Save className="mr-2" size={16} />
                            Save Idea
                        </Button>
                        <Button variant="outline" onClick={() => { handleCreateFeature(selectedIdea); clearDetail() }}>
                            <Plus className="mr-2" size={16} />
                            Create Feature
                        </Button>
                        <Button variant="ghost" onClick={() => { dismissIdea(selectedIdea.id); clearDetail() }}>
                            <Trash2 className="mr-2" size={16} />
                            Dismiss
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <>
            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-category-4/10 rounded-xl flex items-center justify-center">
                            <Lightbulb className="text-category-4" size={24} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">Ideation</h1>
                            <p className="text-muted-foreground">
                                AI-powered improvement suggestions for {projectName}
                            </p>
                        </div>
                    </div>
                </div>

                <Button size="lg" onClick={handleGenerate} disabled={isGenerating}>
                    <Sparkles className="mr-2" size={20} />
                    {isGenerating ? 'Generating...' : 'Generate Ideas'}
                </Button>
            </div>

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
                    <div className="flex items-center justify-between mb-6">
                        <TabsList>
                            <TabsTrigger value="generated">
                                Generated ({filteredGeneratedIdeas.length})
                            </TabsTrigger>
                            <TabsTrigger value="saved">
                                Saved ({filteredSavedIdeas.length})
                            </TabsTrigger>
                        </TabsList>

                        {/* Filters */}
                        <div className="flex items-center gap-2">
                            <Filter size={16} className="text-muted-foreground" />
                            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                <SelectTrigger className="w-[160px]">
                                    <SelectValue placeholder="Category" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Categories</SelectItem>
                                    <SelectItem value="feature">Features</SelectItem>
                                    <SelectItem value="refactor">Refactors</SelectItem>
                                    <SelectItem value="optimization">Optimizations</SelectItem>
                                    <SelectItem value="bug-fix">Bug Fixes</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                                <SelectTrigger className="w-[140px]">
                                    <SelectValue placeholder="Priority" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Priority</SelectItem>
                                    <SelectItem value="high">High</SelectItem>
                                    <SelectItem value="medium">Medium</SelectItem>
                                    <SelectItem value="low">Low</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <TabsContent value="generated" className="space-y-4">
                        {filteredGeneratedIdeas.length === 0 ? (
                            <Card className="border-dashed">
                                <CardContent className="flex flex-col items-center justify-center py-16">
                                    <div className="w-24 h-24 bg-gradient-to-br from-category-4/15 to-category-4/5 rounded-full flex items-center justify-center mb-6 animate-pulse ring-1 ring-category-4/10">
                                        <Sparkles size={44} className="text-category-4" />
                                    </div>
                                    <h3 className="text-2xl font-semibold mb-3">
                                        {generatedIdeas.length === 0 ? 'No Ideas Generated Yet' : 'No Ideas Match Filters'}
                                    </h3>
                                    <p className="text-sm text-muted-foreground text-center max-w-md mb-6">
                                        {generatedIdeas.length === 0
                                            ? 'Click "Generate Ideas" to let AI analyze your codebase and suggest improvements across features, refactors, optimizations, and bug fixes.'
                                            : 'Try adjusting your filters to see more ideas.'}
                                    </p>
                                    {generatedIdeas.length === 0 && (
                                        <Button onClick={handleGenerate} disabled={isGenerating}>
                                            <Sparkles className="mr-2" size={16} />
                                            {isGenerating ? 'Generating...' : 'Generate Ideas'}
                                        </Button>
                                    )}
                                </CardContent>
                            </Card>
                        ) : (
                            filteredGeneratedIdeas.map((idea) => (
                                <Card
                                    key={idea.id}
                                    className="cursor-pointer transition-colors hover:bg-accent/50"
                                    onClick={() => selectIdea(idea)}
                                >
                                    <CardHeader>
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1 space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <Badge className={`${getCategoryColor(idea.category)} text-white text-xs`}>
                                                        {idea.category.charAt(0).toUpperCase() + idea.category.slice(1)}
                                                    </Badge>
                                                    <Badge className={`${getPriorityColor(idea.priority)} text-white text-xs`}>
                                                        {idea.priority.charAt(0).toUpperCase() + idea.priority.slice(1)} Priority
                                                    </Badge>
                                                    <Badge variant="outline" className="text-xs">
                                                        {getEffortLabel(idea.effort)}
                                                    </Badge>
                                                </div>
                                                <CardTitle className="text-xl">{idea.title}</CardTitle>
                                                <CardDescription className="text-sm line-clamp-2">
                                                    {idea.description}
                                                </CardDescription>
                                            </div>
                                            <ChevronRight size={20} className="text-muted-foreground mt-1 shrink-0" />
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                            <Button
                                                size="sm"
                                                variant="default"
                                                onClick={() => saveIdea(idea)}
                                                disabled={isSaving}
                                            >
                                                <Save className="mr-2" size={14} />
                                                Save
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleCreateFeature(idea)}
                                            >
                                                <Plus className="mr-2" size={14} />
                                                Create Feature
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => dismissIdea(idea.id)}
                                            >
                                                <Trash2 className="mr-2" size={14} />
                                                Dismiss
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </TabsContent>

                    <TabsContent value="saved" className="space-y-4">
                        {filteredSavedIdeas.length === 0 ? (
                            <Card className="border-dashed">
                                <CardContent className="flex flex-col items-center justify-center py-16">
                                    <div className="w-24 h-24 bg-gradient-to-br from-category-7/15 to-category-7/5 rounded-full flex items-center justify-center mb-6 animate-pulse ring-1 ring-category-7/10">
                                        <Save size={44} className="text-category-7" />
                                    </div>
                                    <h3 className="text-2xl font-semibold mb-3">
                                        {savedIdeas.length === 0 ? 'No Saved Ideas' : 'No Ideas Match Filters'}
                                    </h3>
                                    <p className="text-sm text-muted-foreground text-center max-w-md">
                                        {savedIdeas.length === 0
                                            ? 'Save ideas from the Generated tab to keep track of improvements you want to implement.'
                                            : 'Try adjusting your filters to see more ideas.'}
                                    </p>
                                </CardContent>
                            </Card>
                        ) : (
                            filteredSavedIdeas.map((idea) => (
                                <Card
                                    key={idea.id}
                                    className="cursor-pointer transition-colors hover:bg-accent/50"
                                    onClick={() => selectIdea(idea)}
                                >
                                    <CardHeader>
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1 space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <Badge className={`${getCategoryColor(idea.category)} text-white text-xs`}>
                                                        {idea.category.charAt(0).toUpperCase() + idea.category.slice(1)}
                                                    </Badge>
                                                    <Badge className={`${getPriorityColor(idea.priority)} text-white text-xs`}>
                                                        {idea.priority.charAt(0).toUpperCase() + idea.priority.slice(1)} Priority
                                                    </Badge>
                                                    <Badge variant="outline" className="text-xs">
                                                        {getEffortLabel(idea.effort)}
                                                    </Badge>
                                                </div>
                                                <CardTitle className="text-xl">{idea.title}</CardTitle>
                                                <CardDescription className="text-sm line-clamp-2">
                                                    {idea.description}
                                                </CardDescription>
                                            </div>
                                            <ChevronRight size={20} className="text-muted-foreground mt-1 shrink-0" />
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleCreateFeature(idea)}
                                            >
                                                <Plus className="mr-2" size={14} />
                                                Create Feature
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => deleteIdea(idea.id)}
                                                disabled={isDeleting}
                                            >
                                                <Trash2 className="mr-2" size={14} />
                                                Delete
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </TabsContent>
                </Tabs>

            {/* AI Progress Modal */}
            <AIProgressModal
                isOpen={showProgress}
                operation="ideation"
                currentStage={progressStage}
                progress={progress}
                aiThought={aiThought}
                onClose={() => setShowProgress(false)}
            />
        </>
    )
}
