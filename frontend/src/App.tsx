import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { AppProviders } from "@/providers/AppProviders";
import { AppShell } from "@/components/layout/AppShell";
import { HomePage } from "@/routes/HomePage";
import { ExplorePage } from "@/routes/ExplorePage";
import { CampaignDetailPage } from "@/routes/CampaignDetailPage";
import { CreateCampaignPage } from "@/routes/CreateCampaignPage";
import { CampaignManagePage } from "@/routes/CampaignManagePage";
import { WalletPage } from "@/routes/WalletPage";
import { NotificationsPage } from "@/routes/NotificationsPage";
import { MyCampaignsPage } from "@/routes/MyCampaignsPage";
import { NotFoundPage } from "@/routes/NotFoundPage";
import { MyDonationsPage } from "@/routes/MyDonationsPage";
import { MilestoneReviewsPage } from "@/routes/MilestoneReviewsPage";
import { AnalyticsPage } from "@/routes/AnalyticsPage";
import { SettingsPage } from "@/routes/SettingsPage";

// New Phase 3 pages
import { HelpPage } from "@/routes/HelpPage";
import { LedgerPage } from "@/routes/LedgerPage";
import { AdminRouteGuard } from "@/routes/admin/AdminRouteGuard";
import { AdminDashboardPage } from "@/routes/admin/AdminDashboardPage";
import { AdminUsersPage } from "@/routes/admin/AdminUsersPage";
import { AdminCampaignsPage } from "@/routes/admin/AdminCampaignsPage";

// Auth Pages
import { SignInPage } from "@/routes/auth/SignInPage";
import { SignUpPage } from "@/routes/auth/SignUpPage";

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  in:      { opacity: 1, y: 0 },
  out:     { opacity: 0, y: -8 }
};

const pageTransition = {
  duration: 0.2,
  ease: [0.16, 1, 0.3, 1] as [number, number, number, number]
};

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial="initial"
        animate="in"
        exit="out"
        variants={pageVariants}
        transition={pageTransition}
      >
        <Routes location={location}>
          <Route path="/"                   element={<HomePage />} />
          <Route path="/explore"            element={<ExplorePage />} />
          <Route path="/campaign/:id"       element={<CampaignDetailPage />} />
          <Route path="/campaign/:id/manage" element={<CampaignManagePage />} />

          {/* Auth Routes */}
          <Route path="/sign-in/*"          element={<SignInPage />} />
          <Route path="/sign-up/*"          element={<SignUpPage />} />

          {/* Completed Phase 2 routes */}
          <Route path="/my-campaigns"       element={<MyCampaignsPage />} />
          <Route path="/my-donations"       element={<MyDonationsPage />} />
          <Route path="/milestone-reviews"  element={<MilestoneReviewsPage />} />
          <Route path="/analytics"          element={<AnalyticsPage />} />
          <Route path="/notifications"      element={<NotificationsPage />} />
          <Route path="/wallet"             element={<WalletPage />} />
          <Route path="/settings"           element={<SettingsPage />} />
          <Route path="/help"               element={<HelpPage />} />
          <Route path="/create-campaign"    element={<CreateCampaignPage />} />
          <Route path="/ledger"             element={<LedgerPage />} />

          {/* Admin Routes */}
          <Route element={<AdminRouteGuard />}>
            <Route path="/admin" element={<AdminDashboardPage />} />
            <Route path="/admin/users" element={<AdminUsersPage />} />
            <Route path="/admin/campaigns" element={<AdminCampaignsPage />} />
          </Route>

          {/* Redirects */}
          <Route path="/home" element={<Navigate to="/" replace />} />

          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}



export function App() {
  return (
    <AppProviders>
      <BrowserRouter>
        <AppShell>
          <AnimatedRoutes />
        </AppShell>
      </BrowserRouter>
    </AppProviders>
  );
}
