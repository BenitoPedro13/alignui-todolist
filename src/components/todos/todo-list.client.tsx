'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  RiCalendarEventLine,
  RiErrorWarningLine,
  RiInformationLine,
} from '@remixicon/react';
import { format, isPast, isToday, parseISO } from 'date-fns';

import * as Badge from '@/components/ui/badge';
import * as Checkbox from '@/components/ui/checkbox';
import * as Hint from '@/components/ui/hint';
import * as ProgressBar from '@/components/ui/progress-bar';
import * as ProgressCircle from '@/components/ui/progress-circle';
import { cn } from '@/utils/cn';
import { toast } from '@/components/ui/toast';
import type { Todo } from '@/lib/todo-repository';

import { toggleTodoCompletionAction } from './todo-list.actions';

type TodoListClientProps = {
  initialTodos: Todo[];
};

type BadgeColor =
  | 'gray'
  | 'blue'
  | 'orange'
  | 'red'
  | 'green'
  | 'yellow'
  | 'purple'
  | 'sky'
  | 'pink'
  | 'teal';

type PriorityConfig = {
  label: string;
  badgeColor: BadgeColor;
};

const PRIORITY_CONFIG: Record<Todo['priority'], PriorityConfig> = {
  low: { label: 'Low priority', badgeColor: 'green' },
  normal: { label: 'Normal priority', badgeColor: 'blue' },
  high: { label: 'High priority', badgeColor: 'red' },
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

const parseTimestamp = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
};

