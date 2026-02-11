import { BookOpen, Plus, Search, FileText, Save, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useKnowledgeBase } from '@/hooks/useMetadata'
import { useState } from 'react'

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

    const handleSelectItem = async (filename: string) => {
        setSelectedItem(filename)
        setIsCreating(false)
        // Load content
        try {
            const res = await fetch(`/api/projects/${projectName}/metadata/knowledge/${filename}`)
            const data = await res.json()
            setEditedContent(data.content || '')
        } catch (e) {
            alert('Failed to load knowledge item')
        }
    }

    const handleCreateNew = () => {
        setIsCreating(true)
        setSelectedItem(null)
        setNewFilename('')
        setEditedContent('# New Knowledge Item\n\n## Overview\n\n## Details\n\n')
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
            },
        })
    }

    const filteredItems = items.filter((item: any) =>
        item.title.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <>
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
                                Project memory and decisions for {projectName}
                            </p>
                        </div>
                    </div>
                </div>

                <Button size="lg" onClick={handleCreateNew} className="hover:shadow-glow-primary-sm transition-shadow">
                    <Plus className="mr-2" size={20} />
                    Add Knowledge
                </Button>
            </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={20} />
                    <Input
                        placeholder="Search knowledge base..."
                        className="pl-10 h-12 text-base"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                {/* Content */}
                {isLoading ? (
                    <Card>
                        <CardContent className="flex items-center justify-center py-16">
                            <p className="text-muted-foreground">Loading...</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-12 gap-6">
                        {/* Sidebar */}
                        <div className="col-span-3 space-y-4">
                            <Card>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm">Knowledge Items ({filteredItems.length})</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-1">
                                    {filteredItems.length === 0 ? (
                                        <p className="text-sm text-muted-foreground py-4 text-center">
                                            {items.length === 0 ? 'No items yet' : 'No matches'}
                                        </p>
                                    ) : (
                                        filteredItems.map((item: any) => (
                                            <Button
                                                key={item.filename}
                                                variant={selectedItem === item.filename ? 'default' : 'ghost'}
                                                size="sm"
                                                className="w-full justify-start text-left"
                                                onClick={() => handleSelectItem(item.filename)}
                                            >
                                                <FileText className="mr-2 flex-shrink-0" size={14} />
                                                <span className="truncate">{item.title}</span>
                                            </Button>
                                        ))
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Editor */}
                        <div className="col-span-9">
                            <Card>
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <CardTitle>
                                                {isCreating ? 'New Knowledge Item' : selectedItem || 'Select an item'}
                                            </CardTitle>
                                            <CardDescription>
                                                Document architecture decisions, gotchas, and patterns
                                            </CardDescription>
                                        </div>
                                        <div className="flex gap-2">
                                            {selectedItem && !isCreating && (
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={handleDelete}
                                                    disabled={isDeleting}
                                                >
                                                    <Trash2 className="mr-2" size={14} />
                                                    Delete
                                                </Button>
                                            )}
                                            <Button
                                                size="sm"
                                                onClick={handleSave}
                                                disabled={isSaving || (!isCreating && !selectedItem)}
                                            >
                                                <Save className="mr-2" size={14} />
                                                {isSaving ? 'Saving...' : 'Save'}
                                            </Button>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {isCreating && (
                                        <div className="space-y-2">
                                            <Label>Filename</Label>
                                            <Input
                                                value={newFilename}
                                                onChange={(e) => setNewFilename(e.target.value)}
                                                placeholder="architecture-decisions"
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                Will be saved as {newFilename || 'filename'}.md
                                            </p>
                                        </div>
                                    )}
                                    <Textarea
                                        value={editedContent}
                                        onChange={(e) => setEditedContent(e.target.value)}
                                        placeholder="# Knowledge Item

## Overview

## Details"
                                        className="min-h-[500px] font-mono text-sm"
                                        disabled={!isCreating && !selectedItem}
                                    />
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                )}
        </>
    )
}
