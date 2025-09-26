import { getDatabase } from './db';

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

interface TodoRow {
  id: number;
  title: string;
  description: string;
  is_completed: number;
  priority: TodoPriority;
  due_date: string | null;
  created_at: string;
  updated_at: string;
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

const mapRowToTodo = (row: TodoRow): Todo => ({
  id: row.id,
  title: row.title,
  description: row.description,
  isCompleted: row.is_completed === 1,
  priority: row.priority,
  dueDate: row.due_date ?? null,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const listTodos = async (): Promise<Todo[]> => {
  const db = getDatabase();
  const statement = db.prepare('SELECT * FROM todos ORDER BY created_at DESC');
  const rows = statement.all() as TodoRow[];
  return rows.map(mapRowToTodo);
};

export const getTodoById = async (id: number): Promise<Todo | null> => {
  const db = getDatabase();
  const statement = db.prepare('SELECT * FROM todos WHERE id = ?');
  const row = statement.get(id) as TodoRow | undefined;
  return row ? mapRowToTodo(row) : null;
};

export const createTodo = async (input: CreateTodoInput): Promise<Todo> => {
  if (!input.title?.trim()) {
    throw new Error('Cannot create a todo without a title.');
  }

  const db = getDatabase();
  const insert = db.prepare(
    `INSERT INTO todos (title, description, is_completed, priority, due_date)
     VALUES (@title, @description, @is_completed, @priority, @due_date)`
  );

  const normalizedPriority = assertValidPriority(input.priority) ?? 'normal';
  const runResult = insert.run({
    title: input.title.trim(),
    description: input.description?.trim() ?? '',
    is_completed: toBooleanFlag(input.isCompleted) ?? 0,
    priority: normalizedPriority,
    due_date: normalizeDueDate(input.dueDate) ?? null,
  });

  const created = await getTodoById(Number(runResult.lastInsertRowid));
  if (!created) {
    throw new Error('Failed to load todo after creation.');
  }

  return created;
};

export const updateTodo = async (id: number, updates: UpdateTodoInput): Promise<Todo | null> => {
  const db = getDatabase();
  const assignments: string[] = [];
  const params: Record<string, unknown> = { id };

  if (typeof updates.title !== 'undefined') {
    const trimmedTitle = updates.title.trim();
    if (!trimmedTitle) {
      throw new Error('Todo title cannot be empty.');
    }
    assignments.push('title = @title');
    params.title = trimmedTitle;
  }

  if (typeof updates.description !== 'undefined') {
    assignments.push('description = @description');
    params.description = updates.description.trim();
  }

  const completedFlag = toBooleanFlag(updates.isCompleted);
  if (typeof completedFlag !== 'undefined') {
    assignments.push('is_completed = @is_completed');
    params.is_completed = completedFlag;
  }

  const normalizedPriority = assertValidPriority(updates.priority);
  if (typeof normalizedPriority !== 'undefined') {
    assignments.push('priority = @priority');
    params.priority = normalizedPriority;
  }

  const normalizedDueDate = normalizeDueDate(updates.dueDate);
  if (typeof normalizedDueDate !== 'undefined') {
    assignments.push('due_date = @due_date');
    params.due_date = normalizedDueDate;
  }

  if (!assignments.length) {
    return getTodoById(id);
  }

  assignments.push('updated_at = CURRENT_TIMESTAMP');

  const statement = db.prepare(
    `UPDATE todos
     SET ${assignments.join(', ')}
     WHERE id = @id`
  );
  const result = statement.run(params);

  if (result.changes === 0) {
    return null;
  }

  return getTodoById(id);
};

export const deleteTodo = async (id: number): Promise<boolean> => {
  const db = getDatabase();
  const statement = db.prepare('DELETE FROM todos WHERE id = ?');
  const result = statement.run(id);
  return result.changes > 0;
};
