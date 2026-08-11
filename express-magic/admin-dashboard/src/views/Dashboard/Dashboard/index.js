import {
  Badge,
  Box,
  Button,
  Container,
  Flex,
  Grid,
  HStack,
  Image,
  Select,
  SimpleGrid,
  Skeleton,
  SkeletonText,
  Stack,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useColorModeValue,
  VStack,
} from "@chakra-ui/react";
import {
  IconAlertTriangle,
  IconActivity,
  IconBuildingBank,
  IconCircleCheck,
  IconCoinRupee,
  IconExternalLink,
  IconPackageExport,
  IconMapPin,
  IconRefresh,
  IconRoute,
  IconUsers,
  IconWallet,
} from "@tabler/icons-react";
import Card from "components/Card/Card";
import CardBody from "components/Card/CardBody";
import CardHeader from "components/Card/CardHeader";
import { useDashboardStats } from "hooks/useDashboardStats";
import { lazy, Suspense, useState } from "react";
import { useHistory } from "react-router-dom";
import { brandIdentity } from "theme/brand";

const CourierDistributionChart = lazy(() =>
  import("components/Charts/CourierDistributionChart")
);
const OrdersLineChart = lazy(() => import("components/Charts/OrdersLineChart"));
const RevenueBarChart = lazy(() => import("components/Charts/RevenueBarChart"));

const ui = {
  page: "var(--dash-page)",
  surface: "var(--dash-surface)",
  surfaceMuted: "var(--dash-surface-muted)",
  border: "var(--dash-border)",
  borderSoft: "var(--dash-border-soft)",
  headerBg: "var(--dash-header-bg)",
  progressBg: "var(--dash-progress-bg)",
  text: "var(--dash-text)",
  muted: "var(--dash-muted)",
  tertiary: "var(--dash-tertiary)",
  primary: "var(--dash-primary)",
  primaryBg: "var(--dash-primary-bg)",
  accent: "var(--dash-accent)",
  accentBg: "var(--dash-accent-bg)",
  success: "var(--dash-success)",
  successBg: "var(--dash-success-bg)",
  danger: "var(--dash-danger)",
  dangerBg: "var(--dash-danger-bg)",
  blue: "var(--dash-blue)",
  blueBg: "var(--dash-blue-bg)",
  amberActionBg: "var(--dash-amber-action-bg)",
  amberActionBorder: "var(--dash-amber-action-border)",
  greenActionBg: "var(--dash-green-action-bg)",
  greenActionBorder: "var(--dash-green-action-border)",
  badgeBg: "var(--dash-badge-bg)",
};

const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);

const toNum = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

function EmptyState({ label = "No data available for this selection", h = "160px" }) {
  return (
    <Flex
      minH={h}
      align="center"
      justify="center"
      bg={ui.surfaceMuted}
      border="1px dashed"
      borderColor={ui.border}
      borderRadius="14px"
      color={ui.muted}
      fontSize="14px"
      fontWeight="600"
      textAlign="center"
      px={4}
    >
      {label}
    </Flex>
  );
}

function Panel({ title, icon, badge, children, minH, gridColumn }) {
  return (
    <Card
      bg={ui.surface}
      borderWidth="1px"
      borderColor={ui.border}
      borderRadius="14px"
      boxShadow="0 8px 22px rgba(13, 27, 77, 0.05)"
      overflow="hidden"
      p="0"
      minH={minH}
      gridColumn={gridColumn}
    >
      <CardHeader
        p={{ base: 3.5, md: 4 }}
        borderBottom="1px solid"
        borderColor={ui.borderSoft}
      >
        <HStack spacing={2.5}>
          {icon ? <Box color={icon.color}>{icon.node}</Box> : null}
          <Text
            color={ui.text}
            fontSize={{ base: "18px", md: "20px" }}
            fontWeight="800"
          >
            {title}
          </Text>
          {badge !== undefined ? (
            <Badge
              bg={ui.surfaceMuted}
              color={ui.text}
              border="1px solid"
              borderColor={ui.border}
              borderRadius="8px"
            >
              {badge}
            </Badge>
          ) : null}
        </HStack>
      </CardHeader>
      <CardBody p={{ base: 3.5, md: 4 }}>{children}</CardBody>
    </Card>
  );
}

function MetricCard({ label, value, subtitle, trend, icon: Icon, color }) {
  const trendValue = toNum(trend);
  const hasTrend = trend !== undefined && trend !== null;
  const trendColor = trendValue < 0 ? ui.danger : ui.success;

  return (
    <Card
      bg={ui.surface}
      borderWidth="1px"
      borderColor={ui.border}
      borderRadius="12px"
      boxShadow="0 7px 18px rgba(13, 27, 77, 0.045)"
      p="0"
      minH="112px"
      position="relative"
      overflow="hidden"
      _before={{
        content: '""',
        position: "absolute",
        insetInlineStart: 0,
        top: 0,
        bottom: 0,
        w: "4px",
        bg: color,
      }}
      transition="transform 160ms ease, box-shadow 160ms ease"
      _hover={{
        transform: "translateY(-2px)",
        boxShadow: "0 14px 34px rgba(13, 27, 77, 0.10)",
      }}
    >
      <CardBody p={4}>
        <HStack justify="space-between" align="flex-start" spacing={3}>
          <Box minW={0}>
            <Text color={ui.muted} fontSize="14px" fontWeight="500">
              {label}
            </Text>
            <Text
              color={ui.text}
              fontSize={{ base: "23px", md: "24px" }}
              fontWeight="800"
              lineHeight="1.1"
              mt={1.5}
            >
              {value}
            </Text>
            <HStack spacing={2} mt={1.5} minH="17px">
              {subtitle ? (
                <Text color={ui.muted} fontSize="13px">
                  {subtitle}
                </Text>
              ) : null}
              {hasTrend ? (
                <Text color={trendColor} fontSize="13px" fontWeight="700">
                  {trendValue > 0 ? "+" : ""}
                  {trendValue}%
                </Text>
              ) : null}
            </HStack>
          </Box>
          <Flex
            w="42px"
            h="42px"
            borderRadius="12px"
            align="center"
            justify="center"
            color={color}
            bg={
              color === ui.primary
                ? ui.primaryBg
                : color === ui.success
                ? ui.successBg
                : color === ui.accent
                ? ui.accentBg
                : ui.blueBg
            }
            flexShrink={0}
          >
            <Icon size={21} strokeWidth={1.9} />
          </Flex>
        </HStack>
      </CardBody>
    </Card>
  );
}

