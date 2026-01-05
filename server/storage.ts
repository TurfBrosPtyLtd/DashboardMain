import { db } from "./db";
import {
  staff, clients, crews, crewMembers, jobRuns, jobs, feedback, applications,
  clientContacts, mowers, staffMowerFavorites, jobTasks,
  treatmentTypes, treatmentPrograms, treatmentProgramSchedule,
  programTemplates, programTemplateTreatments,
  clientPrograms, clientProgramServices, clientProgramTreatments,
  jobTimeEntries, jobPhotos, jobInvoiceItems,
  type Staff, type InsertStaff,
  type Client, type InsertStaff as InsertClient,
  type Crew, type InsertCrew, type UpdateCrew,
  type CrewMember, type InsertCrewMember,
  type JobRun, type InsertJobRun,
  type Job, type Feedback, type Application,
  type ClientContact, type InsertClientContact,
  type Mower, type InsertMower,
  type StaffMowerFavorite, type InsertStaffMowerFavorite,
  type JobTask, type InsertJobTask,
  type TreatmentType, type InsertTreatmentType,
  type TreatmentProgram, type InsertTreatmentProgram,
  type TreatmentProgramSchedule, type InsertTreatmentProgramSchedule,
  type ProgramTemplate, type InsertProgramTemplate,
  type ProgramTemplateTreatment, type InsertProgramTemplateTreatment,
  type ClientProgram, type InsertClientProgram,
  type ClientProgramService, type InsertClientProgramService,
  type ClientProgramTreatment, type InsertClientProgramTreatment,
  type JobTreatment, type InsertJobTreatment,
  type JobTimeEntry, type InsertJobTimeEntry,
  type JobPhoto, type InsertJobPhoto,
  type JobInvoiceItem, type InsertJobInvoiceItem,
  jobTreatments
} from "@shared/schema";
import { eq, and, desc, gte, lt, isNull, isNotNull } from "drizzle-orm";

export interface IStorage {
  // Staff
  getStaff(id: number): Promise<Staff | undefined>;
  getStaffByUserId(userId: string): Promise<Staff | undefined>;
  getStaffList(): Promise<Staff[]>;
  createStaff(staffData: any): Promise<Staff>;
  updateStaff(id: number, updates: Partial<Staff>): Promise<Staff | undefined>;

  // Clients
  getClients(): Promise<Client[]>;
  getClient(id: number): Promise<Client | undefined>;
  createClient(client: any): Promise<Client>;

  // Client Contacts
  getClientContacts(clientId: number): Promise<ClientContact[]>;
  createClientContact(contact: InsertClientContact): Promise<ClientContact>;
  updateClientContact(id: number, updates: Partial<ClientContact>): Promise<ClientContact | undefined>;
  deleteClientContact(id: number): Promise<boolean>;

  // Crews
  getCrews(): Promise<(Crew & { members: (CrewMember & { staff: Staff })[] })[]>;
  createCrew(crew: InsertCrew): Promise<Crew>;
  updateCrew(id: number, updates: UpdateCrew): Promise<Crew>;
  deleteCrew(id: number): Promise<boolean>;
  addCrewMember(crewId: number, staffId: number): Promise<CrewMember>;
  removeCrewMember(crewId: number, staffId: number): Promise<boolean>;

  // Mowers
  getMowers(): Promise<Mower[]>;
  getMower(id: number): Promise<Mower | undefined>;
  createMower(mower: InsertMower): Promise<Mower>;
  updateMower(id: number, updates: Partial<Mower>): Promise<Mower | undefined>;

  // Mower Favorites
  getMowerFavorites(staffId: number): Promise<(StaffMowerFavorite & { mower: Mower })[]>;
  addMowerFavorite(staffId: number, mowerId: number): Promise<StaffMowerFavorite>;
  removeMowerFavorite(staffId: number, mowerId: number): Promise<boolean>;

  // Job Runs
  getJobRuns(date?: string): Promise<JobRun[]>;
  createJobRun(jobRun: any): Promise<JobRun>;
  updateJobRun(id: number, updates: any): Promise<JobRun>;
  deleteJobRun(id: number): Promise<boolean>;

