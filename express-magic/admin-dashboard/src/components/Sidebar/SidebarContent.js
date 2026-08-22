import { ChevronRightIcon } from "@chakra-ui/icons";
import {
  Box,
  Button,
  Collapse,
  Flex,
  Stack,
  Text,
  Tooltip,
  useColorModeValue,
} from "@chakra-ui/react";
import {
  IconArrowBackUp,
  IconBook,
  IconCalculator,
  IconChartBar,
  IconClipboardList,
  IconCoinRupee,
  IconDashboard,
  IconDatabase,
  IconFileInvoice,
  IconHelpCircle,
  IconHistory,
  IconKey,
  IconPackage,
  IconPackageExport,
  IconReceipt,
  IconReportAnalytics,
  IconScale,
  IconSettings,
  IconSpeakerphone,
  IconStar,
  IconTruck,
  IconUserCircle,
  IconUserCog,
  IconUsers,
  IconWallet,
} from "@tabler/icons-react";
import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { brandIdentity } from "theme/brand";

const sidebarItems = [
  {
    label: "Dashboard",
    path: "/admin/dashboard",
    icon: IconDashboard,
  },
  {
    label: "Order Management",
    icon: IconPackageExport,
    children: [
      { label: "Orders", path: "/admin/orders", icon: IconPackage },
      {
        label: "Failed Deliveries (NDR)",
        path: "/admin/ops/ndr",
        icon: IconHelpCircle,
      },
      { label: "Returns (RTO)", path: "/admin/ops/rto", icon: IconArrowBackUp },
      {
        label: "Order Tracking",
        path: "/admin/order-tracking",
        icon: IconTruck,
      },
    ],
  },
  {
    label: "Sellers",
    icon: IconUsers,
    children: [
      { label: "Sellers", path: "/admin/users-management", icon: IconUsers },
      { label: "Plans", path: "/admin/plans", icon: IconStar },
      { label: "Team Members", path: "/admin/team-members", icon: IconUserCog },
    ],
  },
  {
    label: "Support",
    icon: IconHelpCircle,
    path: "/admin/support",
  },
  {
    label: "Billing",
    icon: IconWallet,
    children: [
      {
        label: "Passbook",
        path: "/admin/passbook",
        icon: IconBook,
      },
      {
        label: "COD Remittance",
        path: "/admin/cod-remittance",
        icon: IconWallet,
      },
      {
        label: "Shipping Charges",
        path: "/admin/shipping-charges",
        icon: IconTruck,
      },
      {
        label: "All Recharges",
        path: "/admin/all-recharges",
        icon: IconCoinRupee,
      },
      {
        label: "Invoices",
        path: "/admin/billing-invoices",
        icon: IconFileInvoice,
      },
      {
        label: "Credit Notes",
        path: "/admin/credit-notes",
        icon: IconReceipt,
      },
      {
        label: "Debit Notes",
        path: "/admin/debit-notes",
        icon: IconClipboardList,
      },
      {
        label: "Ledgers",
        path: "/admin/ledgers",
        icon: IconDatabase,
      },
      {
        label: "Billing Preferences",
        path: "/admin/billing-preferences",
        icon: IconSettings,
      },
      { label: "Wallet Management", path: "/admin/wallet", icon: IconReceipt },
    ],
  },
  {
    label: "Insights",
    icon: IconChartBar,
    children: [
      { label: "Reports", path: "/admin/reports", icon: IconReportAnalytics },
      { label: "Activity Log", path: "/admin/activity-log", icon: IconHistory },
    ],
  },
  {
    label: "Reconciliation",
    icon: IconScale,
    children: [
      {
        label: "Weight Discrepancies",
        path: "/admin/weight-reconciliation",
        icon: IconScale,
      },
      {
        label: "Dispute Management",
        path: "/admin/dispute-management",
        icon: IconClipboardList,
      },
    ],
  },
  {
    label: "Tools",
    icon: IconCalculator,
    children: [
      {
        label: "Rate Calculator",
        path: "/admin/rate-calculator",
        icon: IconCalculator,
      },
      {
        label: "Order Tracking",
        path: "/admin/order-tracking",
        icon: IconTruck,
      },
      {
        label: "API Integration",
        path: "/admin/api-integration",
        icon: IconKey,
      },
    ],
  },
  {
    label: "Configuration",
    icon: IconSettings,
    children: [
      { label: "Couriers", path: "/admin/couriers" },
      {
        label: "Courier Credentials",
        path: "/admin/courier-credentials",
        icon: IconKey,
      },
      { label: "Service Providers", path: "/admin/service-providers" },
      { label: "Serviceability", path: "/admin/serviceability" },
      { label: "B2C Pricing", path: "/admin/pricing/b2c" },
      { label: "B2B Pricing", path: "/admin/pricing/b2b" },
    ],
  },
  {
    label: "Marketing",
    icon: IconSpeakerphone,
    children: [
      { label: "All Blogs", path: "/admin/blogs" },
      { label: "Create Blog", path: "/admin/create-blog" },
    ],
  },
  {
    label: "Settings",
    icon: IconUserCircle,
    children: [
      { label: "My Account", path: "/admin/account" },
      { label: "Payment Options", path: "/admin/settings/payment-options" },
      { label: "Change Password", path: "/admin/settings/change-password" },
      { label: "Notifications", path: "/admin/notifications" },
      { label: "Notification Settings", path: "/admin/notifications/settings" },
      { label: "Developer", path: "/admin/developer", icon: IconDatabase },
    ],
  },
];

