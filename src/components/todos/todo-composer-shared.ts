import type { Todo, TodoPriority } from '@/lib/todo-repository';

export type FieldName = 'title' | 'priority' | 'dueDate';

export type FieldError = {
  field: FieldName;
  message: string;
};

export type ComposerActionState = {
  status: 'idle' | 'success' | 'error';
  message?: string;
  errors?: FieldError[];
  todo?: Todo | null;
};

export const PRIORITY_OPTIONS: { value: TodoPriority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
];

export const isValidPriority = (value: string): value is TodoPriority =>
  PRIORITY_OPTIONS.some((option) => option.value === value);
