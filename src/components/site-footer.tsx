export function SiteFooter() {
  return (
    <footer className="border-t border-border/70 py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 text-sm text-muted-foreground">
        <p className="font-display text-xl tracking-wide text-foreground">GigLink</p>
        <p>Booking bands, solo artists and venues — from first message to standing ovation.</p>
        <p className="text-xs">© {new Date().getFullYear()} GigLink. Built as a student project.</p>
      </div>
    </footer>
  );
}