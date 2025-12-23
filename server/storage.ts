import { db } from "./db";
import {
  users, clients, jobs, feedback, applications,
  type User, type InsertUser,
  type Client, type InsertUser as InsertClient, // Fix type alias
  type Job, type Feedback, type Application
} from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";

// We need to properly export the types for storage
export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUsers(): Promise<User[]>;

  // Clients
  getClients(): Promise<Client[]>;
  getClient(id: number): Promise<Client | undefined>;
  createClient(client: any): Promise<Client>; // Using any for simplicity in fast mode, ideally strictly typed

  // Jobs
  getJobs(filters?: { assignedToId?: number; status?: string; date?: string }): Promise<(Job & { client: Client })[]>;
  getJob(id: number): Promise<(Job & { client: Client, applications: Application[] }) | undefined>;
  createJob(job: any): Promise<Job>;
  updateJob(id: number, updates: any): Promise<Job>;

  // Feedback
  createFeedback(feedback: any): Promise<Feedback>;
  getFeedback(): Promise<(Feedback & { job: Job })[]>;

  // Applications
  createApplication(app: any): Promise<Application>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async getClients(): Promise<Client[]> {
    return await db.select().from(clients);
  }

  async getClient(id: number): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client;
  }

  async createClient(client: any): Promise<Client> {
    const [newClient] = await db.insert(clients).values(client).returning();
    return newClient;
  }

  async getJobs(filters?: { assignedToId?: number; status?: string; date?: string }): Promise<(Job & { client: Client })[]> {
    let query = db.query.jobs.findMany({
      with: {
        client: true,
      },
      orderBy: [desc(jobs.scheduledDate)],
    });
    
    // Note: Drizzle query builder filters are better applied in a simpler way for MVP or using .select() with joins
    // Switching to .select() for easier dynamic filtering in this basic setup
    
    // Actually, stick to simple query for now.
    // If I use db.select().from(jobs)... I can join.
    
    const conditions = [];
    if (filters?.assignedToId) conditions.push(eq(jobs.assignedToId, filters.assignedToId));
    if (filters?.status) conditions.push(eq(jobs.status, filters.status));
    
    // Date filtering would require date manipulation, skipping for super-MVP 1-shot unless simple
    
    return await db.query.jobs.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      with: {
        client: true,
      },
      orderBy: [desc(jobs.scheduledDate)],
    });
  }

  async getJob(id: number): Promise<(Job & { client: Client, applications: Application[] }) | undefined> {
    return await db.query.jobs.findFirst({
      where: eq(jobs.id, id),
      with: {
        client: true,
        applications: true,
      }
    });
  }

  async createJob(job: any): Promise<Job> {
    const [newJob] = await db.insert(jobs).values(job).returning();
    return newJob;
  }

  async updateJob(id: number, updates: any): Promise<Job> {
    const [updatedJob] = await db.update(jobs).set(updates).where(eq(jobs.id, id)).returning();
    return updatedJob;
  }

  async createFeedback(feedbackData: any): Promise<Feedback> {
    const [newFeedback] = await db.insert(feedback).values(feedbackData).returning();
    return newFeedback;
  }

  async getFeedback(): Promise<(Feedback & { job: Job })[]> {
    return await db.query.feedback.findMany({
      with: {
        job: true,
      }
    });
  }

  async createApplication(appData: any): Promise<Application> {
    const [newApp] = await db.insert(applications).values(appData).returning();
    return newApp;
  }
}

export const storage = new DatabaseStorage();
