import { useState } from 'react'
import { Loader2, AlertCircle, Database, Rocket } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { initializeConvex } from '../lib/api'

interface ConvexInitButtonProps {
    projectName: string | null
    backendType: string
}

export function ConvexInitButton({ projectName, backendType }: ConvexInitButtonProps) {
    const [initStatus, setInitStatus] = useState<'idle' | 'initializing' | 'success' | 'error'>('idle')
    const [errorMessage, setErrorMessage] = useState<string>('')
    const queryClient = useQueryClient()

    const initMutation = useMutation({
        mutationFn: async () => {
            if (!projectName) throw new Error('No project selected')
            return await initializeConvex(projectName)
        },
        onSuccess: () => {
            setInitStatus('success')
            queryClient.invalidateQueries({ queryKey: ['projects'] })
            setTimeout(() => setInitStatus('idle'), 5000)
        },
        onError: (error: any) => {
            setInitStatus('error')
            setErrorMessage(error.message || 'Failed to initialize Convex')
        },
    })

    const handleInitialize = () => {
        setInitStatus('initializing')
        setErrorMessage('')
        initMutation.mutate()
    }

    // Only show if backend is convex and project is selected
    if (backendType !== 'convex' || !projectName) {
        return null
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                    <Label className="font-medium flex items-center gap-2">
                        <Database size={16} />
                        Convex Backend
                    </Label>
                    <p className="text-sm text-muted-foreground">
                        Initialize Convex deployment for this project
                    </p>
                </div>
                <Button
                    size="sm"
                    onClick={handleInitialize}
                    disabled={initStatus === 'initializing'}
                    className="gap-2"
                >
                    {initStatus === 'initializing' ? (
                        <>
                            <Loader2 className="animate-spin" size={16} />
                            Initializing...
                        </>
                    ) : (
                        <>
                            <Rocket size={16} />
                            Initialize Convex
                        </>
                    )}
                </Button>
            </div>

            {initStatus === 'success' && (
                <Alert className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                    <AlertDescription className="text-green-800 dark:text-green-200">
                        ✓ Convex templates copied! Run <code className="px-1 py-0.5 rounded bg-green-100 dark:bg-green-900">npx convex dev</code> in your project directory to complete setup.
                    </AlertDescription>
                </Alert>
            )}

            {initStatus === 'error' && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
            )}
        </div>
    )
}
