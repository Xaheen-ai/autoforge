import { useState } from 'react'
import { ChevronDown, ChevronUp, Code, FlaskConical, Clock, Lock, Sparkles } from 'lucide-react'
import { OrchestratorAvatar } from './OrchestratorAvatar'
import type { OrchestratorStatus, OrchestratorState } from '../lib/types'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface OrchestratorStatusCardProps {
  status: OrchestratorStatus
}

// Get a friendly state description
function getStateText(state: OrchestratorState): string {
  switch (state) {
    case 'idle':
      return 'Standing by...'
    case 'initializing':
      return 'Setting up features...'
    case 'scheduling':
      return 'Planning next moves...'
    case 'spawning':
      return 'Deploying agents...'
    case 'monitoring':
      return 'Watching progress...'
    case 'complete':
      return 'Mission accomplished!'
    default:
      return 'Orchestrating...'
  }
}

// Get state color
function getStateColor(state: OrchestratorState): string {
  switch (state) {
    case 'complete':
      return 'text-primary'
    case 'spawning':
      return 'text-primary'
    case 'scheduling':
    case 'monitoring':
      return 'text-primary'
    case 'initializing':
      return 'text-warning'
    default:
      return 'text-muted-foreground'
  }
}

// Format timestamp to relative time
function formatRelativeTime(timestamp: string): string {
  const now = new Date()
  const then = new Date(timestamp)
  const diffMs = now.getTime() - then.getTime()
  const diffSecs = Math.floor(diffMs / 1000)

  if (diffSecs < 5) return 'just now'
  if (diffSecs < 60) return `${diffSecs}s ago`
  const diffMins = Math.floor(diffSecs / 60)
  if (diffMins < 60) return `${diffMins}m ago`
  return `${Math.floor(diffMins / 60)}h ago`
}

export function OrchestratorStatusCard({ status }: OrchestratorStatusCardProps) {
  const [showEvents, setShowEvents] = useState(false)

  return (
    <Card className="mb-4 bg-primary/10 border-primary/30 py-4">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <OrchestratorAvatar state={status.state} size="md" />

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Header row */}
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-lg text-primary">
                Maestro
              </span>
              <span className={`text-sm font-medium ${getStateColor(status.state)}`}>
                {getStateText(status.state)}
              </span>
            </div>

            {/* Current message */}
            <p className="text-sm text-foreground mb-3 line-clamp-2">
              {status.message}
            </p>

            {/* Status badges row */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Coding agents badge */}
              <Badge variant="outline" className="bg-info/10 text-info border-info/30">
                <Code size={12} />
                Coding: {status.codingAgents}
              </Badge>

              {/* Testing agents badge */}
              <Badge variant="outline" className="bg-category-6/10 text-category-6 border-category-6/30">
                <FlaskConical size={12} />
                Testing: {status.testingAgents}
              </Badge>

              {/* Ready queue badge */}
              <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                <Clock size={12} />
                Ready: {status.readyCount}
              </Badge>

              {/* Blocked badge (only show if > 0) */}
              {status.blockedCount > 0 && (
                <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
                  <Lock size={12} />
                  Blocked: {status.blockedCount}
                </Badge>
              )}
            </div>
          </div>

          {/* Recent events toggle */}
          {status.recentEvents.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowEvents(!showEvents)}
              className="text-primary hover:bg-primary/10"
            >
              <Sparkles size={12} />
              Activity
              {showEvents ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </Button>
          )}
        </div>

        {/* Collapsible recent events */}
        {showEvents && status.recentEvents.length > 0 && (
          <div className="mt-3 pt-3 border-t border-primary/20">
            <div className="space-y-1.5">
              {status.recentEvents.map((event, idx) => (
                <div
                  key={`${event.timestamp}-${idx}`}
                  className="flex items-start gap-2 text-xs"
                >
                  <span className="text-primary shrink-0 font-mono">
                    {formatRelativeTime(event.timestamp)}
                  </span>
                  <span className="text-foreground">
                    {event.message}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
