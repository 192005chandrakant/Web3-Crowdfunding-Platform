import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@clerk/clerk-react";
import { AppProviders } from "@/providers/AppProviders";
import { AppShell } from "@/components/layout/AppShell";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Skeleton } from "@/components/ui";
import { useCurrentUser } from "@/hooks/useCurrentUser";

const HomePage = lazy(() => import("@/routes/HomePage").then((module) => ({ default: module.HomePage })));
const ExplorePage = lazy(() => import("@/routes/ExplorePage").then((module) => ({ default: module.ExplorePage })));
const CampaignDetailPage = lazy(() => import("@/routes/CampaignDetailPage").then((module) => ({ default: module.CampaignDetailPage })));
const CreateCampaignPage = lazy(() => import("@/routes/CreateCampaignPage").then((module) => ({ default: module.CreateCampaignPage })));
const CampaignManagePage = lazy(() => import("@/routes/CampaignManagePage").then((module) => ({ default: module.CampaignManagePage })));
const WalletPage = lazy(() => import("@/routes/WalletPage").then((module) => ({ default: module.WalletPage })));
const NotificationsPage = lazy(() => import("@/routes/NotificationsPage").then((module) => ({ default: module.NotificationsPage })));
const MyCampaignsPage = lazy(() => import("@/routes/MyCampaignsPage").then((module) => ({ default: module.MyCampaignsPage })));
const NotFoundPage = lazy(() => import("@/routes/NotFoundPage").then((module) => ({ default: module.NotFoundPage })));
const MyDonationsPage = lazy(() => import("@/routes/MyDonationsPage").then((module) => ({ default: module.MyDonationsPage })));
const MilestoneReviewsPage = lazy(() => import("@/routes/MilestoneReviewsPage").then((module) => ({ default: module.MilestoneReviewsPage })));
const AnalyticsPage = lazy(() => import("@/routes/AnalyticsPage").then((module) => ({ default: module.AnalyticsPage })));
const SettingsPage = lazy(() => import("@/routes/SettingsPage").then((module) => ({ default: module.SettingsPage })));
const HelpPage = lazy(() => import("@/routes/HelpPage").then((module) => ({ default: module.HelpPage })));
const LedgerPage = lazy(() => import("@/routes/LedgerPage").then((module) => ({ default: module.LedgerPage })));
const QuadraticFundingVizPage = lazy(() => import("@/routes/QuadraticFundingVizPage").then((module) => ({ default: module.QuadraticFundingVizPage })));
const AccountOnboardingPage = lazy(() => import("@/routes/auth/AccountOnboardingPage").then((module) => ({ default: module.AccountOnboardingPage })));
const RoleRouteGuard = lazy(() => import("@/routes/guards/RoleRouteGuard").then((module) => ({ default: module.RoleRouteGuard })));
const AdminRouteGuard = lazy(() => import("@/routes/admin/AdminRouteGuard").then((module) => ({ default: module.AdminRouteGuard })));
const AdminDashboardPage = lazy(() => import("@/routes/admin/AdminDashboardPage").then((module) => ({ default: module.AdminDashboardPage })));
const AdminUsersPage = lazy(() => import("@/routes/admin/AdminUsersPage").then((module) => ({ default: module.AdminUsersPage })));
const AdminCampaignsPage = lazy(() => import("@/routes/admin/AdminCampaignsPage").then((module) => ({ default: module.AdminCampaignsPage })));
const AdminLoginPage = lazy(() => import("@/routes/admin/AdminLoginPage").then((module) => ({ default: module.AdminLoginPage })));
const AdminAuditLogPage = lazy(() => import("@/routes/admin/AdminAuditLogPage").then((module) => ({ default: module.AdminAuditLogPage })));
const AdminAnalyticsPage = lazy(() => import("@/routes/admin/AdminAnalyticsPage").then((module) => ({ default: module.AdminAnalyticsPage })));
const SignInPage = lazy(() => import("@/routes/auth/SignInPage").then((module) => ({ default: module.SignInPage })));
const SignUpPage = lazy(() => import("@/routes/auth/SignUpPage").then((module) => ({ default: module.SignUpPage })));

const pageVariants = {
  initial: { opacity: 0, y: 15, scale: 0.98, filter: "blur(4px)" },
  in: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" },
  out: { opacity: 0, y: -15, scale: 1.02, filter: "blur(4px)" }
};

const pageTransition = {
  duration: 0.4,
  ease: [0.22, 1, 0.36, 1] as [number, number, number, number]
};

