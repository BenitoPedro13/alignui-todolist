import TodoComposer from "@/components/todos/todo-composer";
import TodoList from "@/components/todos/todo-list";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-10 px-6 py-12">
      <TodoComposer />
      <TodoList />
    </main>
  );
}
