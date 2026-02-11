import { Lightbulb, Sparkles, ArrowLeft, Filter, Save, Trash2, Plus } from 'lucide-react'
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
import { useIdeation } from '@/hooks/useIdeation'
import { useState } from 'react'
import { useCreateFeature } from '@/hooks/useProjects'

interface IdeationContentProps {
    projectName: string
    onBack: () => void
}

export function IdeationContent({ projectName, onBack }: IdeationContentProps) {
    const [activeTab, setActiveTab] = useState<'generated' | 'saved'>('generated')
    const [categoryFilter, setCategoryFilter] = useState<string>('all')
    const [priorityFilter, setPriorityFilter] = useState<string>('all')

    const {
        generatedIdeas,
        isGenerating,
        generateIdeas,
        savedIdeas,
        saveIdea,
        dismissIdea,
        deleteIdea,
        isSaving,
        isDeleting,
    } = useIdeation(projectName)

    const createFeatureMutation = useCreateFeature(projectName)

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
            high: 'bg-orange-500',
            medium: 'bg-yellow-500',
            low: 'bg-gray-500'
        }
        return colors[priority] || 'bg-gray-500'
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
        // Create feature from idea
        await createFeatureMutation.mutateAsync({
            category: idea.category,
            name: idea.title,
            description: idea.description,
            steps: [], // Will be filled in by user later
        })

        // Dismiss the idea after creating feature
        dismissIdea(idea.id)
    }

    return (
        <div className="h-full overflow-auto">
            <div className="max-w-7xl mx-auto p-8 space-y-8">
                {/* Header */}
                <div className="space-y-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onBack}
                        className="mb-2"
                    >
                        <ArrowLeft className="mr-2" size={16} />
                        Back to Kanban
                    </Button>

                    <div className="flex items-start justify-between">
                        <div className="space-y-2">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-yellow-500/10 rounded-xl flex items-center justify-center">
                                    <Lightbulb className="text-yellow-500" size={24} />
                                </div>
                                <div>
                                    <h1 className="text-3xl font-bold tracking-tight">Ideation</h1>
                                    <p className="text-muted-foreground">
                                        AI-powered improvement suggestions for {projectName}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <Button size="lg" onClick={() => generateIdeas()} disabled={isGenerating}>
                            <Sparkles className="mr-2" size={20} />
                            {isGenerating ? 'Generating...' : 'Generate Ideas'}
                        </Button>
                    </div>
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
                                    <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mb-4">
                                        <Sparkles size={32} className="text-yellow-500" />
                                    </div>
                                    <h3 className="text-lg font-semibold mb-2">
                                        {generatedIdeas.length === 0 ? 'No Ideas Generated Yet' : 'No Ideas Match Filters'}
                                    </h3>
                                    <p className="text-sm text-muted-foreground text-center max-w-md mb-6">
                                        {generatedIdeas.length === 0
                                            ? 'Click "Generate Ideas" to let AI analyze your codebase and suggest improvements across features, refactors, optimizations, and bug fixes.'
                                            : 'Try adjusting your filters to see more ideas.'}
                                    </p>
                                    {generatedIdeas.length === 0 && (
                                        <Button onClick={() => generateIdeas()} disabled={isGenerating}>
                                            <Sparkles className="mr-2" size={16} />
                                            {isGenerating ? 'Generating...' : 'Generate Ideas'}
                                        </Button>
                                    )}
                                </CardContent>
                            </Card>
                        ) : (
                            filteredGeneratedIdeas.map((idea) => (
                                <Card key={idea.id} className="hover:shadow-md transition-shadow">
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
                                                <CardDescription className="text-sm">
                                                    {idea.description}
                                                </CardDescription>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex items-center gap-2">
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
                                    <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mb-4">
                                        <Save size={32} className="text-blue-500" />
                                    </div>
                                    <h3 className="text-lg font-semibold mb-2">
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
                                <Card key={idea.id} className="hover:shadow-md transition-shadow">
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
                                                <CardDescription className="text-sm">
                                                    {idea.description}
                                                </CardDescription>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex items-center gap-2">
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
            </div>
        </div>
    )
}
