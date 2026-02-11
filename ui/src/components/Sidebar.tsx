import { BookOpen, Settings, Keyboard, Lightbulb, Map, FileText, Database, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProjectSelector } from './ProjectSelector'
import { Separator } from '@/components/ui/separator'
import type { ProjectSummary } from '../lib/types'

interface SidebarProps {
    projects: ProjectSummary[]
    selectedProject: string | null
    onSelectProject: (project: string | null) => void
    projectsLoading: boolean
    onSpecCreatingChange: (isCreating: boolean) => void
    onOpenSettings: () => void
    onOpenShortcuts: () => void
    onOpenIdeation: () => void
    onOpenRoadmap: () => void
    onOpenProjectContext: () => void
    onOpenKnowledge: () => void
    onOpenConvexInit: () => void
    onOpenPromptsEditor: () => void
}

export function Sidebar({
    projects,
    selectedProject,
    onSelectProject,
    projectsLoading,
    onSpecCreatingChange,
    onOpenSettings,
    onOpenShortcuts,
    onOpenIdeation,
    onOpenRoadmap,
    onOpenProjectContext,
    onOpenKnowledge,
    onOpenConvexInit,
    onOpenPromptsEditor
}: SidebarProps) {
    return (
        <aside className="w-64 bg-card border-r border-border flex flex-col h-full shrink-0 relative z-30">
            {/* Header */}
            <div className="p-4 border-b border-border flex items-center gap-3 h-16 shrink-0">
                <img src="/logo.png" alt="Xaheen" className="h-8 w-8 rounded-full" />
                <h1 className="font-display font-bold text-lg tracking-tight uppercase">
                    Xaheen
                </h1>
            </div>

            <div className="flex-1 overflow-y-auto py-4 px-3 space-y-4">
                {/* Project Selector Section */}
                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase px-2 tracking-wider">
                        Workspace
                    </label>
                    <ProjectSelector
                        projects={projects}
                        selectedProject={selectedProject}
                        onSelectProject={onSelectProject}
                        isLoading={projectsLoading}
                        onSpecCreatingChange={onSpecCreatingChange}
                        className="w-full justify-between"
                    />
                </div>

                {/* Project-Specific Actions - Only show when project is selected */}
                {selectedProject && (
                    <>
                        <Separator />
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase px-2 tracking-wider mb-2 block">
                                Project Actions
                            </label>

                            <Button
                                variant="ghost"
                                className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
                                onClick={onOpenIdeation}
                            >
                                <Lightbulb size={18} />
                                Ideation
                            </Button>

                            <Button
                                variant="ghost"
                                className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
                                onClick={onOpenRoadmap}
                            >
                                <Map size={18} />
                                Roadmap
                            </Button>

                            <Button
                                variant="ghost"
                                className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
                                onClick={onOpenKnowledge}
                            >
                                <BookOpen size={18} />
                                Knowledge Base
                            </Button>

                            <Button
                                variant="ghost"
                                className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
                                onClick={onOpenPromptsEditor}
                            >
                                <Sparkles size={18} />
                                Prompts
                            </Button>

                            <Separator className="my-2" />

                            <Button
                                variant="ghost"
                                className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
                                onClick={onOpenProjectContext}
                            >
                                <FileText size={18} />
                                Project Context
                            </Button>

                            <Button
                                variant="ghost"
                                className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
                                onClick={onOpenConvexInit}
                            >
                                <Database size={18} />
                                Initialize Convex
                            </Button>

                            <Button
                                variant="ghost"
                                className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
                                onClick={onOpenPromptsEditor}
                            >
                                <FileText size={18} />
                                Edit Prompts
                            </Button>
                        </div>
                    </>
                )}
            </div>

            {/* Footer - Global Settings */}
            <div className="border-t border-border mt-auto">
                <Separator className="mb-0" />

                {/* Global Navigation */}
                <div className="p-3 space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase px-2 tracking-wider mb-2 block">
                        Settings
                    </label>

                    <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
                        onClick={() => window.open('https://xaheen.ai', '_blank')}
                    >
                        <BookOpen size={16} />
                        Documentation
                    </Button>

                    <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
                        onClick={onOpenSettings}
                    >
                        <Settings size={16} />
                        Settings
                    </Button>

                    <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
                        onClick={onOpenShortcuts}
                    >
                        <Keyboard size={16} />
                        Shortcuts
                    </Button>
                </div>
            </div>
        </aside>
    )
}