const isItemActive = (pathname, item) => {
  if (item.path) return pathname.startsWith(item.path);
  return item.children?.some((child) => pathname.startsWith(child.path));
};

const SidebarContent = ({
  logoText,
  sidebarWidth,
  position = "fixed",
  onNavigate,
  isCollapsed = false,
  onCollapsedGroupClick,
}) => {
  const location = useLocation();
  const [openGroups, setOpenGroups] = React.useState({});
  const sidebarBg = useColorModeValue("#ffffff", "#161B22");
  const borderColor = useColorModeValue("#E8EDF5", "#30363D");
  const logoColor = useColorModeValue("#0F172A", "#E6EDF3");
  const itemColor = useColorModeValue("#586B8A", "#8B949E");
  const itemHoverBg = useColorModeValue("#F9FAFB", "#21262D");
  const itemHoverColor = useColorModeValue("#0F172A", "#E6EDF3");
  const itemActiveBg = useColorModeValue("#EDE9FE", "#242349");
  const itemActiveColor = useColorModeValue("#5A4BD1", "#B7AEFF");
  const iconColor = useColorModeValue("#94A3B8", "#8B949E");
  const childColor = useColorModeValue("#586B8A", "#8B949E");
  const childActiveBg = useColorModeValue("#EDE9FE", "#242349");
  const childActiveColor = useColorModeValue("#5A4BD1", "#B7AEFF");
  const scrollbarThumb = useColorModeValue("#CBD5E1", "#6E7681");

  React.useEffect(() => {
    const nextOpen = {};
    sidebarItems.forEach((item) => {
      if (item.children && isItemActive(location.pathname, item)) {
        nextOpen[item.label] = true;
      }
    });
    setOpenGroups(nextOpen);
  }, [location.pathname]);

  const toggleGroup = (label) => {
    setOpenGroups((prev) => (prev[label] ? {} : { [label]: true }));
  };

  const renderIcon = (Icon, active) => (
    <Box
      color={active ? itemActiveColor : iconColor}
      display="flex"
      alignItems="center"
      justifyContent="center"
      flexShrink={0}
      w="22px"
    >
      <Icon size={18} strokeWidth={1.65} />
    </Box>
  );

  return (
    <Box
      h="100vh"
      w={`${sidebarWidth}px`}
      bg={sidebarBg}
      borderRight="1px solid"
      borderColor={borderColor}
      position={position}
      left={position === "fixed" ? "0" : undefined}
      top={position === "fixed" ? "0" : undefined}
      overflowY="auto"
      overflowX="hidden"
      css={{
        scrollbarWidth: "thin",
        "&::-webkit-scrollbar": { width: "11px" },
        "&::-webkit-scrollbar-track": { background: sidebarBg },
        "&::-webkit-scrollbar-thumb": {
          background: scrollbarThumb,
          borderRadius: "999px",
          border: `3px solid ${sidebarBg}`,
        },
      }}
    >
      <Flex
        h="58px"
        px={isCollapsed ? "10px" : "20px"}
        align="center"
        justify={isCollapsed ? "center" : "flex-start"}
        gap="10px"
        borderBottom="1px solid"
        borderColor={borderColor}
      >
        <Box
          as="img"
          src={brandIdentity.logoPath}
          alt={brandIdentity.name}
          w={isCollapsed ? "46px" : "92px"}
          h={isCollapsed ? "32px" : "42px"}
          objectFit="contain"
          flexShrink="0"
        />
        {!isCollapsed ? (
          <Text
            color={logoColor}
            fontSize="16px"
            fontWeight="800"
            letterSpacing="0"
          >
            {logoText || "Admin Panel"}
          </Text>
        ) : null}
      </Flex>

      <Stack spacing="5px" px={isCollapsed ? "10px" : "12px"} py="16px">
        {sidebarItems.map((item) => {
          const active = isItemActive(location.pathname, item);
          const Icon = item.icon || IconTruck;

          if (!item.children) {
            return (
              <Tooltip
                key={item.label}
                label={item.label}
                placement="right"
                isDisabled={!isCollapsed}
                hasArrow
              >
                <NavLink to={item.path} onClick={onNavigate}>
                  <Flex
                    h="38px"
                    px={isCollapsed ? "0" : "13px"}
                    align="center"
                    justify={isCollapsed ? "center" : "flex-start"}
                    gap="9px"
                    borderRadius="8px"
                    bg={active ? itemActiveBg : "transparent"}
                    color={active ? itemActiveColor : itemColor}
                    _hover={{
                      bg: active ? itemActiveBg : itemHoverBg,
                      color: itemHoverColor,
                    }}
                    transition="all 0.16s ease"
                  >
                    {renderIcon(Icon, active)}
                    {!isCollapsed ? (
                      <Text
                        fontSize="15px"
                        fontWeight={active ? "700" : "500"}
                        lineHeight="1.15"
                      >
                        {item.label}
                      </Text>
                    ) : null}
                  </Flex>
                </NavLink>
              </Tooltip>
            );
          }

          const open = Boolean(openGroups[item.label]);

          return (
            <Box key={item.label}>
              <Tooltip
                label={item.label}
                placement="right"
                isDisabled={!isCollapsed}
                hasArrow
              >
                <Button
                  type="button"
                  onClick={() =>
                    isCollapsed
                      ? onCollapsedGroupClick?.()
                      : toggleGroup(item.label)
                  }
                  minH="38px"
                  w="100%"
                  px={isCollapsed ? "0" : "13px"}
                  py="0"
                  justifyContent={isCollapsed ? "center" : "space-between"}
                  borderRadius="8px"
                  bg={active ? itemActiveBg : "transparent"}
                  color={active ? itemActiveColor : itemColor}
                  fontWeight="500"
                  _hover={{
                    bg: active ? itemActiveBg : itemHoverBg,
                    color: itemHoverColor,
                  }}
                  _active={{ bg: itemActiveBg }}
                >
                  <Flex align="center" gap="9px" minW={0}>
                    {renderIcon(Icon, active)}
                    {!isCollapsed ? (
                      <Text
                        fontSize="15px"
                        whiteSpace="normal"
                        textAlign="left"
                        lineHeight="1.25"
                      >
                        {item.label}
                      </Text>
                    ) : null}
                  </Flex>
                  {!isCollapsed ? (
                    <Box
                      transition="transform 0.16s ease"
                      transform={open ? "rotate(90deg)" : "rotate(0deg)"}
                    >
                      <ChevronRightIcon boxSize="15px" />
                    </Box>
                  ) : null}
                </Button>
              </Tooltip>
              <Collapse in={!isCollapsed && open} animateOpacity>
                <Stack
                  spacing="5px"
                  mt="6px"
                  mb="7px"
                  ml="22px"
                  pl="14px"
                  borderLeft="1px solid"
                  borderColor={borderColor}
                >
                  {item.children.map((child) => {
                    const childActive = location.pathname.startsWith(
                      child.path
                    );
                    const ChildIcon = child.icon || IconClipboardList;
                    return (
                      <NavLink
                        key={child.path}
                        to={child.path}
                        onClick={onNavigate}
                      >
                        <Flex
                          align="center"
                          gap="8px"
                          minH="32px"
                          px="12px"
                          py="5px"
                          borderRadius="7px"
                          color={childActive ? childActiveColor : childColor}
                          bg={childActive ? childActiveBg : "transparent"}
                          _hover={{
                            bg: childActiveBg,
                            color: childActiveColor,
                          }}
                        >
                          <Box
                            flexShrink={0}
                            color={childActive ? childActiveColor : iconColor}
                          >
                            <ChildIcon size={15} strokeWidth={1.65} />
                          </Box>
                          <Text
                            fontSize="13px"
                            fontWeight={childActive ? "700" : "500"}
                            lineHeight="1.22"
                          >
                            {child.label}
                          </Text>
                        </Flex>
                      </NavLink>
                    );
                  })}
                </Stack>
              </Collapse>
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
};

export default SidebarContent;
