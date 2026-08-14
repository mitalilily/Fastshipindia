import {
  Badge,
  Box,
  Button,
  Flex,
  HStack,
  Icon,
  Input,
  InputGroup,
  InputLeftElement,
  Select,
  Stack,
  Table,
  TableContainer,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useColorModeValue,
} from "@chakra-ui/react";
import { IconSearch } from "@tabler/icons-react";

export const adminUi = {
  pageTop: { base: "96px", md: "64px" },
  cardRadius: "16px",
  purple: "#6C5CE7",
  text: "#0F172A",
  muted: "#607397",
  border: "#E5EAF3",
  headerBg: "#F4F1FF",
};

export function AdminStack({ children, ...props }) {
  return (
    <Stack spacing="16px" pt={adminUi.pageTop} {...props}>
      {children}
    </Stack>
  );
}

export function AdminCard({ children, ...props }) {
  const bg = useColorModeValue("#FFFFFF", "#161B22");
  const border = useColorModeValue(adminUi.border, "#30363D");
  return (
    <Box
      bg={bg}
      border="1px solid"
      borderColor={border}
      borderRadius={adminUi.cardRadius}
      {...props}
    >
      {children}
    </Box>
  );
}

export function PageIntro({
  icon,
  title,
  subtitle,
  right,
  py = "22px",
  px = "22px",
}) {
  const titleColor = useColorModeValue(adminUi.text, "#E6EDF3");
  const mutedColor = useColorModeValue(adminUi.muted, "#8B949E");
  return (
    <AdminCard px={px} py={py}>
      <Flex justify="space-between" align="center" gap={4} wrap="wrap">
        <HStack spacing="13px" minW={0}>
          {icon ? (
            <Flex
              align="center"
              justify="center"
              w="40px"
              h="40px"
              borderRadius="14px"
              bg="#F0EDFF"
              color={adminUi.purple}
              flexShrink={0}
            >
              <Icon as={icon} boxSize="20px" strokeWidth={1.8} />
            </Flex>
          ) : null}
          <Box minW={0}>
            <Text
              fontSize="19px"
              fontWeight="800"
              color={titleColor}
              lineHeight="1.2"
              letterSpacing="0"
            >
              {title}
            </Text>
            {subtitle ? (
              <Text fontSize="13px" color={mutedColor} mt="3px" noOfLines={2}>
                {subtitle}
              </Text>
            ) : null}
          </Box>
        </HStack>
        {right ? <Box flexShrink={0}>{right}</Box> : null}
      </Flex>
    </AdminCard>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search...",
  maxW = "360px",
  ...props
}) {
  return (
    <InputGroup maxW={maxW} {...props}>
      <InputLeftElement pointerEvents="none" color="#6B7C98">
        <IconSearch size={18} />
      </InputLeftElement>
      <Input
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        placeholder={placeholder}
        h="36px"
        bg="#FFFFFF"
        borderColor="#D6DEE9"
        color={adminUi.text}
        fontSize="14px"
        fontWeight="500"
        _placeholder={{ color: "#A7B0BE" }}
      />
    </InputGroup>
  );
}

export function AdminSelect({
  value,
  onChange,
  children,
  maxW = "220px",
  ...props
}) {
  return (
    <Select
      value={value}
      onChange={(event) => onChange?.(event.target.value)}
      h="36px"
      maxW={maxW}
      bg="#FFFFFF"
      borderColor="#D6DEE9"
      fontSize="14px"
      fontWeight="500"
      {...props}
    >
      {children}
    </Select>
  );
}

export function ToolbarCard({ children, ...props }) {
  return (
    <AdminCard px="22px" py="13px" {...props}>
      {children}
    </AdminCard>
  );
}

export function Metric({ icon, value, label, color = adminUi.purple }) {
  return (
    <HStack spacing="8px" whiteSpace="nowrap">
      {icon ? (
        <Icon as={icon} boxSize="18px" color={color} strokeWidth={1.8} />
      ) : null}
      <Text fontSize="15px" fontWeight="800" color={adminUi.text}>
        {value}
      </Text>
      <Text fontSize="13px" color={adminUi.muted}>
        {label}
      </Text>
    </HStack>
  );
}

