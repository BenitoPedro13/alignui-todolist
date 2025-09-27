"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  RiCalendarEventLine,
  RiErrorWarningLine,
  RiInformationLine,
  RiMore2Fill,
  RiEdit2Line,
  RiDeleteBinLine,
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiArrowLeftDoubleLine,
  RiArrowRightDoubleLine,
} from "@remixicon/react";
import { format, isPast, isToday, parseISO, startOfDay } from "date-fns";

import * as Badge from "@/components/ui/badge";
import * as ButtonGroup from "@/components/ui/button-group";
import * as Checkbox from "@/components/ui/checkbox";
import * as CompactButton from "@/components/ui/compact-button";
import * as Dropdown from "@/components/ui/dropdown";
import * as FancyButton from "@/components/ui/fancy-button";
import * as Hint from "@/components/ui/hint";
import * as Input from "@/components/ui/input";
import * as Modal from "@/components/ui/modal";
import * as Popover from "@/components/ui/popover";
import * as ProgressBar from "@/components/ui/progress-bar";
import * as ProgressCircle from "@/components/ui/progress-circle";
import * as SegmentedControl from "@/components/ui/segmented-control";
import * as Select from "@/components/ui/select";
import * as Textarea from "@/components/ui/textarea";
import * as ToastAlert from "@/components/ui/toast-alert";
import * as Pagination from "@/components/ui/pagination";
import { Calendar } from "@/components/ui/datepicker";
import { cn } from "@/utils/cn";
import { toast } from "@/components/ui/toast";
import type { Todo } from "@/lib/todo-repository";

import {
  toggleTodoCompletionAction,
  updateTodoAction,
  deleteTodoAction,
} from "./todo-list.actions";
import { PRIORITY_OPTIONS } from "./todo-composer-shared";

const PAGE_SIZE_OPTIONS = [5, 10] as const;

type ToastStatus = React.ComponentProps<typeof ToastAlert.Root>["status"];

type FilterValue = "all" | "active" | "completed" | "overdue";

type ListApi = {
  addTodo: (todo: Todo) => void;
};

type TodoListClientProps = {
  initialTodos: Todo[];
  onProvideApi?: (api: ListApi | null) => void;
};

type BadgeColor =
  | "gray"
  | "blue"
  | "orange"
  | "red"
  | "green"
  | "yellow"
  | "purple"
  | "sky"
  | "pink"
  | "teal";

type PriorityConfig = {
  label: string;
  badgeColor: BadgeColor;
};

const PRIORITY_CONFIG: Record<Todo["priority"], PriorityConfig> = {
  low: { label: "Low priority", badgeColor: "green" },
  normal: { label: "Normal priority", badgeColor: "blue" },
  high: { label: "High priority", badgeColor: "red" },
};

const normalizeDate = (value: string | null) => {
  if (!value) {
    return null;
  }
  try {
    const parsedIso = parseISO(value);
    if (!Number.isNaN(parsedIso.getTime())) {
      return parsedIso;
    }
  } catch {
    // fall through to generic parsing below
  }

  const fallback = new Date(value);
  if (Number.isNaN(fallback.getTime())) {
    return null;
  }
  return fallback;
};

const TIMESTAMP_WITHOUT_TZ = /\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/;

const parseTimestamp = (value: string) => {
  const normalizedValue = TIMESTAMP_WITHOUT_TZ.test(value) ? `${value}Z` : value;
  const parsed = new Date(normalizedValue);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
};

const formatDueDateLabel = (date?: Date) => {
  if (!date) {
    return "Select a due date";
  }

  return format(date, "PPP");
};

const toIsoDateValue = (date?: Date) =>
  date ? startOfDay(date).toISOString() : null;

