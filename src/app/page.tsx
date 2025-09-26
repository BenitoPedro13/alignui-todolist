import TodoComposer from "@/components/todos/todo-composer";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <TodoComposer />
    </main>
  );
}
