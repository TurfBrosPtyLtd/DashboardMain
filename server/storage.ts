import { db } from "./db";
import {
  staff, clients, jobs, feedback, applications,
  type Staff, type InsertStaff,
  type Client, type InsertStaff as InsertClient,
  type Job, type Feedback, type Application
} from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";

export interface IStorage {
  // Staff
  getStaff(id: number): Promise<Staff | undefined>;
  getStaffList(): Promise<Staff[]>;
  createStaff(staffData: any): Promise<Staff>;

  // Clients
  getClients(): Promise<Client[]>;
  getClient(id: number): Promise<Client | undefined>;
  createClient(client: any): Promise<Client>;

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
  async getStaff(id: number): Promise<Staff | undefined> {
    const [s] = await db.select().from(staff).where(eq(staff.id, id));
    return s;
  }

  async getStaffList(): Promise<Staff[]> {
    return await db.select().from(staff);
  }

  async createStaff(staffData: any): Promise<Staff> {
    const [newStaff] = await db.insert(staff).values(staffData).returning();
    return newStaff;
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
    const conditions = [];
    if (filters?.assignedToId) conditions.push(eq(jobs.assignedToId, filters.assignedToId));
    if (filters?.status) conditions.push(eq(jobs.status, filters.status));
    
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
