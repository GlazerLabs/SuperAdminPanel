"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "../ui/Button";
import { postApi, readProfile } from "@/api";
import { useAuthStore } from "@/zustand/auth";

function IconMail(props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="h-5 w-5"
      {...props}
    >
      <path
        d="M4 6.75A2.75 2.75 0 0 1 6.75 4h10.5A2.75 2.75 0 0 1 20 6.75v10.5A2.75 2.75 0 0 1 17.25 20H6.75A2.75 2.75 0 0 1 4 17.25V6.75Z"
        className="stroke-zinc-300"
        strokeWidth="1.5"
      />
      <path
        d="M6.5 7.5 12 11.5l5.5-4"
        className="stroke-zinc-300"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconLock(props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="h-5 w-5"
      {...props}
    >
      <path
        d="M7 10V8a5 5 0 0 1 10 0v2"
        className="stroke-zinc-300"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M6.75 10h10.5A2.75 2.75 0 0 1 20 12.75v5.5A2.75 2.75 0 0 1 17.25 21H6.75A2.75 2.75 0 0 1 4 18.25v-5.5A2.75 2.75 0 0 1 6.75 10Z"
        className="stroke-zinc-300"
        strokeWidth="1.5"
      />
      <path
        d="M12 14v3"
        className="stroke-zinc-300"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconEye({ off = false, ...props }) {
  return off ? (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="h-5 w-5"
      {...props}
    >
      <path
        d="M3 3l18 18"
        className="stroke-zinc-300"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M10.5 10.8A2.5 2.5 0 0 0 13.2 13.5"
        className="stroke-zinc-300"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M6.4 6.7C4.2 8.3 2.7 10.5 2 12c1.3 2.7 5.3 7 10 7 1.6 0 3.1-.4 4.3-1"
        className="stroke-zinc-300"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M9.4 4.4A10 10 0 0 1 12 4c4.7 0 8.7 4.3 10 8-.4.8-1.1 2-2.2 3.2"
        className="stroke-zinc-300"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  ) : (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="h-5 w-5"
      {...props}
    >
      <path
        d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"
        className="stroke-zinc-300"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
        className="stroke-zinc-300"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function Field({ label, children, hint }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-4">
        <label className="text-sm font-medium text-zinc-900">{label}</label>
        {hint}
      </div>
      {children}
    </div>
  );
}

function InputShell({ icon, children, right }) {
  return (
    <div className="group relative">
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
        {icon}
      </div>
      {children}
      {right ? (
        <div className="absolute inset-y-0 right-0 flex items-center pr-2">
          {right}
        </div>
      ) : null}
      <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-zinc-200 group-focus-within:ring-2 group-focus-within:ring-[#3399EF]/60" />
    </div>
  );
}

export default function SuperAdminLogin() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = useMemo(() => {
    return email.trim().length > 0 && password.trim().length > 0;
  }, [email, password]);

  const handleLogin = async (e) => {
    e?.preventDefault();
    if (!canSubmit || loading) return;

    try {
      setLoading(true);
      setError("");

      const data = await postApi("auth/login-email-password", {
        email,
        password,
        type: 6,
      });

      // Try a couple of common token shapes; adjust if your API differs.
      const token = data?.token || data?.data?.token || data?.accessToken;
      const user = data?.user || data?.data?.user || null;

      if (!token) {
        throw new Error("No token returned from server.");
      }

      // Save token immediately so other requests (like profile) can use it.
      setAuth({ token, user });

      // Fetch full profile using the bearer token and store it for the dashboard header.
      try {
        const profileRes = await readProfile();
        const profile =
          profileRes?.profile ||
          profileRes?.data?.profile ||
          profileRes?.data?.user ||
          profileRes?.user ||
          profileRes?.data ||
          profileRes ||
          null;

        if (profile) {
          setAuth({ token, user: profile });
        }
      } catch (profileErr) {
        // Login should still succeed even if profile can't be loaded.
        console.error("Failed to load profile:", profileErr);
      }

      // Go to home/dashboard, layout will show sidebar when logged in
      router.push("/");
    } catch (err) {
      const message =
        err?.message ||
        err?.error ||
        err?.data?.message ||
        "Unable to sign in. Please check your credentials.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-zinc-50 text-zinc-900">
      <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-[#3399EF]/10 via-transparent to-[#FE5E2C]/10" />
      <div className="pointer-events-none absolute -left-28 top-10 h-72 w-72 rounded-full bg-[#3399EF]/15 blur-3xl" />
      <div className="pointer-events-none absolute -right-28 bottom-10 h-80 w-80 rounded-full bg-[#FE27BA]/10 blur-3xl" />

      <div className="relative grid min-h-screen w-full grid-cols-1 lg:grid-cols-2">
        <div className="absolute left-6 top-6 z-10">
          <Image
            src="/Thryl Logo (1).svg"
            alt="THRYL"
            width={96}
            height={72}
            priority
          />
        </div>

        <div className="relative flex flex-col justify-center px-6 py-12 sm:px-10 lg:px-12">
          <div className="absolute inset-x-0 top-0 h-28 bg-linear-to-b from-white/80 to-transparent" />

          <div className="relative mx-auto w-full max-w-md">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1.5 text-xs font-semibold text-zinc-700 ring-1 ring-zinc-200 backdrop-blur">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Super Admin Access
            </div>

            <div className="mt-6 space-y-2">
              <h1 className="text-4xl font-semibold tracking-tight">
                Welcome back
              </h1>
              <p className="max-w-md text-sm leading-6 text-zinc-600">
                Sign in to view platform health, user activity, and organizer
                operations.
              </p>
            </div>

            <form className="mt-8 space-y-5" onSubmit={handleLogin}>
              <Field label="Email address">
                <InputShell icon={<IconMail />}>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    placeholder="name@company.com"
                    autoComplete="email"
                    className="w-full rounded-xl bg-white/90 py-3 pl-11 pr-4 text-sm outline-none placeholder:text-zinc-400"
                  />
                </InputShell>
              </Field>

              <Field label="Password">
                <InputShell
                  icon={<IconLock />}
                  right={
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="rounded-lg p-2 hover:bg-zinc-100"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      <IconEye off={showPassword} />
                    </button>
                  }
                >
                  <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    className="w-full rounded-xl bg-white/90 py-3 pl-11 pr-12 text-sm outline-none placeholder:text-zinc-400"
                  />
                </InputShell>
              </Field>

              <div className="flex items-center justify-between gap-4">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-600">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="h-4 w-4 rounded border-zinc-300 text-[#3399EF] accent-[#3399EF]"
                  />
                  Remember me
                </label>

                <div className="text-xs text-zinc-500">
                  Protected by company policy
                </div>
              </div>

              <div className="pt-1">
                <Button
                  text={loading ? "Signing in..." : "Sign in"}
                  disabled={!canSubmit || loading}
                  className="rounded-xl shadow-lg shadow-[#3399EF]/25"
                  onClick={handleLogin}
                />
              </div>

              {error ? (
                <p className="text-sm text-red-500" role="alert">
                  {error}
                </p>
              ) : null}

              <div className="text-xs leading-5 text-zinc-500">
                By continuing, you agree to internal security guidelines and
                activity auditing.
              </div>
            </form>
          </div>
        </div>

        <div className="relative hidden overflow-hidden bg-white lg:block">
          <div className="absolute inset-0 bg-linear-to-br from-[#3399EF]/10 via-white to-[#FE5E2C]/10" />
          <div className="absolute -left-32 -top-32 h-80 w-80 rounded-full bg-[#3399EF]/15 blur-3xl" />
          <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-[#FE27BA]/10 blur-3xl" />

          <div className="relative flex h-full flex-col items-center justify-center px-12 py-16">
            <div className="w-full max-w-xl">
              <div className="rounded-[28px] bg-white/85 p-8 shadow-[0_24px_80px_-40px_rgba(0,0,0,0.35)] ring-1 ring-zinc-100 backdrop-blur">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-base font-semibold text-zinc-900">
                      Super Admin console
                    </div>
                    <div className="mt-1 text-sm text-zinc-500">
                      High-trust access to manage people, operations, and audit
                      trails
                    </div>
                  </div>
                  <div className="rounded-xl bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white">
                    Restricted
                  </div>
                </div>

                <div className="relative mt-7 overflow-hidden rounded-3xl bg-zinc-50 p-5 ring-1 ring-zinc-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-zinc-700">
                        Activity overview
                      </div>
                      <div className="mt-1 text-xs text-zinc-500">
                        Users • Organizers • Admin actions
                      </div>
                    </div>
                    <div className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 ring-1 ring-zinc-200">
                      last 24h
                    </div>
                  </div>

                  <div className="relative mt-6">
                    <div className="grid grid-cols-7 items-end gap-3">
                      <div className="h-14 rounded-xl bg-[#3399EF]/60" />
                      <div className="h-20 rounded-xl bg-zinc-900/60" />
                      <div className="h-12 rounded-xl bg-[#4C8AEB]/55" />
                      <div className="h-24 rounded-xl bg-[#FE27BA]/40" />
                      <div className="h-16 rounded-xl bg-[#FE5E2C]/55" />
                      <div className="h-28 rounded-xl bg-[#3399EF]/65" />
                      <div className="h-13 rounded-xl bg-zinc-900/50" />
                    </div>

                    <svg
                      viewBox="0 0 320 72"
                      className="pointer-events-none absolute -left-3 -right-3 -top-4 h-24 w-[calc(100%+1.5rem)]"
                      aria-hidden="true"
                    >
                      <path
                        d="M6 52 C40 28, 66 44, 96 30 C130 15, 160 24, 192 20 C224 16, 250 30, 286 18"
                        stroke="rgba(51,153,239,0.55)"
                        strokeWidth="3"
                        fill="none"
                        strokeLinecap="round"
                      />
                      <path
                        d="M6 52 C40 28, 66 44, 96 30 C130 15, 160 24, 192 20 C224 16, 250 30, 286 18"
                        stroke="rgba(51,153,239,0.12)"
                        strokeWidth="10"
                        fill="none"
                        strokeLinecap="round"
                      />
                    </svg>

                    <div className="absolute -top-7 right-3 rounded-2xl bg-white px-3.5 py-2.5 text-sm font-semibold text-zinc-900 shadow-lg ring-1 ring-zinc-200">
                      New users <span className="ml-2 text-zinc-700">265</span>
                      <span className="ml-2 text-emerald-600">+11%</span>
                    </div>
                    <div className="absolute -bottom-7 left-3 rounded-2xl bg-white px-3.5 py-2.5 text-sm font-semibold text-zinc-900 shadow-lg ring-1 ring-zinc-200">
                      Admin actions{" "}
                      <span className="ml-2 text-zinc-700">7,265</span>
                      <span className="ml-2 text-emerald-600">+8%</span>
                    </div>
                  </div>

                  <div className="mt-7 grid grid-cols-3 gap-2 text-center text-xs font-medium text-zinc-500">
                    <div>Users</div>
                    <div>Organizers</div>
                    <div>Admin</div>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-3">
                  <div className="rounded-2xl bg-white/70 p-5 text-center ring-1 ring-zinc-100 backdrop-blur">
                    <div className="text-sm font-medium text-zinc-600">
                      Users
                    </div>
                    <div className="mt-1 text-base font-semibold text-zinc-900">
                      Manage
                    </div>
                  </div>
                  <div className="rounded-2xl bg-white/70 p-5 text-center ring-1 ring-zinc-100 backdrop-blur">
                    <div className="text-sm font-medium text-zinc-600">
                      Tracking
                    </div>
                    <div className="mt-1 text-base font-semibold text-zinc-900">
                      Live
                    </div>
                  </div>
                  <div className="rounded-2xl bg-white/70 p-5 text-center ring-1 ring-zinc-100 backdrop-blur">
                    <div className="text-sm font-medium text-zinc-600">
                      Audit
                    </div>
                    <div className="mt-1 text-base font-semibold text-zinc-900">
                      Logged
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-10 text-center">
                <div className="text-lg font-semibold tracking-tight text-zinc-900">
                  Built for leadership visibility
                </div>
                <div className="mx-auto mt-2 max-w-sm text-sm leading-6 text-zinc-600">
                  Everything important in one place — clear, fast, and auditable.
                </div>
              </div>

              <div className="mt-8 flex items-center justify-center gap-3 text-xs text-zinc-500">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1.5 ring-1 ring-zinc-100">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Admin actions audited
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1.5 ring-1 ring-zinc-100">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Role-based access
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

