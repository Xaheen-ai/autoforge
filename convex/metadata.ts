/**
 * Convex Metadata Sync
 * 
 * Mutations for syncing metadata from file system to Convex for:
 * - Cross-project analytics
 * - Real-time updates
 * - Centralized search
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Sync ideation metadata
export const syncIdeation = mutation({
    args: {
        projectName: v.string(),
        content: v.string(),
        lastModified: v.number(),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("ideation")
            .withIndex("by_project", (q) => q.eq("projectName", args.projectName))
            .first();

        if (existing) {
            await ctx.db.patch(existing._id, {
                content: args.content,
                lastModified: args.lastModified,
                syncedAt: Date.now(),
            });
            return { updated: true, id: existing._id };
        } else {
            const id = await ctx.db.insert("ideation", {
                projectName: args.projectName,
                content: args.content,
                lastModified: args.lastModified,
                syncedAt: Date.now(),
            });
            return { updated: false, id };
        }
    },
});

// Sync context metadata
export const syncContext = mutation({
    args: {
        projectName: v.string(),
        context: v.any(),
        lastModified: v.number(),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("context")
            .withIndex("by_project", (q) => q.eq("projectName", args.projectName))
            .first();

        if (existing) {
            await ctx.db.patch(existing._id, {
                context: args.context,
                lastModified: args.lastModified,
                syncedAt: Date.now(),
            });
            return { updated: true, id: existing._id };
        } else {
            const id = await ctx.db.insert("context", {
                projectName: args.projectName,
                context: args.context,
                lastModified: args.lastModified,
                syncedAt: Date.now(),
            });
            return { updated: false, id };
        }
    },
});

// Sync roadmap metadata
export const syncRoadmap = mutation({
    args: {
        projectName: v.string(),
        roadmap: v.any(),
        lastModified: v.number(),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("roadmap")
            .withIndex("by_project", (q) => q.eq("projectName", args.projectName))
            .first();

        if (existing) {
            await ctx.db.patch(existing._id, {
                roadmap: args.roadmap,
                lastModified: args.lastModified,
                syncedAt: Date.now(),
            });
            return { updated: true, id: existing._id };
        } else {
            const id = await ctx.db.insert("roadmap", {
                projectName: args.projectName,
                roadmap: args.roadmap,
                lastModified: args.lastModified,
                syncedAt: Date.now(),
            });
            return { updated: false, id };
        }
    },
});

// Sync knowledge base item
export const syncKnowledgeItem = mutation({
    args: {
        projectName: v.string(),
        filename: v.string(),
        content: v.string(),
        lastModified: v.number(),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("knowledge")
            .withIndex("by_project_file", (q) =>
                q.eq("projectName", args.projectName).eq("filename", args.filename)
            )
            .first();

        if (existing) {
            await ctx.db.patch(existing._id, {
                content: args.content,
                lastModified: args.lastModified,
                syncedAt: Date.now(),
            });
            return { updated: true, id: existing._id };
        } else {
            const id = await ctx.db.insert("knowledge", {
                projectName: args.projectName,
                filename: args.filename,
                content: args.content,
                lastModified: args.lastModified,
                syncedAt: Date.now(),
            });
            return { updated: false, id };
        }
    },
});

// Delete knowledge base item
export const deleteKnowledgeItem = mutation({
    args: {
        projectName: v.string(),
        filename: v.string(),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("knowledge")
            .withIndex("by_project_file", (q) =>
                q.eq("projectName", args.projectName).eq("filename", args.filename)
            )
            .first();

        if (existing) {
            await ctx.db.delete(existing._id);
            return { deleted: true };
        }
        return { deleted: false };
    },
});

// Query: Get all projects with metadata
export const listProjects = query({
    handler: async (ctx) => {
        const ideations = await ctx.db.query("ideation").collect();
        const contexts = await ctx.db.query("context").collect();
        const roadmaps = await ctx.db.query("roadmap").collect();

        const projectNames = new Set([
            ...ideations.map(i => i.projectName),
            ...contexts.map(c => c.projectName),
            ...roadmaps.map(r => r.projectName),
        ]);

        return Array.from(projectNames).map(name => ({
            name,
            hasIdeation: ideations.some(i => i.projectName === name),
            hasContext: contexts.some(c => c.projectName === name),
            hasRoadmap: roadmaps.some(r => r.projectName === name),
        }));
    },
});

// Query: Get project metadata summary
export const getProjectMetadata = query({
    args: { projectName: v.string() },
    handler: async (ctx, args) => {
        const ideation = await ctx.db
            .query("ideation")
            .withIndex("by_project", (q) => q.eq("projectName", args.projectName))
            .first();

        const context = await ctx.db
            .query("context")
            .withIndex("by_project", (q) => q.eq("projectName", args.projectName))
            .first();

        const roadmap = await ctx.db
            .query("roadmap")
            .withIndex("by_project", (q) => q.eq("projectName", args.projectName))
            .first();

        const knowledge = await ctx.db
            .query("knowledge")
            .withIndex("by_project_file", (q) => q.eq("projectName", args.projectName))
            .collect();

        return {
            ideation,
            context,
            roadmap,
            knowledge,
        };
    },
});

// Query: Search across all knowledge bases
export const searchKnowledge = query({
    args: { query: v.string() },
    handler: async (ctx, args) => {
        const allKnowledge = await ctx.db.query("knowledge").collect();
        const searchLower = args.query.toLowerCase();

        return allKnowledge
            .filter(item =>
                item.filename.toLowerCase().includes(searchLower) ||
                item.content.toLowerCase().includes(searchLower)
            )
            .map(item => ({
                projectName: item.projectName,
                filename: item.filename,
                preview: item.content.substring(0, 200),
                lastModified: item.lastModified,
            }));
    },
});