  // Jobs
  getJobs(filters?: { assignedToId?: number; status?: string; date?: string }): Promise<(Job & { client: Client })[]>;
  getJob(id: number): Promise<(Job & { client: Client, applications: Application[], tasks: JobTask[] }) | undefined>;
  createJob(job: any): Promise<Job>;
  updateJob(id: number, updates: any): Promise<Job>;
  deleteJob(id: number): Promise<boolean>;

  // Job Tasks
  getJobTasks(jobId: number): Promise<JobTask[]>;
  createJobTask(task: InsertJobTask): Promise<JobTask>;
  updateJobTask(id: number, updates: Partial<JobTask>): Promise<JobTask | undefined>;
  deleteJobTask(id: number): Promise<boolean>;

  // Feedback
  createFeedback(feedback: any): Promise<Feedback>;
  getFeedback(): Promise<(Feedback & { job: Job })[]>;

  // Applications
  createApplication(app: any): Promise<Application>;

  // Treatment Types
  getTreatmentTypes(): Promise<TreatmentType[]>;
  createTreatmentType(type: InsertTreatmentType): Promise<TreatmentType>;
  updateTreatmentType(id: number, updates: Partial<TreatmentType>): Promise<TreatmentType | undefined>;

  // Treatment Programs (standalone treatment schedules)
  getTreatmentPrograms(): Promise<TreatmentProgram[]>;
  getTreatmentProgram(id: number): Promise<(TreatmentProgram & { schedule: (TreatmentProgramSchedule & { treatmentType: TreatmentType })[] }) | undefined>;
  createTreatmentProgram(program: InsertTreatmentProgram): Promise<TreatmentProgram>;
  updateTreatmentProgram(id: number, updates: Partial<TreatmentProgram>): Promise<TreatmentProgram | undefined>;
  createTreatmentProgramSchedule(schedule: InsertTreatmentProgramSchedule): Promise<TreatmentProgramSchedule>;
  deleteTreatmentProgramSchedule(id: number): Promise<boolean>;
  seedJobTreatmentsFromTreatmentProgram(jobId: number, treatmentProgramId: number): Promise<JobTreatment[]>;

  // Program Templates
  getProgramTemplates(): Promise<ProgramTemplate[]>;
  getProgramTemplate(id: number): Promise<(ProgramTemplate & { treatments: (ProgramTemplateTreatment & { treatmentType: TreatmentType })[] }) | undefined>;
  createProgramTemplate(template: InsertProgramTemplate): Promise<ProgramTemplate>;
  updateProgramTemplate(id: number, updates: Partial<ProgramTemplate>): Promise<ProgramTemplate | undefined>;

  // Program Template Treatments
  createProgramTemplateTreatment(treatment: InsertProgramTemplateTreatment): Promise<ProgramTemplateTreatment>;
  deleteProgramTemplateTreatment(id: number): Promise<boolean>;

  // Client Programs
  getClientPrograms(clientId: number): Promise<(ClientProgram & { template: ProgramTemplate })[]>;
  createClientProgram(program: InsertClientProgram): Promise<ClientProgram>;
  updateClientProgram(id: number, updates: Partial<ClientProgram>): Promise<ClientProgram | undefined>;

  // Client Program Treatments
  getClientProgramTreatments(clientProgramId: number): Promise<(ClientProgramTreatment & { treatmentType: TreatmentType })[]>;
  getTreatmentsForJob(jobId: number): Promise<(ClientProgramTreatment & { treatmentType: TreatmentType })[]>;
  updateClientProgramTreatment(id: number, updates: Partial<ClientProgramTreatment>): Promise<ClientProgramTreatment | undefined>;
  createClientProgramTreatment(treatment: InsertClientProgramTreatment): Promise<ClientProgramTreatment>;
  createClientProgramTreatments(treatments: InsertClientProgramTreatment[]): Promise<ClientProgramTreatment[]>;

