import { pgTable, text, serial, integer, boolean, timestamp, varchar, smallint } from "drizzle-orm/pg-core";
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

// Roles that can view gate codes
export const GATE_CODE_VIEW_ROLES: StaffRole[] = ["team_leader", "manager", "owner"];

export function canViewMoney(role: string | null | undefined): boolean {
  return MONEY_VIEW_ROLES.includes(role as StaffRole);
}

export function canViewGateCode(role: string | null | undefined): boolean {
  return GATE_CODE_VIEW_ROLES.includes(role as StaffRole);
}

// Mower types
export const MOWER_TYPES = ["push", "self_propelled", "stand_on", "ride_on", "robot"] as const;
export type MowerType = typeof MOWER_TYPES[number];

// Cut height units
export const CUT_HEIGHT_UNITS = ["level", "millimeter", "inch"] as const;
export type CutHeightUnit = typeof CUT_HEIGHT_UNITS[number];

// Contact roles for clients
export const CONTACT_ROLES = ["resident", "billing", "other"] as const;
export type ContactRole = typeof CONTACT_ROLES[number];

// Service cadence options
export const SERVICE_CADENCE = ["two_week", "four_week"] as const;
export type ServiceCadence = typeof SERVICE_CADENCE[number];

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
  billingContactId: integer("billing_contact_id"),
  scheduledDate: timestamp("scheduled_date").notNull(),
  scheduledTime: timestamp("scheduled_time"), // Optional specific time for time-sensitive jobs
  estimatedDurationMinutes: integer("estimated_duration_minutes"),
  status: text("status").default("scheduled").notNull(), // 'scheduled', 'in_progress', 'completed', 'cancelled'
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  notes: text("notes"),
  price: integer("price").default(0),
  // Program tier - linked to job, not client
  programTier: text("program_tier"), // '22', '24', '26' - Essentials, Elite, Prestige
  // Mower and cut height
  mowerId: integer("mower_id"),
  cutHeightUnit: text("cut_height_unit"), // 'level', 'millimeter', 'inch'
  cutHeightValue: text("cut_height_value"), // Stored as text for flexibility
  // Site information
  gateCode: text("gate_code"), // Only visible to team_leader+
  siteInformation: text("site_information"), // Special instructions
  jobNotes: text("job_notes"), // Staff/admin notes about the job
  workCompletedNotes: text("work_completed_notes"), // Summary of completed work
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

// Client contacts - multiple contacts per client (resident, billing, etc.)
export const clientContacts = pgTable("client_contacts", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => clients.id).notNull(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  role: text("role").default("resident").notNull(), // 'resident', 'billing', 'other'
  isPrimary: boolean("is_primary").default(false),
});

// Mowers - equipment catalog
export const mowers = pgTable("mowers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  brand: text("brand").notNull(),
  modelNumber: text("model_number"),
  mowerType: text("mower_type").default("push").notNull(), // 'push', 'self_propelled', 'stand_on', 'ride_on', 'robot'
  iconUrl: text("icon_url"),
  isActive: boolean("is_active").default(true),
});

// Staff mower favorites
export const staffMowerFavorites = pgTable("staff_mower_favorites", {
  id: serial("id").primaryKey(),
  staffId: integer("staff_id").references(() => staff.id).notNull(),
  mowerId: integer("mower_id").references(() => mowers.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Job tasks - work items for each job
export const jobTasks = pgTable("job_tasks", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").references(() => jobs.id).notNull(),
  description: text("description").notNull(),
  sortOrder: integer("sort_order").default(0),
  isCompleted: boolean("is_completed").default(false),
  completedById: integer("completed_by_id").references(() => staff.id),
  completedAt: timestamp("completed_at"),
});

// Treatment types - types of treatments available
export const treatmentTypes = pgTable("treatment_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category"), // 'fertilizer', 'soil', 'pest', 'other'
  defaultNotes: text("default_notes"),
  isActive: boolean("is_active").default(true),
});

