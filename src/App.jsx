import React, { useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Calculator, Clock, DollarSign, Download, RefreshCcw } from "lucide-react";

const frequencies = {
  weekly: { label: "Weekly", periodsPerYear: 52 },
  fortnightly: { label: "Fortnightly", periodsPerYear: 26 },
  monthly: { label: "Monthly", periodsPerYear: 12 },
};

function currency(value) {
  return new Intl.NumberFormat("en-NZ", {
    style: "currency",
    currency: "NZD",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

function formatYearsMonths(periods, periodsPerYear) {
  const totalMonths = Math.max(0, Math.round((periods / periodsPerYear) * 12));
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  if (years === 0) return `${months} month${months === 1 ? "" : "s"}`;
  if (months === 0) return `${years} year${years === 1 ? "" : "s"}`;
  return `${years} year${years === 1 ? "" : "s"} ${months} month${months === 1 ? "" : "s"}`;
}

function calculatePayment(principal, annualRate, years, periodsPerYear) {
  const n = years * periodsPerYear;
  const r = annualRate / 100 / periodsPerYear;
  if (principal <= 0 || years <= 0) return 0;
  if (r === 0) return principal / n;
  return (principal * r) / (1 - Math.pow(1 + r, -n));
}

function buildSchedule({ principal, annualRate, years, periodsPerYear, extraPayment, lumpSum }) {
  const standardPayment = calculatePayment(principal, annualRate, years, periodsPerYear);
  const r = annualRate / 100 / periodsPerYear;
  let balance = principal;
  let period = 0;
  let totalInterest = 0;
  const maxPeriods = years * periodsPerYear * 3;
  const rows = [];

  while (balance > 0.01 && period < maxPeriods) {
    period += 1;
    const interest = balance * r;
    let payment = standardPayment + extraPayment;

    if (period === 1 && lumpSum > 0) {
      payment += lumpSum;
    }

    const principalPaid = Math.min(balance, Math.max(0, payment - interest));
    balance = Math.max(0, balance - principalPaid);
    totalInterest += interest;

    rows.push({
      period,
      payment: principalPaid + interest,
      principalPaid,
      interest,
      balance,
    });

    if (principalPaid <= 0) break;
  }

  return {
    standardPayment,
    totalInterest,
    payoffPeriods: rows.length,
    rows,
  };
}

function yearlyChartData(normalRows, extraRows, periodsPerYear) {
  const maxYears = Math.ceil(Math.max(normalRows.length, extraRows.length) / periodsPerYear);
  const data = [];

  for (let year = 0; year <= maxYears; year++) {
    const index = Math.max(0, year * periodsPerYear - 1);
    const normal = year === 0 ? normalRows[0]?.balance + normalRows[0]?.principalPaid || 0 : normalRows[index]?.balance ?? 0;
    const extra = year === 0 ? extraRows[0]?.balance + extraRows[0]?.principalPaid || 0 : extraRows[index]?.balance ?? 0;
    data.push({ year, normal: Math.round(normal), extra: Math.round(extra) });
  }

  return data;
}

function downloadCsv(rows) {
  const header = "Period,Payment,Principal,Interest,Balance\n";
  const body = rows
    .map((row) => [row.period, row.payment.toFixed(2), row.principalPaid.toFixed(2), row.interest.toFixed(2), row.balance.toFixed(2)].join(","))
    .join("\n");
  const blob = new Blob([header + body], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "loan-freedom-schedule.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export default function LoanFreedomCalculator() {
  const [loanType, setLoanType] = useState("Mortgage");
  const [loanAmount, setLoanAmount] = useState(650000);
  const [interestRate, setInterestRate] = useState(6.25);
  const [loanTerm, setLoanTerm] = useState(30);
  const [frequency, setFrequency] = useState("monthly");
  const [extraPayment, setExtraPayment] = useState(100);
  const [lumpSum, setLumpSum] = useState(0);

  const periodsPerYear = frequencies[frequency].periodsPerYear;

  const results = useMemo(() => {
    const normal = buildSchedule({
      principal: Number(loanAmount),
      annualRate: Number(interestRate),
      years: Number(loanTerm),
      periodsPerYear,
      extraPayment: 0,
      lumpSum: 0,
    });

    const extra = buildSchedule({
      principal: Number(loanAmount),
      annualRate: Number(interestRate),
      years: Number(loanTerm),
      periodsPerYear,
      extraPayment: Number(extraPayment),
      lumpSum: Number(lumpSum),
    });

    return {
      normal,
      extra,
      interestSaved: normal.totalInterest - extra.totalInterest,
      timeSaved: normal.payoffPeriods - extra.payoffPeriods,
      chartData: yearlyChartData(normal.rows, extra.rows, periodsPerYear),
    };
  }, [loanAmount, interestRate, loanTerm, periodsPerYear, extraPayment, lumpSum]);

  const resetExample = () => {
    setLoanType("Mortgage");
    setLoanAmount(650000);
    setInterestRate(6.25);
    setLoanTerm(30);
    setFrequency("monthly");
    setExtraPayment(100);
    setLumpSum(0);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8 rounded-3xl bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Loan Freedom Calculator</p>
              <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">See how extra payments can cut years off your loan.</h1>
              <p className="mt-4 max-w-3xl text-base text-slate-600 sm:text-lg">
                Compare your normal repayment plan with an extra repayment strategy for a mortgage, car loan, or personal loan.
              </p>
            </div>
            <div className="rounded-2xl bg-slate-100 p-4 text-sm text-slate-600">
              Estimate only. Not financial advice.
            </div>
          </div>
        </header>

        <main className="grid gap-6 lg:grid-cols-[420px_1fr]">
          <section className="rounded-3xl bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-bold">Loan details</h2>
              <button onClick={resetExample} className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-sm font-medium hover:bg-slate-200">
                <RefreshCcw size={16} /> Reset
              </button>
            </div>

            <div className="space-y-5">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Loan type</span>
                <select value={loanType} onChange={(e) => setLoanType(e.target.value)} className="w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-slate-500">
                  <option>Mortgage</option>
                  <option>Car loan</option>
                  <option>Personal loan</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Loan amount</span>
                <input type="number" value={loanAmount} onChange={(e) => setLoanAmount(e.target.value)} className="w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-slate-500" />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Interest rate %</span>
                <input type="number" step="0.01" value={interestRate} onChange={(e) => setInterestRate(e.target.value)} className="w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-slate-500" />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Loan term in years</span>
                <input type="number" value={loanTerm} onChange={(e) => setLoanTerm(e.target.value)} className="w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-slate-500" />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Repayment frequency</span>
                <select value={frequency} onChange={(e) => setFrequency(e.target.value)} className="w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-slate-500">
                  {Object.entries(frequencies).map(([key, item]) => (
                    <option key={key} value={key}>{item.label}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Extra repayment each {frequencies[frequency].label.toLowerCase()}</span>
                <input type="number" value={extraPayment} onChange={(e) => setExtraPayment(e.target.value)} className="w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-slate-500" />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">One-off lump sum payment</span>
                <input type="number" value={lumpSum} onChange={(e) => setLumpSum(e.target.value)} className="w-full rounded-xl border border-slate-200 p-3 outline-none focus:border-slate-500" />
              </label>
            </div>
          </section>

          <section className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-3xl bg-white p-6 shadow-sm">
                <div className="mb-3 inline-flex rounded-2xl bg-slate-100 p-3"><Calculator size={22} /></div>
                <p className="text-sm text-slate-500">Normal repayment</p>
                <p className="mt-1 text-2xl font-bold">{currency(results.normal.standardPayment)}</p>
                <p className="mt-1 text-sm text-slate-500">per {frequencies[frequency].label.toLowerCase()}</p>
              </div>

              <div className="rounded-3xl bg-white p-6 shadow-sm">
                <div className="mb-3 inline-flex rounded-2xl bg-slate-100 p-3"><Clock size={22} /></div>
                <p className="text-sm text-slate-500">Time saved</p>
                <p className="mt-1 text-2xl font-bold">{formatYearsMonths(results.timeSaved, periodsPerYear)}</p>
                <p className="mt-1 text-sm text-slate-500">with extra repayments</p>
              </div>

              <div className="rounded-3xl bg-white p-6 shadow-sm">
                <div className="mb-3 inline-flex rounded-2xl bg-slate-100 p-3"><DollarSign size={22} /></div>
                <p className="text-sm text-slate-500">Interest saved</p>
                <p className="mt-1 text-2xl font-bold">{currency(results.interestSaved)}</p>
                <p className="mt-1 text-sm text-slate-500">estimated saving</p>
              </div>
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold">Your payoff result</h2>
              <p className="mt-3 text-2xl font-semibold leading-snug">
                By paying <span className="font-bold">{currency(Number(extraPayment))}</span> extra each {frequencies[frequency].label.toLowerCase()}, you could finish about <span className="font-bold">{formatYearsMonths(results.timeSaved, periodsPerYear)}</span> earlier and save around <span className="font-bold">{currency(results.interestSaved)}</span> in interest.
              </p>
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-xl font-bold">Loan balance comparison</h2>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={results.chartData} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" tickFormatter={(value) => `Y${value}`} />
                    <YAxis tickFormatter={(value) => `$${Math.round(value / 1000)}k`} />
                    <Tooltip formatter={(value) => currency(value)} labelFormatter={(value) => `Year ${value}`} />
                    <Line type="monotone" dataKey="normal" name="Normal plan" strokeWidth={3} dot={false} />
                    <Line type="monotone" dataKey="extra" name="Extra payment plan" strokeWidth={3} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-sm">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-xl font-bold">Amortisation schedule</h2>
                <button onClick={() => downloadCsv(results.extra.rows)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
                  <Download size={16} /> Download CSV
                </button>
              </div>
              <div className="max-h-96 overflow-auto rounded-2xl border border-slate-200">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-slate-100 text-slate-600">
                    <tr>
                      <th className="p-3">Period</th>
                      <th className="p-3">Payment</th>
                      <th className="p-3">Principal</th>
                      <th className="p-3">Interest</th>
                      <th className="p-3">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.extra.rows.slice(0, 240).map((row) => (
                      <tr key={row.period} className="border-t border-slate-100">
                        <td className="p-3">{row.period}</td>
                        <td className="p-3">{currency(row.payment)}</td>
                        <td className="p-3">{currency(row.principalPaid)}</td>
                        <td className="p-3">{currency(row.interest)}</td>
                        <td className="p-3">{currency(row.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-sm text-slate-500">Showing first 240 repayment periods. Download CSV for the full schedule.</p>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

