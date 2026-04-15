"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import MembersTable from "@/components/Members/MembersTable";
import MembersStatsCards from "@/components/Members/MembersStatsCards";
import AddEditMemberModal from "@/components/Members/AddEditMemberModal";
import DeleteConfirmModal from "@/components/Members/DeleteConfirmModal";
import { updateMemberUserDetails } from "@/api";
import { useMembersTabs } from "@/contexts/MembersTabsContext";
import { useMembersAnalyticsList } from "@/hooks/useMembersAnalyticsList";
import { displayLabelForRole } from "@/lib/membersRoleAnalytics";

function MembersDynamicRoleInner({ analyticsSlug, label }) {
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
    analyticsRoleSlug: analyticsSlug,
  });

  const [rows, setRows] = useState([]);
  useEffect(() => {
    setRows(apiData);
  }, [apiData]);

  const [editRow, setEditRow] = useState(null);
  const [deleteRow, setDeleteRow] = useState(null);

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

  const handleDeleteConfirm = () => {
    if (!deleteRow) return;
    setRows((prev) => prev.filter((r) => r.id !== deleteRow.id));
    setDeleteRow(null);
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
          label={label}
          totalDeltaPercent={totalDeltaPercent}
        />
      )}
      <MembersTable
        data={rows}
        title={label}
        onEdit={setEditRow}
        onDelete={setDeleteRow}
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
        showIngameColumns={analyticsSlug === "player"}
        showOwnerColumn={analyticsSlug !== "player"}
      />

      <AddEditMemberModal
        open={Boolean(editRow)}
        title={`Edit ${label}`}
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
        open={Boolean(deleteRow)}
        itemName={deleteRow?.name ?? ""}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteRow(null)}
      />
    </>
  );
}

export default function MembersDynamicRolePage() {
  const params = useParams();
  const roleCode = params?.roleCode;
  const { getAnalyticsSlugForRoleCode, rolesList, rolesLoaded } = useMembersTabs();

  const slug = useMemo(
    () => (roleCode != null ? getAnalyticsSlugForRoleCode(roleCode) : null),
    [roleCode, getAnalyticsSlugForRoleCode]
  );

  const roleMeta = useMemo(
    () =>
      rolesList.find(
        (r) => String(r?.role_code ?? r?.roleCode) === String(roleCode)
      ) ?? null,
    [rolesList, roleCode]
  );

  const label = roleMeta ? displayLabelForRole(roleMeta) : `Role ${roleCode ?? ""}`;

  if (!rolesLoaded) {
    return (
      <div className="space-y-6">
        <section className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="h-28 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-28 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-28 animate-pulse rounded-2xl bg-slate-100" />
        </section>
        <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />
      </div>
    );
  }

  if (!slug) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-6 text-sm text-amber-900">
        No role found for code <strong>{String(roleCode)}</strong>. It may have been removed
        or is inactive.
      </div>
    );
  }

  return <MembersDynamicRoleInner analyticsSlug={slug} label={label} />;
}
