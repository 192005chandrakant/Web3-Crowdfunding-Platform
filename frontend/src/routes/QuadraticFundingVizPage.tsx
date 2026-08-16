import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, ShieldCheck, Zap, Info } from 'lucide-react';
import { GlassCard, Button, Badge } from '@/components/ui';

export function QuadraticFundingVizPage() {
  const [donationAmount, setDonationAmount] = useState(10);
  const maxDonation = 1000;
  
  // Calculate quadratic voting power (sqrt of amount)
  const qvPower = Math.sqrt(donationAmount);
  
  // For the graph: map 0-1000 to SVG coordinates
  const width = 800;
  const height = 300;
  
  // Generate path data for the square root curve
  const generatePath = () => {
    let d = `M 0 ${height}`;
    for (let x = 0; x <= width; x += 10) {
      // Scale x to amount (0-1000)
      const amountX = (x / width) * maxDonation;
      // Calculate y based on sqrt
      const powerY = Math.sqrt(amountX);
      // Scale y to graph height (max sqrt(1000) is approx 31.62)
      const maxPower = Math.sqrt(maxDonation);
      const normalizedY = (powerY / maxPower) * height;
      const y = height - normalizedY;
      
      d += ` L ${x} ${y}`;
    }
    return d;
  };

  // Generate a linear path for comparison (plutocracy)
  const generateLinearPath = () => {
    return `M 0 ${height} L ${width} 0`;
  };

  // Calculate current point position
  const currentX = (donationAmount / maxDonation) * width;
  const maxPower = Math.sqrt(maxDonation);
  const currentY = height - ((qvPower / maxPower) * height);

  return (
    <div className="page-container max-w-5xl space-y-8 pb-24">
      {/* Header */}
      <div className="text-center space-y-4 max-w-3xl mx-auto mb-12">
        <Badge variant="primary" className="mb-4">
          <Sparkles className="w-3.5 h-3.5 mr-1.5 inline" />
          Interactive Dashboard
        </Badge>
        <h1 className="text-4xl md:text-5xl font-display font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary-400 via-white to-secondary-400">
          Quadratic Funding Simulator
        </h1>
        <p className="text-lg text-slate-400 leading-relaxed">
          See how our platform mathematically defends against whale plutocracy. 
          By taking the square root of contributions, we give a proportionally stronger voice to the broader community.
        </p>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        {/* Interactive Visualization (Left/Top) */}
        <div className="lg:col-span-8 space-y-6">
          <GlassCard className="p-1 overflow-hidden bg-slate-950/80 border-white/[0.08]">
            <div className="p-6 md:p-8 space-y-8 bg-gradient-to-b from-slate-900/50 to-slate-950">
              
              {/* Dynamic Readout */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/[0.05]">
                  <p className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-1">Contribution</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-white">{donationAmount.toFixed(0)}</span>
                    <span className="text-sm font-semibold text-slate-400">POL</span>
                  </div>
                </div>
                <div className="hidden md:flex items-center justify-center">
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  >
                    <Zap className="w-8 h-8 text-primary-500/50" />
                  </motion.div>
                </div>
                <div className="p-4 rounded-2xl bg-primary-950/30 border border-primary-500/20 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary-500/10 to-transparent" />
                  <p className="text-xs uppercase tracking-wider text-primary-400 font-bold mb-1 relative z-10">Governance Power</p>
                  <div className="flex items-baseline gap-2 relative z-10">
                    <span className="text-3xl font-black text-primary-300">{qvPower.toFixed(2)}</span>
                    <span className="text-sm font-semibold text-primary-500">Votes</span>
                  </div>
                </div>
              </div>

              {/* Interactive SVG Graph */}
              <div className="relative pt-6 pb-2">
                <div className="absolute -inset-4 bg-primary-500/5 blur-2xl rounded-[3rem] pointer-events-none" />
                
                <div className="relative w-full aspect-[2/1] min-h-[300px]">
                  <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
                    {/* Grid Lines */}
                    <g className="text-slate-800/50" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4">
                      <line x1="0" y1="0" x2={width} y2="0" />
                      <line x1="0" y1={height/2} x2={width} y2={height/2} />
                      <line x1="0" y1={height} x2={width} y2={height} />
                    </g>

                    {/* Linear Plutocracy Line (Traditional) */}
                    <path 
                      d={generateLinearPath()} 
                      fill="none" 
                      stroke="rgba(239, 68, 68, 0.4)" 
                      strokeWidth="2"
                      strokeDasharray="6 6"
                    />

                    {/* Quadratic Curve Base */}
                    <path 
                      d={generatePath()} 
                      fill="none" 
                      stroke="rgba(99, 102, 241, 0.3)" 
                      strokeWidth="4" 
                    />

                    {/* Highlighted Quadratic Curve (up to current point) */}
                    <path 
                      d={generatePath()} 
                      fill="none" 
                      stroke="url(#qvGradient)" 
                      strokeWidth="4" 
                      strokeLinecap="round"
                      style={{
                        clipPath: `inset(0 ${width - currentX}px 0 0)`
                      }}
                    />

                    {/* Current Position Marker */}
                    <motion.g
                      animate={{ x: currentX, y: currentY }}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    >
                      <circle r="8" fill="#818cf8" />
                      <circle r="16" fill="#818cf8" opacity="0.3" className="animate-ping" />
                      
                      {/* Label on graph */}
                      <g transform="translate(-40, -20)">
                        <rect width="80" height="24" rx="12" fill="#1e293b" className="shadow-lg" />
                        <text x="40" y="16" fill="white" fontSize="11" fontWeight="bold" textAnchor="middle">
                          {qvPower.toFixed(1)} Votes
                        </text>
                      </g>
                    </motion.g>

                    <defs>
                      <linearGradient id="qvGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#4f46e5" />
                        <stop offset="50%" stopColor="#818cf8" />
                        <stop offset="100%" stopColor="#c084fc" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
              </div>

              {/* Slider Control */}
              <div className="space-y-4 pt-4">
                <div className="flex justify-between items-center text-sm font-semibold text-slate-400">
                  <span>0 POL</span>
                  <span className="text-primary-400 bg-primary-500/10 px-3 py-1 rounded-full text-xs border border-primary-500/20">Slide to test impact</span>
                  <span>1,000 POL</span>
                </div>
                <input 
                  type="range"
                  min="0"
                  max={maxDonation}
                  step="1"
                  value={donationAmount}
                  onChange={(e) => setDonationAmount(Number(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                  style={{
                    background: `linear-gradient(to right, #6366f1 0%, #6366f1 ${(donationAmount/maxDonation)*100}%, #1e293b ${(donationAmount/maxDonation)*100}%, #1e293b 100%)`
                  }}
                />
              </div>

            </div>
          </GlassCard>
        </div>

        {/* Explainer Sidebar (Right) */}
        <aside className="lg:col-span-4 space-y-6">
          <GlassCard className="p-6 bg-slate-900/40">
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2 mb-4">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              Why use Quadratic?
            </h3>
            <div className="space-y-4 text-sm text-slate-300">
              <p>
                In traditional voting (the red dashed line), 1 token equals 1 vote. This means a wealthy whale who donates 1,000 POL gets 1,000 times more influence than someone who donates 1 POL.
              </p>
              <p>
                <strong>Quadratic Voting</strong> (the purple curve) fixes this. It takes the square root of the contribution to determine voting power.
              </p>
              <ul className="space-y-2 py-2 border-y border-white/[0.08]">
                <li className="flex justify-between">
                  <span>1 POL =</span>
                  <strong className="text-primary-300 font-mono">1 Vote</strong>
                </li>
                <li className="flex justify-between">
                  <span>16 POL =</span>
                  <strong className="text-primary-300 font-mono">4 Votes</strong>
                </li>
                <li className="flex justify-between">
                  <span>100 POL =</span>
                  <strong className="text-primary-300 font-mono">10 Votes</strong>
                </li>
              </ul>
              <p className="text-slate-400 italic text-xs">
                To get 10 times the influence, a whale must pay 100 times the cost. This protects the project from being hijacked by a single large donor, putting power back in the hands of the community.
              </p>
            </div>
          </GlassCard>

          <GlassCard className="p-6 bg-gradient-to-br from-primary-900/30 to-secondary-900/30 border-primary-500/20">
            <h4 className="font-bold text-white mb-2">Ready to contribute?</h4>
            <p className="text-xs text-slate-300 mb-4">
              Your donations are securely locked in smart contract escrows. You have full quadratic voting power over milestone approvals.
            </p>
            <Button variant="primary" to="/explore" className="w-full shadow-glow-primary">
              Explore Active Campaigns <ArrowRight className="w-4 h-4 ml-2 inline" />
            </Button>
          </GlassCard>
        </aside>

      </div>
    </div>
  );
}
