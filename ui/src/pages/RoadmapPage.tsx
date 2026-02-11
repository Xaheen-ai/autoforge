import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    Map,
    Loader2,
    AlertCircle,
    ArrowLeft,
    Sparkles,
    Download,
    Calendar,
    TrendingUp,
    CheckCircle2,
    Circle,
    Clock
} from 'lucide-react'
import {
    generateRoadmap,
    getRoadmap,
    updateFeatureStatus,
    exportRoadmap,
    getRoadmapStats,
    type Roadmap,
    type RoadmapFeature,
    type RoadmapStats
} from '../lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { AIProgressModal } from '../components/AIProgressModal'

export function RoadmapPage() {
    const { projectName } = useParams<{ projectName: string }>()
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const [selectedMilestone, setSelectedMilestone] = useState<string>('all')
    const [selectedStatus, setSelectedStatus] = useState<string>('all')
    const [showProgressModal, setShowProgressModal] = useState(false)
    const [progressStage, setProgressStage] = useState(0)
    const [progress, setProgress] = useState(0)
    const [aiThought, setAiThought] = useState('')

    // Fetch roadmap
    const { data: roadmap, isLoading } = useQuery({
        queryKey: ['roadmap', projectName],
        queryFn: () => projectName ? getRoadmap(projectName) : Promise.resolve({} as Roadmap),
        enabled: !!projectName
    })

    // Fetch stats
    const { data: stats } = useQuery({
        queryKey: ['roadmap-stats', projectName],
        queryFn: () => projectName ? getRoadmapStats(projectName) : Promise.resolve({} as RoadmapStats),
        enabled: !!projectName
    })

    // Generate roadmap mutation
    const generateMutation = useMutation({
        mutationFn: async () => {
            if (!projectName) throw new Error('No project selected')

            // Show progress modal
            setShowProgressModal(true)
            setProgressStage(0)
            setProgress(0)

            // Simulate progress stages
            const stages = [
                { stage: 0, progress: 25, thought: "Scanning codebase and dependencies to understand project scope" },
                { stage: 1, progress: 50, thought: "Organizing features into quarterly milestones" },
                { stage: 2, progress: 75, thought: "Creating strategic roadmap with priorities and timelines" }
            ]

            // Advance through stages
            for (const { stage, progress: p, thought } of stages) {
                await new Promise(resolve => setTimeout(resolve, 800))
                setProgressStage(stage)
                setProgress(p)
                setAiThought(thought)
            }

            // Generate roadmap
            const result = await generateRoadmap(projectName)

            // Complete
            setProgressStage(3)
            setProgress(100)
            await new Promise(resolve => setTimeout(resolve, 1000))

            return result
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['roadmap', projectName] })
            queryClient.invalidateQueries({ queryKey: ['roadmap-stats', projectName] })
            setTimeout(() => setShowProgressModal(false), 1500)
        },
        onError: () => {
            setShowProgressModal(false)
        }
    })

    // Update feature status mutation
    const updateStatusMutation = useMutation({
        mutationFn: async ({ featureId, status }: { featureId: string; status: string }) => {
            if (!projectName) throw new Error('No project selected')
            return updateFeatureStatus(projectName, featureId, status)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['roadmap', projectName] })
            queryClient.invalidateQueries({ queryKey: ['roadmap-stats', projectName] })
        }
    })

    // Export roadmap mutation
    const exportMutation = useMutation({
        mutationFn: async (format: 'markdown' | 'json' | 'csv') => {
            if (!projectName) throw new Error('No project selected')
            return exportRoadmap(projectName, format)
        },
        onSuccess: (content, format) => {
            // Download the exported content
            const blob = new Blob([content], { type: 'text/plain' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `roadmap-${projectName}.${format === 'markdown' ? 'md' : format}`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)
        }
    })

    const features = roadmap?.features || []
    const milestones = roadmap?.milestones || []

    // Filter features
    const filteredFeatures = features.filter(feature => {
        const milestoneMatch = selectedMilestone === 'all' || feature.milestone === selectedMilestone
        const statusMatch = selectedStatus === 'all' || feature.status === selectedStatus
        return milestoneMatch && statusMatch
    })

    // Group features by milestone
    const featuresByMilestone = milestones.reduce((acc, milestone) => {
        acc[milestone.name] = filteredFeatures.filter(f => f.milestone === milestone.name)
        return acc
    }, {} as Record<string, RoadmapFeature[]>)

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed':
                return <CheckCircle2 className="text-green-500" size={20} />
            case 'in-progress':
                return <Clock className="text-blue-500" size={20} />
            default:
                return <Circle className="text-gray-400" size={20} />
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed':
                return 'bg-green-500'
            case 'in-progress':
                return 'bg-blue-500'
            default:
                return 'bg-gray-500'
        }
    }

    const getEffortColor = (effort: string) => {
        switch (effort) {
            case 'small':
                return 'bg-green-500'
            case 'medium':
                return 'bg-yellow-500'
            default:
                return 'bg-red-500'
        }
    }

    const hasRoadmap = features.length > 0

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
                                <Map className="text-blue-500" size={32} />
                                Roadmap
                            </h1>
                            <p className="text-muted-foreground">
                                AI-powered feature planning for {projectName}
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {hasRoadmap && (
                            <Select
                                value="markdown"
                                onValueChange={(value) => exportMutation.mutate(value as 'markdown' | 'json' | 'csv')}
                            >
                                <SelectTrigger asChild>
                                    <Button variant="outline" disabled={exportMutation.isPending}>
                                        {exportMutation.isPending ? (
                                            <Loader2 className="animate-spin mr-2" size={16} />
                                        ) : (
                                            <Download className="mr-2" size={16} />
                                        )}
                                        Export
                                    </Button>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="markdown">Markdown</SelectItem>
                                    <SelectItem value="json">JSON</SelectItem>
                                    <SelectItem value="csv">CSV</SelectItem>
                                </SelectContent>
                            </Select>
                        )}
                        <Button
                            onClick={() => {
                                // Show modal immediately when button is clicked
                                setShowProgressModal(true)
                                setProgressStage(0)
                                setProgress(0)
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
                                    {hasRoadmap ? 'Regenerate' : 'Generate Roadmap'}
                                </>
                            )}
                        </Button>
                    </div>
                </div>

                {/* Stats */}
                {stats && stats.total_features > 0 && (
                    <div className="grid grid-cols-5 gap-4 mb-6">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium">Total Features</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats.total_features}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium">Completed</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-green-600">
                                    {stats.by_status?.completed || 0}
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium">In Progress</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-blue-600">
                                    {stats.by_status?.['in-progress'] || 0}
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium">Planned</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-gray-600">
                                    {stats.by_status?.planned || 0}
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium">Estimated Days</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats.total_estimated_days}</div>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto">
                {isLoading && (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="animate-spin mr-2" size={24} />
                        <span>Loading roadmap...</span>
                    </div>
                )}

                {generateMutation.isError && (
                    <Alert variant="destructive" className="mb-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            {generateMutation.error instanceof Error ? generateMutation.error.message : 'Failed to generate roadmap'}
                        </AlertDescription>
                    </Alert>
                )}

                {!isLoading && !hasRoadmap && !generateMutation.isPending && (
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center py-12">
                            <Map className="text-muted-foreground mb-4" size={48} />
                            <p className="text-muted-foreground text-center mb-4">
                                No roadmap generated yet. Click "Generate Roadmap" to create an AI-powered feature plan.
                            </p>
                        </CardContent>
                    </Card>
                )}

                {hasRoadmap && (
                    <Tabs defaultValue="timeline" className="w-full">
                        <TabsList className="grid w-full max-w-md grid-cols-2">
                            <TabsTrigger value="timeline">
                                <Calendar className="mr-2" size={16} />
                                Timeline View
                            </TabsTrigger>
                            <TabsTrigger value="list">
                                <TrendingUp className="mr-2" size={16} />
                                List View
                            </TabsTrigger>
                        </TabsList>

                        {/* Filters */}
                        <div className="flex gap-4 my-4">
                            <Select value={selectedMilestone} onValueChange={setSelectedMilestone}>
                                <SelectTrigger className="w-48">
                                    <SelectValue placeholder="All Milestones" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Milestones</SelectItem>
                                    {milestones.map(m => (
                                        <SelectItem key={m.name} value={m.name}>{m.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                                <SelectTrigger className="w-48">
                                    <SelectValue placeholder="All Statuses" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Statuses</SelectItem>
                                    <SelectItem value="planned">Planned</SelectItem>
                                    <SelectItem value="in-progress">In Progress</SelectItem>
                                    <SelectItem value="completed">Completed</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Timeline View */}
                        <TabsContent value="timeline" className="space-y-8">
                            {milestones.map(milestone => {
                                const milestoneFeatures = featuresByMilestone[milestone.name] || []
                                if (milestoneFeatures.length === 0) return null

                                return (
                                    <div key={milestone.name}>
                                        <div className="flex items-center gap-4 mb-4">
                                            <div className="flex-1">
                                                <h2 className="text-2xl font-bold">{milestone.name}</h2>
                                                <p className="text-muted-foreground">
                                                    Target: {new Date(milestone.target_date).toLocaleDateString()} • {milestoneFeatures.length} features
                                                </p>
                                            </div>
                                        </div>

                                        <div className="space-y-4 pl-6 border-l-2 border-blue-500">
                                            {milestoneFeatures.map(feature => (
                                                <FeatureCard
                                                    key={feature.id}
                                                    feature={feature}
                                                    onStatusChange={(status) =>
                                                        updateStatusMutation.mutate({ featureId: feature.id, status })
                                                    }
                                                    isUpdating={updateStatusMutation.isPending}
                                                    getStatusIcon={getStatusIcon}
                                                    getStatusColor={getStatusColor}
                                                    getEffortColor={getEffortColor}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )
                            })}
                        </TabsContent>

                        {/* List View */}
                        <TabsContent value="list" className="space-y-4">
                            {filteredFeatures.length === 0 ? (
                                <Alert>
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>
                                        No features match the current filters.
                                    </AlertDescription>
                                </Alert>
                            ) : (
                                filteredFeatures
                                    .sort((a, b) => a.priority - b.priority)
                                    .map(feature => (
                                        <FeatureCard
                                            key={feature.id}
                                            feature={feature}
                                            onStatusChange={(status) =>
                                                updateStatusMutation.mutate({ featureId: feature.id, status })
                                            }
                                            isUpdating={updateStatusMutation.isPending}
                                            getStatusIcon={getStatusIcon}
                                            getStatusColor={getStatusColor}
                                            getEffortColor={getEffortColor}
                                        />
                                    ))
                            )}
                        </TabsContent>
                    </Tabs>
                )}
            </div>

            {/* AI Progress Modal */}
            <AIProgressModal
                isOpen={showProgressModal}
                operation="roadmap"
                currentStage={progressStage}
                progress={progress}
                aiThought={aiThought}
                onClose={() => setShowProgressModal(false)}
            />
        </div>
    )
}

interface FeatureCardProps {
    feature: RoadmapFeature
    onStatusChange: (status: string) => void
    isUpdating: boolean
    getStatusIcon: (status: string) => React.ReactElement
    getStatusColor: (status: string) => string
    getEffortColor: (effort: string) => string
}

function FeatureCard({
    feature,
    onStatusChange,
    isUpdating,
    getStatusIcon,
    getStatusColor,
    getEffortColor
}: FeatureCardProps) {
    return (
        <Card className="ml-4">
            <CardHeader>
                <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                        {getStatusIcon(feature.status)}
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <CardTitle className="text-lg">{feature.title}</CardTitle>
                                <Badge variant="outline" className="text-xs">
                                    Priority {feature.priority}
                                </Badge>
                            </div>
                            <CardDescription>{feature.description}</CardDescription>
                        </div>
                    </div>
                    <Select
                        value={feature.status}
                        onValueChange={onStatusChange}
                        disabled={isUpdating}
                    >
                        <SelectTrigger className="w-40">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="planned">Planned</SelectItem>
                            <SelectItem value="in-progress">In Progress</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex gap-2 flex-wrap">
                    <Badge className={getStatusColor(feature.status)}>
                        {feature.status}
                    </Badge>
                    <Badge className={getEffortColor(feature.effort)}>
                        {feature.effort} effort
                    </Badge>
                    <Badge variant="outline">
                        {feature.estimated_days} days
                    </Badge>
                    <Badge variant="outline">
                        {feature.milestone}
                    </Badge>
                </div>
            </CardContent>
        </Card>
    )
}
