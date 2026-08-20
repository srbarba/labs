import { describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useMachine } from "@zag-js/react";
import type { Machine, MachineSchema } from "@zag-js/core";

/**
 * Behaviour contract extracted from spec/components/action-button.spec.json.
 * Runs identically against the hand-written control machine and the
 * generated one — this is what "functionally equivalent" is checked against
 * (Fase 3's exit criterion), not internal code shape.
 */
export function describeActionButtonMachineBehaviour<T extends MachineSchema>(
  label: string,
  machine: Machine<T>,
) {
  function setup(props?: Partial<T["props"]>) {
    return renderHook(() => useMachine(machine, props as any));
  }

  async function expectState(result: { current: { state: { matches: (...v: any[]) => boolean } } }, state: string) {
    await waitFor(() => expect(result.current.state.matches(state as T["state"])).toBe(true));
  }

  describe(`ActionButton machine behaviour: ${label}`, () => {
    it("starts in idle", async () => {
      const { result } = setup();
      await expectState(result, "idle");
    });

    it("idle --CLICK--> pending --RESOLVE--> success --(AFTER successDuration)--> idle", async () => {
      // Kept comfortably above waitFor's default 50ms poll interval — a
      // shorter duration can let the machine round-trip success -> idle
      // between two polls, so the assertion below would never observe the
      // intermediate "success" state even though it was genuinely visited.
      const { result } = setup({ successDuration: 200 } as Partial<T["props"]>);
      act(() => result.current.send({ type: "CLICK" } as any));
      await expectState(result, "pending");

      act(() => result.current.send({ type: "RESOLVE" } as any));
      await expectState(result, "success");

      await waitFor(() => expect(result.current.state.matches("idle" as T["state"])).toBe(true), { timeout: 2000 });
    });

    it("idle --CLICK--> pending --REJECT--> error --CLICK--> pending (retry)", async () => {
      const { result } = setup();
      act(() => result.current.send({ type: "CLICK" } as any));
      await expectState(result, "pending");

      act(() => result.current.send({ type: "REJECT" } as any));
      await expectState(result, "error");

      act(() => result.current.send({ type: "CLICK" } as any));
      await expectState(result, "pending");
    });

    it("error --DISMISS--> idle", async () => {
      const { result } = setup();
      act(() => result.current.send({ type: "CLICK" } as any));
      await expectState(result, "pending");
      act(() => result.current.send({ type: "REJECT" } as any));
      await expectState(result, "error");
      act(() => result.current.send({ type: "DISMISS" } as any));
      await expectState(result, "idle");
    });

    it("idle --DISABLE--> disabled --ENABLE--> idle", async () => {
      const { result } = setup();
      act(() => result.current.send({ type: "DISABLE" } as any));
      await expectState(result, "disabled");

      act(() => result.current.send({ type: "ENABLE" } as any));
      await expectState(result, "idle");
    });

    it("pending ignores CLICK (no transition declared for it)", async () => {
      const { result } = setup();
      act(() => result.current.send({ type: "CLICK" } as any));
      await expectState(result, "pending");

      act(() => result.current.send({ type: "CLICK" } as any));
      await expectState(result, "pending");
    });

    it("CLICK never reaches pending while constructed with disabled: true", async () => {
      // Implementations are free to route disabled:true straight to the
      // "disabled" state at construction (as the manual control does) or to
      // stay in "idle" and rely purely on the !disabled guard (as the
      // generated machine does) — the spec only promises pending is
      // unreachable either way. See METRICS.md, Fase 3.
      const { result } = setup({ disabled: true } as Partial<T["props"]>);
      act(() => result.current.send({ type: "CLICK" } as any));
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(result.current.state.matches("pending" as T["state"])).toBe(false);
    });
  });
}
