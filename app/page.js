import TrafficChartContainer from "@/components/charts/TrafficChartContainer";
import CountryInstallsBarChart from "@/components/charts/CountryInstallsBarChart";
import TrafficSourcesPieChart from "@/components/charts/TrafficSourcesPieChart";

const PERIODS = ["Last 24 Hour", "Last Week", "Last Month", "Last Quarter"];

export default function Home() {
  const activePeriod = "Last Month";

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Hero + period */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Dashboard
        </h1>
        <p className="mt-1 text-slate-600">
          Platform health and key metrics at a glance.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {PERIODS.map((label) => (
            <button
              key={label}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                label === activePeriod
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25"
                  : "bg-white text-slate-600 shadow-sm ring-1 ring-slate-200/80 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI cards — one accent (indigo), bold numbers */}
      <section className="mb-8">
        <div className="grid gap-5 sm:grid-cols-3">
          <div className="dashboard-card-fade-up relative overflow-hidden rounded-2xl bg-white p-6 shadow-md shadow-slate-200/50 ring-1 ring-slate-200/80 transition-transform duration-300 hover:scale-[1.02] hover:shadow-lg">
            <div className="absolute right-0 top-0 h-24 w-24 translate-x-4 -translate-y-4 rounded-full bg-indigo-500/10" />
            <p className="text-sm font-medium uppercase tracking-wider text-slate-500">
              Total installs
            </p>
            <p className="mt-2 text-4xl font-bold tracking-tight text-slate-900">
              210K
            </p>
            <p className="mt-1 text-sm text-slate-500">Feb 11 – Mar 10</p>
            <div className="mt-4 flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-sm font-semibold text-emerald-700">
                ↗ +687
              </span>
              <span className="text-sm text-slate-500">vs last period</span>
            </div>
          </div>

          <div className="dashboard-card-fade-up relative overflow-hidden rounded-2xl bg-white p-6 shadow-md shadow-slate-200/50 ring-1 ring-slate-200/80 transition-transform duration-300 hover:scale-[1.02] hover:shadow-lg">
            <div className="absolute right-0 top-0 h-24 w-24 translate-x-4 -translate-y-4 rounded-full bg-indigo-500/10" />
            <p className="text-sm font-medium uppercase tracking-wider text-slate-500">
              User acquisitions
            </p>
            <p className="mt-2 text-4xl font-bold tracking-tight text-slate-900">
              52.3
            </p>
            <p className="mt-1 text-sm text-slate-500">avg · Feb 11 – Mar 10</p>
            <div className="mt-4 flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2.5 py-1 text-sm font-semibold text-rose-700">
                ↘ -68%
              </span>
              <span className="text-sm text-slate-500">vs previous</span>
            </div>
          </div>

          <div className="dashboard-card-fade-up relative overflow-hidden rounded-2xl bg-white p-6 shadow-md shadow-slate-200/50 ring-1 ring-slate-200/80 transition-transform duration-300 hover:scale-[1.02] hover:shadow-lg">
            <div className="absolute right-0 top-0 h-24 w-24 translate-x-4 -translate-y-4 rounded-full bg-indigo-500/10" />
            <p className="text-sm font-medium uppercase tracking-wider text-slate-500">
              Daily active users
            </p>
            <p className="mt-2 text-4xl font-bold tracking-tight text-slate-900">
              409
            </p>
            <p className="mt-1 text-sm text-slate-500">avg · Feb 11 – Mar 10</p>
            <div className="mt-4 flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2.5 py-1 text-sm font-semibold text-rose-700">
                ↘ -48%
              </span>
              <span className="text-sm text-slate-500">vs previous</span>
            </div>
          </div>
        </div>
      </section>

      {/* Charts — more space, clear sections */}
      <section className="chart-fade-in grid gap-6 lg:grid-cols-[1.6fr,1fr]">
        <div className="rounded-2xl bg-white p-6 shadow-md shadow-slate-200/50 ring-1 ring-slate-200/80">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-slate-900">
              Usage & revenue trends
            </h2>
          </div>
          <div className="mt-5 h-[340px] sm:h-[400px]">
            <TrafficChartContainer />
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="rounded-2xl bg-white p-6 shadow-md shadow-slate-200/50 ring-1 ring-slate-200/80">
            <h2 className="text-xl font-semibold text-slate-900">
              Installs by country
            </h2>
            <div className="mt-5 h-72">
              <CountryInstallsBarChart />
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-md shadow-slate-200/50 ring-1 ring-slate-200/80">
            <h2 className="text-xl font-semibold text-slate-900">
              Acquisition sources
            </h2>
            <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="h-64 flex-1 sm:h-72">
                <TrafficSourcesPieChart />
              </div>
              <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600 sm:flex-col">
                <li className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-indigo-500" />
                  Search · 45%
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-violet-500" />
                  Browse · 25%
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-amber-500" />
                  Referral · 18%
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-emerald-500" />
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
