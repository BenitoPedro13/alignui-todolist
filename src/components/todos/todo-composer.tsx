"use client";

import * as React from "react";
import { format, startOfDay } from "date-fns";

import * as FancyButton from "@/components/ui/fancy-button";
import * as Input from "@/components/ui/input";
import * as Popover from "@/components/ui/popover";
import * as Select from "@/components/ui/select";
import * as Textarea from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/datepicker";
import { toast } from "@/components/ui/toast";
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
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [priority, setPriority] = React.useState<TodoPriority>("normal");
  const [dueDate, setDueDate] = React.useState<Date | undefined>();
  const [isDatePickerOpen, setIsDatePickerOpen] = React.useState(false);

  const [state, formAction, isPending] = React.useActionState(
    createTodoComposerAction,
    INITIAL_STATE,
  );

  const lastStatusRef = React.useRef<ComposerActionState["status"]>(
    INITIAL_STATE.status,
  );

  const titleId = React.useId();
  const descriptionId = React.useId();
  const priorityId = React.useId();
  const dueDateId = React.useId();

  const titleError = getFieldError(state.errors, "title");
  const priorityError = getFieldError(state.errors, "priority");
  const dueDateError = getFieldError(state.errors, "dueDate");

  const resetForm = React.useCallback(() => {
    setTitle("");
    setDescription("");
    setPriority("normal");
    setDueDate(undefined);
    setIsDatePickerOpen(false);
  }, []);

  React.useEffect(() => {
    if (state.status === lastStatusRef.current) {
      return;
    }

    lastStatusRef.current = state.status;

    if (state.status === "success" && state.todo) {
      resetForm();
      setIsExpanded(false);
      toast.success(state.message ?? "Task created successfully.");
      onCreated?.(state.todo);
    } else if (state.status === "error" && state.message) {
      toast.error(state.message);
    }
  }, [onCreated, resetForm, state.message, state.status, state.todo]);

  const canSubmit = title.trim().length > 0 && !isPending;

  const handleToggle = () => {
    setIsExpanded((current) => !current);
  };

  const handleCancel = () => {
    resetForm();
    setIsExpanded(false);
  };

  return (
    <section
      className={cn(
        "space-y-6 rounded-3xl border border-stroke-soft-200/70 bg-bg-white-0/[0.04] p-6 shadow-regular-lg backdrop-blur-sm",
        className,
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-heading-sm text-text-strong-950">Create a task</h2>
          <p className="max-w-xl text-paragraph-sm text-text-sub-600">
            Capture work the moment it comes up. Add details, set a priority, and keep your list tidy.
          </p>
        </div>
        <FancyButton.Root
          type="button"
          variant={isExpanded ? "basic" : "primary"}
          onClick={handleToggle}
        >
          {isExpanded ? "Close" : "New task"}
        </FancyButton.Root>
      </div>

      {isExpanded ? (
        <form action={formAction} className="flex flex-col gap-6">
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
            <label htmlFor={descriptionId} className="text-label-sm text-text-sub-600">
              Description
            </label>
            <Textarea.Root
              id={descriptionId}
              name="description"
              placeholder="Describe the task details"
              value={description}
              onChange={(event) => {
                if (event.target.value.length <= 500) {
                  setDescription(event.target.value);
                }
              }}
              disabled={isPending}
              containerClassName="min-h-[144px]"
              maxLength={500}
            >
              <Textarea.CharCounter current={description.length} max={500} />
            </Textarea.Root>
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
                    <span className="text-label-xs text-text-soft-400">Pick</span>
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

          <div className="flex flex-col gap-3 border-t border-stroke-soft-200/70 pt-4 sm:flex-row sm:justify-end">
            <FancyButton.Root type="button" variant="basic" onClick={handleCancel}>
              Cancel
            </FancyButton.Root>
            <FancyButton.Root type="submit" variant="primary" disabled={!canSubmit}>
              {isPending ? "Saving…" : "Add task"}
            </FancyButton.Root>
          </div>
        </form>
      ) : (
        <div className="rounded-2xl border border-dashed border-stroke-soft-200/60 bg-bg-weak-50/5 p-4 text-paragraph-sm text-text-sub-600">
          Quickly add tasks whenever they pop into your head. Your newest items will appear in the list below.
        </div>
      )}
    </section>
  );
}
