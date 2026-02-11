import { FileText, ArrowLeft, FolderTree, Package, GitBranch, Code2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'

interface ProjectContextContentProps {
    projectName: string
    onBack: () => void
}

export function ProjectContextContent({ projectName, onBack }: ProjectContextContentProps) {
    return (
        <div className="h-full overflow-auto">
            <div className="max-w-7xl mx-auto p-8 space-y-8">
                {/* Header */}
                <div className="space-y-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onBack}
                        className="mb-2"
                    >
                        <ArrowLeft className="mr-2" size={16} />
                        Back to Kanban
                    </Button>

                    <div className="flex items-start justify-between">
                        <div className="space-y-2">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center">
                                    <FileText className="text-purple-500" size={24} />
                                </div>
                                <div>
                                    <h1 className="text-3xl font-bold tracking-tight">Project Context</h1>
                                    <p className="text-muted-foreground">
                                        Deep codebase understanding for {projectName}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <Button variant="outline">
                            <Sparkles className="mr-2" size={16} />
                            Regenerate Summary
                        </Button>
                    </div>
                </div>

                {/* Tabs */}
                <Tabs defaultValue="overview" className="w-full">
                    <TabsList className="grid w-full max-w-2xl grid-cols-4">
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="files">Files</TabsTrigger>
                        <TabsTrigger value="dependencies">Dependencies</TabsTrigger>
                        <TabsTrigger value="architecture">Architecture</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="space-y-6 mt-6">
                        {/* Stats Grid */}
                        <div className="grid grid-cols-4 gap-4">
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardDescription className="text-xs uppercase tracking-wide">Files</CardDescription>
                                    <CardTitle className="text-3xl font-bold">247</CardTitle>
                                </CardHeader>
                            </Card>
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardDescription className="text-xs uppercase tracking-wide">Dependencies</CardDescription>
                                    <CardTitle className="text-3xl font-bold">45</CardTitle>
                                </CardHeader>
                            </Card>
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardDescription className="text-xs uppercase tracking-wide">Languages</CardDescription>
                                    <CardTitle className="text-3xl font-bold">3</CardTitle>
                                </CardHeader>
                            </Card>
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardDescription className="text-xs uppercase tracking-wide">Last Updated</CardDescription>
                                    <CardTitle className="text-xl font-bold">2h ago</CardTitle>
                                </CardHeader>
                            </Card>
                        </div>

                        {/* Project Info */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <FolderTree size={20} />
                                    Project Information
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-muted-foreground">Project Name</p>
                                        <p className="text-base font-semibold">{projectName}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-muted-foreground">Project Type</p>
                                        <Badge variant="outline">Full-stack Web Application</Badge>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-muted-foreground">Primary Language</p>
                                        <div className="flex items-center gap-2">
                                            <Code2 size={16} className="text-blue-500" />
                                            <span className="text-base font-semibold">TypeScript</span>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-muted-foreground">Framework</p>
                                        <Badge variant="outline">React + FastAPI</Badge>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* AI Summary */}
                        <Card className="bg-gradient-to-br from-purple-500/5 to-blue-500/5 border-purple-500/20">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Sparkles size={20} className="text-purple-500" />
                                    AI Understanding
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground leading-relaxed">
                                    This is a modern full-stack web application built with React for the frontend and FastAPI for the backend.
                                    The project follows a modular architecture with clear separation of concerns, utilizing TypeScript for type safety
                                    and modern development practices.
                                </p>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="files" className="mt-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>File Structure</CardTitle>
                                <CardDescription>Interactive file explorer (coming soon)</CardDescription>
                            </CardHeader>
                            <CardContent className="py-12 text-center text-muted-foreground">
                                <FolderTree size={48} className="mx-auto mb-4 opacity-50" />
                                <p>File explorer will be available soon</p>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="dependencies" className="mt-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Package size={20} />
                                    Dependencies
                                </CardTitle>
                                <CardDescription>Package analysis (coming soon)</CardDescription>
                            </CardHeader>
                            <CardContent className="py-12 text-center text-muted-foreground">
                                <Package size={48} className="mx-auto mb-4 opacity-50" />
                                <p>Dependency analysis will be available soon</p>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="architecture" className="mt-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <GitBranch size={20} />
                                    Architecture
                                </CardTitle>
                                <CardDescription>Pattern detection (coming soon)</CardDescription>
                            </CardHeader>
                            <CardContent className="py-12 text-center text-muted-foreground">
                                <GitBranch size={48} className="mx-auto mb-4 opacity-50" />
                                <p>Architecture analysis will be available soon</p>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    )
}
