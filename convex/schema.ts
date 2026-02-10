import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    features: defineTable({
        projectId: v.string(), // Partition key
        priority: v.number(),
        category: v.string(),
        name: v.string(),
        description: v.string(),
        steps: v.array(v.string()),
        passes: v.boolean(),
        in_progress: v.boolean(),
        dependencies: v.optional(v.array(v.number())), // Storing feature IDs (integers from legacy). 
        // Note: In a pure Convex app, we'd use v.id("features"), but we are mirroring legacy IDs for now.
        // Or should we assume legacy IDs are migrated to Convex IDs?
        // The legacy app uses INTEGER IDs. Convex uses ID strings.
        // Strategy: Store legacy `id` as `legacyId` or `featureId`?
        // The `BackendInterface` uses `int` for feature_id.
        // We must map internal `_id` to `int` OR change interface to `str`?
        // The interface says `feature_id: int`.
        // So we need a `featureId` field (integer) to maintain compatibility without changing the interface.
        featureId: v.number(),
    })
        .index("by_project", ["projectId"])
        .index("by_project_priority", ["projectId", "priority"])
        .index("by_project_featureId", ["projectId", "featureId"]), // Unique constraint equivalent

    schedules: defineTable({
        projectId: v.string(),
        scheduleId: v.number(), // Legacy integer ID
        start_time: v.string(),
        duration_minutes: v.number(),
        days_of_week: v.number(),
        enabled: v.boolean(),
        yolo_mode: v.boolean(),
        model: v.optional(v.string()),
        max_concurrency: v.number(),
        crash_count: v.optional(v.number()),
        created_at: v.string(),
    })
        .index("by_project", ["projectId"])
        .index("by_project_scheduleId", ["projectId", "scheduleId"]),
});
