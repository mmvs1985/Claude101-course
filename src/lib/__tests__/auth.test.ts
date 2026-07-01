import { test, expect, vi, beforeEach } from "vitest";
import { jwtVerify } from "jose";

const mockSet = vi.fn();

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({ set: mockSet }),
}));

// Import after mocks are set up
const { createSession } = await import("@/lib/auth");

const JWT_SECRET = new TextEncoder().encode("development-secret-key");

beforeEach(() => {
  mockSet.mockClear();
});

test("createSession sets an auth-token cookie", async () => {
  await createSession("user-1", "test@example.com");

  expect(mockSet).toHaveBeenCalledOnce();
  expect(mockSet.mock.calls[0][0]).toBe("auth-token");
});

test("createSession sets httpOnly, sameSite, and path cookie options", async () => {
  await createSession("user-1", "test@example.com");

  const options = mockSet.mock.calls[0][2];
  expect(options.httpOnly).toBe(true);
  expect(options.sameSite).toBe("lax");
  expect(options.path).toBe("/");
});

test("createSession sets secure:false outside production", async () => {
  await createSession("user-1", "test@example.com");

  const options = mockSet.mock.calls[0][2];
  expect(options.secure).toBe(false);
});

test("createSession token contains userId and email", async () => {
  await createSession("user-42", "hello@example.com");

  const token = mockSet.mock.calls[0][1];
  const { payload } = await jwtVerify(token, JWT_SECRET);

  expect(payload.userId).toBe("user-42");
  expect(payload.email).toBe("hello@example.com");
});

test("createSession sets cookie expiry ~7 days from now", async () => {
  const before = Date.now();
  await createSession("user-1", "test@example.com");
  const after = Date.now();

  const options = mockSet.mock.calls[0][2];
  const expiresMs = options.expires.getTime();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

  expect(expiresMs).toBeGreaterThanOrEqual(before + sevenDaysMs);
  expect(expiresMs).toBeLessThanOrEqual(after + sevenDaysMs);
});
