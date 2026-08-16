import { motion } from "framer-motion";
import { Button } from "@/components/ui";
import { Home, Compass } from "lucide-react";

export function NotFoundPage() {
  return (
    <section className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-md rounded-2xl border border-white/[0.08] bg-slate-800/50 backdrop-blur-sm p-10 text-center shadow-dialog relative overflow-hidden"
      >
        {/* Animated background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-primary-600/10 rounded-full blur-[80px] pointer-events-none" />
        
        <div className="relative z-10">
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            <p className="font-display text-8xl font-black text-gradient-animated mb-2">404</p>
          </motion.div>
          
          <h1 className="font-display text-2xl font-bold text-slate-100 mb-3">Page not found</h1>
          <p className="mx-auto max-w-sm text-sm leading-relaxed text-slate-400">
            The page you requested does not exist. It may have moved or the URL may be incorrect.
          </p>
          
          <div className="mt-8 flex justify-center gap-3">
            <Button variant="primary" size="md" to="/" leadingIcon={<Home className="h-4 w-4" />}>
              Return Home
            </Button>
            <Button variant="outline" size="md" to="/explore" leadingIcon={<Compass className="h-4 w-4" />}>
              Explore Campaigns
            </Button>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
