import type { Firestore } from "firebase-admin/firestore";
import { getDb } from "./index";

export const DEPARTMENTS = ["Development", "BPO", "Documentation", "Marketing"] as const;
export type Department = (typeof DEPARTMENTS)[number];
export type Role = "DM" | "GM" | "LEAD" | "EMPLOYEE";

export type ERPUser = {
  id: string;
  username: string;
  name: string;
  role: Role;
  title: string;
  primaryDepartment: Department | null;
  initials: string;
  departments: Department[];
};

export type ERPTask = {
  id: number;
  title: string;
  description: string;
  department: Department;
  assigneeId: string;
  assigneeName: string;
  assigneeInitials: string;
  assignedById: string;
  assignedByName: string;
  dueAt: string;
  priority: "Low" | "Medium" | "High" | "Urgent";
  status: "To do" | "In progress" | "Review" | "Blocked" | "Completed";
  progress: number;
  latestUpdate: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};

type SeedUser = Omit<ERPUser, "departments"> & {
  salt: string;
  hash: string;
  departments: Array<[Department, number]>;
};

// The runtime previously enforced a 100,000-iteration PBKDF2 ceiling
// (Cloudflare Workers). Firebase/Node has no such limit, but we keep the
// same iteration count so every existing seed hash keeps verifying.
const PASSWORD_HASH_ITERATIONS = 100_000;

// These are the original 120,000-iteration seed hashes. During initialization,
// only accounts that still have an untouched original hash are migrated. A user
// who already changed their password is therefore never reset by this repair.
const LEGACY_SEED_HASHES: Record<string, string> = {
  "GM-DM-001": "037bcbcc8a41425c36ace986e4e7a17d275731f546fa4a72c1ae1ef05b3e39fd",
  "GM-GM-001": "85acdf8ecb1c20a488a42f292fe5b1eae0bd3d4a8d9e00e9d65d576f3299f06f",
  "GM-DEV-001": "52a8113ecaa85224a20592ea161f5a3d08a89cb659139b35b3d55d8ea3ab0f5b",
  "GM-DEV-002": "e7d2cad310615ed56db4fe2035b4e4d5a6627845477cc305e6a3461eaf5cda37",
  "GM-DEV-003": "8099b7a80dec9cb6ffc678868aa598f45e9911183e59d415376159aa459f48d2",
  "GM-DEV-004": "d1addba5f022871a3e5b0be0be8fc20dad13be0cef1b5aa9653278cd4c141df5",
  "GM-DEV-005": "64cfd4e6ea197f8be8a34585102e99b102613af53b18a70be71bd4379f6ebc96",
  "GM-DEV-006": "ac43f42b14a8761216557b5d9222850d70b87704150415f7d53b678d7b5bb502",
  "GM-BPO-001": "d8feb600f790c4f0d3331866cf647f901f83389dbad5721dfcb6bf2bc19e247e",
  "GM-BPO-002": "299a52e6314af3849e1cb6ee6ab509e3e5d3a6806382b0931e81c5c022bde75b",
  "GM-BPO-003": "c6042b3c9c896a2cce90f4d9539d528dff0433ec5378b35aab4a68753949c618",
  "GM-BPO-004": "29f1c48cff1db76c41d725c73963a647e6c496e3761f6d19098c96615ba40196",
  "GM-DOC-001": "7f052a30dc1b72419ac78e04041f69841e2a4e5833898f9554694714bc5afd6b",
  "GM-MKT-001": "8a685e2df173d60ca504edce5a9149ee6b0608158a8c91d4ee42293340657b41",
  "GM-MKT-002": "d0c83f5ed114f9accca35c93b0ac6fc75b25dd6d06f6bab28bda993dfcaf5303",
  "GM-MKT-003": "ec04c2fd9b6b2a5522fe728129ab3ef8b78026fee6960f1543df9433fd7e16e3",
};

