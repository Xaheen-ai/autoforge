import { Loader2, CheckCircle2, Sparkles, Brain, FileSearch } from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'

interface ProgressStage {
    id: string
    label: string
    icon: React.ComponentType<{ size?: number; className?: string }>
    message: string
}

interface AIProgressModalProps {
    isOpen: boolean
    operation: 'ideation' | 'roadmap' | 'analysis'
    currentStage: number
    progress: number
    aiThought?: string
    onClose?: () => void
}

const OPERATION_STAGES: Record<string, ProgressStage[]> = {
    ideation: [
        {
            id: 'analyzing',
            label: 'Analyzing Project',
            icon: FileSearch,
            message: 'Reading project structure and dependencies...'
        },
        {
            id: 'context',
            label: 'Understanding Context',
            icon: Brain,
            message: 'Processing README and git history...'
        },
        {
            id: 'generating',
            label: 'Generating Ideas',
            icon: Sparkles,
            message: 'AI is brainstorming improvement ideas...'
        },
        {
            id: 'complete',
            label: 'Complete',
            icon: CheckCircle2,
            message: 'Ideas generated successfully!'
        }
    ],
    roadmap: [
        {
            id: 'analyzing',
            label: 'Analyzing Project',
            icon: FileSearch,
            message: 'Scanning codebase and dependencies...'
        },
        {
            id: 'planning',
            label: 'Planning Milestones',
            icon: Brain,
            message: 'Organizing features into quarters...'
        },
        {
            id: 'generating',
            label: 'Generating Roadmap',
            icon: Sparkles,
            message: 'AI is creating strategic roadmap...'
        },
        {
            id: 'complete',
            label: 'Complete',
            icon: CheckCircle2,
            message: 'Roadmap generated successfully!'
        }
    ],
    analysis: [
        {
            id: 'scanning',
            label: 'Scanning Codebase',
            icon: FileSearch,
            message: 'Analyzing file structure...'
        },
        {
            id: 'metrics',
            label: 'Counting Metrics',
            icon: Brain,
            message: 'Calculating lines of code and languages...'
        },
        {
            id: 'insights',
            label: 'Generating Insights',
            icon: Sparkles,
            message: 'AI is analyzing your architecture...'
        },
        {
            id: 'complete',
            label: 'Complete',
            icon: CheckCircle2,
            message: 'Analysis complete with AI insights!'
        }
    ]
}

export function AIProgressModal({
    isOpen,
    operation,
    currentStage,
    progress,
    aiThought,
    onClose
}: AIProgressModalProps) {
    const stages = OPERATION_STAGES[operation]
    const currentStageData = stages[currentStage]

    console.log('🟢 AIProgressModal render:', { isOpen, operation, currentStage, progress })

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="text-category-6 animate-pulse" size={24} />
                        AI Generation in Progress
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Progress Bar */}
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Progress</span>
                            <span className="font-medium">{Math.round(progress)}%</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                            <div
                                className="bg-primary h-full transition-all duration-300 ease-out"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>

                    {/* Stage Indicators */}
                    <div className="space-y-3">
                        {stages.map((stage, index) => {
                            const StageIcon = stage.icon
                            const isComplete = index < currentStage
                            const isCurrent = index === currentStage

                            return (
                                <div
                                    key={stage.id}
                                    className={`flex items-center gap-3 p-3 rounded-lg transition-all ${isCurrent
                                        ? 'bg-primary/5 border border-primary/20'
                                        : isComplete
                                            ? 'bg-success/10 border border-success/30'
                                            : 'bg-muted/50 border border-border opacity-50'
                                        }`}
                                >
                                    <div className="flex-shrink-0">
                                        {isComplete ? (
                                            <CheckCircle2 className="text-success" size={20} />
                                        ) : isCurrent ? (
                                            <Loader2 className="text-primary animate-spin" size={20} />
                                        ) : (
                                            <StageIcon className="text-muted-foreground" size={20} />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-medium text-sm">{stage.label}</div>
                                        {isCurrent && (
                                            <div className="text-xs text-muted-foreground mt-1">
                                                {stage.message}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {/* AI Thought Bubble */}
                    {aiThought && currentStage < stages.length - 1 && (
                        <div className="bg-gradient-to-r from-primary/5 to-info/5 p-4 rounded-lg border border-primary/20">
                            <div className="flex items-start gap-3">
                                <Brain className="text-primary flex-shrink-0 mt-1" size={20} />
                                <div>
                                    <div className="text-xs font-semibold text-foreground mb-1">
                                        AI is thinking...
                                    </div>
                                    <div className="text-sm text-muted-foreground italic">
                                        "{aiThought}"
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Success State */}
                    {currentStage === stages.length - 1 && (
                        <div className="text-center py-4">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success/10 mb-3">
                                <CheckCircle2 className="text-success" size={32} />
                            </div>
                            <div className="text-lg font-semibold text-foreground">
                                {currentStageData.message}
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
