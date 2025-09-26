'use server';

import {
  isValidPriority,
  type ComposerActionState,
  type FieldError,
} from './todo-composer-shared';
import { createTodo, type TodoPriority } from '@/lib/todo-repository';

export async function createTodoComposerAction(
  _prevState: ComposerActionState,
  formData: FormData,
): Promise<ComposerActionState> {
  const title = (formData.get('title') ?? '').toString().trim();
  const description = (formData.get('description') ?? '').toString().trim();
  const priorityValue = (formData.get('priority') ?? 'normal').toString();
  const dueDateRaw = (formData.get('dueDate') ?? '').toString().trim();

  const errors: FieldError[] = [];

  if (!title) {
    errors.push({ field: 'title', message: 'Title is required.' });
  }

  let priority: TodoPriority = 'normal';
  if (priorityValue) {
    if (isValidPriority(priorityValue)) {
      priority = priorityValue;
    } else {
      errors.push({ field: 'priority', message: 'Select a valid priority.' });
    }
  }

  let dueDate: Date | null = null;
  if (dueDateRaw) {
    const parsed = new Date(dueDateRaw);
    if (Number.isNaN(parsed.getTime())) {
      errors.push({ field: 'dueDate', message: 'Invalid due date supplied.' });
    } else {
      dueDate = parsed;
    }
  }

  if (errors.length) {
    return {
      status: 'error',
      message: 'Please correct the highlighted fields.',
      errors,
      todo: null,
    };
  }

  try {
    const todo = await createTodo({
      title,
      description,
      priority,
      dueDate,
      isCompleted: false,
    });

    return {
      status: 'success',
      message: 'Task created successfully.',
      todo,
    };
  } catch (error) {
    console.error('Failed to create todo', error);
    return {
      status: 'error',
      message: 'Failed to save task. Please try again.',
      todo: null,
    };
  }
}
