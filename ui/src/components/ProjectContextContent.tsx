import { FileText, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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

    useEffect(() => {
        setEditedContext(JSON.stringify(context, null, 2))
    }, [context])

    const handleSave = () => {
        try {
            const parsed = JSON.parse(editedContext)
            setError(null)
            update(parsed)
        } catch (e) {
            setError('Invalid JSON format')
        }
    }

    if (isLoading) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center py-16">
                    <p className="text-muted-foreground">Loading...</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <>
            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-category-6/10 rounded-xl flex items-center justify-center">
                            <FileText className="text-category-6" size={24} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">Project Context</h1>
                            <p className="text-muted-foreground">
                                Tech stack, constraints, and conventions for {projectName}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

                {/* Editor */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Context Metadata</CardTitle>
                                <CardDescription>
                                    Define tech stack, constraints, conventions, and configuration metadata (JSON format)
                                </CardDescription>
                            </div>
                            <Button onClick={handleSave} disabled={isUpdating}>
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
                            value={editedContext}
                            onChange={(e) => setEditedContext(e.target.value)}
                            placeholder={`{
  "techStack": {
    "frontend": "React + TypeScript",
    "backend": "FastAPI + Python",
    "database": "SQLite"
  },
  "constraints": [
    "Must support offline mode",
    "Maximum bundle size: 500KB"
  ],
  "conventions": {
    "fileNaming": "kebab-case",
    "componentStyle": "functional",
    "stateManagement": "React Query"
  },
  "environment": {
    "nodeVersion": "18+",
    "pythonVersion": "3.9+"
  }
}`}
                            className="min-h-[600px] font-mono text-sm"
                        />
                    </CardContent>
                </Card>
        </>
    )
}
