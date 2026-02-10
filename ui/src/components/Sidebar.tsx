import { BookOpen, Settings, Keyboard, Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProjectSelector } from './ProjectSelector'
import { ThemeSelector } from './ThemeSelector'
import { Separator } from '@/components/ui/separator'
import type { ProjectSummary } from '../lib/types'
import type { ThemeId, ThemeOption } from '../hooks/useTheme'

interface SidebarProps {
    projects: ProjectSummary[]
    selectedProject: string | null
    onSelectProject: (project: string | null) => void
    projectsLoading: boolean
    onSpecCreatingChange: (isCreating: boolean) => void
    onOpenSettings: () => void
    onOpenShortcuts: () => void
    theme: ThemeId
    onThemeChange: (theme: ThemeId) => void
    themes: ThemeOption[]
    darkMode: boolean
    toggleDarkMode: () => void
}

export function Sidebar({
    projects,
    selectedProject,
    onSelectProject,
    projectsLoading,
    onSpecCreatingChange,
    onOpenSettings,
    onOpenShortcuts,
    theme,
    onThemeChange,
    themes,
    darkMode,
    toggleDarkMode
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

            <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
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

                <Separator />

                {/* Navigation Section */}
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase px-2 tracking-wider mb-2 block">
                        Navigation
                    </label>

                    <Button
                        variant="ghost"
                        className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
                        onClick={() => window.open('https://xaheen.ai', '_blank')}
                    >
                        <BookOpen size={18} />
                        Documentation
                    </Button>

                    <Button
                        variant="ghost"
                        className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
                        onClick={onOpenSettings}
                    >
                        <Settings size={18} />
                        Settings
                    </Button>

                    <Button
                        variant="ghost"
                        className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
                        onClick={onOpenShortcuts}
                    >
                        <Keyboard size={18} />
                        Shortcuts
                    </Button>
                </div>
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-border mt-auto space-y-2">
                {/* Theme Selector (Color) */}
                <div className="flex items-center justify-between px-2">
                    <span className="text-xs font-medium text-muted-foreground">Theme</span>
                    <ThemeSelector
                        themes={themes}
                        currentTheme={theme}
                        onThemeChange={onThemeChange}
                        side="top"
                    />
                </div>

                {/* Dark Mode Toggle */}
                <Button
                    variant="outline"
                    className="w-full justify-between"
                    onClick={toggleDarkMode}
                >
                    <span className="flex items-center gap-2">
                        {darkMode ? <Moon size={16} /> : <Sun size={16} />}
                        <span className="text-sm">{darkMode ? 'Dark Mode' : 'Light Mode'}</span>
                    </span>
                </Button>
            </div>
        </aside>
    )
}
