import React, { useState, useEffect } from 'react';
import {
  User, Bell, Shield, Save, Check, AlertCircle, Loader2, Key, Download, Trash2, LogOut, CheckCircle2, XCircle, Sliders
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard, Button, Badge, Avatar } from '@/components/ui';
import { useAccount, useDisconnect } from 'wagmi';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { useSendTestNotification } from '@/hooks/useNotifications';

type SettingsTab = 'profile' | 'notifications' | 'privacy' | 'appearance' | 'security';
type DesiredRole = 'donor' | 'creator' | 'reviewer';

const ROLE_OPTIONS: Array<{
  id: DesiredRole;
  title: string;
  description: string;
  reviewRequired: boolean;
}> = [
  {
    id: 'donor',
    title: 'Governance Donor',
    description: 'Browse campaigns, contribute funds, and vote on milestones when eligible.',
    reviewRequired: false
  },
  {
    id: 'creator',
    title: 'Campaign Creator',
    description: 'Create campaigns, manage milestones, and upload proof for donor review.',
    reviewRequired: false
  },
  {
    id: 'reviewer',
    title: 'Reviewer / Moderator',
    description: 'Review flagged content and help keep public campaign quality high.',
    reviewRequired: true
  }
];

function getRoleLabel(value?: string | null) {
  switch (value) {
    case 'creator':
      return 'Campaign Creator';
    case 'admin':
      return 'Platform Admin';
    case 'reviewer':
    case 'moderator':
      return 'Reviewer / Moderator';
    default:
      return 'Governance Donor';
  }
}

