import TodosPanel from "@/components/todos/todos-panel";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-10 px-6 py-12">
      <TodosPanel />
    </main>
  );
}
