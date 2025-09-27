'use client';

import * as React from 'react';

import type { Todo } from '@/lib/todo-repository';

import TodoComposer from './todo-composer';
import { TodoListClient } from './todo-list.client';

export const TodosBoardClient = ({ initialTodos }: { initialTodos: Todo[] }) => {
  const listApiRef = React.useRef<{ addTodo: (todo: Todo) => void } | null>(null);

  const handleProvideApi = React.useCallback((api: { addTodo: (todo: Todo) => void } | null) => {
    listApiRef.current = api;
  }, []);

  return (
    <div className='flex flex-col gap-10'>
      <TodoComposer
        onCreated={(todo) => {
          listApiRef.current?.addTodo(todo);
        }}
      />
      <TodoListClient initialTodos={initialTodos} onProvideApi={handleProvideApi} />
    </div>
  );
};

export default TodosBoardClient;
