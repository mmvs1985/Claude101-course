import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/actions", () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: vi.fn(),
  clearAnonWork: vi.fn(),
}));

vi.mock("@/actions/get-projects", () => ({
  getProjects: vi.fn(),
}));

vi.mock("@/actions/create-project", () => ({
  createProject: vi.fn(),
}));

import { signIn as signInAction, signUp as signUpAction } from "@/actions";
import { getAnonWorkData, clearAnonWork } from "@/lib/anon-work-tracker";
import { getProjects } from "@/actions/get-projects";
import { createProject } from "@/actions/create-project";
import { useAuth } from "@/hooks/use-auth";

describe("useAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("initial state", () => {
    test("isLoading starts as false", () => {
      const { result } = renderHook(() => useAuth());
      expect(result.current.isLoading).toBe(false);
    });

    test("exposes signIn and signUp functions", () => {
      const { result } = renderHook(() => useAuth());
      expect(typeof result.current.signIn).toBe("function");
      expect(typeof result.current.signUp).toBe("function");
    });
  });

  describe("signIn", () => {
    test("passes email and password to signInAction", async () => {
      (signInAction as any).mockResolvedValue({ success: false, error: "Invalid credentials" });

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signIn("test@example.com", "password123");
      });

      expect(signInAction).toHaveBeenCalledWith("test@example.com", "password123");
    });

    test("returns the result on success", async () => {
      (signInAction as any).mockResolvedValue({ success: true });
      (getAnonWorkData as any).mockReturnValue(null);
      (getProjects as any).mockResolvedValue([{ id: "proj-1" }]);

      const { result } = renderHook(() => useAuth());
      let returnValue: any;
      await act(async () => {
        returnValue = await result.current.signIn("test@example.com", "password");
      });

      expect(returnValue).toEqual({ success: true });
    });

    test("returns the result on failure", async () => {
      (signInAction as any).mockResolvedValue({ success: false, error: "Invalid credentials" });

      const { result } = renderHook(() => useAuth());
      let returnValue: any;
      await act(async () => {
        returnValue = await result.current.signIn("test@example.com", "wrong");
      });

      expect(returnValue).toEqual({ success: false, error: "Invalid credentials" });
    });

    test("sets isLoading to true while the action is in flight", async () => {
      let resolveSignIn: (value: any) => void;
      (signInAction as any).mockImplementation(
        () => new Promise((resolve) => { resolveSignIn = resolve; })
      );

      const { result } = renderHook(() => useAuth());

      let signInPromise: Promise<any>;
      act(() => {
        signInPromise = result.current.signIn("test@example.com", "pass");
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolveSignIn!({ success: false });
        await signInPromise!;
      });

      expect(result.current.isLoading).toBe(false);
    });

    test("resets isLoading to false even when signInAction throws", async () => {
      (signInAction as any).mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        try {
          await result.current.signIn("test@example.com", "password");
        } catch {}
      });

      expect(result.current.isLoading).toBe(false);
    });

    test("does not call handlePostSignIn on failure", async () => {
      (signInAction as any).mockResolvedValue({ success: false, error: "Invalid credentials" });

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signIn("test@example.com", "wrong");
      });

      expect(getAnonWorkData).not.toHaveBeenCalled();
      expect(getProjects).not.toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe("signUp", () => {
    test("passes email and password to signUpAction", async () => {
      (signUpAction as any).mockResolvedValue({ success: false, error: "Email already registered" });

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signUp("test@example.com", "password123");
      });

      expect(signUpAction).toHaveBeenCalledWith("test@example.com", "password123");
    });

    test("returns the result on success", async () => {
      (signUpAction as any).mockResolvedValue({ success: true });
      (getAnonWorkData as any).mockReturnValue(null);
      (getProjects as any).mockResolvedValue([]);
      (createProject as any).mockResolvedValue({ id: "new-proj" });

      const { result } = renderHook(() => useAuth());
      let returnValue: any;
      await act(async () => {
        returnValue = await result.current.signUp("new@example.com", "password123");
      });

      expect(returnValue).toEqual({ success: true });
    });

    test("returns the result on failure", async () => {
      (signUpAction as any).mockResolvedValue({ success: false, error: "Email already registered" });

      const { result } = renderHook(() => useAuth());
      let returnValue: any;
      await act(async () => {
        returnValue = await result.current.signUp("existing@example.com", "password123");
      });

      expect(returnValue).toEqual({ success: false, error: "Email already registered" });
    });

    test("sets isLoading to true while the action is in flight", async () => {
      let resolveSignUp: (value: any) => void;
      (signUpAction as any).mockImplementation(
        () => new Promise((resolve) => { resolveSignUp = resolve; })
      );

      const { result } = renderHook(() => useAuth());

      let signUpPromise: Promise<any>;
      act(() => {
        signUpPromise = result.current.signUp("test@example.com", "pass");
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolveSignUp!({ success: false });
        await signUpPromise!;
      });

      expect(result.current.isLoading).toBe(false);
    });

    test("resets isLoading to false even when signUpAction throws", async () => {
      (signUpAction as any).mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        try {
          await result.current.signUp("test@example.com", "password");
        } catch {}
      });

      expect(result.current.isLoading).toBe(false);
    });

    test("does not call handlePostSignIn on failure", async () => {
      (signUpAction as any).mockResolvedValue({ success: false, error: "Email already registered" });

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signUp("existing@example.com", "password123");
      });

      expect(getAnonWorkData).not.toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe("handlePostSignIn — anonymous work", () => {
    test("creates a project from anon messages and fileSystemData", async () => {
      const anonData = {
        messages: [{ role: "user", content: "Build me a button" }],
        fileSystemData: { "/App.jsx": { type: "file", content: "export default () => <button/>" } },
      };
      (signInAction as any).mockResolvedValue({ success: true });
      (getAnonWorkData as any).mockReturnValue(anonData);
      (createProject as any).mockResolvedValue({ id: "anon-proj-1" });

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signIn("test@example.com", "password");
      });

      expect(createProject).toHaveBeenCalledWith({
        name: expect.stringMatching(/^Design from /),
        messages: anonData.messages,
        data: anonData.fileSystemData,
      });
    });

    test("navigates to the newly created project", async () => {
      (signInAction as any).mockResolvedValue({ success: true });
      (getAnonWorkData as any).mockReturnValue({
        messages: [{ role: "user", content: "test" }],
        fileSystemData: {},
      });
      (createProject as any).mockResolvedValue({ id: "anon-proj-42" });

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signIn("test@example.com", "password");
      });

      expect(mockPush).toHaveBeenCalledWith("/anon-proj-42");
    });

    test("clears anon work after creating the project", async () => {
      (signInAction as any).mockResolvedValue({ success: true });
      (getAnonWorkData as any).mockReturnValue({
        messages: [{ role: "user", content: "test" }],
        fileSystemData: {},
      });
      (createProject as any).mockResolvedValue({ id: "anon-proj-1" });

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signIn("test@example.com", "password");
      });

      expect(clearAnonWork).toHaveBeenCalledOnce();
    });

    test("does not call getProjects when anon work exists", async () => {
      (signInAction as any).mockResolvedValue({ success: true });
      (getAnonWorkData as any).mockReturnValue({
        messages: [{ role: "user", content: "test" }],
        fileSystemData: {},
      });
      (createProject as any).mockResolvedValue({ id: "anon-proj-1" });

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signIn("test@example.com", "password");
      });

      expect(getProjects).not.toHaveBeenCalled();
    });

    test("skips anon work path when messages array is empty", async () => {
      (signInAction as any).mockResolvedValue({ success: true });
      (getAnonWorkData as any).mockReturnValue({ messages: [], fileSystemData: {} });
      (getProjects as any).mockResolvedValue([{ id: "existing-proj" }]);

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signIn("test@example.com", "password");
      });

      expect(createProject).not.toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/existing-proj");
    });

    test("skips anon work path when getAnonWorkData returns null", async () => {
      (signInAction as any).mockResolvedValue({ success: true });
      (getAnonWorkData as any).mockReturnValue(null);
      (getProjects as any).mockResolvedValue([{ id: "existing-proj" }]);

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signIn("test@example.com", "password");
      });

      expect(createProject).not.toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/existing-proj");
    });
  });

  describe("handlePostSignIn — existing projects, no anon work", () => {
    test("navigates to the first (most recent) project", async () => {
      (signInAction as any).mockResolvedValue({ success: true });
      (getAnonWorkData as any).mockReturnValue(null);
      (getProjects as any).mockResolvedValue([
        { id: "proj-recent" },
        { id: "proj-older" },
      ]);

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signIn("test@example.com", "password");
      });

      expect(mockPush).toHaveBeenCalledWith("/proj-recent");
    });

    test("does not create a new project when existing projects are found", async () => {
      (signInAction as any).mockResolvedValue({ success: true });
      (getAnonWorkData as any).mockReturnValue(null);
      (getProjects as any).mockResolvedValue([{ id: "proj-1" }]);

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signIn("test@example.com", "password");
      });

      expect(createProject).not.toHaveBeenCalled();
    });

    test("works the same way after signUp", async () => {
      (signUpAction as any).mockResolvedValue({ success: true });
      (getAnonWorkData as any).mockReturnValue(null);
      (getProjects as any).mockResolvedValue([{ id: "proj-signup" }]);

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signUp("new@example.com", "password123");
      });

      expect(mockPush).toHaveBeenCalledWith("/proj-signup");
    });
  });

  describe("handlePostSignIn — no anon work, no existing projects", () => {
    test("creates a blank project with empty messages and data", async () => {
      (signInAction as any).mockResolvedValue({ success: true });
      (getAnonWorkData as any).mockReturnValue(null);
      (getProjects as any).mockResolvedValue([]);
      (createProject as any).mockResolvedValue({ id: "brand-new" });

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signIn("test@example.com", "password");
      });

      expect(createProject).toHaveBeenCalledWith({
        name: expect.stringMatching(/^New Design #\d+/),
        messages: [],
        data: {},
      });
    });

    test("navigates to the newly created blank project", async () => {
      (signInAction as any).mockResolvedValue({ success: true });
      (getAnonWorkData as any).mockReturnValue(null);
      (getProjects as any).mockResolvedValue([]);
      (createProject as any).mockResolvedValue({ id: "brand-new" });

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signIn("test@example.com", "password");
      });

      expect(mockPush).toHaveBeenCalledWith("/brand-new");
    });

    test("does not clear anon work when creating a blank project", async () => {
      (signInAction as any).mockResolvedValue({ success: true });
      (getAnonWorkData as any).mockReturnValue(null);
      (getProjects as any).mockResolvedValue([]);
      (createProject as any).mockResolvedValue({ id: "brand-new" });

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signIn("test@example.com", "password");
      });

      expect(clearAnonWork).not.toHaveBeenCalled();
    });
  });
});
