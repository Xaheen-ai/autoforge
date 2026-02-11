import { useState, useEffect } from 'react'
import { FolderCog, FileText, Settings, Loader2, AlertCircle, CheckCircle2, Play } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    getProjectContext,
    updateProjectNotes,
    analyzeCodebase,
    updateContextConfig,
    type ContextConfig
} from '../lib/api'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AIProgressModal } from './AIProgressModal'

interface ProjectContextModalProps {
    isOpen: boolean
    onClose: () => void
    projectName: string | null
}

type TabType = 'codebase' | 'notes' | 'settings'

export function ProjectContextModal({ isOpen, onClose, projectName }: ProjectContextModalProps) {
    const [selectedTab, setSelectedTab] = useState<TabType>('codebase')
    const [editedNotes, setEditedNotes] = useState('')
    const [hasNotesChanges, setHasNotesChanges] = useState(false)
    const [showProgressModal, setShowProgressModal] = useState(false)
    const [progressStage, setProgressStage] = useState(0)
    const [progress, setProgress] = useState(0)
    const [aiThought, setAiThought] = useState('')
    const queryClient = useQueryClient()

    // Fetch context
    const { data: context, isLoading, error } = useQuery({
        queryKey: ['project-context', projectName],
        queryFn: () => projectName ? getProjectContext(projectName) : Promise.reject('No project'),
        enabled: isOpen && !!projectName,
    })

    // Update notes mutation
    const notesMutation = useMutation({
        mutationFn: async () => {
            if (!projectName) throw new Error('No project selected')
            return updateProjectNotes(projectName, editedNotes)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['project-context', projectName] })
            setHasNotesChanges(false)
        },
    })

    // Analyze codebase mutation
    const analyzeMutation = useMutation({
        mutationFn: async () => {
            if (!projectName) throw new Error('No project selected')

            // Show progress modal
            setShowProgressModal(true)
            setProgressStage(0)
            setProgress(0)

            // Simulate progress stages
            const stages = [
                { stage: 0, progress: 25, thought: "Analyzing file structure and dependencies" },
                { stage: 1, progress: 50, thought: "Calculating lines of code and language distribution" },
                { stage: 2, progress: 75, thought: "Generating AI insights about your architecture" }
            ]

            // Advance through stages
            for (const { stage, progress: p, thought } of stages) {
                await new Promise(resolve => setTimeout(resolve, 800))
                setProgressStage(stage)
                setProgress(p)
                setAiThought(thought)
            }

            // Analyze codebase
            const result = await analyzeCodebase(projectName)

            // Complete
            setProgressStage(3)
            setProgress(100)
            await new Promise(resolve => setTimeout(resolve, 1000))

            return result
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['project-context', projectName] })
            setTimeout(() => setShowProgressModal(false), 1500)
        },
        onError: () => {
            setShowProgressModal(false)
        }
    })

    // Update config mutation
    const configMutation = useMutation({
        mutationFn: async (config: Partial<ContextConfig>) => {
            if (!projectName) throw new Error('No project selected')
            return updateContextConfig(projectName, config)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['project-context', projectName] })
        },
    })

    // Initialize notes when context loads
    useEffect(() => {
        if (context) {
            setEditedNotes(context.notes)
            setHasNotesChanges(false)
        }
    }, [context])

    const handleNotesChange = (value: string) => {
        setEditedNotes(value)
        setHasNotesChanges(value !== context?.notes)
    }

    const handleSaveNotes = () => {
        notesMutation.mutate()
    }

    const handleCancelNotes = () => {
        if (context) {
            setEditedNotes(context.notes)
            setHasNotesChanges(false)
        }
    }

    const handleAnalyze = () => {
        // Show modal immediately
        setShowProgressModal(true)
        setProgressStage(0)
        setProgress(0)
        // Start the mutation
        analyzeMutation.mutate()
    }

    const handleConfigChange = (key: keyof ContextConfig, value: boolean | number) => {
        if (!context) return
        configMutation.mutate({ [key]: value })
    }

    const tabInfo = {
        codebase: {
            label: 'Codebase Analysis',
            icon: FolderCog,
        },
        notes: {
            label: 'Knowledge Base',
            icon: FileText,
        },
        settings: {
            label: 'Context Settings',
            icon: Settings,
        }
    }


    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FolderCog className="text-blue-500" size={24} />
                        Project Context - {projectName}
                    </DialogTitle>
                    <DialogDescription>
                        Manage project knowledge, analyze codebase, and configure AI context
                    </DialogDescription>
                </DialogHeader>

                {isLoading && (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="animate-spin mr-2" size={24} />
                        <span>Loading context...</span>
                    </div>
                )}

                {error && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            Failed to load context: {error instanceof Error ? error.message : 'Unknown error'}
                        </AlertDescription>
                    </Alert>
                )}

                {!isLoading && !error && context && (
                    <>
                        <div className="space-y-4 flex-1 overflow-y-auto">
                            {/* Tab Selector */}
                            <div className="flex gap-2 border-b pb-2">
                                {(Object.keys(tabInfo) as TabType[]).map((type) => {
                                    const info = tabInfo[type]
                                    const TabIcon = info.icon
                                    return (
                                        <Button
                                            key={type}
                                            variant={selectedTab === type ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() => setSelectedTab(type)}
                                            className="flex items-center gap-2"
                                        >
                                            <TabIcon size={14} />
                                            {info.label}
                                        </Button>
                                    )
                                })}
                            </div>

                            {/* Codebase Analysis Tab */}
                            {selectedTab === 'codebase' && (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-lg font-semibold">Codebase Analysis</h3>
                                        <Button
                                            onClick={handleAnalyze}
                                            disabled={analyzeMutation.isPending}
                                            size="sm"
                                        >
                                            {analyzeMutation.isPending ? (
                                                <>
                                                    <Loader2 className="animate-spin mr-2" size={16} />
                                                    Analyzing...
                                                </>
                                            ) : (
                                                <>
                                                    <Play className="mr-2" size={16} />
                                                    Analyze Codebase
                                                </>
                                            )}
                                        </Button>
                                    </div>

                                    {context.codebase_analysis ? (
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-3 gap-4">
                                                <div className="p-4 border rounded-lg">
                                                    <div className="text-2xl font-bold">{context.codebase_analysis.total_files}</div>
                                                    <div className="text-sm text-muted-foreground">Total Files</div>
                                                </div>
                                                <div className="p-4 border rounded-lg">
                                                    <div className="text-2xl font-bold">{context.codebase_analysis.total_lines.toLocaleString()}</div>
                                                    <div className="text-sm text-muted-foreground">Lines of Code</div>
                                                </div>
                                                <div className="p-4 border rounded-lg">
                                                    <div className="text-2xl font-bold">{Object.keys(context.codebase_analysis.languages).length}</div>
                                                    <div className="text-sm text-muted-foreground">Languages</div>
                                                </div>
                                            </div>

                                            <div>
                                                <h4 className="font-semibold mb-2">Languages</h4>
                                                <div className="space-y-1">
                                                    {Object.entries(context.codebase_analysis.languages)
                                                        .sort(([, a], [, b]) => b - a)
                                                        .map(([lang, count]) => (
                                                            <div key={lang} className="flex justify-between text-sm">
                                                                <span>{lang}</span>
                                                                <span className="text-muted-foreground">{count} files</span>
                                                            </div>
                                                        ))}
                                                </div>
                                            </div>

                                            {context.codebase_analysis.structure.key_files.length > 0 && (
                                                <div>
                                                    <h4 className="font-semibold mb-2">Key Files</h4>
                                                    <div className="space-y-2">
                                                        {context.codebase_analysis.structure.key_files.map((file, idx) => (
                                                            <div key={idx} className="p-2 border rounded text-sm">
                                                                <div className="font-mono">{file.path}</div>
                                                                <div className="text-muted-foreground text-xs">{file.description}</div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            <div className="text-xs text-muted-foreground">
                                                Last analyzed: {new Date(context.codebase_analysis.analyzed_at).toLocaleString()}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 text-muted-foreground">
                                            <p>No analysis available yet.</p>
                                            <p className="text-sm">Click "Analyze Codebase" to generate insights.</p>
                                        </div>
                                    )}

                                    {analyzeMutation.isSuccess && (
                                        <Alert className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                                            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                                            <AlertDescription className="text-green-800 dark:text-green-200">
                                                Codebase analyzed successfully!
                                            </AlertDescription>
                                        </Alert>
                                    )}

                                    {analyzeMutation.isError && (
                                        <Alert variant="destructive">
                                            <AlertCircle className="h-4 w-4" />
                                            <AlertDescription>
                                                {analyzeMutation.error instanceof Error ? analyzeMutation.error.message : 'Analysis failed'}
                                            </AlertDescription>
                                        </Alert>
                                    )}
                                </div>
                            )}

                            {/* Knowledge Base Tab */}
                            {selectedTab === 'notes' && (
                                <div className="space-y-4">
                                    <div>
                                        <Label htmlFor="notes-editor">Project Notes</Label>
                                        <p className="text-sm text-muted-foreground mb-2">
                                            Document important information about your project
                                        </p>
                                        <Textarea
                                            id="notes-editor"
                                            value={editedNotes}
                                            onChange={(e) => handleNotesChange(e.target.value)}
                                            className="min-h-[400px] font-mono text-sm"
                                            placeholder="# Project Notes

Add any important information about your project here...

## Architecture
- ...

## Important Decisions
- ...

## Known Issues
- ..."
                                        />
                                    </div>

                                    {notesMutation.isSuccess && (
                                        <Alert className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                                            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                                            <AlertDescription className="text-green-800 dark:text-green-200">
                                                Notes saved successfully!
                                            </AlertDescription>
                                        </Alert>
                                    )}

                                    {notesMutation.isError && (
                                        <Alert variant="destructive">
                                            <AlertCircle className="h-4 w-4" />
                                            <AlertDescription>
                                                {notesMutation.error instanceof Error ? notesMutation.error.message : 'Failed to save notes'}
                                            </AlertDescription>
                                        </Alert>
                                    )}

                                    <div className="flex justify-between items-center pt-2 border-t">
                                        <div className="text-sm text-muted-foreground">
                                            {hasNotesChanges && '● Unsaved changes'}
                                        </div>
                                        <div className="flex gap-2">
                                            {hasNotesChanges && (
                                                <Button variant="outline" onClick={handleCancelNotes}>
                                                    Cancel Changes
                                                </Button>
                                            )}
                                            <Button
                                                onClick={handleSaveNotes}
                                                disabled={!hasNotesChanges || notesMutation.isPending}
                                            >
                                                {notesMutation.isPending ? (
                                                    <>
                                                        <Loader2 className="animate-spin mr-2" size={16} />
                                                        Saving...
                                                    </>
                                                ) : (
                                                    'Save Notes'
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Context Settings Tab */}
                            {selectedTab === 'settings' && (
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold">Context Configuration</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Configure what information is included in AI prompts
                                    </p>

                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between p-4 border rounded-lg">
                                            <div>
                                                <div className="font-medium">Include Codebase Structure</div>
                                                <div className="text-sm text-muted-foreground">
                                                    Add file structure and key files to context
                                                </div>
                                            </div>
                                            <input
                                                type="checkbox"
                                                checked={context.config.include_codebase_structure}
                                                onChange={(e) => handleConfigChange('include_codebase_structure', e.target.checked)}
                                                className="w-4 h-4"
                                            />
                                        </div>

                                        <div className="flex items-center justify-between p-4 border rounded-lg">
                                            <div>
                                                <div className="font-medium">Include Dependencies</div>
                                                <div className="text-sm text-muted-foreground">
                                                    Add package.json and requirements.txt to context
                                                </div>
                                            </div>
                                            <input
                                                type="checkbox"
                                                checked={context.config.include_dependencies}
                                                onChange={(e) => handleConfigChange('include_dependencies', e.target.checked)}
                                                className="w-4 h-4"
                                            />
                                        </div>

                                        <div className="flex items-center justify-between p-4 border rounded-lg">
                                            <div>
                                                <div className="font-medium">Include Recent Changes</div>
                                                <div className="text-sm text-muted-foreground">
                                                    Add git commit history to context
                                                </div>
                                            </div>
                                            <input
                                                type="checkbox"
                                                checked={context.config.include_recent_changes}
                                                onChange={(e) => handleConfigChange('include_recent_changes', e.target.checked)}
                                                className="w-4 h-4"
                                            />
                                        </div>
                                    </div>

                                    {configMutation.isSuccess && (
                                        <Alert className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                                            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                                            <AlertDescription className="text-green-800 dark:text-green-200">
                                                Configuration updated!
                                            </AlertDescription>
                                        </Alert>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Close Button */}
                        <div className="flex justify-end pt-4 border-t">
                            <Button variant="outline" onClick={onClose}>
                                Close
                            </Button>
                        </div>
                    </>
                )}
            </DialogContent>

            {/* AI Progress Modal */}
            <AIProgressModal
                isOpen={showProgressModal}
                operation="analysis"
                currentStage={progressStage}
                progress={progress}
                aiThought={aiThought}
                onClose={() => setShowProgressModal(false)}
            />
        </Dialog>
    )
}