function RouteFallback() {
  return (
    <div className="page-container space-y-6" aria-label="Loading page">
      <Skeleton className="h-8 w-56" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Skeleton className="h-36 w-full" />
        <Skeleton className="h-36 w-full" />
        <Skeleton className="h-36 w-full" />
      </div>
    </div>
  );
}

function AnimatedRoutes() {
  const location = useLocation();
  const { isLoaded, isSignedIn } = useAuth();
  const { hasOnboarded, isLoading } = useCurrentUser();
  const isAuthPath =
    location.pathname.startsWith("/sign-in") ||
    location.pathname.startsWith("/sign-up") ||
    location.pathname.startsWith("/onboarding");

  if (isLoaded && isSignedIn && !isLoading && !hasOnboarded && !isAuthPath) {
    return <Navigate to="/onboarding" replace />;
  }

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
        <Suspense fallback={<RouteFallback />}>
          <Routes location={location}>
            <Route path="/" element={<HomePage />} />
            <Route path="/explore" element={<ExplorePage />} />
            <Route path="/campaign/:id" element={<CampaignDetailPage />} />
            <Route
              path="/campaign/:id/manage"
              element={
                <RoleRouteGuard roles={["creator", "admin"]}>
                  <CampaignManagePage />
                </RoleRouteGuard>
              }
            />

            <Route path="/sign-in/*" element={<SignInPage />} />
            <Route path="/sign-up/*" element={<SignUpPage />} />
            <Route path="/onboarding" element={<AccountOnboardingPage />} />

            <Route
              path="/my-campaigns"
              element={
                <RoleRouteGuard roles={["creator", "admin"]}>
                  <MyCampaignsPage />
                </RoleRouteGuard>
              }
            />
            <Route path="/my-campaign" element={<Navigate to="/my-campaigns" replace />} />
            <Route path="/my_campaigns" element={<Navigate to="/my-campaigns" replace />} />
            <Route path="/my_campaign" element={<Navigate to="/my-campaigns" replace />} />
            <Route path="/campaigns" element={<Navigate to="/my-campaigns" replace />} />
            <Route path="/creator" element={<Navigate to="/my-campaigns" replace />} />
            <Route path="/creator-dashboard" element={<Navigate to="/my-campaigns" replace />} />

            <Route path="/my-donations" element={<MyDonationsPage />} />
            <Route path="/my-donation" element={<Navigate to="/my-donations" replace />} />
            <Route path="/my_donations" element={<Navigate to="/my-donations" replace />} />
            <Route path="/my_donation" element={<Navigate to="/my-donations" replace />} />
            <Route path="/donations" element={<Navigate to="/my-donations" replace />} />
            <Route path="/donor" element={<Navigate to="/my-donations" replace />} />
            <Route path="/governance" element={<Navigate to="/my-donations" replace />} />

            <Route
              path="/milestone-reviews"
              element={
                <RoleRouteGuard roles={["reviewer", "moderator", "admin"]}>
                  <MilestoneReviewsPage />
                </RoleRouteGuard>
              }
            />
            <Route path="/milestone-review" element={<Navigate to="/milestone-reviews" replace />} />
            <Route path="/reviews" element={<Navigate to="/milestone-reviews" replace />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/qv-simulator" element={<QuadraticFundingVizPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/wallet" element={<WalletPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/help" element={<HelpPage />} />
            <Route
              path="/create-campaign"
              element={
                <RoleRouteGuard roles={["creator", "admin"]}>
                  <CreateCampaignPage />
                </RoleRouteGuard>
              }
            />
            <Route path="/create" element={<Navigate to="/create-campaign" replace />} />
            <Route path="/ledger" element={<LedgerPage />} />
            <Route path="/admin/login" element={<AdminLoginPage />} />

            <Route element={<AdminRouteGuard />}>
              <Route path="/admin" element={<AdminDashboardPage />} />
              <Route path="/admin/users" element={<AdminUsersPage />} />
              <Route path="/admin/campaigns" element={<AdminCampaignsPage />} />
              <Route path="/admin/audit-log" element={<AdminAuditLogPage />} />
              <Route path="/admin/analytics" element={<AdminAnalyticsPage />} />
            </Route>

            <Route path="/home" element={<Navigate to="/" replace />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </motion.div>
    </AnimatePresence>
  );
}

export function App() {
  return (
    <AppProviders>
      <BrowserRouter>
        <ErrorBoundary>
          <AppShell>
            <AnimatedRoutes />
          </AppShell>
        </ErrorBoundary>
      </BrowserRouter>
    </AppProviders>
  );
}
