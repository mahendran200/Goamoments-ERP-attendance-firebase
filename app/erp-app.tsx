"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type Department = "Development" | "BPO" | "Documentation" | "Marketing";
type Role = "DM" | "GM" | "LEAD" | "EMPLOYEE";
type User = {
  id: string; username?: string; name: string; role: Role; title: string;
  primaryDepartment: Department | null; initials: string; departments: Department[];
};
type Task = {
  id: number; title: string; description: string; department: Department; assigneeId: string;
  assigneeName: string; assigneeInitials: string; assignedById: string; assignedByName: string;
  dueAt: string; priority: "Low" | "Medium" | "High" | "Urgent";
  status: "To do" | "In progress" | "Review" | "Blocked" | "Completed";
  progress: number; latestUpdate: string; createdAt: string; updatedAt: string; completedAt: string | null;
};
type Attendance = {
  id: number; userId: string; name: string; initials: string; title: string; department: Department | null;
  workDate: string; clockIn: string; clockOut: string | null;
  isLate: boolean; isEarlyExit: boolean;
  corrected: boolean; correctionReason: string | null; correctedByName: string | null; correctedAt: string | null;
};
type MonthlyAttendanceSummary = {
  userId: string; name: string; initials: string; title: string; department: Department | null;
  daysPresent: number; daysLate: number; daysEarlyExit: number; totalMinutes: number;
};
type DepartmentSummary = {
  department: Department; lead: string; teamSize: number; present: number; working: number;
  activeTasks: number; completedTasks: number; averageProgress: number;
  currentWork: Array<{ title: string; status: string; progress: number }>;
};
type Activity = { type: "task" | "attendance"; occurred_at: string; actor: string; detail: string; subject: string; department: Department | null; state: string };
type ERPData = {
  user: User;
  permissions: { leadership: boolean; canAssign: boolean; scope: "company" | "department" | "self" };
  today: string;
  tasks: Task[];
  attendance: Attendance[];
  ownAttendance: Attendance | null;
  missingClockOuts: Attendance[];
  attendanceHistory?: Attendance[];
  monthlyReport?: MonthlyAttendanceSummary[];
  people: User[];
  directory: User[];
  departmentSummaries: DepartmentSummary[];
  activity: Activity[];
};

const nav = [
  ["Overview", "overview"], ["Tasks", "tasks"], ["Attendance", "attendance"],
  ["Departments", "departments"], ["Hierarchy", "hierarchy"], ["People", "people"],
  ["Reports", "reports"], ["My profile", "profile"],
] as const;

const departmentTone: Record<Department, string> = {
  Development: "blue", BPO: "violet", Documentation: "cyan", Marketing: "rose",
};