export function DataTable({
  columns,
  rows,
  loading,
  emptyText = "No records found",
  rowKey = "id",
  actions,
  actionsLabel = "Action",
  footer,
  minW = "900px",
  fitColumns = false,
  actionsW,
  onRowClick,
}) {
  return (
    <AdminCard overflow="hidden">
      <TableContainer overflowX={fitColumns ? "hidden" : "auto"}>
        <Table
          variant="simple"
          minW={fitColumns ? "100%" : minW}
          w="100%"
          tableLayout={fitColumns ? "fixed" : "auto"}
        >
          <Thead>
            <Tr>
              {columns.map((column) => (
                <Th
                  key={column.key}
                  bg={adminUi.headerBg}
                  color="#93A0BA"
                  fontSize="12px"
                  fontWeight="800"
                  letterSpacing="0"
                  textTransform="uppercase"
                  py="13px"
                  px={fitColumns ? { base: "8px", xl: "11px" } : "17px"}
                  borderColor={adminUi.border}
                  textAlign={column.align || "left"}
                  w={column.w}
                  whiteSpace={fitColumns ? "normal" : "nowrap"}
                >
                  {column.label}
                </Th>
              ))}
              {actions ? (
                <Th
                  bg={adminUi.headerBg}
                  color="#93A0BA"
                  fontSize="12px"
                  fontWeight="800"
                  letterSpacing="0"
                  textTransform="uppercase"
                  py="13px"
                  px={fitColumns ? { base: "8px", xl: "11px" } : "17px"}
                  borderColor={adminUi.border}
                  textAlign="right"
                  w={actionsW}
                  whiteSpace={fitColumns ? "normal" : "nowrap"}
                >
                  {actionsLabel}
                </Th>
              ) : null}
            </Tr>
          </Thead>
          <Tbody>
            {loading ? (
              <Tr>
                <Td
                  colSpan={columns.length + (actions ? 1 : 0)}
                  py="56px"
                  textAlign="center"
                >
                  <Text color={adminUi.muted}>Loading...</Text>
                </Td>
              </Tr>
            ) : rows?.length ? (
              rows.map((row, index) => (
                <Tr
                  key={row?.[rowKey] || row?.id || index}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  cursor={onRowClick ? "pointer" : "default"}
                  tabIndex={onRowClick ? 0 : undefined}
                  role={onRowClick ? "button" : undefined}
                  _hover={onRowClick ? { bg: "#F8FAFD" } : undefined}
                  _focusVisible={
                    onRowClick
                      ? { outline: "2px solid #6C5CE7", outlineOffset: "-2px" }
                      : undefined
                  }
                  onKeyDown={
                    onRowClick
                      ? (event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            onRowClick(row);
                          }
                        }
                      : undefined
                  }
                >
                  {columns.map((column) => (
                    <Td
                      key={column.key}
                      py="14px"
                      px={fitColumns ? { base: "8px", xl: "11px" } : "17px"}
                      borderColor={adminUi.border}
                      color={adminUi.text}
                      fontSize="14px"
                      textAlign={column.align || "left"}
                      width={column.w}
                      maxW={column.w}
                      whiteSpace={fitColumns ? "normal" : undefined}
                      overflowWrap={fitColumns ? "anywhere" : undefined}
                    >
                      {column.render
                        ? column.render(row[column.key], row, index)
                        : row[column.key]}
                    </Td>
                  ))}
                  {actions ? (
                    <Td
                      py="14px"
                      px={fitColumns ? { base: "8px", xl: "11px" } : "17px"}
                      borderColor={adminUi.border}
                      textAlign="right"
                      width={actionsW}
                    >
                      {actions(row)}
                    </Td>
                  ) : null}
                </Tr>
              ))
            ) : (
              <Tr>
                <Td
                  colSpan={columns.length + (actions ? 1 : 0)}
                  py="64px"
                  textAlign="center"
                >
                  <Text color={adminUi.muted} fontSize="14px">
                    {emptyText}
                  </Text>
                </Td>
              </Tr>
            )}
          </Tbody>
        </Table>
      </TableContainer>
      {footer ? (
        <Flex
          justify="flex-end"
          align="center"
          gap={3}
          px="17px"
          py="11px"
          borderTop="1px solid"
          borderColor={adminUi.border}
        >
          {footer}
        </Flex>
      ) : null}
    </AdminCard>
  );
}

export function SoftBadge({ children, colorScheme = "purple", ...props }) {
  return (
    <Badge
      colorScheme={colorScheme}
      borderRadius="7px"
      px="10px"
      py="4px"
      textTransform="none"
      fontSize="12px"
      fontWeight="600"
      {...props}
    >
      {children}
    </Badge>
  );
}

export function PrimaryButton(props) {
  return (
    <Button
      bg="linear-gradient(135deg, #7259E8 0%, #FF6B12 100%)"
      color="#FFFFFF"
      h="46px"
      px="22px"
      fontSize="18px"
      fontWeight="800"
      _hover={{ opacity: 0.92 }}
      {...props}
    />
  );
}
