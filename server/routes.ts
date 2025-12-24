import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { insertJobRunSchema, insertCrewSchema } from "@shared/schema";
import { z } from "zod";
import OpenAI from "openai";

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
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.delete(api.crews.delete.path, async (req, res) => {
    try {
      await storage.deleteCrew(Number(req.params.id));
      res.json({ success: true });
    } catch (err) {
      res.status(404).json({ message: "Crew not found" });
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
    const filters = {
      assignedToId: req.query.assignedToId ? Number(req.query.assignedToId) : undefined,
      status: req.query.status as string,
    };
    const jobsList = await storage.getJobs(filters);
    res.json(jobsList);
  });

  app.post(api.jobs.create.path, async (req, res) => {
    try {
      const input = api.jobs.create.input.parse(req.body);
      const job = await storage.createJob(input);
      res.status(201).json(job);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.put(api.jobs.update.path, async (req, res) => {
    try {
      const input = api.jobs.update.input.parse(req.body);
      const job = await storage.updateJob(Number(req.params.id), input);
      res.json(job);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.get(api.jobs.get.path, async (req, res) => {
    const job = await storage.getJob(Number(req.params.id));
    if (!job) return res.status(404).json({ message: "Job not found" });
    res.json(job);
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
  } catch (e) {
    console.error("Seeding failed:", e);
  }

  return httpServer;
}
