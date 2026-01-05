import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { 
  insertJobRunSchema, insertCrewSchema, updateCrewSchema, canViewMoney, canViewGateCode,
  insertClientContactSchema, insertMowerSchema, insertJobTaskSchema,
  insertTreatmentCategorySchema, insertTreatmentTypeSchema, insertTreatmentProgramSchema, insertTreatmentProgramScheduleSchema,
  insertProgramTemplateSchema, insertProgramTemplateTreatmentSchema,
  insertClientProgramSchema, insertJobTimeEntrySchema, insertJobPhotoSchema, insertJobInvoiceItemSchema
} from "@shared/schema";
import { z } from "zod";
import OpenAI from "openai";
import { generateServiceWeeks, applySkipLogic } from "@shared/serviceDistribution";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";

// Helper to get current user's staff role and ID
async function getCurrentUserRole(req: Request): Promise<string | null> {
  const userId = (req as any).user?.claims?.sub;
  if (!userId) return null;
  const staffMember = await storage.getStaffByUserId(userId);
  return staffMember?.role || null;
}

async function getCurrentStaffId(req: Request): Promise<number | null> {
  const userId = (req as any).user?.claims?.sub;
  if (!userId) return null;
  const staffMember = await storage.getStaffByUserId(userId);
  return staffMember?.id || null;
}

// Helper to sanitize job data (remove price for unauthorized users)
function sanitizeJobData<T extends { price?: number | null; gateCode?: string | null }>(
  job: T, 
  canViewPrice: boolean,
  canViewGate: boolean
): T {
  let result = job;
  if (!canViewPrice) {
    result = { ...result, price: null };
  }
  if (!canViewGate) {
    result = { ...result, gateCode: null };
  }
  return result;
}

