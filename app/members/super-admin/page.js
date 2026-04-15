"use client";

import { useEffect, useState } from "react";
import MembersTable from "@/components/Members/MembersTable";
import MembersStatsCards from "@/components/Members/MembersStatsCards";
import AddEditMemberModal from "@/components/Members/AddEditMemberModal";
import DeleteConfirmModal from "@/components/Members/DeleteConfirmModal";
import { deleteMemberUser } from "@/api";
import { useMembersAnalyticsList } from "@/hooks/useMembersAnalyticsList";

const ANALYTICS_ROLE = "super_admin";

export default function MembersSuperAdminPage() {
  const {
    data: apiData,
    remoteTotal,
    page,
    setPage,
    limit,
    setLimit,
    setSearch,
    stats,
    statsLoading,
    tableLoading,
    bump,
    totalDeltaPercent,
  } = useMembersAnalyticsList({
    analyticsRoleSlug: ANALYTICS_ROLE,
  });

  const [rows, setRows] = useState([]);
  useEffect(() => {
    setRows(apiData);
  }, [apiData]);

  const [editRow, setEditRow] = useState(null);
  const [deleteRow, setDeleteRow] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const handleEditSubmit = (values) => {
    if (!editRow) return;
    setRows((prev) =>
      prev.map((r) =>
        r.id === editRow.id ? { ...r, name: values.name, email: values.email } : r
      )
    );
    setEditRow(null);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteRow) return;
    const userId = Number(deleteRow.id);
    if (!Number.isFinite(userId)) {
      setDeleteError("Invalid user id. Please refresh and try again.");
      return;
    }

    setDeleteLoading(true);
    setDeleteError("");
    try {
      const response = await deleteMemberUser(userId);
      if (response?.status === 0) {
        throw new Error(response?.message || "Failed to delete member.");
      }
      setRows((prev) => prev.filter((r) => Number(r.id) !== userId));
      setDeleteRow(null);
      bump();
    } catch (error) {
      const message =
        error?.message ||
        error?.error ||
        error?.data?.message ||
        "Unable to delete member. Please try again.";
      setDeleteError(String(message));
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <>
      {statsLoading ? (
        <section className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="h-28 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-28 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-28 animate-pulse rounded-2xl bg-slate-100" />
        </section>
      ) : (
        <MembersStatsCards
          total={stats.total}
          lastWeek={stats.lastWeek}
          lastMonth={stats.lastMonth}
          label="Super Admins"
          totalDeltaPercent={totalDeltaPercent}
        />
      )}
      <MembersTable
        data={rows}
        title="Super Admin"
        onEdit={setEditRow}
        onDelete={(row) => {
          setDeleteError("");
          setDeleteRow(row);
        }}
        remoteTotal={remoteTotal}
        page={page}
        onPageChange={setPage}
        pageSize={limit}
        onPageSizeChange={setLimit}
        showSearch
        onSearchChange={(q) => {
          setSearch(q);
          setPage(1);
        }}
        tableLoading={tableLoading}
      />

      <AddEditMemberModal
        open={Boolean(editRow)}
        title="Edit Super Admin"
        initialValues={editRow ? { name: editRow.name, email: editRow.email } : null}
        onClose={() => setEditRow(null)}
        onSubmit={handleEditSubmit}
      />

      <DeleteConfirmModal
        open={Boolean(deleteRow)}
        itemName={deleteRow?.name ?? ""}
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          if (deleteLoading) return;
          setDeleteRow(null);
          setDeleteError("");
        }}
        loading={deleteLoading}
        errorMessage={deleteError}
      />
    </>
  );
}
