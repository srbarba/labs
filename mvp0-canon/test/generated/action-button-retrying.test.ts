// Fase 9, mutation 1: "retrying" was added to the spec after the manual
// control was frozen (Fase 0). This test exists only for the generated
// machine — the manual control has no idea "retrying" exists, so this
// path cannot be asserted against it. See test/shared/ for the one
// invariant that still holds for both, and RESULTS.md for the write-up.
import { describe, expect, it } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useMachine } from "@zag-js/react";
import { actionButtonMachine } from "../../packages/ui/src/actionButton/machine";

describe("ActionButton machine (generated) — retrying state (Fase 9 mutation)", () => {
  it("idle -> pending -> error -> retrying -> success", async () => {
    const { result } = renderHook(() => useMachine(actionButtonMachine, {}));
    act(() => result.current.send({ type: "CLICK" }));
    act(() => result.current.send({ type: "REJECT" }));
    await waitFor(() => expect(result.current.state.matches("error")).toBe(true));

    act(() => result.current.send({ type: "CLICK" }));
    await waitFor(() => expect(result.current.state.matches("retrying")).toBe(true));

    act(() => result.current.send({ type: "RESOLVE" }));
    await waitFor(() => expect(result.current.state.matches("success")).toBe(true));
  });

  it("retrying -> error on a second failure (can retry again)", async () => {
    const { result } = renderHook(() => useMachine(actionButtonMachine, {}));
    act(() => result.current.send({ type: "CLICK" }));
    act(() => result.current.send({ type: "REJECT" }));
    act(() => result.current.send({ type: "CLICK" }));
    await waitFor(() => expect(result.current.state.matches("retrying")).toBe(true));

    act(() => result.current.send({ type: "REJECT" }));
    await waitFor(() => expect(result.current.state.matches("error")).toBe(true));
  });
});
