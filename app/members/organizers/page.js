"use client";

import { useEffect, useState } from "react";
import MembersTable from "@/components/Members/MembersTable";
import MembersStatsCards from "@/components/Members/MembersStatsCards";
import AddEditMemberModal from "@/components/Members/AddEditMemberModal";
import DeleteConfirmModal from "@/components/Members/DeleteConfirmModal";
import { useMembersWorkspace } from "@/contexts/MembersWorkspaceContext";
import { useMembersAnalyticsList } from "@/hooks/useMembersAnalyticsList";
import {
  createOrganizerTeamMember,
  deleteOrganizerTeamMember,
  updateOrganizerTeamMember,
} from "@/api";

function getErrorMessage(err) {
  if (!err) return "Something went wrong.";
  if (typeof err === "string") return err;
  if (err?.message && typeof err.message === "string") return err.message;
  if (err?.error && typeof err.error === "string") return err.error;
  return "Request failed.";
}

const ANALYTICS_ROLE = "organizer";
/** create-team API user type for organizer */
const CREATE_TYPE = 3;

export default function MembersOrganizersPage() {
  const { registerAddSubmit } = useMembersWorkspace();
  const {
    data,
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

  const [editRow, setEditRow] = useState(null);
  const [deleteRow, setDeleteRow] = useState(null);

  useEffect(() => {
    return registerAddSubmit(async (values) => {
      await createOrganizerTeamMember({
        username: values.username,
        email: values.email,
        mobile: values.mobile,
        full_name: values.name,
        type: CREATE_TYPE,
        profile_pic_url: values.profilePicUrl,
        password: values.password,
      });
      setPage(1);
      bump();
    });
  }, [registerAddSubmit, bump, setPage]);

  const handleEditSubmit = async (values) => {
    if (!editRow) return;
    const id = Number(editRow.id);
    if (!Number.isFinite(id)) throw new Error("Invalid member id.");
    await updateOrganizerTeamMember({
      id,
      username: values.username,
      email: values.email,
      full_name: values.name,
      profile_pic_url: values.profilePicUrl || undefined,
    });
    setEditRow(null);
    bump();
  };

  const handleDeleteConfirm = () => {
    if (!deleteRow) return;
    void (async () => {
      try {
        const id = Number(deleteRow.id);
        if (!Number.isFinite(id)) throw new Error("Invalid member id.");
        await deleteOrganizerTeamMember({ id });
        setDeleteRow(null);
        bump();
      } catch (err) {
        window.alert(getErrorMessage(err));
      }
    })();
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
          label="Organizers"
          totalDeltaPercent={totalDeltaPercent}
        />
      )}
      <MembersTable
        data={data}
        title="Organizer"
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
      />

      <AddEditMemberModal
        open={Boolean(editRow)}
        title="Edit Organizer"
        variant="organizer"
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