const ROSTER: SeedUser[] = [
  { id: "GM-DM-001", username: "dm.bupathiraj", name: "Bupathiraj", role: "DM", title: "DM", primaryDepartment: null, initials: "BR", salt: "7533125c65cde53960adee04d12cc026", hash: "3eec5775b97db1d88c9b7c161497bb33345a14390b1ddc585810078e8e7ea5ff", departments: [] },
  { id: "GM-GM-001", username: "gm.aathish", name: "Aathish", role: "GM", title: "General Manager", primaryDepartment: null, initials: "AA", salt: "4d99182739e3648ede291b70cd6b7cf8", hash: "85582bdafb0c7c2320a24a30715905ba4f8f255bcd0ffbd46480bad8c9b9aefe", departments: [] },
  { id: "GM-DEV-001", username: "lead.development", name: "Muthuselvam", role: "LEAD", title: "Development Lead", primaryDepartment: "Development", initials: "MS", salt: "068543b4e65c38aa835d7346ab04e1dd", hash: "6f572a26ffa86ad2c6c41912749a184a4ca74327a15201651e43c3e493a05e7d", departments: [["Development", 1]] },
  { id: "GM-DEV-002", username: "dev.kishore", name: "Kishore", role: "EMPLOYEE", title: "Development Team", primaryDepartment: "Development", initials: "KI", salt: "a869b0a43cd4e4c241ad871dd1b5241c", hash: "b9dc3978a3fad8e32563792b081ea8d54f357f77a7f9d5eb8127493fb1e16038", departments: [["Development", 1]] },
  { id: "GM-DEV-003", username: "dev.mahendaran", name: "Mahendaran", role: "EMPLOYEE", title: "Development Team", primaryDepartment: "Development", initials: "MA", salt: "c1a0d3ff721b378c91859c89f95c63bd", hash: "79c0e737379b0cc687d0025b90e3c5020f25d53f9e15da4da2df4f09267236fb", departments: [["Development", 1]] },
  { id: "GM-DEV-004", username: "dev.rahul", name: "Rahul", role: "EMPLOYEE", title: "Development Team", primaryDepartment: "Development", initials: "RA", salt: "78109b2fb880891deeb09405706048f6", hash: "ba5e7c46e0f23700ea4a8cc0652d30037d7946d1473f2036e69ed4784d369e2a", departments: [["Development", 1]] },
  { id: "GM-DEV-005", username: "dev.ram", name: "Ram", role: "EMPLOYEE", title: "Development Team", primaryDepartment: "Development", initials: "RM", salt: "e1979f8e0a157784c8d7596e41dc795f", hash: "0b4fa570114117771d9770c893f139a08109445eed40f64fc30a66f3b08a6e81", departments: [["Development", 1]] },
  { id: "GM-DEV-006", username: "dev.sahil", name: "Sahil", role: "EMPLOYEE", title: "Development Team", primaryDepartment: "Development", initials: "SA", salt: "36f84610e754884ec98671b4bb7f81d7", hash: "69d1c01eb2e9df650140fe80f3f7cc59642e4fec18212f2cae4905ddb5bcdf1b", departments: [["Development", 1]] },
  { id: "GM-BPO-001", username: "lead.bpo", name: "Lakshmi", role: "LEAD", title: "BPO Lead", primaryDepartment: "BPO", initials: "LA", salt: "1757831cbd83a5076c72a8478eb8e09c", hash: "e2f73acaf468f4f8bfe9696364b7d6f381356e03a5db28a71905fb3180c7021d", departments: [["BPO", 1]] },
  { id: "GM-BPO-002", username: "emp.archana", name: "Archana", role: "EMPLOYEE", title: "BPO & Documentation Executive", primaryDepartment: "BPO", initials: "AR", salt: "df8bb2ec2562824d1108ebb965ea79f2", hash: "9064f412c20278814641355a6a8cd5d568feead4481ea6e165a3ac97cc381e5d", departments: [["BPO", 1], ["Documentation", 0]] },
  { id: "GM-BPO-003", username: "bpo.natchathra", name: "Natchathra", role: "EMPLOYEE", title: "BPO Team", primaryDepartment: "BPO", initials: "NA", salt: "f56210725c2cc6582d3bf0f0a4a528ff", hash: "f9a2af0d6bd7cbac0c5a33dfd58decb0d8541daf7f8e8f7d2e3e6c5226797ab4", departments: [["BPO", 1]] },
  { id: "GM-BPO-004", username: "bpo.sudeshika", name: "Sudeshika", role: "EMPLOYEE", title: "BPO Team", primaryDepartment: "BPO", initials: "SU", salt: "6a035b94bd24a93f9be0c324b04acb6f", hash: "9e0e1cbbbbef1af3828c62b9f9807b59a65c6389ca97122ff6129b10d6ef3c31", departments: [["BPO", 1]] },
  { id: "GM-DOC-001", username: "lead.documentation", name: "Dhaya", role: "LEAD", title: "Documentation Lead", primaryDepartment: "Documentation", initials: "DH", salt: "4a56ff829b7e90885915c33b2f0843e1", hash: "db14b248abc30c1ccfeb4d11f6446b37fb895c4e7cf1369a90bf60979af5f4db", departments: [["Documentation", 1]] },
  { id: "GM-MKT-001", username: "lead.marketing", name: "Nagalakshmi", role: "LEAD", title: "Marketing Lead", primaryDepartment: "Marketing", initials: "NL", salt: "fd0a1b581651f4e9743436c1027bb84b", hash: "69f5785216ebdbcb243b64120c39df8ef316f0e347baa97ce8dac3160cb70ede", departments: [["Marketing", 1]] },
  { id: "GM-MKT-002", username: "marketing.srimathi", name: "Srimathi", role: "EMPLOYEE", title: "Marketing Team", primaryDepartment: "Marketing", initials: "SR", salt: "30751405e65dc98b9c3d95efea45cf50", hash: "420c38d04c19982cd81e568fe67c1b67c7d953411845138ad0eade302833e74d", departments: [["Marketing", 1]] },
  { id: "GM-MKT-003", username: "marketing.sandhiya", name: "Sandhiya", role: "EMPLOYEE", title: "Marketing Team", primaryDepartment: "Marketing", initials: "SN", salt: "1a67fc7da02a568d2003379dded2110e", hash: "9a1833cba74aab20c5a33dbbe3fc8e770920bb5f6c5fe4820d6cc933abc99bbd", departments: [["Marketing", 1]] },
];