function StatusBars({ items }) {
  if (!items.length) return <EmptyState h="138px" />;

  const maxCount = Math.max(...items.map((item) => item.count), 1);

  return (
    <Stack spacing={2}>
      {items.map((item) => (
        <HStack key={item.status} spacing={3}>
          <Text
            color={ui.muted}
            fontSize="xs"
            textAlign="right"
            w="112px"
            noOfLines={1}
          >
            {item.name}
          </Text>
          <Box
            flex="1"
            h="22px"
            bg={ui.progressBg}
            borderRadius="6px"
            overflow="hidden"
          >
            <Box
              h="100%"
              minW="4px"
              w={`${Math.round((item.count / maxCount) * 100)}%`}
              bg={item.fill}
            />
          </Box>
          <Text
            color={ui.text}
            fontSize="xs"
            fontWeight="700"
            w="42px"
            textAlign="right"
          >
            {item.count}
          </Text>
        </HStack>
      ))}
    </Stack>
  );
}

function ActionRow({ icon, label, count, route, tone = "amber" }) {
  const history = useHistory();
  const toneStyle =
    tone === "green"
      ? {
          bg: ui.greenActionBg,
          border: ui.greenActionBorder,
          color: ui.success,
        }
      : {
          bg: ui.amberActionBg,
          border: ui.amberActionBorder,
          color: ui.accent,
        };

  return (
    <Flex
      as="button"
      type="button"
      w="100%"
      align="center"
      justify="space-between"
      gap={3}
      p={3.5}
      borderRadius="10px"
      border="1px solid"
      borderColor={toneStyle.border}
      bg={toneStyle.bg}
      textAlign="left"
      onClick={() => history.push(route)}
      _hover={{ borderColor: toneStyle.color }}
    >
      <HStack spacing={3} minW={0}>
        <Box color={toneStyle.color}>{icon}</Box>
        <Text color={ui.text} fontWeight="700" noOfLines={1}>
          {label}
        </Text>
      </HStack>
      <HStack spacing={3}>
        <Badge
          color={toneStyle.color}
          bg={ui.badgeBg}
          border="1px solid"
          borderColor={toneStyle.border}
        >
          {count}
        </Badge>
        <IconExternalLink size={14} color={ui.muted} />
      </HStack>
    </Flex>
  );
}

function QuickActionCard({ icon: Icon, label, subtitle, route, badge, color }) {
  const history = useHistory();

  return (
    <Flex
      as="button"
      type="button"
      align="center"
      justify="space-between"
      gap={3}
      minH="82px"
      p={{ base: 3.5, md: 4 }}
      borderRadius="14px"
      border="1px solid"
      borderColor={ui.border}
      bg={ui.surface}
      boxShadow="0 8px 24px rgba(13, 27, 77, 0.045)"
      textAlign="left"
      onClick={() => history.push(route)}
      transition="transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease"
      _hover={{
        transform: "translateY(-2px)",
        borderColor: color,
        boxShadow: "0 14px 34px rgba(13, 27, 77, 0.10)",
      }}
    >
      <HStack spacing={3} minW={0}>
        <Flex
          w="42px"
          h="42px"
          borderRadius="13px"
          align="center"
          justify="center"
          color={color}
          bg={
            color === ui.success
              ? ui.successBg
              : color === ui.accent
              ? ui.accentBg
              : color === ui.blue
              ? ui.blueBg
              : ui.primaryBg
          }
          flexShrink={0}
        >
          <Icon size={20} strokeWidth={1.9} />
        </Flex>
        <Box minW={0}>
          <Text color={ui.text} fontSize="15px" fontWeight="800" noOfLines={1}>
            {label}
          </Text>
          <Text color={ui.muted} fontSize="12px" mt={1} noOfLines={1}>
            {subtitle}
          </Text>
        </Box>
      </HStack>
      <HStack spacing={2} flexShrink={0}>
        {badge !== undefined ? (
          <Badge
            color={color}
            bg={ui.surfaceMuted}
            border="1px solid"
            borderColor={ui.border}
            borderRadius="8px"
          >
            {badge}
          </Badge>
        ) : null}
        <IconExternalLink size={15} color="var(--dash-muted)" />
      </HStack>
    </Flex>
  );
}

