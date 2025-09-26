import { listTodos } from '@/lib/todo-repository';

import { TodoListClient } from './todo-list.client';

export default async function TodoList() {
  const todos = await listTodos();
  return <TodoListClient initialTodos={todos} />;
}
