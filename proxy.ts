import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, isValidSessionToken } from "@/lib/auth";

// Matches /api/webinars/<id> but not deeper paths like
// /api/webinars/<id>/close or /api/webinars/<id>/participants/<identity> —
// those (close, participant invite/revoke) stay reachable by the host during
// a live call, which never has an admin session.
const WEBINAR_ITEM_PATH = /^\/api\/webinars\/[^/]+$/;
const WEBINAR_CLOSE_PATH = /^\/api\/webinars\/[^/]+\/close$/;

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authed = isValidSessionToken(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);

  if (pathname === "/admin/login") {
    if (authed) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    return NextResponse.next();
  }

  // "/" only exists to link into the admin dashboard — real viewers and
  // hosts always arrive via direct /watch or /host links, never the
  // homepage — so it's gated the same as /admin itself.
  if (pathname === "/admin" || pathname === "/") {
    if (!authed) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    return NextResponse.next();
  }

  let needsAuth = false;
  if (pathname === "/api/webinars") {
    needsAuth = true; // list (GET) and create (POST) are both admin-only
  } else if (WEBINAR_ITEM_PATH.test(pathname)) {
    needsAuth = request.method !== "GET"; // GET stays public for watch/host prejoin
  } else if (WEBINAR_CLOSE_PATH.test(pathname)) {
    needsAuth = true;
  }

  if (needsAuth && !authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/admin", "/admin/login", "/api/webinars", "/api/webinars/:path*"],
};
