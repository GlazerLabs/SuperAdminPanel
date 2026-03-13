"use client";

import { useState, useEffect } from "react";

export default function AddEditMemberModal({
  open,
  title,
  initialValues = null,
  onClose,
  onSubmit,
}) {
  const isEdit = Boolean(initialValues);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (open) {
      if (initialValues) {
        setName(initialValues.name ?? "");
        setEmail(initialValues.email ?? "");
        setPassword("");
      } else {
        setName("");
        setEmail("");
        setPassword("");
      }
    }
  }, [open, initialValues]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ name, email, password: password || undefined });
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl ring-1 ring-slate-200"
      >
        <h2 id="modal-title" className="text-xl font-semibold text-slate-900">
          {title}
        </h2>
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label htmlFor="member-name" className="block text-sm font-medium text-slate-700">
              Name
            </label>
            <input
              id="member-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="Full name"
            />
          </div>
          <div>
            <label htmlFor="member-email" className="block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              id="member-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="email@example.com"
            />
          </div>
          <div>
            <label htmlFor="member-password" className="block text-sm font-medium text-slate-700">
              Password {isEdit && <span className="font-normal text-slate-500">(leave blank to keep unchanged)</span>}
            </label>
            <input
              id="member-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required={!isEdit}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder={isEdit ? "••••••••" : "Min 6 characters"}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
            >
              {isEdit ? "Save" : "Add"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
