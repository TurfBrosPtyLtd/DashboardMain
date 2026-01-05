import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { 
  insertJobRunSchema, insertCrewSchema, updateCrewSchema, canViewMoney, canViewGateCode,
  insertClientContactSchema, insertMowerSchema, insertJobTaskSchema,
  insertTreatmentTypeSchema, insertProgramTemplateSchema, insertProgramTemplateTreatmentSchema,
  insertClientProgramSchema
} from "@shared/schema";
import { z } from "zod";
import OpenAI from "openai";

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
      
      res.status(201).json(sanitizeJobData(job, canViewPrice, canViewGate));
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.put(api.jobs.update.path, async (req, res) => {
    try {
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
      const job = await storage.updateJob(Number(req.params.id), input);
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
      const staffId = await getCurrentStaffId(req);
      const updates = { ...req.body };
      if (req.body.isCompleted && !req.body.completedById) {
        updates.completedById = staffId;
        updates.completedAt = new Date();
      }
      const task = await storage.updateJobTask(taskId, updates);
      if (!task) return res.status(404).json({ message: "Task not found" });
      res.json(task);
    } catch (err) {
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

  app.post("/api/clients/:id/programs", async (req, res) => {
    try {
      const clientId = Number(req.params.id);
      const input = insertClientProgramSchema.parse({ ...req.body, clientId });
      const program = await storage.createClientProgram(input);
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
