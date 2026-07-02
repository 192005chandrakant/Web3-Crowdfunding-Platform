import Link from "next/link";

const mobileItems = [
  { label: "Home", href: "/" },
  { label: "Explore", href: "/#campaigns" },
  { label: "Create", href: "/#create" },
  { label: "Wallet", href: "/#wallet" }
];

export function MobileBottomNav() {
  return (
    <nav className="fixed inset-x-4 bottom-4 z-40 grid grid-cols-4 gap-2 rounded-[1.5rem] border border-white/10 bg-white/5 p-2 backdrop-blur-xl shadow-glass lg:hidden">
      {mobileItems.map((item) => (
        <Link
          key={item.label}
          href={item.href}
          className="rounded-2xl px-3 py-2 text-center text-xs font-medium text-white/75 transition hover:bg-white/10 hover:text-white"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}