// Program templates - reusable program definitions
export const programTemplates = pgTable("program_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  servicesPerYear: integer("services_per_year").notNull(),
  // Services per month stored as JSON array of 12 values
  servicesPerMonth: text("services_per_month"), // JSON: [2,2,2,2,1,1,1,1,2,2,2,2]
  defaultCadence: text("default_cadence").default("two_week"), // 'two_week', 'four_week'
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Program template treatments - which treatments are included in each program and when
export const programTemplateTreatments = pgTable("program_template_treatments", {
  id: serial("id").primaryKey(),
  programTemplateId: integer("program_template_id").references(() => programTemplates.id).notNull(),
  treatmentTypeId: integer("treatment_type_id").references(() => treatmentTypes.id).notNull(),
  month: integer("month").notNull(), // 1-12
  quantity: integer("quantity").default(1),
  instructions: text("instructions"),
});

// Client programs - programs assigned to clients
export const clientPrograms = pgTable("client_programs", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => clients.id).notNull(),
  programTemplateId: integer("program_template_id").references(() => programTemplates.id).notNull(),
  customName: text("custom_name"),
  startDate: timestamp("start_date"),
  cadence: text("cadence"), // Override: 'two_week', 'four_week'
  status: text("status").default("active"), // 'active', 'paused', 'completed', 'cancelled'
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Client program services - planned/completed services for a client program
export const clientProgramServices = pgTable("client_program_services", {
  id: serial("id").primaryKey(),
  clientProgramId: integer("client_program_id").references(() => clientPrograms.id).notNull(),
  targetMonth: integer("target_month").notNull(), // 1-12
  targetYear: integer("target_year").notNull(),
  scheduledDate: timestamp("scheduled_date"),
  jobId: integer("job_id").references(() => jobs.id),
  status: text("status").default("pending"), // 'pending', 'scheduled', 'completed', 'skipped'
  completedAt: timestamp("completed_at"),
});

// Client program treatments - scheduled/completed treatments for a client program
export const clientProgramTreatments = pgTable("client_program_treatments", {
  id: serial("id").primaryKey(),
  clientProgramId: integer("client_program_id").references(() => clientPrograms.id).notNull(),
  treatmentTypeId: integer("treatment_type_id").references(() => treatmentTypes.id).notNull(),
  targetMonth: integer("target_month").notNull(), // 1-12
  targetYear: integer("target_year").notNull(),
  dueDate: timestamp("due_date"),
  jobId: integer("job_id").references(() => jobs.id),
  status: text("status").default("pending"), // 'pending', 'completed', 'skipped'
  completedById: integer("completed_by_id").references(() => staff.id),
  completedAt: timestamp("completed_at"),
  notes: text("notes"),
});

// Relations
export const clientsRelations = relations(clients, ({ many }) => ({
  jobs: many(jobs),
  contacts: many(clientContacts),
  programs: many(clientPrograms),
}));

export const staffRelations = relations(staff, ({ many }) => ({
  jobs: many(jobs),
  crewMemberships: many(crewMembers),
  mowerFavorites: many(staffMowerFavorites),
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
  mower: one(mowers, {
    fields: [jobs.mowerId],
    references: [mowers.id],
  }),
  feedback: many(feedback),
  applications: many(applications),
  tasks: many(jobTasks),
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

export const clientContactsRelations = relations(clientContacts, ({ one }) => ({
  client: one(clients, {
    fields: [clientContacts.clientId],
    references: [clients.id],
  }),
}));

export const mowersRelations = relations(mowers, ({ many }) => ({
  favorites: many(staffMowerFavorites),
  jobs: many(jobs),
}));

export const staffMowerFavoritesRelations = relations(staffMowerFavorites, ({ one }) => ({
  staff: one(staff, {
    fields: [staffMowerFavorites.staffId],
    references: [staff.id],
  }),
  mower: one(mowers, {
    fields: [staffMowerFavorites.mowerId],
    references: [mowers.id],
  }),
}));

export const jobTasksRelations = relations(jobTasks, ({ one }) => ({
  job: one(jobs, {
    fields: [jobTasks.jobId],
    references: [jobs.id],
  }),
  completedBy: one(staff, {
    fields: [jobTasks.completedById],
    references: [staff.id],
  }),
}));

export const treatmentTypesRelations = relations(treatmentTypes, ({ many }) => ({
  templateTreatments: many(programTemplateTreatments),
  clientTreatments: many(clientProgramTreatments),
}));

export const programTemplatesRelations = relations(programTemplates, ({ many }) => ({
  treatments: many(programTemplateTreatments),
  clientPrograms: many(clientPrograms),
}));

export const programTemplateTreatmentsRelations = relations(programTemplateTreatments, ({ one }) => ({
  template: one(programTemplates, {
    fields: [programTemplateTreatments.programTemplateId],
    references: [programTemplates.id],
  }),
  treatmentType: one(treatmentTypes, {
    fields: [programTemplateTreatments.treatmentTypeId],
    references: [treatmentTypes.id],
  }),
}));

export const clientProgramsRelations = relations(clientPrograms, ({ one, many }) => ({
  client: one(clients, {
    fields: [clientPrograms.clientId],
    references: [clients.id],
  }),
  template: one(programTemplates, {
    fields: [clientPrograms.programTemplateId],
    references: [programTemplates.id],
  }),
  services: many(clientProgramServices),
  treatments: many(clientProgramTreatments),
}));

export const clientProgramServicesRelations = relations(clientProgramServices, ({ one }) => ({
  clientProgram: one(clientPrograms, {
    fields: [clientProgramServices.clientProgramId],
    references: [clientPrograms.id],
  }),
  job: one(jobs, {
    fields: [clientProgramServices.jobId],
    references: [jobs.id],
  }),
}));

export const clientProgramTreatmentsRelations = relations(clientProgramTreatments, ({ one }) => ({
  clientProgram: one(clientPrograms, {
    fields: [clientProgramTreatments.clientProgramId],
    references: [clientPrograms.id],
  }),
  treatmentType: one(treatmentTypes, {
    fields: [clientProgramTreatments.treatmentTypeId],
    references: [treatmentTypes.id],
  }),
  job: one(jobs, {
    fields: [clientProgramTreatments.jobId],
    references: [jobs.id],
  }),
  completedBy: one(staff, {
    fields: [clientProgramTreatments.completedById],
    references: [staff.id],
  }),
}));

// Schemas
export const insertStaffSchema = createInsertSchema(staff).omit({ id: true });
export const insertClientSchema = createInsertSchema(clients).omit({ id: true });
export const insertCrewSchema = createInsertSchema(crews).omit({ id: true, createdAt: true });
export const updateCrewSchema = z.object({ name: z.string().optional() });
export const insertCrewMemberSchema = createInsertSchema(crewMembers).omit({ id: true });
export const insertJobRunSchema = createInsertSchema(jobRuns).omit({ id: true, createdAt: true }).extend({ date: z.union([z.date(), z.string().pipe(z.coerce.date())]) });
export const insertJobSchema = createInsertSchema(jobs).omit({ id: true }).extend({
  scheduledDate: z.union([z.date(), z.string().pipe(z.coerce.date())]),
  scheduledTime: z.union([z.date(), z.string().pipe(z.coerce.date())]).optional().nullable(),
});
export const insertFeedbackSchema = createInsertSchema(feedback).omit({ id: true, createdAt: true, sentiment: true, aiAnalysis: true });
export const insertApplicationSchema = createInsertSchema(applications).omit({ id: true });

// New schemas
export const insertClientContactSchema = createInsertSchema(clientContacts).omit({ id: true });
export const insertMowerSchema = createInsertSchema(mowers).omit({ id: true });
export const insertStaffMowerFavoriteSchema = createInsertSchema(staffMowerFavorites).omit({ id: true, createdAt: true });
export const insertJobTaskSchema = createInsertSchema(jobTasks).omit({ id: true, completedAt: true });
export const insertTreatmentTypeSchema = createInsertSchema(treatmentTypes).omit({ id: true });
export const insertProgramTemplateSchema = createInsertSchema(programTemplates).omit({ id: true, createdAt: true });
export const insertProgramTemplateTreatmentSchema = createInsertSchema(programTemplateTreatments).omit({ id: true });
export const insertClientProgramSchema = createInsertSchema(clientPrograms).omit({ id: true, createdAt: true });
export const insertClientProgramServiceSchema = createInsertSchema(clientProgramServices).omit({ id: true });
export const insertClientProgramTreatmentSchema = createInsertSchema(clientProgramTreatments).omit({ id: true });

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
export type InsertJob = z.infer<typeof insertJobSchema>;
export type Feedback = typeof feedback.$inferSelect;
export type Application = typeof applications.$inferSelect;

// New types
export type ClientContact = typeof clientContacts.$inferSelect;
export type InsertClientContact = z.infer<typeof insertClientContactSchema>;
export type Mower = typeof mowers.$inferSelect;
export type InsertMower = z.infer<typeof insertMowerSchema>;
export type StaffMowerFavorite = typeof staffMowerFavorites.$inferSelect;
export type InsertStaffMowerFavorite = z.infer<typeof insertStaffMowerFavoriteSchema>;
export type JobTask = typeof jobTasks.$inferSelect;
export type InsertJobTask = z.infer<typeof insertJobTaskSchema>;
export type TreatmentType = typeof treatmentTypes.$inferSelect;
export type InsertTreatmentType = z.infer<typeof insertTreatmentTypeSchema>;
export type ProgramTemplate = typeof programTemplates.$inferSelect;
export type InsertProgramTemplate = z.infer<typeof insertProgramTemplateSchema>;
export type ProgramTemplateTreatment = typeof programTemplateTreatments.$inferSelect;
export type InsertProgramTemplateTreatment = z.infer<typeof insertProgramTemplateTreatmentSchema>;
export type ClientProgram = typeof clientPrograms.$inferSelect;
export type InsertClientProgram = z.infer<typeof insertClientProgramSchema>;
export type ClientProgramService = typeof clientProgramServices.$inferSelect;
export type InsertClientProgramService = z.infer<typeof insertClientProgramServiceSchema>;
export type ClientProgramTreatment = typeof clientProgramTreatments.$inferSelect;
export type InsertClientProgramTreatment = z.infer<typeof insertClientProgramTreatmentSchema>;
