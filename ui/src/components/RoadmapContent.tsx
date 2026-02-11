import { Map, Sparkles, ArrowLeft, Calendar, Download, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useRoadmap } from '@/hooks/useRoadmap'
import { useState } from 'react'

interface RoadmapContentProps {
  projectName: string
  onBack: () => void
}

export function RoadmapContent({ projectName, onBack }: RoadmapContentProps) {
  const [timeframe, setTimeframe] = useState<string>('6_months')

  const {
    roadmap,
    isLoading,
    generateRoadmap,
    isGenerating,
  } = useRoadmap(projectName)

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      completed: 'bg-green-500',
      'in-progress': 'bg-blue-500',
      planned: 'bg-gray-500'
    }
    return colors[status] || 'bg-gray-500'
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
                <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center">
                  <Map className="text-blue-500" size={24} />
                </div>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">Roadmap</h1>
                  <p className="text-muted-foreground">
                    Strategic feature planning for {projectName}
                  </p>
                </div>
              </div>
            </div>

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

              <Button size="lg" onClick={() => generateRoadmap(timeframe)} disabled={isGenerating}>
                <Sparkles className="mr-2" size={20} />
                {isGenerating ? 'Generating...' : 'Generate Roadmap'}
              </Button>
            </div>
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
              <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mb-6">
                <Calendar size={40} className="text-blue-500" />
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
                <Button size="lg" onClick={() => generateRoadmap(timeframe)} disabled={isGenerating}>
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
                    <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold">
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
                      <Card key={feature.id} className="hover:shadow-md transition-shadow cursor-pointer">
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
                              <CardDescription className="text-sm mt-1">
                                {feature.description}
                              </CardDescription>
                              {feature.dependencies.length > 0 && (
                                <p className="text-xs text-muted-foreground mt-2">
                                  Depends on: {feature.dependencies.join(', ')}
                                </p>
                              )}
                            </div>
                            <ChevronRight size={20} className="text-muted-foreground" />
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
      </div>
    </div>
  )
}
