"use client";

import { useState } from "react";
import MembersTable from "@/components/Members/MembersTable";
import MembersStatsCards from "@/components/Members/MembersStatsCards";
import AddEditMemberModal from "@/components/Members/AddEditMemberModal";
import DeleteConfirmModal from "@/components/Members/DeleteConfirmModal";
import { mockFreelancers } from "@/data/membersMockData";

export default function MembersFreelancersPage() {
  const [data, setData] = useState(mockFreelancers);
  const [editRow, setEditRow] = useState(null);
  const [deleteRow, setDeleteRow] = useState(null);

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
      <MembersStatsCards
        total={data.length}
        lastWeek={1}
        lastMonth={2}
        label="Freelancers"
      />
      <MembersTable
        data={data}
        title="Freelancer"
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <AddEditMemberModal
        open={Boolean(editRow)}
        title="Edit Freelancer"
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