// --- Firestore collections -------------------------------------------------
// gm_users          doc id = user id, holds departments[] directly (no join table)
// gm_tasks          doc id = numeric id (string), minted from a gm_meta counter
// gm_task_updates   doc id = auto id
// gm_attendance     doc id = numeric id (string), minted from a gm_meta counter
// gm_sessions       doc id = token hash
// gm_meta           small key/value + counters
// -----------------------------------------------------------------------------

async function database(): Promise<Firestore> {
  return getDb();
}

function sortedDepartments(departments: Array<[Department, number]>): Department[] {
  return [...departments]
    .sort((a, b) => (b[1] - a[1]) || a[0].localeCompare(b[0]))
    .map(([department]) => department);
}

async function nextId(counterName: "tasks" | "attendance"): Promise<number> {
  const db = await database();
  const ref = db.collection("gm_meta").doc(`counter_${counterName}`);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const current = snap.exists ? Number(snap.data()!.value ?? 0) : 0;
    const next = current + 1;
    tx.set(ref, { value: next });
    return next;
  });
}

let initialization: Promise<void> | null = null;

export async function ensureErpDatabase() {
  if (!initialization) {
    initialization = initializeErpDatabase().catch((error) => {
      initialization = null;
      throw error;
    });
  }
  return initialization;
}

async function initializeErpDatabase() {
  const db = await database();

  const metaRef = db.collection("gm_meta").doc("fresh_goa_moments_erp_v2");
  const metaSnap = await metaRef.get();
  if (!metaSnap.exists) {
    for (const collectionName of ["gm_tasks", "gm_attendance"] as const) {
      const snap = await db.collection(collectionName).get();
      const batch = db.batch();
      snap.docs.forEach((doc) => batch.delete(doc.ref));
      if (!snap.empty) await batch.commit();
    }
    await metaRef.set({ value: new Date().toISOString() });
  }

  for (const user of ROSTER) {
    const userRef = db.collection("gm_users").doc(user.id);
    const userSnap = await userRef.get();
    const departments = sortedDepartments(user.departments);
    const baseFields = {
      username: user.username,
      usernameLower: user.username.toLowerCase(),
      name: user.name,
      role: user.role,
      title: user.title,
      primaryDepartment: user.primaryDepartment,
      initials: user.initials,
      active: true,
      departments,
    };

    if (!userSnap.exists) {
      await userRef.set({
        ...baseFields,
        passwordSalt: user.salt,
        passwordHash: user.hash,
        createdAt: new Date().toISOString(),
      });
    } else {
      await userRef.set(baseFields, { merge: true });
      const existing = userSnap.data() as Record<string, unknown>;
      const legacyHash = LEGACY_SEED_HASHES[user.id];
      if (legacyHash && existing.passwordHash === legacyHash) {
        await userRef.set({ passwordSalt: user.salt, passwordHash: user.hash }, { merge: true });
      }
    }
  }
}

type UserDoc = {
  username: string;
  usernameLower: string;
  name: string;
  role: Role;
  title: string;
  primaryDepartment: Department | null;
  initials: string;
  active: boolean;
  departments: Department[];
  passwordSalt: string;
  passwordHash: string;
  createdAt: string;
};

