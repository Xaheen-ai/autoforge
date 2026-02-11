import { Map, Sparkles, Calendar, Download, ChevronRight, Save, FileText, ArrowLeft, Clock, Tag, Zap, GitBranch } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AIProgressModal } from '@/components/AIProgressModal'
import { useRoadmap } from '@/hooks/useRoadmap'
import { useRoadmapMetadata } from '@/hooks/useMetadata'
import { useState, useEffect } from 'react'
import type { RoadmapFeature } from '@/lib/api'

interface RoadmapContentProps {
  projectName: string
  onDetailChange?: (label: string | null) => void
  detailLabel?: string | null
}

export function RoadmapContent({ projectName, onDetailChange, detailLabel }: RoadmapContentProps) {
  const [timeframe, setTimeframe] = useState<string>('6_months')
  const [activeTab, setActiveTab] = useState('ai')
  const [selectedFeature, setSelectedFeature] = useState<RoadmapFeature | null>(null)

  // Progress modal state
  const [showProgress, setShowProgress] = useState(false)
  const [progressStage, setProgressStage] = useState(0)
  const [progress, setProgress] = useState(0)
  const [aiThought, setAiThought] = useState('')

  const {
    roadmap,
    isLoading,
    generateRoadmapAsync,
    isGenerating,
  } = useRoadmap(projectName)

  const { roadmap: metadataRoadmap, update: updateMetadata, isUpdating } = useRoadmapMetadata(projectName)
  const [editedRoadmap, setEditedRoadmap] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setEditedRoadmap(JSON.stringify(metadataRoadmap, null, 2))
  }, [metadataRoadmap])

  // Sync selectedFeature with detailLabel from parent
  useEffect(() => {
    if (detailLabel === null) {
      setSelectedFeature(null)
    }
  }, [detailLabel])

  const selectFeature = (feature: RoadmapFeature) => {
    setSelectedFeature(feature)
    onDetailChange?.(feature.title)
  }

  const clearDetail = () => {
    setSelectedFeature(null)
    onDetailChange?.(null)
  }

  const handleSaveMetadata = () => {
    try {
      const parsed = JSON.parse(editedRoadmap)
      setError(null)
      updateMetadata(parsed)
    } catch (e) {
      setError('Invalid JSON format')
    }
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      completed: 'bg-success',
      'in-progress': 'bg-info',
      planned: 'bg-muted'
    }
    return colors[status] || 'bg-muted'
  }

  const getStatusLabel = (status: string) => {
    return status.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  }

  const getPriorityLabel = (priority: number) => {
    const labels: Record<number, string> = {
      3: 'High',
      2: 'Medium',
      1: 'Low'
    }
    return labels[priority] || 'Medium'
  }

  const getEffortLabel = (effort: string) => {
    return effort.charAt(0).toUpperCase() + effort.slice(1) + ' Effort'
  }

  const handleGenerate = async () => {
    setShowProgress(true)
    setProgressStage(0)
    setProgress(0)
    setAiThought('')

    const stages = [
      { stage: 0, progress: 25, thought: "Scanning codebase and analyzing dependencies" },
      { stage: 1, progress: 50, thought: "Organizing features into quarterly milestones" },
      { stage: 2, progress: 75, thought: "Calculating timelines and identifying dependencies" }
    ]

    for (const { stage, progress: p, thought } of stages) {
      await new Promise(resolve => setTimeout(resolve, 800))
      setProgressStage(stage)
      setProgress(p)
      setAiThought(thought)
    }

    try {
      await generateRoadmapAsync(timeframe)
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
  if (selectedFeature) {
    return (
      <div className="space-y-6">
        {/* Page Header — matches list page style */}
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-category-7/10 rounded-xl flex items-center justify-center">
                <Map className="text-category-7" size={24} />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">{selectedFeature.title}</h1>
                <p className="text-muted-foreground">
                  Roadmap feature details
                </p>
              </div>
            </div>
          </div>

          <Button variant="outline" onClick={clearDetail}>
            <ArrowLeft className="mr-2" size={16} />
            Back to Roadmap
          </Button>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className={`${getStatusColor(selectedFeature.status)} text-white`}>
            {getStatusLabel(selectedFeature.status)}
          </Badge>
          <Badge variant="outline">
            {getEffortLabel(selectedFeature.effort)}
          </Badge>
          <Badge variant="outline">
            {getPriorityLabel(selectedFeature.priority)} Priority
          </Badge>
        </div>

        {/* Description */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground leading-relaxed">{selectedFeature.description}</p>
          </CardContent>
        </Card>

        {/* Metadata grid */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Tag size={14} />
                Milestone
              </div>
              <p className="font-medium text-lg">{selectedFeature.milestone}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Zap size={14} />
                Priority
              </div>
              <p className="font-medium text-lg">{getPriorityLabel(selectedFeature.priority)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Clock size={14} />
                Estimated Days
              </div>
              <p className="font-medium text-lg">{selectedFeature.estimated_days} days</p>
            </CardContent>
          </Card>
        </div>

        {/* Dependencies */}
        {selectedFeature.dependencies.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <GitBranch size={18} />
                Dependencies
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {selectedFeature.dependencies.map((dep) => (
                  <Badge key={dep} variant="outline">{dep}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Timestamps */}
        <div className="text-sm text-muted-foreground">
          {selectedFeature.created_at && (
            <>Created {new Date(selectedFeature.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</>
          )}
          {selectedFeature.updated_at && (
            <> &middot; Updated {new Date(selectedFeature.updated_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</>
          )}
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-category-7/10 rounded-xl flex items-center justify-center">
              <Map className="text-category-7" size={24} />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Roadmap</h1>
              <p className="text-muted-foreground">
                Strategic feature planning for {projectName}
              </p>
            </div>
          </div>
        </div>
      </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList>
            <TabsTrigger value="ai">
              <Sparkles className="mr-2" size={16} />
              AI Roadmap
            </TabsTrigger>
            <TabsTrigger value="metadata">
              <FileText className="mr-2" size={16} />
              Metadata Roadmap
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ai" className="space-y-6 mt-6">
            {/* AI Roadmap Controls */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                AI-generated strategic roadmap with milestones and dependencies
              </p>
              <div className="flex items-center gap-2">
                <Select value={timeframe} onValueChange={setTimeframe}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3_months">3 Months</SelectItem>
                    <SelectItem value="6_months">6 Months</SelectItem>
                    <SelectItem value="1_year">1 Year</SelectItem>
                  </SelectContent>
                </Select>

                <Button onClick={handleGenerate} disabled={isGenerating}>
                  <Sparkles className="mr-2" size={16} />
                  {isGenerating ? 'Generating...' : 'Generate'}
                </Button>
              </div>
            </div>

            {/* Content */}
            {isLoading ? (
              <Card>
                <CardContent className="flex items-center justify-center py-16">
                  <p className="text-muted-foreground">Loading roadmap...</p>
                </CardContent>
              </Card>
            ) : !roadmap ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-20">
                  <div className="w-24 h-24 bg-gradient-to-br from-category-7/15 to-category-7/5 rounded-full flex items-center justify-center mb-6 animate-pulse ring-1 ring-category-7/10">
                    <Calendar size={44} className="text-category-7" />
                  </div>
                  <h3 className="text-2xl font-semibold mb-3">No Roadmap Yet</h3>
                  <p className="text-muted-foreground text-center max-w-lg mb-8">
                    Let AI create a strategic roadmap with quarterly milestones, feature dependencies, and realistic timelines based on your project's current state.
                  </p>
                  <div className="flex items-center gap-3">
                    <Select value={timeframe} onValueChange={setTimeframe}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3_months">3 Months</SelectItem>
                        <SelectItem value="6_months">6 Months</SelectItem>
                        <SelectItem value="1_year">1 Year</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button size="lg" onClick={handleGenerate} disabled={isGenerating}>
                      <Sparkles className="mr-2" size={20} />
                      {isGenerating ? 'Generating...' : 'Generate Roadmap'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-semibold">
                    {timeframe.replace('_', ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} Roadmap
                  </h2>
                  <Button variant="outline">
                    <Download className="mr-2" size={16} />
                    Export
                  </Button>
                </div>

                <div className="space-y-8">
                  {roadmap.milestones.map((milestone, idx) => (
                    <div key={idx} className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-white font-bold">
                          {milestone.name.split(' ')[0]}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold">{milestone.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {milestone.features} feature{milestone.features !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>

                      <div className="ml-14 space-y-3">
                        {roadmap.features.filter(f => f.milestone === milestone.name).map((feature) => (
                          <Card
                            key={feature.id}
                            className="cursor-pointer transition-colors hover:bg-accent/50"
                            onClick={() => selectFeature(feature)}
                          >
                            <CardHeader className="pb-3">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Badge className={`${getStatusColor(feature.status)} text-white`}>
                                      {getStatusLabel(feature.status)}
                                    </Badge>
                                    <Badge variant="outline">
                                      {feature.effort.charAt(0).toUpperCase() + feature.effort.slice(1)} Effort
                                    </Badge>
                                    <Badge variant="outline">
                                      {getPriorityLabel(feature.priority)} Priority
                                    </Badge>
                                  </div>
                                  <CardTitle className="text-base">{feature.title}</CardTitle>
                                  <CardDescription className="text-sm mt-1 line-clamp-2">
                                    {feature.description}
                                  </CardDescription>
                                  {feature.dependencies.length > 0 && (
                                    <p className="text-xs text-muted-foreground mt-2">
                                      Depends on: {feature.dependencies.join(', ')}
                                    </p>
                                  )}
                                </div>
                                <ChevronRight size={20} className="text-muted-foreground shrink-0" />
                              </div>
                            </CardHeader>
                          </Card>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="metadata" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Metadata Roadmap</CardTitle>
                    <CardDescription>
                      Define phases, milestones, and timeline in JSON format
                    </CardDescription>
                  </div>
                  <Button onClick={handleSaveMetadata} disabled={isUpdating}>
                    <Save className="mr-2" size={16} />
                    {isUpdating ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {error && (
                  <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-2 rounded-md text-sm">
                    {error}
                  </div>
                )}
                <Textarea
                  value={editedRoadmap}
                  onChange={(e) => setEditedRoadmap(e.target.value)}
                  placeholder={`{\n  "phases": [\n    {\n      "name": "Phase 1: Foundation",\n      "status": "in-progress",\n      "tasks": [\n        "Setup project structure",\n        "Implement core features"\n      ]\n    }\n  ],\n  "milestones": [\n    {\n      "name": "MVP Release",\n      "date": "2024-Q2",\n      "status": "planned"\n    }\n  ],\n  "currentPhase": "Phase 1: Foundation"\n}`}
                  className="min-h-[600px] font-mono text-sm"
                />
              </CardContent>
            </Card>
          </TabsContent>
      </Tabs>

      {/* AI Progress Modal */}
      <AIProgressModal
        isOpen={showProgress}
        operation="roadmap"
        currentStage={progressStage}
        progress={progress}
        aiThought={aiThought}
        onClose={() => setShowProgress(false)}
      />
    </>
  )
}
