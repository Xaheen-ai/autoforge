import { useState } from 'react'
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { initializeConvex } from '../lib/api'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface ConvexInitModalProps {
    isOpen: boolean
    onClose: () => void
    projectName: string | null
}

export function ConvexInitModal({ isOpen, onClose, projectName }: ConvexInitModalProps) {
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

    const handleClose = () => {
        setInitStatus('idle')
        setErrorMessage('')
        onClose()
    }

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Initialize Convex Backend</DialogTitle>
                    <DialogDescription>
                        Set up Convex for {projectName}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {initStatus === 'idle' && (
                        <>
                            <p className="text-sm text-muted-foreground">
                                This will copy Convex schema templates to your project. You'll need to run{' '}
                                <code className="px-1.5 py-0.5 rounded bg-muted text-xs">npx convex dev</code>{' '}
                                in your project directory to complete the setup.
                            </p>
                            <div className="flex gap-2 justify-end">
                                <Button variant="outline" onClick={handleClose}>
                                    Cancel
                                </Button>
                                <Button onClick={handleInitialize}>
                                    Initialize Convex
                                </Button>
                            </div>
                        </>
                    )}

                    {initStatus === 'initializing' && (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="animate-spin mr-2" size={24} />
                            <span>Initializing Convex...</span>
                        </div>
                    )}

                    {initStatus === 'success' && (
                        <>
                            <Alert className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                                <AlertDescription className="text-green-800 dark:text-green-200">
                                    Convex templates copied successfully!
                                </AlertDescription>
                            </Alert>
                            <div className="space-y-2">
                                <p className="text-sm font-medium">Next steps:</p>
                                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                                    <li>Open a terminal in your project directory</li>
                                    <li>Run <code className="px-1.5 py-0.5 rounded bg-muted text-xs">npx convex dev</code></li>
                                    <li>Follow the authentication prompts</li>
                                    <li>Your Convex backend will be ready!</li>
                                </ol>
                            </div>
                            <div className="flex justify-end">
                                <Button onClick={handleClose}>
                                    Done
                                </Button>
                            </div>
                        </>
                    )}

                    {initStatus === 'error' && (
                        <>
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>{errorMessage}</AlertDescription>
                            </Alert>
                            <div className="flex gap-2 justify-end">
                                <Button variant="outline" onClick={handleClose}>
                                    Close
                                </Button>
                                <Button onClick={handleInitialize}>
                                    Try Again
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
