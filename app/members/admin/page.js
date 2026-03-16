"use client";

import { useEffect, useState } from "react";
import MembersTable from "@/components/Members/MembersTable";
import MembersStatsCards from "@/components/Members/MembersStatsCards";
import AddEditMemberModal from "@/components/Members/AddEditMemberModal";
import DeleteConfirmModal from "@/components/Members/DeleteConfirmModal";
import { mockAdmins } from "@/data/membersMockData";
import { fetchUserTypeCounts } from "@/api";

export default function MembersAdminPage() {
  const [data, setData] = useState(mockAdmins);
  const [editRow, setEditRow] = useState(null);
  const [deleteRow, setDeleteRow] = useState(null);

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    lastWeek: 0,
    lastMonth: 0,
  });

  useEffect(() => {
    let isMounted = true;

    const loadCounts = async () => {
      try {
        const response = await fetchUserTypeCounts("admin");
        const list = Array.isArray(response?.data) ? response.data : [];
        const item = list[0] || {};

        const total = Number(item.admin ?? item.total ?? mockAdmins.length) || 0;

        if (isMounted) {
          setStats({
            total,
            lastWeek: 0,
            lastMonth: 0,
          });
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Failed to load admin counts:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadCounts();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleEdit = (row) => setEditRow(row);
  const handleDelete = (row) => setDeleteRow(row);

  const handleEditSubmit = (values) => {
    if (!editRow) return;
    setData((prev) =>
      prev.map((r) =>
        r.id === editRow.id
          ? { ...r, name: values.name, email: values.email }
          : r
      )
    );
    setEditRow(null);
  };

  const handleDeleteConfirm = () => {
    if (!deleteRow) return;
    setData((prev) => prev.filter((r) => r.id !== deleteRow.id));
    setDeleteRow(null);
  };

  return (
    <>
      {loading ? (
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
          label="Admins"
        />
      )}
      <MembersTable
        data={data}
        title="Admin"
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <AddEditMemberModal
        open={Boolean(editRow)}
        title="Edit Admin"
        initialValues={editRow ? { name: editRow.name, email: editRow.email } : null}
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
