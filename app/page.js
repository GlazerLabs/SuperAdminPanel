import TrafficChart from "@/components/charts/TrafficChart";
import CountryInstallsBarChart from "@/components/charts/CountryInstallsBarChart";
import TrafficSourcesPieChart from "@/components/charts/TrafficSourcesPieChart";

export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-50">
      {/* Time range tabs + colorful summary cards */}
      <section className="mb-6 rounded-3xl bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.12)] ring-1 ring-zinc-100">
        {/* Tabs */}
        <div className="flex flex-wrap items-center gap-4 border-b border-zinc-100 px-1 pb-3">
          {["Last 24 Hour", "Last Week", "Last Month", "Last Quarter"].map(
            (label, index) => {
              const isActive = label === "Last Month";
              return (
                <button
                  key={label}
                  className={`relative pb-1 text-xs font-medium transition-colors ${
                    isActive
                      ? "text-zinc-900"
                      : "text-zinc-400 hover:text-zinc-700"
                  }`}
                >
                  {label}
                  {isActive && (
                    <span className="absolute inset-x-0 -bottom-[6px] mx-auto h-[2px] w-10 rounded-full bg-[#3399EF]" />
                  )}
                </button>
              );
            }
          )}
        </div>

        {/* Cards using 3 key metrics + brand colors */}
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {/* Total installs */}
          <div className="relative overflow-hidden rounded-2xl bg-[#3399EF] px-5 py-4 text-white shadow-[0_18px_32px_rgba(51,153,239,0.55)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-white/80">
                  Total installs
                </p>
                <p className="mt-1 text-2xl font-semibold leading-tight">
                  210K
                </p>
                <p className="mt-1 text-[11px] text-white/70">
                  Feb 11 – Mar 10
                </p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-xs">
                📈
              </div>
            </div>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-emerald-600">
              <span className="text-xs">↗</span>
              <span>+687</span>
              <span className="text-zinc-500">Since last period</span>
            </div>
          </div>

          {/* User acquisitions */}
          <div className="relative overflow-hidden rounded-2xl bg-[#FE20CC] px-5 py-4 text-white shadow-[0_18px_32px_rgba(254,32,204,0.55)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-white/85">
                  User acquisitions
                </p>
                <p className="mt-1 text-2xl font-semibold leading-tight">
                  52.3
                </p>
                <p className="mt-1 text-[11px] text-white/70">
                  average · Feb 11 – Mar 10
                </p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-xs">
                👤
              </div>
            </div>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-rose-600">
              <span className="text-xs">↘</span>
              <span>-68%</span>
              <span className="text-zinc-500">vs previous period</span>
            </div>
          </div>

          {/* Daily active users */}
          <div className="relative overflow-hidden rounded-2xl bg-[#FE5E2C] px-5 py-4 text-white shadow-[0_18px_32px_rgba(254,94,44,0.55)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-white/85">
                  Daily active users
                </p>
                <p className="mt-1 text-2xl font-semibold leading-tight">
                  409
                </p>
                <p className="mt-1 text-[11px] text-white/70">
                  average · Feb 11 – Mar 10
                </p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-xs">
                📊
              </div>
            </div>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-rose-600">
              <span className="text-xs">↘</span>
              <span>-48%</span>
              <span className="text-zinc-500">vs previous period</span>
            </div>
          </div>
        </div>
      </section>

      {/* Lower charts */}
      <section className="mt-6 grid gap-4 lg:grid-cols-[2fr,1.2fr]">
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-100">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-zinc-900">
              Traffic & conversion
            </p>
            <span className="text-[11px] text-zinc-500">Realtime sample</span>
          </div>
          <div className="mt-4 h-64 rounded-2xl bg-zinc-50 px-2 py-2">
            <TrafficChart />
          </div>
        </div>

        <div className="grid gap-4">
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-100">
            <p className="text-sm font-semibold text-zinc-900">
              Installs by country
            </p>
            <div className="mt-3 h-40 rounded-xl bg-zinc-50 px-2 py-2">
              <CountryInstallsBarChart />
            </div>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-100">
            <p className="text-sm font-semibold text-zinc-900">
              Acquisition sources
            </p>
            <div className="mt-3 flex items-center gap-3">
              <div className="h-72 flex-1 rounded-xl bg-zinc-50 px-2 py-2">
                <TrafficSourcesPieChart />
              </div>
              <ul className="hidden flex-1 space-y-1 text-[11px] text-zinc-500 sm:block">
                <li>
                  <span className="inline-block h-2 w-2 rounded-full bg-[#3399EF] mr-2" />
                  Search · 45%
                </li>
                <li>
                  <span className="inline-block h-2 w-2 rounded-full bg-[#FE20CC] mr-2" />
                  Browse · 25%
                </li>
                <li>
                  <span className="inline-block h-2 w-2 rounded-full bg-[#FE5E2C] mr-2" />
                  Referral · 18%
                </li>
                <li>
                  <span className="inline-block h-2 w-2 rounded-full bg-[#22C55E] mr-2" />
                  Ad campaigns · 12%
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
