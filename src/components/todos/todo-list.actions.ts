'use server';

import { revalidatePath } from 'next/cache';

import { updateTodo, deleteTodo } from '@/lib/todo-repository';

export async function toggleTodoCompletionAction(id: number, isCompleted: boolean) {
  const updated = await updateTodo(id, { isCompleted });
  revalidatePath('/');
  return updated;
}

export async function updateTodoAction(
  id: number,
  updates: {
    title?: string;
    description?: string;
    priority?: 'low' | 'normal' | 'high';
    dueDate?: string | null;
    isCompleted?: boolean;
  },
) {
  const normalizedUpdates: Parameters<typeof updateTodo>[1] = { ...updates };

  if (Object.prototype.hasOwnProperty.call(updates, 'dueDate')) {
    normalizedUpdates.dueDate = updates.dueDate ?? null;
  }

  const updated = await updateTodo(id, normalizedUpdates);
  revalidatePath('/');
  return updated;
}

export async function deleteTodoAction(id: number) {
  const success = await deleteTodo(id);
  revalidatePath('/');
  return success;
}