export default function ERPApp() {
  const [data, setData] = useState<ERPData | null>(null);
  const [checking, setChecking] = useState(true);
  const [page, setPage] = useState("Overview");
  const [menu, setMenu] = useState(false);
  const [toast, setToast] = useState("");
  const [taskModal, setTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [correctingAttendance, setCorrectingAttendance] = useState<Attendance | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setChecking(true);
    try {
      const response = await fetch("/api/erp", { cache: "no-store" });
      if (response.status === 401) { setData(null); return; }
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to load the ERP");
      setData(body);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Unable to load the ERP");
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!data) return;
    const timer = window.setInterval(() => void load(true), 60000);
    return () => window.clearInterval(timer);
  }, [data, load]);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 3200);
  };

  const logout = async () => {
    await fetch("/api/auth", { method: "DELETE" });
    setData(null); setPage("Overview");
  };

  if (checking && !data) return <LoadingScreen />;
  if (!data) return <Login onSuccess={() => void load()} />;

  const visibleNav = nav.filter(([label]) => {
    if (label === "Reports") return data.permissions.leadership;
    if (label === "People") return data.permissions.scope !== "self";
    return true;
  });

  return (
    <div className="erp-shell">
      <aside className={`sidebar ${menu ? "open" : ""}`}>
        <Brand />
        <div className="nav-caption">OPERATIONS</div>
        <nav className="sidebar-nav">
          {visibleNav.map(([label, icon]) => (
            <button key={label} className={page === label ? "active" : ""} onClick={() => { setPage(label); setMenu(false); }}>
              <NavIcon name={icon} /> <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="scope-card"><span>YOUR ACCESS</span><strong>{scopeLabel(data)}</strong><small>{scopeText(data)}</small></div>
          <button className="signout" onClick={logout}><NavIcon name="logout" /> Sign out</button>
        </div>
      </aside>

      <section className="app-area">
        <header className="topbar">
          <div className="topbar-left"><button className="menu-btn" aria-label="Open menu" onClick={() => setMenu(!menu)}><NavIcon name="menu" /></button><div><span className="crumb">GOA MOMENTS ERP</span><strong>{page}</strong></div></div>
          <div className="topbar-right"><div className="live-dot"><i /> Live data</div><div className="top-profile"><Avatar user={data.user} /><div><strong>{data.user.name}</strong><span>{data.user.title}</span></div></div></div>
        </header>

        <main className="main">
          {page === "Overview" && <Overview data={data} openTask={() => setTaskModal(true)} goTo={setPage} />}
          {page === "Tasks" && <Tasks data={data} openTask={() => setTaskModal(true)} editTask={setEditingTask} />}
          {page === "Attendance" && <AttendancePage data={data} refresh={() => load(true)} notify={notify} openCorrection={setCorrectingAttendance} />}
          {page === "Departments" && <Departments data={data} />}
          {page === "Hierarchy" && <Hierarchy directory={data.directory} />}
          {page === "People" && <People data={data} />}
          {page === "Reports" && <Reports data={data} notify={notify} />}
          {page === "My profile" && <Profile user={data.user} notify={notify} />}
        </main>
      </section>

      {menu && <div className="mobile-overlay" onClick={() => setMenu(false)} />}
      {taskModal && <CreateTaskModal data={data} close={() => setTaskModal(false)} saved={() => { setTaskModal(false); notify("Task assigned and stored"); void load(true); }} />}
      {editingTask && <UpdateTaskModal task={editingTask} close={() => setEditingTask(null)} saved={() => { setEditingTask(null); notify("Progress update stored"); void load(true); }} />}
      {correctingAttendance && <CorrectAttendanceModal record={correctingAttendance} close={() => setCorrectingAttendance(null)} saved={() => { setCorrectingAttendance(null); notify("Attendance corrected"); void load(true); }} />}
      {toast && <div className="toast"><span>✓</span>{toast}</div>}
    </div>
  );
}

function LoadingScreen() {
  return <div className="loading-screen"><div className="loading-orbit"><span /><i /></div><img src="/goa-moments-logo.png?v=transparent-20260811" alt="Goa Moments" /><div className="loader" /><p>Synchronising your operations workspace…</p></div>;
}

function Login({ onSuccess }: { onSuccess: () => void }) {
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError(""); setLoading(true);
    try {
      const response = await fetch("/api/auth", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(form) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to sign in");
      onSuccess();
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to sign in"); }
    finally { setLoading(false); }
  };
  return <main className="login-page">
    <section className="login-story">
      <div className="future-backdrop" aria-hidden="true">
        <div className="perspective-grid" />
        <div className="light-beam beam-one" /><div className="light-beam beam-two" />
        <div className="orbital-system">
          <div className="orbit orbit-alpha"><i /><i /><i /></div>
          <div className="orbit orbit-beta"><i /><i /></div>
          <div className="orbit orbit-gamma"><i /></div>
          <div className="data-core">
            <div className="globe-grid" aria-hidden="true" />
            <img src="/goa-moments-logo.png?v=transparent-20260811" alt="" />
            <small>ERP CORE</small>
          </div>
          <div className="holo-node node-dev"><b>DEV</b><span>Systems</span></div>
          <div className="holo-node node-bpo"><b>BPO</b><span>Calls</span></div>
          <div className="holo-node node-doc"><b>DOC</b><span>Records</span></div>
          <div className="holo-node node-mkt"><b>MKT</b><span>Growth</span></div>
        </div>
        <div className="scanlines" />
      </div>
      <div className="login-logo"><img src="/goa-moments-logo.png?v=transparent-20260811" alt="Goa Moments" /><div><span>GOA MOMENTS</span><small>OPERATIONS INTELLIGENCE</small></div></div>
      <div className="login-copy"><span className="gold-kicker"><i /> LIVE COMPANY COMMAND NETWORK</span><h1>Command every team.<br /><em>See every signal.</em></h1><p>One intelligent workspace for real assignments, live attendance, employee progress, and complete department visibility.</p>
        <div className="login-features"><span><i />16 verified people</span><span><i />4 connected departments</span><span><i />Live attendance</span><span><i />Persistent tasks</span></div>
      </div>
      <div className="login-footer"><span><i /> SYSTEM ONLINE</span><span>GOA MOMENTS · AUTHORISED ACCESS ONLY</span><span>IST · SECURE NODE</span></div>
    </section>
    <section className="login-panel"><div className="panel-grid" aria-hidden="true" /><div className="login-form-box"><div className="access-line"><span><i /> SECURE GATEWAY</span><small>NODE 01</small></div><div className="mobile-login-logo"><img src="/goa-moments-logo.png?v=transparent-20260811" alt="Goa Moments" /></div><span className="eyebrow">IDENTITY VERIFICATION</span><h2>Enter the command centre</h2><p>Sign in with the individual access issued by Goa Moments management.</p>
      <form onSubmit={submit}>{error && <div className="form-error">{error}</div>}<label><span>USERNAME</span><input autoFocus autoComplete="username" value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} placeholder="e.g. gm.aathish" required /></label><label><span>PASSWORD</span><input type="password" autoComplete="current-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="Enter your password" required /></label><button className="login-button" disabled={loading}>{loading ? "Authenticating…" : "Access ERP system"}<span>→</span></button></form>
      <div className="login-note"><NavIcon name="shield" /><div><strong>Protected real-time workspace</strong><span>Only genuine tasks, attendance events, and authorised progress updates enter this system.</span></div></div>
    </div></section>
  </main>;
}

function Brand() {
  return <div className="brand"><img src="/goa-moments-logo.png?v=transparent-20260811" alt="Goa Moments" /><div><strong>GOA MOMENTS</strong><span>ERP · OPERATIONS</span></div></div>;
}

function PageHead({ kicker, title, text, children }: { kicker: string; title: string; text: string; children?: React.ReactNode }) {
  return <div className="page-head"><div><span className="eyebrow">{kicker}</span><h1>{title}</h1><p>{text}</p></div>{children && <div className="page-actions">{children}</div>}</div>;
}

function Overview({ data, openTask, goTo }: { data: ERPData; openTask: () => void; goTo: (page: string) => void }) {
  const active = data.tasks.filter((task) => task.status !== "Completed");
  const completed = data.tasks.filter((task) => task.status === "Completed");
  const average = data.tasks.length ? Math.round(data.tasks.reduce((sum, task) => sum + task.progress, 0) / data.tasks.length) : 0;
  const attendanceStatus = data.ownAttendance ? data.ownAttendance.clockOut ? "Day completed" : "Clocked in" : "Not clocked in";
  const heading = data.permissions.leadership ? "Company command centre" : data.user.role === "LEAD" ? `${data.user.primaryDepartment} command centre` : "My work centre";
  return <>
    <PageHead kicker={formatDate(new Date().toISOString(), true)} title={heading} text={`Welcome, ${data.user.name}. This view contains only live records created inside Goa Moments ERP.`}>
      {data.permissions.canAssign && <button className="primary-btn" onClick={openTask}>＋ Assign task</button>}
    </PageHead>
    <section className="command-signal" aria-label="Live ERP system status">
      <div className="command-signal-copy"><span><i /> LIVE OPERATIONS NETWORK</span><strong>All four departments are connected</strong><small>Tasks, attendance, and progress are synchronised into this authorised view.</small></div>
      <div className="signal-route" aria-hidden="true"><i /><span>DEV</span><i /><span>BPO</span><i /><span>DOC</span><i /><span>MKT</span><i /></div>
      <div className="signal-score"><span>SYSTEM</span><strong>ONLINE</strong></div>
    </section>
    <section className="stats-grid">
      <Stat label={data.permissions.scope === "self" ? "My open tasks" : "Open tasks"} value={String(active.length)} note={active.length ? `${active.filter((task) => isOverdue(task)).length} overdue` : "No assignments yet"} icon="tasks" />
      <Stat label="Average progress" value={`${average}%`} note={data.tasks.length ? `${completed.length} completed` : "Starts from actual updates"} icon="progress" />
      <Stat label="Attendance today" value={attendanceStatus} note={data.ownAttendance ? formatAttendanceTime(data.ownAttendance) : "Clock in when work begins"} icon="clock" compact />
      <Stat label="Departments visible" value="4" note="Shared company pulse" icon="company" />
    </section>

    <div className="dashboard-grid">
      <section className="panel task-panel"><PanelHead title={data.permissions.scope === "self" ? "My priority work" : "Priority work"} text="Live tasks sorted by urgency and deadline"><button className="text-btn" onClick={() => goTo("Tasks")}>View all →</button></PanelHead>{data.tasks.length ? <TaskTable tasks={data.tasks.slice(0, 6)} onTask={() => goTo("Tasks")} /> : <EmptyState icon="tasks" title="No tasks have been assigned" text="This fresh ERP has no sample work. The first real task will appear here after a lead, GM, or DM assigns it." action={data.permissions.canAssign ? <button className="secondary-btn" onClick={openTask}>Assign the first task</button> : undefined} />}</section>
      <section className="panel activity-panel"><PanelHead title="Live company activity" text="Actual task and attendance events" />{data.activity.length ? <div className="activity-list">{data.activity.slice(0, 7).map((item, index) => <ActivityRow key={`${item.occurred_at}-${index}`} item={item} />)}</div> : <EmptyState icon="pulse" title="No activity recorded yet" text="Clock-ins, assignments, and progress updates will form the real audit trail here." />}</section>
    </div>

    <section className="section-block"><div className="section-heading"><div><span className="eyebrow">CROSS-DEPARTMENT VISIBILITY</span><h2>Company pulse</h2></div><button className="text-btn" onClick={() => goTo("Departments")}>Open department view →</button></div><DepartmentCards summaries={data.departmentSummaries} /></section>
  </>;
}

function Tasks({ data, openTask, editTask }: { data: ERPData; openTask: () => void; editTask: (task: Task) => void }) {
  const [status, setStatus] = useState("All");
  const [department, setDepartment] = useState("All");
  const filtered = data.tasks.filter((task) => (status === "All" || task.status === status) && (department === "All" || task.department === department));
  return <>
    <PageHead kicker="WORK ACCOUNTABILITY" title={data.permissions.scope === "self" ? "My assigned tasks" : data.permissions.scope === "department" ? "Department tasks" : "All company tasks"} text="Every record below is a real assignment stored in the ERP with its current owner, deadline, and progress.">
      {data.permissions.canAssign && <button className="primary-btn" onClick={openTask}>＋ Assign new task</button>}
    </PageHead>
    <section className="panel">
      <div className="filters"><div className="filter-tabs">{["All", "To do", "In progress", "Review", "Blocked", "Completed"].map((value) => <button key={value} className={status === value ? "active" : ""} onClick={() => setStatus(value)}>{value}<span>{value === "All" ? data.tasks.length : data.tasks.filter((task) => task.status === value).length}</span></button>)}</div><select aria-label="Filter by department" value={department} onChange={(event) => setDepartment(event.target.value)}><option>All</option>{["Development", "BPO", "Documentation", "Marketing"].map((value) => <option key={value}>{value}</option>)}</select></div>
      {filtered.length ? <TaskTable tasks={filtered} onTask={editTask} detailed /> : <EmptyState icon="tasks" title={data.tasks.length ? "No tasks match this filter" : "No real tasks have been assigned yet"} text={data.tasks.length ? "Change the status or department filter to see other work." : "The task register is intentionally clean. New assignments will be stored here."} action={data.permissions.canAssign && !data.tasks.length ? <button className="secondary-btn" onClick={openTask}>Assign first task</button> : undefined} />}
    </section>
  </>;
}

function TaskTable({ tasks, onTask, detailed = false }: { tasks: Task[]; onTask: (task: Task) => void; detailed?: boolean }) {
  return <div className="table-wrap"><table className="data-table task-table"><thead><tr><th>Task</th><th>Department</th><th>Owner</th><th>Deadline</th><th>Status</th><th>Progress</th>{detailed && <th />}</tr></thead><tbody>{tasks.map((task) => <tr key={task.id} className={isOverdue(task) ? "overdue-row" : ""} onClick={() => onTask(task)}><td><strong className="task-title">{task.title}</strong><span className="task-meta">Assigned by {task.assignedByName}{task.latestUpdate ? ` · ${task.latestUpdate}` : ""}</span></td><td><DepartmentChip department={task.department} /></td><td><div className="person"><span className="mini-avatar">{task.assigneeInitials}</span><strong>{task.assigneeName}</strong></div></td><td><strong className={isOverdue(task) ? "danger-text" : ""}>{formatDate(task.dueAt)}</strong><span className="task-meta">{relativeDue(task)}</span></td><td><StatusChip status={task.status} /></td><td><Progress value={task.progress} /></td>{detailed && <td><button className="row-action" aria-label={`Update ${task.title}`}>→</button></td>}</tr>)}</tbody></table></div>;
}

function AttendancePage({ data, refresh, notify, openCorrection }: { data: ERPData; refresh: () => void; notify: (message: string) => void; openCorrection: (record: Attendance) => void }) {
  const now = useNow();
  const record = data.ownAttendance;
  const state = !record ? "not-started" : record.clockOut ? "completed" : "working";
  const canCorrect = data.permissions.leadership;
  const [view, setView] = useState<"today" | "history" | "monthly">("today");

  const clock = async () => {
    try {
      const response = await fetch("/api/erp", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: state === "working" ? "clock_out" : "clock_in" }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      notify(state === "working" ? "Clock-out recorded" : "Clock-in recorded"); refresh();
    } catch (error) { notify(error instanceof Error ? error.message : "Attendance could not be recorded"); }
  };
  const exportAttendance = () => downloadCsv("goa-moments-attendance.csv", ["Employee", "Role", "Department", "Clock in", "Clock out", "Worked", "Late", "Early exit"], data.attendance.map((row) => [row.name, row.title, row.department ?? "Leadership", formatTime(row.clockIn), row.clockOut ? formatTime(row.clockOut) : "Working", duration(row.clockIn, row.clockOut), row.isLate ? "Yes" : "No", row.isEarlyExit ? "Yes" : "No"]));

  return <>
    <PageHead kicker="REAL-TIME ATTENDANCE" title="Attendance & working time" text="Each person records their own start and finish, in Indian Standard Time. Working time, late arrivals, and early exits are all calculated server-side from the stored timestamps.">
      {data.permissions.scope !== "self" && view === "today" && <button className="secondary-btn" onClick={exportAttendance}>↓ Export today</button>}
    </PageHead>

    {data.missingClockOuts.length > 0 && <div className="attendance-alert"><NavIcon name="shield" /><div><strong>{data.missingClockOuts.length} missing clock-out{data.missingClockOuts.length === 1 ? "" : "s"}</strong><span>{data.missingClockOuts.slice(0, 4).map((row) => `${row.name} · ${row.workDate}`).join(", ")}{data.missingClockOuts.length > 4 ? "…" : ""}{canCorrect ? " — open the History tab to correct." : ""}</span></div></div>}

    <div className="attendance-hero">
      <section className={`clock-card ${state}`}><span className="eyebrow">MY ATTENDANCE · {data.today}</span><div className="clock-time">{now.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", second: "2-digit" })}</div><p>{now.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
        <div className="clock-status"><i />{state === "working" ? `Working for ${duration(record!.clockIn, null, now)}` : state === "completed" ? `Completed · ${duration(record!.clockIn, record!.clockOut)}` : "Work has not started"}</div>
        <button onClick={clock} disabled={state === "completed"}>{state === "working" ? "Clock out" : state === "completed" ? "Attendance completed" : "Clock in now"}</button>
        {record && <div className="clock-details"><span>IN <b>{formatTime(record.clockIn)}</b></span><span>OUT <b>{record.clockOut ? formatTime(record.clockOut) : "—"}</b></span>{(record.isLate || record.isEarlyExit) && <AttendanceBadges row={record} />}</div>}
      </section>
      <section className="panel attendance-summary-panel"><PanelHead title="Today at a glance" text={`${scopeLabel(data)} attendance register`} /><div className="attendance-kpis"><Kpi label="Recorded" value={data.attendance.length} /><Kpi label="Working now" value={data.attendance.filter((row) => !row.clockOut).length} /><Kpi label="Late today" value={data.attendance.filter((row) => row.isLate).length} /><Kpi label="My hours" value={record ? duration(record.clockIn, record.clockOut, now) : "0m"} /></div><div className="truth-note"><NavIcon name="shield" /><p><strong>No manual or sample attendance.</strong><span>Only authenticated clock-in and clock-out events appear in this register; corrections are logged with a reason.</span></p></div></section>
    </div>

    <section className="panel">
      <div className="filters"><div className="filter-tabs"><button className={view === "today" ? "active" : ""} onClick={() => setView("today")}>Today</button><button className={view === "history" ? "active" : ""} onClick={() => setView("history")}>History</button>{canCorrect && <button className={view === "monthly" ? "active" : ""} onClick={() => setView("monthly")}>Monthly report</button>}</div></div>

      {view === "today" && (data.attendance.length ? <div className="table-wrap"><table className="data-table"><thead><tr><th>Employee</th><th>Role</th><th>Department</th><th>Clock in</th><th>Clock out</th><th>Working time</th><th>Status</th>{canCorrect && <th />}</tr></thead><tbody>{data.attendance.map((row) => <tr key={row.id}><td><div className="person"><span className="mini-avatar">{row.initials}</span><strong>{row.name}</strong></div></td><td>{row.title}</td><td>{row.department ?? "Leadership"}</td><td>{formatTime(row.clockIn)}</td><td>{row.clockOut ? formatTime(row.clockOut) : "—"}</td><td><strong>{duration(row.clockIn, row.clockOut, now)}</strong></td><td><StatusChip status={row.clockOut ? "Completed" : "Working"} /> <AttendanceBadges row={row} /></td>{canCorrect && <td><button className="row-action" aria-label={`Correct ${row.name}'s attendance`} onClick={() => openCorrection(row)}>✎</button></td>}</tr>)}</tbody></table></div> : <EmptyState icon="clock" title="No attendance recorded in this view" text="The register will populate only when an authorised team member clocks in." />)}

      {view === "history" && <AttendanceHistoryView data={data} canCorrect={canCorrect} openCorrection={openCorrection} />}
      {view === "monthly" && canCorrect && <MonthlyAttendanceView data={data} notify={notify} />}
    </section>
  </>;
}

function AttendanceBadges({ row }: { row: Attendance }) {
  return <span className="attendance-badges">{row.isLate && <span className="mini-badge late">Late</span>}{row.isEarlyExit && <span className="mini-badge early">Early exit</span>}{row.corrected && <span className="mini-badge corrected" title={row.correctionReason ?? undefined}>Corrected</span>}</span>;
}

function AttendanceHistoryView({ data, canCorrect, openCorrection }: { data: ERPData; canCorrect: boolean; openCorrection: (record: Attendance) => void }) {
  const [range, setRange] = useState(() => { const to = data.today; const from = indiaDateOffset(-6); return { from, to }; });
  const [rows, setRows] = useState<Attendance[] | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (from: string, to: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/erp?from=${from}&to=${to}`, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setRows(body.attendanceHistory ?? []);
    } catch {
      setRows([]);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(range.from, range.to); }, [load, range.from, range.to]);

  const exportHistory = () => downloadCsv("goa-moments-attendance-history.csv", ["Employee", "Department", "Date", "Clock in", "Clock out", "Worked", "Late", "Early exit", "Corrected"], (rows ?? []).map((row) => [row.name, row.department ?? "Leadership", row.workDate, formatTime(row.clockIn), row.clockOut ? formatTime(row.clockOut) : "Working", duration(row.clockIn, row.clockOut), row.isLate ? "Yes" : "No", row.isEarlyExit ? "Yes" : "No", row.corrected ? "Yes" : "No"]));

  return <div className="attendance-history">
    <div className="filters"><div className="history-range"><label>From<input type="date" value={range.from} max={range.to} onChange={(event) => setRange({ ...range, from: event.target.value })} /></label><label>To<input type="date" value={range.to} max={data.today} min={range.from} onChange={(event) => setRange({ ...range, to: event.target.value })} /></label></div><button className="secondary-btn" onClick={exportHistory} disabled={!rows?.length}>↓ Export range</button></div>
    {loading ? <p className="muted">Loading attendance history…</p> : rows && rows.length ? <div className="table-wrap"><table className="data-table"><thead><tr><th>Employee</th><th>Department</th><th>Date</th><th>Clock in</th><th>Clock out</th><th>Working time</th><th>Status</th>{canCorrect && <th />}</tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td><div className="person"><span className="mini-avatar">{row.initials}</span><strong>{row.name}</strong></div></td><td>{row.department ?? "Leadership"}</td><td>{row.workDate}</td><td>{formatTime(row.clockIn)}</td><td>{row.clockOut ? formatTime(row.clockOut) : "—"}</td><td><strong>{duration(row.clockIn, row.clockOut)}</strong></td><td><StatusChip status={row.clockOut ? "Completed" : "Working"} /> <AttendanceBadges row={row} /></td>{canCorrect && <td><button className="row-action" aria-label={`Correct ${row.name}'s attendance`} onClick={() => openCorrection(row)}>✎</button></td>}</tr>)}</tbody></table></div> : <EmptyState icon="clock" title="No attendance in this range" text="Widen the date range to see earlier clock-ins and clock-outs." />}
  </div>;
}

function MonthlyAttendanceView({ data, notify }: { data: ERPData; notify: (message: string) => void }) {
  const [month, setMonth] = useState(() => data.today.slice(0, 7));
  const [rows, setRows] = useState<MonthlyAttendanceSummary[] | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (value: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/erp?month=${value}`, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setRows(body.monthlyReport ?? []);
    } catch {
      setRows([]);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(month); }, [load, month]);

  const exportMonth = () => { downloadCsv(`goa-moments-attendance-${month}.csv`, ["Employee", "Role", "Department", "Days present", "Days late", "Days early exit", "Total hours"], (rows ?? []).map((row) => [row.name, row.title, row.department ?? "Leadership", row.daysPresent, row.daysLate, row.daysEarlyExit, (row.totalMinutes / 60).toFixed(1)])); notify("Monthly attendance report downloaded"); };

  return <div className="attendance-monthly">
    <div className="filters"><label className="month-picker">Month<input type="month" value={month} max={data.today.slice(0, 7)} onChange={(event) => setMonth(event.target.value)} /></label><button className="secondary-btn" onClick={exportMonth} disabled={!rows?.length}>↓ Export month</button></div>
    {loading ? <p className="muted">Loading monthly report…</p> : rows && rows.length ? <div className="table-wrap"><table className="data-table"><thead><tr><th>Employee</th><th>Department</th><th>Days present</th><th>Days late</th><th>Days early exit</th><th>Total hours</th></tr></thead><tbody>{rows.map((row) => <tr key={row.userId}><td><div className="person"><span className="mini-avatar">{row.initials}</span><strong>{row.name}</strong></div></td><td>{row.department ?? "Leadership"}</td><td>{row.daysPresent}</td><td>{row.daysLate}</td><td>{row.daysEarlyExit}</td><td><strong>{(row.totalMinutes / 60).toFixed(1)}h</strong></td></tr>)}</tbody></table></div> : <EmptyState icon="clock" title="No attendance recorded this month" text="Totals will appear once clock-ins are stored for this month." />}
  </div>;
}

function CorrectAttendanceModal({ record, close, saved }: { record: Attendance; close: () => void; saved: () => void }) {
  const [form, setForm] = useState({ clockIn: toLocalInput(record.clockIn), clockOut: record.clockOut ? toLocalInput(record.clockOut) : "", reason: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true); setError("");
    try {
      const response = await fetch("/api/erp", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({
        action: "correct_attendance", id: record.id,
        clockIn: form.clockIn ? new Date(form.clockIn).toISOString() : null,
        clockOut: form.clockOut ? new Date(form.clockOut).toISOString() : null,
        reason: form.reason,
      }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      saved();
    } catch (err) { setError(err instanceof Error ? err.message : "Could not correct this record"); } finally { setSaving(false); }
  };
  return <Modal close={close}><form onSubmit={submit}><ModalHead kicker={`${record.department ?? "LEADERSHIP"} · ${record.name.toUpperCase()}`} title={`Correct attendance · ${record.workDate}`} close={close} />
    {error && <div className="form-error">{error}</div>}
    <div className="field-grid">
      <label>Clock in<input type="datetime-local" value={form.clockIn} onChange={(event) => setForm({ ...form, clockIn: event.target.value })} required /></label>
      <label>Clock out<input type="datetime-local" value={form.clockOut} onChange={(event) => setForm({ ...form, clockOut: event.target.value })} /></label>
      <label className="wide">Reason for correction<textarea rows={3} value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} placeholder="Why is this attendance record being changed? This is stored in the audit log." required minLength={5} /></label>
    </div>
    {record.corrected && <p className="muted">This record was already corrected once{record.correctedByName ? ` by ${record.correctedByName}` : ""}; the original clock-in/out is kept in the audit trail.</p>}
    <div className="modal-actions"><button type="button" className="secondary-btn" onClick={close}>Cancel</button><button className="primary-btn" disabled={saving}>{saving ? "Saving…" : "Save correction"}</button></div>
  </form></Modal>;
}

function Departments({ data }: { data: ERPData }) {
  return <><PageHead kicker="COMPANY TRANSPARENCY" title="Department progress" text="Everyone can understand what each department is working on. Individual employee records remain controlled by the hierarchy." /><DepartmentCards summaries={data.departmentSummaries} detailed /><section className="panel department-matrix"><PanelHead title="How visibility works" text="Clear access without losing company-wide coordination" /><div className="visibility-grid"><Visibility role="DM & GM" text="View every task, every employee, every department, and full attendance records." /><Visibility role="Department leads" text="Manage their department’s people, assignments, and attendance; view every department’s overall pulse." /><Visibility role="Employees" text="View and update their own tasks and attendance; view every department’s overall work progress." /></div></section></>;
}

function DepartmentCards({ summaries, detailed = false }: { summaries: DepartmentSummary[]; detailed?: boolean }) {
  return <div className={`department-grid ${detailed ? "detailed" : ""}`}>{summaries.map((item) => <article className={`department-card ${departmentTone[item.department]}`} key={item.department}><div className="department-top"><div className="department-icon"><NavIcon name={item.department.toLowerCase()} /></div><div><span>{item.department.toUpperCase()}</span><h3>{item.lead}</h3><p>Department lead</p></div></div><div className="department-metrics"><div><strong>{item.teamSize}</strong><span>People</span></div><div><strong>{item.present}</strong><span>Present</span></div><div><strong>{item.activeTasks}</strong><span>Active tasks</span></div></div><div className="department-progress"><div><span>Overall task progress</span><strong>{item.averageProgress}%</strong></div><Progress value={item.averageProgress} simple /></div>{detailed && <div className="current-work"><span className="mini-label">CURRENT WORK</span>{item.currentWork.length ? item.currentWork.map((work) => <div className="work-item" key={work.title}><div><strong>{work.title}</strong><span>{work.status}</span></div><b>{work.progress}%</b></div>) : <p>No tasks assigned yet.</p>}</div>}</article>)}</div>;
}

function Hierarchy({ directory }: { directory: User[] }) {
  const dm = directory.find((user) => user.role === "DM");
  const gm = directory.find((user) => user.role === "GM");
  return <><PageHead kicker="REPORTING STRUCTURE" title="Goa Moments hierarchy" text="One verified record per person, connected to the correct department and reporting flow." /><section className="panel hierarchy-panel"><div className="hierarchy-tree">{dm && <HierarchyPerson user={dm} level="dm" />}<div className="tree-line" />{gm && <HierarchyPerson user={gm} level="gm" />}<div className="tree-line" /><div className="departments-row">{(["Development", "BPO", "Documentation", "Marketing"] as Department[]).map((department) => { const members = directory.filter((user) => user.departments.includes(department)); const lead = members.find((user) => user.role === "LEAD"); const employees = members.filter((user) => user.role === "EMPLOYEE"); return <article className={`hierarchy-department ${departmentTone[department]}`} key={department}><div className="hierarchy-dept-head"><NavIcon name={department.toLowerCase()} /><strong>{department}</strong></div>{lead && <HierarchyPerson user={lead} level="lead" />}<div className="employee-chips">{employees.map((user) => <div key={user.id}><Avatar user={user} /><span><strong>{user.name}</strong><small>{user.id}</small></span>{user.departments.length > 1 && <b>SHARED</b>}</div>)}</div></article>; })}</div></div></section><div className="dedupe-note"><NavIcon name="shield" /><div><strong>Duplicate-free directory</strong><p>Archana is stored once and linked to both BPO and Documentation. All other people have one verified employee record.</p></div></div></>;
}

function HierarchyPerson({ user, level }: { user: User; level: "dm" | "gm" | "lead" }) {
  return <div className={`hierarchy-person ${level}`}><Avatar user={user} /><div><strong>{user.name}</strong><span>{user.title}</span><small>{user.id}</small></div></div>;
}

function People({ data }: { data: ERPData }) {
  return <><PageHead kicker="VERIFIED TEAM DIRECTORY" title={data.permissions.leadership ? "All people" : `${data.user.primaryDepartment} team`} text={`${data.people.length} unique records in your authorised view. No duplicate employee rows.`} /><section className="panel"><div className="table-wrap"><table className="data-table people-table"><thead><tr><th>Employee</th><th>Employee ID</th><th>Role</th><th>Department membership</th><th>Access level</th></tr></thead><tbody>{data.people.map((person) => <tr key={person.id}><td><div className="person"><Avatar user={person} /><div><strong>{person.name}</strong><span>{person.title}</span></div></div></td><td><code>{person.id}</code></td><td><RoleChip role={person.role} /></td><td><div className="chip-row">{person.departments.length ? person.departments.map((department) => <DepartmentChip key={department} department={department} />) : <span className="muted">Company leadership</span>}</div></td><td>{person.role === "DM" || person.role === "GM" ? "All company records" : person.role === "LEAD" ? "Department management" : "Own records + company pulse"}</td></tr>)}</tbody></table></div></section></>;
}

function Reports({ data, notify }: { data: ERPData; notify: (message: string) => void }) {
  const taskExport = () => { downloadCsv("goa-moments-task-report.csv", ["Task", "Department", "Owner", "Assigned by", "Deadline", "Status", "Progress", "Latest update"], data.tasks.map((task) => [task.title, task.department, task.assigneeName, task.assignedByName, task.dueAt, task.status, `${task.progress}%`, task.latestUpdate])); notify("Task report downloaded"); };
  const attendanceExport = () => { downloadCsv("goa-moments-attendance-report.csv", ["Employee", "Role", "Department", "Date", "Clock in", "Clock out", "Working time"], data.attendance.map((row) => [row.name, row.title, row.department ?? "Leadership", row.workDate, formatTime(row.clockIn), row.clockOut ? formatTime(row.clockOut) : "Working", duration(row.clockIn, row.clockOut)])); notify("Attendance report downloaded"); };
  const departmentExport = () => { downloadCsv("goa-moments-department-report.csv", ["Department", "Lead", "People", "Present", "Working", "Active tasks", "Completed tasks", "Average progress"], data.departmentSummaries.map((row) => [row.department, row.lead, row.teamSize, row.present, row.working, row.activeTasks, row.completedTasks, `${row.averageProgress}%`])); notify("Department report downloaded"); };
  return <><PageHead kicker="DM / GM REPORTING" title="Management reports" text="Download current operational records. Exports contain live ERP data only." /><div className="reports-grid"><ReportCard icon="tasks" title="Task register" text="All assignments, owners, deadlines, status, progress, and latest employee updates." count={`${data.tasks.length} records`} action={taskExport} /><ReportCard icon="clock" title="Attendance register" text="Today’s real clock-in, clock-out, and calculated working-time records." count={`${data.attendance.length} records`} action={attendanceExport} /><ReportCard icon="company" title="Department performance" text="Team size, attendance, task volume, and average progress for all four departments." count="4 departments" action={departmentExport} /></div></>;
}

function Profile({ user, notify }: { user: User; notify: (message: string) => void }) {
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [saving, setSaving] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (form.newPassword !== form.confirm) { notify("New passwords do not match"); return; }
    setSaving(true);
    try { const response = await fetch("/api/auth", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(form) }); const body = await response.json(); if (!response.ok) throw new Error(body.error); notify("Password changed successfully"); setForm({ currentPassword: "", newPassword: "", confirm: "" }); }
    catch (error) { notify(error instanceof Error ? error.message : "Password could not be changed"); }
    finally { setSaving(false); }
  };
  return <><PageHead kicker="MY ACCOUNT" title="Profile & security" text="Your verified identity controls which company records you can view and update." /><div className="profile-grid"><section className="panel identity-card"><Avatar user={user} /><h2>{user.name}</h2><p>{user.title}</p><div className="identity-details"><span><b>Employee ID</b>{user.id}</span><span><b>Username</b>{user.username}</span><span><b>Role</b>{user.role}</span><span><b>Departments</b>{user.departments.join(", ") || "Company leadership"}</span></div></section><section className="panel password-card"><PanelHead title="Change password" text="Replace the temporary password after first sign-in" /><form onSubmit={submit}><label>Current password<input type="password" value={form.currentPassword} onChange={(event) => setForm({ ...form, currentPassword: event.target.value })} required /></label><label>New password<input type="password" minLength={10} value={form.newPassword} onChange={(event) => setForm({ ...form, newPassword: event.target.value })} required /><small>Minimum 10 characters</small></label><label>Confirm new password<input type="password" value={form.confirm} onChange={(event) => setForm({ ...form, confirm: event.target.value })} required /></label><button className="primary-btn" disabled={saving}>{saving ? "Saving…" : "Update password"}</button></form></section></div></>;
}

function CreateTaskModal({ data, close, saved }: { data: ERPData; close: () => void; saved: () => void }) {
  const departments = data.permissions.leadership ? (["Development", "BPO", "Documentation", "Marketing"] as Department[]) : data.user.departments;
  const [form, setForm] = useState({ title: "", description: "", department: departments[0], assigneeId: "", dueAt: defaultDeadline(), priority: "Medium" });
  const [error, setError] = useState(""); const [saving, setSaving] = useState(false);
  const assignees = data.directory.filter((person) => person.departments.includes(form.department));
  useEffect(() => { if (!assignees.some((person) => person.id === form.assigneeId)) setForm((current) => ({ ...current, assigneeId: assignees[0]?.id ?? "" })); }, [form.department]);
  const submit = async (event: FormEvent) => { event.preventDefault(); setSaving(true); setError(""); try { const response = await fetch("/api/erp", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "create_task", ...form }) }); const body = await response.json(); if (!response.ok) throw new Error(body.error); saved(); } catch (err) { setError(err instanceof Error ? err.message : "Task could not be assigned"); } finally { setSaving(false); } };
  return <Modal close={close}><form onSubmit={submit}><ModalHead kicker="REAL WORK ASSIGNMENT" title="Assign a new task" close={close} />{error && <div className="form-error">{error}</div>}<div className="field-grid"><label className="wide">Task title<input autoFocus value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Clear, measurable work outcome" required /></label><label>Department<select value={form.department} onChange={(event) => setForm({ ...form, department: event.target.value as Department })}>{departments.map((department) => <option key={department}>{department}</option>)}</select></label><label>Assign to<select value={form.assigneeId} onChange={(event) => setForm({ ...form, assigneeId: event.target.value })} required>{assignees.map((person) => <option value={person.id} key={person.id}>{person.name} · {person.title}</option>)}</select></label><label>Deadline<input type="datetime-local" value={form.dueAt} onChange={(event) => setForm({ ...form, dueAt: event.target.value })} required /></label><label>Priority<select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}><option>Low</option><option>Medium</option><option>High</option><option>Urgent</option></select></label><label className="wide">Instructions / expected output<textarea rows={4} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Add the steps, result, or proof expected from the employee." /></label></div><div className="modal-actions"><button type="button" className="secondary-btn" onClick={close}>Cancel</button><button className="primary-btn" disabled={saving}>{saving ? "Assigning…" : "Assign & store task"}</button></div></form></Modal>;
}

function UpdateTaskModal({ task, close, saved }: { task: Task; close: () => void; saved: () => void }) {
  const [form, setForm] = useState({ status: task.status, progress: task.progress, note: task.latestUpdate });
  const [error, setError] = useState(""); const [saving, setSaving] = useState(false);
  const submit = async (event: FormEvent) => { event.preventDefault(); setSaving(true); setError(""); try { const response = await fetch("/api/erp", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "update_task", id: task.id, ...form }) }); const body = await response.json(); if (!response.ok) throw new Error(body.error); saved(); } catch (err) { setError(err instanceof Error ? err.message : "Progress could not be saved"); } finally { setSaving(false); } };
  return <Modal close={close}><form onSubmit={submit}><ModalHead kicker={`${task.department.toUpperCase()} · ${task.assigneeName.toUpperCase()}`} title={task.title} close={close} />{task.description && <p className="task-description">{task.description}</p>}{error && <div className="form-error">{error}</div>}<div className="task-facts"><span><b>Assigned by</b>{task.assignedByName}</span><span><b>Deadline</b>{formatDate(task.dueAt, true)}</span><span><b>Priority</b>{task.priority}</span></div><div className="field-grid"><label>Status<select value={form.status} onChange={(event) => { const status = event.target.value as Task["status"]; setForm({ ...form, status, progress: status === "Completed" ? 100 : form.progress }); }}><option>To do</option><option>In progress</option><option>Review</option><option>Blocked</option><option>Completed</option></select></label><label>Progress percentage<input className="progress-number" type="number" min="0" max="100" step="5" value={form.progress} onChange={(event) => setForm({ ...form, progress: Number(event.target.value) })} /></label><label className="wide">Progress update / work note<textarea rows={4} value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} placeholder="What was completed? What is pending? Is anything blocked?" /></label></div><div className="modal-actions"><button type="button" className="secondary-btn" onClick={close}>Cancel</button><button className="primary-btn" disabled={saving}>{saving ? "Saving…" : "Save real progress"}</button></div></form></Modal>;
}

function Modal({ close, children }: { close: () => void; children: React.ReactNode }) { return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}><div className="modal">{children}</div></div>; }
function ModalHead({ kicker, title, close }: { kicker: string; title: string; close: () => void }) { return <div className="modal-head"><div><span className="eyebrow">{kicker}</span><h2>{title}</h2></div><button type="button" onClick={close} aria-label="Close">×</button></div>; }
function PanelHead({ title, text, children }: { title: string; text: string; children?: React.ReactNode }) { return <div className="panel-head"><div><h3>{title}</h3><p>{text}</p></div>{children}</div>; }
function Stat({ label, value, note, icon, compact }: { label: string; value: string; note: string; icon: string; compact?: boolean }) { return <article className="stat-card"><div className="stat-icon"><NavIcon name={icon} /></div><div><span>{label}</span><strong className={compact ? "compact" : ""}>{value}</strong><small>{note}</small></div></article>; }
function Kpi({ label, value }: { label: string; value: string | number }) { return <div className="kpi"><span>{label}</span><strong>{value}</strong></div>; }
function Progress({ value, simple }: { value: number; simple?: boolean }) { return <div className={`progress ${simple ? "simple" : ""}`}><div><i style={{ width: `${value}%` }} /></div>{!simple && <strong>{value}%</strong>}</div>; }
function Avatar({ user }: { user: Pick<User, "initials" | "name" | "primaryDepartment"> }) { const tone = user.primaryDepartment ? departmentTone[user.primaryDepartment] : "gold"; return <span className={`avatar ${tone}`} title={user.name}>{user.initials}</span>; }
function DepartmentChip({ department }: { department: Department }) { return <span className={`department-chip ${departmentTone[department]}`}>{department}</span>; }
function RoleChip({ role }: { role: Role }) { return <span className={`role-chip ${role.toLowerCase()}`}>{role === "EMPLOYEE" ? "Employee" : role === "LEAD" ? "Lead" : role}</span>; }
function StatusChip({ status }: { status: string }) { return <span className={`status-chip ${status.toLowerCase().replaceAll(" ", "-")}`}><i />{status}</span>; }
function ActivityRow({ item }: { item: Activity }) { return <div className="activity-row"><span className={`activity-icon ${item.type}`}><NavIcon name={item.type === "task" ? "tasks" : "clock"} /></span><div><strong>{item.actor} · {item.detail || item.state}</strong><p>{item.subject}{item.department ? ` · ${item.department}` : ""}</p><time>{formatRelative(item.occurred_at)}</time></div></div>; }
function Visibility({ role, text }: { role: string; text: string }) { return <div className="visibility-item"><span>✓</span><div><strong>{role}</strong><p>{text}</p></div></div>; }
function ReportCard({ icon, title, text, count, action }: { icon: string; title: string; text: string; count: string; action: () => void }) { return <article className="report-card"><div className="report-icon"><NavIcon name={icon} /></div><span className="mini-label">LIVE EXPORT</span><h2>{title}</h2><p>{text}</p><div><strong>{count}</strong><button className="secondary-btn" onClick={action}>Download CSV ↓</button></div></article>; }
function EmptyState({ icon, title, text, action }: { icon: string; title: string; text: string; action?: React.ReactNode }) { return <div className="empty-state"><span><NavIcon name={icon} /></span><h3>{title}</h3><p>{text}</p>{action}</div>; }

function NavIcon({ name }: { name: string }) {
  const paths: Record<string, React.ReactNode> = {
    overview: <><rect x="3" y="3" width="7" height="7" rx="2" /><rect x="14" y="3" width="7" height="7" rx="2" /><rect x="3" y="14" width="7" height="7" rx="2" /><rect x="14" y="14" width="7" height="7" rx="2" /></>,
    tasks: <><path d="M9 11l2 2 4-5" /><path d="M5 4h14v16H5z" /></>, attendance: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>, clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    departments: <><path d="M3 21V8l9-5 9 5v13" /><path d="M8 21v-7h8v7M8 9h.01M12 9h.01M16 9h.01" /></>, company: <><path d="M3 21V8l9-5 9 5v13" /><path d="M8 21v-7h8v7" /></>, hierarchy: <><circle cx="12" cy="5" r="2" /><circle cx="6" cy="18" r="2" /><circle cx="18" cy="18" r="2" /><path d="M12 7v4M6 16v-3h12v3" /></>, people: <><circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2" /><path d="M3 20c0-4 2-7 6-7s6 3 6 7M15 14c3 0 5 2 5 5" /></>, reports: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>, profile: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-5 3-8 8-8s8 3 8 8" /></>, logout: <><path d="M10 17l5-5-5-5M15 12H3M14 3h7v18h-7" /></>, menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>, shield: <><path d="M12 3l8 4v5c0 5-3 8-8 10-5-2-8-5-8-10V7l8-4z" /><path d="M9 12l2 2 4-5" /></>, progress: <><path d="M4 19V9M10 19V5M16 19v-7M22 19H2" /></>, pulse: <><path d="M3 12h4l2-5 4 10 2-5h6" /></>, development: <><path d="M8 9l-4 3 4 3M16 9l4 3-4 3M14 5l-4 14" /></>, bpo: <><path d="M4 4h16v12H7l-3 3V4z" /><path d="M8 9h8M8 12h5" /></>, documentation: <><path d="M6 3h9l4 4v14H6z" /><path d="M14 3v5h5M9 13h7M9 17h7" /></>, marketing: <><path d="M4 13V9l12-5v14L4 13zM8 14l1 5h4l-2-4" /></>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[name] ?? paths.overview}</svg>;
}

function scopeLabel(data: ERPData) { return data.permissions.scope === "company" ? "All-company view" : data.permissions.scope === "department" ? `${data.user.primaryDepartment} lead view` : "My employee view"; }
function scopeText(data: ERPData) { return data.permissions.scope === "company" ? "Tasks · people · attendance" : data.permissions.scope === "department" ? "Your team + company pulse" : "Your work + company pulse"; }
function useNow() { const [now, setNow] = useState(new Date()); useEffect(() => { const timer = window.setInterval(() => setNow(new Date()), 1000); return () => window.clearInterval(timer); }, []); return now; }
function isOverdue(task: Task) { return task.status !== "Completed" && new Date(task.dueAt).getTime() < Date.now(); }
function relativeDue(task: Task) { const diff = new Date(task.dueAt).getTime() - Date.now(); const days = Math.ceil(Math.abs(diff) / 86400000); if (task.status === "Completed") return "Completed"; if (diff < 0) return `${days} day${days === 1 ? "" : "s"} overdue`; if (days === 0) return "Due today"; return `${days} day${days === 1 ? "" : "s"} left`; }
function formatDate(value: string, full = false) { const date = new Date(value); if (Number.isNaN(date.getTime())) return value; return date.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", weekday: full ? "short" : undefined, day: "2-digit", month: "short", year: full ? "numeric" : undefined, hour: full ? "2-digit" : undefined, minute: full ? "2-digit" : undefined }); }
function formatTime(value: string) { return new Date(value).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" }); }
function duration(start: string, end: string | null, now = new Date()) { const ms = Math.max(0, (end ? new Date(end) : now).getTime() - new Date(start).getTime()); const hours = Math.floor(ms / 3600000); const minutes = Math.floor((ms % 3600000) / 60000); return hours ? `${hours}h ${minutes}m` : `${minutes}m`; }
function formatAttendanceTime(record: Attendance) { return record.clockOut ? `${formatTime(record.clockIn)} – ${formatTime(record.clockOut)}` : `Since ${formatTime(record.clockIn)}`; }
function indiaDateOffset(days: number) { const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(Date.now() + days * 86400000)); const value = Object.fromEntries(parts.map((part) => [part.type, part.value])); return `${value.year}-${value.month}-${value.day}`; }
function toLocalInput(iso: string) { const date = new Date(iso); const part = (number: number) => String(number).padStart(2, "0"); return `${date.getFullYear()}-${part(date.getMonth() + 1)}-${part(date.getDate())}T${part(date.getHours())}:${part(date.getMinutes())}`; }
function formatRelative(value: string) { const diff = Date.now() - new Date(value.endsWith("Z") ? value : `${value}Z`).getTime(); const minutes = Math.max(0, Math.floor(diff / 60000)); if (minutes < 1) return "Just now"; if (minutes < 60) return `${minutes}m ago`; const hours = Math.floor(minutes / 60); if (hours < 24) return `${hours}h ago`; return `${Math.floor(hours / 24)}d ago`; }
function downloadCsv(filename: string, headers: Array<string | number>, rows: Array<Array<string | number>>) { const csv = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n"); const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" })); const link = document.createElement("a"); link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url); }
function defaultDeadline() { const value = new Date(Date.now() + 86400000); value.setHours(18, 0, 0, 0); const part = (number: number) => String(number).padStart(2, "0"); return `${value.getFullYear()}-${part(value.getMonth() + 1)}-${part(value.getDate())}T${part(value.getHours())}:${part(value.getMinutes())}`; }