function rowToUser(id: string, row: UserDoc): ERPUser {
  return {
    id,
    username: row.username,
    name: row.name,
    role: row.role,
    title: row.title,
    primaryDepartment: row.primaryDepartment ?? null,
    initials: row.initials,
    departments: row.departments ?? [],
  };
}

export async function findUserByUsername(username: string) {
  await ensureErpDatabase();
  const db = await database();
  const snap = await db.collection("gm_users")
    .where("usernameLower", "==", username.trim().toLowerCase())
    .where("active", "==", true)
    .limit(1)
    .get();
  if (snap.empty) return null;
  const doc = snap.docs[0]!;
  const data = doc.data() as UserDoc;
  return {
    id: doc.id,
    username: data.username,
    name: data.name,
    role: data.role,
    title: data.title,
    primary_department: data.primaryDepartment ?? null,
    initials: data.initials,
    password_salt: data.passwordSalt,
    password_hash: data.passwordHash,
    active: data.active,
    created_at: data.createdAt,
  } as Record<string, unknown>;
}

export async function getUserById(id: string): Promise<ERPUser | null> {
  await ensureErpDatabase();
  const db = await database();
  const doc = await db.collection("gm_users").doc(id).get();
  if (!doc.exists) return null;
  const data = doc.data() as UserDoc;
  if (!data.active) return null;
  return rowToUser(doc.id, data);
}

const ROLE_RANK: Record<Role, number> = { DM: 1, GM: 2, LEAD: 3, EMPLOYEE: 4 };

export async function listUsers(): Promise<ERPUser[]> {
  await ensureErpDatabase();
  const db = await database();
  const snap = await db.collection("gm_users").where("active", "==", true).get();
  const users = snap.docs.map((doc) => rowToUser(doc.id, doc.data() as UserDoc));
  return users.sort((a, b) => (ROLE_RANK[a.role] - ROLE_RANK[b.role]) || a.name.localeCompare(b.name));
}

// Fetches every user (including inactive) as an id -> name lookup, used to
// attach assignee/assigned-by/attendee names without a SQL JOIN.
async function allUsersById(): Promise<Map<string, { name: string; initials: string; title: string; primaryDepartment: Department | null }>> {
  const db = await database();
  const snap = await db.collection("gm_users").get();
  const map = new Map<string, { name: string; initials: string; title: string; primaryDepartment: Department | null }>();
  snap.docs.forEach((doc) => {
    const data = doc.data() as UserDoc;
    map.set(doc.id, { name: data.name, initials: data.initials, title: data.title, primaryDepartment: data.primaryDepartment ?? null });
  });
  return map;
}

export function isLeadership(user: ERPUser) {
  return user.role === "DM" || user.role === "GM";
}

export function canManageDepartment(user: ERPUser, department: Department) {
  return isLeadership(user) || (user.role === "LEAD" && user.departments.includes(department));
}

const TASK_STATUS_RANK: Record<ERPTask["status"], number> = {
  Blocked: 1,
  Review: 2,
  "In progress": 3,
  "To do": 4,
  Completed: 5,
};

type TaskDoc = {
  title: string;
  description: string;
  department: Department;
  assigneeId: string;
  assignedById: string;
  dueAt: string;
  priority: ERPTask["priority"];
  status: ERPTask["status"];
  progress: number;
  latestUpdate: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};

export async function listTasksFor(user: ERPUser): Promise<ERPTask[]> {
  await ensureErpDatabase();
  const db = await database();
  const [snap, users] = await Promise.all([db.collection("gm_tasks").get(), allUsersById()]);

  let tasks = snap.docs.map((doc) => ({ id: Number(doc.id), ...(doc.data() as TaskDoc) }));

  if (user.role === "LEAD") {
    tasks = tasks.filter((task) => user.departments.includes(task.department));
  } else if (user.role === "EMPLOYEE") {
    tasks = tasks.filter((task) => task.assigneeId === user.id);
  }

  return tasks
    .map((task) => {
      const assignee = users.get(task.assigneeId);
      const assignedBy = users.get(task.assignedById);
      return {
        id: task.id,
        title: task.title,
        description: task.description,
        department: task.department,
        assigneeId: task.assigneeId,
        assigneeName: assignee?.name ?? "Unknown",
        assigneeInitials: assignee?.initials ?? "??",
        assignedById: task.assignedById,
        assignedByName: assignedBy?.name ?? "Unknown",
        dueAt: task.dueAt,
        priority: task.priority,
        status: task.status,
        progress: task.progress,
        latestUpdate: task.latestUpdate,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        completedAt: task.completedAt,
      } satisfies ERPTask;
    })
    .sort((a, b) => (TASK_STATUS_RANK[a.status] - TASK_STATUS_RANK[b.status]) || a.dueAt.localeCompare(b.dueAt));
}

