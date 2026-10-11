// Stateless MCP endpoint. Each request builds a fresh server from the OAuth
// grant's props (decrypted in memory by the OAuth provider), so the LMS token
// is never written to storage in plain text.
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";
import { MoodleClient, MoodleError, isoDate, stripHtml, stripToken } from "./moodle";

export interface GrantProps extends Record<string, unknown> {
  accountId: string;
  lmsUrl: string;
  lmsUserId: number;
  lmsToken: string;
}

type ToolResult = { content: { type: "text"; text: string }[]; isError?: boolean };

function json(data: unknown): ToolResult {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 1) }] };
}

function buildServer(env: Env, props: GrantProps): McpServer {
  const lms = new MoodleClient(props.lmsUrl, props.lmsToken);
  const server = new McpServer(
    { name: "mcp4lms", version: "0.1.0" },
    {
      instructions: `Read-only access to the user's courses on their university LMS (${new URL(env.LMS_URL).host}, a Moodle site). Dates are ISO 8601 in UTC.`,
    },
  );

  // Wrap every tool so LMS errors become readable tool errors.
  const run = (fn: () => Promise<unknown>) => async (): Promise<ToolResult> => {
    try {
      return json(await fn());
    } catch (e) {
      const msg =
        e instanceof MoodleError && e.isAuthError
          ? `The LMS connection has expired. Ask the user to reconnect at ${env.PUBLIC_URL}/connect and then reconnect this connector.`
          : `LMS error: ${e instanceof Error ? e.message : String(e)}`;
      return { content: [{ type: "text", text: msg }], isError: true };
    }
  };

  server.registerTool(
    "whoami",
    { title: "Who am I", description: "The signed-in LMS user and site.", annotations: { readOnlyHint: true } },
    run(async () => {
      const s = await lms.siteInfo();
      return { name: s.fullname, site: s.sitename, siteUrl: s.siteurl };
    }),
  );

  server.registerTool(
    "list_courses",
    {
      title: "List courses",
      description: "Courses the user is enrolled in, with their ids.",
      annotations: { readOnlyHint: true },
    },
    run(async () => {
      const courses = await lms.call<any[]>("core_enrol_get_users_courses", { userid: props.lmsUserId });
      return courses.map((c) => ({
        id: c.id,
        shortname: c.shortname,
        fullname: c.fullname,
        progress: c.progress ?? null,
        lastAccess: isoDate(c.lastaccess),
        hidden: !!c.hidden,
      }));
    }),
  );

  server.registerTool(
    "get_course_contents",
    {
      title: "Course contents",
      description: "Sections, activities and files of a course (descriptions shortened).",
      inputSchema: { course_id: z.number().int().describe("Course id from list_courses") },
      annotations: { readOnlyHint: true },
    },
    async ({ course_id }) =>
      run(async () => {
        const sections = await lms.call<any[]>("core_course_get_contents", { courseid: course_id });
        return sections.map((s) => ({
          section: s.name,
          summary: stripHtml(s.summary, 500) || undefined,
          modules: (s.modules ?? [])
            .filter((m: any) => m.uservisible !== false)
            .map((m: any) => ({
              id: m.id,
              type: m.modname,
              name: m.name,
              url: m.url,
              description: stripHtml(m.description, 500) || undefined,
              dates: m.dates?.length
                ? m.dates.map((d: any) => ({ label: d.label, date: isoDate(d.timestamp) }))
                : undefined,
              files: m.contents?.length
                ? m.contents
                    .filter((f: any) => f.type === "file")
                    .map((f: any) => ({ name: f.filename, size: f.filesize, url: stripToken(f.fileurl) }))
                : undefined,
            })),
        }));
      })(),
  );

  server.registerTool(
    "upcoming_deadlines",
    {
      title: "Upcoming deadlines",
      description: "Upcoming events that need action (assignment due dates, quizzes, …).",
      inputSchema: { days: z.number().int().min(1).max(120).default(14).describe("How many days ahead") },
      annotations: { readOnlyHint: true },
    },
    async ({ days }) =>
      run(async () => {
        const now = Math.floor(Date.now() / 1000);
        const res = await lms.call<{ events: any[] }>("core_calendar_get_action_events_by_timesort", {
          timesortfrom: now,
          timesortto: now + days * 86400,
          limitnum: 50,
        });
        return res.events.map((e) => ({
          name: e.name,
          course: e.course?.fullname,
          courseId: e.course?.id,
          type: e.modulename,
          due: isoDate(e.timesort),
          overdue: !!e.overdue,
          actionable: e.action?.actionable ?? null,
          action: e.action?.name ?? null,
          url: e.url,
        }));
      })(),
  );

  server.registerTool(
    "list_assignments",
    {
      title: "List assignments",
      description: "Assignments in one course, or in all enrolled courses when course_id is omitted.",
      inputSchema: { course_id: z.number().int().optional() },
      annotations: { readOnlyHint: true },
    },
    async ({ course_id }) =>
      run(async () => {
        const res = await lms.call<{ courses: any[] }>(
          "mod_assign_get_assignments",
          course_id ? { courseids: [course_id] } : {},
        );
        return res.courses.flatMap((c) =>
          (c.assignments ?? []).map((a: any) => ({
            id: a.id,
            course: c.fullname,
            courseId: c.id,
            name: a.name,
            due: isoDate(a.duedate),
            cutoff: isoDate(a.cutoffdate),
            maxGrade: a.grade,
            intro: stripHtml(a.intro, 1500) || undefined,
            attachments: a.introattachments?.length
              ? a.introattachments.map((f: any) => ({ name: f.filename, url: stripToken(f.fileurl) }))
              : undefined,
          })),
        );
      })(),
  );

  server.registerTool(
    "get_assignment_status",
    {
      title: "Assignment status",
      description: "The user's submission and grading status for one assignment.",
      inputSchema: { assignment_id: z.number().int().describe("Assignment id from list_assignments") },
      annotations: { readOnlyHint: true },
    },
    async ({ assignment_id }) =>
      run(async () => {
        const r = await lms.call<any>("mod_assign_get_submission_status", { assignid: assignment_id });
        const sub = r.lastattempt?.submission;
        return {
          submissionStatus: sub?.status ?? null,
          submittedAt: isoDate(sub?.timemodified),
          gradingStatus: r.lastattempt?.gradingstatus ?? null,
          canSubmit: r.lastattempt?.cansubmit ?? null,
          grade: r.feedback?.gradefordisplay ? stripHtml(r.feedback.gradefordisplay, 200) : null,
          gradedAt: isoDate(r.feedback?.gradeddate),
          feedback:
            r.feedback?.plugins
              ?.flatMap((p: any) => p.editorfields ?? [])
              .map((f: any) => stripHtml(f.text, 1500))
              .filter(Boolean) ?? [],
        };
      })(),
  );

  server.registerTool(
    "get_grades",
    {
      title: "Grades",
      description: "The user's grade items for one course.",
      inputSchema: { course_id: z.number().int() },
      annotations: { readOnlyHint: true },
    },
    async ({ course_id }) =>
      run(async () => {
        const r = await lms.call<{ usergrades: any[] }>("gradereport_user_get_grade_items", {
          courseid: course_id,
          userid: props.lmsUserId,
        });
        return (r.usergrades[0]?.gradeitems ?? []).map((g: any) => ({
          item: g.itemname ?? (g.itemtype === "course" ? "Course total" : g.itemtype),
          type: g.itemmodule ?? g.itemtype,
          grade: g.gradeformatted || null,
          range: g.rangeformatted || null,
          percentage: g.percentageformatted || null,
          weight: g.weightformatted || null,
          feedback: stripHtml(g.feedback, 500) || undefined,
        }));
      })(),
  );

  server.registerTool(
    "get_announcements",
    {
      title: "Announcements",
      description: "Recent posts in a course's announcements forum.",
      inputSchema: {
        course_id: z.number().int(),
        limit: z.number().int().min(1).max(20).default(5),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ course_id, limit }) =>
      run(async () => {
        const forums = await lms.call<any[]>("mod_forum_get_forums_by_courses", { courseids: [course_id] });
        const news = forums.find((f) => f.type === "news");
        if (!news) return [];
        const r = await lms.call<{ discussions: any[] }>("mod_forum_get_forum_discussions", {
          forumid: news.id,
          sortorder: 1, // newest first
          perpage: limit,
          page: 0,
        });
        return r.discussions.map((d) => ({
          subject: d.subject,
          author: d.userfullname,
          posted: isoDate(d.created),
          message: stripHtml(d.message, 3000),
        }));
      })(),
  );

  return server;
}

export const mcpApiHandler = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const props = (ctx as ExecutionContext & { props: GrantProps }).props;
    if (!props?.lmsToken) return new Response("Unauthorized", { status: 401 });
    const server = buildServer(env, props);
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // stateless
      enableJsonResponse: true,
    });
    await server.connect(transport);
    return transport.handleRequest(request);
  },
};
