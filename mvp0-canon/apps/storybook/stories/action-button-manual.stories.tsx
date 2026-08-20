import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { ActionButton } from "@mvp0/ui-manual";

/**
 * Fase 0 control: hand-written stories for the hand-written component.
 * Written before any spec exists — nothing here is generated.
 */
const meta: Meta<typeof ActionButton> = {
  title: "Manual/ActionButton",
  component: ActionButton,
  args: {
    children: "Save",
    successDuration: 300,
  },
};

export default meta;
type Story = StoryObj<typeof ActionButton>;

export const Idle: Story = {
  args: {
    onAction: () => new Promise(() => {}),
  },
};

export const Pending: Story = {
  args: {
    onAction: () => new Promise(() => {}),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole("button");
    await userEvent.click(button);
    await waitFor(() => expect(button).toHaveAttribute("data-state", "pending"));
  },
};

export const Success: Story = {
  args: {
    onAction: () => Promise.resolve(),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole("button");
    await userEvent.click(button);
    await waitFor(() => expect(button).toHaveAttribute("data-state", "success"));
  },
};

export const ErrorState: Story = {
  args: {
    onAction: () => Promise.reject(new Error("network error")),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole("button");
    await userEvent.click(button);
    await waitFor(() => expect(button).toHaveAttribute("data-state", "error"));
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    onAction: () => new Promise(() => {}),
  },
};

/** Walks the full reachable graph in one story: idle -> pending -> success -> idle. */
export const FullGraphWalk: Story = {
  args: {
    onAction: () => Promise.resolve(),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole("button");
    await expect(button).toHaveAttribute("data-state", "idle");
    await userEvent.click(button);
    await waitFor(() => expect(button).toHaveAttribute("data-state", "pending"));
    await waitFor(() => expect(button).toHaveAttribute("data-state", "success"));
    await waitFor(() => expect(button).toHaveAttribute("data-state", "idle"), { timeout: 2000 });
  },
};
