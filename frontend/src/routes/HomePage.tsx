import { useMemo } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  ArrowRight,
  Shield,
  TrendingUp,
  Users,
  Lock,
  CheckCircle2,
  Zap,
  Globe,
  Coins,
  Scale,
  Activity,
  HeartHandshake,
  AlertTriangle
} from "lucide-react";
import { CampaignCard } from "@/components/CampaignCard";
import type { CampaignCardData } from "@/components/CampaignCard";
import { Button, Badge, CampaignCardSkeleton, Alert, GlassCard } from "@/components/ui";
import { useCampaignList } from "@/hooks/useCampaigns";
import { mapCampaignToCardData } from "@/lib/api";
import { BrandLogo } from "@/components/BrandLogo";


const staggerContainer = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } }
};

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } }
};

export function HomePage() {
  const { scrollYProgress } = useScroll();
  const yHero = useTransform(scrollYProgress, [0, 1], [0, 300]);

  const { data, isLoading, isError } = useCampaignList({ page: 1, limit: 3 });

  const featuredCampaigns = useMemo(() => {
    if (data?.items?.length) {
      return data.items.slice(0, 3).map((campaign) => mapCampaignToCardData(campaign));
    }

    return [];
  }, [data, isLoading, isError]);

  return (
    <div className="flex flex-col min-h-screen">
      
      {/* ─── HERO SECTION ────────────────────────────────────────────────── */}
      <section className="relative min-h-[90vh] flex items-center pt-24 pb-16 overflow-hidden">
        <div aria-hidden="true" className="absolute inset-0 bg-slate-950" />
        
        {/* Animated Background Orbs */}
        <motion.div 
          style={{ y: yHero }}
          className="absolute inset-0 overflow-hidden pointer-events-none"
        >
          <div 
            className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary-600/20 blur-[120px] mix-blend-screen"
            style={{ animation: "orb-float-1 12s ease-in-out infinite" }}
          />
          <div 
            className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-secondary-600/20 blur-[120px] mix-blend-screen"
            style={{ animation: "orb-float-2 15s ease-in-out infinite" }}
          />
          <div 
            className="absolute top-[20%] right-[20%] w-[30%] h-[30%] rounded-full bg-blue-500/10 blur-[100px] mix-blend-screen animate-float-slow"
          />
        </motion.div>

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.07] pointer-events-none bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

        <div className="page-container relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/50 border border-white/[0.08] backdrop-blur-md mb-8"
            >
              <Badge variant="success" dot className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Live on Polygon Amoy</Badge>
              <span className="text-sm font-medium text-slate-300">Web3 Crowdfunding Reimagined</span>
            </motion.div>

            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-5xl sm:text-6xl lg:text-7xl font-display font-extrabold tracking-tight text-slate-100 mb-8 leading-[1.1]"
            >
              Fund the future with <br className="hidden sm:block" />
              <span className="text-gradient-animated">
                absolute transparency
              </span>
            </motion.h1>

            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-lg sm:text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed"
            >
              MilestoneChain replaces blind trust with cryptographically secure escrow. Donors hold the power, and creators unlock funds only by proving real-world progress.
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Button variant="primary" size="lg" to="/explore" className="w-full sm:w-auto px-8 h-14 text-lg">
                Explore Campaigns
              </Button>
              <Button variant="outline" size="lg" to="/create-campaign" trailingIcon={<ArrowRight className="w-5 h-5" />} className="w-full sm:w-auto px-8 h-14 text-lg">
                Start a Campaign
              </Button>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.6 }}
              className="mt-16 pt-8 border-t border-white/[0.06] flex flex-wrap justify-center gap-8 text-sm text-slate-500 font-medium"
            >
              <div className="flex items-center gap-2"><Lock className="w-4 h-4 text-slate-400" /> Non-Custodial Escrow</div>
              <div className="flex items-center gap-2"><Shield className="w-4 h-4 text-slate-400" /> Fully Audited Contracts</div>
              <div className="flex items-center gap-2"><Globe className="w-4 h-4 text-slate-400" /> Borderless Donations</div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── THE PROBLEM VS SOLUTION ─────────────────────────────────────── */}
      <section className="py-24 bg-slate-900 relative">
        <div className="page-container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-slate-100 mb-4">Why MilestoneChain?</h2>
            <p className="text-slate-400 max-w-2xl mx-auto text-lg">Traditional crowdfunding is broken. We fixed it using blockchain technology.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
            <GlassCard className="p-8 border-red-500/20 bg-red-500/[0.03] relative overflow-hidden" glowBorder>
              <div className="absolute top-0 right-0 p-4 opacity-10"><AlertTriangle className="w-24 h-24 text-red-500" /></div>
              <h3 className="text-xl font-bold text-red-400 mb-6 flex items-center gap-2"><Shield className="w-5 h-5" /> The Old Way</h3>
              <ul className="space-y-4">
                {[
                  "Donors send money and hope for the best.",
                  "Creators receive all funds upfront, risking mismanagement.",
                  "High platform fees (5-10%) eat into the project's budget.",
                  "Zero accountability once the campaign ends."
                ].map((text, i) => (
                  <li key={i} className="flex items-start gap-3 text-slate-300">
                    <span className="mt-1 text-red-500/70">✗</span>
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
            </GlassCard>

            <GlassCard className="p-8 border-emerald-500/20 bg-emerald-500/[0.03] relative overflow-hidden" glowBorder>
              <div className="absolute top-0 right-0 p-4 opacity-10"><CheckCircle2 className="w-24 h-24 text-emerald-500" /></div>
              <h3 className="text-xl font-bold text-emerald-400 mb-6 flex items-center gap-2"><Zap className="w-5 h-5" /> The MilestoneChain Way</h3>
              <ul className="space-y-4">
                {[
                  "Donations are securely locked in a smart contract.",
                  "Funds are released in chunks only when milestones are met.",
                  "Zero platform fees. You only pay standard Polygon network gas.",
                  "Donors vote to approve or reject milestone evidence."
                ].map((text, i) => (
                  <li key={i} className="flex items-start gap-3 text-slate-300">
                    <span className="mt-1 text-emerald-500">✓</span>
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
            </GlassCard>
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS (DETAILED) ─────────────────────────────────────── */}
      <section className="py-24 relative overflow-hidden bg-slate-950">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-primary-600/10 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="page-container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-20">
            <Badge variant="primary" className="mb-4">Transparent Workflow</Badge>
            <h2 className="text-3xl md:text-5xl font-display font-bold text-slate-100 mb-6">How Milestone Funding Works</h2>
            <p className="text-slate-400 max-w-2xl mx-auto text-lg">A step-by-step look at how we protect donors and empower creators.</p>
          </div>

          <div className="relative">
            {/* Connecting Line */}
            <div className="hidden lg:block absolute top-1/2 left-0 w-full h-0.5 bg-gradient-to-r from-slate-800 via-primary-500/50 to-slate-800 -translate-y-1/2" />
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                {
                  step: "01",
                  title: "Campaign Creation",
                  desc: "Creators define their project, set a funding goal, and break the work into measurable milestones with specific funding requests.",
                  icon: Target
                },
                {
                  step: "02",
                  title: "Secure Escrow",
                  desc: "Donors contribute MATIC tokens. The funds are held safely in a decentralized smart contract on the Polygon blockchain.",
                  icon: Lock
                },
                {
                  step: "03",
                  title: "Proof Submission",
                  desc: "When a creator completes a milestone, they upload proof (images, documents, links) directly to decentralized IPFS storage.",
                  icon: FileCheck
                },
                {
                  step: "04",
                  title: "Community Vote",
                  desc: "Donors review the proof and vote. If the majority approves, the smart contract automatically releases the milestone funds.",
                  icon: Scale
                }
              ].map((item, i) => (
                <motion.div
                  key={item.step}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ delay: i * 0.15, duration: 0.5 }}
                  className="relative group"
                >
                  <GlassCard className="p-6 h-full hover:border-primary-500/40 transition-colors z-10 relative bg-slate-900/80" glowBorder>
                    <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-white/[0.08] flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-primary-600/20 transition-all shadow-lg">
                      <item.icon className="w-6 h-6 text-primary-400" />
                    </div>
                    <div className="text-5xl font-black text-white/[0.03] absolute top-4 right-4 pointer-events-none">{item.step}</div>
                    <h3 className="text-xl font-bold text-slate-100 mb-3">{item.title}</h3>
                    <p className="text-slate-400 leading-relaxed text-sm">{item.desc}</p>
                  </GlassCard>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── FEATURED CAMPAIGNS ────────────────────────────────────────── */}
      <section className="py-24 bg-slate-900">
        <div className="page-container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
            <div className="max-w-2xl">
              <h2 className="text-3xl md:text-4xl font-display font-bold text-slate-100 mb-4">Discover Featured Projects</h2>
              <p className="text-slate-400 text-lg">Support vetted creators building the future, protected by milestone escrow.</p>
            </div>
            <Button variant="ghost" to="/explore" trailingIcon={<ArrowRight className="w-4 h-4" />}>
              View All Campaigns
            </Button>
          </div>

          {isError && (
            <Alert variant="warning" title="Campaign service unavailable" className="mb-8">
              Live featured campaigns could not be loaded. Check the backend API connection.
            </Alert>
          )}

          {isLoading ? (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <CampaignCardSkeleton key={index} />
              ))}
            </div>
          ) : (
            <motion.div
              className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3"
              variants={staggerContainer}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-100px" }}
            >
              {featuredCampaigns.map((campaign) => (
                <motion.div key={campaign.id} variants={fadeUp}>
                  <CampaignCard campaign={campaign} animate={false} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </section>

      {/* ─── PLATFORM FEATURES / TECH STACK ────────────────────────────── */}
      <section className="py-24 bg-slate-950 relative border-t border-white/[0.04]">
        <div className="page-container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="space-y-8"
            >
              <div>
                <Badge variant="secondary" className="mb-4">Next-Gen Tech</Badge>
                <h2 className="text-3xl md:text-4xl font-display font-bold text-slate-100 mb-6">Powered by Web3 infrastructure.</h2>
                <p className="text-slate-400 text-lg leading-relaxed">
                  We leverage the speed, security, and transparency of decentralized technologies to create a completely trustless funding environment.
                </p>
              </div>

              <div className="space-y-6">
                {[
                  { title: "Sign-In With Ethereum (SIWE)", desc: "No passwords to lose or get stolen. Authenticate securely using your Web3 wallet via cryptographic signatures.", icon: Shield },
                  { title: "Polygon Network", desc: "Experience lightning-fast transactions with gas fees that cost fractions of a cent, making micro-donations viable.", icon: Zap },
                  { title: "IPFS Storage", desc: "All milestone evidence and campaign data is pinned to the InterPlanetary File System, ensuring it can never be censored or deleted.", icon: Database }
                ].map((feature, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.15, duration: 0.4 }}
                    className="flex gap-4 group"
                  >
                    <div className="flex-shrink-0 mt-1">
                      <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border border-white/[0.08] group-hover:border-secondary-500/30 transition-colors">
                        <feature.icon className="w-5 h-5 text-secondary-400" />
                      </div>
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-slate-200 mb-1">{feature.title}</h4>
                      <p className="text-slate-400 text-sm leading-relaxed">{feature.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative"
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-primary-500/20 to-secondary-500/20 rounded-3xl blur-3xl" />
              <GlassCard className="relative p-8 overflow-hidden rounded-3xl border border-white/[0.1]">
                <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-xl" />
                <div className="relative z-10 space-y-6">
                  {/* Mock UI snippet to look techy */}
                  <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-red-500" />
                      <div className="w-3 h-3 rounded-full bg-yellow-500" />
                      <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    </div>
                    <div className="text-xs font-mono text-slate-500">MilestoneContract.sol</div>
                  </div>
                  <pre className="text-sm font-mono text-slate-300 overflow-x-auto custom-scrollbar">
                    <code className="language-solidity">
                      <span className="text-primary-400">function</span> releaseFunds(<span className="text-secondary-400">uint256</span> milestoneId) <span className="text-primary-400">external</span> {'{\n'}
                      {'  '}Milestone <span className="text-primary-400">storage</span> m = milestones[milestoneId]{'\n'}
                      {'  '}require(m.status == <span className="text-emerald-400">Status.Approved</span>, <span className="text-yellow-300">"Not approved"</span>){'\n'}
                      {'\n'}
                      {'  '}m.isPaid = <span className="text-blue-400">true</span>{'\n'}
                      {'  '}<span className="text-slate-500">// Transfer exact milestone target to creator</span>{'\n'}
                      {'  '}payable(creator).transfer(m.targetAmount){'\n'}
                      {'\n'}
                      {'  '}<span className="text-secondary-400">emit</span> FundsReleased(milestoneId, m.targetAmount){'\n'}
                      {'}'}
                    </code>
                  </pre>
                </div>
              </GlassCard>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── CTA SECTION ───────────────────────────────────────────────── */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900 to-slate-950" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary-600/10 rounded-full blur-[100px] pointer-events-none mix-blend-screen" />
        
        <div className="page-container relative z-10 mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-500 to-secondary-500 mx-auto flex items-center justify-center mb-8 shadow-[0_0_40px_rgba(99,102,241,0.3)] transform rotate-12 animate-float">
              <HeartHandshake className="w-10 h-10 text-white -rotate-12" />
            </div>
            
            <h2 className="text-4xl md:text-5xl font-display font-extrabold text-white mb-6">
              Ready to reshape the future?
            </h2>
            <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto leading-relaxed">
              Join thousands of donors and creators who are building a transparent, accountable crowdfunding ecosystem.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button variant="primary" size="lg" to="/create-campaign" className="w-full sm:w-auto px-8 h-14 text-lg">
                Start a Campaign
              </Button>
              <Button variant="outline" size="lg" to="/explore" className="w-full sm:w-auto px-8 h-14 text-lg bg-slate-900/50 backdrop-blur-sm">
                Explore Projects
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── FOOTER ───────────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.04] bg-slate-950 py-12 mt-auto">
        <div className="page-container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <BrandLogo size="sm" to="/" showTagline={false} />
          <p className="text-sm text-slate-500">
            © {new Date().getFullYear()} MilestoneChain. All rights reserved. Built on Polygon.
          </p>
          <div className="flex gap-4">
            <a href="#" className="text-sm text-slate-400 hover:text-white transition-colors hover-underline">Terms</a>
            <a href="#" className="text-sm text-slate-400 hover:text-white transition-colors hover-underline">Privacy</a>
            <a href="#" className="text-sm text-slate-400 hover:text-white transition-colors hover-underline">Docs</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Icons needed that aren't imported at top
function Target(props: any) { return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>; }
function FileCheck(props: any) { return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="m9 15 2 2 4-4"/></svg>; }
function Database(props: any) { return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/></svg>; }