export function TodoListClient({ initialTodos }: TodoListClientProps) {
  const router = useRouter();
  const [todos, setTodos] = React.useState(initialTodos);
  const [pendingIds, setPendingIds] = React.useState<Set<number>>(new Set());
  const [isPending, startTransition] = React.useTransition();

  React.useEffect(() => {
    setTodos(initialTodos);
  }, [initialTodos]);

  const updatePendingIds = React.useCallback(
    (updater: (set: Set<number>) => void) => {
      setPendingIds((current) => {
        const next = new Set(current);
        updater(next);
        return next;
      });
    },
    [],
  );

  const handleToggle = React.useCallback(
    (todo: Todo) => {
      const nextCompleted = !todo.isCompleted;
      const optimisticTodo = { ...todo, isCompleted: nextCompleted };

      setTodos((current) =>
        current.map((item) => (item.id === todo.id ? optimisticTodo : item)),
      );
      updatePendingIds((set) => set.add(todo.id));

      startTransition(async () => {
        try {
          const updated = await toggleTodoCompletionAction(todo.id, nextCompleted);
          if (!updated) {
            throw new Error('Update returned null');
          }
          setTodos((current) =>
            current.map((item) => (item.id === todo.id ? updated : item)),
          );
          router.refresh();
        } catch (error) {
          console.error('Failed to toggle todo completion state', error);
          setTodos((current) =>
            current.map((item) =>
              item.id === todo.id ? { ...item, isCompleted: todo.isCompleted } : item,
            ),
          );
          toast.error('Unable to update task status. Please try again.');
        } finally {
          updatePendingIds((set) => set.delete(todo.id));
        }
      });
    },
    [router, updatePendingIds],
  );

  const { total, completed, active, overdue, percentage } = React.useMemo(() => {
    const total = todos.length;
    let completed = 0;
    let overdue = 0;

    for (const todo of todos) {
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
    const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

    return { total, completed, active, overdue, percentage };
  }, [todos]);

  if (todos.length === 0) {
    return (
      <div className='space-y-4 rounded-2xl border border-dashed border-stroke-soft-200 p-8 text-center'>
        <Hint.Root className='flex flex-col items-center gap-2 text-text-sub-600'>
          <Hint.Icon as={RiInformationLine} className='size-6 text-text-soft-400' />
          <span className='text-label-sm'>No tasks yet. Create your first task to get started.</span>
        </Hint.Root>
      </div>
    );
  }

  return (
    <section className='space-y-8'>
      <header className='space-y-6 rounded-3xl border border-stroke-soft-200/70 bg-bg-white-0/[0.04] p-6 shadow-regular-lg backdrop-blur-sm'>
        <div className='flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between'>
          <div className='space-y-2'>
            <p className='text-label-sm text-text-soft-400'>Today&apos;s progress</p>
            <h3 className='text-heading-sm text-text-strong-950'>
              {completed}/{total} tasks completed
            </h3>
            <p className='text-paragraph-sm text-text-sub-600'>Keep momentum by finishing the remaining items and clearing overdue work.</p>
          </div>
          <ProgressCircle.Root
            value={percentage}
            max={100}
            size='64'
            color='stroke-success-base'
          >
            <span className='text-paragraph-sm text-text-strong-950'>{percentage}%</span>
          </ProgressCircle.Root>
        </div>

        <div className='grid gap-3 sm:grid-cols-3'>
          <div className='rounded-2xl border border-stroke-soft-200/60 bg-bg-white-0/[0.04] p-4'>
            <p className='text-label-xs text-text-soft-400'>Active</p>
            <p className='text-paragraph-lg font-semibold text-text-strong-950'>{active}</p>
          </div>
          <div className='rounded-2xl border border-stroke-soft-200/60 bg-bg-white-0/[0.04] p-4'>
            <p className='text-label-xs text-text-soft-400'>Completed</p>
            <p className='text-paragraph-lg font-semibold text-text-strong-950'>{completed}</p>
          </div>
          <div className='rounded-2xl border border-stroke-soft-200/60 bg-bg-white-0/[0.04] p-4'>
            <p className='text-label-xs text-text-soft-400'>Overdue</p>
            <p className='text-paragraph-lg font-semibold text-text-strong-950'>{overdue}</p>
          </div>
        </div>

        <ProgressBar.Root
          value={completed}
          max={Math.max(total, 1)}
          color='green'
        />
      </header>

      <ul className='space-y-3'>
        {todos.map((todo) => {
          const dueDate = normalizeDate(todo.dueDate);
          const isOverdue = Boolean(
            dueDate && !todo.isCompleted && isPast(dueDate) && !isToday(dueDate),
          );
          const priorityConfig = PRIORITY_CONFIG[todo.priority];
          const isUpdating = pendingIds.has(todo.id) || isPending;
          const updatedAt = parseTimestamp(todo.updatedAt);
          const statusBadgeColor: BadgeColor = todo.isCompleted
            ? 'green'
            : isOverdue
              ? 'red'
              : 'gray';
          const statusLabel = todo.isCompleted
            ? 'Completed'
            : isOverdue
              ? 'Overdue'
              : 'Active';

          return (
            <li
              key={todo.id}
              className={cn(
                'group rounded-2xl border border-stroke-soft-200/70 bg-bg-white-0/[0.04] p-5 shadow-regular-md transition duration-200 hover:shadow-regular-lg',
                isOverdue && 'border-error-base/60 bg-error-base/5',
                isUpdating && 'opacity-70',
              )}
            >
              <div className='flex flex-col gap-4 md:flex-row md:items-start md:justify-between'>
                <div className='flex flex-1 items-start gap-3'>
                  <Checkbox.Root
                    checked={todo.isCompleted}
                    onCheckedChange={() => handleToggle(todo)}
                    disabled={isUpdating}
                    aria-label={todo.isCompleted ? 'Mark as active' : 'Mark as completed'}
                  />
                  <div className='flex flex-1 flex-col gap-2'>
                    <div className='flex flex-wrap items-center gap-2'>
                      <h3
                        className={cn(
                          'text-paragraph-lg font-semibold text-text-strong-950',
                          todo.isCompleted && 'text-text-soft-400 line-through',
                        )}
                      >
                        {todo.title}
                      </h3>
                      <Badge.Root
                        variant='light'
                        color={priorityConfig.badgeColor}
                        size='medium'
                      >
                        {priorityConfig.label}
                      </Badge.Root>
                    </div>
                    {todo.description ? (
                      <p className='text-paragraph-sm leading-relaxed text-text-sub-600 line-clamp-3 break-words break-all'>
                        {todo.description}
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className='flex shrink-0 flex-col items-start gap-2 md:items-end'>
                  <Badge.Root
                    variant='light'
                    color={statusBadgeColor}
                    size='medium'
                  >
                    {statusLabel}
                  </Badge.Root>
                  <Hint.Root
                    className={cn(
                      'flex items-center gap-1.5 text-text-sub-600',
                      isOverdue && 'text-error-base',
                    )}
                  >
                    <Hint.Icon
                      as={isOverdue ? RiErrorWarningLine : RiCalendarEventLine}
                      className={cn(
                        'size-4',
                        isOverdue ? 'text-error-base' : 'text-text-soft-400',
                      )}
                    />
                    {dueDate ? (
                      <span className='text-label-sm'>
                        {isOverdue
                          ? `Was due ${format(dueDate, 'PPP')}`
                          : todo.isCompleted && updatedAt
                            ? `Completed on ${format(updatedAt, 'PPP')}`
                            : `Due ${format(dueDate, 'PPP')}`}
                      </span>
                    ) : (
                      <span className='text-label-sm'>No due date</span>
                    )}
                  </Hint.Root>
                  <span className='text-caption-xs text-text-soft-400'>
                    {updatedAt
                      ? `Updated ${format(updatedAt, 'PPP p')}`
                      : 'Updated recently'}
                  </span>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
