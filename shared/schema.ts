import { pgTable, text, serial, integer, boolean, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations, sql } from "drizzle-orm";

// Export Auth and Chat models from integrations
export * from "./models/auth";
export * from "./models/chat";

// Staff roles enum
export const STAFF_ROLES = ["crew_member", "staff", "team_leader", "manager", "owner"] as const;
export type StaffRole = typeof STAFF_ROLES[number];

// Roles that can view money values (prices, totals)
export const MONEY_VIEW_ROLES: StaffRole[] = ["team_leader", "manager", "owner"];

export function canViewMoney(role: string | null | undefined): boolean {
  return MONEY_VIEW_ROLES.includes(role as StaffRole);
}

// Staff members (linked to auth users via email/id)
export const staff = pgTable("staff", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => {
    // Reference to auth users table
    return pgTable("users", { id: varchar("id").primaryKey() }).id;
  }),
  name: text("name").notNull(),
  phone: text("phone"),
  role: text("role").default("staff").notNull(), // 'crew_member', 'staff', 'team_leader', 'manager', 'owner'
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

export const crews = pgTable("crews", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const crewMembers = pgTable("crew_members", {
  id: serial("id").primaryKey(),
  crewId: integer("crew_id").references(() => crews.id).notNull(),
  staffId: integer("staff_id").references(() => staff.id).notNull(),
});

export const jobRuns = pgTable("job_runs", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  date: timestamp("date").notNull(),
  crewId: integer("crew_id").references(() => crews.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const jobs = pgTable("jobs", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => clients.id).notNull(),
  jobRunId: integer("job_run_id").references(() => jobRuns.id),
  assignedToId: integer("assigned_to_id").references(() => staff.id),
  scheduledDate: timestamp("scheduled_date").notNull(),
  status: text("status").default("scheduled").notNull(), // 'scheduled', 'in_progress', 'completed', 'cancelled'
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  notes: text("notes"),
  price: integer("price").default(0),
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

export const staffRelations = relations(staff, ({ many }) => ({
  jobs: many(jobs),
  crewMemberships: many(crewMembers),
}));

export const crewsRelations = relations(crews, ({ many }) => ({
  members: many(crewMembers),
  jobRuns: many(jobRuns),
}));

export const crewMembersRelations = relations(crewMembers, ({ one }) => ({
  crew: one(crews, {
    fields: [crewMembers.crewId],
    references: [crews.id],
  }),
  staff: one(staff, {
    fields: [crewMembers.staffId],
    references: [staff.id],
  }),
}));

export const jobRunsRelations = relations(jobRuns, ({ many, one }) => ({
  jobs: many(jobs),
  crew: one(crews, {
    fields: [jobRuns.crewId],
    references: [crews.id],
  }),
}));

export const jobsRelations = relations(jobs, ({ one, many }) => ({
  client: one(clients, {
    fields: [jobs.clientId],
    references: [clients.id],
  }),
  jobRun: one(jobRuns, {
    fields: [jobs.jobRunId],
    references: [jobRuns.id],
  }),
  assignedTo: one(staff, {
    fields: [jobs.assignedToId],
    references: [staff.id],
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
export const insertStaffSchema = createInsertSchema(staff).omit({ id: true });
export const insertClientSchema = createInsertSchema(clients).omit({ id: true });
export const insertCrewSchema = createInsertSchema(crews).omit({ id: true, createdAt: true });
export const updateCrewSchema = z.object({ name: z.string().optional() });
export const insertCrewMemberSchema = createInsertSchema(crewMembers).omit({ id: true });
export const insertJobRunSchema = createInsertSchema(jobRuns).omit({ id: true, createdAt: true }).extend({ date: z.union([z.date(), z.string().pipe(z.coerce.date())]) });
export const insertJobSchema = createInsertSchema(jobs).omit({ id: true });
export const insertFeedbackSchema = createInsertSchema(feedback).omit({ id: true, createdAt: true, sentiment: true, aiAnalysis: true });
export const insertApplicationSchema = createInsertSchema(applications).omit({ id: true });

// Types
export type Staff = typeof staff.$inferSelect;
export type InsertStaff = z.infer<typeof insertStaffSchema>;
export type Client = typeof clients.$inferSelect;
export type Crew = typeof crews.$inferSelect;
export type InsertCrew = z.infer<typeof insertCrewSchema>;
export type UpdateCrew = z.infer<typeof updateCrewSchema>;
export type CrewMember = typeof crewMembers.$inferSelect;
export type InsertCrewMember = z.infer<typeof insertCrewMemberSchema>;
export type JobRun = typeof jobRuns.$inferSelect;
export type InsertJobRun = z.infer<typeof insertJobRunSchema>;
export type Job = typeof jobs.$inferSelect;
export type Feedback = typeof feedback.$inferSelect;
export type Application = typeof applications.$inferSelect;
