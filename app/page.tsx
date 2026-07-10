export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center font-sans">
      <main className="flex w-full max-w-3xl flex-col items-center gap-8 px-6 py-16 text-center sm:items-start sm:text-left">
        <div className="flex flex-col gap-4">
          <h1 className="text-4xl font-bold tracking-tight">
            NextGenMove
          </h1>
          <p className="max-w-md text-lg text-muted-foreground">
            Talent matching &amp; recruitment platform. Phase 0 setup complete.
          </p>
        </div>
        <div className="flex flex-col gap-2 text-sm text-muted-foreground">
          <p className="font-semibold">✅ Phase 0 Complete:</p>
          <ul className="text-left space-y-1 pl-4">
            <li>• Firebase integration (client + admin SDK)</li>
            <li>• Core types and utilities</li>
            <li>• Folder structure established</li>
            <li>• Dev environment configured</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
