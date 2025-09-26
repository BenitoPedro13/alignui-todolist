import { listTodos } from '@/lib/todo-repository';

import TodosBoardClient from './todos-board.client';

export default async function TodosPanel() {
  const todos = await listTodos();
  return <TodosBoardClient initialTodos={todos} />;
}
