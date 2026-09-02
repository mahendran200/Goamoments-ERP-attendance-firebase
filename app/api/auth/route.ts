import {
  changePassword,
  createSession,
  deleteSession,
  findUserByUsername,
  getUserById,
  userFromSession,
  verifyPassword,
} from "../../../db/erp";

function sessionToken(request: Request) {
  const cookie = request.headers.get("cookie") ?? "";
  const match = cookie.match(/(?:^|;\s*)gm_erp_session=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function safeUser<T extends Record<string, unknown>>(row: T) {
  const { password_salt: _salt, password_hash: _hash, ...user } = row;
  return user;
}

function errorResponse(error: unknown, status = 400) {
  return Response.json({ error: error instanceof Error ? error.message : "Unable to sign in" }, { status });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const previewAccounts: Record<string, string> = { gm: "gm.aathish", lead: "lead.development", employee: "dev.kishore" };
  const preview = url.searchParams.get("preview") ?? "";
  if (url.hostname === "terminal.local" && previewAccounts[preview]) {
    const row = await findUserByUsername(previewAccounts[preview]);
    if (!row) return errorResponse(new Error("Preview account is unavailable"), 404);
    const session = await createSession(String(row.id));
    return new Response(null, {
      status: 302,
      headers: {
        location: "/",
        "set-cookie": `gm_erp_session=${encodeURIComponent(session.token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=3600`,
      },
    });
  }
  const user = await userFromSession(sessionToken(request));
  return Response.json({ user });
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { username?: string; password?: string };
    const username = body.username?.trim() ?? "";
    const password = body.password ?? "";
    if (!username || !password) return errorResponse(new Error("Enter your username and password"));
    const row = await findUserByUsername(username);
    if (!row || !(await verifyPassword(password, String(row.password_salt), String(row.password_hash)))) {
      return errorResponse(new Error("Incorrect username or password"), 401);
    }
    const user = await getUserById(String(row.id));
    if (!user) return errorResponse(new Error("This account is inactive"), 403);
    const session = await createSession(user.id);
    const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
    return new Response(JSON.stringify({ user: safeUser(user) }), {
      status: 200,
      headers: {
        "content-type": "application/json",
        "set-cookie": `gm_erp_session=${encodeURIComponent(session.token)}; Path=/; HttpOnly${secure}; SameSite=Lax; Max-Age=43200`,
      },
    });
  } catch (error) {
    return errorResponse(error, 500);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await userFromSession(sessionToken(request));
    if (!user) return errorResponse(new Error("Your session has expired. Sign in again."), 401);
    const body = await request.json() as { currentPassword?: string; newPassword?: string };
    await changePassword(user, body.currentPassword ?? "", body.newPassword ?? "");
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request) {
  const token = sessionToken(request);
  if (token) await deleteSession(token);
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return new Response(JSON.stringify({ ok: true }), {
    headers: {
      "content-type": "application/json",
      "set-cookie": `gm_erp_session=; Path=/; HttpOnly${secure}; SameSite=Lax; Max-Age=0`,
    },
  });
}
