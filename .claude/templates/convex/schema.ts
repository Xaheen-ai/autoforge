import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Xaheen Feature Management Schema
 * 
 * This schema defines the data structure for features and schedules
 * in the Xaheen autonomous coding platform.
 */

export default defineSchema({
    features: defineTable({
        projectId: v.string(),
        featureId: v.number(),
        priority: v.number(),
        category: v.string(),
        name: v.string(),
        description: v.string(),
        steps: v.array(v.string()),
        passes: v.boolean(),
        in_progress: v.boolean(),
        dependencies: v.optional(v.array(v.number())),
    })
        .index("by_project", ["projectId", "_creationTime"])
        .index("by_project_featureId", ["projectId", "featureId", "_creationTime"])
        .index("by_project_priority", ["projectId", "priority", "_creationTime"]),

    schedules: defineTable({
        projectId: v.string(),
        scheduleId: v.number(),
        start_time: v.string(),
        duration_minutes: v.number(),
        days_of_week: v.number(),
        enabled: v.boolean(),
        yolo_mode: v.boolean(),
        model: v.optional(v.string()),
        max_concurrency: v.number(),
        crash_count: v.optional(v.number()),
        created_at: v.optional(v.string()),
    })
        .index("by_project", ["projectId", "_creationTime"])
        .index("by_project_scheduleId", ["projectId", "scheduleId", "_creationTime"]),
});