export async function listAllTasks(): Promise<ERPTask[]> {
  const leadership = { id: "system", role: "DM", departments: [] } as unknown as ERPUser;
  return listTasksFor(leadership);
}

export async function createTask(actor: ERPUser, input: {
  title: string; description: string; department: Department; assigneeId: string; dueAt: string; priority: ERPTask["priority"];
}) {
  if (!canManageDepartment(actor, input.department)) throw new Error("You cannot assign work outside your department");
  const assignee = await getUserById(input.assigneeId);
  if (!assignee || !assignee.departments.includes(input.department)) throw new Error("The selected employee is not part of this department");

  const db = await database();
  const id = await nextId("tasks");
  const now = new Date().toISOString();
  const taskDoc: TaskDoc = {
    title: input.title.trim(),
    description: input.description.trim(),
    department: input.department,
    assigneeId: input.assigneeId,
    assignedById: actor.id,
    dueAt: input.dueAt,
    priority: input.priority,
    status: "To do",
    progress: 0,
    latestUpdate: "",
    createdAt: now,
    updatedAt: now,
    completedAt: null,
  };
  await db.collection("gm_tasks").doc(String(id)).set(taskDoc);
  await db.collection("gm_task_updates").add({
    taskId: id, userId: actor.id, status: "To do", progress: 0, note: "Task assigned", createdAt: now,
  });
  return id;
}

export async function updateTask(actor: ERPUser, input: { id: number; status: ERPTask["status"]; progress: number; note: string }) {
  const db = await database();
  const taskRef = db.collection("gm_tasks").doc(String(input.id));
  const taskSnap = await taskRef.get();
  if (!taskSnap.exists) throw new Error("Task not found");
  const task = taskSnap.data() as TaskDoc;
  const allowed = isLeadership(actor) || canManageDepartment(actor, task.department) || task.assigneeId === actor.id;
  if (!allowed) throw new Error("You cannot update this task");

  const progress = Math.max(0, Math.min(100, Math.round(input.progress)));
  const status = input.status === "Completed" ? "Completed" : input.status;
  const finalProgress = status === "Completed" ? 100 : progress;
  const now = new Date().toISOString();
  const completedAt = status === "Completed" ? now : null;
  const note = input.note.trim();

  await taskRef.set({ status, progress: finalProgress, latestUpdate: note, updatedAt: now, completedAt }, { merge: true });
  await db.collection("gm_task_updates").add({
    taskId: input.id, userId: actor.id, status, progress: finalProgress, note, createdAt: now,
  });
}

export function indiaDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

// Company shift window, in IST. Shared by clock-in/out so "late" and "early
// exit" are always computed the same way, server-side, from server time only.
export const SHIFT_START_MINUTES = 9 * 60 + 30; // 09:30 IST
export const SHIFT_END_MINUTES = 18 * 60 + 30; // 18:30 IST
export const LATE_GRACE_MINUTES = 10;
export const EARLY_EXIT_GRACE_MINUTES = 10;

function indiaMinutesOfDay(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return Number(value.hour) * 60 + Number(value.minute);
}

function isLateClockIn(date: Date) {
  return indiaMinutesOfDay(date) > SHIFT_START_MINUTES + LATE_GRACE_MINUTES;
}

function isEarlyClockOut(date: Date) {
  return indiaMinutesOfDay(date) < SHIFT_END_MINUTES - EARLY_EXIT_GRACE_MINUTES;
}

type AttendanceDoc = {
  userId: string;
  workDate: string;
  clockIn: string;
  clockOut: string | null;
  isLate: boolean;
  isEarlyExit: boolean;
  originalClockIn: string | null;
  originalClockOut: string | null;
  correctedById: string | null;
  correctionReason: string | null;
  correctedAt: string | null;
  createdAt: string;
};

