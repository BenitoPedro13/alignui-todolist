'use server';

import { revalidatePath } from 'next/cache';

import { updateTodo } from '@/lib/todo-repository';

export async function toggleTodoCompletionAction(id: number, isCompleted: boolean) {
  const updated = await updateTodo(id, { isCompleted });
  revalidatePath('/');
  return updated;
}
