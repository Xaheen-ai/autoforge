import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// ============================================================================
// Schedules
// ============================================================================

export const list = query({
    args: { projectId: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("schedules")
            .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
            .collect();
    },
});

export const create = mutation({
    args: {
        projectId: v.string(),
        scheduleId: v.optional(v.number()), // Auto-calc
        start_time: v.string(),
        duration_minutes: v.number(),
        days_of_week: v.number(),
        enabled: v.boolean(),
        yolo_mode: v.boolean(),
        model: v.optional(v.string()),
        max_concurrency: v.number(),
        crash_count: v.optional(v.number()),
        created_at: v.optional(v.string()), // Auto-calc? Or passed from client
    },
    handler: async (ctx, args) => {
        // 1. Calculate Schedule ID
        const maxIdSchedule = await ctx.db
            .query("schedules")
            .withIndex("by_project_scheduleId", q => q.eq("projectId", args.projectId))
            .order("desc")
            .first();
        const scheduleId = (maxIdSchedule?.scheduleId || 0) + 1;

        // 2. Created At default
        const created_at = args.created_at || new Date().toISOString();

        const id = await ctx.db.insert("schedules", {
            projectId: args.projectId,
            scheduleId: scheduleId,
            start_time: args.start_time,
            duration_minutes: args.duration_minutes,
            days_of_week: args.days_of_week,
            enabled: args.enabled,
            yolo_mode: args.yolo_mode,
            model: args.model,
            max_concurrency: args.max_concurrency,
            crash_count: args.crash_count || 0,
            created_at: created_at
        });

        return await ctx.db.get(id);
    },
});

export const getByScheduleId = query({
    args: { projectId: v.string(), scheduleId: v.number() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("schedules")
            .withIndex("by_project_scheduleId", (q) =>
                q.eq("projectId", args.projectId).eq("scheduleId", args.scheduleId)
            )
            .unique();
    },
});

export const updateByScheduleId = mutation({
    args: {
        projectId: v.string(),
        scheduleId: v.number(),
        fields: v.object({
            start_time: v.optional(v.string()),
            duration_minutes: v.optional(v.number()),
            days_of_week: v.optional(v.number()),
            enabled: v.optional(v.boolean()),
            yolo_mode: v.optional(v.boolean()),
            model: v.optional(v.string()),
            max_concurrency: v.optional(v.number()),
            crash_count: v.optional(v.number()),
        })
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("schedules")
            .withIndex("by_project_scheduleId", (q) =>
                q.eq("projectId", args.projectId).eq("scheduleId", args.scheduleId)
            )
            .unique();

        if (!existing) throw new Error("Schedule not found");

        await ctx.db.patch(existing._id, args.fields);
        return await ctx.db.get(existing._id);
    },
});

export const deleteByScheduleId = mutation({
    args: { projectId: v.string(), scheduleId: v.number() },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("schedules")
            .withIndex("by_project_scheduleId", (q) =>
                q.eq("projectId", args.projectId).eq("scheduleId", args.scheduleId)
            )
            .unique();

        if (!existing) return false;

        await ctx.db.delete(existing._id);
        return true;
    },
});
