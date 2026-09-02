import {
  attendanceAction,
  correctAttendance,
  createTask,
  DEPARTMENTS,
  getUserById,
  indiaDateKey,
  isLeadership,
  listAllAttendance,
  listAllTasks,
  listAttendanceFor,
  listAttendanceHistory,
  listMissingClockOuts,
  listRecentActivity,
  listTasksFor,
  listUsers,
  monthlyAttendanceSummary,
  updateTask,
  userFromSession,
  type Department,
  type ERPTask,
} from "../../../db/erp";

function sessionToken(request: Request) {
  const cookie = request.headers.get("cookie") ?? "";
  const match = cookie.match(/(?:^|;\s*)gm_erp_session=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

async function currentUser(request: Request) {
  return userFromSession(sessionToken(request));
}

function errorResponse(error: unknown, status = 400) {
  return Response.json({ error: error instanceof Error ? error.message : "Unable to complete this action" }, { status });
}

export async function GET(request: Request) {
  try {
    const user = await currentUser(request);
    if (!user) return errorResponse(new Error("Your session has expired. Sign in again."), 401);

    const url = new URL(request.url);
    const historyFrom = url.searchParams.get("from");
    const historyTo = url.searchParams.get("to");
    const reportMonth = url.searchParams.get("month"); // "YYYY-MM"

    const [directory, allTasks, allAttendance, tasks, attendance, activity, missingClockOuts] = await Promise.all([
      listUsers(), listAllTasks(), listAllAttendance(), listTasksFor(user), listAttendanceFor(user), listRecentActivity(), listMissingClockOuts(user),
    ]);

    let attendanceHistory: Awaited<ReturnType<typeof listAttendanceHistory>> | undefined;
    if (historyFrom && historyTo) attendanceHistory = await listAttendanceHistory(user, historyFrom, historyTo);

    let monthlyReport: Awaited<ReturnType<typeof monthlyAttendanceSummary>> | undefined;
    if (reportMonth && /^\d{4}-\d{2}$/.test(reportMonth)) {
      const [year, month] = reportMonth.split("-").map(Number);
      monthlyReport = await monthlyAttendanceSummary(user, year, month);
    }
    const today = indiaDateKey();
    const ownAttendance = allAttendance.find((row) => row.userId === user.id) ?? null;
    const departmentSummaries = DEPARTMENTS.map((department) => {
      const members = directory.filter((person) => person.departments.includes(department));
      const departmentTasks = allTasks.filter((task) => task.department === department);
      const presentIds = new Set(allAttendance.filter((row) => members.some((person) => person.id === row.userId)).map((row) => row.userId));
      const leader = members.find((person) => person.role === "LEAD");
      return {
        department,
        lead: leader?.name ?? "Not assigned",
        teamSize: members.length,
        present: presentIds.size,
        working: allAttendance.filter((row) => presentIds.has(row.userId) && !row.clockOut).length,
        activeTasks: departmentTasks.filter((task) => task.status !== "Completed").length,
        completedTasks: departmentTasks.filter((task) => task.status === "Completed").length,
        averageProgress: departmentTasks.length ? Math.round(departmentTasks.reduce((sum, task) => sum + task.progress, 0) / departmentTasks.length) : 0,
        currentWork: departmentTasks.filter((task) => task.status !== "Completed").slice(0, 3).map((task) => ({ title: task.title, status: task.status, progress: task.progress })),
      };
    });
    const scopedPeople = isLeadership(user)
      ? directory
      : user.role === "LEAD"
        ? directory.filter((person) => person.departments.some((department) => user.departments.includes(department)))
        : directory.filter((person) => person.id === user.id);

    return Response.json({
      user,
      permissions: { leadership: isLeadership(user), canAssign: isLeadership(user) || user.role === "LEAD", scope: isLeadership(user) ? "company" : user.role === "LEAD" ? "department" : "self" },
      today,
      tasks,
      attendance,
      ownAttendance,
      missingClockOuts,
      attendanceHistory,
      monthlyReport,
      people: scopedPeople,
      directory: directory.map(({ username: _username, ...person }) => person),
      departmentSummaries,
      activity,
    });
  } catch (error) {
    return errorResponse(error, 500);
  }
}

export async function POST(request: Request) {
  try {
    const user = await currentUser(request);
    if (!user) return errorResponse(new Error("Your session has expired. Sign in again."), 401);
    const body = await request.json() as Record<string, unknown>;

    if (body.action === "create_task") {
      const department = String(body.department) as Department;
      const priority = String(body.priority) as ERPTask["priority"];
      if (!DEPARTMENTS.includes(department)) return errorResponse(new Error("Choose a valid department"));
      if (!["Low", "Medium", "High", "Urgent"].includes(priority)) return errorResponse(new Error("Choose a valid priority"));
      if (!String(body.title ?? "").trim() || !String(body.assigneeId ?? "").trim() || !String(body.dueAt ?? "").trim()) {
        return errorResponse(new Error("Task title, owner, and deadline are required"));
      }
      const id = await createTask(user, {
        title: String(body.title), description: String(body.description ?? ""), department,
        assigneeId: String(body.assigneeId), dueAt: String(body.dueAt), priority,
      });
      return Response.json({ ok: true, id }, { status: 201 });
    }

    if (body.action === "update_task") {
      const status = String(body.status) as ERPTask["status"];
      if (!["To do", "In progress", "Review", "Blocked", "Completed"].includes(status)) return errorResponse(new Error("Choose a valid task status"));
      await updateTask(user, { id: Number(body.id), status, progress: Number(body.progress), note: String(body.note ?? "") });
      return Response.json({ ok: true });
    }

    if (body.action === "clock_in" || body.action === "clock_out") {
      await attendanceAction(user, body.action);
      return Response.json({ ok: true, user: await getUserById(user.id) });
    }

    if (body.action === "correct_attendance") {
      if (!Number.isFinite(Number(body.id))) return errorResponse(new Error("Choose a valid attendance record"));
      if (!String(body.clockIn ?? "").trim()) return errorResponse(new Error("Clock-in time is required"));
      await correctAttendance(user, {
        id: Number(body.id),
        clockIn: String(body.clockIn),
        clockOut: body.clockOut ? String(body.clockOut) : null,
        reason: String(body.reason ?? ""),
      });
      return Response.json({ ok: true });
    }

    return errorResponse(new Error("Unsupported ERP action"));
  } catch (error) {
    return errorResponse(error);
  }
}
