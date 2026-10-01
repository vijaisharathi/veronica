import { describe, it, expect } from "vitest";
import { GET } from "@/app/api/health/route";

describe("Health Check API (Integration)", () => {
  it("should respond with 200 OK and standard health payload", async () => {
    const response = await GET();

    expect(response.status).toBe(200);

    const body = await response.json();

    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
    expect(body.data.status).toBe("ok");
    expect(body.data.service).toBe("VÉRONA");
    expect(typeof body.data.uptime).toBe("number");
    expect(body.data.database).toBeDefined();
    expect(typeof body.data.database.status).toBe("string");
    expect(typeof body.data.database.connected).toBe("boolean");
  });

  it("should enforce no-cache headers on health response", async () => {
    const response = await GET();
    const cacheControl = response.headers.get("Cache-Control");

    expect(cacheControl).toContain("no-store");
  });
});
