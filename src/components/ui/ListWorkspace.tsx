import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import AddRounded from "@mui/icons-material/AddRounded";
import InboxOutlined from "@mui/icons-material/InboxOutlined";
import SearchRounded from "@mui/icons-material/SearchRounded";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import InputAdornment from "@mui/material/InputAdornment";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Hero from "./Hero";

export interface ListTab {
  href: string;
  label: string;
}

interface ListWorkspaceProps {
  title?: string;
  tabs?: ListTab[];
  actionLabel?: string;
  onAction?: () => void;
  countLabel: string;
  columns: string[];
  emptyMessage: string;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  isLoading?: boolean;
  error?: string;
  children?: ReactNode;
}

export default function ListWorkspace({
  title,
  tabs,
  actionLabel,
  onAction,
  countLabel,
  columns,
  emptyMessage,
  searchPlaceholder = "Buscar",
  searchValue = "",
  onSearchChange,
  isLoading,
  error,
  children,
}: ListWorkspaceProps) {
  const router = useRouter();

  return (
    <Box>
      {title ? <Hero compact title={title} /> : null}

      <Card variant="outlined">
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: "divider", alignItems: { md: "center" }, justifyContent: "space-between" }}
        >
          <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap", alignItems: "center" }}>
            {tabs?.map((tab) => {
              const active =
                router.pathname === tab.href || router.pathname.startsWith(`${tab.href}/`);
              return (
                <Button
                  key={tab.href}
                  component={Link}
                  href={tab.href}
                  size="small"
                  variant={active ? "contained" : "text"}
                >
                  {tab.label}
                </Button>
              );
            })}
            {!tabs?.length ? (
              <Typography color="text.secondary">{countLabel}</Typography>
            ) : null}
          </Stack>

          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", width: { xs: "100%", md: "auto" } }}>
            <TextField
              size="small"
              value={searchValue}
              onChange={(event) => onSearchChange?.(event.target.value)}
              placeholder={searchPlaceholder}
              sx={{ minWidth: { md: 240 }, flex: 1 }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchRounded fontSize="small" />
                    </InputAdornment>
                  ),
                },
              }}
            />
            {actionLabel ? (
              <Button variant="contained" startIcon={<AddRounded />} onClick={onAction}>
                {actionLabel}
              </Button>
            ) : null}
          </Stack>
        </Stack>

        {tabs?.length ? (
          <Typography color="text.secondary" sx={{ px: 2, pt: 2 }}>
            {countLabel}
          </Typography>
        ) : null}

        <Box sx={{ p: 2, pt: tabs?.length ? 1.5 : 2 }}>
          {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
          <Box sx={{ overflowX: "auto" }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {columns.map((column) => (
                    <TableCell key={column}>{column}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, row) => (
                    <TableRow key={`skeleton-${row}`}>
                      {columns.map((column) => (
                        <TableCell key={`${column}-${row}`}>
                          <Skeleton width="70%" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : children ? (
                  children
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} sx={{ py: 8 }}>
                      <Stack spacing={1.5} sx={{ alignItems: "center" }}>
                        <InboxOutlined color="action" />
                        <Typography>{emptyMessage}</Typography>
                      </Stack>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Box>
        </Box>
      </Card>
    </Box>
  );
}
