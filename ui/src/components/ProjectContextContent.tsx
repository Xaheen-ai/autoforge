import { Settings, Save, Loader2, CheckCircle2, AlertCircle, Code2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useContextMetadata } from '@/hooks/useMetadata'
import { useState, useEffect } from 'react'

interface ProjectContextContentProps {
    projectName: string
}

export function ProjectContextContent({ projectName }: ProjectContextContentProps) {
    const { context, isLoading, update, isUpdating } = useContextMetadata(projectName)
    const [editedContext, setEditedContext] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [saveSuccess, setSaveSuccess] = useState(false)
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

    useEffect(() => {
        setEditedContext(JSON.stringify(context, null, 2))
    }, [context])

    useEffect(() => {
        if (editedContext && editedContext !== JSON.stringify(context, null, 2)) {
            setHasUnsavedChanges(true)
        }
    }, [editedContext, context])

    const handleSave = () => {
        try {
            const parsed = JSON.parse(editedContext)
            setError(null)
            update(parsed, {
                onSuccess: () => {
                    setHasUnsavedChanges(false)
                    setSaveSuccess(true)
                    setTimeout(() => setSaveSuccess(false), 3000)
                }
            })
        } catch (e) {
            setError('Invalid JSON format')
        }
    }

    const formatJSON = () => {
        try {
            const parsed = JSON.parse(editedContext)
            setEditedContext(JSON.stringify(parsed, null, 2))
            setError(null)
        } catch (e) {
            setError('Cannot format invalid JSON')
        }
    }

    return (
        <div className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-category-6/10 rounded-xl flex items-center justify-center">
                                <Settings className="text-category-6" size={24} />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold tracking-tight">Project Context</h1>
                                <p className="text-muted-foreground">
                                    Configuration for {projectName}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Notifications */}
                {saveSuccess && (
                    <div className="bg-success/10 border border-success/20 text-success px-4 py-2.5 rounded-lg flex items-center gap-2 text-sm">
                        <CheckCircle2 size={16} />
                        <span>Context saved successfully</span>
                    </div>
                )}

                {error && (
                    <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-2.5 rounded-lg flex items-center gap-2 text-sm">
                        <AlertCircle size={16} />
                        <span>{error}</span>
                    </div>
                )}

                {hasUnsavedChanges && !isUpdating && (
                    <div className="bg-warning/10 border border-warning/20 text-warning px-4 py-2.5 rounded-lg flex items-center gap-2 text-sm">
                        <AlertCircle size={16} />
                        <span>Unsaved changes</span>
                    </div>
                )}

                {/* Editor */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <CardTitle className="text-base font-medium">Context Configuration</CardTitle>
                                <CardDescription className="text-xs">
                                    Tech stack, constraints, conventions, and environment settings
                                </CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" onClick={formatJSON}>
                                    <Code2 className="mr-1.5" size={14} />
                                    Format
                                </Button>
                                <Button onClick={handleSave} disabled={isUpdating || !hasUnsavedChanges} size="sm">
                                    {isUpdating ? (
                                        <>
                                            <Loader2 className="mr-1.5 animate-spin" size={14} />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="mr-1.5" size={14} />
                                            Save
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-24 space-y-2">
                                <Loader2 className="animate-spin text-muted-foreground" size={32} />
                                <p className="text-xs text-muted-foreground">Loading context...</p>
                            </div>
                        ) : (
                            <>
                                <div className="space-y-1.5">
                                    <Label htmlFor="context" className="text-xs font-medium">Context JSON</Label>
                                    <Textarea
                                        id="context"
                                        value={editedContext}
                                        onChange={(e) => setEditedContext(e.target.value)}
                                        placeholder={`{
  "techStack": {
    "frontend": "React + TypeScript",
    "backend": "FastAPI"
  },
  "constraints": ["Offline support"],
  "conventions": {
    "fileNaming": "kebab-case"
  }
}`}
                                        className="min-h-[500px] font-mono text-xs resize-none"
                                    />
                                </div>

                                <div className="bg-muted/30 border rounded-lg p-3 space-y-1.5">
                                    <h4 className="text-xs font-medium">Quick Reference</h4>
                                    <div className="text-xs text-muted-foreground space-y-0.5">
                                        <p>• <code className="bg-background px-1 py-0.5 rounded text-xs">techStack</code> - Technologies used</p>
                                        <p>• <code className="bg-background px-1 py-0.5 rounded text-xs">constraints</code> - Project limitations</p>
                                        <p>• <code className="bg-background px-1 py-0.5 rounded text-xs">conventions</code> - Coding standards</p>
                                        <p>• <code className="bg-background px-1 py-0.5 rounded text-xs">environment</code> - Runtime requirements</p>
                                    </div>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
        </div>
    )
}