export function SettingsPage() {
  const { address } = useAccount();
  const { disconnect } = useDisconnect();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [saved, setSaved] = useState(false);
  const sendTestMutation = useSendTestNotification(address);

  // 1. Profile settings
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('donor');

  // 2. Notification preferences
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [donationNotifs, setDonationNotifs] = useState(true);
  const [milestoneNotifs, setMilestoneNotifs] = useState(true);
  const [voteNotifs, setVoteNotifs] = useState(true);
  const [updateNotifs, setUpdateNotifs] = useState(false);

  // 3. Privacy settings
  const [publicProfile, setPublicProfile] = useState(true);
  const [showDonations, setShowDonations] = useState(true);
  const [showCampaigns, setShowCampaigns] = useState(true);

  // 4. Appearance & Localization
  const [language, setLanguage] = useState('en');
  const [currency, setCurrency] = useState('USD');
  const [theme, setTheme] = useState('dark');

  // Load existing user profile & preferences from database
  const { data: userResponse, isLoading: isLoadingUser } = useQuery({
    queryKey: ['user', address],
    queryFn: () => api.getUser(address!),
    enabled: !!address,
    staleTime: 30_000,
  });

  const user = userResponse?.user;

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
      setEmail(user.email || '');
      setRole(user.requestedRole || user.role || 'donor');

      if (user.preferences) {
        const notifs = user.preferences.notifications || {};
        setEmailNotifs(notifs.email !== false);
        setDonationNotifs(notifs.donations !== false);
        setMilestoneNotifs(notifs.milestones !== false);
        setVoteNotifs(notifs.votes !== false);
        setUpdateNotifs(!!notifs.updates);

        const priv = user.preferences.privacy || {};
        setPublicProfile(priv.publicProfile !== false);
        setShowDonations(priv.showDonations !== false);
        setShowCampaigns(priv.showCampaigns !== false);

        const app = user.preferences.appearance || {};
        if (app.language) setLanguage(app.language);
        if (app.currency) setCurrency(app.currency);
        if (app.theme) setTheme(app.theme);
      }
    }
  }, [user]);

  // Persistent Save Mutation across all tabs
  const saveMutation = useMutation({
    mutationFn: () => {
      if (!address) throw new Error('Connect your wallet to save settings');
      return api.upsertUser({
        walletAddress: address,
        displayName,
        email,
        role,
        requestedRole: role,
        preferences: {
          notifications: {
            email: emailNotifs,
            donations: donationNotifs,
            milestones: milestoneNotifs,
            votes: voteNotifs,
            updates: updateNotifs
          },
          privacy: {
            publicProfile,
            showDonations,
            showCampaigns
          },
          appearance: {
            language,
            currency,
            theme
          }
        }
      });
    },
    onSuccess: (response) => {
      const nextUser = response.user;
      const roleStateChanged =
        nextUser.role !== user?.role ||
        nextUser.requestedRole !== user?.requestedRole ||
        nextUser.accountStatus !== user?.accountStatus;

      setRole(nextUser.requestedRole || nextUser.role || 'donor');
      queryClient.invalidateQueries({ queryKey: ['user', address] });
      queryClient.invalidateQueries({ queryKey: ['creatorDashboard'] });
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      // Apply theme preference to localStorage for reactive client styling
      localStorage.setItem('milestonechain-theme', theme);
      localStorage.setItem('milestonechain-currency', currency);

      setSaved(true);
      if (nextUser.accountStatus === 'pending_review') {
        toast.success(`${getRoleLabel(nextUser.requestedRole)} request submitted for admin review.`);
      } else {
        toast.success('Settings and preferences permanently saved!');
      }
      setTimeout(() => setSaved(false), 2500);

      if (roleStateChanged) {
        setTimeout(() => window.location.reload(), 900);
      }
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to save settings');
    }
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate();
  };

  const handleSendTest = () => {
    sendTestMutation.mutate(
      {
        title: '⚙️ Settings Pipeline Verified!',
        message: 'Your Observer architecture, email routing via Resend, and real-time SSE stream are synchronized and active!',
        recipientEmail: email || undefined
      },
      {
        onSuccess: () => toast.success('Test broadcasted across all active Observers! Check top-right toast & email!'),
        onError: () => toast.error('Failed to dispatch test notification')
      }
    );
  };

  const handleExportData = () => {
    const dataToExport = {
      timestamp: new Date().toISOString(),
      walletAddress: address,
      profile: { displayName, email, role },
      verification: {
        status: user?.verificationStatus || 'unverified',
        gitcoinPassportScore: user?.gitcoinPassportScore || 0,
        worldIdVerified: user?.worldIdVerified || false
      },
      preferences: {
        notifications: { email: emailNotifs, donations: donationNotifs, milestones: milestoneNotifs, votes: voteNotifs, updates: updateNotifs },
        privacy: { publicProfile, showDonations, showCampaigns },
        appearance: { language, currency, theme }
      }
    };

    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `milestonechain-settings-${address?.slice(0, 6)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success('Profile preferences JSON exported successfully!');
  };

  const handleClearLocalCache = () => {
    localStorage.removeItem('milestonechain-theme');
    localStorage.removeItem('milestonechain-currency');
    queryClient.clear();
    toast.success('Local application cache purged!');
  };

  const tabs = [
    { id: 'profile' as const,       label: 'Profile',       icon: <User className="w-4 h-4" />,      desc: 'Identity & email' },
    { id: 'notifications' as const, label: 'Notifications', icon: <Bell className="w-4 h-4" />,      desc: 'Observer delivery channels' },
    { id: 'privacy' as const,       label: 'Privacy',       icon: <Shield className="w-4 h-4" />,    desc: 'Public visibility controls' },
    { id: 'appearance' as const,    label: 'Appearance',    icon: <Sliders className="w-4 h-4" />,   desc: 'Theme & display currency' },
    { id: 'security' as const,      label: 'Security & Web3', icon: <Key className="w-4 h-4" />,       desc: 'Sybil score & sessions' },
  ];

  const toggleClass = "w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600 cursor-pointer";

  if (!address) {
    return (
      <div className="page-container flex min-h-[60vh] items-center justify-center">
        <GlassCard className="p-8 max-w-md text-center border-primary-500/40 dark:border-primary-500/30">
          <AlertCircle className="w-12 h-12 text-amber-400 mx-auto mb-4 animate-pulse" />
          <h2 className="text-2xl font-display font-bold mb-2 text-slate-100">Wallet Required</h2>
          <p className="text-slate-400 mb-6">Please connect your Web3 wallet in the navigation bar to configure your platform preferences and real-time observer settings.</p>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="page-container max-w-6xl mx-auto">
      {/* Header & Save Action */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-display font-bold text-slate-100">Settings & Preferences</h1>
            <Badge variant="blockchain" className="text-xs">Enterprise Sync</Badge>
          </div>
          <p className="text-slate-400 mt-1.5">Manage your Web3 identity, multi-channel notifications, and interface customization</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            id="settings-save-button"
            variant="primary"
            size="md"
            leadingIcon={
              saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> :
              saved ? <Check className="w-4 h-4 text-emerald-300" /> :
              <Save className="w-4 h-4" />
            }
            onClick={handleSave}
            disabled={saveMutation.isPending || isLoadingUser}
            className={`transition-all duration-300 ${saved ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/25' : ''}`}
          >
            {saveMutation.isPending ? 'Saving to Database...' : saved ? 'Saved successfully!' : 'Save All Preferences'}
          </Button>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Sidebar Navigation Tabs */}
        <div className="md:col-span-4 lg:col-span-3 space-y-2">
          <GlassCard className="p-2 space-y-1 bg-slate-100/60 dark:bg-slate-900/60 border-white/[0.06]">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                id={`settings-tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-sm font-medium transition-all text-left ${
                  activeTab === tab.id
                    ? 'bg-primary-600/20 text-primary-300 border border-primary-500/40 shadow-[0_0_15px_rgba(14,165,233,0.15)]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
                }`}
              >
                <div className={`p-2 rounded-lg ${activeTab === tab.id ? 'bg-primary-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
                  {tab.icon}
                </div>
                <div>
                  <div className="font-semibold">{tab.label}</div>
                  <div className="text-[11px] text-slate-500 hidden sm:block">{tab.desc}</div>
                </div>
              </button>
            ))}
          </GlassCard>

          {/* Quick Wallet Identity Preview */}
          <GlassCard className="p-4 bg-slate-50/50 dark:bg-slate-950/50 border-white/[0.04]">
            <div className="flex items-center gap-3">
              <Avatar fallback={address} size="md" />
              <div className="min-w-0 flex-1">
                <div className="text-xs text-slate-400 truncate font-mono">{address}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[11px] text-emerald-400 font-medium">{getRoleLabel(user?.role || role)} Active</span>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Tab Content Panels */}
        <div className="md:col-span-8 lg:col-span-9 space-y-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
            >
              {/* ── 1. Profile & Account Tab ── */}
              {activeTab === 'profile' && (
                <GlassCard className="p-7 space-y-6 border-white/[0.08]">
                  <div>
                    <h2 className="text-xl font-display font-semibold text-slate-100">Public Profile Identity</h2>
                    <p className="text-sm text-slate-400 mt-1">Customize how your creator name and donor identity appear across project vaults and governance leaderboards.</p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-6 p-5 rounded-2xl bg-slate-800/30 border border-white/[0.04]">
                    <Avatar fallback={address} size="xl" className="shadow-xl ring-2 ring-primary-500/50" />
                    <div className="space-y-1 text-center sm:text-left">
                      <h3 className="text-base font-bold text-slate-200">Ethereum & Polygon Wallet Address</h3>
                      <p className="font-mono text-xs text-slate-400 bg-slate-900/80 px-3 py-1.5 rounded-lg border border-white/[0.06] select-all">
                        {address}
                      </p>
                      <span className="text-xs text-slate-500 inline-block mt-1">Your decentralized account address cannot be modified.</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                    <div>
                      <label className="block text-sm font-semibold text-slate-200 mb-2">Display Name</label>
                      <input
                        id="profile-display-name"
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="e.g. Alex Satoshi"
                        className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all"
                      />
                      <p className="text-xs text-slate-500 mt-1.5">Displayed on campaign creator pages and milestone review discussions.</p>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-200 mb-2">Notification Email Address</label>
                      <input
                        id="profile-email-address"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="yourname@domain.com"
                        className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all"
                      />
                      <p className="text-xs text-slate-500 mt-1.5">Used exclusively for transactional Resend notifications (never shared publicly).</p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/[0.06]">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <label className="block text-sm font-semibold text-slate-200">Platform Role</label>
                        <p className="text-xs text-slate-500 mt-1">
                          Donor and creator access activate immediately. Reviewer access requires admin approval.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant={user?.accountStatus === 'pending_review' ? 'warning' : 'success'}>
                          {(user?.accountStatus || 'active').replace('_', ' ')}
                        </Badge>
                        <Badge variant="primary">
                          Active: {getRoleLabel(user?.role || role)}
                        </Badge>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
                      {ROLE_OPTIONS.map((option) => {
                        const selected = role === option.id;
                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => setRole(option.id)}
                            className={`rounded-xl border p-4 text-left transition-all ${
                              selected
                                ? 'border-primary-500/50 bg-primary-500/10 shadow-[0_0_18px_rgba(14,165,233,0.14)]'
                                : 'border-white/[0.08] bg-slate-900/50 hover:border-white/[0.16]'
                            }`}
                          >
                            <div className="mb-2 flex items-center justify-between gap-3">
                              <span className="font-bold text-sm text-slate-100">{option.title}</span>
                              {selected && <Check className="h-4 w-4 text-primary-300" />}
                            </div>
                            <p className="text-xs leading-relaxed text-slate-400">{option.description}</p>
                            {option.reviewRequired && (
                              <span className="mt-3 inline-flex rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-300">
                                Admin review required
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {user?.requestedRole && user.requestedRole !== user.role && (
                      <p className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
                        Your {getRoleLabel(user.requestedRole)} request is waiting for admin approval. Current active role remains {getRoleLabel(user.role)}.
                      </p>
                    )}
                  </div>
                </GlassCard>
              )}

              {/* ── 2. Notifications Tab ── */}
              {activeTab === 'notifications' && (
                <div className="space-y-6">
                  <GlassCard className="p-7 space-y-6 border-white/[0.08]">
                    <div>
                      <h2 className="text-xl font-display font-semibold text-slate-100">Multi-Channel Observer Delivery</h2>
                      <p className="text-sm text-slate-400 mt-1">Configure which blockchain event triggers fire real-time browser toasts (SSE) and transactional HTML emails.</p>
                    </div>

                    <div className="space-y-4 divide-y divide-white/[0.04]">
                      <div className="flex items-center justify-between pt-2">
                        <div>
                          <div className="font-semibold text-slate-200">Master Email Notifications</div>
                          <div className="text-xs text-slate-400">Receive transactional emails when key events occur on your vaults</div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" checked={emailNotifs} onChange={(e) => setEmailNotifs(e.target.checked)} className="sr-only peer" />
                          <div className={toggleClass} />
                        </label>
                      </div>

                      <div className="flex items-center justify-between pt-4">
                        <div>
                          <div className="font-semibold text-slate-200">Donations & Contribution Receipts</div>
                          <div className="text-xs text-slate-400">Notify me instantly when donors contribute MATIC/POL to my campaigns</div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" checked={donationNotifs} onChange={(e) => setDonationNotifs(e.target.checked)} className="sr-only peer" />
                          <div className={toggleClass} />
                        </label>
                      </div>

                      <div className="flex items-center justify-between pt-4">
                        <div>
                          <div className="font-semibold text-slate-200">Milestone Proof Uploads & Tranche Releases</div>
                          <div className="text-xs text-slate-400">Receive alerts when IPFS evidence is submitted or smart contract funds unlock</div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" checked={milestoneNotifs} onChange={(e) => setMilestoneNotifs(e.target.checked)} className="sr-only peer" />
                          <div className={toggleClass} />
                        </label>
                      </div>

                      <div className="flex items-center justify-between pt-4">
                        <div>
                          <div className="font-semibold text-slate-200">Quadratic Governance Votes</div>
                          <div className="text-xs text-slate-400">Notify me when community donors cast approve/reject votes on my milestones</div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" checked={voteNotifs} onChange={(e) => setVoteNotifs(e.target.checked)} className="sr-only peer" />
                          <div className={toggleClass} />
                        </label>
                      </div>

                      <div className="flex items-center justify-between pt-4">
                        <div>
                          <div className="font-semibold text-slate-200">Platform News & Governance Summaries</div>
                          <div className="text-xs text-slate-400">Weekly digests on matching pools and platform upgrades</div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" checked={updateNotifs} onChange={(e) => setUpdateNotifs(e.target.checked)} className="sr-only peer" />
                          <div className={toggleClass} />
                        </label>
                      </div>
                    </div>
                  </GlassCard>

                  {/* Diagnostic Test Box */}
                  <GlassCard className="p-6 border-primary-500/40 dark:border-primary-500/30 bg-slate-100/60 dark:bg-slate-900/60 shadow-[0_4px_25px_rgba(14,165,233,0.1)]">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                            <span>⚡ Integrated Observer Pipeline Diagnostic</span>
                          </h3>
                          <Badge variant="blockchain">Live Tester</Badge>
                        </div>
                        <p className="text-xs text-slate-400">
                          Instantly trigger an end-to-end event across all 4 subscribed backend observers (In-App Database Inbox, Real-time SSE Browser Socket, and Resend Transactional Email).
                        </p>
                      </div>
                      <Button
                        id="settings-test-observer"
                        variant="outline"
                        size="sm"
                        className="border-primary-500/50 text-primary-300 hover:bg-primary-500/10 shrink-0"
                        leadingIcon={sendTestMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4 text-amber-400" />}
                        onClick={handleSendTest}
                        disabled={sendTestMutation.isPending}
                      >
                        {sendTestMutation.isPending ? 'Broadcasting...' : 'Trigger All Channels'}
                      </Button>
                    </div>
                  </GlassCard>
                </div>
              )}

              {/* ── 3. Privacy & Visibility Tab ── */}
              {activeTab === 'privacy' && (
                <GlassCard className="p-7 space-y-6 border-white/[0.08]">
                  <div>
                    <h2 className="text-xl font-display font-semibold text-slate-100">Privacy & Profile Visibility</h2>
                    <p className="text-sm text-slate-400 mt-1">Control how much of your transaction activity and governance voting power is displayed to other community members.</p>
                  </div>

                  <div className="space-y-5 divide-y divide-white/[0.04]">
                    <div className="flex items-center justify-between pt-2">
                      <div>
                        <div className="font-semibold text-slate-200">Public Creator & Donor Profile</div>
                        <div className="text-xs text-slate-400">Allow other community members to inspect your public portfolio dashboard</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={publicProfile} onChange={(e) => setPublicProfile(e.target.checked)} className="sr-only peer" />
                        <div className={toggleClass} />
                      </label>
                    </div>

                    <div className="flex items-center justify-between pt-4">
                      <div>
                        <div className="font-semibold text-slate-200">Show Donation Amounts in Recent Feeds</div>
                        <div className="text-xs text-slate-400">If unchecked, your contributions will appear as &quot;Anonymous Donor&quot; in campaign feeds</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={showDonations} onChange={(e) => setShowDonations(e.target.checked)} className="sr-only peer" />
                        <div className={toggleClass} />
                      </label>
                    </div>

                    <div className="flex items-center justify-between pt-4">
                      <div>
                        <div className="font-semibold text-slate-200">Index Created Campaigns on Explore Leaderboard</div>
                        <div className="text-xs text-slate-400">Allow search engine algorithms and platform explore pages to showcase your vaults</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={showCampaigns} onChange={(e) => setShowCampaigns(e.target.checked)} className="sr-only peer" />
                        <div className={toggleClass} />
                      </label>
                    </div>
                  </div>
                </GlassCard>
              )}

              {/* ── 4. Appearance & Localization Tab ── */}
              {activeTab === 'appearance' && (
                <GlassCard className="p-7 space-y-6 border-white/[0.08]">
                  <div>
                    <h2 className="text-xl font-display font-semibold text-slate-100">Appearance & Localization</h2>
                    <p className="text-sm text-slate-400 mt-1">Select your display currency for milestone target conversions and choose your favorite aesthetic theme.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                    <div>
                      <label className="block text-sm font-semibold text-slate-200 mb-2">Display Currency Reference</label>
                      <select
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                      >
                        <option value="USD">USD — United States Dollar ($)</option>
                        <option value="EUR">EUR — Euro (€)</option>
                        <option value="POL">POL / MATIC — Native Web3 Token</option>
                        <option value="ETH">ETH — Ethereum Reference</option>
                      </select>
                      <p className="text-xs text-slate-500 mt-1.5">Converts target vault goals into familiar fiat equivalents in dashboards.</p>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-200 mb-2">Interface Language</label>
                      <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                      >
                        <option value="en">English (US)</option>
                        <option value="es">Español</option>
                        <option value="de">Deutsch</option>
                        <option value="ja">日本語 (Japanese)</option>
                      </select>
                      <p className="text-xs text-slate-500 mt-1.5">Sets formatting for numbers, dates, and navigation labels.</p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/[0.06]">
                    <label className="block text-sm font-semibold text-slate-200 mb-3">Color Theme Mode</label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {[
                        { id: 'dark', title: 'Dark Neon', color: 'bg-sky-500', desc: 'Sleek slate with vibrant sky blue accents' },
                        { id: 'midnight', title: 'Midnight Blue', color: 'bg-indigo-500', desc: 'Deep cosmic purple and indigo tones' },
                        { id: 'cyber', title: 'Cyberpunk Amber', color: 'bg-amber-500', desc: 'High-contrast black with amber glow' },
                      ].map((th) => (
                        <button
                          key={th.id}
                          type="button"
                          onClick={() => setTheme(th.id)}
                          className={`p-4 rounded-xl text-left border transition-all ${
                            theme === th.id
                              ? 'bg-slate-800/80 border-primary-500 ring-1 ring-primary-500 shadow-lg shadow-primary-500/10'
                              : 'bg-slate-900/50 border-white/[0.06] hover:bg-slate-800/40'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`w-3 h-3 rounded-full ${th.color}`} />
                            <span className="font-bold text-sm text-slate-200">{th.title}</span>
                            {theme === th.id && <Check className="w-4 h-4 text-primary-400 ml-auto" />}
                          </div>
                          <p className="text-[11px] text-slate-400 leading-normal">{th.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </GlassCard>
              )}

              {/* ── 5. Security & Web3 Identity Tab ── */}
              {activeTab === 'security' && (
                <div className="space-y-6">
                  {/* Sybil Verification Showcase */}
                  <GlassCard className="p-7 space-y-6 border-white/[0.08]">
                    <div>
                      <h2 className="text-xl font-display font-semibold text-slate-100">Sybil Resistance & Quadratic Governance Weight</h2>
                      <p className="text-sm text-slate-400 mt-1">Verified human accounts receive up to a 1.5× boost in quadratic voting weight when reviewing milestone evidence.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Gitcoin Passport Gauge */}
                      <div className="p-5 rounded-2xl bg-slate-100/60 dark:bg-slate-900/60 border border-white/[0.06] flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-bold text-slate-200 text-sm">Gitcoin Passport Sybil Score</span>
                            <Badge variant={(user?.gitcoinPassportScore || 0) >= 15 ? 'success' : 'default'}>
                              {(user?.gitcoinPassportScore || 0) >= 15 ? 'Verified Human' : 'Unverified'}
                            </Badge>
                          </div>
                          <div className="text-3xl font-bold font-display text-slate-100 my-2">
                            {user?.gitcoinPassportScore || 0} <span className="text-sm font-normal text-slate-500">/ 100</span>
                          </div>
                          <p className="text-xs text-slate-400 leading-relaxed">
                            A score over 15 prevents collusion and guarantees your quadratic voting ballots are counted with full mathematical weight.
                          </p>
                        </div>
                        <div className="mt-4 pt-4 border-t border-white/[0.06] flex items-center justify-between">
                          <span className="text-xs text-slate-500">Powered by Gitcoin Passport</span>
                          <a
                            href="https://passport.gitcoin.co/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-semibold text-primary-400 hover:text-primary-300 transition-colors"
                          >
                            Refresh Score →
                          </a>
                        </div>
                      </div>

                      {/* World ID Proof */}
                      <div className="p-5 rounded-2xl bg-slate-100/60 dark:bg-slate-900/60 border border-white/[0.06] flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-bold text-slate-200 text-sm">World ID Proof of Personhood</span>
                            {user?.worldIdVerified ? (
                              <span className="inline-flex items-center gap-1 text-emerald-400 text-xs font-bold"><CheckCircle2 className="w-4 h-4" /> Verified</span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-slate-500 text-xs font-medium"><XCircle className="w-4 h-4" /> Unlinked</span>
                            )}
                          </div>
                          <div className="my-3 flex items-center gap-2">
                            <Shield className={`w-8 h-8 ${user?.worldIdVerified ? 'text-emerald-400' : 'text-slate-400'}`} />
                            <div className="text-sm text-slate-300 font-medium">
                              {user?.worldIdVerified ? 'Orb Biometric Verification Complete' : 'Connect World App to Unlock 1.5× Voting Boost'}
                            </div>
                          </div>
                          <p className="text-xs text-slate-400 leading-relaxed">
                            Zero-knowledge cryptography ensures your wallet address remains entirely pseudonymous while confirming unique human status.
                          </p>
                        </div>
                        <div className="mt-4 pt-4 border-t border-white/[0.06] flex items-center justify-between">
                          <span className="text-xs text-slate-500">Worldcoin ID Integration</span>
                          <button
                            type="button"
                            onClick={() => toast('World ID linking modal opening...', { icon: '🛡️' })}
                            className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
                          >
                            {user?.worldIdVerified ? 'Manage Orb ID →' : 'Link World ID →'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </GlassCard>

                  {/* Session & Data Controls */}
                  <GlassCard className="p-7 space-y-5 border-white/[0.08] bg-white/60 dark:bg-slate-950/60">
                    <div>
                      <h2 className="text-lg font-display font-semibold text-slate-100">Session Controls & Data Portability</h2>
                      <p className="text-xs text-slate-400 mt-1">Manage your active Web3 wallet connection, purge localized browser cache, or download your data.</p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
                      <Button
                        id="settings-export-data"
                        variant="outline"
                        size="sm"
                        leadingIcon={<Download className="w-4 h-4 text-primary-400" />}
                        onClick={handleExportData}
                        className="flex-1 justify-center border-white/[0.1] hover:bg-slate-800/50"
                      >
                        Export Profile & Preferences (JSON)
                      </Button>

                      <Button
                        id="settings-clear-cache"
                        variant="outline"
                        size="sm"
                        leadingIcon={<Trash2 className="w-4 h-4 text-amber-400" />}
                        onClick={handleClearLocalCache}
                        className="flex-1 justify-center border-amber-500/30 text-amber-300 hover:bg-amber-500/10"
                      >
                        Purge Local App Cache
                      </Button>

                      <Button
                        id="settings-disconnect-wallet"
                        variant="outline"
                        size="sm"
                        leadingIcon={<LogOut className="w-4 h-4 text-rose-400" />}
                        onClick={() => { disconnect(); toast.success('Wallet disconnected cleanly.'); }}
                        className="flex-1 justify-center border-rose-500/30 text-rose-400 hover:bg-rose-500/10"
                      >
                        Disconnect Wallet Session
                      </Button>
                    </div>
                  </GlassCard>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
