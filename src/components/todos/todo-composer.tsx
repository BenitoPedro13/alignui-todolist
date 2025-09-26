"use client";

import * as React from "react";
import { format, startOfDay } from "date-fns";

import * as FancyButton from "@/components/ui/fancy-button";
import * as Input from "@/components/ui/input";
import * as Popover from "@/components/ui/popover";
import * as Select from "@/components/ui/select";
import * as Textarea from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/datepicker";
import { cn } from "@/utils/cn";
import { type Todo, type TodoPriority } from "@/lib/todo-repository";
import {
  PRIORITY_OPTIONS,
  type ComposerActionState,
  type FieldError,
  type FieldName,
} from "./todo-composer-shared";
import { createTodoComposerAction } from "./todo-composer.action";

const INITIAL_STATE: ComposerActionState = {
  status: "idle",
  todo: null,
};

const getFieldError = (errors: FieldError[] | undefined, field: FieldName) => {
  return errors?.find((error) => error.field === field)?.message;
};

const formatDueDateLabel = (date: Date | undefined) => {
  if (!date) {
    return "Select a due date";
  }

  return format(date, "PPP");
};

const toIsoDateValue = (date: Date | undefined) => {
  if (!date) {
    return "";
  }

  return startOfDay(date).toISOString();
};

type TodoComposerProps = {
  onCreated?: (todo: Todo) => void;
  className?: string;
};

export default function TodoComposer({
  onCreated,
  className,
}: TodoComposerProps) {
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [priority, setPriority] = React.useState<TodoPriority>("normal");
  const [dueDate, setDueDate] = React.useState<Date | undefined>();
  const [isDatePickerOpen, setIsDatePickerOpen] = React.useState(false);

  const [state, formAction, isPending] = React.useActionState(
    createTodoComposerAction,
    INITIAL_STATE,
  );

  const titleId = React.useId();
  const descriptionId = React.useId();
  const priorityId = React.useId();
  const dueDateId = React.useId();

  const titleError = getFieldError(state.errors, "title");
  const priorityError = getFieldError(state.errors, "priority");
  const dueDateError = getFieldError(state.errors, "dueDate");

  React.useEffect(() => {
    if (state.status === "success" && state.todo) {
      setTitle("");
      setDescription("");
      setPriority("normal");
      setDueDate(undefined);
      setIsDatePickerOpen(false);
      onCreated?.(state.todo);
    }
  }, [state, onCreated]);

  const canSubmit = title.trim().length > 0 && !isPending;

  return (
    <form
      action={formAction}
      className={cn(
        "space-y-6 rounded-2xl border border-stroke-soft-200 p-6 shadow-regular-md",
        className,
      )}
    >
      <div className="space-y-1.5">
        <label htmlFor={titleId} className="text-label-sm text-text-sub-600">
          Title
        </label>
        <Input.Root hasError={Boolean(titleError)}>
          <Input.Wrapper>
            <Input.Input
              id={titleId}
              name="title"
              placeholder="Add a new task title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              aria-invalid={Boolean(titleError) || undefined}
              aria-describedby={titleError ? `${titleId}-error` : undefined}
              disabled={isPending}
            />
          </Input.Wrapper>
        </Input.Root>
        {titleError ? (
          <p
            id={`${titleId}-error`}
            className="text-label-xs text-error-base"
          >
            {titleError}
          </p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor={descriptionId}
          className="text-label-sm text-text-sub-600"
        >
          Description
        </label>
        <Textarea.Root
          id={descriptionId}
          name="description"
          placeholder="Describe the task details"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          disabled={isPending}
          containerClassName="min-h-[144px]"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor={priorityId} className="text-label-sm text-text-sub-600">
            Priority
          </label>
          <Select.Root
            name="priority"
            value={priority}
            onValueChange={(value) => setPriority(value as TodoPriority)}
            disabled={isPending}
            hasError={Boolean(priorityError)}
          >
            <Select.Trigger
              id={priorityId}
              aria-describedby={priorityError ? `${priorityId}-error` : undefined}
            >
              <Select.Value placeholder="Select priority" />
            </Select.Trigger>
            <Select.Content>
              {PRIORITY_OPTIONS.map((option) => (
                <Select.Item key={option.value} value={option.value}>
                  {option.label}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
          {priorityError ? (
            <p
              id={`${priorityId}-error`}
              className="text-label-xs text-error-base"
            >
              {priorityError}
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <label htmlFor={dueDateId} className="text-label-sm text-text-sub-600">
            Due date
          </label>
          <input type="hidden" name="dueDate" value={toIsoDateValue(dueDate)} />
          <Popover.Root open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
            <Popover.Trigger asChild>
              <button
                type="button"
                id={dueDateId}
                className={cn(
                  "flex h-10 w-full items-center justify-between rounded-10 border border-stroke-soft-200 px-3 text-left text-paragraph-sm text-text-sub-600 shadow-regular-xs transition",
                  "hover:bg-bg-weak-50 hover:border-transparent",
                  dueDateError && "border-error-base",
                  dueDate && "text-text-strong-950",
                  isPending && "cursor-not-allowed opacity-70",
                )}
                aria-describedby={dueDateError ? `${dueDateId}-error` : undefined}
                disabled={isPending}
              >
                <span>{formatDueDateLabel(dueDate)}</span>
                {/* <span className="text-label-xs text-text-soft-400">Pick</span> */}
              </button>
            </Popover.Trigger>
            <Popover.Content className="p-0" side="bottom" align="start">
              <Calendar
                mode="single"
                selected={dueDate}
                onSelect={(date) => {
                  setDueDate(date ? startOfDay(date) : undefined);
                  if (date) {
                    setIsDatePickerOpen(false);
                  }
                }}
                disabled={(date) => startOfDay(date) < startOfDay(new Date())}
              />
              <div className="flex items-center justify-between border-t border-stroke-soft-200 bg-bg-weak-50 px-4 py-3">
                <button
                  type="button"
                  className="text-label-xs text-text-soft-400 underline-offset-2 hover:text-text-strong-950 hover:underline"
                  onClick={() => {
                    setDueDate(undefined);
                    setIsDatePickerOpen(false);
                  }}
                >
                  Clear date
                </button>
                <FancyButton.Root
                  type="button"
                  size="xsmall"
                  variant="primary"
                  onClick={() => setIsDatePickerOpen(false)}
                >
                  Done
                </FancyButton.Root>
              </div>
            </Popover.Content>
          </Popover.Root>
          {dueDateError ? (
            <p
              id={`${dueDateId}-error`}
              className="text-label-xs text-error-base"
            >
              {dueDateError}
            </p>
          ) : null}
        </div>
      </div>

      {state.message ? (
        <p
          className={cn(
            "text-label-sm",
            state.status === "success"
              ? "text-primary-base"
              : state.status === "error"
                ? "text-error-base"
                : "text-text-sub-600",
          )}
        >
          {state.message}
        </p>
      ) : null}

      <div className="flex justify-end gap-3">
        <FancyButton.Root
          type="submit"
          variant="primary"
          disabled={!canSubmit}
        >
          {isPending ? "Saving…" : "Add task"}
        </FancyButton.Root>
      </div>
    </form>
  );
}
