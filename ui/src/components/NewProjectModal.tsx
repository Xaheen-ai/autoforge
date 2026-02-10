/**
 * New Project Modal Component
 *
 * Multi-step modal for creating new projects:
 * 1. Enter project name
 * 2. Select project folder
 * 3. Choose spec method (Claude or manual)
 * 4a. If Claude: Show SpecCreationChat
 * 4b. If manual: Create project and close
 */

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Bot, FileEdit, ArrowRight, ArrowLeft, Loader2, CheckCircle2, Folder, GitBranch, FolderOpen } from 'lucide-react'
import { useCreateProject } from '../hooks/useProjects'
import { SpecCreationChat } from './SpecCreationChat'
import { FolderBrowser } from './FolderBrowser'
import { startAgent } from '../lib/api'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

type InitializerStatus = 'idle' | 'starting' | 'error'

type Step = 'name' | 'source' | 'github' | 'folder' | 'method' | 'chat' | 'complete'
type SpecMethod = 'claude' | 'manual'
type ProjectSource = 'fresh' | 'github' | 'existing'

interface NewProjectModalProps {
  isOpen: boolean
  onClose: () => void
  onProjectCreated: (projectName: string) => void
  onStepChange?: (step: Step) => void
}

export function NewProjectModal({
  isOpen,
  onClose,
  onProjectCreated,
  onStepChange,
}: NewProjectModalProps) {
  const [step, setStep] = useState<Step>('name')
  const [projectName, setProjectName] = useState('')
  const [projectPath, setProjectPath] = useState<string | null>(null)
  const [_specMethod, setSpecMethod] = useState<SpecMethod | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [initializerStatus, setInitializerStatus] = useState<InitializerStatus>('idle')
  const [initializerError, setInitializerError] = useState<string | null>(null)
  const [yoloModeSelected, setYoloModeSelected] = useState(false)
  const [projectSource, setProjectSource] = useState<ProjectSource | null>(null)
  const [githubUrl, setGithubUrl] = useState('')
  const [githubBranch, setGithubBranch] = useState('')
  const [githubToken, setGithubToken] = useState('')
  const [githubError, setGithubError] = useState<string | null>(null)

  // Suppress unused variable warning - specMethod may be used in future
  void _specMethod

  const createProject = useCreateProject()

  // Wrapper to notify parent of step changes
  const changeStep = (newStep: Step) => {
    setStep(newStep)
    onStepChange?.(newStep)
  }

  if (!isOpen) return null

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = projectName.trim()

    if (!trimmed) {
      setError('Please enter a project name')
      return
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
      setError('Project name can only contain letters, numbers, hyphens, and underscores')
      return
    }

    setError(null)
    changeStep('source')
  }

  const handleFolderSelect = (path: string) => {
    setProjectPath(path)
    changeStep('method')
  }

  const handleFolderCancel = () => {
    changeStep('name')
  }

  const handleMethodSelect = async (method: SpecMethod) => {
    setSpecMethod(method)

    if (!projectPath) {
      setError('Please select a project folder first')
      changeStep('folder')
      return
    }

    if (method === 'manual') {
      // Create project immediately with manual method
      try {
        const project = await createProject.mutateAsync({
          name: projectName.trim(),
          path: projectPath,
          specMethod: 'manual',
        })
        changeStep('complete')
        setTimeout(() => {
          onProjectCreated(project.name)
          handleClose()
        }, 1500)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to create project')
      }
    } else {
      // Create project then show chat
      try {
        await createProject.mutateAsync({
          name: projectName.trim(),
          path: projectPath,
          specMethod: 'claude',
        })
        changeStep('chat')
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to create project')
      }
    }
  }

  const handleSpecComplete = async (_specPath: string, yoloMode: boolean = false) => {
    // Save yoloMode for retry
    setYoloModeSelected(yoloMode)
    // Auto-start the initializer agent
    setInitializerStatus('starting')
    try {
      // Use default concurrency of 3 to match AgentControl.tsx default
      await startAgent(projectName.trim(), {
        yoloMode,
        maxConcurrency: 3,
      })
      // Success - navigate to project
      changeStep('complete')
      setTimeout(() => {
        onProjectCreated(projectName.trim())
        handleClose()
      }, 1500)
    } catch (err) {
      setInitializerStatus('error')
      setInitializerError(err instanceof Error ? err.message : 'Failed to start agent')
    }
  }

  const handleRetryInitializer = () => {
    setInitializerError(null)
    setInitializerStatus('idle')
    handleSpecComplete('', yoloModeSelected)
  }

  const handleChatCancel = () => {
    // Go back to method selection but keep the project
    changeStep('method')
    setSpecMethod(null)
  }

  const handleExitToProject = () => {
    // Exit chat and go directly to project - user can start agent manually
    onProjectCreated(projectName.trim())
    handleClose()
  }

  const handleClose = () => {
    changeStep('name')
    setProjectName('')
    setProjectPath(null)
    setSpecMethod(null)
    setError(null)
    setInitializerStatus('idle')
    setInitializerError(null)
    setYoloModeSelected(false)
    setProjectSource(null)
    setGithubUrl('')
    setGithubBranch('')
    setGithubToken('')
    setGithubError(null)
    onClose()
  }

  const handleBack = () => {
    if (step === 'method') {
      changeStep('folder')
      setSpecMethod(null)
    } else if (step === 'folder') {
      if (projectSource === 'github') {
        changeStep('github')
      } else {
        changeStep('source')
      }
      setProjectPath(null)
    } else if (step === 'github') {
      changeStep('source')
      setGithubUrl('')
      setGithubBranch('')
      setGithubToken('')
      setGithubError(null)
    } else if (step === 'source') {
      changeStep('name')
      setProjectSource(null)
    }
  }

  const handleSourceSelect = (source: ProjectSource) => {
    setProjectSource(source)
    if (source === 'fresh' || source === 'existing') {
      changeStep('folder')
    } else if (source === 'github') {
      changeStep('github')
    }
  }


  const handleGithubSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedUrl = githubUrl.trim()
    if (!trimmedUrl) {
      setGithubError('Please enter a repository URL')
      return
    }
    // Relaxed check: must start with https:// or git@
    if (!trimmedUrl.startsWith('https://') && !trimmedUrl.startsWith('git@')) {
      setGithubError('URL must start with https:// or git@')
      return
    }
    setGithubError(null)
    changeStep('folder')
  }

  // Full-screen chat view - use portal to render at body level
  if (step === 'chat') {
    return createPortal(
      <div className="fixed inset-0 z-50 bg-background flex flex-col">
        <SpecCreationChat
          projectName={projectName.trim()}
          onComplete={handleSpecComplete}
          onCancel={handleChatCancel}
          onExitToProject={handleExitToProject}
          initializerStatus={initializerStatus}
          initializerError={initializerError}
          onRetryInitializer={handleRetryInitializer}
        />
      </div>,
      document.body
    )
  }

  // Folder step uses larger modal
  if (step === 'folder') {
    return (
      <Dialog open={true} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col p-0">
          {/* Header */}
          <DialogHeader className="p-6 pb-4 border-b">
            <div className="flex items-center gap-3">
              <Folder size={24} className="text-primary" />
              <div>
                <DialogTitle>Select Project Location</DialogTitle>
                <DialogDescription>
                  Select the folder to use for project <span className="font-semibold font-mono">{projectName}</span>. Create a new folder or choose an existing one.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Folder Browser */}
          <div className="flex-1 overflow-hidden">
            <FolderBrowser
              onSelect={handleFolderSelect}
              onCancel={handleFolderCancel}
            />
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={true} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {step === 'name' && 'Create New Project'}
            {step === 'source' && 'Choose Project Source'}
            {step === 'github' && 'Clone from GitHub'}
            {step === 'method' && 'Choose Setup Method'}
            {step === 'complete' && 'Project Created!'}
          </DialogTitle>
        </DialogHeader>

        {/* Step 1: Project Name */}
        {step === 'name' && (
          <form onSubmit={handleNameSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="project-name">Project Name</Label>
              <Input
                id="project-name"
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="my-awesome-app"
                pattern="^[a-zA-Z0-9_-]+$"
                autoFocus
              />
              <p className="text-sm text-muted-foreground">
                Use letters, numbers, hyphens, and underscores only.
              </p>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button type="submit" disabled={!projectName.trim()}>
                Next
                <ArrowRight size={16} />
              </Button>
            </DialogFooter>
          </form>
        )}

        {/* Step 2: Project Source */}
        {step === 'source' && (
          <div className="space-y-4">
            <DialogDescription>
              Where should the project code come from?
            </DialogDescription>

            <div className="space-y-3">
              {/* Start Fresh */}
              <Card
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => handleSourceSelect('fresh')}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Folder size={24} className="text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">Start Fresh</span>
                        <Badge>Recommended</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Create a new empty project in a folder of your choice.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Clone from GitHub */}
              <Card
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => handleSourceSelect('github')}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-secondary rounded-lg">
                      <GitBranch size={24} className="text-secondary-foreground" />
                    </div>
                    <div className="flex-1">
                      <span className="font-semibold">Clone from GitHub</span>
                      <p className="text-sm text-muted-foreground mt-1">
                        Clone an existing repository from GitHub or any Git remote.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Use Existing Folder */}
              <Card
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => handleSourceSelect('existing')}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-secondary rounded-lg">
                      <FolderOpen size={24} className="text-secondary-foreground" />
                    </div>
                    <div className="flex-1">
                      <span className="font-semibold">Use Existing Folder</span>
                      <p className="text-sm text-muted-foreground mt-1">
                        Point to an existing codebase on your machine.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <DialogFooter className="sm:justify-start">
              <Button variant="ghost" onClick={handleBack}>
                <ArrowLeft size={16} />
                Back
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Step 2b: GitHub URL */}
        {step === 'github' && (
          <form onSubmit={handleGithubSubmit} className="space-y-4">
            <DialogDescription>
              Enter the repository URL to clone.
            </DialogDescription>

            <div className="space-y-2">
              <Label htmlFor="github-url">Repository URL</Label>
              <Input
                id="github-url"
                type="text"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                placeholder="https://github.com/user/repo.git"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="github-branch">Branch (optional)</Label>
              <Input
                id="github-branch"
                type="text"
                value={githubBranch}
                onChange={(e) => setGithubBranch(e.target.value)}
                placeholder="main"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="github-token">Access Token (optional)</Label>
              <Input
                id="github-token"
                type="password"
                value={githubToken}
                onChange={(e) => setGithubToken(e.target.value)}
                placeholder="For private repositories"
              />
              <p className="text-xs text-muted-foreground">
                Required only for private repos. Uses GITHUB_TOKEN from .env if not provided.
              </p>
            </div>

            {githubError && (
              <Alert variant="destructive">
                <AlertDescription>{githubError}</AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button variant="ghost" onClick={handleBack} type="button">
                <ArrowLeft size={16} />
                Back
              </Button>
              <Button type="submit" disabled={!githubUrl.trim()}>
                Next
                <ArrowRight size={16} />
              </Button>
            </DialogFooter>
          </form>
        )}

        {/* Step 3: Spec Method */}
        {step === 'method' && (
          <div className="space-y-4">
            <DialogDescription>
              How would you like to define your project?
            </DialogDescription>

            <div className="space-y-3">
              {/* Claude option */}
              <Card
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => !createProject.isPending && handleMethodSelect('claude')}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Bot size={24} className="text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">Create with Claude</span>
                        <Badge>Recommended</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Interactive conversation to define features and generate your app specification automatically.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Manual option */}
              <Card
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => !createProject.isPending && handleMethodSelect('manual')}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-secondary rounded-lg">
                      <FileEdit size={24} className="text-secondary-foreground" />
                    </div>
                    <div className="flex-1">
                      <span className="font-semibold">Edit Templates Manually</span>
                      <p className="text-sm text-muted-foreground mt-1">
                        Edit the template files directly. Best for developers who want full control.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {createProject.isPending && (
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Loader2 size={16} className="animate-spin" />
                <span>Creating project...</span>
              </div>
            )}

            <DialogFooter className="sm:justify-start">
              <Button
                variant="ghost"
                onClick={handleBack}
                disabled={createProject.isPending}
              >
                <ArrowLeft size={16} />
                Back
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Step 3: Complete */}
        {step === 'complete' && (
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
              <CheckCircle2 size={32} className="text-primary" />
            </div>
            <h3 className="font-semibold text-xl mb-2">{projectName}</h3>
            <p className="text-muted-foreground">
              Your project has been created successfully!
            </p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <Loader2 size={16} className="animate-spin" />
              <span className="text-sm text-muted-foreground">Redirecting...</span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
