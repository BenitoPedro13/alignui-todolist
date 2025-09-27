import type { InValue } from '@libsql/client';

import { getClient } from './db';

export type TodoPriority = 'low' | 'normal' | 'high';

export interface Todo {
  id: number;
  title: string;
  description: string;
  isCompleted: boolean;
  priority: TodoPriority;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTodoInput {
  title: string;
  description?: string;
  isCompleted?: boolean;
  priority?: TodoPriority;
  dueDate?: string | Date | null;
}

export interface UpdateTodoInput {
  title?: string;
  description?: string;
  isCompleted?: boolean;
  priority?: TodoPriority;
  dueDate?: string | Date | null;
}

const PRIORITY_VALUES: TodoPriority[] = ['low', 'normal', 'high'];

const toBooleanFlag = (value: boolean | undefined): number | undefined => {
  if (typeof value === 'undefined') {
    return undefined;
  }

  return value ? 1 : 0;
};

const normalizeDueDate = (value: string | Date | null | undefined): string | null | undefined => {
  if (typeof value === 'undefined') {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return value;
};

const assertValidPriority = (priority: string | undefined): TodoPriority | undefined => {
  if (typeof priority === 'undefined') {
    return undefined;
  }

  if (PRIORITY_VALUES.includes(priority as TodoPriority)) {
    return priority as TodoPriority;
  }

  throw new Error(`Invalid todo priority: ${priority}`);
};

const mapRowToTodo = (row: Record<string, unknown>): Todo => ({
  id: Number(row.id),
  title: String(row.title ?? ''),
  description: String(row.description ?? ''),
  isCompleted:
    Number(row.is_completed ?? row.isCompleted ?? 0) === 1 ||
    row.is_completed === true ||
    row.isCompleted === true,
  priority: (row.priority as TodoPriority) ?? 'normal',
  dueDate: (row.due_date as string | null | undefined) ?? null,
  createdAt: String(row.created_at ?? row.createdAt ?? ''),
  updatedAt: String(row.updated_at ?? row.updatedAt ?? ''),
});

export const listTodos = async (): Promise<Todo[]> => {
  const client = await getClient();
  const result = await client.execute('SELECT * FROM todos ORDER BY created_at DESC');
  return result.rows.map((row) => mapRowToTodo(row as Record<string, unknown>));
};

export const getTodoById = async (id: number): Promise<Todo | null> => {
  const client = await getClient();
  const result = await client.execute({
    sql: 'SELECT * FROM todos WHERE id = ? LIMIT 1',
    args: [id],
  });
  const row = result.rows[0];
  return row ? mapRowToTodo(row as Record<string, unknown>) : null;
};

export const createTodo = async (input: CreateTodoInput): Promise<Todo> => {
  if (!input.title?.trim()) {
    throw new Error('Cannot create a todo without a title.');
  }

  const client = await getClient();
  const normalizedPriority = assertValidPriority(input.priority) ?? 'normal';
  const result = await client.execute({
    sql: `INSERT INTO todos (title, description, is_completed, priority, due_date)
          VALUES (?, ?, ?, ?, ?) RETURNING *`,
    args: [
      input.title.trim(),
      input.description?.trim() ?? '',
      toBooleanFlag(input.isCompleted) ?? 0,
      normalizedPriority,
      normalizeDueDate(input.dueDate) ?? null,
    ],
  });

  const row = result.rows[0];
  if (!row) {
    throw new Error('Failed to load todo after creation.');
  }

  return mapRowToTodo(row as Record<string, unknown>);
};

export const updateTodo = async (id: number, updates: UpdateTodoInput): Promise<Todo | null> => {
  const assignments: string[] = [];
  const args: InValue[] = [];

  if (typeof updates.title !== 'undefined') {
    const trimmedTitle = updates.title.trim();
    if (!trimmedTitle) {
      throw new Error('Todo title cannot be empty.');
    }
    assignments.push('title = ?');
    args.push(trimmedTitle);
  }

  if (typeof updates.description !== 'undefined') {
    assignments.push('description = ?');
    args.push(updates.description.trim());
  }

  const completedFlag = toBooleanFlag(updates.isCompleted);
  if (typeof completedFlag !== 'undefined') {
    assignments.push('is_completed = ?');
    args.push(completedFlag);
  }

  const normalizedPriority = assertValidPriority(updates.priority);
  if (typeof normalizedPriority !== 'undefined') {
    assignments.push('priority = ?');
    args.push(normalizedPriority);
  }

  const normalizedDueDate = normalizeDueDate(updates.dueDate);
  if (typeof normalizedDueDate !== 'undefined') {
    assignments.push('due_date = ?');
    args.push(normalizedDueDate);
  }

  if (!assignments.length) {
    return getTodoById(id);
  }

  assignments.push('updated_at = CURRENT_TIMESTAMP');

  const client = await getClient();
  const result = await client.execute({
    sql: `UPDATE todos SET ${assignments.join(', ')} WHERE id = ? RETURNING *`,
    args: [...args, id],
  });

  const row = result.rows[0];
  return row ? mapRowToTodo(row as Record<string, unknown>) : null;
};

export const deleteTodo = async (id: number): Promise<boolean> => {
  const client = await getClient();
  const result = await client.execute({
    sql: 'DELETE FROM todos WHERE id = ?',
    args: [id],
  });
  return (result.rowsAffected ?? 0) > 0;
};