export async function attendanceAction(user: ERPUser, action: "clock_in" | "clock_out") {
  await ensureErpDatabase();
  const db = await database();
  const workDate = indiaDateKey();
  const existingSnap = await db.collection("gm_attendance")
    .where("userId", "==", user.id).where("workDate", "==", workDate).limit(1).get();
  const current = existingSnap.empty ? null : { ref: existingSnap.docs[0]!.ref, data: existingSnap.docs[0]!.data() as AttendanceDoc };

  if (action === "clock_in") {
    if (current?.data.clockIn) throw new Error(current.data.clockOut ? "Attendance is already completed for today" : "You are already clocked in");
    const now = new Date();
    const id = await nextId("attendance");
    const doc: AttendanceDoc = {
      userId: user.id, workDate, clockIn: now.toISOString(), clockOut: null,
      isLate: isLateClockIn(now), isEarlyExit: false,
      originalClockIn: null, originalClockOut: null, correctedById: null, correctionReason: null, correctedAt: null,
      createdAt: now.toISOString(),
    };
    await db.collection("gm_attendance").doc(String(id)).set(doc);
  } else {
    if (!current?.data.clockIn) throw new Error("Clock in before clocking out");
    if (current.data.clockOut) throw new Error("You already clocked out today");
    const now = new Date();
    await current.ref.set({ clockOut: now.toISOString(), isEarlyExit: isEarlyClockOut(now) }, { merge: true });
  }
}

export type AttendanceRow = {
  id: number; userId: string; name: string; initials: string; title: string; department: Department | null;
  workDate: string; clockIn: string; clockOut: string | null;
  isLate: boolean; isEarlyExit: boolean;
  corrected: boolean; correctionReason: string | null; correctedByName: string | null; correctedAt: string | null;
};

function rowToAttendance(
  id: string,
  row: AttendanceDoc,
  users: Map<string, { name: string; initials: string; title: string; primaryDepartment: Department | null }>,
): AttendanceRow {
  const person = users.get(row.userId);
  const correctedBy = row.correctedById ? users.get(row.correctedById) : undefined;
  return {
    id: Number(id),
    userId: row.userId,
    name: person?.name ?? "Unknown",
    initials: person?.initials ?? "??",
    title: person?.title ?? "",
    department: person?.primaryDepartment ?? null,
    workDate: row.workDate,
    clockIn: row.clockIn,
    clockOut: row.clockOut,
    isLate: row.isLate,
    isEarlyExit: row.isEarlyExit,
    corrected: Boolean(row.correctedAt),
    correctionReason: row.correctionReason ?? null,
    correctedByName: correctedBy?.name ?? null,
    correctedAt: row.correctedAt ?? null,
  };
}

// Applies the same DM/GM (company) · Lead (department) · Employee (self)
// scoping the original SQL WHERE-clause helper did, but in application code.
function inScope(
  user: ERPUser,
  row: AttendanceDoc,
  users: Map<string, { name: string; initials: string; title: string; primaryDepartment: Department | null }>,
  departmentsByUser: Map<string, Department[]>,
): boolean {
  if (user.role === "LEAD") {
    const rowUserDepartments = departmentsByUser.get(row.userId) ?? [];
    return rowUserDepartments.some((department) => user.departments.includes(department));
  }
  if (user.role === "EMPLOYEE") return row.userId === user.id;
  return true;
}

async function departmentsByUserId(): Promise<Map<string, Department[]>> {
  const db = await database();
  const snap = await db.collection("gm_users").get();
  const map = new Map<string, Department[]>();
  snap.docs.forEach((doc) => {
    const data = doc.data() as UserDoc;
    map.set(doc.id, data.departments ?? []);
  });
  return map;
}

export async function listAttendanceFor(user: ERPUser, workDate = indiaDateKey()): Promise<AttendanceRow[]> {
  await ensureErpDatabase();
  const db = await database();
  const [snap, users, departmentsByUser] = await Promise.all([
    db.collection("gm_attendance").where("workDate", "==", workDate).get(),
    allUsersById(),
    departmentsByUserId(),
  ]);
  return snap.docs
    .map((doc) => ({ id: doc.id, data: doc.data() as AttendanceDoc }))
    .filter(({ data }) => inScope(user, data, users, departmentsByUser))
    .map(({ id, data }) => rowToAttendance(id, data, users))
    .sort((a, b) => a.clockIn.localeCompare(b.clockIn));
}

export async function listAllAttendance(workDate = indiaDateKey()) {
  const leadership = { id: "system", role: "DM", departments: [] } as unknown as ERPUser;
  return listAttendanceFor(leadership, workDate);
}

// Real attendance history across a date range, respecting the same
// DM/GM (company) · Lead (department) · Employee (self) scoping as today's register.
export async function listAttendanceHistory(user: ERPUser, from: string, to: string): Promise<AttendanceRow[]> {
  await ensureErpDatabase();
  const db = await database();
  const [snap, users, departmentsByUser] = await Promise.all([
    db.collection("gm_attendance").where("workDate", ">=", from).where("workDate", "<=", to).get(),
    allUsersById(),
    departmentsByUserId(),
  ]);
  return snap.docs
    .map((doc) => ({ id: doc.id, data: doc.data() as AttendanceDoc }))
    .filter(({ data }) => inScope(user, data, users, departmentsByUser))
    .map(({ id, data }) => rowToAttendance(id, data, users))
    .sort((a, b) => b.workDate.localeCompare(a.workDate) || b.clockIn.localeCompare(a.clockIn));
}

