import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import OpenAI from "openai";
import { setupAuth, registerAuthRoutes } from "./replit_integrations/auth";
import { registerChatRoutes } from "./replit_integrations/chat";
import { registerImageRoutes } from "./replit_integrations/image";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "dummy" });

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Setup Integrations
  await setupAuth(app);
  registerAuthRoutes(app);
  registerChatRoutes(app);
  registerImageRoutes(app);

  // Users
  app.get(api.users.list.path, async (req, res) => {
    const users = await storage.getUsers();
    res.json(users);
  });
  
  app.post(api.users.create.path, async (req, res) => {
    try {
      const input = api.users.create.input.parse(req.body);
      const user = await storage.createUser(input);
      res.status(201).json(user);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.get(api.users.get.path, async (req, res) => {
    const user = await storage.getUser(Number(req.params.id));
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  });

  // Clients
  app.get(api.clients.list.path, async (req, res) => {
    const clients = await storage.getClients();
    res.json(clients);
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

  // Jobs
  app.get(api.jobs.list.path, async (req, res) => {
    const filters = {
      assignedToId: req.query.assignedToId ? Number(req.query.assignedToId) : undefined,
      status: req.query.status as string,
    };
    const jobs = await storage.getJobs(filters);
    res.json(jobs);
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
      
      // Perform AI Analysis
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

      const feedback = await storage.createFeedback({
        ...input,
        sentiment,
        aiAnalysis,
      });
      res.status(201).json(feedback);
    } catch (err) {
      console.error(err);
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.get(api.feedback.list.path, async (req, res) => {
    const feedback = await storage.getFeedback();
    res.json(feedback);
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
    const users = await storage.getUsers();
    if (users.length === 0) {
      console.log("Seeding database...");
      const admin = await storage.createUser({ username: "admin", role: "admin" });
      const staff1 = await storage.createUser({ username: "staff1", role: "staff" });
      
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
