import {
  Box,
  Button,
  Checkbox,
  Flex,
  FormControl,
  FormLabel,
  HStack,
  IconButton,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  Stack,
  Switch,
  Text,
  useDisclosure,
  useToast,
} from "@chakra-ui/react";
import {
  IconCircleCheck,
  IconCircleX,
  IconGlobe,
  IconMapPin,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import {
  AdminCard,
  AdminSelect,
  AdminStack,
  DataTable,
  Metric,
  PageIntro,
  PrimaryButton,
  SearchInput,
  SoftBadge,
  adminUi,
} from "components/AdminUI/AdminPage";
import {
  useCreateLocation,
  useDeleteLocation,
  useLocations,
  useUpdateLocation,
} from "hooks/useLocations";
import { useMemo, useState } from "react";

function PaginationStrip({ page, limit, total, onPageChange, onLimitChange }) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const visiblePages = Array.from({ length: Math.min(totalPages, 5) }, (_, index) => index + 1);

  return (
    <Flex
      justify="flex-end"
      align="center"
      gap="18px"
      px="22px"
      py="12px"
      borderBottom="1px solid"
      borderColor={adminUi.border}
      bg="#FFFFFF"
    >
      <Text
        color={page <= 1 ? "#CBD5E1" : "#93A0BA"}
        fontSize="22px"
        cursor={page <= 1 ? "default" : "pointer"}
        onClick={() => page > 1 && onPageChange(page - 1)}
      >
        {'<'}
      </Text>
      {visiblePages.map((pageNumber) => (
        <Flex
          key={pageNumber}
          w="40px"
          h="40px"
          align="center"
          justify="center"
          borderRadius="9px"
          bg={pageNumber === page ? "#E8E2FF" : "transparent"}
          color={pageNumber === page ? adminUi.purple : adminUi.muted}
          fontSize="16px"
          fontWeight="700"
          cursor="pointer"
          onClick={() => onPageChange(pageNumber)}
        >
          {pageNumber}
        </Flex>
      ))}
      {totalPages > 5 ? (
        <Text color="#93A0BA" fontSize="22px">
          ...{totalPages}
        </Text>
      ) : null}
      <Text
        color={page >= totalPages ? "#CBD5E1" : "#93A0BA"}
        fontSize="22px"
        cursor={page >= totalPages ? "default" : "pointer"}
        onClick={() => page < totalPages && onPageChange(page + 1)}
      >
        {'>'}
      </Text>
      <Select
        maxW="154px"
        h="40px"
        borderColor="#D6DEE9"
        fontSize="17px"
        value={limit}
        onChange={(event) => onLimitChange(Number(event.target.value))}
      >
        <option value="100">100 / page</option>
        <option value="50">50 / page</option>
        <option value="20">20 / page</option>
      </Select>
    </Flex>
  );
}
function ServiceabilityLocations() {
  const [filters, setFilters] = useState({ search: "", state: "" });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(100);
  const [form, setForm] = useState({
    pincode: "",
    city: "",
    state: "",
    country: "India",
    active: true,
  });
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();
  const { data, isLoading } = useLocations({ page, limit, ...filters });
  const createLocation = useCreateLocation();
  const updateLocation = useUpdateLocation();
  const { mutate: deleteLocation } = useDeleteLocation();

  const rows = useMemo(() => {
    const source = data?.data || [];
    if (!source.length) return [];
    return source.map((location) => ({
      ...location,
      id: location.id || location.pincode,
      tags:
        Array.isArray(location.tags) && location.tags.length
          ? location.tags.join(", ")
          : "-",
      active: location.active !== false,
    }));
  }, [data]);

  const total = data?.total || 0;
  const activeCount = rows.filter((row) => row.active !== false).length;
  const inactiveCount = rows.filter((row) => row.active === false).length;

  const updateFilter = (key, value) => {
    setFilters((previous) => ({ ...previous, [key]: value }));
    setPage(1);
  };

  const handleStatusToggle = (row, active) => {
    updateLocation.mutate(
      { id: row.id, data: { active } },
      {
        onSuccess: () => toast({ title: "Location status updated", status: "success" }),
        onError: (error) =>
          toast({
            title: "Failed to update location",
            description: error?.response?.data?.message || error?.message,
            status: "error",
          }),
      }
    );
  };

  const handleCreateLocation = () => {
    if (!/^\d{6}$/.test(String(form.pincode).trim())) {
      return toast({ title: "Valid 6 digit pincode is required", status: "warning" });
    }
    if (!form.city.trim() || !form.state.trim()) {
      return toast({ title: "City and state are required", status: "warning" });
    }

    createLocation.mutate(
      {
        ...form,
        pincode: form.pincode.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        country: form.country.trim() || "India",
      },
      {
        onSuccess: () => {
          toast({ title: "Location added", status: "success" });
          setForm({ pincode: "", city: "", state: "", country: "India", active: true });
          onClose();
        },
        onError: (error) =>
          toast({
            title: "Failed to add location",
            description: error?.response?.data?.message || error?.message,
            status: "error",
          }),
      }
    );
  };

  const columns = [
    {
      key: "select",
      label: "",
      w: "54px",
      render: () => <Checkbox borderColor="#D6DEE9" />,
    },
    { key: "pincode", label: "Pincode" },
    { key: "city", label: "City" },
    { key: "state", label: "State" },
    { key: "tags", label: "Tags" },
    {
      key: "active",
      label: "Status",
      render: (value, row) => (
        <HStack spacing="10px">
          <Switch
            colorScheme="purple"
            isChecked={value !== false}
            isDisabled={updateLocation.isPending}
            onChange={(event) => handleStatusToggle(row, event.target.checked)}
          />
          <SoftBadge
            bg={value !== false ? "#DDFBEC" : "#FEE2E2"}
            color={value !== false ? "#00A36C" : "#B91C1C"}
          >
            {value !== false ? "Active" : "Inactive"}
          </SoftBadge>
        </HStack>
      ),
    },
  ];

  return (
    <AdminStack spacing="20px">
      <AdminCard p="0">
        <PageIntro
          icon={IconMapPin}
          title="Serviceability Locations"
          subtitle="Manage serviceable pincodes and zones"
          right={
            <HStack spacing="22px" wrap="wrap">
              <Metric
                icon={IconGlobe}
                value={total.toLocaleString("en-IN")}
                label="total"
                color={adminUi.purple}
              />
              <Metric
                icon={IconCircleCheck}
                value={activeCount.toLocaleString("en-IN")}
                label="active"
                color="#00B989"
              />
              <Metric
                icon={IconCircleX}
                value={inactiveCount.toLocaleString("en-IN")}
                label="inactive"
                color="#FF5A5F"
              />
            </HStack>
          }
          border="0"
          borderRadius="0"
        />
        <Flex
          px="26px"
          pb="20px"
          gap="14px"
          justify="space-between"
          align="flex-end"
          wrap="wrap"
        >
          <HStack spacing="14px" wrap="wrap">
            <Box>
              <Text fontSize="14px" color={adminUi.muted} mb="6px">
                Search
              </Text>
              <SearchInput
                value={filters.search}
                onChange={(value) =>
                  updateFilter("search", value)
                }
                placeholder="Pincode, city, state..."
                maxW="300px"
              />
            </Box>
            <Box>
              <Text fontSize="14px" color={adminUi.muted} mb="6px">
                State
              </Text>
              <AdminSelect
                value={filters.state}
                onChange={(value) =>
                  updateFilter("state", value)
                }
                maxW="213px"
              >
                <option value="">All states</option>
                <option value="ANDHRA PRADESH">ANDHRA PRADESH</option>
              </AdminSelect>
            </Box>
          </HStack>
          <HStack spacing="10px">
            <Text color={adminUi.muted} fontSize="16px" mr="4px">
              {total} results
            </Text>
            <PrimaryButton leftIcon={<IconPlus size={18} />} onClick={onOpen}>
              Add Location
            </PrimaryButton>
          </HStack>
        </Flex>
      </AdminCard>

      <AdminCard overflow="hidden">
        <PaginationStrip
          page={page}
          limit={limit}
          total={total}
          onPageChange={setPage}
          onLimitChange={(nextLimit) => {
            setLimit(nextLimit);
            setPage(1);
          }}
        />
        <DataTable
          columns={columns}
          rows={rows}
          loading={isLoading && !rows.length}
          rowKey="id"
          minW="1100px"
          actions={(row) => (
            <IconButton
              aria-label="Delete location"
              icon={<IconTrash size={18} />}
              size="sm"
              variant="ghost"
              color="#607397"
              onClick={() =>
                deleteLocation(row.id, {
                  onSuccess: () => toast({ title: "Location deleted", status: "success" }),
                  onError: () => toast({ title: "Failed to delete location", status: "error" }),
                })
              }
            />
          )}
        />
      </AdminCard>

      <Modal isOpen={isOpen} onClose={onClose} isCentered>
        <ModalOverlay bg="blackAlpha.500" backdropFilter="blur(6px)" />
        <ModalContent borderRadius="16px">
          <ModalHeader>Add Location</ModalHeader>
          <ModalBody>
            <Stack spacing={4}>
              <FormControl>
                <FormLabel>Pincode</FormLabel>
                <Input
                  value={form.pincode}
                  onChange={(event) =>
                    setForm((previous) => ({ ...previous, pincode: event.target.value }))
                  }
                  placeholder="110001"
                  maxLength={6}
                />
              </FormControl>
              <FormControl>
                <FormLabel>City</FormLabel>
                <Input
                  value={form.city}
                  onChange={(event) =>
                    setForm((previous) => ({ ...previous, city: event.target.value }))
                  }
                  placeholder="New Delhi"
                />
              </FormControl>
              <FormControl>
                <FormLabel>State</FormLabel>
                <Input
                  value={form.state}
                  onChange={(event) =>
                    setForm((previous) => ({ ...previous, state: event.target.value }))
                  }
                  placeholder="DELHI"
                />
              </FormControl>
              <FormControl>
                <FormLabel>Country</FormLabel>
                <Input
                  value={form.country}
                  onChange={(event) =>
                    setForm((previous) => ({ ...previous, country: event.target.value }))
                  }
                  placeholder="India"
                />
              </FormControl>
              <HStack justify="space-between">
                <Text fontWeight="700" color={adminUi.text}>
                  Active
                </Text>
                <Switch
                  colorScheme="purple"
                  isChecked={form.active}
                  onChange={(event) =>
                    setForm((previous) => ({ ...previous, active: event.target.checked }))
                  }
                />
              </HStack>
            </Stack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button
              colorScheme="purple"
              onClick={handleCreateLocation}
              isLoading={createLocation.isPending}
            >
              Save Location
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </AdminStack>
  );
}

const ServiceabilityPage = () => <ServiceabilityLocations />;

export default ServiceabilityPage;
