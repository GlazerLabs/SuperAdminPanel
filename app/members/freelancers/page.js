"use client";

import { useEffect, useState } from "react";
import MembersTable from "@/components/Members/MembersTable";
import MembersStatsCards from "@/components/Members/MembersStatsCards";
import AddEditMemberModal from "@/components/Members/AddEditMemberModal";
import DeleteConfirmModal from "@/components/Members/DeleteConfirmModal";
import { deleteMemberUser, updateMemberUserDetails } from "@/api";
import { useMembersAnalyticsList } from "@/hooks/useMembersAnalyticsList";

const ANALYTICS_ROLE = "freelancer";

export default function MembersFreelancersPage() {
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
  const [deleteRows, setDeleteRows] = useState([]);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const handleEditSubmit = async (values) => {
    if (!editRow) return;
    const userId = Number(editRow.id);
    if (!Number.isFinite(userId)) throw new Error("Invalid user id.");
    await updateMemberUserDetails(userId, {
      email: values.email,
      username: values.username || editRow.username || undefined,
      mobile: values.mobile || editRow.contact || undefined,
      full_name: values.name,
      profile_pic_url: values.profilePicUrl || editRow.avatar || undefined,
      is_active: 1,
    });
    setEditRow(null);
    bump();
  };

  const handleDeleteConfirm = async () => {
    if (deleteRows.length === 0) return;
    const userIds = deleteRows
      .map((row) => Number(row?.id))
      .filter((id) => Number.isFinite(id));

    if (userIds.length !== deleteRows.length) {
      setDeleteError("Some selected users have invalid IDs. Please refresh and try again.");
      return;
    }

    setDeleteLoading(true);
    setDeleteError("");
    try {
      await Promise.all(
        userIds.map(async (userId) => {
          const response = await deleteMemberUser(userId);
          if (response?.status === 0) {
            throw new Error(response?.message || "Failed to delete one or more users.");
          }
        })
      );

      const deletedIdSet = new Set(userIds);
      setRows((prev) => prev.filter((r) => !deletedIdSet.has(Number(r.id))));
      setDeleteRows([]);
      bump();
    } catch (error) {
      const message =
        error?.message ||
        error?.error ||
        error?.data?.message ||
        "Unable to delete selected users. Please try again.";
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
          label="Freelancers"
          totalDeltaPercent={totalDeltaPercent}
        />
      )}
      <MembersTable
        data={rows}
        title="Freelancer"
        onEdit={setEditRow}
        onDelete={(row) => {
          setDeleteError("");
          setDeleteRows([row]);
        }}
        onBulkDelete={(selectedRows) => {
          setDeleteError("");
          setDeleteRows(selectedRows);
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
        showIngameColumns={false}
        showOwnerColumn
      />

      <AddEditMemberModal
        open={Boolean(editRow)}
        title="Edit Freelancer"
        initialValues={
          editRow
            ? {
                name: editRow.name,
                email: editRow.email,
                username: editRow.username,
                mobile: editRow.contact,
                profilePicUrl: editRow.avatar ?? "",
              }
            : null
        }
        onClose={() => setEditRow(null)}
        onSubmit={handleEditSubmit}
      />

      <DeleteConfirmModal
        open={deleteRows.length > 0}
        itemName={
          deleteRows.length === 1
            ? deleteRows[0]?.name ?? ""
            : `${deleteRows.length} selected members`
        }
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          if (deleteLoading) return;
          setDeleteRows([]);
          setDeleteError("");
        }}
        loading={deleteLoading}
        errorMessage={deleteError}
      />
    </>
  );
}
