import { Lightbulb, Sparkles, AlertTriangle, TrendingUp } from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface IdeationModalProps {
    isOpen: boolean
    onClose: () => void
    projectName: string | null
}

export function IdeationModal({ isOpen, onClose, projectName }: IdeationModalProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Lightbulb className="text-yellow-500" size={24} />
                        Ideation - {projectName}
                    </DialogTitle>
                    <DialogDescription>
                        Discover improvements, performance issues, and vulnerabilities in your codebase
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <Card className="cursor-pointer hover:border-primary transition-colors">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <Sparkles size={18} className="text-blue-500" />
                                    Feature Suggestions
                                </CardTitle>
                                <CardDescription>
                                    AI-powered ideas for new features and improvements
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button variant="outline" className="w-full" disabled>
                                    Coming Soon
                                </Button>
                            </CardContent>
                        </Card>

                        <Card className="cursor-pointer hover:border-primary transition-colors">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <TrendingUp size={18} className="text-green-500" />
                                    Performance Analysis
                                </CardTitle>
                                <CardDescription>
                                    Identify bottlenecks and optimization opportunities
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button variant="outline" className="w-full" disabled>
                                    Coming Soon
                                </Button>
                            </CardContent>
                        </Card>

                        <Card className="cursor-pointer hover:border-primary transition-colors">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <AlertTriangle size={18} className="text-orange-500" />
                                    Security Scan
                                </CardTitle>
                                <CardDescription>
                                    Detect potential vulnerabilities and security issues
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button variant="outline" className="w-full" disabled>
                                    Coming Soon
                                </Button>
                            </CardContent>
                        </Card>

                        <Card className="cursor-pointer hover:border-primary transition-colors">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <Lightbulb size={18} className="text-purple-500" />
                                    Code Quality
                                </CardTitle>
                                <CardDescription>
                                    Suggestions for better code organization and patterns
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button variant="outline" className="w-full" disabled>
                                    Coming Soon
                                </Button>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="flex justify-end">
                        <Button variant="outline" onClick={onClose}>
                            Close
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
