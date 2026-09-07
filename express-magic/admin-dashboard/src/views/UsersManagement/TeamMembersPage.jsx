import {
  Avatar,
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  HStack,
  Input,
  InputGroup,
  InputRightElement,
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
  IconMail,
  IconPhone,
  IconPlus,
  IconRefresh,
  IconShieldCheck,
  IconUserCog,
  IconUsers,
} from "@tabler/icons-react";
import {
  AdminCard,
  AdminSelect,
  AdminStack,
  Metric,
  PageIntro,
  PrimaryButton,
  SearchInput,
  SoftBadge,
  ToolbarCard,
} from "components/AdminUI/AdminPage";
import { SellerAutocomplete } from "components/Input/SellerAutocomplete";
import { useCreateTeamMemberMutation, useUserTeamMembers } from "hooks/useUsers";
import { useMemo, useState } from "react";

const roleOptions = [
  { label: "Employee", value: "employee" },
  { label: "Manager", value: "manager" },
  { label: "Support", value: "support" },
  { label: "Operations", value: "operations" },
];

const emptyForm = {
  sellerId: "",
  name: "",
  email: "",
  phone: "",
  password: "",
  role: "employee",
};

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getInitials = (member) =>
  String(member?.name || member?.email || "TM")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "TM";

export default function TeamMembersPage() {
  const toast = useToast();
  const createMemberModal = useDisclosure();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [selectedSellerId, setSelectedSellerId] = useState("");
  const [formState, setFormState] = useState(emptyForm);
  const [showPassword, setShowPassword] = useState(false);

  const filters = useMemo(() => ({ search, status }), [search, status]);
  const { data, isLoading, isFetching, refetch } = useUserTeamMembers(
    selectedSellerId,
    1,
    50,
    filters,
  );
  const createMemberMutation = useCreateTeamMemberMutation();
  const members = data?.members || [];
  const totalCount = data?.totalCount || 0;
  const activeCount = members.filter((member) => member.isActive !== false).length;

  const updateForm = (key, value) => {
    setFormState((current) => ({ ...current, [key]: value }));
  };

  const resetForm = () => {
    setFormState({ ...emptyForm, sellerId: selectedSellerId || "" });
    setShowPassword(false);
  };

  const openCreateModal = () => {
    resetForm();
    createMemberModal.onOpen();
  };

  const closeCreateModal = () => {
    resetForm();
    createMemberModal.onClose();
  };

  const handleCreateMember = async () => {
    const sellerId = formState.sellerId || selectedSellerId;
    if (!sellerId) {
      toast({
        title: "Select seller",
        description: "Choose the seller account before adding a team member.",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (!formState.name.trim() || !formState.email.trim()) {
      toast({
        title: "Missing information",
        description: "Name and email are required.",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (!formState.password || formState.password.trim().length < 6) {
      toast({
        title: "Invalid password",
        description: "Password must be at least 6 characters long.",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      await createMemberMutation.mutateAsync({
        userId: sellerId,
        payload: {
          name: formState.name.trim(),
          email: formState.email.trim(),
          phone: formState.phone.trim(),
          password: formState.password,
          role: formState.role,
          moduleAccess: {},
        },
      });
      const shouldRefetchCurrentSeller = sellerId === selectedSellerId;
      setSelectedSellerId(sellerId);
      toast({
        title: "Team member added",
        description: `${formState.name.trim()} has been created successfully.`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      closeCreateModal();
      if (shouldRefetchCurrentSeller) {
        refetch();
      }
    } catch (error) {
      toast({
        title: "Creation failed",
        description:
          error.response?.data?.message || error.message || "Failed to create team member.",
        status: "error",
        duration: 4000,
        isClosable: true,
      });
    }
  };

  return (
    <AdminStack>
      <PageIntro
        icon={IconUserCog}
        title="Team Members"
        subtitle="Create staff accounts, assign sellers, and decide what each person can do."
        right={
          <HStack spacing="26px" wrap="wrap">
            <Metric icon={IconUsers} value={selectedSellerId ? totalCount : 0} label="total" />
            <Metric
              icon={IconShieldCheck}
              value={selectedSellerId ? activeCount : 0}
              label="active"
              color="#00A881"
            />
            <PrimaryButton leftIcon={<IconPlus size={18} />} onClick={openCreateModal}>
              Add team member
            </PrimaryButton>
          </HStack>
        }
      />

      <ToolbarCard>
        <Stack spacing="12px">
          <Box maxW="560px">
            <SellerAutocomplete
              value={selectedSellerId}
              onChange={setSelectedSellerId}
              placeholder="Search seller to manage team members"
              isRequired
            />
          </Box>
          <Flex gap="10px" wrap="wrap">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search by name, email, phone, designation"
              maxW="560px"
            />
            <AdminSelect value={status} onChange={setStatus} maxW="200px">
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </AdminSelect>
            <Button
              leftIcon={<IconRefresh size={16} />}
              h="36px"
              variant="outline"
              onClick={() => refetch()}
              isLoading={isFetching}
              isDisabled={!selectedSellerId}
            >
              Refresh
            </Button>
          </Flex>
        </Stack>
      </ToolbarCard>

      {!selectedSellerId ? (
        <AdminCard p="30px" maxW="1035px">
          <Text color="#607397" fontSize="15px">
            Select a seller above to view or add team members.
          </Text>
        </AdminCard>
      ) : isLoading || isFetching ? (
        <AdminCard p="30px" maxW="1035px">
          <Text color="#607397" fontSize="15px">
            Loading team members...
          </Text>
        </AdminCard>
      ) : members.length === 0 ? (
        <AdminCard p="30px" maxW="1035px">
          <Text color="#607397" fontSize="15px">
            No team members found for this seller.
          </Text>
        </AdminCard>
      ) : (
        <SimpleGrid columns={{ base: 1, xl: 2 }} spacing="20px" maxW="1035px">
          {members.map((member) => (
            <AdminCard key={member.id} p="25px">
              <HStack align="flex-start" spacing="18px">
                <Avatar
                  name={getInitials(member)}
                  size="lg"
                  bg="linear-gradient(135deg, #7259E8 0%, #F47A39 100%)"
                  color="#FFFFFF"
                  fontWeight="800"
                />
                <Box flex="1" minW={0}>
                  <HStack spacing="14px" mb="5px" align="center">
                    <Text fontSize="18px" fontWeight="800" noOfLines={1}>
                      {member.name || member.email}
                    </Text>
                    <SoftBadge colorScheme={member.isActive === false ? "red" : "green"}>
                      {member.isActive === false ? "Inactive" : "Active"}
                    </SoftBadge>
                  </HStack>
                  <Text color="#607397" fontSize="15px" textTransform="capitalize">
                    {member.role || "employee"}
                  </Text>
                </Box>
              </HStack>

              <Stack spacing="9px" mt="25px" color="#607397" fontSize="15px">
                <HStack minW={0}>
                  <IconMail size={16} />
                  <Text noOfLines={1}>{member.email || "-"}</Text>
                </HStack>
                <HStack minW={0}>
                  <IconPhone size={16} />
                  <Text>{member.phone || "-"}</Text>
                </HStack>
              </Stack>

              <SimpleGrid columns={2} spacing="14px" mt="22px">
                <AdminCard p="14px 16px" borderRadius="16px" bg="#FAFBFE">
                  <Text color="#607397" fontSize="13px">
                    Modules
                  </Text>
                  <Text fontSize="22px" fontWeight="800">
                    {
                      Object.keys(member.moduleAccess || {}).filter(
                        (key) => member.moduleAccess[key],
                      ).length
                    }
                  </Text>
                </AdminCard>
                <AdminCard p="14px 16px" borderRadius="16px" bg="#FAFBFE">
                  <Text color="#607397" fontSize="13px">
                    Permissions
                  </Text>
                  <Text fontSize="22px" fontWeight="800">
                    {Object.keys(member.moduleAccess || {}).length}
                  </Text>
                </AdminCard>
              </SimpleGrid>

              <Flex
                mt="16px"
                pt="13px"
                borderTop="1px solid #E5EAF3"
                justify="space-between"
                color="#607397"
                fontSize="13px"
              >
                <Text>Team member</Text>
                <Text>Last active {formatDate(member.updatedAt || member.createdAt)}</Text>
              </Flex>
            </AdminCard>
          ))}
        </SimpleGrid>
      )}

      <Modal isOpen={createMemberModal.isOpen} onClose={closeCreateModal} size="lg" isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Add Team Member</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Stack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Seller</FormLabel>
                <SellerAutocomplete
                  value={formState.sellerId || selectedSellerId}
                  onChange={(value) => updateForm("sellerId", value)}
                  placeholder="Search seller account"
                  isRequired
                />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Name</FormLabel>
                <Input
                  placeholder="Full name"
                  value={formState.name}
                  onChange={(event) => updateForm("name", event.target.value)}
                />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Email</FormLabel>
                <Input
                  type="email"
                  placeholder="email@example.com"
                  value={formState.email}
                  onChange={(event) => updateForm("email", event.target.value)}
                />
              </FormControl>
              <FormControl>
                <FormLabel>Phone</FormLabel>
                <Input
                  type="tel"
                  placeholder="Optional phone number"
                  value={formState.phone}
                  onChange={(event) => updateForm("phone", event.target.value)}
                />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Password</FormLabel>
                <InputGroup>
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Temporary password"
                    value={formState.password}
                    onChange={(event) => updateForm("password", event.target.value)}
                  />
                  <InputRightElement width="4.5rem">
                    <Button
                      h="1.75rem"
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowPassword((current) => !current)}
                    >
                      {showPassword ? "Hide" : "Show"}
                    </Button>
                  </InputRightElement>
                </InputGroup>
              </FormControl>
              <FormControl>
                <FormLabel>Role</FormLabel>
                <AdminSelect
                  value={formState.role}
                  onChange={(value) => updateForm("role", value)}
                  maxW="100%"
                >
                  {roleOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </AdminSelect>
              </FormControl>
            </Stack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={closeCreateModal}>
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              onClick={handleCreateMember}
              isLoading={createMemberMutation.isPending}
            >
              Create Member
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </AdminStack>
  );
}