export function TodoListClient({
  initialTodos,
  onProvideApi,
}: TodoListClientProps) {
  const router = useRouter();
  const [todos, setTodos] = React.useState(initialTodos);
  const [pendingIds, setPendingIds] = React.useState<Set<number>>(new Set());
  const [isTogglePending, startToggleTransition] = React.useTransition();
  const [isEditPending, startEditTransition] = React.useTransition();
  const [isDeletePending, startDeleteTransition] = React.useTransition();

  const [pageSize, setPageSize] = React.useState<number>(PAGE_SIZE_OPTIONS[0]);
  const [currentPage, setCurrentPage] = React.useState(1);

  const [editingTodo, setEditingTodo] = React.useState<Todo | null>(null);
  const [editTitle, setEditTitle] = React.useState("");
  const [editDescription, setEditDescription] = React.useState("");
  const [editPriority, setEditPriority] =
    React.useState<Todo["priority"]>("normal");
  const [editDueDate, setEditDueDate] = React.useState<Date | undefined>();
  const [isEditDatePickerOpen, setIsEditDatePickerOpen] = React.useState(false);
  const [editErrors, setEditErrors] = React.useState<{ title?: string }>({});

  const [todoToDelete, setTodoToDelete] = React.useState<Todo | null>(null);

  const [isSelectionMode, setIsSelectionMode] = React.useState(false);
  const [selectedIds, setSelectedIds] = React.useState<Set<number>>(new Set());
  const [filter, setFilter] = React.useState<FilterValue>("all");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [isBulkPending, startBulkTransition] = React.useTransition();

  React.useEffect(() => {
    setTodos(initialTodos);
    setCurrentPage(1);
    setSelectedIds(new Set());
  }, [initialTodos]);

  React.useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(todos.length / pageSize));
    setCurrentPage((page) => Math.min(page, totalPages));
    setSelectedIds((current) => {
      if (current.size === 0) {
        return current;
      }
      const validIds = new Set<number>();
      for (const todo of todos) {
        if (current.has(todo.id)) {
          validIds.add(todo.id);
        }
      }
      return validIds;
    });
    if (todos.length === 0) {
      setIsSelectionMode(false);
    }
  }, [todos, pageSize]);

  const updatePendingIds = React.useCallback(
    (updater: (set: Set<number>) => void) => {
      setPendingIds((current) => {
        const next = new Set(current);
        updater(next);
        return next;
      });
    },
    []
  );

  const toggleSelectionMode = React.useCallback(() => {
    setIsSelectionMode((prev) => {
      if (prev) {
        setSelectedIds(new Set());
      }
      return !prev;
    });
  }, []);

  const updateSelectedIds = React.useCallback(
    (id: number, checked: boolean) => {
      setSelectedIds((current) => {
        const next = new Set(current);
        if (checked) {
          next.add(id);
        } else {
          next.delete(id);
        }
        return next;
      });
    },
    []
  );

  const showToastAlert = React.useCallback(
    (status: ToastStatus, message: string) => {
      toast.custom((t) => (
        <ToastAlert.Root t={t} status={status} message={message} />
      ));
    },
    []
  );

  const handleAddTodo = React.useCallback((todo: Todo) => {
    setTodos((current) => {
      if (current.some((existing) => existing.id === todo.id)) {
        return current;
      }
      return [todo, ...current];
    });
    setCurrentPage(1);
    setSelectedIds(new Set());
    setIsSelectionMode(false);
  }, []);

  React.useEffect(() => {
    onProvideApi?.({ addTodo: handleAddTodo });
    return () => {
      onProvideApi?.(null);
    };
  }, [handleAddTodo, onProvideApi]);

  const handleToggle = React.useCallback(
    (todo: Todo) => {
      if (isSelectionMode) {
        setSelectedIds((current) => {
          const next = new Set(current);
          if (next.has(todo.id)) {
            next.delete(todo.id);
          } else {
            next.add(todo.id);
          }
          return next;
        });
        return;
      }

      const nextCompleted = !todo.isCompleted;
      const optimisticTodo = { ...todo, isCompleted: nextCompleted };

      setTodos((current) =>
        current.map((item) => (item.id === todo.id ? optimisticTodo : item))
      );
      updatePendingIds((set) => set.add(todo.id));

      startToggleTransition(async () => {
        try {
          const updated = await toggleTodoCompletionAction(
            todo.id,
            nextCompleted
          );
          if (!updated) {
            throw new Error("Update returned null");
          }
          setTodos((current) =>
            current.map((item) => (item.id === todo.id ? updated : item))
          );
          router.refresh();
          showToastAlert(
            "success",
            nextCompleted
              ? "Task marked as completed."
              : "Task marked as active."
          );
        } catch (error) {
          console.error("Failed to toggle todo completion state", error);
          setTodos((current) =>
            current.map((item) =>
              item.id === todo.id
                ? { ...item, isCompleted: todo.isCompleted }
                : item
            )
          );
          showToastAlert(
            "error",
            "Unable to update task status. Please try again."
          );
        } finally {
          updatePendingIds((set) => set.delete(todo.id));
        }
      });
    },
    [isSelectionMode, router, showToastAlert, updatePendingIds]
  );

  const handleBulkComplete = React.useCallback(() => {
    if (selectedIds.size === 0) {
      return;
    }

    const ids = Array.from(selectedIds);
    startBulkTransition(async () => {
      try {
        const updatedTodos = await Promise.all(
          ids.map((id) => updateTodoAction(id, { isCompleted: true }))
        );
        setTodos((current) =>
          current.map((item) => {
            const updated = updatedTodos.find(
              (todo) => todo && todo.id === item.id
            );
            return updated ?? item;
          })
        );
        setSelectedIds(new Set());
        setIsSelectionMode(false);
        router.refresh();
        showToastAlert("success", "Selected tasks marked as completed.");
      } catch (error) {
        console.error("Failed to complete selected tasks", error);
        showToastAlert("error", "Unable to complete selected tasks.");
      }
    });
  }, [router, selectedIds, showToastAlert]);

  const handleBulkDelete = React.useCallback(() => {
    if (selectedIds.size === 0) {
      return;
    }

    const ids = Array.from(selectedIds);
    startBulkTransition(async () => {
      try {
        await Promise.all(ids.map((id) => deleteTodoAction(id)));
        setTodos((current) => current.filter((item) => !ids.includes(item.id)));
        setSelectedIds(new Set());
        setIsSelectionMode(false);
        router.refresh();
        showToastAlert("success", "Selected tasks deleted.");
      } catch (error) {
        console.error("Failed to delete selected tasks", error);
        showToastAlert("error", "Unable to delete selected tasks.");
      }
    });
  }, [router, selectedIds, showToastAlert]);

  const filteredTodos = React.useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    return todos.filter((todo) => {
      const matchesQuery = normalizedQuery
        ? todo.title.toLowerCase().includes(normalizedQuery)
        : true;

      if (!matchesQuery) {
        return false;
      }

      const dueDate = normalizeDate(todo.dueDate);
      const isOverdue = Boolean(
        dueDate && !todo.isCompleted && isPast(dueDate) && !isToday(dueDate)
      );

      switch (filter) {
        case "active":
          return !todo.isCompleted && !isOverdue;
        case "completed":
          return todo.isCompleted;
        case "overdue":
          return isOverdue;
        default:
          return true;
      }
    });
  }, [filter, searchQuery, todos]);

  const { total, completed, active, overdue, percentage } =
    React.useMemo(() => {
      const total = filteredTodos.length;
      let completed = 0;
      let overdue = 0;

      for (const todo of filteredTodos) {
        if (todo.isCompleted) {
          completed += 1;
          continue;
        }

        const dueDate = normalizeDate(todo.dueDate);
        if (dueDate && isPast(dueDate) && !isToday(dueDate)) {
          overdue += 1;
        }
      }

      const active = total - completed;
      const percentage =
        total === 0 ? 0 : Math.round((completed / total) * 100);

      return { total, completed, active, overdue, percentage };
    }, [filteredTodos]);

  const totalPages = Math.max(1, Math.ceil(filteredTodos.length / pageSize));
  const paginatedTodos = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTodos.slice(start, start + pageSize);
  }, [filteredTodos, currentPage, pageSize]);

  const selectedCount = selectedIds.size;

  const paginationItems = React.useMemo(() => {
    const total = totalPages;
    const current = currentPage;

    if (total <= 7) {
      return Array.from({ length: total }, (_, index) => index + 1);
    }

    const items: (number | string)[] = [1];
    const left = Math.max(2, current - 1);
    const right = Math.min(total - 1, current + 1);

    if (left > 2) {
      items.push('ellipsis-left');
    }

    for (let page = left; page <= right; page += 1) {
      items.push(page);
    }

    if (right < total - 1) {
      items.push('ellipsis-right');
    }

    items.push(total);
    return items;
  }, [currentPage, totalPages]);

  React.useEffect(() => {
    setCurrentPage(1);
    setSelectedIds(new Set());
    setIsSelectionMode(false);
  }, [filter, searchQuery, pageSize]);

  const openEditModal = React.useCallback((todo: Todo) => {
    const dueDate = normalizeDate(todo.dueDate) ?? undefined;

    setEditingTodo(todo);
    setEditTitle(todo.title);
    setEditDescription(todo.description ?? "");
    setEditPriority(todo.priority);
    setEditDueDate(dueDate);
    setIsEditDatePickerOpen(false);
    setEditErrors({});
  }, []);

  const closeEditModal = React.useCallback(() => {
    setEditingTodo(null);
    setIsEditDatePickerOpen(false);
    setEditErrors({});
  }, []);

  const handleEditSubmit = React.useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!editingTodo) {
        return;
      }

      const trimmedTitle = editTitle.trim();
      if (!trimmedTitle) {
        setEditErrors({ title: "Title is required." });
        return;
      }

      startEditTransition(async () => {
        try {
          const updated = await updateTodoAction(editingTodo.id, {
            title: trimmedTitle,
            description: editDescription.trim(),
            priority: editPriority,
            dueDate: toIsoDateValue(editDueDate),
          });

          if (!updated) {
            throw new Error("Update returned null");
          }

          setTodos((current) =>
            current.map((item) => (item.id === updated.id ? updated : item))
          );
          closeEditModal();
          router.refresh();
          showToastAlert("success", "Task updated successfully.");
        } catch (error) {
          console.error("Failed to update task", error);
          showToastAlert("error", "We could not update this task. Try again.");
        }
      });
    },
    [
      closeEditModal,
      editDescription,
      editDueDate,
      editPriority,
      editTitle,
      editingTodo,
      router,
      showToastAlert,
    ]
  );

  const handleDeleteConfirm = React.useCallback(() => {
    if (!todoToDelete) {
      return;
    }

    startDeleteTransition(async () => {
      try {
        const success = await deleteTodoAction(todoToDelete.id);
        if (!success) {
          throw new Error("Delete returned false");
        }

        setTodos((current) =>
          current.filter((item) => item.id !== todoToDelete.id)
        );
        setTodoToDelete(null);
        router.refresh();
        showToastAlert("success", "Task deleted successfully.");
      } catch (error) {
        console.error("Failed to delete task", error);
        showToastAlert("error", "We could not delete this task. Try again.");
      }
    });
  }, [router, showToastAlert, todoToDelete]);

  if (todos.length === 0) {
    return (
      <div className="space-y-4 rounded-2xl border border-dashed border-stroke-soft-200 p-8 text-center">
        <Hint.Root className="flex flex-col items-center gap-2 text-text-sub-600">
          <Hint.Icon
            as={RiInformationLine}
            className="size-6 text-text-soft-400"
          />
          <span className="text-label-sm">
            No tasks yet. Create your first task to get started.
          </span>
        </Hint.Root>
      </div>
    );
  }

  return (
    <section className="space-y-8">
      <header className="space-y-6 rounded-3xl border border-stroke-soft-200/70 bg-bg-white-0/[0.04] p-6 shadow-regular-lg backdrop-blur-sm">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <p className="text-label-sm text-text-soft-400">
              Today&apos;s progress
            </p>
            <h3 className="text-heading-sm text-text-strong-950">
              {completed}/{total} tasks completed
            </h3>
            <p className="text-paragraph-sm text-text-sub-600">
              Keep momentum by finishing the remaining items and clearing
              overdue work.
            </p>
          </div>
          <ProgressCircle.Root
            value={percentage}
            max={100}
            size="64"
            color="stroke-success-base"
          >
            <span className="text-paragraph-sm text-text-strong-950">
              {percentage}%
            </span>
          </ProgressCircle.Root>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-stroke-soft-200/60 bg-bg-white-0/[0.04] p-4">
            <p className="text-label-xs text-text-soft-400">Active</p>
            <p className="text-paragraph-lg font-semibold text-text-strong-950">
              {active}
            </p>
          </div>
          <div className="rounded-2xl border border-stroke-soft-200/60 bg-bg-white-0/[0.04] p-4">
            <p className="text-label-xs text-text-soft-400">Completed</p>
            <p className="text-paragraph-lg font-semibold text-text-strong-950">
              {completed}
            </p>
          </div>
          <div className="rounded-2xl border border-stroke-soft-200/60 bg-bg-white-0/[0.04] p-4">
            <p className="text-label-xs text-text-soft-400">Overdue</p>
            <p className="text-paragraph-lg font-semibold text-text-strong-950">
              {overdue}
            </p>
          </div>
        </div>

        <ProgressBar.Root
          value={completed}
          max={Math.max(total, 1)}
          color="green"
        />

        <div className="flex flex-col gap-4 border-t border-stroke-soft-200/70 pt-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <SegmentedControl.Root
              value={filter}
              onValueChange={(value) => setFilter(value as FilterValue)}
            >
              <SegmentedControl.List className="sm:w-auto sm:max-w-max">
                <SegmentedControl.Trigger value="all">
                  All
                </SegmentedControl.Trigger>
                <SegmentedControl.Trigger value="active">
                  Active
                </SegmentedControl.Trigger>
                <SegmentedControl.Trigger value="completed">
                  Completed
                </SegmentedControl.Trigger>
                <SegmentedControl.Trigger value="overdue">
                  Overdue
                </SegmentedControl.Trigger>
              </SegmentedControl.List>
            </SegmentedControl.Root>

            <FancyButton.Root
              type="button"
              variant={isSelectionMode ? "basic" : "primary"}
              size="small"
              onClick={toggleSelectionMode}
              disabled={isBulkPending}
            >
              {isSelectionMode ? "Cancel selection" : "Select tasks"}
            </FancyButton.Root>
          </div>

          <div className="w-full max-w-sm sm:ml-auto">
            <Input.Root>
              <Input.Wrapper>
                <Input.Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search by title"
                  aria-label="Search todos"
                />
              </Input.Wrapper>
            </Input.Root>
          </div>
        </div>
      </header>

      <ul className="space-y-3">
        {paginatedTodos.map((todo) => {
          const dueDate = normalizeDate(todo.dueDate);
          const isOverdue = Boolean(
            dueDate && !todo.isCompleted && isPast(dueDate) && !isToday(dueDate)
          );
          const priorityConfig = PRIORITY_CONFIG[todo.priority];
          const isUpdating = pendingIds.has(todo.id) || isTogglePending;
          const updatedAt = parseTimestamp(todo.updatedAt);
          const statusBadgeColor: BadgeColor = todo.isCompleted
            ? "green"
            : isOverdue
            ? "red"
            : "gray";
          const statusLabel = todo.isCompleted
            ? "Completed"
            : isOverdue
            ? "Overdue"
            : "Active";

          const isSelected = selectedIds.has(todo.id);

          return (
            <li
              key={todo.id}
              className={cn(
                "group rounded-2xl border border-stroke-soft-200/70 bg-bg-white-0/[0.04] p-4 shadow-regular-md transition duration-200 hover:shadow-regular-lg sm:p-5",
                isOverdue && "border-error-base/60 bg-error-base/5",
                isUpdating && "opacity-70",
                isSelectionMode && isSelected && "ring-2 ring-primary-base/70"
              )}
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex flex-1 items-start gap-3">
                  <Checkbox.Root
                    checked={
                      isSelectionMode
                        ? selectedIds.has(todo.id)
                        : todo.isCompleted
                    }
                    onCheckedChange={(checked) => {
                      if (isSelectionMode) {
                        updateSelectedIds(todo.id, checked === true);
                      } else {
                        handleToggle(todo);
                      }
                    }}
                    disabled={isSelectionMode ? isBulkPending : isUpdating}
                    aria-label={
                      isSelectionMode
                        ? selectedIds.has(todo.id)
                          ? "Deselect task"
                          : "Select task"
                        : todo.isCompleted
                        ? "Mark as active"
                        : "Mark as completed"
                    }
                  />
                  <div className="flex flex-1 flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3
                        className={cn(
                          "text-paragraph-lg font-semibold text-text-strong-950",
                          todo.isCompleted && "text-text-soft-400 line-through"
                        )}
                      >
                        {todo.title}
                      </h3>
                      <Badge.Root
                        variant="light"
                        color={priorityConfig.badgeColor}
                        size="medium"
                      >
                        {priorityConfig.label}
                      </Badge.Root>
                    </div>
                    {todo.description ? (
                      <p className="text-paragraph-sm leading-relaxed text-text-sub-600 line-clamp-3 break-words break-all">
                        {todo.description}
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-start gap-2 lg:items-end">
                  <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-end">
                    <Badge.Root
                      variant="light"
                      color={statusBadgeColor}
                      size="medium"
                    >
                      {statusLabel}
                    </Badge.Root>
                    <Dropdown.Root>
                      <Dropdown.Trigger asChild>
                        <CompactButton.Root
                          variant="ghost"
                          size="medium"
                          fullRadius
                        >
                          <CompactButton.Icon as={RiMore2Fill} />
                        </CompactButton.Root>
                      </Dropdown.Trigger>
                      <Dropdown.Content className="w-[220px]">
                        <Dropdown.Item
                          onSelect={(event) => {
                            event.preventDefault();
                            openEditModal(todo);
                          }}
                        >
                          <Dropdown.ItemIcon as={RiEdit2Line} />
                          Edit task
                        </Dropdown.Item>
                        <Dropdown.Item
                          className="text-error-base"
                          onSelect={(event) => {
                            event.preventDefault();
                            setTodoToDelete(todo);
                          }}
                        >
                          <Dropdown.ItemIcon
                            as={RiDeleteBinLine}
                            className="text-error-base"
                          />
                          Delete task
                        </Dropdown.Item>
                      </Dropdown.Content>
                    </Dropdown.Root>
                  </div>
                  <Hint.Root
                    className={cn(
                      "flex items-center gap-1.5 text-text-sub-600",
                      isOverdue && "text-error-base"
                    )}
                  >
                    <Hint.Icon
                      as={isOverdue ? RiErrorWarningLine : RiCalendarEventLine}
                      className={cn(
                        "size-4",
                        isOverdue ? "text-error-base" : "text-text-soft-400"
                      )}
                    />
                    {dueDate ? (
                      <span className="text-label-sm">
                        {isOverdue
                          ? `Was due ${format(dueDate, "PPP")}`
                          : todo.isCompleted && updatedAt
                          ? `Completed on ${format(updatedAt, "PPP")}`
                          : `Due ${format(dueDate, "PPP")}`}
                      </span>
                    ) : (
                      <span className="text-label-sm">No due date</span>
                    )}
                  </Hint.Root>
                  <span className="text-caption-xs text-text-soft-400">
                    {updatedAt
                      ? `Updated ${format(updatedAt, "PPP p")}`
                      : "Updated recently"}
                  </span>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-col gap-6 rounded-2xl border border-stroke-soft-200/70 bg-bg-white-0/[0.04] p-4 shadow-regular-md sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center justify-between gap-4 text-paragraph-sm text-text-sub-600 sm:justify-start">
          <span className="leading-none">Rows per page</span>
          <Select.Root
            value={String(pageSize)}
            onValueChange={(value) => {
              setPageSize(Number(value));
            }}
            disabled={todos.length <= PAGE_SIZE_OPTIONS[0]}
          >
            <Select.Trigger className="w-[88px] justify-between">
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              {PAGE_SIZE_OPTIONS.map((option) => (
                <Select.Item key={option} value={String(option)}>
                  {option}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        </div>
        <div className="flex flex-col items-center gap-3 text-paragraph-sm text-text-sub-600 sm:items-end">
          <span className="sm:text-right">Page {currentPage} of {totalPages}</span>
          <Pagination.Root
            className="flex-wrap justify-center gap-1 sm:justify-end"
            variant="basic"
          >
            <Pagination.NavButton
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              aria-label="Go to first page"
            >
              <Pagination.NavIcon as={RiArrowLeftDoubleLine} />
            </Pagination.NavButton>
            <Pagination.NavButton
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={currentPage === 1}
              aria-label="Go to previous page"
            >
              <Pagination.NavIcon as={RiArrowLeftSLine} />
            </Pagination.NavButton>
            {paginationItems.map((item, index) => {
              if (typeof item === "string") {
                return (
                  <Pagination.Item key={`${item}-${index}`} disabled>
                    …
                  </Pagination.Item>
                );
              }
              const pageNumber = item;
              return (
                <Pagination.Item
                  key={pageNumber}
                  current={pageNumber === currentPage}
                  onClick={() => setCurrentPage(pageNumber)}
                  disabled={pageNumber === currentPage}
                >
                  {pageNumber}
                </Pagination.Item>
              );
            })}
            <Pagination.NavButton
              onClick={() =>
                setCurrentPage((page) => Math.min(totalPages, page + 1))
              }
              disabled={currentPage === totalPages}
              aria-label="Go to next page"
            >
              <Pagination.NavIcon as={RiArrowRightSLine} />
            </Pagination.NavButton>
            <Pagination.NavButton
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              aria-label="Go to last page"
            >
              <Pagination.NavIcon as={RiArrowRightDoubleLine} />
            </Pagination.NavButton>
          </Pagination.Root>
        </div>
      </div>

      <Modal.Root
        open={Boolean(editingTodo)}
        onOpenChange={(open) => !open && closeEditModal()}
      >
        <Modal.Content className="max-w-[600px]">
          <form onSubmit={handleEditSubmit} className="flex flex-col">
            <Modal.Header
              title="Edit task"
              description="Update the details below and save your changes."
            />
            <Modal.Body className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="edit-title"
                  className="text-label-sm text-text-sub-600"
                >
                  Title
                </label>
                <Input.Root hasError={Boolean(editErrors.title)}>
                  <Input.Wrapper>
                    <Input.Input
                      id="edit-title"
                      name="title"
                      value={editTitle}
                      onChange={(event) => {
                        setEditTitle(event.target.value);
                        setEditErrors((prev) => ({
                          ...prev,
                          title: undefined,
                        }));
                      }}
                      placeholder="Task title"
                      disabled={isEditPending}
                      aria-invalid={Boolean(editErrors.title) || undefined}
                    />
                  </Input.Wrapper>
                </Input.Root>
                {editErrors.title ? (
                  <p className="text-label-xs text-error-base">
                    {editErrors.title}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="edit-description"
                  className="text-label-sm text-text-sub-600"
                >
                  Description
                </label>
                <Textarea.Root
                  id="edit-description"
                  name="description"
                  value={editDescription}
                  onChange={(event) => {
                    if (event.target.value.length <= 500) {
                      setEditDescription(event.target.value);
                    }
                  }}
                  disabled={isEditPending}
                  containerClassName="min-h-[144px]"
                  maxLength={500}
                >
                  <Textarea.CharCounter
                    current={editDescription.length}
                    max={500}
                  />
                </Textarea.Root>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-label-sm text-text-sub-600">
                    Priority
                  </label>
                  <Select.Root
                    value={editPriority}
                    onValueChange={(value) =>
                      setEditPriority(value as Todo["priority"])
                    }
                    disabled={isEditPending}
                  >
                    <Select.Trigger>
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
                </div>

                <div className="space-y-1.5">
                  <label className="text-label-sm text-text-sub-600">
                    Due date
                  </label>
                  <input
                    type="hidden"
                    name="dueDate"
                    value={toIsoDateValue(editDueDate) ?? ""}
                  />
                  <Popover.Root
                    open={isEditDatePickerOpen}
                    onOpenChange={setIsEditDatePickerOpen}
                  >
                    <Popover.Trigger asChild>
                      <button
                        type="button"
                        className={cn(
                          "flex h-10 w-full items-center justify-between rounded-10 border border-stroke-soft-200 px-3 text-left text-paragraph-sm text-text-sub-600 shadow-regular-xs transition",
                          "hover:bg-bg-weak-50 hover:border-transparent",
                          editDueDate && "text-text-strong-950",
                          isEditPending && "cursor-not-allowed opacity-70"
                        )}
                        disabled={isEditPending}
                      >
                        <span>{formatDueDateLabel(editDueDate)}</span>
                        <span className="text-label-xs text-text-soft-400">
                          Pick
                        </span>
                      </button>
                    </Popover.Trigger>
                    <Popover.Content
                      className="p-0"
                      side="bottom"
                      align="start"
                    >
                      <Calendar
                        mode="single"
                        selected={editDueDate}
                        onSelect={(date) => {
                          setEditDueDate(date ?? undefined);
                          if (date) {
                            setIsEditDatePickerOpen(false);
                          }
                        }}
                      />
                      <div className="flex items-center justify-between border-t border-stroke-soft-200 bg-bg-weak-50 px-4 py-3">
                        <button
                          type="button"
                          className="text-label-xs text-text-soft-400 underline-offset-2 hover:text-text-strong-950 hover:underline"
                          onClick={() => {
                            setEditDueDate(undefined);
                            setIsEditDatePickerOpen(false);
                          }}
                        >
                          Clear date
                        </button>
                        <FancyButton.Root
                          type="button"
                          size="xsmall"
                          variant="primary"
                          onClick={() => setIsEditDatePickerOpen(false)}
                        >
                          Done
                        </FancyButton.Root>
                      </div>
                    </Popover.Content>
                  </Popover.Root>
                </div>
              </div>
            </Modal.Body>
            <Modal.Footer className="justify-end gap-3">
              <FancyButton.Root
                type="button"
                variant="basic"
                onClick={closeEditModal}
                disabled={isEditPending}
              >
                Cancel
              </FancyButton.Root>
              <FancyButton.Root
                type="submit"
                variant="primary"
                disabled={isEditPending}
              >
                {isEditPending ? "Saving…" : "Save changes"}
              </FancyButton.Root>
            </Modal.Footer>
          </form>
        </Modal.Content>
      </Modal.Root>

      <Modal.Root
        open={Boolean(todoToDelete)}
        onOpenChange={(open) => !open && setTodoToDelete(null)}
      >
        <Modal.Content>
          <Modal.Header
            title="Delete task"
            description="This action cannot be undone. Are you sure you want to remove this task?"
          />
          <Modal.Body>
            <p className="text-paragraph-sm text-text-sub-600">
              {todoToDelete?.title}
            </p>
          </Modal.Body>
          <Modal.Footer className="justify-end gap-3">
            <FancyButton.Root
              type="button"
              variant="basic"
              onClick={() => setTodoToDelete(null)}
              disabled={isDeletePending}
            >
              Cancel
            </FancyButton.Root>
            <FancyButton.Root
              type="button"
              variant="destructive"
              disabled={isDeletePending}
              onClick={handleDeleteConfirm}
            >
              {isDeletePending ? "Deleting…" : "Delete task"}
            </FancyButton.Root>
          </Modal.Footer>
        </Modal.Content>
      </Modal.Root>

      {isSelectionMode && (
        <div className="fixed bottom-6 left-1/2 z-40 w-full max-w-3xl -translate-x-1/2 rounded-2xl border border-stroke-soft-200/80 bg-bg-white-0/[0.95] p-4 shadow-regular-lg backdrop-blur-md">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-label-sm text-text-strong-950">
                {selectedCount} task{selectedCount === 1 ? "" : "s"} selected
              </p>
              <FancyButton.Root
                type="button"
                variant="basic"
                size="small"
                onClick={() => setSelectedIds(new Set())}
                disabled={selectedCount === 0 || isBulkPending}
              >
                Clear selection
              </FancyButton.Root>
            </div>
            <div className="flex items-center gap-3">
              <ButtonGroup.Root>
                <ButtonGroup.Item
                  disabled={selectedCount === 0 || isBulkPending}
                  onClick={handleBulkComplete}
                >
                  Complete
                </ButtonGroup.Item>
                <ButtonGroup.Item
                  disabled={selectedCount === 0 || isBulkPending}
                  onClick={handleBulkDelete}
                  className="text-error-base"
                >
                  Delete
                </ButtonGroup.Item>
              </ButtonGroup.Root>
              <FancyButton.Root
                type="button"
                variant="basic"
                size="small"
                onClick={() => {
                  setSelectedIds(new Set());
                  setIsSelectionMode(false);
                }}
                disabled={isBulkPending}
              >
                Exit selection
              </FancyButton.Root>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