  // Job Treatments (direct job-based treatments)
  getJobTreatments(jobId: number): Promise<(JobTreatment & { treatmentType: TreatmentType })[]>;
  createJobTreatments(treatments: InsertJobTreatment[]): Promise<JobTreatment[]>;
  updateJobTreatment(id: number, updates: Partial<JobTreatment>): Promise<JobTreatment | undefined>;
  seedJobTreatmentsFromTemplate(jobId: number, programTemplateId: number): Promise<JobTreatment[]>;
  clearJobTreatments(jobId: number): Promise<boolean>;

  // Job Time Entries
  getJobTimeEntries(jobId: number): Promise<(JobTimeEntry & { staff: Staff })[]>;
  getActiveTimeEntry(jobId: number, staffId: number): Promise<JobTimeEntry | undefined>;
  getAnyActiveTimeEntry(jobId: number): Promise<JobTimeEntry | undefined>;
  createJobTimeEntry(entry: InsertJobTimeEntry): Promise<JobTimeEntry>;
  stopJobTimeEntry(id: number): Promise<JobTimeEntry | undefined>;
  deleteJobTimeEntry(id: number): Promise<boolean>;

  // Job Photos
  getJobPhotos(jobId: number): Promise<JobPhoto[]>;
  createJobPhoto(photo: InsertJobPhoto): Promise<JobPhoto>;
  deleteJobPhoto(id: number): Promise<boolean>;

