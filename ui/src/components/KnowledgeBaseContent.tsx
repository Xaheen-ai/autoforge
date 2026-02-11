import { BookOpen, ArrowLeft, Plus, Search, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface KnowledgeBaseContentProps {
    projectName: string
    onBack: () => void
}

export function KnowledgeBaseContent({ projectName, onBack }: KnowledgeBaseContentProps) {
    const categories = [
        { id: 'all', label: 'All', count: 0 },
        { id: 'decisions', label: 'Decisions', count: 0 },
        { id: 'patterns', label: 'Patterns', count: 0 },
        { id: 'gotchas', label: 'Gotchas', count: 0 },
        { id: 'context', label: 'Context', count: 0 },
    ]

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
                                <div className="w-12 h-12 bg-category-3/10 rounded-xl flex items-center justify-center">
                                    <BookOpen className="text-category-3" size={24} />
                                </div>
                                <div>
                                    <h1 className="text-3xl font-bold tracking-tight">Knowledge Base</h1>
                                    <p className="text-muted-foreground">
                                        Project memory and decisions for {projectName}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <Button size="lg">
                            <Plus className="mr-2" size={20} />
                            Add Knowledge
                        </Button>
                    </div>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={20} />
                    <Input
                        placeholder="Search knowledge base..."
                        className="pl-10 h-12 text-base"
                    />
                </div>

                {/* Categories */}
                <Tabs defaultValue="all" className="w-full">
                    <TabsList className="grid w-full max-w-2xl grid-cols-5">
                        {categories.map((cat) => (
                            <TabsTrigger key={cat.id} value={cat.id}>
                                {cat.label} ({cat.count})
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    <TabsContent value="all" className="space-y-4 mt-6">
                        {/* Empty State */}
                        <Card className="border-dashed">
                            <CardContent className="flex flex-col items-center justify-center py-20">
                                <div className="w-20 h-20 bg-category-3/10 rounded-full flex items-center justify-center mb-6">
                                    <BookOpen size={40} className="text-category-3" />
                                </div>
                                <h3 className="text-2xl font-semibold mb-3">No Knowledge Entries Yet</h3>
                                <p className="text-muted-foreground text-center max-w-lg mb-8">
                                    Start building your project's knowledge base by documenting important decisions, coding patterns, known gotchas, and business context.
                                </p>
                                <Button size="lg">
                                    <Plus className="mr-2" size={20} />
                                    Add First Entry
                                </Button>
                            </CardContent>
                        </Card>

                        {/* AI Suggestions Card */}
                        <Card className="bg-gradient-to-br from-category-3/5 to-category-7/5 border-category-3/20">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <Sparkles size={18} className="text-category-3" />
                                    AI Suggestions
                                </CardTitle>
                                <CardDescription>
                                    Based on recent commits, you might want to document these topics
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    No suggestions yet. Make some commits and AI will suggest knowledge to document.
                                </p>
                            </CardContent>
                        </Card>

                        {/* Example Knowledge Entry (will be populated by real data) */}
                        {/* <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-category-7 text-white">Decision</Badge>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock size={12} />
                        <span>2 weeks ago</span>
                      </div>
                    </div>
                    <CardTitle className="text-lg">Why we chose FastAPI over Flask</CardTitle>
                    <CardDescription>
                      We selected FastAPI because of its automatic API documentation, built-in validation with Pydantic, 
                      and superior performance for async operations.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Tag size={14} className="text-muted-foreground" />
                    <Badge variant="outline" className="text-xs">backend</Badge>
                    <Badge variant="outline" className="text-xs">framework</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="ghost">
                      <Edit className="mr-2" size={14} />
                      Edit
                    </Button>
                    <Button size="sm" variant="ghost">
                      <Trash2 className="mr-2" size={14} />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card> */}
                    </TabsContent>

                    {categories.slice(1).map((cat) => (
                        <TabsContent key={cat.id} value={cat.id} className="mt-6">
                            <Card className="border-dashed">
                                <CardContent className="flex flex-col items-center justify-center py-16">
                                    <h3 className="text-lg font-semibold mb-2">No {cat.label} Yet</h3>
                                    <p className="text-sm text-muted-foreground text-center max-w-md mb-6">
                                        Add {cat.label.toLowerCase()} to your knowledge base
                                    </p>
                                    <Button>
                                        <Plus className="mr-2" size={16} />
                                        Add {cat.label.slice(0, -1)}
                                    </Button>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    ))}
                </Tabs>
            </div>
        </div>
    )
}
