import { Map, Target, Users, TrendingUp } from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface RoadmapModalProps {
    isOpen: boolean
    onClose: () => void
    projectName: string | null
}

export function RoadmapModal({ isOpen, onClose, projectName }: RoadmapModalProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Map className="text-category-7" size={24} />
                        Roadmap - {projectName}
                    </DialogTitle>
                    <DialogDescription>
                        AI-assisted feature planning with competitor analysis and audience targeting
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <Card className="cursor-pointer hover:border-primary transition-colors">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <Target size={18} className="text-destructive" />
                                    Feature Planning
                                </CardTitle>
                                <CardDescription>
                                    Generate feature roadmap based on project goals
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
                                    <TrendingUp size={18} className="text-success" />
                                    Competitor Analysis
                                </CardTitle>
                                <CardDescription>
                                    Analyze competitor features and market gaps
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
                                    <Users size={18} className="text-category-6" />
                                    Audience Targeting
                                </CardTitle>
                                <CardDescription>
                                    Define and prioritize features for target users
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
                                    <Map size={18} className="text-category-7" />
                                    Milestone Planning
                                </CardTitle>
                                <CardDescription>
                                    Break down roadmap into achievable milestones
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
