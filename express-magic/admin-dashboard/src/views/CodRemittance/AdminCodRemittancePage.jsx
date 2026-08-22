import {
  Box,
  Button,
  Collapse,
  FormControl,
  FormLabel,
  HStack,
  IconButton,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  SimpleGrid,
  Stack,
  Text,
  useDisclosure,
  useToast,
} from "@chakra-ui/react";
import {
  IconBolt,
  IconChevronLeft,
  IconChevronRight,
  IconClock,
  IconDownload,
  IconFile,
  IconRefresh,
  IconReceipt,
  IconUpload,
  IconUsers,
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
  useAllCodRemittances,
  useCodPlatformStats,
  useConfirmCourierSettlement,
  useManualCreditWallet,
  usePreviewCourierSettlement,
  useUpdateRemittanceNotes,
} from "hooks/useCodRemittance";
import { useMemo, useRef, useState } from "react";
import {
  downloadSettlementCsvTemplate,
  exportAllCodRemittances,
} from "services/codRemittance.service";
import { getCourierDisplayName } from "utils/courierDisplay";

const todayInput = () => new Date().toISOString().slice(0, 10);

const money = (value) =>
  `Rs ${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "-";

const extractError = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback;

export default function AdminCodRemittancePage() {
  const toast = useToast();
  const fileInputRef = useRef(null);
  const previewDisclosure = useDisclosure();
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [csvFileName, setCsvFileName] = useState("");
  const [csvPreview, setCsvPreview] = useState(null);
  const [settlementDate, setSettlementDate] = useState(todayInput());
  const [utrNumber, setUtrNumber] = useState("");
  const [filters, setFilters] = useState({
    search: "",
    status: "",
    fromDate: "",
    toDate: "",
    courierPartner: "",
  });

  const queryParams = useMemo(
    () => ({
      page,
      limit: perPage,
      ...filters,
      status: filters.status || undefined,
      fromDate: filters.fromDate || undefined,
      toDate: filters.toDate || undefined,
      courierPartner: filters.courierPartner || undefined,
    }),
    [filters, page, perPage],
  );

  const { data: stats, refetch: refetchStats } = useCodPlatformStats();
  const {
    data: remittanceData,
    isLoading,
    isFetching,
    refetch,
  } = useAllCodRemittances(queryParams);
  const manualCredit = useManualCreditWallet();
  const updateNotes = useUpdateRemittanceNotes();
  const previewSettlement = usePreviewCourierSettlement();
  const confirmSettlement = useConfirmCourierSettlement();

  const remittances = remittanceData?.data?.remittances || [];
  const totalCount = remittanceData?.data?.totalCount || remittances.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / perPage));
  const statData = stats?.data || {};
  const pendingVisible = remittances.filter((row) => row.status === "pending");
  const matchedCsvRows = csvPreview?.results?.matched || [];

  const setFilterValue = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const refreshAll = () => {
    refetch();
    refetchStats();
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      await exportAllCodRemittances(filters);
      toast({
        title: "Export downloaded",
        status: "success",
        duration: 2500,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: extractError(error, "Unable to export COD remittances."),
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      await downloadSettlementCsvTemplate();
      toast({
        title: "Template downloaded",
        status: "success",
        duration: 2500,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: "Template download failed",
        description: extractError(error, "Unable to download CSV template."),
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleCsvFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const courierPartner = filters.courierPartner || "delhivery";
    try {
      const csvData = await file.text();
      const response = await previewSettlement.mutateAsync({ courierPartner, csvData });
      setCsvFileName(file.name);
      setCsvPreview(response?.data || null);
      const firstUtr = response?.data?.results?.matched?.find((row) => row.utr)?.utr;
      setUtrNumber(firstUtr || "");
      previewDisclosure.onOpen();
    } catch (error) {
      toast({
        title: "CSV upload failed",
        description: extractError(error, "Unable to preview settlement CSV."),
        status: "error",
        duration: 6000,
        isClosable: true,
      });
    }
  };

  const handleConfirmCsvSettlement = async () => {
    if (!matchedCsvRows.length) {
      toast({
        title: "No matched rows",
        description: "Only matched pending remittances can be credited from CSV.",
        status: "warning",
        duration: 4000,
        isClosable: true,
      });
      return;
    }
    if (!utrNumber.trim()) {
      toast({
        title: "UTR required",
        description: "Enter UTR number before confirming settlement.",
        status: "warning",
        duration: 4000,
        isClosable: true,
      });
      return;
    }

    try {
      const response = await confirmSettlement.mutateAsync({
        remittances: matchedCsvRows,
        utrNumber: utrNumber.trim(),
        settlementDate,
        courierPartner: filters.courierPartner || "delhivery",
      });
      previewDisclosure.onClose();
      setCsvPreview(null);
      setCsvFileName("");
      refreshAll();
      toast({
        title: "CSV settlement credited",
        description: response?.message || `${matchedCsvRows.length} remittance(s) credited.`,
        status: "success",
        duration: 5000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: "Settlement failed",
        description: extractError(error, "Unable to confirm CSV settlement."),
        status: "error",
        duration: 6000,
        isClosable: true,
      });
    }
  };

  const settleRemittance = async (row) => {
    if (row.status !== "pending") return;
    const utr = window.prompt(
      `Enter UTR / settlement reference for ${row.orderNumber}`,
      `MANUAL-${Date.now()}`,
    );
    if (!utr) return;

    try {
      await manualCredit.mutateAsync({
        remittanceId: row.id,
        settledDate: todayInput(),
        utrNumber: utr,
        settledAmount: Number(row.remittableAmount || 0),
        notes: "Settlement marked from admin COD remittance page",
      });
      refreshAll();
    } catch (error) {
      toast({
        title: "Credit failed",
        description: extractError(error, "Unable to credit this remittance."),
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const autoCreditVisible = async () => {
    if (!pendingVisible.length) {
      toast({
        title: "No pending rows",
        description: "Current filters do not have pending COD remittances to credit.",
        status: "info",
        duration: 3500,
        isClosable: true,
      });
      return;
    }
    const ok = window.confirm(
      `Credit ${pendingVisible.length} visible pending COD remittance(s)?`,
    );
    if (!ok) return;

    let successCount = 0;
    let failedCount = 0;
    const batchRef = `AUTO-${Date.now()}`;
    for (const row of pendingVisible) {
      try {
        await manualCredit.mutateAsync({
          remittanceId: row.id,
          settledDate: todayInput(),
          utrNumber: `${batchRef}-${successCount + 1}`,
          settledAmount: Number(row.remittableAmount || 0),
          notes: "Auto-credit from admin COD remittance page",
        });
        successCount += 1;
      } catch (error) {
        failedCount += 1;
      }
    }
    refreshAll();
    toast({
      title: "Auto-credit complete",
      description: `${successCount} credited${failedCount ? `, ${failedCount} failed` : ""}.`,
      status: failedCount ? "warning" : "success",
      duration: 5000,
      isClosable: true,
    });
  };

  const handleUpdateNotes = async (row) => {
    const notes = window.prompt("Update COD remittance notes", row.notes || "");
    if (notes === null) return;
    await updateNotes.mutateAsync({ remittanceId: row.id, notes });
  };

  return (
    <AdminStack>
      <PageIntro
        icon={IconReceipt}
        title="COD Remittance"
        subtitle="Track and process COD settlements"
        right={
          <HStack spacing="28px" wrap="wrap">
            <Metric
              icon={IconClock}
              value={money(statData.totalPending?.amount)}
              label="pending"
              color="#FF7A1A"
            />
            <Metric
              icon={IconReceipt}
              value={money(statData.todayCredited?.amount)}
              label="today credited"
              color="#00A881"
            />
            <Metric
              icon={IconReceipt}
              value={money(statData.totalCredited?.amount)}
              label="total credited"
              color="#2F80ED"
            />
            <Metric
              icon={IconUsers}
              value={statData.usersWithPending || 0}
              label="users pending"
              color="#8B5CF6"
            />
          </HStack>
        }
      />

      <ToolbarCard>
        <Stack spacing="13px">
          <HStack spacing="14px" align="end" wrap="wrap">
            <Box>
              <Text color="#41557A" fontSize="14px" mb="7px">
                Search
              </Text>
              <SearchInput
                value={filters.search}
                onChange={(value) => setFilterValue("search", value)}
                placeholder="Order, AWB, or email..."
                maxW="325px"
              />
            </Box>
            <Box>
              <Text color="#41557A" fontSize="14px" mb="7px">
                Status
              </Text>
              <AdminSelect
                value={filters.status}
                onChange={(value) => setFilterValue("status", value)}
              >
                <option value="">All</option>
                <option value="pending">Pending</option>
                <option value="credited">Credited</option>
              </AdminSelect>
            </Box>
            <Button
              variant="ghost"
              color="#6C5CE7"
              mt="27px"
              onClick={() => setShowMoreFilters((open) => !open)}
            >
              {showMoreFilters ? "Hide filters" : "More filters"}
            </Button>
            <HStack ml={{ base: 0, xl: "auto" }} spacing="10px" mt="27px" wrap="wrap">
              <Input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                display="none"
                onChange={handleCsvFile}
              />
              <Button
                leftIcon={<IconUpload size={18} />}
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                isLoading={previewSettlement.isPending}
              >
                Upload CSV
              </Button>
              <Button
                leftIcon={<IconBolt size={18} />}
                variant="outline"
                onClick={autoCreditVisible}
                isLoading={manualCredit.isPending}
              >
                Auto-Credit
              </Button>
              <Button
                leftIcon={<IconDownload size={18} />}
                variant="outline"
                onClick={handleExport}
                isLoading={isExporting}
              >
                Export
              </Button>
              <Button
                leftIcon={<IconRefresh size={18} />}
                variant="ghost"
                onClick={refreshAll}
                isLoading={isFetching}
              >
                Refresh
              </Button>
            </HStack>
          </HStack>

          <Collapse in={showMoreFilters} animateOpacity>
            <SimpleGrid columns={{ base: 1, md: 4 }} spacing="12px">
              <FormControl>
                <FormLabel fontSize="13px" color="#41557A">
                  From Date
                </FormLabel>
                <Input
                  type="date"
                  h="36px"
                  value={filters.fromDate}
                  max={filters.toDate || undefined}
                  onChange={(event) => setFilterValue("fromDate", event.target.value)}
                />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="13px" color="#41557A">
                  To Date
                </FormLabel>
                <Input
                  type="date"
                  h="36px"
                  value={filters.toDate}
                  min={filters.fromDate || undefined}
                  onChange={(event) => setFilterValue("toDate", event.target.value)}
                />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="13px" color="#41557A">
                  Courier
                </FormLabel>
                <AdminSelect
                  value={filters.courierPartner}
                  onChange={(value) => setFilterValue("courierPartner", value)}
                  maxW="100%"
                >
                  <option value="">All couriers</option>
                  <option value="delhivery">Delhivery</option>
                  <option value="xpressbees">Xpressbees</option>
                  <option value="ekart">Ekart</option>
                  <option value="shadowfax">Shadowfax</option>
                </AdminSelect>
              </FormControl>
              <FormControl>
                <FormLabel fontSize="13px" color="#41557A">
                  CSV Template
                </FormLabel>
                <Button w="100%" h="36px" variant="outline" onClick={handleDownloadTemplate}>
                  Download Template
                </Button>
              </FormControl>
            </SimpleGrid>
          </Collapse>
        </Stack>
      </ToolbarCard>

      <DataTable
        loading={isLoading}
        rows={remittances}
        columns={[
          {
            key: "orderNumber",
            label: "Order",
            render: (value, row) => (
              <Box>
                <Text fontWeight="700">{value}</Text>
                <Text color="#607397" fontSize="15px" noOfLines={1}>
                  AWB: {row.awbNumber || "-"}
                </Text>
              </Box>
            ),
          },
          {
            key: "userEmail",
            label: "User",
            render: (value, row) => (
              <Box>
                <Text noOfLines={1}>{value}</Text>
                <Text color="#607397" fontSize="15px">
                  {row.userName || row.userId || "-"}
                </Text>
              </Box>
            ),
          },
          {
            key: "courierPartner",
            label: "Courier",
            render: (value) => (
              <SoftBadge colorScheme="gray">
                {getCourierDisplayName(value, "Manual")}
              </SoftBadge>
            ),
          },
          {
            key: "codAmount",
            label: "COD Amount",
            align: "right",
            render: money,
          },
          {
            key: "remittableAmount",
            label: "Remittable",
            align: "right",
            render: (value) => (
              <Text color="#009E72" fontWeight="800">
                {money(value)}
              </Text>
            ),
          },
          {
            key: "status",
            label: "Status",
            render: (value) => (
              <SoftBadge colorScheme={value === "pending" ? "orange" : "green"}>
                {value === "pending" ? "Pending" : "Credited"}
              </SoftBadge>
            ),
          },
          { key: "collectedAt", label: "Collected", render: formatDate },
          { key: "creditedAt", label: "Credited", render: formatDate },
        ]}
        actions={(row) => (
          <HStack spacing="6px" justify="flex-end">
            <Button
              size="sm"
              variant={row.status === "pending" ? "solid" : "outline"}
              colorScheme={row.status === "pending" ? "green" : "gray"}
              isDisabled={row.status !== "pending" || manualCredit.isPending}
              onClick={() => settleRemittance(row)}
            >
              {row.status === "pending" ? "Settle" : "Done"}
            </Button>
            <IconButton
              aria-label="Update notes"
              icon={<IconFile size={18} />}
              variant="ghost"
              size="sm"
              color="#607397"
              onClick={() => handleUpdateNotes(row)}
            />
          </HStack>
        )}
        footer={
          <HStack spacing="12px">
            <Text color="#607397">
              {totalCount
                ? `${Math.min((page - 1) * perPage + 1, totalCount)}-${Math.min(
                    page * perPage,
                    totalCount,
                  )} of ${totalCount}`
                : "0 of 0"}
            </Text>
            <AdminSelect
              value={String(perPage)}
              onChange={(value) => {
                setPerPage(Number(value));
                setPage(1);
              }}
              maxW="120px"
            >
              <option value="20">20 / page</option>
              <option value="50">50 / page</option>
              <option value="100">100 / page</option>
            </AdminSelect>
            <IconButton
              aria-label="Previous page"
              icon={<IconChevronLeft size={18} />}
              size="sm"
              variant="outline"
              isDisabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            />
            <Text fontSize="13px" color="#607397">
              {page} / {totalPages}
            </Text>
            <IconButton
              aria-label="Next page"
              icon={<IconChevronRight size={18} />}
              size="sm"
              variant="outline"
              isDisabled={page >= totalPages}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            />
          </HStack>
        }
        minW="1260px"
      />

      <Modal
        isOpen={previewDisclosure.isOpen}
        onClose={previewDisclosure.onClose}
        size="4xl"
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Review COD CSV Settlement</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Stack spacing="16px">
              <Text color="#607397">
                {csvFileName || "CSV file"} previewed. Only matched pending rows will be
                credited.
              </Text>
              <SimpleGrid columns={{ base: 1, md: 5 }} spacing="10px">
                {[
                  ["Total", csvPreview?.summary?.totalRecords || 0],
                  ["Matched", csvPreview?.summary?.matched || 0],
                  ["Discrepancies", csvPreview?.summary?.discrepancies || 0],
                  ["Not Found", csvPreview?.summary?.notFound || 0],
                  ["Already Credited", csvPreview?.summary?.alreadyCredited || 0],
                ].map(([label, value]) => (
                  <Box key={label} border="1px solid #E5EAF3" borderRadius="10px" p="12px">
                    <Text color="#607397" fontSize="12px">
                      {label}
                    </Text>
                    <Text fontWeight="800" fontSize="20px">
                      {value}
                    </Text>
                  </Box>
                ))}
              </SimpleGrid>
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing="12px">
                <FormControl isRequired>
                  <FormLabel>UTR Number</FormLabel>
                  <Input
                    value={utrNumber}
                    onChange={(event) => setUtrNumber(event.target.value)}
                    placeholder="Enter settlement UTR"
                  />
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>Settlement Date</FormLabel>
                  <Input
                    type="date"
                    value={settlementDate}
                    onChange={(event) => setSettlementDate(event.target.value)}
                  />
                </FormControl>
              </SimpleGrid>
            </Stack>
          </ModalBody>
          <ModalFooter>
            <HStack>
              <Button variant="ghost" onClick={previewDisclosure.onClose}>
                Cancel
              </Button>
              <Button
                colorScheme="green"
                onClick={handleConfirmCsvSettlement}
                isLoading={confirmSettlement.isPending}
              >
                Credit {matchedCsvRows.length} Matched
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </AdminStack>
  );
}
