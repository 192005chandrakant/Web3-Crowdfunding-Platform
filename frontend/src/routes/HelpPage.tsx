import React, { useState } from 'react';
import { Search, ChevronDown, ChevronUp, HelpCircle, FileText, Send, ExternalLink, Book, MessageCircle, Mail } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard, Button, Badge } from '@/components/ui';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: 'general' | 'campaigns' | 'donations' | 'milestones' | 'technical';
}

export const HelpPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const faqs: FAQItem[] = [
    {
      id: '1',
      category: 'general',
      question: 'What is MilestoneChain?',
      answer: 'MilestoneChain is a blockchain-based crowdfunding platform that uses milestone-based fund releases. Instead of releasing all funds upfront, funds are held in smart contract escrow and released only when campaign creators complete verified milestones, ensuring donor trust and project accountability.',
    },
    {
      id: '2',
      category: 'general',
      question: 'How does milestone-based funding work?',
      answer: 'Campaign creators define specific milestones with target amounts and completion criteria. Donations are held in a secure smart contract escrow. When a milestone is completed, the creator submits proof, community validators vote on approval, and funds are released only after successful voting. This ensures transparency and reduces risk for donors.',
    },
    {
      id: '3',
      category: 'campaigns',
      question: 'How do I create a campaign?',
      answer: 'Connect your wallet, click "Create Campaign", fill in your campaign details including title, description, funding goal, and define your milestones with clear deliverables. Upload a cover image and submit. Your campaign will be deployed as a smart contract on the blockchain.',
    },
    {
      id: '4',
      category: 'campaigns',
      question: 'What information do I need for milestones?',
      answer: 'Each milestone needs: a clear title, detailed description of deliverables, target funding amount, completion timeline, and success criteria. Be specific about what evidence you\'ll provide upon completion (reports, photos, receipts, etc.).',
    },
    {
      id: '5',
      category: 'campaigns',
      question: 'Can I edit my campaign after launching?',
      answer: 'You can update the campaign description and add updates, but core parameters like funding goal and milestones cannot be changed once the smart contract is deployed. This ensures fairness and prevents fraud.',
    },
    {
      id: '6',
      category: 'donations',
      question: 'How do I donate to a campaign?',
      answer: 'Browse campaigns, select one you want to support, click "Donate", choose your donation amount, and approve the transaction in your wallet. Your funds are held in the campaign\'s smart contract escrow until milestones are completed.',
    },
    {
      id: '7',
      category: 'donations',
      question: 'Are my donations refundable?',
      answer: 'Yes, under certain conditions. If a campaign is cancelled before milestone completion or if milestones consistently fail community voting, you may be eligible for a refund. The smart contract handles refunds automatically based on programmed rules.',
    },
    {
      id: '8',
      category: 'donations',
      question: 'What cryptocurrencies can I use?',
      answer: 'Currently, MilestoneChain accepts ETH (Ethereum) and MATIC (Polygon) for donations. We plan to add support for more cryptocurrencies and stablecoins in the future.',
    },
    {
      id: '9',
      category: 'milestones',
      question: 'Who votes on milestone completion?',
      answer: 'Community validators (donors and verified community members) review submitted evidence and vote on whether milestones are complete. The voting threshold is set when the campaign is created (typically 51% or 66% approval required).',
    },
    {
      id: '10',
      category: 'milestones',
      question: 'What happens if a milestone is rejected?',
      answer: 'If community voting rejects a milestone, the creator can revise their submission with additional evidence and resubmit. After multiple rejections, donors may become eligible for refunds depending on the campaign\'s refund policy.',
    },
    {
      id: '11',
      category: 'milestones',
      question: 'How long does milestone voting take?',
      answer: 'Voting periods typically last 3-7 days depending on campaign settings. Once the voting threshold is reached, funds are released automatically by the smart contract.',
    },
    {
      id: '12',
      category: 'technical',
      question: 'Which blockchain does MilestoneChain use?',
      answer: 'MilestoneChain operates on Ethereum mainnet and Polygon for lower transaction fees. Campaign smart contracts are deployed on your chosen network when you create a campaign.',
    },
    {
      id: '13',
      category: 'technical',
      question: 'Do I need cryptocurrency to use the platform?',
      answer: 'Yes, you need a Web3 wallet (like MetaMask) with ETH or MATIC to donate or create campaigns. You\'ll also need a small amount for gas fees (transaction costs).',
    },
    {
      id: '14',
      category: 'technical',
      question: 'How are my funds secured?',
      answer: 'All funds are held in audited smart contracts with multi-signature security. The contracts are immutable and follow industry-standard security practices. Your donations are never held by MilestoneChain - they go directly to the blockchain escrow.',
    },
    {
      id: '15',
      category: 'technical',
      question: 'What are gas fees?',
      answer: 'Gas fees are transaction costs paid to blockchain validators. You pay gas fees when donating, creating campaigns, or voting. Fees vary based on network congestion. Using Polygon typically results in much lower fees than Ethereum mainnet.',
    },
  ];

  const categories = [
    { id: 'all', label: 'All Topics', count: faqs.length },
    { id: 'general', label: 'General', count: faqs.filter(f => f.category === 'general').length },
    { id: 'campaigns', label: 'Campaigns', count: faqs.filter(f => f.category === 'campaigns').length },
    { id: 'donations', label: 'Donations', count: faqs.filter(f => f.category === 'donations').length },
    { id: 'milestones', label: 'Milestones', count: faqs.filter(f => f.category === 'milestones').length },
    { id: 'technical', label: 'Technical', count: faqs.filter(f => f.category === 'technical').length },
  ];

  const filteredFaqs = faqs.filter(faq => {
    const matchesCategory = activeCategory === 'all' || faq.category === activeCategory;
    const matchesSearch = searchQuery === '' || 
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-surface to-background">
      {/* Header */}
      <div className="border-b border-border/50 bg-surface/50 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          <div className="inline-flex items-center justify-center p-3 rounded-xl bg-primary/10 mb-6">
            <HelpCircle className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-4xl font-display font-bold text-foreground mb-4">
            How can we help you?
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            Find answers to common questions or get in touch with our support team
          </p>

          {/* Search */}
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search for answers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-surface border border-border rounded-xl 
                         text-foreground placeholder:text-muted-foreground text-lg
                         focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Quick Links */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
          <GlassCard className="p-6 hover:shadow-lg transition-shadow cursor-pointer group">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <Book className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground mb-1">Documentation</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Detailed guides and API docs
                </p>
                <a 
                  href="https://docs.milestonechain.io" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  View Docs <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-6 hover:shadow-lg transition-shadow cursor-pointer group">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-secondary/10 group-hover:bg-secondary/20 transition-colors">
                <MessageCircle className="w-6 h-6 text-secondary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground mb-1">Community</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Join our Discord community
                </p>
                <a 
                  href="https://discord.gg/milestonechain" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-secondary hover:underline flex items-center gap-1"
                >
                  Join Discord <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-6 hover:shadow-lg transition-shadow cursor-pointer group">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-blockchain/10 group-hover:bg-blockchain/20 transition-colors">
                <FileText className="w-6 h-6 text-blockchain" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground mb-1">Smart Contracts</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  View audited contracts
                </p>
                <a 
                  href="https://github.com/milestonechain/contracts" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-blockchain hover:underline flex items-center gap-1"
                >
                  View on GitHub <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Category Filters */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors
                ${activeCategory === cat.id 
                  ? 'bg-primary text-white' 
                  : 'bg-surface text-muted-foreground hover:bg-surface-elevated'
                }`}
            >
              {cat.label} ({cat.count})
            </button>
          ))}
        </div>

        {/* FAQ List */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-foreground mb-6">
            {searchQuery ? 'Search Results' : 'Frequently Asked Questions'}
          </h2>

          {filteredFaqs.length === 0 ? (
            <GlassCard className="p-12 text-center">
              <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No results found
              </h3>
              <p className="text-muted-foreground">
                Try different keywords or browse all topics
              </p>
            </GlassCard>
          ) : (
            filteredFaqs.map((faq, index) => (
              <motion.div
                key={faq.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <GlassCard className="overflow-hidden">
                  <button
                    onClick={() => setExpandedId(expandedId === faq.id ? null : faq.id)}
                    className="w-full p-6 text-left hover:bg-surface/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="secondary" className="text-xs">
                            {faq.category}
                          </Badge>
                        </div>
                        <h3 className="text-lg font-semibold text-foreground">
                          {faq.question}
                        </h3>
                      </div>
                      <div className="flex-shrink-0">
                        {expandedId === faq.id ? (
                          <ChevronUp className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </button>

                  <AnimatePresence>
                    {expandedId === faq.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="px-6 pb-6 text-muted-foreground leading-relaxed">
                          {faq.answer}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </GlassCard>
              </motion.div>
            ))
          )}
        </div>

        {/* Contact Support */}
        <GlassCard className="mt-12 p-8">
          <div className="text-center max-w-2xl mx-auto">
            <div className="inline-flex items-center justify-center p-3 rounded-xl bg-primary/10 mb-4">
              <Mail className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-2xl font-semibold text-foreground mb-3">
              Still need help?
            </h2>
            <p className="text-muted-foreground mb-6">
              Can't find what you're looking for? Our support team is here to help you.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button 
                variant="primary" 
                leadingIcon={<Send className="w-4 h-4" />}
              >
                Contact Support
              </Button>
              <Button 
                variant="outline"
                leadingIcon={<MessageCircle className="w-4 h-4" />}
              >
                Live Chat
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              Average response time: 2-4 hours
            </p>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};
