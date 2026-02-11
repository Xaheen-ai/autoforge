import { useState, useEffect } from 'react'
import { FileText, Code, Wand2, Loader2, AlertCircle, CheckCircle2, ArrowLeft, Sparkles } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getProjectPrompts, updateProjectPrompts } from '../lib/api'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface PromptsContentProps {
    projectName: string
    onBack: () => void
}

type PromptType = 'app_spec' | 'initializer_prompt' | 'coding_prompt'

export function PromptsContent({ projectName, onBack }: PromptsContentProps) {
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
        queryFn: () => getProjectPrompts(projectName),
    })

    // Update prompts mutation
    const updateMutation = useMutation({
        mutationFn: async () => {
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
            description: 'This prompt is used to generate the initial app specification from user input. It defines how the AI understands and structures your project requirements.',
            color: 'orange',
        },
        initializer_prompt: {
            label: 'Initializer',
            icon: Code,
            description: 'This prompt is used to set up the initial project structure and dependencies. It guides the AI in scaffolding your project.',
            color: 'blue',
        },
        coding_prompt: {
            label: 'Coding',
            icon: FileText,
            description: 'This prompt is used for implementing individual features. It defines how the AI approaches code generation and problem-solving.',
            color: 'green',
        }
    }

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
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-orange-500/10 rounded-xl flex items-center justify-center">
                        <Sparkles className="text-orange-500" size={24} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Prompts</h1>
                        <p className="text-muted-foreground">
                            Customize AI prompts for project initialization and feature development
                        </p>
                    </div>
                </div>
                <Button variant="outline" onClick={onBack}>
                    <ArrowLeft size={16} className="mr-2" />
                    Back to Kanban
                </Button>
            </div>

            {/* Loading State */}
            {isLoading && (
                <Card>
                    <CardContent className="flex items-center justify-center py-12">
                        <Loader2 className="animate-spin mr-2" size={24} />
                        <span>Loading prompts...</span>
                    </CardContent>
                </Card>
            )}

            {/* Error State */}
            {error && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        Failed to load prompts: {error instanceof Error ? error.message : 'Unknown error'}
                    </AlertDescription>
                </Alert>
            )}

            {/* Main Content */}
            {!isLoading && !error && prompts && (
                <Tabs value={selectedPrompt} onValueChange={(value) => setSelectedPrompt(value as PromptType)}>
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="app_spec" className="flex items-center gap-2">
                            <Wand2 size={14} />
                            App Spec
                        </TabsTrigger>
                        <TabsTrigger value="initializer_prompt" className="flex items-center gap-2">
                            <Code size={14} />
                            Initializer
                        </TabsTrigger>
                        <TabsTrigger value="coding_prompt" className="flex items-center gap-2">
                            <FileText size={14} />
                            Coding
                        </TabsTrigger>
                    </TabsList>

                    {(Object.keys(promptInfo) as PromptType[]).map((type) => {
                        const info = promptInfo[type]
                        const PromptIcon = info.icon

                        return (
                            <TabsContent key={type} value={type} className="space-y-4">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <PromptIcon size={20} />
                                            {info.label} Prompt
                                        </CardTitle>
                                        <CardDescription>
                                            {info.description}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor={`prompt-${type}`}>Prompt Content</Label>
                                            <Textarea
                                                id={`prompt-${type}`}
                                                value={editedContent[type]}
                                                onChange={(e) => handleContentChange(e.target.value)}
                                                className="min-h-[500px] font-mono text-sm"
                                                placeholder={`Enter ${info.label.toLowerCase()} prompt...`}
                                            />
                                        </div>

                                        {/* Character Count */}
                                        <div className="text-xs text-muted-foreground text-right">
                                            {editedContent[type].length.toLocaleString()} characters
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        )
                    })}
                </Tabs>
            )}

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

            {/* Actions Bar */}
            <Card className="sticky bottom-4 shadow-lg">
                <CardContent className="flex justify-between items-center py-4">
                    <div className="text-sm text-muted-foreground">
                        {hasChanges && (
                            <span className="flex items-center gap-2">
                                <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></span>
                                Unsaved changes
                            </span>
                        )}
                    </div>
                    <div className="flex gap-2">
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
                </CardContent>
            </Card>
        </div>
    )
}
