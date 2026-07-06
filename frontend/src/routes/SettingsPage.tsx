import React, { useState, useEffect } from 'react';
import { User, Bell, Eye, Shield, Globe, Save, Check, AlertCircle, Loader2 } from 'lucide-react';
import { GlassCard, Button, Badge, Avatar } from '@/components/ui';
import { useAccount } from 'wagmi';
import { useAuth } from '@clerk/clerk-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

type SettingsTab = 'profile' | 'notifications' | 'privacy' | 'preferences';

export function SettingsPage() {
  const { address } = useAccount();
  const { isSignedIn } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [saved, setSaved] = useState(false);

  // Profile settings
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');

  // Notification settings
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [donationNotifications, setDonationNotifications] = useState(true);
  const [milestoneNotifications, setMilestoneNotifications] = useState(true);
  const [voteNotifications, setVoteNotifications] = useState(true);
  const [campaignUpdateNotifications, setCampaignUpdateNotifications] = useState(false);

  // Privacy settings
  const [publicProfile, setPublicProfile] = useState(true);
  const [showDonations, setShowDonations] = useState(true);
  const [showCampaigns, setShowCampaigns] = useState(true);

  // Preferences
  const [language, setLanguage] = useState('en');
  const [currency, setCurrency] = useState('USD');
  const [theme, setTheme] = useState('system');

  // Load existing user profile
  const { data: userResponse, isLoading: isLoadingUser } = useQuery({
    queryKey: ['user', address],
    queryFn: () => api.getUser(address!),
    enabled: !!address,
  });

  useEffect(() => {
    if (userResponse?.user) {
      setDisplayName(userResponse.user.displayName || '');
      setEmail(userResponse.user.email || '');
    }
  }, [userResponse]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: () => {
      if (!isSignedIn || !address) throw new Error('Not authenticated');
      return api.upsertUser(
        { walletAddress: address, displayName, email }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', address] });
      setSaved(true);
      toast.success('Settings saved!');
      setTimeout(() => setSaved(false), 2500);
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to save settings');
    }
  });

  const handleSave = () => {
    saveMutation.mutate();
  };

  const tabs = [
    { id: 'profile' as const,       label: 'Profile',       icon: <User className="w-4 h-4" /> },
    { id: 'notifications' as const, label: 'Notifications', icon: <Bell className="w-4 h-4" /> },
    { id: 'privacy' as const,       label: 'Privacy',       icon: <Shield className="w-4 h-4" /> },
    { id: 'preferences' as const,   label: 'Preferences',   icon: <Globe className="w-4 h-4" /> },
  ];

  const toggleClass = "w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600";

  if (!address) {
    return (
      <div className="page-container flex min-h-[60vh] items-center justify-center">
        <GlassCard className="p-8 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2 text-slate-100">Wallet Not Connected</h2>
          <p className="text-slate-400">Connect your wallet to manage settings.</p>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-100">Settings</h1>
          <p className="text-slate-400 mt-1">Manage your account preferences</p>
        </div>
        <Button
          id="settings-save-btn"
          variant="primary"
          leadingIcon={
            saveMutation.isPending
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : saved
              ? <Check className="w-4 h-4" />
              : <Save className="w-4 h-4" />
          }
          onClick={handleSave}
          disabled={saveMutation.isPending || !siwe}
        >
          {saveMutation.isPending ? 'Saving…' : saved ? 'Saved!' : 'Save Changes'}
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar */}
        <div className="lg:w-56 flex-shrink-0">
          <GlassCard className="p-2">
            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  id={`settings-tab-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-primary-600/20 text-primary-300 border border-primary-500/25'
                      : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border border-transparent'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </nav>
          </GlassCard>
        </div>

        {/* Main Content */}
        <div className="flex-1 space-y-6">

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <>
              <GlassCard className="p-6">
                <h2 className="text-xl font-semibold text-slate-100 mb-6">Profile Information</h2>

                {/* Avatar */}
                <div className="flex items-center gap-6 mb-8">
                  <Avatar address={address} size="xl" />
                  <div>
                    <h3 className="font-medium text-slate-200 mb-1">Profile Picture</h3>
                    <p className="text-sm text-slate-500 mb-3">
                      Your avatar is generated from your wallet address
                    </p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" disabled>Upload Custom</Button>
                      <Badge variant="warning">Coming Soon</Badge>
                    </div>
                  </div>
                </div>

                {/* Form */}
                {isLoadingUser ? (
                  <div className="flex items-center gap-2 text-slate-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Loading profile…</span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="settings-display-name" className="block text-sm font-medium text-slate-300 mb-2">
                        Display Name
                      </label>
                      <input
                        id="settings-display-name"
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Enter your display name"
                        className="w-full px-4 py-2.5 bg-slate-800/50 border border-white/[0.08] rounded-lg text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 transition-colors"
                      />
                    </div>

                    <div>
                      <label htmlFor="settings-email" className="block text-sm font-medium text-slate-300 mb-2">
                        Email Address
                      </label>
                      <input
                        id="settings-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your@email.com"
                        className="w-full px-4 py-2.5 bg-slate-800/50 border border-white/[0.08] rounded-lg text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 transition-colors"
                      />
                      <p className="text-xs text-slate-500 mt-2">Used for notifications and account recovery</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Wallet Address
                      </label>
                      <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-800/30 border border-white/[0.06] rounded-lg">
                        <code className="text-sm font-mono text-slate-400 flex-1 truncate">
                          {address}
                        </code>
                        <Badge variant="blockchain">Connected</Badge>
                      </div>
                    </div>
                  </div>
                )}
              </GlassCard>
            </>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <>
              <GlassCard className="p-6">
                <h2 className="text-xl font-semibold text-slate-100 mb-2">Email Notifications</h2>
                <p className="text-sm text-slate-400 mb-6">Choose what updates you want to receive via email</p>
                <div className="space-y-5">
                  {[
                    { label: 'Email Notifications', desc: 'Receive email updates about your activity', state: emailNotifications, set: setEmailNotifications },
                    { label: 'Donation Notifications', desc: 'Get notified when someone donates to your campaign', state: donationNotifications, set: setDonationNotifications },
                    { label: 'Milestone Updates', desc: 'Updates on milestone submissions and approvals', state: milestoneNotifications, set: setMilestoneNotifications },
                    { label: 'Voting Requests', desc: 'Notify me when milestones need review', state: voteNotifications, set: setVoteNotifications },
                    { label: 'Campaign Updates', desc: "Updates from campaigns you've donated to", state: campaignUpdateNotifications, set: setCampaignUpdateNotifications },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-slate-200">{item.label}</h3>
                        <p className="text-sm text-slate-500">{item.desc}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={item.state}
                          onChange={(e) => item.set(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className={toggleClass} />
                      </label>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </>
          )}

          {/* Privacy Tab */}
          {activeTab === 'privacy' && (
            <>
              <GlassCard className="p-6">
                <h2 className="text-xl font-semibold text-slate-100 mb-2">Privacy Settings</h2>
                <p className="text-sm text-slate-400 mb-6">Control who can see your profile and activity</p>
                <div className="space-y-5">
                  {[
                    { label: 'Public Profile', desc: 'Allow others to view your profile information', state: publicProfile, set: setPublicProfile },
                    { label: 'Show Donations', desc: 'Display your donation history on your profile', state: showDonations, set: setShowDonations },
                    { label: 'Show Campaigns', desc: "Display campaigns you've created on your profile", state: showCampaigns, set: setShowCampaigns },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-slate-200">{item.label}</h3>
                        <p className="text-sm text-slate-500">{item.desc}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={item.state}
                          onChange={(e) => item.set(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className={toggleClass} />
                      </label>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </>
          )}

          {/* Preferences Tab */}
          {activeTab === 'preferences' && (
            <>
              <GlassCard className="p-6">
                <h2 className="text-xl font-semibold text-slate-100 mb-6">Display Preferences</h2>
                <div className="space-y-6">
                  {[
                    {
                      id: 'settings-language', label: 'Language', value: language, onChange: setLanguage,
                      options: [{ value: 'en', label: 'English' }, { value: 'es', label: 'Español' }, { value: 'fr', label: 'Français' }, { value: 'de', label: 'Deutsch' }]
                    },
                    {
                      id: 'settings-currency', label: 'Currency', value: currency, onChange: setCurrency,
                      options: [{ value: 'USD', label: 'USD ($)' }, { value: 'EUR', label: 'EUR (€)' }, { value: 'GBP', label: 'GBP (£)' }, { value: 'JPY', label: 'JPY (¥)' }]
                    },
                    {
                      id: 'settings-theme', label: 'Theme', value: theme, onChange: setTheme,
                      options: [{ value: 'system', label: 'System' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]
                    },
                  ].map((sel) => (
                    <div key={sel.id}>
                      <label htmlFor={sel.id} className="block text-sm font-medium text-slate-300 mb-2">{sel.label}</label>
                      <select
                        id={sel.id}
                        value={sel.value}
                        onChange={(e) => sel.onChange(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-800/50 border border-white/[0.08] rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-colors"
                      >
                        {sel.options.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
