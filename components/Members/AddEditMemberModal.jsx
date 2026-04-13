"use client";

import { useState, useEffect } from "react";

function getErrorMessage(err) {
  if (!err) return "Something went wrong.";
  if (typeof err === "string") return err;
  if (err?.message && typeof err.message === "string") return err.message;
  if (err?.error && typeof err.error === "string") return err.error;
  return "Request failed.";
}

export default function AddEditMemberModal({
  open,
  title,
  initialValues = null,
  onClose,
  onSubmit,
  /** default: name + email + password; organizer: + username, mobile, profile URL */
  variant = "default",
}) {
  const isEdit = Boolean(initialValues);
  const isOrganizer = variant === "organizer";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [mobile, setMobile] = useState("");
  const [profilePicUrl, setProfilePicUrl] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      if (initialValues) {
        setName(initialValues.name ?? "");
        setEmail(initialValues.email ?? "");
        setUsername(initialValues.username ?? "");
        setMobile(initialValues.mobile ?? initialValues.contact ?? "");
        setProfilePicUrl(initialValues.profilePicUrl ?? "");
        setPassword("");
      } else {
        setName("");
        setEmail("");
        setUsername("");
        setMobile("");
        setProfilePicUrl("");
        setPassword("");
      }
      setError("");
      setSubmitting(false);
    }
  }, [open, initialValues]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const payload = isOrganizer
        ? {
            name,
            email,
            username,
            mobile,
            profilePicUrl: profilePicUrl.trim() || undefined,
            password: password || undefined,
          }
        : { name, email, password: password || undefined };

      await Promise.resolve(onSubmit?.(payload));
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
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
        className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl ring-1 ring-slate-200"
      >
        <h2 id="modal-title" className="text-xl font-semibold text-slate-900">
          {title}
        </h2>
        {error && (
          <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800 ring-1 ring-rose-100">
            {error}
          </p>
        )}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {isOrganizer && (
            <div>
              <label
                htmlFor="member-username"
                className="block text-sm font-medium text-slate-700"
              >
                Username
              </label>
              <input
                id="member-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="john_doe"
              />
            </div>
          )}
          <div>
            <label htmlFor="member-name" className="block text-sm font-medium text-slate-700">
              {isOrganizer ? "Full name" : "Name"}
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
          {isOrganizer && (
            <>
              <div>
                <label
                  htmlFor="member-mobile"
                  className="block text-sm font-medium text-slate-700"
                >
                  Mobile
                </label>
                <input
                  id="member-mobile"
                  type="tel"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  required={!isEdit}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="+1234567890"
                />
              </div>
              <div>
                <label
                  htmlFor="member-profile"
                  className="block text-sm font-medium text-slate-700"
                >
                  Profile image URL{" "}
                  <span className="font-normal text-slate-500">(optional)</span>
                </label>
                <input
                  id="member-profile"
                  type="url"
                  value={profilePicUrl}
                  onChange={(e) => setProfilePicUrl(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="https://…"
                />
              </div>
            </>
          )}
          <div>
            <label htmlFor="member-password" className="block text-sm font-medium text-slate-700">
              Password{" "}
              {isEdit && (
                <span className="font-normal text-slate-500">(leave blank to keep unchanged)</span>
              )}
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
              disabled={submitting}
              className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60"
            >
              {submitting ? "Please wait…" : isEdit ? "Save" : "Add"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
