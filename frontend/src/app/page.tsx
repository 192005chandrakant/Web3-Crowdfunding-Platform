export default function HomePage() {
  return (
    <section className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
      <div className="max-w-3xl rounded-[2rem] border border-white/10 bg-white/5 p-10 text-center backdrop-blur-xl shadow-glass">
        <p className="text-xs uppercase tracking-[0.45em] text-nebula-cyan/80">Foundation Loaded</p>
        <h1 className="mt-4 font-display text-5xl text-white/90 sm:text-6xl">Premium Nebula</h1>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-white/70">
          The App Router shell, premium theme, desktop sidebar, mobile navigation, and Web3 providers are in place.
          The campaign feed and detail views will be layered on in the next phase.
        </p>
      </div>
    </section>
  );
}