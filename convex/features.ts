import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// ============================================================================
// Features
// ============================================================================

export const list = query({
    args: { projectId: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("features")
            .withIndex("by_project_priority", (q) => q.eq("projectId", args.projectId))
            .collect();
    },
});

export const create = mutation({
    args: {
        projectId: v.string(),
        priority: v.optional(v.number()), // Auto-calc if missing
        category: v.string(),
        name: v.string(),
        description: v.string(),
        steps: v.array(v.string()),
        passes: v.boolean(),
        in_progress: v.boolean(),
        dependencies: v.optional(v.array(v.number())),
    },
    handler: async (ctx, args) => {
        // 1. Calculate Feature ID (Atomic per project)
        const maxIdFeature = await ctx.db
            .query("features")
            .withIndex("by_project_featureId", q => q.eq("projectId", args.projectId))
            .order("desc")
            .first();
        const featureId = (maxIdFeature?.featureId || 0) + 1;

        // 2. Calculate Priority if missing
        let priority = args.priority;
        if (priority === undefined) {
            const maxPriFeature = await ctx.db
                .query("features")
                .withIndex("by_project_priority", q => q.eq("projectId", args.projectId))
                .order("desc")
                .first();
            priority = (maxPriFeature?.priority || 0) + 1;
        }

        const { projectId, category, name, description, steps, passes, in_progress, dependencies } = args;

        const id = await ctx.db.insert("features", {
            projectId,
            featureId,
            priority,
            category,
            name,
            description,
            steps,
            passes,
            in_progress,
            dependencies
        });

        return await ctx.db.get(id);
    },
});

export const getByFeatureId = query({
    args: { projectId: v.string(), featureId: v.number() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("features")
            .withIndex("by_project_featureId", (q) =>
                q.eq("projectId", args.projectId).eq("featureId", args.featureId)
            )
            .unique();
    },
});

export const updateByFeatureId = mutation({
    args: {
        projectId: v.string(),
        featureId: v.number(),
        fields: v.object({
            priority: v.optional(v.number()),
            category: v.optional(v.string()),
            name: v.optional(v.string()),
            description: v.optional(v.string()),
            steps: v.optional(v.array(v.string())),
            passes: v.optional(v.boolean()),
            in_progress: v.optional(v.boolean()),
            dependencies: v.optional(v.array(v.number())),
        })
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("features")
            .withIndex("by_project_featureId", (q) =>
                q.eq("projectId", args.projectId).eq("featureId", args.featureId)
            )
            .unique();

        if (!existing) throw new Error("Feature not found");

        await ctx.db.patch(existing._id, args.fields);

        // Refresh to return full object
        return await ctx.db.get(existing._id);
    },
});

export const deleteByFeatureId = mutation({
    args: { projectId: v.string(), featureId: v.number() },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("features")
            .withIndex("by_project_featureId", (q) =>
                q.eq("projectId", args.projectId).eq("featureId", args.featureId)
            )
            .unique();

        if (!existing) return false;

        // Clean up dependencies in OTHER features
        // "Remove featureId from dependencies list of any feature in this project"
        // This requires a scan + patch, which can be expensive but safer for data integrity.
        // Optimization: Filter for features where dependencies is not null/empty?
        // Convex doesn't support array-contains filter efficiently without specific index.
        // We'll scan all features for the project. For <1000 items it's fine.

        const allFeatures = await ctx.db
            .query("features")
            .withIndex("by_project", q => q.eq("projectId", args.projectId))
            .collect();

        for (const f of allFeatures) {
            if (f.dependencies && f.dependencies.includes(args.featureId)) {
                const newDeps = f.dependencies.filter(d => d !== args.featureId);
                await ctx.db.patch(f._id, { dependencies: newDeps });
            }
        }

        await ctx.db.delete(existing._id);
        return true;
    },
});

export const createBulk = mutation({
    args: {
        projectId: v.string(),
        features: v.array(v.object({
            category: v.string(),
            name: v.string(),
            description: v.string(),
            steps: v.array(v.string()),
            dependencies: v.optional(v.array(v.number())),
        })),
        startingPriority: v.optional(v.number())
    },
    handler: async (ctx, args) => {
        // Calculate max IDs once
        const maxIdFeature = await ctx.db
            .query("features")
            .withIndex("by_project_featureId", q => q.eq("projectId", args.projectId))
            .order("desc")
            .first();
        let currentFeatureId = (maxIdFeature?.featureId || 0) + 1;

        // Calculate priority
        let currentPriority = args.startingPriority;
        if (currentPriority === undefined) {
            const maxPriFeature = await ctx.db
                .query("features")
                .withIndex("by_project_priority", q => q.eq("projectId", args.projectId))
                .order("desc")
                .first();
            currentPriority = (maxPriFeature?.priority || 0) + 1;
        }

        const createdIds = [];

        for (const f of args.features) {
            const id = await ctx.db.insert("features", {
                projectId: args.projectId,
                featureId: currentFeatureId,
                priority: currentPriority,
                category: f.category,
                name: f.name,
                description: f.description,
                steps: f.steps,
                passes: false,
                in_progress: false,
                dependencies: f.dependencies
            });
            createdIds.push(id);
            currentFeatureId++;
            currentPriority++;
        }

        // Return created items
        const results = [];
        for (const id of createdIds) {
            results.push(await ctx.db.get(id));
        }
        return results;
    }
});

// Helper: skip
export const skip = mutation({
    args: { projectId: v.string(), featureId: v.number() },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("features")
            .withIndex("by_project_featureId", q => q.eq("projectId", args.projectId).eq("featureId", args.featureId))
            .unique();
        if (!existing) throw new Error("Feature not found");

        const maxPriFeature = await ctx.db
            .query("features")
            .withIndex("by_project_priority", q => q.eq("projectId", args.projectId))
            .order("desc")
            .first();
        const newPriority = (maxPriFeature?.priority || 0) + 1;

        await ctx.db.patch(existing._id, { priority: newPriority });
        return true;
    }
});