function InsightCard({ label, value, subtitle, color }) {
  return (
    <Box
      p={{ base: 3.5, md: 4 }}
      borderRadius="14px"
      bg={ui.surface}
      border="1px solid"
      borderColor={ui.border}
      boxShadow="0 8px 24px rgba(13, 27, 77, 0.045)"
      position="relative"
      overflow="hidden"
      _after={{
        content: '""',
        position: "absolute",
        insetInlineEnd: "-22px",
        top: "-28px",
        w: "84px",
        h: "84px",
        borderRadius: "999px",
        bg: color,
        opacity: 0.08,
      }}
    >
      <Text color={ui.muted} fontSize="12px" fontWeight="700" textTransform="uppercase">
        {label}
      </Text>
      <Text color={ui.text} fontSize={{ base: "22px", md: "24px" }} fontWeight="900" mt={1}>
        {value}
      </Text>
      <Text color={ui.muted} fontSize="12px" mt={1} noOfLines={1}>
        {subtitle}
      </Text>
    </Box>
  );
}

function RevenueTable({ rows }) {
  return (
    <Box borderTop="1px solid" borderColor={ui.border} pt={4}>
      <HStack spacing={7} mb={4}>
        <Text
          color={ui.primary}
          fontWeight="700"
          borderBottom="2px solid"
          borderColor={ui.primary}
          pb={3}
        >
          Breakdown
        </Text>
        <Text color={ui.text} fontWeight="700" pb={3}>
          Chart
        </Text>
      </HStack>
      <Box overflowX="auto">
        <Table variant="simple" size="sm">
          <Thead bg={ui.headerBg}>
            <Tr>
              {[
                "Courier",
                "Revenue",
                "Cost",
                "Margin",
                "Margin %",
                "Rev/Order",
              ].map((head) => (
                <Th
                  key={head}
                  color={ui.muted}
                  borderColor="transparent"
                  textTransform="none"
                  fontSize="sm"
                  py={4}
                >
                  {head}
                </Th>
              ))}
            </Tr>
          </Thead>
          <Tbody>
            {rows.length ? (
              rows.map((row) => (
                <Tr key={row.courier}>
                  <Td color={ui.text} borderColor={ui.borderSoft}>
                    {row.courier}
                  </Td>
                  <Td color={ui.text} borderColor={ui.borderSoft}>
                    {formatCurrency(row.revenue)}
                  </Td>
                  <Td color={ui.text} borderColor={ui.borderSoft}>
                    {formatCurrency(row.cost)}
                  </Td>
                  <Td
                    color={row.margin >= 0 ? ui.success : ui.danger}
                    borderColor={ui.borderSoft}
                  >
                    {formatCurrency(row.margin)}
                  </Td>
                  <Td color={ui.text} borderColor={ui.borderSoft}>
                    {row.marginPercent}%
                  </Td>
                  <Td color={ui.text} borderColor={ui.borderSoft}>
                    {formatCurrency(row.revPerOrder)}
                  </Td>
                </Tr>
              ))
            ) : (
              <Tr>
                <Td
                  colSpan={6}
                  bg={ui.surface}
                  borderColor={ui.borderSoft}
                  p={0}
                >
                  <EmptyState h="172px" />
                </Td>
              </Tr>
            )}
          </Tbody>
        </Table>
      </Box>
    </Box>
  );
}

function DashboardSkeleton({ dashboardVars }) {
  return (
    <Box minH="100vh" bg={ui.page} pb={6} sx={dashboardVars}>
      <Container maxW="full" pt={{ base: "92px", md: "62px" }} px={{ base: 3, md: 5 }}>
        <Flex
          bg={ui.surface}
          border="1px solid"
          borderColor={ui.border}
          borderRadius="16px"
          p={{ base: 4, md: 5 }}
          mb={4}
          justify="space-between"
          align="center"
        >
          <Box w={{ base: "70%", md: "38%" }}>
            <Skeleton h="28px" borderRadius="8px" mb={3} />
            <SkeletonText noOfLines={2} spacing={2} />
          </Box>
          <Skeleton display={{ base: "none", md: "block" }} w="128px" h="42px" borderRadius="10px" />
        </Flex>
        <SimpleGrid columns={{ base: 1, sm: 2, lg: 3, "2xl": 6 }} spacing={3} mb={4}>
          {[0, 1, 2, 3, 4, 5].map((item) => (
            <Skeleton key={item} h="112px" borderRadius="12px" />
          ))}
        </SimpleGrid>
        <Grid templateColumns={{ base: "1fr", xl: "2fr 1fr" }} gap={4}>
          <Skeleton h="300px" borderRadius="14px" />
          <Skeleton h="300px" borderRadius="14px" />
        </Grid>
      </Container>
    </Box>
  );
}

