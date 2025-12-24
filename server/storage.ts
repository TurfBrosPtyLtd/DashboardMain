import { db } from "./db";
import {
  staff, clients, crews, crewMembers, jobRuns, jobs, feedback, applications,
  type Staff, type InsertStaff,
  type Client, type InsertStaff as InsertClient,
  type Crew, type InsertCrew, type UpdateCrew,
  type CrewMember, type InsertCrewMember,
  type JobRun, type InsertJobRun,
  type Job, type Feedback, type Application
} from "@shared/schema";
import { eq, and, desc, gte, lt } from "drizzle-orm";

export interface IStorage {
  // Staff
  getStaff(id: number): Promise<Staff | undefined>;
  getStaffList(): Promise<Staff[]>;
  createStaff(staffData: any): Promise<Staff>;

  // Clients
  getClients(): Promise<Client[]>;
  getClient(id: number): Promise<Client | undefined>;
  createClient(client: any): Promise<Client>;

  // Crews
  getCrews(): Promise<(Crew & { members: (CrewMember & { staff: Staff })[] })[]>;
  createCrew(crew: InsertCrew): Promise<Crew>;
  updateCrew(id: number, updates: UpdateCrew): Promise<Crew>;
  deleteCrew(id: number): Promise<boolean>;
  addCrewMember(crewId: number, staffId: number): Promise<CrewMember>;
  removeCrewMember(crewId: number, staffId: number): Promise<boolean>;

  // Job Runs
  getJobRuns(date?: string): Promise<JobRun[]>;
  createJobRun(jobRun: any): Promise<JobRun>;
  updateJobRun(id: number, updates: any): Promise<JobRun>;
  deleteJobRun(id: number): Promise<boolean>;

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

  async getCrews(): Promise<(Crew & { members: (CrewMember & { staff: Staff })[] })[]> {
    return await db.query.crews.findMany({
      with: {
        members: {
          with: {
            staff: true,
          },
        },
      },
      orderBy: [crews.name],
    });
  }

  async createCrew(crew: InsertCrew): Promise<Crew> {
    const [newCrew] = await db.insert(crews).values(crew).returning();
    return newCrew;
  }

  async updateCrew(id: number, updates: UpdateCrew): Promise<Crew> {
    const [updated] = await db.update(crews).set(updates).where(eq(crews.id, id)).returning();
    return updated;
  }

  async deleteCrew(id: number): Promise<boolean> {
    await db.update(jobRuns).set({ crewId: null }).where(eq(jobRuns.crewId, id));
    await db.delete(crewMembers).where(eq(crewMembers.crewId, id));
    await db.delete(crews).where(eq(crews.id, id));
    return true;
  }

  async addCrewMember(crewId: number, staffId: number): Promise<CrewMember> {
    const [member] = await db.insert(crewMembers).values({ crewId, staffId }).returning();
    return member;
  }

  async removeCrewMember(crewId: number, staffId: number): Promise<boolean> {
    await db.delete(crewMembers).where(and(eq(crewMembers.crewId, crewId), eq(crewMembers.staffId, staffId)));
    return true;
  }

  async getJobRuns(date?: string): Promise<JobRun[]> {
    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      return await db.select().from(jobRuns)
        .where(and(gte(jobRuns.date, start), lt(jobRuns.date, end)))
        .orderBy(jobRuns.createdAt);
    }
    return await db.select().from(jobRuns).orderBy(desc(jobRuns.date));
  }

  async createJobRun(jobRun: any): Promise<JobRun> {
    const [newJobRun] = await db.insert(jobRuns).values(jobRun).returning();
    return newJobRun;
  }

  async updateJobRun(id: number, updates: any): Promise<JobRun> {
    const [updated] = await db.update(jobRuns).set(updates).where(eq(jobRuns.id, id)).returning();
    return updated;
  }

  async deleteJobRun(id: number): Promise<boolean> {
    await db.update(jobs).set({ jobRunId: null }).where(eq(jobs.jobRunId, id));
    await db.delete(jobRuns).where(eq(jobRuns.id, id));
    return true;
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
