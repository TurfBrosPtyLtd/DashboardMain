import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Export Auth and Chat models from integrations
export * from "./models/auth";
export * from "./models/chat";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  role: text("role").default("staff").notNull(), // 'admin', 'staff', 'client'
  createdAt: timestamp("created_at").defaultNow(),
});

export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  email: text("email"),
  phone: text("phone"),
  programTier: text("program_tier").notNull(), // '22', '24', '26'
  latitude: text("latitude"),
  longitude: text("longitude"),
});

export const jobs = pgTable("jobs", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => clients.id).notNull(),
  assignedToId: integer("assigned_to_id").references(() => users.id),
  scheduledDate: timestamp("scheduled_date").notNull(),
  status: text("status").default("scheduled").notNull(), // 'scheduled', 'in_progress', 'completed', 'cancelled'
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  notes: text("notes"),
});

export const feedback = pgTable("feedback", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").references(() => jobs.id).notNull(),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  sentiment: text("sentiment"), // 'positive', 'neutral', 'negative'
  aiAnalysis: text("ai_analysis"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const applications = pgTable("applications", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").references(() => jobs.id).notNull(),
  productName: text("product_name").notNull(),
  quantity: text("quantity").notNull(),
  complianceNotes: text("compliance_notes"),
});

// Relations
export const clientsRelations = relations(clients, ({ many }) => ({
  jobs: many(jobs),
}));

export const jobsRelations = relations(jobs, ({ one, many }) => ({
  client: one(clients, {
    fields: [jobs.clientId],
    references: [clients.id],
  }),
  assignedTo: one(users, {
    fields: [jobs.assignedToId],
    references: [users.id],
  }),
  feedback: many(feedback),
  applications: many(applications),
}));

export const feedbackRelations = relations(feedback, ({ one }) => ({
  job: one(jobs, {
    fields: [feedback.jobId],
    references: [jobs.id],
  }),
}));

export const applicationsRelations = relations(applications, ({ one }) => ({
  job: one(jobs, {
    fields: [applications.jobId],
    references: [jobs.id],
  }),
}));

// Schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertClientSchema = createInsertSchema(clients).omit({ id: true });
export const insertJobSchema = createInsertSchema(jobs).omit({ id: true });
export const insertFeedbackSchema = createInsertSchema(feedback).omit({ id: true, createdAt: true, sentiment: true, aiAnalysis: true });
export const insertApplicationSchema = createInsertSchema(applications).omit({ id: true });

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Client = typeof clients.$inferSelect;
export type Job = typeof jobs.$inferSelect;
export type Feedback = typeof feedback.$inferSelect;
export type Application = typeof applications.$inferSelect;
