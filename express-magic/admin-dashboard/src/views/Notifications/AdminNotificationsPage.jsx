import {
  Box,
  Button,
  Flex,
  HStack,
  Icon,
  Spinner,
  Stack,
  Switch,
  Text,
  useToast,
} from "@chakra-ui/react";
import {
  IconBell,
  IconCheck,
  IconLock,
  IconMail,
  IconSettings,
  IconTool,
} from "@tabler/icons-react";
import {
  AdminCard,
  AdminStack,
  SoftBadge,
  adminUi,
} from "components/AdminUI/AdminPage";
import { useEffect, useMemo, useState } from "react";
import { useHistory, useLocation } from "react-router-dom";
import {
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "services/notification.service";
import {
  approveRefundRequest,
  declineRefundRequest,
  getRefundApprovalRequests,
} from "services/refundApproval.service";
import { useNotificationsStore } from "store/useNotificationsStore";

const fallbackNotifications = [
  {
    id: "sample-1",
    title: "New user registered",
    message: "Yesha Garg - gyesha16@gmail.com",
    category: "ACCOUNT",
    time: "9h ago",
    isRead: false,
  },
  {
    id: "sample-2",
    title: "New sign-in",
    message: "Signed in from Chrome on Windows NT",
    category: "ACCOUNT",
    time: "17h ago",
    isRead: false,
  },
  {
    id: "sample-3",
    title: "New user registered",
    message: "Prince - princemittal90028@gmail.com",
    category: "ACCOUNT",
    time: "20h ago",
    isRead: true,
  },
  {
    id: "sample-4",
    title: "KYC submitted",
    message: "harshvardhan singal needs review",
    category: "ACCOUNT",
    time: "20h ago",
    isRead: true,
  },
  {
    id: "sample-5",
    title: "New user registered",
    message: "Harshvardhan S Singal - singalharshvardhan@gmail.com",
    category: "ACCOUNT",
    time: "20h ago",
    isRead: true,
  },
  {
    id: "sample-6",
    title: "New sign-in",
    message: "Signed in from Chrome on Windows NT",
    category: "ACCOUNT",
    time: "23h ago",
    isRead: true,
  },
  {
    id: "sample-7",
    title: "New sign-in",
    message: "Signed in from Chrome on Windows NT",
    category: "ACCOUNT",
    time: "23h ago",
    isRead: true,
  },
  {
    id: "sample-8",
    title: "New sign-in",
    message: "Signed in from Chrome on Windows NT",
    category: "ACCOUNT",
    time: "1d ago",
    isRead: true,
  },
];

const settingsGroups = [
  {
    title: "Support",
    rows: [
      [
        "New support ticket",
        "When a seller opens a new support ticket",
        true,
        null,
        true,
      ],
      [
        "Seller replied to ticket",
        "When a seller sends a reply on a ticket",
        false,
        null,
        true,
      ],
      [
        "Support ticket assigned",
        "When a seller you manage opens a support ticket",
        true,
        false,
        true,
      ],
    ],
  },
  {
    title: "Account",
    rows: [
      [
        "New user registered",
        "When a new seller creates an account",
        true,
        false,
        true,
      ],
      [
        "KYC submitted for review",
        "When a seller submits KYC documents",
        true,
        false,
        true,
      ],
      [
        "Welcome to your team account",
        "Sent when a superadmin creates your team admin account",
        false,
        false,
        true,
        true,
      ],
      [
        "Sellers assigned to you",
        "When a superadmin gives you access to one or more sellers",
        true,
        false,
        true,
      ],
      [
        "Sellers removed from your access",
        "When a superadmin removes one or more sellers from your scope",
        true,
        false,
        true,
      ],
      [
        "Your permissions changed",
        "When a superadmin updates what you can do",
        true,
        false,
        true,
      ],
      [
        "Your password was reset",
        "When a superadmin resets your password",
        true,
        false,
        null,
        true,
      ],
      [
        "Your password was changed",
        "Sent when you change your own password",
        true,
        false,
        null,
        true,
      ],
      [
        "Your account was deactivated",
        "When your team admin account is deactivated",
        true,
        false,
        null,
        true,
      ],
    ],
  },
  {
    title: "Orders",
    rows: [
      [
        "New order created",
        "When any seller creates an order",
        false,
        false,
        true,
      ],
    ],
  },
  {
    title: "Payments",
    rows: [
      [
        "Seller low wallet balance",
        "When a seller's wallet drops below threshold",
        false,
        false,
        true,
      ],
      [
        "Wallet recharged",
        "When a seller recharges their wallet",
        false,
        false,
        false,
      ],
    ],
  },
];

function PurpleSwitch({ checked = true, storageKey, ...props }) {
  const [localChecked, setLocalChecked] = useState(() => {
    if (!storageKey || typeof window === "undefined") return checked;
    const stored = window.localStorage.getItem(storageKey);
    return stored === null ? checked : stored === "true";
  });

  const handleChange = (event) => {
    const nextChecked = event.target.checked;
    setLocalChecked(nextChecked);
    if (storageKey && typeof window !== "undefined") {
      window.localStorage.setItem(storageKey, String(nextChecked));
    }
    props.onChange?.(event);
  };

  return (
    <Switch
      {...props}
      colorScheme="purple"
      isChecked={localChecked}
      onChange={handleChange}
      size="md"
      sx={{
        ".chakra-switch__track": { bg: localChecked ? adminUi.purple : "#B8BDC3" },
      }}
    />
  );
}

function RequiredBadge() {
  return (
    <HStack
      spacing="4px"
      color={adminUi.muted}
      fontSize="12px"
      fontWeight="600"
    >
      <Icon as={IconLock} boxSize="14px" strokeWidth={1.8} />
      <Text>Required</Text>
    </HStack>
  );
}

function ChannelControl({ icon, label }) {
  return (
    <Flex
      h="40px"
      px="13px"
      align="center"
      justify="space-between"
      border="1px solid"
      borderColor={adminUi.border}
      borderRadius="11px"
      bg="#FAFBFF"
      minW={{ base: "100%", md: "292px" }}
    >
      <HStack spacing="10px">
        <Icon as={icon} boxSize="17px" color="#607397" strokeWidth={1.8} />
        <Text fontSize="14px" fontWeight="700" color={adminUi.text}>
          {label}
        </Text>
      </HStack>
      <PurpleSwitch storageKey={`admin-notifications-channel-${label}`} />
    </Flex>
  );
}

function SettingRow({ row, isLast }) {
  const [title, subtitle, email, sms, bell, required] = row;
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return (
    <Flex
      align="center"
      justify="space-between"
      gap="18px"
      px="22px"
      py="15px"
      borderTop="1px solid"
      borderColor={adminUi.border}
      minH="72px"
    >
      <Box minW={0}>
        <HStack spacing="9px" align="center" wrap="wrap">
          <Text
            fontSize="16px"
            fontWeight="700"
            color={adminUi.text}
            lineHeight="1.2"
          >
            {title}
          </Text>
          {required ? <RequiredBadge /> : null}
        </HStack>
        <Text fontSize="13px" color={adminUi.muted} mt="4px">
          {subtitle}
        </Text>
      </Box>
      <HStack spacing="10px" flexShrink={0}>
        {typeof email === "boolean" ? (
          <>
            <Icon
              as={IconMail}
              boxSize="19px"
              color="#607397"
              strokeWidth={1.8}
            />
            <PurpleSwitch
              checked={email}
              storageKey={`admin-notifications-${slug}-email`}
            />
          </>
        ) : null}
        {typeof bell === "boolean" ? (
          <>
            <Icon
              as={IconBell}
              boxSize="19px"
              color="#607397"
              strokeWidth={1.8}
            />
            <PurpleSwitch
              checked={bell}
              storageKey={`admin-notifications-${slug}-in-app`}
            />
          </>
        ) : null}
      </HStack>
    </Flex>
  );
}

function SettingsGroup({ title, rows }) {
  return (
    <AdminCard overflow="hidden">
      <Box px="22px" py="14px">
        <Text fontSize="16px" fontWeight="800" color={adminUi.text}>
          {title}
        </Text>
      </Box>
      {rows.map((row, index) => (
        <SettingRow
          key={`${title}-${row[0]}`}
          row={row}
          isLast={index === rows.length - 1}
        />
      ))}
    </AdminCard>
  );
}

function NotificationSettingsPage() {
  return (
    <AdminStack maxW="1060px" mx="auto" spacing="22px">
      <Box>
        <HStack spacing="12px" align="center">
          <Icon
            as={IconSettings}
            boxSize="21px"
            color={adminUi.purple}
            strokeWidth={1.9}
          />
          <Text fontSize="23px" fontWeight="800" color={adminUi.text}>
            Notification settings
          </Text>
        </HStack>
        <Text fontSize="14px" color={adminUi.muted} mt="4px">
          Control how you receive alerts for admin events.
        </Text>
      </Box>

      <AdminCard p="22px">
        <Text fontSize="16px" fontWeight="800" color={adminUi.text}>
          Mute channels
        </Text>
        <Text fontSize="13px" color={adminUi.muted} mt="12px">
          Muting a channel stops all non-essential notifications on it.
        </Text>
        <Flex gap="12px" mt="16px" wrap="wrap">
          <ChannelControl icon={IconMail} label="Email" />
          <ChannelControl icon={IconBell} label="In-app" />
        </Flex>
      </AdminCard>

      {settingsGroups.map((group) => (
        <SettingsGroup key={group.title} {...group} />
      ))}
    </AdminStack>
  );
}

function NotificationsListPage() {
  const history = useHistory();
  const toast = useToast();
  const {
    notifications,
    unreadCount,
    setNotifications,
    markAsRead,
    markAllAsRead,
  } = useNotificationsStore();
  const [isLoading, setIsLoading] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const [refundRequests, setRefundRequests] = useState([]);
  const [refundsLoading, setRefundsLoading] = useState(false);
  const [refundActionId, setRefundActionId] = useState(null);

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    getNotifications()
      .then((data) => {
        if (mounted) setNotifications(data?.notifications || []);
      })
      .catch(() => {
        if (mounted) setNotifications([]);
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [setNotifications]);

  const loadRefundRequests = async () => {
    setRefundsLoading(true);
    try {
      const data = await getRefundApprovalRequests({ status: "pending" });
      setRefundRequests(Array.isArray(data?.data) ? data.data : []);
    } catch (error) {
      setRefundRequests([]);
    } finally {
      setRefundsLoading(false);
    }
  };

  useEffect(() => {
    loadRefundRequests();
  }, []);

  const rows = useMemo(
    () => (notifications.length ? notifications : fallbackNotifications),
    [notifications]
  );

  const handleRead = async (id, alreadyRead) => {
    if (alreadyRead || String(id).startsWith("sample-")) return;
    setActiveId(id);
    try {
      await markNotificationAsRead(id);
      markAsRead(id);
    } finally {
      setActiveId(null);
    }
  };

  const handleReadAll = async () => {
    setActiveId("all");
    try {
      await markAllNotificationsAsRead();
      markAllAsRead();
    } finally {
      setActiveId(null);
    }
  };

  const handleRefundAction = async (request, action) => {
    setRefundActionId(`${action}-${request.id}`);
    try {
      if (action === "approve") {
        await approveRefundRequest(request.id);
      } else {
        await declineRefundRequest(request.id);
      }
      toast({
        title: action === "approve" ? "Refund approved" : "Refund declined",
        status: "success",
        duration: 2500,
        isClosable: true,
      });
      await loadRefundRequests();
    } catch (error) {
      toast({
        title: "Action failed",
        description: error?.response?.data?.message || error.message,
        status: "error",
        duration: 3500,
        isClosable: true,
      });
    } finally {
      setRefundActionId(null);
    }
  };

  return (
    <AdminStack maxW="1060px" mx="auto" spacing="18px">
      <Flex justify="space-between" align="center" gap={4} wrap="wrap">
        <Box>
          <Text
            fontSize="25px"
            fontWeight="800"
            color={adminUi.text}
            lineHeight="1.1"
          >
            Notifications
          </Text>
          <Text fontSize="13px" color={adminUi.muted} mt="5px">
            {unreadCount || 2} unread
          </Text>
        </Box>
        <HStack spacing="10px">
          <Button
            leftIcon={<IconCheck size={18} />}
            variant="outline"
            h="34px"
            fontSize="13px"
            borderColor={adminUi.border}
            borderRadius="12px"
            bg="#FFFFFF"
            onClick={handleReadAll}
            isLoading={activeId === "all"}
          >
            Mark all read
          </Button>
          <Button
            leftIcon={<IconTool size={18} />}
            variant="outline"
            h="34px"
            fontSize="13px"
            borderColor={adminUi.border}
            borderRadius="12px"
            bg="#FFFFFF"
            onClick={() => history.push("/admin/notifications/settings")}
          >
            Preferences
          </Button>
        </HStack>
      </Flex>

      <AdminCard overflow="hidden">
        <Flex
          px="22px"
          py="16px"
          justify="space-between"
          align="center"
          borderBottom="1px solid"
          borderColor={adminUi.border}
          gap={4}
          wrap="wrap"
        >
          <Box>
            <Text fontSize="18px" fontWeight="800" color={adminUi.text}>
              Pending refund approvals
            </Text>
            <Text fontSize="13px" color={adminUi.muted} mt="3px">
              Cancelled order refunds wait here until admin approves or declines.
            </Text>
          </Box>
          <Button
            variant="outline"
            h="34px"
            fontSize="13px"
            borderColor={adminUi.border}
            bg="#FFFFFF"
            onClick={loadRefundRequests}
            isLoading={refundsLoading}
          >
            Refresh
          </Button>
        </Flex>
        {refundsLoading ? (
          <Flex py="34px" justify="center">
            <Spinner />
          </Flex>
        ) : refundRequests.length ? (
          <Stack spacing="0">
            {refundRequests.map((request) => (
              <Flex
                key={request.id}
                px="22px"
                py="16px"
                borderTop="1px solid"
                borderColor={adminUi.border}
                align="center"
                justify="space-between"
                gap="14px"
                wrap="wrap"
              >
                <Box minW="240px" flex="1">
                  <HStack spacing="9px" align="center" wrap="wrap">
                    <Text fontSize="15px" fontWeight="800" color={adminUi.text}>
                      {request.orderNumber || request.orderId}
                    </Text>
                    <SoftBadge bg="#FFF1DB" color="#B45309">
                      Rs {Number(request.amount || 0).toFixed(2)}
                    </SoftBadge>
                    <SoftBadge bg="#DDFBEC" color="#00945F">
                      Pending
                    </SoftBadge>
                  </HStack>
                  <Text fontSize="13px" color={adminUi.muted} mt="5px">
                    {request.customerName || request.customerPhone || request.userId}
                    {request.awbNumber ? ` - AWB ${request.awbNumber}` : ""}
                    {request.courierPartner ? ` - ${request.courierPartner}` : ""}
                  </Text>
                  <Text fontSize="12px" color={adminUi.muted} mt="3px">
                    {request.createdAt
                      ? new Date(request.createdAt).toLocaleString()
                      : "Pending review"}
                  </Text>
                </Box>
                <HStack spacing="10px">
                  <Button
                    h="34px"
                    fontSize="13px"
                    colorScheme="green"
                    onClick={() => handleRefundAction(request, "approve")}
                    isLoading={refundActionId === `approve-${request.id}`}
                  >
                    Approve
                  </Button>
                  <Button
                    h="34px"
                    fontSize="13px"
                    variant="outline"
                    borderColor="#FCA5A5"
                    color="#B91C1C"
                    onClick={() => handleRefundAction(request, "decline")}
                    isLoading={refundActionId === `decline-${request.id}`}
                  >
                    Decline
                  </Button>
                </HStack>
              </Flex>
            ))}
          </Stack>
        ) : (
          <Text px="22px" py="24px" color={adminUi.muted} fontSize="14px">
            No pending refund approvals.
          </Text>
        )}
      </AdminCard>

      <AdminCard overflow="hidden">
        {isLoading ? (
          <Flex py="50px" justify="center">
            <Spinner />
          </Flex>
        ) : (
          <Stack spacing="0">
            {rows.map((notification) => {
              const isUnread = !notification.isRead;
              return (
                <Flex
                  key={notification.id}
                  minH="74px"
                  px="22px"
                  py="15px"
                  borderTop={notification === rows[0] ? "0" : "1px solid"}
                  borderColor={adminUi.border}
                  align="flex-start"
                  gap="13px"
                  cursor={isUnread ? "pointer" : "default"}
                  onClick={() =>
                    handleRead(notification.id, notification.isRead)
                  }
                >
                  <Box
                    w="8px"
                    h="8px"
                    borderRadius="full"
                    bg={isUnread ? "#FF7417" : "transparent"}
                    mt="12px"
                  />
                  <Box flex="1" minW={0}>
                    <HStack spacing="9px" align="center">
                      <SoftBadge
                        colorScheme="green"
                        bg="#DDFBEC"
                        color="#00945F"
                      >
                        {notification.category ||
                          notification.type ||
                          "ACCOUNT"}
                      </SoftBadge>
                      <Text
                        fontSize="15px"
                        fontWeight="800"
                        color={adminUi.text}
                      >
                        {notification.title}
                      </Text>
                    </HStack>
                    <Text
                      fontSize="13px"
                      color={adminUi.muted}
                      mt="5px"
                      noOfLines={1}
                    >
                      {notification.message}
                    </Text>
                  </Box>
                  <Text fontSize="13px" color={adminUi.muted} flexShrink={0}>
                    {notification.time ||
                      (notification.createdAt
                        ? new Date(notification.createdAt).toLocaleString()
                        : "Unknown time")}
                  </Text>
                </Flex>
              );
            })}
          </Stack>
        )}
      </AdminCard>
    </AdminStack>
  );
}

export default function AdminNotificationsPage() {
  const location = useLocation();
  return location.pathname.includes("/notifications/settings") ? (
    <NotificationSettingsPage />
  ) : (
    <NotificationsListPage />
  );
}