const openai = new OpenAI({ apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || "dummy" });

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Register object storage routes for file uploads
  registerObjectStorageRoutes(app);
  
  // Staff
  app.get(api.staff.list.path, async (req, res) => {
    const staffList = await storage.getStaffList();
    res.json(staffList);
  });
  
  app.post(api.staff.create.path, async (req, res) => {
    try {
      const input = api.staff.create.input.parse(req.body);
      const s = await storage.createStaff(input);
      res.status(201).json(s);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.get(api.staff.get.path, async (req, res) => {
    const s = await storage.getStaff(Number(req.params.id));
    if (!s) return res.status(404).json({ message: "Staff not found" });
    res.json(s);
  });

  app.put("/api/staff/:id", async (req, res) => {
    try {
      const role = await getCurrentUserRole(req);
      if (role !== "manager" && role !== "owner") {
        return res.status(403).json({ message: "Only managers and owners can update staff roles" });
      }
      const staffId = Number(req.params.id);
      const { role: newRole } = req.body;
      const updated = await storage.updateStaff(staffId, { role: newRole });
      if (!updated) return res.status(404).json({ message: "Staff not found" });
      res.json(updated);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  // Clients
  app.get(api.clients.list.path, async (req, res) => {
    const clientList = await storage.getClients();
    res.json(clientList);
  });

  app.post(api.clients.create.path, async (req, res) => {
    try {
      const input = api.clients.create.input.parse(req.body);
      const client = await storage.createClient(input);
      res.status(201).json(client);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.get(api.clients.get.path, async (req, res) => {
    const client = await storage.getClient(Number(req.params.id));
    if (!client) return res.status(404).json({ message: "Client not found" });
    res.json(client);
  });

  // Crews
  app.get(api.crews.list.path, async (req, res) => {
    const crewList = await storage.getCrews();
    res.json(crewList);
  });

  app.post(api.crews.create.path, async (req, res) => {
    try {
      const input = insertCrewSchema.parse(req.body);
      const crew = await storage.createCrew(input);
      res.status(201).json(crew);
    } catch (err) {
      console.error("Create crew error:", err);
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.put(api.crews.update.path, async (req, res) => {
    try {
      const crewId = z.coerce.number().parse(req.params.id);
      const input = updateCrewSchema.parse(req.body);
      const crew = await storage.updateCrew(crewId, input);
      if (!crew) return res.status(404).json({ message: "Crew not found" });
      res.json(crew);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.delete(api.crews.delete.path, async (req, res) => {
    let crewId: number;
    try {
      crewId = z.coerce.number().parse(req.params.id);
    } catch {
      return res.status(400).json({ message: "Invalid crew ID" });
    }
    try {
      await storage.deleteCrew(crewId);
      res.json({ success: true });
    } catch (err) {
      res.status(404).json({ message: "Crew not found" });
    }
  });

  app.post(api.crews.addMember.path, async (req, res) => {
    try {
      const crewId = z.coerce.number().parse(req.params.id);
      const input = api.crews.addMember.input.parse(req.body);
      const member = await storage.addCrewMember(crewId, input.staffId);
      res.status(201).json(member);
    } catch (err: any) {
      const errCode = err?.code || err?.cause?.code;
      if (errCode === '23505') {
        res.status(400).json({ message: "Staff member already in this crew" });
      } else {
        res.status(400).json({ message: "Invalid input" });
      }
    }
  });

  app.delete(api.crews.removeMember.path, async (req, res) => {
    let crewId: number;
    let staffId: number;
    try {
      crewId = z.coerce.number().parse(req.params.crewId);
      staffId = z.coerce.number().parse(req.params.staffId);
    } catch {
      return res.status(400).json({ message: "Invalid crew or staff ID" });
    }
    try {
      await storage.removeCrewMember(crewId, staffId);
      res.json({ success: true });
    } catch (err) {
      res.status(404).json({ message: "Crew member not found" });
    }
  });

  // Job Runs
  app.get(api.jobRuns.list.path, async (req, res) => {
    const date = req.query.date as string;
    const jobRunList = await storage.getJobRuns(date);
    res.json(jobRunList);
  });

  app.post(api.jobRuns.create.path, async (req, res) => {
    try {
      const input = insertJobRunSchema.parse(req.body);
      const jobRun = await storage.createJobRun(input);
      res.status(201).json(jobRun);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.put(api.jobRuns.update.path, async (req, res) => {
    try {
      const input = insertJobRunSchema.partial().parse(req.body);
      const jobRun = await storage.updateJobRun(Number(req.params.id), input);
      if (!jobRun) return res.status(404).json({ message: "Job run not found" });
      res.json(jobRun);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.delete(api.jobRuns.delete.path, async (req, res) => {
    try {
      await storage.deleteJobRun(Number(req.params.id));
      res.json({ success: true });
    } catch (err) {
      res.status(404).json({ message: "Job run not found" });
    }
  });

  // Jobs
  app.get(api.jobs.list.path, async (req, res) => {
    const role = await getCurrentUserRole(req);
    const canViewPrice = canViewMoney(role);
    const canViewGate = canViewGateCode(role);
    const filters = {
      assignedToId: req.query.assignedToId ? Number(req.query.assignedToId) : undefined,
      status: req.query.status as string,
    };
    const jobsList = await storage.getJobs(filters);
    res.json(jobsList.map(job => sanitizeJobData(job, canViewPrice, canViewGate)));
  });

  app.post(api.jobs.create.path, async (req, res) => {
    try {
      const role = await getCurrentUserRole(req);
      const canViewPrice = canViewMoney(role);
      const canViewGate = canViewGateCode(role);
      
      // Extract tasks from request body (not part of job schema)
      const { tasks, ...jobData } = req.body;
      
      let input = api.jobs.create.input.parse(jobData);
      // Strip price if user doesn't have permission
      if (!canViewPrice) {
        input = { ...input, price: 0 };
      }
      // Strip gate code if user doesn't have permission
      if (!canViewGate) {
        input = { ...input, gateCode: null };
      }
      const job = await storage.createJob(input);
      
      // Create job tasks if provided
      if (tasks && Array.isArray(tasks) && tasks.length > 0) {
        for (let i = 0; i < tasks.length; i++) {
          await storage.createJobTask({
            jobId: job.id,
            description: tasks[i],
            sortOrder: i,
            isCompleted: false,
          });
        }
      }
      
      // Seed job treatments from program template if one is assigned
      if (input.programTemplateId) {
        await storage.seedJobTreatmentsFromTemplate(job.id, input.programTemplateId);
      }
      
      // Seed job treatments from treatment program if one is assigned
      if (input.treatmentProgramId) {
        await storage.seedJobTreatmentsFromTreatmentProgram(job.id, input.treatmentProgramId);
      }
      
      // Auto-schedule future jobs if a program tier is selected
      if (input.programTier && input.scheduledDate) {
        const annualServices = parseInt(input.programTier, 10);
        
        const { addWeeks, getMonth, format, startOfDay } = await import("date-fns");
        
        // Normalize the start date to midnight to avoid timezone drift
        const startDate = startOfDay(new Date(input.scheduledDate));
        
        // Generate all 26 fortnightly slots from start date
        // addWeeks preserves the day of week when operating on a normalized date
        const fortnightlySlots: { date: Date; month: number }[] = [];
        let slotDate = new Date(startDate);
        for (let i = 0; i < 26; i++) {
          if (i > 0) slotDate = addWeeks(slotDate, 2);
          fortnightlySlots.push({ date: new Date(slotDate), month: getMonth(slotDate) });
        }
        
        // Apply skip logic similar to serviceDistribution.ts
        const skipsNeeded = 26 - annualServices;
        const slowdownMonths = skipsNeeded >= 4 ? [4, 5, 6, 7] : [5, 6, 7]; // May-Aug or Jun-Aug
        const shoulderMonths = [3, 8, 9, 10];
        
        const skippedIndices = new Set<number>();
        let skipped = 0;
        
        // Round-robin skip: spread skips evenly across slowdown months
        while (skipped < skipsNeeded) {
          let skippedThisRound = false;
          
          // First try slowdown months
          for (const month of slowdownMonths) {
            if (skipped >= skipsNeeded) break;
            const candidates = fortnightlySlots
              .map((s, i) => ({ ...s, idx: i }))
              .filter(s => s.month === month && !skippedIndices.has(s.idx));
            if (candidates.length > 1) {
              skippedIndices.add(candidates[0].idx);
              skipped++;
              skippedThisRound = true;
              break;
            }
          }
          
          // Then try shoulder months
          if (!skippedThisRound && skipped < skipsNeeded) {
            for (const month of shoulderMonths) {
              if (skipped >= skipsNeeded) break;
              const candidates = fortnightlySlots
                .map((s, i) => ({ ...s, idx: i }))
                .filter(s => s.month === month && !skippedIndices.has(s.idx));
              if (candidates.length > 1) {
                skippedIndices.add(candidates[0].idx);
                skipped++;
                skippedThisRound = true;
                break;
              }
            }
          }
          
          if (!skippedThisRound) break; // No more candidates
        }
        
        // Check for existing jobs for this client to prevent duplicates (UTC-safe)
        const existingJobs = await storage.getJobs({ clientId: input.clientId });
        const existingDates = new Set(
          existingJobs.map(j => format(new Date(j.scheduledDate), "yyyy-MM-dd"))
        );
        
        // Create jobs for non-skipped slots (skip index 0 since that's the already-created first job)
        for (let i = 1; i < fortnightlySlots.length; i++) {
          if (skippedIndices.has(i)) continue;
          
          const slot = fortnightlySlots[i];
          const dateKey = format(slot.date, "yyyy-MM-dd");
          
          if (!existingDates.has(dateKey)) {
            await storage.createJob({
              clientId: input.clientId,
              scheduledDate: slot.date,
              status: "scheduled",
              programTier: input.programTier,
              assignedToId: input.assignedToId,
              mowerId: input.mowerId,
              cutHeightUnit: input.cutHeightUnit,
              cutHeightValue: input.cutHeightValue,
              siteInformation: input.siteInformation,
              gateCode: canViewGate ? input.gateCode : null,
              price: canViewPrice ? input.price : 0,
              notes: input.notes,
              estimatedDurationMinutes: input.estimatedDurationMinutes,
            });
            existingDates.add(dateKey);
          }
        }
      }
      
      res.status(201).json(sanitizeJobData(job, canViewPrice, canViewGate));
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.put(api.jobs.update.path, async (req, res) => {
    try {
      const jobId = Number(req.params.id);
      const role = await getCurrentUserRole(req);
      const canViewPrice = canViewMoney(role);
      const canViewGate = canViewGateCode(role);
      let input = api.jobs.update.input.parse(req.body);
      // Strip price if user doesn't have permission
      if (!canViewPrice) {
        delete input.price;
      }
      // Strip gate code if user doesn't have permission
      if (!canViewGate) {
        delete input.gateCode;
      }
      
      // Check if programTemplateId or treatmentProgramId is being changed to reseed treatments
      const existingJob = await storage.getJob(jobId);
      const templateChanged = existingJob && input.programTemplateId !== undefined && 
        input.programTemplateId !== existingJob.programTemplateId;
      const treatmentProgramChanged = existingJob && input.treatmentProgramId !== undefined &&
        input.treatmentProgramId !== existingJob.treatmentProgramId;
      
      const job = await storage.updateJob(jobId, input);
      
      // Reseed treatments if program template changed
      if (templateChanged) {
        await storage.clearJobTreatments(jobId);
        if (input.programTemplateId) {
          await storage.seedJobTreatmentsFromTemplate(jobId, input.programTemplateId);
        }
      }
      
      // Seed from treatment program if changed (adds to existing treatments)
      if (treatmentProgramChanged && input.treatmentProgramId) {
        await storage.seedJobTreatmentsFromTreatmentProgram(jobId, input.treatmentProgramId);
      }
      
      res.json(sanitizeJobData(job, canViewPrice, canViewGate));
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.get(api.jobs.get.path, async (req, res) => {
    const role = await getCurrentUserRole(req);
    const canViewPrice = canViewMoney(role);
    const canViewGate = canViewGateCode(role);
    const job = await storage.getJob(Number(req.params.id));
    if (!job) return res.status(404).json({ message: "Job not found" });
    res.json(sanitizeJobData(job, canViewPrice, canViewGate));
  });

  app.delete(api.jobs.delete.path, async (req, res) => {
    try {
      const jobId = Number(req.params.id);
      await storage.deleteJob(jobId);
      res.json({ success: true });
    } catch (err) {
      res.status(404).json({ message: "Job not found" });
    }
  });

  // Feedback with AI Analysis
  app.post(api.feedback.create.path, async (req, res) => {
    try {
      const input = api.feedback.create.input.parse(req.body);
      
      let aiAnalysis = "Analysis pending...";
      let sentiment = "neutral";
      
      if (input.comment) {
        try {
          const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              { role: "system", content: "Analyze the sentiment of this feedback for a lawn mowing service. Return JSON with 'sentiment' (positive, negative, neutral) and 'summary' (brief analysis)." },
              { role: "user", content: input.comment }
            ],
            response_format: { type: "json_object" }
          });
          const content = JSON.parse(response.choices[0].message.content || "{}");
          sentiment = content.sentiment || "neutral";
          aiAnalysis = content.summary || "No summary available.";
        } catch (error) {
          console.error("OpenAI Error:", error);
          aiAnalysis = "AI Analysis failed or not available.";
        }
      }

      const feedbackData = await storage.createFeedback({
        ...input,
        sentiment,
        aiAnalysis,
      });
      res.status(201).json(feedbackData);
    } catch (err) {
      console.error(err);
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.get(api.feedback.list.path, async (req, res) => {
    const feedbackList = await storage.getFeedback();
    res.json(feedbackList);
  });

  // Applications
  app.post(api.applications.create.path, async (req, res) => {
    try {
      const input = api.applications.create.input.parse(req.body);
      const app = await storage.createApplication(input);
      res.status(201).json(app);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  // Client Contacts
  app.get("/api/clients/:id/contacts", async (req, res) => {
    try {
      const clientId = Number(req.params.id);
      const contacts = await storage.getClientContacts(clientId);
      res.json(contacts);
    } catch (err) {
      res.status(400).json({ message: "Invalid client ID" });
    }
  });

  app.post("/api/clients/:id/contacts", async (req, res) => {
    try {
      const clientId = Number(req.params.id);
      const input = insertClientContactSchema.parse({ ...req.body, clientId });
      const contact = await storage.createClientContact(input);
      res.status(201).json(contact);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.put("/api/contacts/:id", async (req, res) => {
    try {
      const contactId = Number(req.params.id);
      const contact = await storage.updateClientContact(contactId, req.body);
      if (!contact) return res.status(404).json({ message: "Contact not found" });
      res.json(contact);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.delete("/api/contacts/:id", async (req, res) => {
    try {
      const contactId = Number(req.params.id);
      await storage.deleteClientContact(contactId);
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ message: "Invalid contact ID" });
    }
  });

  // Mowers
  app.get("/api/mowers", async (req, res) => {
    const mowerList = await storage.getMowers();
    res.json(mowerList);
  });

  app.post("/api/mowers", async (req, res) => {
    try {
      const role = await getCurrentUserRole(req);
      if (role !== "manager" && role !== "owner") {
        return res.status(403).json({ message: "Only managers and owners can create mowers" });
      }
      const input = insertMowerSchema.parse(req.body);
      const mower = await storage.createMower(input);
      res.status(201).json(mower);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.put("/api/mowers/:id", async (req, res) => {
    try {
      const role = await getCurrentUserRole(req);
      if (role !== "manager" && role !== "owner") {
        return res.status(403).json({ message: "Only managers and owners can update mowers" });
      }
      const mowerId = Number(req.params.id);
      const mower = await storage.updateMower(mowerId, req.body);
      if (!mower) return res.status(404).json({ message: "Mower not found" });
      res.json(mower);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  // Mower Favorites
  app.get("/api/mowers/favorites", async (req, res) => {
    try {
      const staffId = await getCurrentStaffId(req);
      if (!staffId) return res.status(401).json({ message: "Not authenticated" });
      const favorites = await storage.getMowerFavorites(staffId);
      res.json(favorites);
    } catch (err) {
      res.status(400).json({ message: "Error fetching favorites" });
    }
  });

  app.post("/api/mowers/:id/favorite", async (req, res) => {
    try {
      const staffId = await getCurrentStaffId(req);
      if (!staffId) return res.status(401).json({ message: "Not authenticated" });
      const mowerId = Number(req.params.id);
      const favorite = await storage.addMowerFavorite(staffId, mowerId);
      res.status(201).json(favorite);
    } catch (err) {
      res.status(400).json({ message: "Error adding favorite" });
    }
  });

  app.delete("/api/mowers/:id/favorite", async (req, res) => {
    try {
      const staffId = await getCurrentStaffId(req);
      if (!staffId) return res.status(401).json({ message: "Not authenticated" });
      const mowerId = Number(req.params.id);
      await storage.removeMowerFavorite(staffId, mowerId);
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ message: "Error removing favorite" });
    }
  });

  // Job Tasks
  app.get("/api/jobs/:id/tasks", async (req, res) => {
    try {
      const jobId = Number(req.params.id);
      const tasks = await storage.getJobTasks(jobId);
      res.json(tasks);
    } catch (err) {
      res.status(400).json({ message: "Invalid job ID" });
    }
  });

  app.post("/api/jobs/:id/tasks", async (req, res) => {
    try {
      const jobId = Number(req.params.id);
      const input = insertJobTaskSchema.parse({ ...req.body, jobId });
      const task = await storage.createJobTask(input);
      res.status(201).json(task);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.put("/api/tasks/:id", async (req, res) => {
    try {
      const taskId = Number(req.params.id);
      const updates: Record<string, unknown> = {};
      
      if (typeof req.body.isCompleted === "boolean") {
        updates.isCompleted = req.body.isCompleted;
        if (req.body.isCompleted) {
          // Set completed info
          const staffId = await getCurrentStaffId(req);
          updates.completedById = staffId;
          updates.completedAt = new Date();
        } else {
          // Clear completed info
          updates.completedById = null;
          updates.completedAt = null;
        }
      }
      
      // Handle description update if provided
      if (typeof req.body.description === "string") {
        updates.description = req.body.description;
      }
      
      const task = await storage.updateJobTask(taskId, updates);
      if (!task) return res.status(404).json({ message: "Task not found" });
      res.json(task);
    } catch (err) {
      console.error("Error updating task:", err);
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.delete("/api/tasks/:id", async (req, res) => {
    try {
      const taskId = Number(req.params.id);
      await storage.deleteJobTask(taskId);
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ message: "Invalid task ID" });
    }
  });

  // Treatment Categories
  app.get("/api/treatment-categories", async (req, res) => {
    const categories = await storage.getTreatmentCategories();
    res.json(categories);
  });

  app.post("/api/treatment-categories", async (req, res) => {
    try {
      const role = await getCurrentUserRole(req);
      if (role !== "manager" && role !== "owner") {
        return res.status(403).json({ message: "Only managers and owners can create treatment categories" });
      }
      const input = insertTreatmentCategorySchema.parse(req.body);
      const category = await storage.createTreatmentCategory(input);
      res.status(201).json(category);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.put("/api/treatment-categories/:id", async (req, res) => {
    try {
      const role = await getCurrentUserRole(req);
      if (role !== "manager" && role !== "owner") {
        return res.status(403).json({ message: "Only managers and owners can update treatment categories" });
      }
      const id = Number(req.params.id);
      const updates = insertTreatmentCategorySchema.partial().parse(req.body);
      const updated = await storage.updateTreatmentCategory(id, updates);
      if (!updated) return res.status(404).json({ message: "Treatment category not found" });
      res.json(updated);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.delete("/api/treatment-categories/:id", async (req, res) => {
    try {
      const role = await getCurrentUserRole(req);
      if (role !== "manager" && role !== "owner") {
        return res.status(403).json({ message: "Only managers and owners can delete treatment categories" });
      }
      const id = Number(req.params.id);
      const deleted = await storage.deleteTreatmentCategory(id);
      if (!deleted) return res.status(404).json({ message: "Treatment category not found" });
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ message: "Failed to delete treatment category" });
    }
  });

  // Treatment Types
  app.get("/api/treatment-types", async (req, res) => {
    const types = await storage.getTreatmentTypes();
    res.json(types);
  });

  app.post("/api/treatment-types", async (req, res) => {
    try {
      const role = await getCurrentUserRole(req);
      if (role !== "manager" && role !== "owner") {
        return res.status(403).json({ message: "Only managers and owners can create treatment types" });
      }
      const input = insertTreatmentTypeSchema.parse(req.body);
      const type = await storage.createTreatmentType(input);
      res.status(201).json(type);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.put("/api/treatment-types/:id", async (req, res) => {
    try {
      const role = await getCurrentUserRole(req);
      if (role !== "manager" && role !== "owner") {
        return res.status(403).json({ message: "Only managers and owners can update treatment types" });
      }
      const id = Number(req.params.id);
      const updates = insertTreatmentTypeSchema.partial().parse(req.body);
      const updated = await storage.updateTreatmentType(id, updates);
      if (!updated) return res.status(404).json({ message: "Treatment type not found" });
      res.json(updated);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.delete("/api/treatment-types/:id", async (req, res) => {
    try {
      const role = await getCurrentUserRole(req);
      if (role !== "manager" && role !== "owner") {
        return res.status(403).json({ message: "Only managers and owners can delete treatment types" });
      }
      const id = Number(req.params.id);
      const deleted = await storage.deleteTreatmentType(id);
      if (!deleted) return res.status(404).json({ message: "Treatment type not found" });
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ message: "Failed to delete treatment type" });
    }
  });

  // Treatment Programs (standalone treatment schedules, separate from service programs)
  app.get("/api/treatment-programs", async (req, res) => {
    const programs = await storage.getTreatmentPrograms();
    res.json(programs);
  });

  app.get("/api/treatment-programs/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const program = await storage.getTreatmentProgram(id);
      if (!program) return res.status(404).json({ message: "Treatment program not found" });
      res.json(program);
    } catch (err) {
      res.status(400).json({ message: "Invalid treatment program ID" });
    }
  });

  app.post("/api/treatment-programs", async (req, res) => {
    try {
      const role = await getCurrentUserRole(req);
      if (role !== "manager" && role !== "owner") {
        return res.status(403).json({ message: "Only managers and owners can create treatment programs" });
      }
      const input = insertTreatmentProgramSchema.parse(req.body);
      const program = await storage.createTreatmentProgram(input);
      res.status(201).json(program);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.put("/api/treatment-programs/:id", async (req, res) => {
    try {
      const role = await getCurrentUserRole(req);
      if (role !== "manager" && role !== "owner") {
        return res.status(403).json({ message: "Only managers and owners can update treatment programs" });
      }
      const id = Number(req.params.id);
      const updates = insertTreatmentProgramSchema.partial().parse(req.body);
      const updated = await storage.updateTreatmentProgram(id, updates);
      if (!updated) return res.status(404).json({ message: "Treatment program not found" });
      res.json(updated);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.post("/api/treatment-programs/:id/schedule", async (req, res) => {
    try {
      const role = await getCurrentUserRole(req);
      if (role !== "manager" && role !== "owner") {
        return res.status(403).json({ message: "Only managers and owners can add treatment schedule" });
      }
      const treatmentProgramId = Number(req.params.id);
      const input = insertTreatmentProgramScheduleSchema.parse({ ...req.body, treatmentProgramId });
      const schedule = await storage.createTreatmentProgramSchedule(input);
      res.status(201).json(schedule);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.put("/api/treatment-program-schedule/:id", async (req, res) => {
    try {
      const role = await getCurrentUserRole(req);
      if (role !== "manager" && role !== "owner") {
        return res.status(403).json({ message: "Only managers and owners can update treatment schedule" });
      }
      const id = Number(req.params.id);
      const updates = insertTreatmentProgramScheduleSchema.partial().parse(req.body);
      const updated = await storage.updateTreatmentProgramSchedule(id, updates);
      if (!updated) return res.status(404).json({ message: "Schedule item not found" });
      res.json(updated);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.delete("/api/treatment-program-schedule/:id", async (req, res) => {
    try {
      const role = await getCurrentUserRole(req);
      if (role !== "manager" && role !== "owner") {
        return res.status(403).json({ message: "Only managers and owners can delete treatment schedule" });
      }
      const id = Number(req.params.id);
      await storage.deleteTreatmentProgramSchedule(id);
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ message: "Invalid schedule ID" });
    }
  });

  // Program Templates
  app.get("/api/program-templates", async (req, res) => {
    const templates = await storage.getProgramTemplates();
    res.json(templates);
  });

  app.get("/api/program-templates/:id", async (req, res) => {
    try {
      const templateId = Number(req.params.id);
      const template = await storage.getProgramTemplate(templateId);
      if (!template) return res.status(404).json({ message: "Template not found" });
      res.json(template);
    } catch (err) {
      res.status(400).json({ message: "Invalid template ID" });
    }
  });

  app.post("/api/program-templates", async (req, res) => {
    try {
      const role = await getCurrentUserRole(req);
      if (role !== "manager" && role !== "owner") {
        return res.status(403).json({ message: "Only managers and owners can create program templates" });
      }
      const body = { ...req.body };
      if (Array.isArray(body.servicesPerMonth)) {
        body.servicesPerMonth = JSON.stringify(body.servicesPerMonth);
      }
      const input = insertProgramTemplateSchema.parse(body);
      const template = await storage.createProgramTemplate(input);
      res.status(201).json(template);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.put("/api/program-templates/:id", async (req, res) => {
    try {
      const role = await getCurrentUserRole(req);
      if (role !== "manager" && role !== "owner") {
        return res.status(403).json({ message: "Only managers and owners can update program templates" });
      }
      const templateId = Number(req.params.id);
      const template = await storage.updateProgramTemplate(templateId, req.body);
      if (!template) return res.status(404).json({ message: "Template not found" });
      res.json(template);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  // Program Template Treatments
  app.post("/api/program-templates/:id/treatments", async (req, res) => {
    try {
      const role = await getCurrentUserRole(req);
      if (role !== "manager" && role !== "owner") {
        return res.status(403).json({ message: "Only managers and owners can add treatments" });
      }
      const templateId = Number(req.params.id);
      const input = insertProgramTemplateTreatmentSchema.parse({ ...req.body, programTemplateId: templateId });
      const treatment = await storage.createProgramTemplateTreatment(input);
      res.status(201).json(treatment);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.delete("/api/program-template-treatments/:id", async (req, res) => {
    try {
      const role = await getCurrentUserRole(req);
      if (role !== "manager" && role !== "owner") {
        return res.status(403).json({ message: "Only managers and owners can remove treatments" });
      }
      const treatmentId = Number(req.params.id);
      await storage.deleteProgramTemplateTreatment(treatmentId);
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ message: "Invalid treatment ID" });
    }
  });

  // Client Programs
  app.get("/api/clients/:id/programs", async (req, res) => {
    try {
      const clientId = Number(req.params.id);
      const programs = await storage.getClientPrograms(clientId);
      res.json(programs);
    } catch (err) {
      res.status(400).json({ message: "Invalid client ID" });
    }
  });

  // Client Treatment History
  app.get("/api/clients/:id/treatment-history", async (req, res) => {
    try {
      const clientId = Number(req.params.id);
      const treatments = await storage.getClientTreatmentHistory(clientId);
      res.json(treatments);
    } catch (err) {
      res.status(400).json({ message: "Invalid client ID" });
    }
  });

  app.post("/api/clients/:id/programs", async (req, res) => {
    try {
      const clientId = Number(req.params.id);
      const input = insertClientProgramSchema.parse({ ...req.body, clientId });
      const program = await storage.createClientProgram(input);
      
      // Auto-generate treatments from program template
      const templateWithTreatments = await storage.getProgramTemplate(input.programTemplateId);
      if (templateWithTreatments?.treatments && templateWithTreatments.treatments.length > 0) {
        const startDate = input.startDate ? new Date(input.startDate) : new Date();
        const currentYear = startDate.getFullYear();
        
        const treatmentsToCreate = templateWithTreatments.treatments.map(t => ({
          clientProgramId: program.id,
          treatmentTypeId: t.treatmentTypeId,
          targetMonth: t.month,
          targetYear: currentYear,
          status: "pending" as const,
        }));
        
        await storage.createClientProgramTreatments(treatmentsToCreate);
      }
      
      res.status(201).json(program);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.put("/api/client-programs/:id", async (req, res) => {
    try {
      const programId = Number(req.params.id);
      const program = await storage.updateClientProgram(programId, req.body);
      if (!program) return res.status(404).json({ message: "Program not found" });
      res.json(program);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  // Client Program Treatments
  app.get("/api/client-programs/:id/treatments", async (req, res) => {
    try {
      const programId = Number(req.params.id);
      const treatments = await storage.getClientProgramTreatments(programId);
      res.json(treatments);
    } catch (err) {
      res.status(400).json({ message: "Invalid program ID" });
    }
  });

  app.put("/api/client-program-treatments/:id", async (req, res) => {
    try {
      const treatmentId = Number(req.params.id);
      const staffId = await getCurrentStaffId(req);
      const updates = { ...req.body };
      if (req.body.status === "completed" && !req.body.completedById) {
        updates.completedById = staffId;
        updates.completedAt = new Date();
      }
      const treatment = await storage.updateClientProgramTreatment(treatmentId, updates);
      if (!treatment) return res.status(404).json({ message: "Treatment not found" });
      res.json(treatment);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  // Job Treatments - get treatments directly linked to a job
  app.get("/api/jobs/:id/treatments", async (req, res) => {
    try {
      const jobId = Number(req.params.id);
      const treatments = await storage.getJobTreatments(jobId);
      res.json(treatments);
    } catch (err) {
      res.status(400).json({ message: "Invalid job ID" });
    }
  });

  // Update job treatment status
  app.put("/api/job-treatments/:id", async (req, res) => {
    try {
      const treatmentId = Number(req.params.id);
      const staffId = await getCurrentStaffId(req);
      const updates = { ...req.body };
      if (req.body.status === "completed" && !req.body.completedById) {
        updates.completedById = staffId;
        updates.completedAt = new Date();
      }
      const treatment = await storage.updateJobTreatment(treatmentId, updates);
      if (!treatment) return res.status(404).json({ message: "Treatment not found" });
      res.json(treatment);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  // Job Time Entries
  app.get("/api/jobs/:id/time-entries", async (req, res) => {
    try {
      const jobId = Number(req.params.id);
      const entries = await storage.getJobTimeEntries(jobId);
      res.json(entries);
    } catch (err) {
      res.status(400).json({ message: "Invalid job ID" });
    }
  });

  app.post("/api/jobs/:id/time-entries/start", async (req, res) => {
    try {
      const jobId = Number(req.params.id);
      const staffId = await getCurrentStaffId(req);
      if (!staffId) return res.status(401).json({ message: "Not authenticated" });
      
      const existingEntry = await storage.getActiveTimeEntry(jobId, staffId);
      if (existingEntry) {
        return res.status(400).json({ message: "You already have a timer running for this job" });
      }
      
      const input = insertJobTimeEntrySchema.parse({
        jobId,
        staffId,
        startTime: new Date(),
        entryType: req.body.entryType || "self",
        crewId: req.body.crewId || null,
        notes: req.body.notes || null
      });
      const entry = await storage.createJobTimeEntry(input);
      res.status(201).json(entry);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.post("/api/time-entries/:id/stop", async (req, res) => {
    try {
      const entryId = Number(req.params.id);
      const entry = await storage.stopJobTimeEntry(entryId);
      if (!entry) return res.status(404).json({ message: "Time entry not found" });
      res.json(entry);
    } catch (err) {
      res.status(400).json({ message: "Invalid time entry ID" });
    }
  });

  app.delete("/api/time-entries/:id", async (req, res) => {
    try {
      const role = await getCurrentUserRole(req);
      if (!canViewMoney(role)) {
        return res.status(403).json({ message: "Not authorized to delete time entries" });
      }
      const entryId = Number(req.params.id);
      await storage.deleteJobTimeEntry(entryId);
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ message: "Invalid time entry ID" });
    }
  });

  // Job Photos
  app.get("/api/jobs/:id/photos", async (req, res) => {
    try {
      const jobId = Number(req.params.id);
      if (isNaN(jobId)) {
        return res.status(400).json({ message: "Invalid job ID" });
      }
      const photos = await storage.getJobPhotos(jobId);
      res.json(photos);
    } catch (err) {
      console.error("Error fetching job photos:", err);
      res.status(500).json({ message: "Error fetching photos" });
    }
  });

  app.post("/api/jobs/:id/photos", async (req, res) => {
    try {
      const jobId = Number(req.params.id);
      const staffId = await getCurrentStaffId(req);
      const input = insertJobPhotoSchema.parse({
        ...req.body,
        jobId,
        staffId
      });
      const photo = await storage.createJobPhoto(input);
      res.status(201).json(photo);
    } catch (err) {
      console.error("Error creating job photo:", err);
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.delete("/api/photos/:id", async (req, res) => {
    try {
      const photoId = Number(req.params.id);
      await storage.deleteJobPhoto(photoId);
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ message: "Invalid photo ID" });
    }
  });

  // Job Invoice Items
  app.get("/api/jobs/:id/invoice-items", async (req, res) => {
    try {
      const role = await getCurrentUserRole(req);
      if (!canViewMoney(role)) {
        return res.status(403).json({ message: "Not authorized to view invoice items" });
      }
      const jobId = Number(req.params.id);
      const items = await storage.getJobInvoiceItems(jobId);
      res.json(items);
    } catch (err) {
      res.status(400).json({ message: "Invalid job ID" });
    }
  });

  app.post("/api/jobs/:id/invoice-items", async (req, res) => {
    try {
      const role = await getCurrentUserRole(req);
      if (!canViewMoney(role)) {
        return res.status(403).json({ message: "Not authorized to manage invoice items" });
      }
      const jobId = Number(req.params.id);
      const input = insertJobInvoiceItemSchema.parse({
        ...req.body,
        jobId
      });
      const item = await storage.createJobInvoiceItem(input);
      res.status(201).json(item);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.put("/api/invoice-items/:id", async (req, res) => {
    try {
      const role = await getCurrentUserRole(req);
      if (!canViewMoney(role)) {
        return res.status(403).json({ message: "Not authorized to manage invoice items" });
      }
      const itemId = Number(req.params.id);
      const item = await storage.updateJobInvoiceItem(itemId, req.body);
      if (!item) return res.status(404).json({ message: "Invoice item not found" });
      res.json(item);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.delete("/api/invoice-items/:id", async (req, res) => {
    try {
      const role = await getCurrentUserRole(req);
      if (!canViewMoney(role)) {
        return res.status(403).json({ message: "Not authorized to manage invoice items" });
      }
      const itemId = Number(req.params.id);
      await storage.deleteJobInvoiceItem(itemId);
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ message: "Invalid invoice item ID" });
    }
  });

  // Seed Data
  try {
    const staffList = await storage.getStaffList();
    if (staffList.length === 0) {
      console.log("Seeding database...");
      const staff1 = await storage.createStaff({ name: "John Mower", role: "staff", phone: "555-1234" });
      
      const client1 = await storage.createClient({ 
        name: "John Doe", 
        address: "123 Green St", 
        programTier: "26", 
        email: "john@example.com" 
      });
      
      const job1 = await storage.createJob({
        clientId: client1.id,
        assignedToId: staff1.id,
        scheduledDate: new Date(),
        status: "scheduled",
        notes: "Front yard only"
      });
      
      await storage.createApplication({
        jobId: job1.id,
        productName: "Eco-Fertilizer",
        quantity: "5kg",
        complianceNotes: "Standard application"
      });
      
      console.log("Seeding complete.");
    }

    // Seed mowers if empty
    const mowerList = await storage.getMowers();
    if (mowerList.length === 0) {
      console.log("Seeding mowers...");
      await storage.createMower({ name: "Honda HRU216", brand: "Honda", model: "HRU216", type: "push", description: "21\" push mower, reliable and efficient", icon: "push" });
      await storage.createMower({ name: "Greenworks 22\" Optimus", brand: "Greenworks", model: "22\" Optimus", type: "self_propelled", description: "Battery-powered, eco-friendly option", icon: "self_propelled" });
      await storage.createMower({ name: "Scag V-Ride 36\"", brand: "Scag", model: "V-Ride 36", type: "stand_on", description: "Commercial stand-on, great for medium lawns", icon: "stand_on" });
      await storage.createMower({ name: "Bush Ranger 21\"", brand: "Bush Ranger", model: "21", type: "push", description: "Heavy-duty push mower for tough conditions", icon: "push" });
      await storage.createMower({ name: "Husqvarna Z254", brand: "Husqvarna", model: "Z254", type: "ride_on", description: "54\" ride-on, ideal for large properties", icon: "ride_on" });
      console.log("Mowers seeded.");
    }

    // Seed treatment types if empty
    const treatmentList = await storage.getTreatmentTypes();
    if (treatmentList.length === 0) {
      console.log("Seeding treatment types...");
      await storage.createTreatmentType({ name: "Soil Wetter", description: "Improves water penetration in hydrophobic soils", category: "soil", icon: "droplet" });
      await storage.createTreatmentType({ name: "Fertilizer - Spring", description: "High nitrogen blend for spring growth", category: "fertilizer", icon: "leaf" });
      await storage.createTreatmentType({ name: "Fertilizer - Summer", description: "Balanced NPK with iron for summer stress", category: "fertilizer", icon: "leaf" });
      await storage.createTreatmentType({ name: "Fertilizer - Autumn", description: "Potassium-rich for winter preparation", category: "fertilizer", icon: "leaf" });
      await storage.createTreatmentType({ name: "Core Aeration", description: "Reduces compaction, improves root growth", category: "aeration", icon: "circle-dot" });
      await storage.createTreatmentType({ name: "Irrigation Check", description: "System inspection and adjustment", category: "irrigation", icon: "droplets" });
      await storage.createTreatmentType({ name: "Soil Test", description: "pH and nutrient analysis", category: "soil", icon: "flask-conical" });
      await storage.createTreatmentType({ name: "Pest Control - Lawn Grubs", description: "Treatment for lawn grub infestations", category: "pest", icon: "bug" });
      console.log("Treatment types seeded.");
    }

    // Seed program templates if empty
    const templateList = await storage.getProgramTemplates();
    if (templateList.length === 0) {
      console.log("Seeding program templates...");
      await storage.createProgramTemplate({
        name: "Essentials",
        description: "22 services per year - fortnightly during growing season, monthly during winter",
        servicesPerYear: 22,
        servicesPerMonth: JSON.stringify([2, 2, 2, 2, 1, 1, 1, 1, 2, 2, 2, 2])
      });
      await storage.createProgramTemplate({
        name: "Elite",
        description: "24 services per year - fortnightly all year round",
        servicesPerYear: 24,
        servicesPerMonth: JSON.stringify([2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2])
      });
      await storage.createProgramTemplate({
        name: "Prestige",
        description: "26 services per year - weekly during peak, fortnightly during winter",
        servicesPerYear: 26,
        servicesPerMonth: JSON.stringify([3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3])
      });
      console.log("Program templates seeded.");
    }
  } catch (e) {
    console.error("Seeding failed:", e);
  }

  return httpServer;
}
