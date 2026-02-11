import { useState, useEffect } from 'react'
import { FileText, Code, Wand2, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getProjectPrompts, updateProjectPrompts } from '../lib/api'
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

interface PromptsEditorModalProps {
    isOpen: boolean
    onClose: () => void
    projectName: string | null
}

type PromptType = 'app_spec' | 'initializer_prompt' | 'coding_prompt'

export function PromptsEditorModal({ isOpen, onClose, projectName }: PromptsEditorModalProps) {
    const [selectedPrompt, setSelectedPrompt] = useState<PromptType>('app_spec')
    const [editedContent, setEditedContent] = useState<Record<PromptType, string>>({
        app_spec: '',
        initializer_prompt: '',
        coding_prompt: ''
    })
    const [hasChanges, setHasChanges] = useState(false)
    const queryClient = useQueryClient()

    // Fetch prompts
    const { data: prompts, isLoading, error } = useQuery({
        queryKey: ['project-prompts', projectName],
        queryFn: () => projectName ? getProjectPrompts(projectName) : Promise.reject('No project'),
        enabled: isOpen && !!projectName,
    })

    // Update prompts mutation
    const updateMutation = useMutation({
        mutationFn: async () => {
            if (!projectName) throw new Error('No project selected')
            return updateProjectPrompts(projectName, editedContent)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['project-prompts', projectName] })
            setHasChanges(false)
        },
    })

    // Initialize edited content when prompts load
    useEffect(() => {
        if (prompts) {
            setEditedContent({
                app_spec: prompts.app_spec,
                initializer_prompt: prompts.initializer_prompt,
                coding_prompt: prompts.coding_prompt
            })
            setHasChanges(false)
        }
    }, [prompts])

    const promptInfo = {
        app_spec: {
            label: 'App Specification',
            icon: Wand2,
            description: 'This prompt is used to generate the initial app specification from user input.',
        },
        initializer_prompt: {
            label: 'Initializer',
            icon: Code,
            description: 'This prompt is used to set up the initial project structure and dependencies.',
        },
        coding_prompt: {
            label: 'Coding',
            icon: FileText,
            description: 'This prompt is used for implementing individual features.',
        }
    }

    const currentPrompt = promptInfo[selectedPrompt]
    const Icon = currentPrompt.icon

    const handleContentChange = (value: string) => {
        setEditedContent(prev => ({
            ...prev,
            [selectedPrompt]: value
        }))
        setHasChanges(true)
    }

    const handleSave = () => {
        updateMutation.mutate()
    }

    const handleCancel = () => {
        if (prompts) {
            setEditedContent({
                app_spec: prompts.app_spec,
                initializer_prompt: prompts.initializer_prompt,
                coding_prompt: prompts.coding_prompt
            })
            setHasChanges(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileText className="text-blue-500" size={24} />
                        Edit Prompts - {projectName}
                    </DialogTitle>
                    <DialogDescription>
                        Customize the prompts used for project initialization and feature development
                    </DialogDescription>
                </DialogHeader>

                {isLoading && (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="animate-spin mr-2" size={24} />
                        <span>Loading prompts...</span>
                    </div>
                )}

                {error && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                            Failed to load prompts: {error instanceof Error ? error.message : 'Unknown error'}
                        </AlertDescription>
                    </Alert>
                )}

                {!isLoading && !error && prompts && (
                    <>
                        <div className="space-y-4 flex-1 overflow-y-auto">
                            {/* Prompt Type Selector */}
                            <div className="flex gap-2 border-b pb-2">
                                {(Object.keys(promptInfo) as PromptType[]).map((type) => {
                                    const info = promptInfo[type]
                                    const PromptIcon = info.icon
                                    return (
                                        <Button
                                            key={type}
                                            variant={selectedPrompt === type ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() => setSelectedPrompt(type)}
                                            className="flex items-center gap-2"
                                        >
                                            <PromptIcon size={14} />
                                            {info.label}
                                        </Button>
                                    )
                                })}
                            </div>

                            {/* Editor */}
                            <div className="space-y-2">
                                <Label htmlFor="prompt-content" className="flex items-center gap-2">
                                    <Icon size={16} />
                                    {currentPrompt.label} Prompt
                                </Label>
                                <Textarea
                                    id="prompt-content"
                                    value={editedContent[selectedPrompt]}
                                    onChange={(e) => handleContentChange(e.target.value)}
                                    className="min-h-[400px] font-mono text-sm"
                                    placeholder={`Enter ${currentPrompt.label.toLowerCase()} prompt...`}
                                />
                                <p className="text-xs text-muted-foreground">
                                    {currentPrompt.description}
                                </p>
                            </div>

                            {/* Success Message */}
                            {updateMutation.isSuccess && (
                                <Alert className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                                    <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                                    <AlertDescription className="text-green-800 dark:text-green-200">
                                        Prompts saved successfully!
                                    </AlertDescription>
                                </Alert>
                            )}

                            {/* Error Message */}
                            {updateMutation.isError && (
                                <Alert variant="destructive">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>
                                        {updateMutation.error instanceof Error ? updateMutation.error.message : 'Failed to save prompts'}
                                    </AlertDescription>
                                </Alert>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex justify-between items-center pt-4 border-t">
                            <div className="text-sm text-muted-foreground">
                                {hasChanges && '● Unsaved changes'}
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={onClose}>
                                    Close
                                </Button>
                                {hasChanges && (
                                    <Button variant="outline" onClick={handleCancel}>
                                        Cancel Changes
                                    </Button>
                                )}
                                <Button
                                    onClick={handleSave}
                                    disabled={!hasChanges || updateMutation.isPending}
                                >
                                    {updateMutation.isPending ? (
                                        <>
                                            <Loader2 className="animate-spin mr-2" size={16} />
                                            Saving...
                                        </>
                                    ) : (
                                        'Save Changes'
                                    )}
                                </Button>
                            </div>
                        </div>
                    </>
                )}
            </DialogContent>
        </Dialog>
    )
}
