CREATE TABLE "applications" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_id" integer NOT NULL,
	"product_name" text NOT NULL,
	"quantity" text NOT NULL,
	"compliance_notes" text
);
--> statement-breakpoint
CREATE TABLE "client_contacts" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"role" text DEFAULT 'resident' NOT NULL,
	"is_primary" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "client_program_services" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_program_id" integer NOT NULL,
	"target_month" integer NOT NULL,
	"target_year" integer NOT NULL,
	"scheduled_date" timestamp,
	"job_id" integer,
	"status" text DEFAULT 'pending',
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "client_program_treatments" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_program_id" integer NOT NULL,
	"treatment_type_id" integer NOT NULL,
	"target_month" integer NOT NULL,
	"target_year" integer NOT NULL,
	"due_date" timestamp,
	"job_id" integer,
	"status" text DEFAULT 'pending',
	"completed_by_id" integer,
	"completed_at" timestamp,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "client_programs" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"program_template_id" integer NOT NULL,
	"custom_name" text,
	"start_date" timestamp,
	"cadence" text,
	"status" text DEFAULT 'active',
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"address" text NOT NULL,
	"email" text,
	"phone" text,
	"program_tier" text NOT NULL,
	"latitude" text,
	"longitude" text
);
--> statement-breakpoint
CREATE TABLE "crew_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"crew_id" integer NOT NULL,
	"staff_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crews" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "feedback" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_id" integer NOT NULL,
	"rating" integer NOT NULL,
	"comment" text,
	"sentiment" text,
	"ai_analysis" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "job_invoice_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_id" integer NOT NULL,
	"description" text NOT NULL,
	"quantity" integer DEFAULT 1,
	"unit_price" integer NOT NULL,
	"total_price" integer NOT NULL,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "job_photos" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_id" integer NOT NULL,
	"staff_id" integer,
	"url" text NOT NULL,
	"filename" text NOT NULL,
	"photo_type" text DEFAULT 'during' NOT NULL,
	"caption" text,
	"taken_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "job_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"date" timestamp NOT NULL,
	"crew_id" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "job_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_id" integer NOT NULL,
	"description" text NOT NULL,
	"sort_order" integer DEFAULT 0,
	"is_completed" boolean DEFAULT false,
	"completed_by_id" integer,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "job_time_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_id" integer NOT NULL,
	"staff_id" integer NOT NULL,
	"crew_id" integer,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp,
	"duration_minutes" integer,
	"entry_type" text DEFAULT 'self' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"job_run_id" integer,
	"assigned_to_id" integer,
	"billing_contact_id" integer,
	"scheduled_date" timestamp NOT NULL,
	"scheduled_time" timestamp,
	"estimated_duration_minutes" integer,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"start_time" timestamp,
	"end_time" timestamp,
	"notes" text,
	"price" integer DEFAULT 0,
	"program_tier" text,
	"mower_id" integer,
	"cut_height_unit" text,
	"cut_height_value" text,
	"gate_code" text,
	"site_information" text,
	"job_notes" text,
	"work_completed_notes" text
);
--> statement-breakpoint
CREATE TABLE "mowers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"brand" text NOT NULL,
	"model_number" text,
	"mower_type" text DEFAULT 'push' NOT NULL,
	"icon_url" text,
	"is_active" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "program_template_treatments" (
	"id" serial PRIMARY KEY NOT NULL,
	"program_template_id" integer NOT NULL,
	"treatment_type_id" integer NOT NULL,
	"month" integer NOT NULL,
	"quantity" integer DEFAULT 1,
	"instructions" text
);
--> statement-breakpoint
CREATE TABLE "program_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"services_per_year" integer NOT NULL,
	"services_per_month" text,
	"default_cadence" text DEFAULT 'two_week',
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "staff" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar,
	"name" text NOT NULL,
	"phone" text,
	"role" text DEFAULT 'staff' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_mower_favorites" (
	"id" serial PRIMARY KEY NOT NULL,
	"staff_id" integer NOT NULL,
	"mower_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "treatment_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" text,
	"default_notes" text,
	"is_active" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversation_id" integer NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_contacts" ADD CONSTRAINT "client_contacts_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_program_services" ADD CONSTRAINT "client_program_services_client_program_id_client_programs_id_fk" FOREIGN KEY ("client_program_id") REFERENCES "public"."client_programs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_program_services" ADD CONSTRAINT "client_program_services_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_program_treatments" ADD CONSTRAINT "client_program_treatments_client_program_id_client_programs_id_fk" FOREIGN KEY ("client_program_id") REFERENCES "public"."client_programs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_program_treatments" ADD CONSTRAINT "client_program_treatments_treatment_type_id_treatment_types_id_fk" FOREIGN KEY ("treatment_type_id") REFERENCES "public"."treatment_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_program_treatments" ADD CONSTRAINT "client_program_treatments_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_program_treatments" ADD CONSTRAINT "client_program_treatments_completed_by_id_staff_id_fk" FOREIGN KEY ("completed_by_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_programs" ADD CONSTRAINT "client_programs_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_programs" ADD CONSTRAINT "client_programs_program_template_id_program_templates_id_fk" FOREIGN KEY ("program_template_id") REFERENCES "public"."program_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crew_members" ADD CONSTRAINT "crew_members_crew_id_crews_id_fk" FOREIGN KEY ("crew_id") REFERENCES "public"."crews"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crew_members" ADD CONSTRAINT "crew_members_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_invoice_items" ADD CONSTRAINT "job_invoice_items_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_photos" ADD CONSTRAINT "job_photos_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_photos" ADD CONSTRAINT "job_photos_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_runs" ADD CONSTRAINT "job_runs_crew_id_crews_id_fk" FOREIGN KEY ("crew_id") REFERENCES "public"."crews"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_tasks" ADD CONSTRAINT "job_tasks_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_tasks" ADD CONSTRAINT "job_tasks_completed_by_id_staff_id_fk" FOREIGN KEY ("completed_by_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_time_entries" ADD CONSTRAINT "job_time_entries_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_time_entries" ADD CONSTRAINT "job_time_entries_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_time_entries" ADD CONSTRAINT "job_time_entries_crew_id_crews_id_fk" FOREIGN KEY ("crew_id") REFERENCES "public"."crews"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_job_run_id_job_runs_id_fk" FOREIGN KEY ("job_run_id") REFERENCES "public"."job_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_assigned_to_id_staff_id_fk" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_template_treatments" ADD CONSTRAINT "program_template_treatments_program_template_id_program_templates_id_fk" FOREIGN KEY ("program_template_id") REFERENCES "public"."program_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_template_treatments" ADD CONSTRAINT "program_template_treatments_treatment_type_id_treatment_types_id_fk" FOREIGN KEY ("treatment_type_id") REFERENCES "public"."treatment_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff" ADD CONSTRAINT "staff_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_mower_favorites" ADD CONSTRAINT "staff_mower_favorites_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_mower_favorites" ADD CONSTRAINT "staff_mower_favorites_mower_id_mowers_id_fk" FOREIGN KEY ("mower_id") REFERENCES "public"."mowers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");