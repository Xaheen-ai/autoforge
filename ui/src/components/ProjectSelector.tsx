import { useState } from 'react'
import { ChevronDown, Plus, FolderOpen, Loader2, Trash2, Database, FileText, Settings } from 'lucide-react'
import type { ProjectSummary } from '../lib/types'
import { NewProjectModal } from './NewProjectModal'
import { ConfirmDialog } from './ConfirmDialog'
import { useDeleteProject } from '../hooks/useProjects'
import { initializeConvex } from '../lib/api'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface ProjectSelectorProps {
  projects: ProjectSummary[]
  selectedProject: string | null
  onSelectProject: (name: string | null) => void
  isLoading: boolean
  onSpecCreatingChange?: (isCreating: boolean) => void
  className?: string
}

export function ProjectSelector({
  projects,
  selectedProject,
  onSelectProject,
  isLoading,
  onSpecCreatingChange,
  className,
}: ProjectSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showNewProjectModal, setShowNewProjectModal] = useState(false)
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null)
  const [initializingConvex, setInitializingConvex] = useState(false)
  const [convexInitMessage, setConvexInitMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const deleteProject = useDeleteProject()

  const handleProjectCreated = (projectName: string) => {
    onSelectProject(projectName)
    setIsOpen(false)
  }

  const handleDeleteClick = (e: React.MouseEvent, projectName: string) => {
    e.stopPropagation()
    e.preventDefault()
    setProjectToDelete(projectName)
  }

  const handleConfirmDelete = async () => {
    if (!projectToDelete) return

    try {
      await deleteProject.mutateAsync(projectToDelete)
      if (selectedProject === projectToDelete) {
        onSelectProject(null)
      }
      setProjectToDelete(null)
    } catch (error) {
      console.error('Failed to delete project:', error)
      setProjectToDelete(null)
    }
  }

  const handleCancelDelete = () => {
    setProjectToDelete(null)
  }

  const handleInitializeConvex = async () => {
    if (!selectedProject) return

    setInitializingConvex(true)
    setConvexInitMessage(null)

    try {
      const result = await initializeConvex(selectedProject)
      setConvexInitMessage({
        type: 'success',
        text: result.message || 'Convex templates copied! Run npx convex dev in your project directory.'
      })
      setTimeout(() => setConvexInitMessage(null), 5000)
    } catch (error: any) {
      setConvexInitMessage({
        type: 'error',
        text: error.message || 'Failed to initialize Convex'
      })
    } finally {
      setInitializingConvex(false)
    }
  }

  const selectedProjectData = projects.find(p => p.name === selectedProject)

  return (
    <div className="relative">
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className={cn("min-w-[140px] sm:min-w-[200px] justify-between", className)}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : selectedProject ? (
              <>
                <span className="flex items-center gap-2 truncate">
                  <FolderOpen size={18} className="shrink-0" />
                  <span className="truncate">{selectedProject}</span>
                </span>
                {selectedProjectData && selectedProjectData.stats.total > 0 && (
                  <Badge className="ml-2">{selectedProjectData.stats.percentage}%</Badge>
                )}
              </>
            ) : (
              <span className="text-muted-foreground">Select Project</span>
            )}
            <ChevronDown size={18} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="w-[280px] p-0 flex flex-col">
          {projects.length > 0 ? (
            <div className="max-h-[300px] overflow-y-auto p-1">
              {projects.map(project => (
                <DropdownMenuItem
                  key={project.name}
                  className={`flex items-center justify-between cursor-pointer ${project.name === selectedProject ? 'bg-primary/10' : ''
                    }`}
                  onSelect={() => {
                    onSelectProject(project.name)
                  }}
                >
                  <span className="flex items-center gap-2 flex-1">
                    <FolderOpen size={16} />
                    {project.name}
                    {project.stats.total > 0 && (
                      <span className="text-sm font-mono text-muted-foreground ml-auto">
                        {project.stats.passing}/{project.stats.total}
                      </span>
                    )}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={(e: React.MouseEvent) => handleDeleteClick(e, project.name)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 size={14} />
                  </Button>
                </DropdownMenuItem>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-muted-foreground">
              No projects yet
            </div>
          )}

          <DropdownMenuSeparator className="my-0" />

          <div className="p-1">
            <DropdownMenuItem
              onSelect={() => {
                setShowNewProjectModal(true)
              }}
              className="cursor-pointer font-semibold"
            >
              <Plus size={16} />
              New Project
            </DropdownMenuItem>
          </div>

          {/* Project Actions - Only show when project is selected */}
          {selectedProject && (
            <>
              <DropdownMenuSeparator className="my-0" />
              <div className="p-1">
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                  Project Actions
                </div>
                <DropdownMenuItem
                  onSelect={handleInitializeConvex}
                  disabled={initializingConvex}
                  className="cursor-pointer"
                >
                  {initializingConvex ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Database size={16} />
                  )}
                  Initialize Convex
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => {
                    // TODO: Open prompts editor
                    console.log('Edit prompts')
                  }}
                  className="cursor-pointer"
                >
                  <FileText size={16} />
                  Edit Prompts
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => {
                    // TODO: Open project settings
                    console.log('Project settings')
                  }}
                  className="cursor-pointer"
                >
                  <Settings size={16} />
                  Project Settings
                </DropdownMenuItem>
              </div>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Convex Init Message */}
      {convexInitMessage && (
        <div className={`absolute top-full left-0 right-0 mt-2 p-3 rounded-md text-sm ${convexInitMessage.type === 'success'
            ? 'bg-success/10 text-success border border-success/30'
            : 'bg-destructive/10 text-destructive border border-destructive/30'
          }`}>
          {convexInitMessage.text}
        </div>
      )}

      {/* New Project Modal */}
      <NewProjectModal
        isOpen={showNewProjectModal}
        onClose={() => setShowNewProjectModal(false)}
        onProjectCreated={handleProjectCreated}
        onStepChange={(step) => onSpecCreatingChange?.(step === 'chat')}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={projectToDelete !== null}
        title="Delete Project"
        message={`Are you sure you want to remove "${projectToDelete}" from the registry? This will unregister the project but preserve its files on disk.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        isLoading={deleteProject.isPending}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </div>
  )
}