  // Job Invoice Items
  getJobInvoiceItems(jobId: number): Promise<JobInvoiceItem[]>;
  createJobInvoiceItem(item: InsertJobInvoiceItem): Promise<JobInvoiceItem>;
  updateJobInvoiceItem(id: number, updates: Partial<JobInvoiceItem>): Promise<JobInvoiceItem | undefined>;
  deleteJobInvoiceItem(id: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getStaff(id: number): Promise<Staff | undefined> {
    const [s] = await db.select().from(staff).where(eq(staff.id, id));
    return s;
  }

  async getStaffByUserId(userId: string): Promise<Staff | undefined> {
    const [s] = await db.select().from(staff).where(eq(staff.userId, userId));
    return s;
  }

  async getStaffList(): Promise<Staff[]> {
    return await db.select().from(staff);
  }

  async createStaff(staffData: any): Promise<Staff> {
    const [newStaff] = await db.insert(staff).values(staffData).returning();
    return newStaff;
  }

  async updateStaff(id: number, updates: Partial<Staff>): Promise<Staff | undefined> {
    const [updated] = await db.update(staff).set(updates).where(eq(staff.id, id)).returning();
    return updated;
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

  async getJob(id: number): Promise<(Job & { client: Client, applications: Application[], tasks: JobTask[] }) | undefined> {
    return await db.query.jobs.findFirst({
      where: eq(jobs.id, id),
      with: {
        client: true,
        applications: true,
        tasks: true,
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

  async deleteJob(id: number): Promise<boolean> {
    await db.delete(jobTasks).where(eq(jobTasks.jobId, id));
    await db.delete(feedback).where(eq(feedback.jobId, id));
    await db.delete(applications).where(eq(applications.jobId, id));
    await db.delete(jobs).where(eq(jobs.id, id));
    return true;
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

  // Client Contacts
  async getClientContacts(clientId: number): Promise<ClientContact[]> {
    return await db.select().from(clientContacts).where(eq(clientContacts.clientId, clientId));
  }

  async createClientContact(contact: InsertClientContact): Promise<ClientContact> {
    const [newContact] = await db.insert(clientContacts).values(contact).returning();
    return newContact;
  }

  async updateClientContact(id: number, updates: Partial<ClientContact>): Promise<ClientContact | undefined> {
    const [updated] = await db.update(clientContacts).set(updates).where(eq(clientContacts.id, id)).returning();
    return updated;
  }

  async deleteClientContact(id: number): Promise<boolean> {
    await db.delete(clientContacts).where(eq(clientContacts.id, id));
    return true;
  }

  // Mowers
  async getMowers(): Promise<Mower[]> {
    return await db.select().from(mowers).where(eq(mowers.isActive, true));
  }

  async getMower(id: number): Promise<Mower | undefined> {
    const [mower] = await db.select().from(mowers).where(eq(mowers.id, id));
    return mower;
  }

  async createMower(mower: InsertMower): Promise<Mower> {
    const [newMower] = await db.insert(mowers).values(mower).returning();
    return newMower;
  }

  async updateMower(id: number, updates: Partial<Mower>): Promise<Mower | undefined> {
    const [updated] = await db.update(mowers).set(updates).where(eq(mowers.id, id)).returning();
    return updated;
  }

  // Mower Favorites
  async getMowerFavorites(staffId: number): Promise<(StaffMowerFavorite & { mower: Mower })[]> {
    return await db.query.staffMowerFavorites.findMany({
      where: eq(staffMowerFavorites.staffId, staffId),
      with: { mower: true }
    });
  }

  async addMowerFavorite(staffId: number, mowerId: number): Promise<StaffMowerFavorite> {
    const [fav] = await db.insert(staffMowerFavorites).values({ staffId, mowerId }).returning();
    return fav;
  }

  async removeMowerFavorite(staffId: number, mowerId: number): Promise<boolean> {
    await db.delete(staffMowerFavorites).where(
      and(eq(staffMowerFavorites.staffId, staffId), eq(staffMowerFavorites.mowerId, mowerId))
    );
    return true;
  }

  // Job Tasks
  async getJobTasks(jobId: number): Promise<JobTask[]> {
    return await db.select().from(jobTasks).where(eq(jobTasks.jobId, jobId));
  }

  async createJobTask(task: InsertJobTask): Promise<JobTask> {
    const [newTask] = await db.insert(jobTasks).values(task).returning();
    return newTask;
  }

  async updateJobTask(id: number, updates: Partial<JobTask>): Promise<JobTask | undefined> {
    const [updated] = await db.update(jobTasks).set(updates).where(eq(jobTasks.id, id)).returning();
    return updated;
  }

  async deleteJobTask(id: number): Promise<boolean> {
    await db.delete(jobTasks).where(eq(jobTasks.id, id));
    return true;
  }

  // Treatment Types
  async getTreatmentTypes(): Promise<TreatmentType[]> {
    return await db.select().from(treatmentTypes).where(eq(treatmentTypes.isActive, true));
  }

  async createTreatmentType(type: InsertTreatmentType): Promise<TreatmentType> {
    const [newType] = await db.insert(treatmentTypes).values(type).returning();
    return newType;
  }

  async updateTreatmentType(id: number, updates: Partial<TreatmentType>): Promise<TreatmentType | undefined> {
    const [updated] = await db.update(treatmentTypes).set(updates).where(eq(treatmentTypes.id, id)).returning();
    return updated;
  }

  // Treatment Programs
  async getTreatmentPrograms(): Promise<TreatmentProgram[]> {
    return await db.select().from(treatmentPrograms).where(eq(treatmentPrograms.isActive, true));
  }

  async getTreatmentProgram(id: number): Promise<(TreatmentProgram & { schedule: (TreatmentProgramSchedule & { treatmentType: TreatmentType })[] }) | undefined> {
    return await db.query.treatmentPrograms.findFirst({
      where: eq(treatmentPrograms.id, id),
      with: {
        schedule: {
          with: { treatmentType: true }
        }
      }
    });
  }

  async createTreatmentProgram(program: InsertTreatmentProgram): Promise<TreatmentProgram> {
    const [newProgram] = await db.insert(treatmentPrograms).values(program).returning();
    return newProgram;
  }

  async updateTreatmentProgram(id: number, updates: Partial<TreatmentProgram>): Promise<TreatmentProgram | undefined> {
    const [updated] = await db.update(treatmentPrograms).set(updates).where(eq(treatmentPrograms.id, id)).returning();
    return updated;
  }

  async createTreatmentProgramSchedule(schedule: InsertTreatmentProgramSchedule): Promise<TreatmentProgramSchedule> {
    const [newSchedule] = await db.insert(treatmentProgramSchedule).values(schedule).returning();
    return newSchedule;
  }

  async deleteTreatmentProgramSchedule(id: number): Promise<boolean> {
    await db.delete(treatmentProgramSchedule).where(eq(treatmentProgramSchedule.id, id));
    return true;
  }

  async seedJobTreatmentsFromTreatmentProgram(jobId: number, treatmentProgramId: number): Promise<JobTreatment[]> {
    const job = await db.query.jobs.findFirst({
      where: eq(jobs.id, jobId)
    });
    if (!job) return [];

    const jobMonth = new Date(job.scheduledDate).getMonth() + 1;

    const schedules = await db.query.treatmentProgramSchedule.findMany({
      where: and(
        eq(treatmentProgramSchedule.treatmentProgramId, treatmentProgramId),
        eq(treatmentProgramSchedule.month, jobMonth)
      ),
      with: { treatmentType: true }
    });

    if (schedules.length === 0) return [];

    const newTreatments: InsertJobTreatment[] = schedules.map(s => ({
      jobId,
      treatmentTypeId: s.treatmentTypeId,
      status: "pending",
      quantity: s.quantity || 1,
      instructions: s.instructions
    }));

    return await this.createJobTreatments(newTreatments);
  }

  // Program Templates
  async getProgramTemplates(): Promise<ProgramTemplate[]> {
    return await db.select().from(programTemplates).where(eq(programTemplates.isActive, true));
  }

  async getProgramTemplate(id: number): Promise<(ProgramTemplate & { treatments: (ProgramTemplateTreatment & { treatmentType: TreatmentType })[] }) | undefined> {
    return await db.query.programTemplates.findFirst({
      where: eq(programTemplates.id, id),
      with: {
        treatments: {
          with: { treatmentType: true }
        }
      }
    });
  }

  async createProgramTemplate(template: InsertProgramTemplate): Promise<ProgramTemplate> {
    const [newTemplate] = await db.insert(programTemplates).values(template).returning();
    return newTemplate;
  }

  async updateProgramTemplate(id: number, updates: Partial<ProgramTemplate>): Promise<ProgramTemplate | undefined> {
    const [updated] = await db.update(programTemplates).set(updates).where(eq(programTemplates.id, id)).returning();
    return updated;
  }

  // Program Template Treatments
  async createProgramTemplateTreatment(treatment: InsertProgramTemplateTreatment): Promise<ProgramTemplateTreatment> {
    const [newTreatment] = await db.insert(programTemplateTreatments).values(treatment).returning();
    return newTreatment;
  }

  async deleteProgramTemplateTreatment(id: number): Promise<boolean> {
    await db.delete(programTemplateTreatments).where(eq(programTemplateTreatments.id, id));
    return true;
  }

  // Client Programs
  async getClientPrograms(clientId: number): Promise<(ClientProgram & { template: ProgramTemplate })[]> {
    return await db.query.clientPrograms.findMany({
      where: eq(clientPrograms.clientId, clientId),
      with: { template: true }
    });
  }

  async createClientProgram(program: InsertClientProgram): Promise<ClientProgram> {
    const [newProgram] = await db.insert(clientPrograms).values(program).returning();
    return newProgram;
  }

  async updateClientProgram(id: number, updates: Partial<ClientProgram>): Promise<ClientProgram | undefined> {
    const [updated] = await db.update(clientPrograms).set(updates).where(eq(clientPrograms.id, id)).returning();
    return updated;
  }

  // Client Program Treatments
  async getClientProgramTreatments(clientProgramId: number): Promise<(ClientProgramTreatment & { treatmentType: TreatmentType })[]> {
    return await db.query.clientProgramTreatments.findMany({
      where: eq(clientProgramTreatments.clientProgramId, clientProgramId),
      with: { treatmentType: true }
    });
  }

  async getTreatmentsForJob(jobId: number): Promise<(ClientProgramTreatment & { treatmentType: TreatmentType })[]> {
    const job = await db.query.jobs.findFirst({
      where: eq(jobs.id, jobId)
    });
    if (!job) return [];

    const jobMonth = new Date(job.scheduledDate).getMonth() + 1;
    const jobYear = new Date(job.scheduledDate).getFullYear();

    const activeClientPrograms = await db.query.clientPrograms.findMany({
      where: and(
        eq(clientPrograms.clientId, job.clientId),
        eq(clientPrograms.status, "active")
      )
    });

    if (activeClientPrograms.length === 0) return [];

    const allTreatments: (ClientProgramTreatment & { treatmentType: TreatmentType })[] = [];
    for (const program of activeClientPrograms) {
      const treatments = await db.query.clientProgramTreatments.findMany({
        where: and(
          eq(clientProgramTreatments.clientProgramId, program.id),
          eq(clientProgramTreatments.targetMonth, jobMonth),
          eq(clientProgramTreatments.targetYear, jobYear)
        ),
        with: { treatmentType: true }
      });
      allTreatments.push(...treatments);
    }

    return allTreatments;
  }

  async updateClientProgramTreatment(id: number, updates: Partial<ClientProgramTreatment>): Promise<ClientProgramTreatment | undefined> {
    const [updated] = await db.update(clientProgramTreatments).set(updates).where(eq(clientProgramTreatments.id, id)).returning();
    return updated;
  }

  async createClientProgramTreatment(treatment: InsertClientProgramTreatment): Promise<ClientProgramTreatment> {
    const [newTreatment] = await db.insert(clientProgramTreatments).values(treatment).returning();
    return newTreatment;
  }

  async createClientProgramTreatments(treatments: InsertClientProgramTreatment[]): Promise<ClientProgramTreatment[]> {
    if (treatments.length === 0) return [];
    return await db.insert(clientProgramTreatments).values(treatments).returning();
  }

  // Job Treatments (direct job-based treatments)
  async getJobTreatments(jobId: number): Promise<(JobTreatment & { treatmentType: TreatmentType })[]> {
    return await db.query.jobTreatments.findMany({
      where: eq(jobTreatments.jobId, jobId),
      with: { treatmentType: true }
    });
  }

  async createJobTreatments(treatments: InsertJobTreatment[]): Promise<JobTreatment[]> {
    if (treatments.length === 0) return [];
    return await db.insert(jobTreatments).values(treatments).returning();
  }

  async updateJobTreatment(id: number, updates: Partial<JobTreatment>): Promise<JobTreatment | undefined> {
    const [updated] = await db.update(jobTreatments).set(updates).where(eq(jobTreatments.id, id)).returning();
    return updated;
  }

  async seedJobTreatmentsFromTemplate(jobId: number, programTemplateId: number): Promise<JobTreatment[]> {
    // Get the job to determine the month
    const job = await db.query.jobs.findFirst({
      where: eq(jobs.id, jobId)
    });
    if (!job) return [];

    const jobMonth = new Date(job.scheduledDate).getMonth() + 1;

    // Clear any existing template-seeded treatments first (idempotent operation)
    // Only delete treatments that came from a template (have programTemplateTreatmentId)
    await db.delete(jobTreatments).where(
      and(
        eq(jobTreatments.jobId, jobId),
        isNotNull(jobTreatments.programTemplateTreatmentId)
      )
    );

    // Get template treatments for this month
    const templateTreatments = await db.query.programTemplateTreatments.findMany({
      where: and(
        eq(programTemplateTreatments.programTemplateId, programTemplateId),
        eq(programTemplateTreatments.month, jobMonth)
      ),
      with: { treatmentType: true }
    });

    if (templateTreatments.length === 0) return [];

    // Create job treatments from template
    const newTreatments: InsertJobTreatment[] = templateTreatments.map(t => ({
      jobId,
      treatmentTypeId: t.treatmentTypeId,
      programTemplateTreatmentId: t.id,
      status: "pending",
      quantity: t.quantity || 1,
      instructions: t.instructions
    }));

    return await this.createJobTreatments(newTreatments);
  }

  async clearJobTreatments(jobId: number): Promise<boolean> {
    // Only clear template-seeded treatments (preserve manual entries)
    await db.delete(jobTreatments).where(
      and(
        eq(jobTreatments.jobId, jobId),
        isNotNull(jobTreatments.programTemplateTreatmentId)
      )
    );
    return true;
  }

  // Job Time Entries
  async getJobTimeEntries(jobId: number): Promise<(JobTimeEntry & { staff: Staff })[]> {
    return await db.query.jobTimeEntries.findMany({
      where: eq(jobTimeEntries.jobId, jobId),
      with: { staff: true },
      orderBy: desc(jobTimeEntries.startTime)
    });
  }

  async getActiveTimeEntry(jobId: number, staffId: number): Promise<JobTimeEntry | undefined> {
    const [entry] = await db.select().from(jobTimeEntries)
      .where(and(
        eq(jobTimeEntries.jobId, jobId),
        eq(jobTimeEntries.staffId, staffId),
        isNull(jobTimeEntries.endTime)
      ));
    return entry;
  }

  async getAnyActiveTimeEntry(jobId: number): Promise<JobTimeEntry | undefined> {
    const [entry] = await db.select().from(jobTimeEntries)
      .where(and(
        eq(jobTimeEntries.jobId, jobId),
        isNull(jobTimeEntries.endTime)
      ));
    return entry;
  }

  async createJobTimeEntry(entry: InsertJobTimeEntry): Promise<JobTimeEntry> {
    const [newEntry] = await db.insert(jobTimeEntries).values(entry).returning();
    return newEntry;
  }

  async stopJobTimeEntry(id: number): Promise<JobTimeEntry | undefined> {
    const [entry] = await db.select().from(jobTimeEntries).where(eq(jobTimeEntries.id, id));
    if (!entry || entry.endTime) return entry;
    
    const endTime = new Date();
    const durationMinutes = Math.round((endTime.getTime() - new Date(entry.startTime).getTime()) / 60000);
    
    const [updated] = await db.update(jobTimeEntries)
      .set({ endTime, durationMinutes })
      .where(eq(jobTimeEntries.id, id))
      .returning();
    return updated;
  }

  async deleteJobTimeEntry(id: number): Promise<boolean> {
    await db.delete(jobTimeEntries).where(eq(jobTimeEntries.id, id));
    return true;
  }

  // Job Photos
  async getJobPhotos(jobId: number): Promise<JobPhoto[]> {
    return await db.select().from(jobPhotos).where(eq(jobPhotos.jobId, jobId)).orderBy(desc(jobPhotos.createdAt));
  }

  async createJobPhoto(photo: InsertJobPhoto): Promise<JobPhoto> {
    const [newPhoto] = await db.insert(jobPhotos).values(photo).returning();
    return newPhoto;
  }

  async deleteJobPhoto(id: number): Promise<boolean> {
    await db.delete(jobPhotos).where(eq(jobPhotos.id, id));
    return true;
  }

  // Job Invoice Items
  async getJobInvoiceItems(jobId: number): Promise<JobInvoiceItem[]> {
    return await db.select().from(jobInvoiceItems).where(eq(jobInvoiceItems.jobId, jobId)).orderBy(jobInvoiceItems.sortOrder);
  }

  async createJobInvoiceItem(item: InsertJobInvoiceItem): Promise<JobInvoiceItem> {
    const [newItem] = await db.insert(jobInvoiceItems).values(item).returning();
    return newItem;
  }

  async updateJobInvoiceItem(id: number, updates: Partial<JobInvoiceItem>): Promise<JobInvoiceItem | undefined> {
    const [updated] = await db.update(jobInvoiceItems).set(updates).where(eq(jobInvoiceItems.id, id)).returning();
    return updated;
  }

  async deleteJobInvoiceItem(id: number): Promise<boolean> {
    await db.delete(jobInvoiceItems).where(eq(jobInvoiceItems.id, id));
    return true;
  }
}

export const storage = new DatabaseStorage();
