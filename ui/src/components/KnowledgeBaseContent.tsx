import { BookOpen, Plus, Search, FileText, Save, Trash2, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useKnowledgeBase } from '@/hooks/useMetadata'
import { useState, useEffect } from 'react'

interface KnowledgeBaseContentProps {
    projectName: string
}

export function KnowledgeBaseContent({ projectName }: KnowledgeBaseContentProps) {
    const { items, isLoading, save, isSaving, deleteItem, isDeleting } = useKnowledgeBase(projectName)
    const [selectedItem, setSelectedItem] = useState<string | null>(null)
    const [isCreating, setIsCreating] = useState(false)
    const [newFilename, setNewFilename] = useState('')
    const [editedContent, setEditedContent] = useState('')
    const [searchQuery, setSearchQuery] = useState('')
    const [saveSuccess, setSaveSuccess] = useState(false)
    const [deleteSuccess, setDeleteSuccess] = useState(false)
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

    useEffect(() => {
        if (!selectedItem && !isCreating) return
        setHasUnsavedChanges(true)
    }, [editedContent])

    const handleSelectItem = async (filename: string) => {
        if (hasUnsavedChanges && !confirm('You have unsaved changes. Continue?')) return

        setSelectedItem(filename)
        setIsCreating(false)
        setHasUnsavedChanges(false)

        try {
            const res = await fetch(`/api/projects/${projectName}/metadata/knowledge/${filename}`)
            const data = await res.json()
            setEditedContent(data.content || '')
        } catch (e) {
            alert('Failed to load knowledge item')
        }
    }

    const handleCreateNew = () => {
        if (hasUnsavedChanges && !confirm('You have unsaved changes. Continue?')) return

        setIsCreating(true)
        setSelectedItem(null)
        setNewFilename('')
        setEditedContent('# New Knowledge Item\n\n## Overview\n\n## Details\n\n')
        setHasUnsavedChanges(false)
    }

    const handleSave = () => {
        const filename = isCreating ? `${newFilename}.md` : selectedItem!
        if (!filename || (isCreating && !newFilename)) {
            alert('Please enter a filename')
            return
        }
        save({ filename, content: editedContent }, {
            onSuccess: () => {
                setIsCreating(false)
                setSelectedItem(filename)
                setHasUnsavedChanges(false)
                setSaveSuccess(true)
                setTimeout(() => setSaveSuccess(false), 3000)
            },
        })
    }

    const handleDelete = () => {
        if (!selectedItem) return
        if (!confirm(`Delete ${selectedItem}?`)) return
        deleteItem(selectedItem, {
            onSuccess: () => {
                setSelectedItem(null)
                setEditedContent('')
                setHasUnsavedChanges(false)
                setDeleteSuccess(true)
                setTimeout(() => setDeleteSuccess(false), 3000)
            },
        })
    }

    const filteredItems = items.filter((item: string) =>
        item.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <div className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-category-3/10 rounded-xl flex items-center justify-center">
                                <BookOpen className="text-category-3" size={24} />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold tracking-tight">Knowledge Base</h1>
                                <p className="text-muted-foreground">
                                    Documentation for {projectName}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Notifications */}
                {saveSuccess && (
                    <div className="bg-success/10 border border-success/20 text-success px-4 py-2.5 rounded-lg flex items-center gap-2 text-sm">
                        <CheckCircle2 size={16} />
                        <span>Saved successfully</span>
                    </div>
                )}

                {deleteSuccess && (
                    <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-2.5 rounded-lg flex items-center gap-2 text-sm">
                        <AlertCircle size={16} />
                        <span>Deleted successfully</span>
                    </div>
                )}

                {hasUnsavedChanges && !isSaving && (
                    <div className="bg-warning/10 border border-warning/20 text-warning px-4 py-2.5 rounded-lg flex items-center gap-2 text-sm">
                        <AlertCircle size={16} />
                        <span>Unsaved changes</span>
                    </div>
                )}

                {/* Main content */}
                <div className="grid grid-cols-12 gap-4">
                    {/* Sidebar */}
                    <div className="col-span-4 space-y-3">
                        <Card>
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-base font-medium">Items</CardTitle>
                                    <Button size="sm" onClick={handleCreateNew}>
                                        <Plus size={14} className="mr-1" />
                                        New
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-2.5 text-muted-foreground" size={16} />
                                    <Input
                                        placeholder="Search..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-8 h-9"
                                    />
                                </div>

                                {isLoading ? (
                                    <div className="flex flex-col items-center justify-center py-12 space-y-2">
                                        <Loader2 className="animate-spin text-muted-foreground" size={24} />
                                        <p className="text-xs text-muted-foreground">Loading...</p>
                                    </div>
                                ) : filteredItems.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 space-y-2">
                                        <FileText className="text-muted-foreground/30" size={32} />
                                        <p className="text-xs text-muted-foreground">
                                            {searchQuery ? 'No matches' : 'No items yet'}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-1 max-h-[600px] overflow-y-auto">
                                        {filteredItems.map((item: string) => (
                                            <button
                                                key={item}
                                                onClick={() => handleSelectItem(item)}
                                                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2 ${selectedItem === item
                                                    ? 'bg-primary/10 text-primary font-medium'
                                                    : 'hover:bg-muted text-muted-foreground'
                                                    }`}
                                            >
                                                <FileText size={14} />
                                                <span className="truncate">{item.replace('.md', '')}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Editor */}
                    <div className="col-span-8">
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <CardTitle className="text-base font-medium">
                                            {isCreating ? 'New Item' : selectedItem ? selectedItem.replace('.md', '') : 'Select an item'}
                                        </CardTitle>
                                        <CardDescription className="text-xs">
                                            {isCreating ? 'Create documentation' : selectedItem ? 'Edit content' : 'Choose from sidebar'}
                                        </CardDescription>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {selectedItem && !isCreating && (
                                            <Button variant="destructive" size="sm" onClick={handleDelete} disabled={isDeleting}>
                                                {isDeleting ? <Loader2 className="mr-1.5 animate-spin" size={14} /> : <Trash2 className="mr-1.5" size={14} />}
                                                Delete
                                            </Button>
                                        )}
                                        <Button onClick={handleSave} disabled={isSaving || (!selectedItem && !isCreating) || !hasUnsavedChanges} size="sm">
                                            {isSaving ? (
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
                                {isCreating && (
                                    <div className="space-y-1.5">
                                        <Label htmlFor="filename" className="text-xs font-medium">Filename</Label>
                                        <Input
                                            id="filename"
                                            placeholder="e.g., architecture, api-design"
                                            value={newFilename}
                                            onChange={(e) => setNewFilename(e.target.value)}
                                            className="h-9"
                                            autoFocus
                                        />
                                        <p className="text-xs text-muted-foreground">.md extension added automatically</p>
                                    </div>
                                )}

                                <div className="space-y-1.5">
                                    <Label htmlFor="content" className="text-xs font-medium">Content (Markdown)</Label>
                                    <Textarea
                                        id="content"
                                        value={editedContent}
                                        onChange={(e) => setEditedContent(e.target.value)}
                                        placeholder="# Title&#10;&#10;Write your documentation..."
                                        className="min-h-[600px] font-mono text-xs resize-none"
                                        disabled={!selectedItem && !isCreating}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
        </div>
    )
}
