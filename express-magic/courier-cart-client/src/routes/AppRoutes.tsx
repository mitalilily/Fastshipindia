// AppRoutes.tsx
import { lazy, Suspense, type ComponentType } from 'react'
import { HashRouter, Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom'
import RequireAuth from '../components/auth/wrapper/RequireAuth'
import RequireEmployeePermission from '../components/auth/wrapper/RequireEmployeePermission'
import RequireMerchantReady from '../components/auth/wrapper/RequireMerchantReady'
import RequireOnboard from '../components/auth/wrapper/RequireOnboard'
import FullScreenLoader from '../components/UI/loader/FullScreenLoader'
import { useAuth } from '../context/auth/AuthContext'
import { normalizeAwb } from '../utils/awb'
import GlobalRedirectHandler from './WalletRedirectHandler'

/* ---------- Lazy-loaded components ---------- */
const Layout = lazy(() => import('../components/UI/Layout'))
const CreateOrderWrapper = lazy(() => import('../components/orders/CreateOrderWrapper'))
const Login = lazy(() => import('../pages/auth/Login'))
const FastShipLanding = lazy(() => import('../pages/marketing/FastShipLanding'))

// Onboarding & Dashboard
const UserOnboarding = lazy(() => import('../pages/onboarding/UserOnboarding'))
const Dashboard = lazy(() =>
  import('../pages/shipmozo/ShipmozoPanel').then((m) => ({
    default: m.ShipmozoDashboardPanel,
  })),
)
const DashboardOrderStatus = lazy(() =>
  import('../pages/shipmozo/ShipmozoPanel').then((m) => ({
    default: m.ShipmozoDashboardOrderStatusPanel,
  })),
)

// Orders
const Orders = lazy(() =>
  import('../pages/shipmozo/ShipmozoPanel').then((m) => ({
    default: m.ShipmozoOrdersPanel,
  })),
)
const ShipmozoOrdersPanel = lazy(() =>
  import('../pages/shipmozo/ShipmozoPanel').then((m) => ({
    default: m.ShipmozoOrdersPanel,
  })),
)
const B2COrdersList = lazy(() => import('../components/orders/b2c/B2COrdersList'))
const B2bOrders = lazy(() => import('../pages/orders/B2bOrders'))

// Settings
const Settings = lazy(() => import('../pages/settings/Settings'))
const PickupAddresses = lazy(() => import('../pages/pickup-addresses/PickupAddresses'))
const InvoicePreferences = lazy(() => import('../components/settings/InvoicePreference'))
const LabelSettingsPage = lazy(() => import('../components/settings/Label/LabelSettings'))
const UsersManagement = lazy(() => import('../pages/users-management/UsersManagement'))
const CourierPriorityPage = lazy(() => import('../components/settings/CourierPriority/CourierPriorityPage'))

// Billing
const ShipmozoBillingPassbookPanel = lazy(() =>
  import('../pages/shipmozo/ShipmozoPanel').then((m) => ({ default: m.ShipmozoBillingPassbookPanel })),
)
const ShipmozoBillingCodPanel = lazy(() =>
  import('../pages/shipmozo/ShipmozoPanel').then((m) => ({ default: m.ShipmozoBillingCodPanel })),
)
const ShipmozoBillingShippingChargesPanel = lazy(() =>
  import('../pages/shipmozo/ShipmozoPanel').then((m) => ({ default: m.ShipmozoBillingShippingChargesPanel })),
)
const ShipmozoBillingAllRechargesPanel = lazy(() =>
  import('../pages/shipmozo/ShipmozoPanel').then((m) => ({ default: m.ShipmozoBillingAllRechargesPanel })),
)
const ShipmozoBillingInvoicesPanel = lazy(() =>
  import('../pages/shipmozo/ShipmozoPanel').then((m) => ({ default: m.ShipmozoBillingInvoicesPanel })),
)
const ShipmozoBillingCreditNotesPanel = lazy(() =>
  import('../pages/shipmozo/ShipmozoPanel').then((m) => ({ default: m.ShipmozoBillingCreditNotesPanel })),
)
const ShipmozoBillingDebitNotesPanel = lazy(() =>
  import('../pages/shipmozo/ShipmozoPanel').then((m) => ({ default: m.ShipmozoBillingDebitNotesPanel })),
)
const ShipmozoBillingLedgersPanel = lazy(() =>
  import('../pages/shipmozo/ShipmozoPanel').then((m) => ({ default: m.ShipmozoBillingLedgersPanel })),
)
const ShipmozoBillingNotificationCreditPanel = lazy(() =>
  import('../pages/shipmozo/ShipmozoPanel').then((m) => ({ default: m.ShipmozoBillingNotificationCreditPanel })),
)

function morePanel(name: keyof typeof import('../pages/shipmozo/ShipmozoMorePanels')) {
  return lazy(() =>
    import('../pages/shipmozo/ShipmozoMorePanels').then((m) => ({
      default: m[name] as ComponentType,
    })),
  )
}

const ShipmozoProductsPanel = morePanel('ShipmozoProductsPanel')
const ShipmozoPackagingPanel = morePanel('ShipmozoPackagingPanel')
const ShipmozoCustomersPanel = morePanel('ShipmozoCustomersPanel')
const ShipmozoOrderTagsPanel = morePanel('ShipmozoOrderTagsPanel')
const ShipmozoWarehousePanel = morePanel('ShipmozoWarehousePanel')
const ShipmozoIntegrationChannelsPanel = morePanel('ShipmozoIntegrationChannelsPanel')
const ShipmozoIntegrationOmsPanel = morePanel('ShipmozoIntegrationOmsPanel')
const ShipmozoEddWidgetPanel = morePanel('ShipmozoEddWidgetPanel')
const ShipmozoSettingsShippingNotificationPanel = morePanel('ShipmozoSettingsShippingNotificationPanel')
const ShipmozoSettingsCodConfirmationPanel = morePanel('ShipmozoSettingsCodConfirmationPanel')
const ShipmozoSettingsEarlyCodPanel = morePanel('ShipmozoSettingsEarlyCodPanel')
const ShipmozoSettingsAutoAssignPanel = morePanel('ShipmozoSettingsAutoAssignPanel')
const ShipmozoSettingsManageLabelPanel = morePanel('ShipmozoSettingsManageLabelPanel')
const ShipmozoSettingsManageInvoicePanel = morePanel('ShipmozoSettingsManageInvoicePanel')
const ShipmozoSettingsBrandedTrackingPanel = morePanel('ShipmozoSettingsBrandedTrackingPanel')
const ShipmozoToolsRateCalculatorPanel = morePanel('ShipmozoToolsRateCalculatorPanel')
const ShipmozoToolsShipmentPriceListPanel = morePanel('ShipmozoToolsShipmentPriceListPanel')
const ShipmozoToolsActivityLogsPanel = morePanel('ShipmozoToolsActivityLogsPanel')
const ShipmozoToolsCourierManagePanel = morePanel('ShipmozoToolsCourierManagePanel')
const ShipmozoToolsReportsDownloadPanel = morePanel('ShipmozoToolsReportsDownloadPanel')
const ShipmozoToolsTrackOrderPanel = morePanel('ShipmozoToolsTrackOrderPanel')
const ShipmozoToolsWeightDiscrepancyPanel = morePanel('ShipmozoToolsWeightDiscrepancyPanel')
const ShipmozoReportsOrdersPanel = morePanel('ShipmozoReportsOrdersPanel')
const ShipmozoReportsShipmentPanel = morePanel('ShipmozoReportsShipmentPanel')
const ShipmozoReportsNdrPanel = morePanel('ShipmozoReportsNdrPanel')
const ShipmozoReportsCustomPanel = morePanel('ShipmozoReportsCustomPanel')
const ShipmozoSupportPanel = morePanel('ShipmozoSupportPanel')
const ShipmozoProfilePanel = morePanel('ShipmozoProfilePanel')
const ShipmozoUserAgreementsPanel = morePanel('ShipmozoUserAgreementsPanel')
const ShipmozoTicketsPanel = morePanel('ShipmozoTicketsPanel')

// Channels
const Channels = lazy(() => import('../pages/channels/Channels'))
const ChannelList = lazy(() => import('../pages/channels/ChannelList'))

// Policies
const PoliciesLayout = lazy(() => import('../pages/policy/PoliciesLayout'))
const AboutUs = lazy(() => import('../pages/policy/AboutUs'))
const CancellationPolicy = lazy(() => import('../pages/policy/CancellationPolicy'))
const CompanyDetails = lazy(() => import('../pages/policy/CompanyDetails'))
const PrivacyPolicy = lazy(() => import('../pages/policy/PrivacyPolicy'))
const TermsOfService = lazy(() => import('../pages/policy/TermsOfService'))

// Profile
const ProfileLayout = lazy(() => import('../pages/profile/Profile'))
const UserProfileSettings = lazy(() => import('../components/user/UserProfileSettings'))
const CompanyInfoForm = lazy(() => import('../components/user/profile/CompanyInfoForm'))
const BankAccountsSection = lazy(() =>
  import('../components/user/profile/bankAccounts/BankAccountsSection').then((m) => ({
    default: m.BankAccountsSection,
  }))
)
const KycSection = lazy(() => import('../components/user/profile/Kyc/KycSection'))

// Tools
const RateCard = lazy(() => import('../pages/tools/RateCard'))
const RateCalculator = lazy(() =>
  import('../pages/tools/RateCalculator').then((m) => ({
    default: m.RateCalculator,
  }))
)
const OrderTrackingForm = lazy(() => import('../pages/tools/OrderTrackingForm'))
const WeightCalculator = lazy(() => import('../pages/tools/WeightCalculator'))

// Other
const Couriers = lazy(() => import('../pages/couriers/Couriers'))
const KeyboardShortcutsPage = lazy(() => import('../pages/KeyboardShortcutsPage'))
const Reports = lazy(() => import('../pages/reports/Reports'))

// Weight Reconciliation
const WeightReconciliation = lazy(() => import('../pages/weight-reconciliation/WeightReconciliation'))
const DiscrepancyDetails = lazy(() => import('../pages/weight-reconciliation/DiscrepancyDetails'))
const WeightReconciliationSettings = lazy(() => import('../pages/weight-reconciliation/WeightReconciliationSettings'))
// Ops (NDR/RTO)
const ShipmozoNdrPanel = lazy(() =>
  import('../pages/shipmozo/ShipmozoPanel').then((m) => ({ default: m.ShipmozoNdrPanel })),
)
const RtoList = lazy(() => import('../pages/ops/RtoList'))
// API Integration
const ApiIntegration = lazy(() => import('../pages/settings/ApiIntegration'))

function PublicTrackingRoute() {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()
  const { awb } = useParams<{ awb?: string }>()

  if (loading) return <FullScreenLoader />

  if (isAuthenticated) {
    const params = new URLSearchParams(location.search)
    const normalizedAwb = normalizeAwb(awb)

    if (normalizedAwb) {
      params.set('awb', normalizedAwb)
    }

    const query = params.toString()

    return <Navigate to={`/tools/track-order${query ? `?${query}` : ''}`} replace />
  }

  return <OrderTrackingForm />
}

export default function AppRoutes() {
  return (
    <HashRouter>
      <GlobalRedirectHandler />
      <Suspense fallback={<FullScreenLoader />}>
        <Routes>
          {/* public */}
          <Route path="/" element={<FastShipLanding />} />
          <Route path="/login" element={<Login />} />
          <Route path="/tracking" element={<PublicTrackingRoute />} />
          <Route path="/tracking/:awb" element={<PublicTrackingRoute />} />
          <Route path="/weight-calculator" element={<WeightCalculator />} />
          <Route path="/rate-calculator" element={<RateCalculator />} />
          {/* onboarding */}
          <Route
            path="/onboarding-questions"
            element={
              <RequireOnboard>
                <UserOnboarding />
              </RequireOnboard>
            }
          />
          {/* private layout (requires auth) */}
          <Route
            element={
              <RequireAuth>
                <Layout />
              </RequireAuth>
            }
          >
            <Route path="/settings" element={<Settings />} />
            <Route path="/settings/shipping-notification" element={<ShipmozoSettingsShippingNotificationPanel />} />
            <Route path="/settings/cod-confirmation" element={<ShipmozoSettingsCodConfirmationPanel />} />
            <Route path="/settings/early-cod-subscription" element={<ShipmozoSettingsEarlyCodPanel />} />
            <Route path="/settings/auto-assign-rules" element={<ShipmozoSettingsAutoAssignPanel />} />
            <Route path="/settings/manage-label" element={<ShipmozoSettingsManageLabelPanel />} />
            <Route path="/settings/manage-invoice" element={<ShipmozoSettingsManageInvoicePanel />} />
            <Route path="/settings/branded-tracking-page" element={<ShipmozoSettingsBrandedTrackingPanel />} />
            <Route
              path="/settings/manage_pickups"
              element={
                <RequireEmployeePermission permission="warehouse.viewWarehouse">
                  <PickupAddresses />
                </RequireEmployeePermission>
              }
            />
            <Route path="/billing/wallet_transactions" element={<Navigate to="/billing/passbook" replace />} />
            <Route path="/billing/invoice_management" element={<Navigate to="/billing/invoices" replace />} />
            <Route
              path="/billing/passbook"
              element={
                <RequireEmployeePermission permission="wallet.viewWallet">
                  <ShipmozoBillingPassbookPanel />
                </RequireEmployeePermission>
              }
            />
            <Route path="/billing/cod-remittance" element={<ShipmozoBillingCodPanel />} />
            <Route path="/billing/shipping-charges" element={<ShipmozoBillingShippingChargesPanel />} />
            <Route path="/billing/all-recharges" element={<ShipmozoBillingAllRechargesPanel />} />
            <Route path="/billing/invoices" element={<ShipmozoBillingInvoicesPanel />} />
            <Route path="/billing/credit-notes" element={<ShipmozoBillingCreditNotesPanel />} />
            <Route path="/billing/debit-notes" element={<ShipmozoBillingDebitNotesPanel />} />
            <Route path="/billing/ledgers" element={<ShipmozoBillingLedgersPanel />} />
            <Route path="/billing/notification-credit-history" element={<ShipmozoBillingNotificationCreditPanel />} />
            <Route path="/orders/list" element={<Orders />} />
            <Route path="/orders/new" element={<ShipmozoOrdersPanel />} />
            <Route
              path="/orders/create"
              element={
                <RequireMerchantReady>
                  <CreateOrderWrapper />
                </RequireMerchantReady>
              }
            />
            <Route path="/orders/b2c/list" element={<B2COrdersList />} />
            <Route path="/support/about_us" element={<AboutUs />} />
            <Route path="/orders/b2b/list" element={<B2bOrders />} />
            <Route path="/settings/invoice_preferences" element={<InvoicePreferences />} />
            <Route path="/settings/label_config" element={<LabelSettingsPage />} />
            <Route path="/settings/users_management" element={<UsersManagement />} />
            <Route path="/settings/courier_priority" element={<CourierPriorityPage />} />
            <Route path="/settings/api-integration" element={<ApiIntegration />} />
            <Route path="/warehouse" element={<ShipmozoWarehousePanel />} />
            <Route path="/channels/connected" element={<Channels />} />
            <Route path="/channels/channel_list" element={<ChannelList />} />
            <Route path="/integration/channels" element={<ShipmozoIntegrationChannelsPanel />} />
            <Route path="/integration/oms" element={<ShipmozoIntegrationOmsPanel />} />
            <Route path="/integration/edd-widget" element={<ShipmozoEddWidgetPanel />} />
            <Route path="/other/products" element={<ShipmozoProductsPanel />} />
            <Route path="/other/packaging" element={<ShipmozoPackagingPanel />} />
            <Route path="/other/customers" element={<ShipmozoCustomersPanel />} />
            <Route path="/other/order-tags" element={<ShipmozoOrderTagsPanel />} />
            <Route path="/user-agreements" element={<ShipmozoUserAgreementsPanel />} />
            <Route path="/policies/*" element={<PoliciesLayout />}>
              <Route path="refund_cancellation" element={<CancellationPolicy />} />
              <Route path="privacy_policy" element={<PrivacyPolicy />} />
              <Route path="terms_of_service" element={<TermsOfService />} />
              <Route path="contact_us" element={<CompanyDetails />} />
            </Route>
            <Route path="/help/shortcuts" element={<KeyboardShortcutsPage />} />
            <Route path="/profile" element={<ShipmozoProfilePanel />} />
            <Route path="/profile/*" element={<ProfileLayout />}>
              <Route path="user_profile/*" element={<UserProfileSettings />} />
              <Route index element={<Navigate to="user_profile" replace />} />
              <Route path="user_profile" element={<UserProfileSettings />} />
              <Route path="company" element={<CompanyInfoForm />} />
              <Route path="password" element={<UserProfileSettings />} />
              <Route path="bank_details" element={<BankAccountsSection />} />
              <Route path="kyc_details" element={<KycSection />} />
            </Route>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/dashboard/order-status" element={<DashboardOrderStatus />} />
            <Route path="/tools/rate_card" element={<RateCard />} />
            <Route path="/tools/rate-calculator" element={<ShipmozoToolsRateCalculatorPanel />} />
            <Route path="/tools/shipment-price-list" element={<ShipmozoToolsShipmentPriceListPanel />} />
            <Route path="/tools/activity-logs" element={<ShipmozoToolsActivityLogsPanel />} />
            <Route path="/tools/courier-manage" element={<ShipmozoToolsCourierManagePanel />} />
            <Route path="/tools/reports-download" element={<ShipmozoToolsReportsDownloadPanel />} />
            <Route path="/tools/track-order" element={<ShipmozoToolsTrackOrderPanel />} />
            <Route path="/tools/weight-discrepancy" element={<ShipmozoToolsWeightDiscrepancyPanel />} />
            <Route
              path="/tools/rate_calculator"
              element={
                <Navigate to="/tools/rate-calculator" replace />
              }
            />
            <Route path="/tools/order_tracking" element={<Navigate to="/tools/track-order" replace />} />
            <Route path="/support" element={<ShipmozoSupportPanel />} />
            <Route path="/tickets" element={<ShipmozoTicketsPanel />} />
            <Route path="/support/tickets" element={<Navigate to="/tickets" replace />} />
            <Route path="/support/tickets/:id" element={<Navigate to="/tickets" replace />} />
            <Route path="/home" element={<Navigate to="/dashboard" replace />} />
            <Route path="/couriers/partners" element={<Couriers />} />
            <Route path="/cod-remittance" element={<Navigate to="/billing/cod-remittance" replace />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/reports/orders" element={<ShipmozoReportsOrdersPanel />} />
            <Route path="/reports/shipment" element={<ShipmozoReportsShipmentPanel />} />
            <Route path="/reports/ndr" element={<ShipmozoReportsNdrPanel />} />
            <Route path="/reports/custom-report" element={<ShipmozoReportsCustomPanel />} />
            <Route path="/reconciliation/weight" element={<WeightReconciliation />} />
            <Route path="/reconciliation/weight/:id" element={<DiscrepancyDetails />} />
            <Route path="/reconciliation/weight/settings" element={<WeightReconciliationSettings />} />
            {/* Ops */}
            <Route path="/ops/ndr" element={<ShipmozoNdrPanel />} />
            <Route path="/shipments/ndr" element={<ShipmozoNdrPanel />} />
            <Route path="/ops/rto" element={<RtoList />} />
          </Route>
          {/* fallback */}
          <Route path="*" element={<FastShipLanding />} />
        </Routes>
      </Suspense>
    </HashRouter>
  )
}