// People (within the viewer's scope) who clocked in on a past working day and
// never clocked out — the "missing clock-out" signal the spec calls for.
export async function listMissingClockOuts(user: ERPUser): Promise<AttendanceRow[]> {
  await ensureErpDatabase();
  const db = await database();
  const today = indiaDateKey();
  const [snap, users, departmentsByUser] = await Promise.all([
    db.collection("gm_attendance").where("workDate", "<", today).get(),
    allUsersById(),
    departmentsByUserId(),
  ]);
  return snap.docs
    .map((doc) => ({ id: doc.id, data: doc.data() as AttendanceDoc }))
    .filter(({ data }) => data.clockOut === null && inScope(user, data, users, departmentsByUser))
    .map(({ id, data }) => rowToAttendance(id, data, users))
    .sort((a, b) => b.workDate.localeCompare(a.workDate));
}

// DM/GM-only correction of a clock-in/out pair. The original values and the
// reason are always preserved so the audit trail is never silently overwritten.
export async function correctAttendance(actor: ERPUser, input: { id: number; clockIn: string; clockOut: string | null; reason: string }) {
  if (!isLeadership(actor)) throw new Error("Only DM or GM can correct attendance");
  const reason = input.reason.trim();
  if (reason.length < 5) throw new Error("A correction reason is required");
  const clockIn = new Date(input.clockIn);
  if (Number.isNaN(clockIn.getTime())) throw new Error("Clock-in time is invalid");
  const clockOut = input.clockOut ? new Date(input.clockOut) : null;
  if (clockOut && Number.isNaN(clockOut.getTime())) throw new Error("Clock-out time is invalid");
  if (clockOut && clockOut.getTime() <= clockIn.getTime()) throw new Error("Clock-out must be after clock-in");

  const db = await database();
  const ref = db.collection("gm_attendance").doc(String(input.id));
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Attendance record not found");
  const current = snap.data() as AttendanceDoc;

  await ref.set({
    clockIn: clockIn.toISOString(),
    clockOut: clockOut ? clockOut.toISOString() : null,
    isLate: isLateClockIn(clockIn),
    isEarlyExit: clockOut ? isEarlyClockOut(clockOut) : false,
    originalClockIn: current.originalClockIn ?? current.clockIn,
    originalClockOut: current.originalClockOut ?? current.clockOut,
    correctedById: actor.id,
    correctionReason: reason,
    correctedAt: new Date().toISOString(),
  }, { merge: true });
}

export type AttendanceMonthlySummary = {
  userId: string; name: string; initials: string; title: string; department: Department | null;
  daysPresent: number; daysLate: number; daysEarlyExit: number; totalMinutes: number;
};

