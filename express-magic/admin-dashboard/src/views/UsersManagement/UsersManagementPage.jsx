import {
  Avatar,
  Box,
  Button,
  Flex,
  HStack,
  Icon,
  IconButton,
  Stack,
  Switch,
  Text,
  useToast,
} from "@chakra-ui/react";
import {
  IconClock,
  IconEye,
  IconMail,
  IconPhone,
  IconShieldCheck,
  IconShieldX,
  IconUsers,
  IconUserX,
  IconWaveSine,
} from "@tabler/icons-react";
import {
  AdminSelect,
  AdminStack,
  DataTable,
  Metric,
  PageIntro,
  SearchInput,
  SoftBadge,
  ToolbarCard,
} from "components/AdminUI/AdminPage";
import {
  useCompleteMerchantReadiness,
  useUpdateUserApproval,
  useUsersWithRoleUser,
} from "hooks/useUsers";
import { usePlans } from "hooks/usePlans";
import { useMemo, useState } from "react";
import { useHistory } from "react-router-dom/cjs/react-router-dom.min";

const getInitials = (name = "") =>
  name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "SA";

const toDate = (value) => {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const lastLogin = (value) => {
  if (!value) return "—";
  const diff = Date.now() - new Date(value).getTime();
  const hours = Math.max(1, Math.round(diff / 36e5));
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
};

const kycLabel = (row) => {
  const status = row.kycStatus || row.domesticKyc?.status;
  if (row.kycVerified || row.kyc_verified || status === "verified") return "KYC Verified";
  if (status === "verification_in_progress") return "KYC Pending";
  if (status === "rejected") return "KYC Rejected";
  return "KYC Not Started";
};

const kycColor = (row) => {
  const label = kycLabel(row);
  if (label === "KYC Verified") return "green";
  if (label === "KYC Pending") return "orange";
  if (label === "KYC Rejected") return "red";
  return "gray";
};

const isOrdersEnabled = (row) => {
  const status = row.kycStatus || row.domesticKyc?.status;
  return (
    row.approved !== false &&
    (row.onboardingComplete || row.onboarding_complete) &&
    (row.kycVerified || row.kyc_verified || status === "verified")
  );
};

const getCompanyAddress = (companyInfo = {}) =>
  companyInfo.companyAddress ||
  [companyInfo.city, companyInfo.state, companyInfo.pincode].filter(Boolean).join(", ");

const buildReadinessPayload = (row) => {
  const companyInfo = row.companyInfo || {};
  const address = getCompanyAddress(companyInfo);
  const nickname =
    companyInfo.businessName ||
    companyInfo.brandName ||
    companyInfo.contactPerson ||
    row.email ||
    "Default Warehouse";

  return {
    companyAddress: address || undefined,
    pickup: {
      addressLine1: address || undefined,
      addressNickname: nickname,
    },
  };
};

export default function UsersManagementPage() {
  const history = useHistory();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [plan, setPlan] = useState("");
  const [kycStatus, setKycStatus] = useState("");
  const [onboardingComplete, setOnboardingComplete] = useState(undefined);
  const [enablingUserId, setEnablingUserId] = useState(null);
  const updateUserApprovalMutation = useUpdateUserApproval();
  const completeReadinessMutation = useCompleteMerchantReadiness();
  const { data: availablePlans = [] } = usePlans();

  const { data: usersResponse, isLoading } = useUsersWithRoleUser({
    page,
    perPage,
    sortBy: "createdAt",
    sortOrder: "desc",
    search,
    approved:
      status === "active" ? true : status === "inactive" ? false : undefined,
    plan: plan || undefined,
    kycStatus: kycStatus || undefined,
    onboardingComplete,
  });

  const users = usersResponse?.data ?? [];
  const totalCount = usersResponse?.totalCount ?? users.length;

  const summary = useMemo(() => {
    const onboarded = users.filter(
      (user) => user.onboardingComplete || user.onboarding_complete
    ).length;
    const verified = users.filter(
      (user) =>
        user.kycVerified || user.kyc_verified || user.kycStatus === "verified"
    ).length;
    const inactive = users.filter(
      (user) => user.approved === false || user.isActive === false
    ).length;
    return {
      total: totalCount,
      verified,
      pending: users.filter((user) =>
        ["pending", "verification_in_progress"].includes(user.kycStatus)
      ).length,
      onboarded,
      active: Math.max(0, totalCount - inactive),
      inactive,
    };
  }, [totalCount, users]);

  const handleView = (id) => {
    history.push(`/admin/users-management/${id}/overview`);
  };

  const handleApprovalChange = async (id, approved) => {
    try {
      await updateUserApprovalMutation.mutateAsync({ userId: id, approved });
      toast({
        status: "success",
        title: approved ? "Seller activated" : "Seller deactivated",
      });
    } catch (error) {
      toast({
        status: "error",
        title: "Action failed",
        description: error.response?.data?.message || "Please try again.",
      });
    }
  };

  const handleEnableOrders = async (row) => {
    const name = row.contactPerson || row.companyName || row.email || "this seller";
    const confirmed = window.confirm(
      `Enable KYC and order booking for ${name}? This will approve the account and prepare pickup, plan, and wallet readiness.`,
    );

    if (!confirmed) return;

    try {
      setEnablingUserId(row.id);
      await completeReadinessMutation.mutateAsync({
        userId: row.id,
        payload: buildReadinessPayload(row),
      });
      toast({
        status: "success",
        title: "Orders enabled",
        description: "Seller can now create bookings when profile data is complete.",
      });
    } catch (error) {
      toast({
        status: "error",
        title: "Could not enable orders",
        description:
          error.response?.data?.message ||
          "Please complete seller address, city, state, pincode, email, and phone first.",
      });
    } finally {
      setEnablingUserId(null);
    }
  };

  const handleDisableOrders = async (row) => {
    const name = row.contactPerson || row.companyName || row.email || "this seller";
    const confirmed = window.confirm(
      `Disable order booking for ${name}? The seller account will move to Pending and order creation will be locked.`,
    );

    if (!confirmed) return;

    try {
      setEnablingUserId(row.id);
      await updateUserApprovalMutation.mutateAsync({ userId: row.id, approved: false });
      toast({
        status: "success",
        title: "Orders disabled",
        description: "Seller order booking is now locked.",
      });
    } catch (error) {
      toast({
        status: "error",
        title: "Could not disable orders",
        description: error.response?.data?.message || "Please try again.",
      });
    } finally {
      setEnablingUserId(null);
    }
  };

  return (
    <AdminStack>
      <PageIntro
        icon={IconUsers}
        title="Users"
        subtitle="Manage all registered users"
        right={
          <HStack spacing="26px" wrap="wrap">
            <Metric icon={IconUsers} value={summary.total} label="total" />
            <Metric
              icon={IconShieldCheck}
              value={summary.verified}
              label="KYC verified"
              color="#00A881"
            />
            <Metric
              icon={IconShieldX}
              value={summary.pending}
              label="KYC pending"
              color="#FF7A1A"
            />
            <Metric
              icon={IconWaveSine}
              value={summary.onboarded}
              label="onboarded"
              color="#2F80ED"
            />
            <Metric
              icon={IconWaveSine}
              value={summary.active}
              label="active"
              color="#FF7A1A"
            />
            <Metric
              icon={IconUserX}
              value={summary.inactive}
              label="inactive"
              color="#FF4D4F"
            />
          </HStack>
        }
      />

      <ToolbarCard>
        <Flex align="end" gap="14px" wrap="wrap">
          <Box>
            <Text fontSize="14px" color="#41557A" mb="7px">
              Search
            </Text>
            <SearchInput
              value={search}
              onChange={(value) => {
                setSearch(value);
                setPage(1);
              }}
              placeholder="Name, email, phone..."
              maxW="300px"
            />
          </Box>
          <Box>
            <Text fontSize="14px" color="#41557A" mb="7px">
              Status
            </Text>
            <AdminSelect
              value={status}
              onChange={(value) => {
                setStatus(value);
                setPage(1);
              }}
              placeholder="All statuses"
            >
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </AdminSelect>
          </Box>
          <Box>
            <Text fontSize="14px" color="#41557A" mb="7px">
              Plan
            </Text>
            <AdminSelect
              value={plan}
              onChange={(value) => {
                setPlan(value);
                setPage(1);
              }}
              placeholder="All Plans"
            >
              <option value="">All Plans</option>
              {availablePlans
                .filter((availablePlan) => availablePlan.is_active !== false)
                .map((availablePlan) => (
                  <option key={availablePlan.id} value={availablePlan.name}>
                    {availablePlan.name}
                  </option>
                ))}
            </AdminSelect>
          </Box>
          <Button variant="ghost" color="#6C5CE7" mt={{ base: 0, md: "27px" }}>
            More filters
          </Button>
          <Text ml="auto" color="#607397" fontSize="15px" alignSelf="center">
            {totalCount} results
          </Text>
        </Flex>
      </ToolbarCard>

      <HStack
        spacing="38px"
        borderBottom="1px solid #E5EAF3"
        px="20px"
        overflowX="auto"
      >
        {[
          ["All Users", summary.total, !kycStatus && onboardingComplete === undefined && !status, () => { setKycStatus(""); setOnboardingComplete(undefined); setStatus(""); }],
          ["Verified", summary.verified, kycStatus === "verified", () => { setKycStatus("verified"); setOnboardingComplete(undefined); setStatus(""); }],
          ["Pending KYC", summary.pending, kycStatus === "verification_in_progress", () => { setKycStatus("verification_in_progress"); setOnboardingComplete(undefined); setStatus(""); }],
          [
            "KYC Not Started",
            Math.max(0, summary.total - summary.verified - summary.pending),
            kycStatus === "pending",
            () => { setKycStatus("pending"); setOnboardingComplete(undefined); setStatus(""); },
          ],
          ["Not Onboarded", Math.max(0, summary.total - summary.onboarded), onboardingComplete === false, () => { setOnboardingComplete(false); setKycStatus(""); setStatus(""); }],
          ["Inactive", summary.inactive, status === "inactive", () => { setStatus("inactive"); setKycStatus(""); setOnboardingComplete(undefined); }],
        ].map(([label, count, active, onClick]) => (
          <HStack
            key={label}
            pb="15px"
            borderBottom={
              active ? "2px solid #6C5CE7" : "2px solid transparent"
            }
            color={active ? "#6C5CE7" : "#586B8A"}
            flexShrink={0}
            cursor="pointer"
            onClick={() => { onClick(); setPage(1); }}
          >
            <Text fontSize="18px">{label}</Text>
            <SoftBadge colorScheme={active ? "purple" : "gray"}>
              {count}
            </SoftBadge>
          </HStack>
        ))}
      </HStack>

      <DataTable
        loading={isLoading}
        rows={users}
        columns={[
          {
            key: "contactPerson",
            label: "User",
            w: "18%",
            render: (value, row) => {
              const name =
                value ||
                row.name ||
                row.companyInfo?.contactPerson ||
                row.email ||
                "User";
              const business =
                row.companyInfo?.brandName ||
                row.companyInfo?.businessName ||
                row.businessName;
              return (
                <HStack spacing="8px" minW={0} align="flex-start">
                  <Avatar
                    name={getInitials(name)}
                    size="sm"
                    bg="#F0EDFF"
                    color="#6C5CE7"
                  />
                  <Box minW={0}>
                    <Text fontWeight="600" lineHeight="1.3">{name}</Text>
                    {business ? (
                      <Text fontSize="15px" color="#607397">
                        {business}
                      </Text>
                    ) : null}
                  </Box>
                </HStack>
              );
            },
          },
          {
            key: "email",
            label: "Email",
            w: "17%",
            render: (value) => (
              <HStack color="#23324D" spacing="6px" minW={0} align="flex-start">
                <Icon as={IconMail} boxSize="17px" color="#607397" />
                <Text fontSize="13px" lineHeight="1.35" overflowWrap="anywhere">
                  {value || "—"}
                </Text>
              </HStack>
            ),
          },
          {
            key: "contactNumber",
            label: "Phone",
            w: "11%",
            render: (value) =>
              value ? (
                <HStack>
                  <Icon as={IconPhone} boxSize="17px" color="#607397" />
                  <Text>{value}</Text>
                </HStack>
              ) : (
                "—"
              ),
          },
          {
            key: "approved",
            label: "Status",
            w: "13%",
            render: (value, row) => (
              <Stack spacing="5px" align="flex-start">
                <SoftBadge
                  colorScheme={
                    row.onboardingComplete || row.onboarding_complete
                      ? "green"
                      : "orange"
                  }
                >
                  {row.onboardingComplete || row.onboarding_complete
                    ? "Onboarded"
                    : "Not Onboarded"}
                </SoftBadge>
                <SoftBadge
                  colorScheme={kycColor(row)}
                >
                  {kycLabel(row)}
                </SoftBadge>
                <SoftBadge colorScheme={isOrdersEnabled(row) ? "green" : "orange"}>
                  {isOrdersEnabled(row) ? "Orders Enabled" : "Orders Locked"}
                </SoftBadge>
              </Stack>
            ),
          },
          {
            key: "plan",
            label: "Plan",
            w: "7%",
            render: (value, row) => (
              <SoftBadge colorScheme="gray">
                {value?.name || row.planName || "Basic"}
              </SoftBadge>
            ),
          },
          {
            key: "lastLogin",
            label: "Last Login",
            w: "10%",
            render: (value, row) => (
              <HStack>
                <Icon as={IconClock} boxSize="16px" color="#607397" />
                <Text>
                  {lastLogin(value || row.last_login_at || row.updatedAt)}
                </Text>
              </HStack>
            ),
          },
          {
            key: "createdAt",
            label: "Joined",
            w: "9%",
            render: (value) => toDate(value),
          },
        ]}
        actions={(row) => {
          const ordersEnabled = isOrdersEnabled(row);
          const accountApproved = row.approved !== false;
          const actionPending =
            enablingUserId === row.id &&
            (completeReadinessMutation.isPending || updateUserApprovalMutation.isPending);

          return (
            <HStack justify="flex-end" spacing="4px" flexWrap="wrap">
              <IconButton
                aria-label="View seller"
                icon={<IconEye size={18} />}
                size="sm"
                variant="ghost"
                color="#607397"
                onClick={() => handleView(row.id)}
              />
              <Button
                size="xs"
                leftIcon={ordersEnabled ? <IconShieldX size={14} /> : <IconShieldCheck size={14} />}
                colorScheme={ordersEnabled ? "red" : "purple"}
                variant={ordersEnabled ? "outline" : "solid"}
                isLoading={actionPending}
                isDisabled={
                  (completeReadinessMutation.isPending || updateUserApprovalMutation.isPending) &&
                  enablingUserId !== row.id
                }
                onClick={() => (ordersEnabled ? handleDisableOrders(row) : handleEnableOrders(row))}
              >
                {ordersEnabled ? "Disable Orders" : "Enable Orders"}
              </Button>
              <Switch
                colorScheme="purple"
                isChecked={accountApproved}
                isDisabled={updateUserApprovalMutation.isPending}
                onChange={(event) => handleApprovalChange(row.id, event.target.checked)}
              />
              <Text textAlign="left" fontSize="11px" fontWeight="700" color={accountApproved ? "#009E72" : "#D97706"}>
                {accountApproved ? "Approved" : "Pending"}
              </Text>
            </HStack>
          );
        }}
        actionsLabel="KYC / Orders"
        actionsW="22%"
        fitColumns
        footer={
          <>
            <Text color="#607397" fontSize="16px">
              Page {page}
            </Text>
            <Button
              size="sm"
              variant="outline"
              isDisabled={page <= 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              isDisabled={users.length < perPage}
              onClick={() => setPage((value) => value + 1)}
            >
              Next
            </Button>
            <AdminSelect
              value={perPage}
              onChange={(value) => setPerPage(Number(value))}
              maxW="135px"
            >
              <option value={10}>10 / page</option>
              <option value={20}>20 / page</option>
              <option value={50}>50 / page</option>
            </AdminSelect>
          </>
        }
        minW="100%"
      />
    </AdminStack>
  );
}