export default function Dashboard() {
  const [dashboardFilters, setDashboardFilters] = useState({
    range: "30d",
    courier: "all",
    paymentType: "all",
  });
  const dashboardVars = {
    "--dash-page": useColorModeValue("#F4F7FC", "#0D1117"),
    "--dash-surface": useColorModeValue("#FFFFFF", "#161B22"),
    "--dash-surface-muted": useColorModeValue("#F7F9FC", "#21262D"),
    "--dash-border": useColorModeValue("#E5EAF3", "#30363D"),
    "--dash-border-soft": useColorModeValue(
      "#E5EAF3",
      "rgba(48, 54, 61, 0.72)"
    ),
    "--dash-header-bg": useColorModeValue("#F2F5FA", "#1A2234"),
    "--dash-progress-bg": useColorModeValue(
      "#EEF2F7",
      "rgba(48, 54, 61, 0.42)"
    ),
    "--dash-text": useColorModeValue("#0F172A", "#E6EDF3"),
    "--dash-muted": useColorModeValue("#607397", "#8B949E"),
    "--dash-tertiary": useColorModeValue("#93A0BA", "#6E7681"),
    "--dash-primary": useColorModeValue("#0D1B4D", "#8DA9DD"),
    "--dash-primary-bg": useColorModeValue("#EDF2FA", "#202C49"),
    "--dash-accent": useColorModeValue("#E31B2D", "#FF7180"),
    "--dash-accent-bg": useColorModeValue(
      "#FFF0F2",
      "rgba(227, 27, 45, 0.14)"
    ),
    "--dash-success": useColorModeValue("#00A881", "#4ADE80"),
    "--dash-success-bg": useColorModeValue(
      "#E9FBF4",
      "rgba(74, 222, 128, 0.14)"
    ),
    "--dash-danger": useColorModeValue("#FF3D3D", "#F87171"),
    "--dash-danger-bg": useColorModeValue(
      "#FFF0F0",
      "rgba(248, 113, 113, 0.14)"
    ),
    "--dash-blue": useColorModeValue("#407BFF", "#3B82F6"),
    "--dash-blue-bg": useColorModeValue("#EEF5FF", "rgba(59, 130, 246, 0.14)"),
    "--dash-amber-action-bg": useColorModeValue(
      "#FFF1F3",
      "rgba(227, 27, 45, 0.12)"
    ),
    "--dash-amber-action-border": useColorModeValue(
      "#FFC8CE",
      "rgba(227, 27, 45, 0.18)"
    ),
    "--dash-green-action-bg": useColorModeValue(
      "#DDFBEC",
      "rgba(74, 222, 128, 0.13)"
    ),
    "--dash-green-action-border": useColorModeValue(
      "#B8F0D5",
      "rgba(74, 222, 128, 0.16)"
    ),
    "--dash-badge-bg": useColorModeValue("#FFF0F2", "rgba(227, 27, 45, 0.16)"),
  };
  const {
    data: statsData,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useDashboardStats(dashboardFilters);

  const stats = statsData?.data || {};
  const todayOps = stats.todayOperations || {};
  const yesterdayOps = stats.yesterdayOperations || {};
  const financial = stats.financial || {};
  const operational = stats.operational || {};
  const alerts = stats.alerts || {};
  const couriers = stats.couriers || {};
  const geographic = stats.geographic || {};
  const charts = stats.charts || {};
  const sellers = stats.sellers || {};
  const courierOptions = stats.filterOptions?.couriers || Object.keys(couriers.performance || {});

  const totalOrders = toNum(operational.totalOrders);
  const activeSellers = toNum(
    sellers.active || sellers.activeSellers || operational.activeSellers
  );
  const totalRevenue = toNum(financial.totalRevenue);
  const totalCost = toNum(
    financial.totalCost || financial.courierCost || financial.freightCost
  );
  const totalMargin = Number.isFinite(Number(financial.totalMargin))
    ? toNum(financial.totalMargin)
    : totalRevenue - totalCost;
  const deliveryRate = toNum(
    operational.deliverySuccessRate || operational.deliveryRate
  );

  const ordersTrend =
    toNum(yesterdayOps.orders) > 0
      ? Math.round(
          ((toNum(todayOps.orders) - toNum(yesterdayOps.orders)) /
            toNum(yesterdayOps.orders)) *
            100
        )
      : totalOrders > 0
      ? 0
      : -100;
  const yesterdayRevenue = toNum(yesterdayOps.revenue);
  const revenueTrend =
    yesterdayRevenue > 0
      ? Math.round(
          ((toNum(financial.todayRevenue) - yesterdayRevenue) /
            yesterdayRevenue) *
            100
        )
      : totalRevenue > 0
      ? 0
      : -100;
  const rangeLabel =
    dashboardFilters.range === "all"
      ? "All time"
      : `${dashboardFilters.range.replace("d", " days")}`;
  const ndrRate = toNum(operational.ndrRate);
  const rtoRate = toNum(operational.rtoRate);
  const avgDeliveryTime = toNum(
    operational.avgDeliveryTime || operational.avgDeliveryDays
  );

  const statusItems = [
    {
      status: "pending",
      name: "Pending",
      count: toNum(operational.pendingOrders || todayOps.pending),
      fill: ui.primary,
    },
    {
      status: "transit",
      name: "In Transit",
      count: toNum(operational.inTransitOrders),
      fill: ui.blue,
    },
    {
      status: "delivered",
      name: "Delivered",
      count: toNum(operational.deliveredOrders),
      fill: ui.success,
    },
    {
      status: "ndr",
      name: "NDR",
      count: toNum(operational.ndrOrders),
      fill: "#F59E0B",
    },
    {
      status: "rto",
      name: "RTO",
      count: toNum(operational.rtoOrders),
      fill: ui.danger,
    },
  ];

  const courierRows = Object.entries(couriers.performance || {}).map(
    ([courier, value]) => ({
      courier,
      revenue: toNum(value?.revenue),
      cost: toNum(value?.cost),
      margin: toNum(value?.margin),
      marginPercent: toNum(value?.marginPercent),
      revPerOrder: toNum(value?.revPerOrder),
    })
  );

  const topCouriers = Object.entries(couriers.performance || {}).map(
    ([name, value]) => ({
      name,
      count: toNum(value?.count),
      deliveryRate: toNum(value?.deliveryRate),
      revenue: toNum(value?.revenue),
    })
  );

  const topOrigins = geographic.topOriginCities || [];
  const topDestinations = geographic.topDestinationCities || [];
  const prepaid =
    stats.paymentSplit?.prepaid || financial.paymentSplit?.prepaid || {};
  const cod = stats.paymentSplit?.cod || financial.paymentSplit?.cod || {};
  const bankApprovals = toNum(
    alerts.bankApprovalsPending || stats.compliance?.bankApprovalsPending
  );
  const codRemittances = toNum(
    alerts.codRemittancesPending || financial.codRemittancesPending
  );
  const totalAlerts =
    toNum(alerts.openTickets) +
    toNum(alerts.overdueTickets) +
    toNum(alerts.pendingKyc) +
    toNum(alerts.weightDiscrepancies) +
    bankApprovals +
    codRemittances;
  const totalPaymentOrders = toNum(prepaid.orders) + toNum(cod.orders);
  const prepaidShare =
    totalPaymentOrders > 0
      ? Math.round((toNum(prepaid.orders) / totalPaymentOrders) * 100)
      : 0;
  const codShare =
    totalPaymentOrders > 0
      ? Math.round((toNum(cod.orders) / totalPaymentOrders) * 100)
      : 0;
  const avgRevenuePerOrder =
    totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const marginRate =
    totalRevenue > 0 ? Number(((totalMargin / totalRevenue) * 100).toFixed(1)) : 0;
  const alertLoad =
    totalOrders > 0 ? Number(((totalAlerts / totalOrders) * 100).toFixed(1)) : 0;
  const quickActions = [
    {
      label: "Manage Orders",
      subtitle: "Search, update and export shipments",
      route: "/admin/orders",
      badge: totalOrders.toLocaleString(),
      icon: IconPackageExport,
      color: ui.primary,
    },
    {
      label: "Registered Users",
      subtitle: "Review new sellers and approvals",
      route: "/admin/users-management",
      badge: activeSellers.toLocaleString(),
      icon: IconUsers,
      color: ui.blue,
    },
    {
      label: "Serviceability",
      subtitle: "Check pincode coverage fast",
      route: "/admin/serviceability",
      icon: IconMapPin,
      color: ui.success,
    },
    {
      label: "COD Remittance",
      subtitle: "Pending payouts and statements",
      route: "/admin/cod-remittance",
      badge: formatCurrency(toNum(financial.codRemittanceDue)),
      icon: IconWallet,
      color: ui.accent,
    },
    {
      label: "Reports",
      subtitle: "Download operational summaries",
      route: "/admin/reports",
      icon: IconActivity,
      color: ui.primary,
    },
    {
      label: "Support Queue",
      subtitle: "Tickets that need action",
      route: "/admin/support",
      badge: toNum(alerts.openTickets),
      icon: IconAlertTriangle,
      color: totalAlerts > 0 ? ui.accent : ui.success,
    },
  ];
  const insightCards = [
    {
      label: "Avg revenue / order",
      value: formatCurrency(avgRevenuePerOrder),
      subtitle: `${rangeLabel} booking quality`,
      color: ui.primary,
    },
    {
      label: "Margin rate",
      value: `${marginRate}%`,
      subtitle: `${formatCurrency(totalMargin)} total margin`,
      color: marginRate >= 0 ? ui.success : ui.danger,
    },
    {
      label: "Prepaid mix",
      value: `${prepaidShare}%`,
      subtitle: `${toNum(prepaid.orders)} prepaid orders`,
      color: ui.blue,
    },
    {
      label: "COD mix",
      value: `${codShare}%`,
      subtitle: `${toNum(cod.orders)} COD orders`,
      color: ui.accent,
    },
    {
      label: "Alert load",
      value: `${alertLoad}%`,
      subtitle: `${totalAlerts} open dashboard actions`,
      color: totalAlerts > 0 ? ui.accent : ui.success,
    },
  ];

  if (isLoading) {
    return <DashboardSkeleton dashboardVars={dashboardVars} />;
  }

  return (
    <Box minH="100vh" bg={ui.page} color={ui.text} pb={6} sx={dashboardVars}>
      <Container
        maxW="full"
        pt={{ base: "92px", md: "62px" }}
        px={{ base: 3, md: 5 }}
      >
        <Flex
          justify="space-between"
          align={{ base: "flex-start", lg: "center" }}
          gap={4}
          mb={4}
          flexWrap="wrap"
          bg="linear-gradient(120deg, #FFFFFF 0%, #F4F7FC 58%, #FFF0F2 100%)"
          border="1px solid"
          borderColor={ui.border}
          borderRadius="16px"
          boxShadow="0 10px 28px rgba(13, 27, 77, 0.06)"
          p={{ base: 4, md: 5 }}
          position="relative"
          overflow="hidden"
        >
          <HStack spacing={3.5} align="center">
            <Flex
              w={{ base: "48px", md: "54px" }}
              h={{ base: "48px", md: "54px" }}
              bg="white"
              border="1px solid"
              borderColor={ui.border}
              borderRadius="14px"
              align="center"
              justify="center"
              boxShadow="0 10px 24px rgba(13, 27, 77, 0.09)"
              flexShrink={0}
            >
              <Image src={brandIdentity.logoPath} alt="FastShip" w="82%" objectFit="contain" />
            </Flex>
            <Box>
              <HStack spacing={2} flexWrap="wrap">
                <Text
                  color={ui.text}
                  fontSize={{ base: "22px", md: "25px" }}
                  fontWeight="800"
                  lineHeight="1.2"
                >
                  FastShip Analytics
                </Text>
                <Badge
                  bg={ui.successBg}
                  color={ui.success}
                  borderRadius="full"
                  px={2.5}
                  py={1}
                  textTransform="none"
                >
                  Live
                </Badge>
              </HStack>
              <Text color={ui.muted} fontSize={{ base: "13px", md: "14px" }} mt={1}>
                Orders, revenue and delivery performance in one command center
              </Text>
            </Box>
          </HStack>
          <HStack spacing={2} flexWrap="wrap" w={{ base: "100%", lg: "auto" }}>
            <Select
              value={dashboardFilters.range}
              onChange={(e) =>
                setDashboardFilters((prev) => ({
                  ...prev,
                  range: e.target.value,
                }))
              }
              h="38px"
              w={{ base: "100%", sm: "122px" }}
              bg={ui.surface}
              borderColor={ui.border}
              color={ui.text}
              borderRadius="10px"
              fontSize="13px"
              fontWeight="700"
            >
              <option value="7d">7 days</option>
              <option value="15d">15 days</option>
              <option value="30d">30 days</option>
              <option value="90d">90 days</option>
              <option value="all">All time</option>
            </Select>
            <Select
              value={dashboardFilters.courier}
              onChange={(e) =>
                setDashboardFilters((prev) => ({
                  ...prev,
                  courier: e.target.value,
                }))
              }
              h="38px"
              w={{ base: "100%", sm: "148px" }}
              bg={ui.surface}
              borderColor={ui.border}
              color={ui.tertiary}
              borderRadius="10px"
              fontSize="13px"
              fontWeight="700"
            >
              <option value="all">All couriers</option>
              {courierOptions.map((courier) => (
                <option key={courier} value={courier}>
                  {courier}
                </option>
              ))}
            </Select>
            <Select
              value={dashboardFilters.paymentType}
              onChange={(e) =>
                setDashboardFilters((prev) => ({
                  ...prev,
                  paymentType: e.target.value,
                }))
              }
              h="38px"
              w={{ base: "100%", sm: "132px" }}
              bg={ui.surface}
              borderColor={ui.border}
              color={ui.tertiary}
              borderRadius="10px"
              fontSize="13px"
              fontWeight="700"
            >
              <option value="all">All payments</option>
              <option value="prepaid">Prepaid</option>
              <option value="cod">COD</option>
            </Select>
            <Button
              h="38px"
              minW="38px"
              px={3}
              bg={ui.primary}
              color="white"
              borderRadius="10px"
              aria-label="Refresh analytics"
              isLoading={isRefetching}
              onClick={() => refetch()}
              _hover={{ bg: "#193A75" }}
            >
              <IconRefresh size={16} />
            </Button>
          </HStack>
        </Flex>

        {error ? (
          <Panel title="Dashboard data" minH="150px">
            <VStack spacing={3}>
              <Text color={ui.danger} fontWeight="700">
                Failed to load dashboard data
              </Text>
              <Button
                size="sm"
                leftIcon={<IconRefresh size={16} />}
                isLoading={isRefetching}
                onClick={() => refetch()}
                bg={ui.primary}
                color="white"
                _hover={{ bg: "#193A75" }}
              >
                Retry
              </Button>
            </VStack>
          </Panel>
        ) : (
          <Stack spacing="18px">
            <Panel
              title="Quick Options"
              icon={{ node: <IconActivity size={18} />, color: ui.primary }}
            >
              <SimpleGrid columns={{ base: 1, sm: 2, xl: 3, "2xl": 6 }} spacing="12px">
                {quickActions.map((action) => (
                  <QuickActionCard key={action.label} {...action} />
                ))}
              </SimpleGrid>
            </Panel>

            <Box>
              <HStack justify="space-between" align="center" mb={3} flexWrap="wrap" gap={2}>
                <Box>
                  <Text color={ui.text} fontSize={{ base: "18px", md: "20px" }} fontWeight="900">
                    Smart Analytics
                  </Text>
                  <Text color={ui.muted} fontSize="13px">
                    Fast KPIs for revenue quality, payment split and operational pressure
                  </Text>
                </Box>
                <Badge
                  color={ui.success}
                  bg={ui.successBg}
                  borderRadius="full"
                  px={3}
                  py={1}
                  textTransform="none"
                >
                  Auto refresh 30s
                </Badge>
              </HStack>
              <SimpleGrid columns={{ base: 1, sm: 2, lg: 3, "2xl": 5 }} spacing="12px">
                {insightCards.map((insight) => (
                  <InsightCard key={insight.label} {...insight} />
                ))}
              </SimpleGrid>
            </Box>

            <SimpleGrid columns={{ base: 1, sm: 2, lg: 3, "2xl": 6 }} spacing="12px">
              <MetricCard
                label={`Orders · ${rangeLabel}`}
                value={totalOrders.toLocaleString()}
                subtitle={`${toNum(todayOps.orders)} today`}
                trend={ordersTrend}
                icon={IconPackageExport}
                color={ui.primary}
              />
              <MetricCard
                label="Registered Users"
                value={activeSellers.toLocaleString()}
                icon={IconUsers}
                color={ui.blue}
              />
              <MetricCard
                label={`Revenue · ${rangeLabel}`}
                value={formatCurrency(totalRevenue)}
                trend={revenueTrend}
                icon={IconCoinRupee}
                color={ui.success}
              />
              <MetricCard
                label="Delivery Rate"
                value={`${deliveryRate}%`}
                subtitle={avgDeliveryTime ? `Avg ${avgDeliveryTime} days` : "Delivery health"}
                icon={IconCircleCheck}
                color={ui.success}
              />
              <MetricCard
                label="NDR Rate"
                value={`${ndrRate}%`}
                subtitle={`${toNum(operational.ndrOrders)} shipments`}
                icon={IconAlertTriangle}
                color={ui.accent}
              />
              <MetricCard
                label="RTO Rate"
                value={`${rtoRate}%`}
                subtitle={`${toNum(operational.rtoOrders)} returns`}
                icon={IconRoute}
                color={ui.danger}
              />
            </SimpleGrid>

            <Grid templateColumns={{ base: "1fr", xl: "2fr 1fr" }} gap="16px">
              <Panel
                title={`Orders by Status · ${rangeLabel}`}
                badge={statusItems.reduce((sum, item) => sum + item.count, 0)}
                icon={{
                  node: <IconPackageExport size={18} />,
                  color: ui.primary,
                }}
                minH="226px"
              >
                <StatusBars items={statusItems} />
              </Panel>
              <Panel
                title="Alerts & Actions"
                badge={totalAlerts}
                icon={{
                  node: <IconAlertTriangle size={18} />,
                  color: ui.danger,
                }}
                minH="226px"
              >
                <Stack spacing={3}>
                  {toNum(alerts.openTickets) > 0 ? (
                    <ActionRow
                      icon={<IconActivity size={18} />}
                      label="Open support tickets"
                      count={toNum(alerts.openTickets)}
                      route="/admin/support"
                    />
                  ) : null}
                  {toNum(alerts.pendingKyc) > 0 ? (
                    <ActionRow
                      icon={<IconUsers size={18} />}
                      label="Seller KYC pending"
                      count={toNum(alerts.pendingKyc)}
                      route="/admin/users-management"
                    />
                  ) : null}
                  {toNum(alerts.weightDiscrepancies) > 0 ? (
                    <ActionRow
                      icon={<IconPackageExport size={18} />}
                      label="Weight discrepancies"
                      count={toNum(alerts.weightDiscrepancies)}
                      route="/admin/weight-reconciliation"
                    />
                  ) : null}
                  {bankApprovals > 0 ? (
                    <ActionRow
                      icon={<IconBuildingBank size={18} />}
                      label="Bank approvals pending"
                      count={bankApprovals}
                      route="/admin/users-management"
                    />
                  ) : null}
                  {codRemittances > 0 ? (
                    <ActionRow
                      icon={<IconWallet size={18} />}
                      label="COD remittances pending"
                      count={codRemittances}
                      route="/admin/cod-remittance"
                      tone="green"
                    />
                  ) : null}
                  {totalAlerts === 0 ? (
                    <EmptyState
                      label="No alerts or pending actions"
                      h="126px"
                    />
                  ) : null}
                </Stack>
              </Panel>
            </Grid>

            <Grid templateColumns={{ base: "1fr", xl: "2fr 1fr" }} gap="16px">
              <Panel title={`Order Trend · ${rangeLabel}`} minH="300px">
                {(charts.ordersByDate || []).length ? (
                  <Box h="250px">
                    <Suspense fallback={<Skeleton h="100%" borderRadius="12px" />}>
                      <OrdersLineChart data={charts.ordersByDate || []} />
                    </Suspense>
                  </Box>
                ) : (
                  <EmptyState h="250px" />
                )}
              </Panel>
              <Panel title={`Courier Performance · ${rangeLabel}`} minH="300px">
                {topCouriers.length ? (
                  <Stack spacing={3}>
                    {topCouriers.slice(0, 5).map((courier) => (
                      <Flex
                        key={courier.name}
                        justify="space-between"
                        p={3}
                        borderRadius="8px"
                        bg={ui.surfaceMuted}
                      >
                        <Box>
                          <Text color={ui.text} fontWeight="700">
                            {courier.name}
                          </Text>
                          <Text color={ui.muted} fontSize="xs">
                            {courier.count} orders
                          </Text>
                        </Box>
                        <Text color={ui.success} fontWeight="800">
                          {courier.deliveryRate}%
                        </Text>
                      </Flex>
                    ))}
                  </Stack>
                ) : (
                  <EmptyState h="250px" />
                )}
              </Panel>
            </Grid>

            <Panel title={`Revenue & Margin Analytics · ${rangeLabel}`} minH="380px">
              <SimpleGrid columns={{ base: 1, sm: 3 }} spacing={3} mb={5}>
                <Box p={4} borderRadius="10px" bg={ui.primaryBg}>
                  <Text color={ui.muted} fontSize="sm">
                    Total Revenue
                  </Text>
                  <Text color={ui.text} fontSize="2xl" fontWeight="800" mt={1}>
                    {formatCurrency(totalRevenue)}
                  </Text>
                </Box>
                <Box p={4} borderRadius="10px" bg={ui.accentBg}>
                  <Text color={ui.muted} fontSize="sm">
                    Total Cost
                  </Text>
                  <Text color={ui.text} fontSize="2xl" fontWeight="800" mt={1}>
                    {formatCurrency(totalCost)}
                  </Text>
                </Box>
                <Box
                  p={4}
                  borderRadius="10px"
                  bg={totalMargin >= 0 ? ui.successBg : ui.dangerBg}
                >
                  <Text color={ui.muted} fontSize="sm">
                    Total Margin
                  </Text>
                  <Text
                    color={totalMargin >= 0 ? ui.success : ui.danger}
                    fontSize="2xl"
                    fontWeight="800"
                    mt={1}
                  >
                    {formatCurrency(totalMargin)}
                  </Text>
                </Box>
              </SimpleGrid>
              <RevenueTable rows={courierRows} />
            </Panel>

            <Grid templateColumns={{ base: "1fr", xl: "1fr 1fr" }} gap="16px">
              <Panel title="Order Distribution by Courier" minH="310px">
                {topCouriers.length ? (
                  <Box h="250px">
                    <Suspense fallback={<Skeleton h="100%" borderRadius="12px" />}>
                      <CourierDistributionChart
                        data={couriers.performance || {}}
                      />
                    </Suspense>
                  </Box>
                ) : (
                  <EmptyState h="250px" />
                )}
              </Panel>
              <Panel title={`Payment Analytics · ${rangeLabel}`} minH="310px">
                {(charts.revenueByDate || []).length ? (
                  <Box h="164px" mb={4}>
                    <Suspense fallback={<Skeleton h="100%" borderRadius="12px" />}>
                      <RevenueBarChart data={charts.revenueByDate || []} />
                    </Suspense>
                  </Box>
                ) : (
                  <EmptyState h="164px" />
                )}
                <SimpleGrid columns={2} spacing={4}>
                  <Box
                    p={4}
                    borderRadius="10px"
                    bg={ui.primaryBg}
                    textAlign="center"
                  >
                    <Text color={ui.muted} fontSize="sm">
                      Prepaid Revenue
                    </Text>
                    <Text color={ui.text} fontWeight="800" fontSize="lg" mt={1}>
                      {formatCurrency(prepaid.revenue)}
                    </Text>
                    <Text color={ui.muted} fontSize="xs">
                      {toNum(prepaid.orders)} orders
                    </Text>
                  </Box>
                  <Box
                    p={4}
                    borderRadius="10px"
                    bg={ui.accentBg}
                    textAlign="center"
                  >
                    <Text color={ui.muted} fontSize="sm">
                      COD Revenue
                    </Text>
                    <Text color={ui.text} fontWeight="800" fontSize="lg" mt={1}>
                      {formatCurrency(cod.revenue)}
                    </Text>
                    <Text color={ui.muted} fontSize="xs">
                      {toNum(cod.orders)} orders
                    </Text>
                  </Box>
                </SimpleGrid>
              </Panel>
            </Grid>

            <Panel
              title="Today’s Operations Pulse"
              icon={{ node: <IconActivity size={18} />, color: ui.accent }}
              minH="210px"
            >
              <SimpleGrid columns={{ base: 2, md: 4 }} spacing={3}>
                {[
                  { label: "Pending", value: todayOps.pending, color: ui.accent },
                  { label: "In Transit", value: todayOps.inTransit, color: ui.blue },
                  { label: "Delivered", value: todayOps.delivered, color: ui.success },
                  { label: "Stuck > 5 days", value: todayOps.stuck, color: ui.danger },
                ].map((item) => (
                  <Box
                    key={item.label}
                    p={{ base: 4, md: 5 }}
                    borderRadius="14px"
                    bg={ui.surfaceMuted}
                    border="1px solid"
                    borderColor={ui.borderSoft}
                  >
                    <Text color={ui.muted} fontSize="13px" fontWeight="700">
                      {item.label}
                    </Text>
                    <Text color={item.color} fontSize={{ base: "24px", md: "30px" }} fontWeight="800" mt={2}>
                      {toNum(item.value).toLocaleString()}
                    </Text>
                  </Box>
                ))}
              </SimpleGrid>
            </Panel>

            <Grid templateColumns={{ base: "1fr", xl: "1fr 1fr" }} gap="16px">
              <Panel
                title="Top Origin Cities"
                icon={{ node: <IconMapPin size={18} />, color: ui.primary }}
                minH="250px"
              >
                {topOrigins.length ? (
                  <Stack spacing={2.5}>
                    {topOrigins.slice(0, 5).map((city, index) => (
                      <Flex key={`${city.city}-${index}`} p={3} borderRadius="10px" bg={ui.surfaceMuted} justify="space-between">
                        <Text color={ui.text} fontWeight="700">{city.city}</Text>
                        <Badge bg={ui.primaryBg} color={ui.primary}>{toNum(city.count)} orders</Badge>
                      </Flex>
                    ))}
                  </Stack>
                ) : (
                  <EmptyState label="Origin analytics will appear after the first booking" h="145px" />
                )}
              </Panel>
              <Panel
                title="Top Destination Cities"
                icon={{ node: <IconRoute size={18} />, color: ui.accent }}
                minH="250px"
              >
                {topDestinations.length ? (
                  <Stack spacing={2.5}>
                    {topDestinations.slice(0, 5).map((city, index) => (
                      <Flex key={`${city.city}-${index}`} p={3} borderRadius="10px" bg={ui.surfaceMuted} justify="space-between">
                        <Text color={ui.text} fontWeight="700">{city.city}</Text>
                        <Badge bg={ui.accentBg} color={ui.accent}>{toNum(city.count)} orders</Badge>
                      </Flex>
                    ))}
                  </Stack>
                ) : (
                  <EmptyState label="Destination analytics will appear after the first booking" h="145px" />
                )}
              </Panel>
            </Grid>
          </Stack>
        )}
      </Container>
    </Box>
  );
}