// Monthly, per-person totals for the reports/dashboard month view, scoped the
// same way as every other attendance read (company / department / self).
export async function monthlyAttendanceSummary(user: ERPUser, year: number, month: number): Promise<AttendanceMonthlySummary[]> {
  await ensureErpDatabase();
  const db = await database();
  const from = `${year}-${String(month).padStart(2, "0")}-01`;
  const to = `${year}-${String(month).padStart(2, "0")}-31`;
  const [snap, users, departmentsByUser] = await Promise.all([
    db.collection("gm_attendance").where("workDate", ">=", from).where("workDate", "<=", to).get(),
    allUsersById(),
    departmentsByUserId(),
  ]);

  const byUser = new Map<string, AttendanceMonthlySummary>();
  for (const doc of snap.docs) {
    const row = doc.data() as AttendanceDoc;
    if (!inScope(user, row, users, departmentsByUser)) continue;
    const userId = row.userId;
    if (!byUser.has(userId)) {
      const person = users.get(userId);
      byUser.set(userId, {
        userId, name: person?.name ?? "Unknown", initials: person?.initials ?? "??", title: person?.title ?? "",
        department: person?.primaryDepartment ?? null,
        daysPresent: 0, daysLate: 0, daysEarlyExit: 0, totalMinutes: 0,
      });
    }
    const summary = byUser.get(userId)!;
    summary.daysPresent += 1;
    if (row.isLate) summary.daysLate += 1;
    if (row.isEarlyExit) summary.daysEarlyExit += 1;
    if (row.clockOut) {
      summary.totalMinutes += Math.max(0, Math.round((new Date(row.clockOut).getTime() - new Date(row.clockIn).getTime()) / 60000));
    }
  }
  return Array.from(byUser.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export async function listRecentActivity(limit = 12) {
  await ensureErpDatabase();
  const db = await database();
  const [taskUpdatesSnap, attendanceSnap, users, tasksSnap] = await Promise.all([
    db.collection("gm_task_updates").orderBy("createdAt", "desc").limit(limit).get(),
    db.collection("gm_attendance").orderBy("createdAt", "desc").limit(limit).get(),
    allUsersById(),
    db.collection("gm_tasks").get(),
  ]);
  const tasksById = new Map<number, TaskDoc>();
  tasksSnap.docs.forEach((doc) => tasksById.set(Number(doc.id), doc.data() as TaskDoc));

  const taskEvents = taskUpdatesSnap.docs.map((doc) => {
    const row = doc.data() as { taskId: number; userId: string; status: string; note: string; createdAt: string };
    const task = tasksById.get(row.taskId);
    return {
      type: "task" as const,
      occurred_at: row.createdAt,
      actor: users.get(row.userId)?.name ?? "Unknown",
      detail: row.note,
      subject: task?.title ?? "Unknown task",
      department: task?.department ?? null,
      state: row.status,
    };
  });

  const attendanceEvents = attendanceSnap.docs.map((doc) => {
    const row = doc.data() as AttendanceDoc;
    const person = users.get(row.userId);
    return {
      type: "attendance" as const,
      occurred_at: row.clockOut ?? row.clockIn,
      actor: person?.name ?? "Unknown",
      detail: row.clockOut === null ? "Clocked in" : "Clocked out",
      subject: person?.title ?? "",
      department: person?.primaryDepartment ?? null,
      state: row.clockOut === null ? "Working" : "Finished",
    };
  });

  return [...taskEvents, ...attendanceEvents]
    .sort((a, b) => b.occurred_at.localeCompare(a.occurred_at))
    .slice(0, limit);
}

export async function createSession(userId: string) {
  await ensureErpDatabase();
  const db = await database();
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const token = Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
  const tokenHash = await sha256(token);
  const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();

  const expiredSnap = await db.collection("gm_sessions").where("expiresAt", "<", new Date().toISOString()).get();
  if (!expiredSnap.empty) {
    const batch = db.batch();
    expiredSnap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }

  await db.collection("gm_sessions").doc(tokenHash).set({ userId, expiresAt, createdAt: new Date().toISOString() });
  return { token, expiresAt };
}

export async function deleteSession(token: string) {
  const db = await database();
  await db.collection("gm_sessions").doc(await sha256(token)).delete();
}

export async function userFromSession(token: string | null): Promise<ERPUser | null> {
  if (!token) return null;
  await ensureErpDatabase();
  const db = await database();
  const doc = await db.collection("gm_sessions").doc(await sha256(token)).get();
  if (!doc.exists) return null;
  const data = doc.data() as { userId: string; expiresAt: string };
  if (data.expiresAt <= new Date().toISOString()) return null;
  return getUserById(data.userId);
}

export async function verifyPassword(password: string, salt: string, expectedHash: string) {
  const actual = await derivePasswordHash(password, salt);
  if (actual.length !== expectedHash.length) return false;
  let difference = 0;
  for (let index = 0; index < actual.length; index += 1) difference |= actual.charCodeAt(index) ^ expectedHash.charCodeAt(index);
  return difference === 0;
}

export async function changePassword(user: ERPUser, currentPassword: string, nextPassword: string) {
  if (nextPassword.length < 10) throw new Error("New password must have at least 10 characters");
  const db = await database();
  const ref = db.collection("gm_users").doc(user.id);
  const snap = await ref.get();
  const data = snap.data() as UserDoc | undefined;
  if (!data || !(await verifyPassword(currentPassword, data.passwordSalt, data.passwordHash))) throw new Error("Current password is incorrect");
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const salt = Array.from(saltBytes, (value) => value.toString(16).padStart(2, "0")).join("");
  const hash = await derivePasswordHash(nextPassword, salt);
  await ref.set({ passwordSalt: salt, passwordHash: hash }, { merge: true });
}

async function derivePasswordHash(password: string, salt: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({
    name: "PBKDF2",
    hash: "SHA-256",
    salt: new TextEncoder().encode(salt),
    iterations: PASSWORD_HASH_ITERATIONS,
  }, key, 256);
  return Array.from(new Uint8Array(bits), (value) => value.toString(16).padStart(2, "0")).join("");
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (part) => part.toString(16).padStart(2, "0")).join("");
}
