import { cp, mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

/**
 * The daily job route, `app/api/jobs/reservasjoner`. Tests live under `lib/`,
 * so it is imported from there. Same scratch-copy set-up as the db tests;
 * `revalidatePath` needs a running Next server, so it is stubbed out.
 */

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const originalCwd = process.cwd();
let scratch: string;
let route: typeof import("@/app/api/jobs/reservasjoner/route");

function call(authorization?: string) {
  const headers = authorization ? { authorization } : undefined;
  // The handler only reads headers, so a plain Request stands in for NextRequest.
  return route.POST(
    new Request("http://localhost/api/jobs/reservasjoner", { method: "POST", headers }) as never
  );
}

beforeAll(async () => {
  scratch = await mkdtemp(path.join(os.tmpdir(), "bibliotek-jobs-"));
  await mkdir(path.join(scratch, "data"));
  await cp(path.join(originalCwd, "data/seed.json"), path.join(scratch, "data/seed.json"));

  process.chdir(scratch);
  vi.resetModules();
  route = await import("@/app/api/jobs/reservasjoner/route");
});

afterAll(async () => {
  process.chdir(originalCwd);
  await rm(scratch, { recursive: true, force: true });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("POST /api/jobs/reservasjoner", () => {
  it("does not exist while no secret is configured", async () => {
    vi.stubEnv("CRON_SECRET", "");
    expect((await call("Bearer ")).status).toBe(404);
  });

  it("turns away a caller without the secret", async () => {
    vi.stubEnv("CRON_SECRET", "hemmelig");
    expect((await call()).status).toBe(401);
    expect((await call("Bearer feil")).status).toBe(401);
  });

  it("runs for a caller with the secret", async () => {
    vi.stubEnv("CRON_SECRET", "hemmelig");
    const response = await call("Bearer hemmelig");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ sent: 0 });
  });
});
