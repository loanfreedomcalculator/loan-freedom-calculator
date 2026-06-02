import React, { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  Calculator,
  Clock,
  DollarSign,
  Download,
  RefreshCcw,
  Plus,
  Trash2,
  TrendingUp,
  Home,
} from "lucide-react";

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
  return `${years} year${years === 1 ? "" : "s"} ${months} month${
    months === 1 ? "" : "s"
  }`;
}

function calculatePayment(principal, annualRate, years, periodsPerYear) {
  const n = years * periodsPerYear;
  const r = annualRate / 100 / periodsPerYear;

  if (principal <= 0 || years <= 0) return 0;
  if (r === 0) return principal / n;

  return (principal * r) / (1 - Math.pow(1 + r, -n));
}

function buildSchedule({
  principal,
  annualRate,
  years,
  periodsPerYear,
  extraPayment,
  lumpSum,
}) {
  const standardPayment = calculatePayment(
    principal,
    annualRate,
    years,
    periodsPerYear
  );

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

function yearlyChartData(normalRows, extraRows, periodsPerYear, principal) {
  const maxYears = Math.ceil(
    Math.max(normalRows.length, extraRows.length) / periodsPerYear
  );

  const data = [];

  for (let year = 0; year <= maxYears; year++) {
    const index = Math.max(0, year * periodsPerYear - 1);

    const normal =
      year === 0 ? principal : normalRows[index]?.balance ?? 0;

    const extra =
      year === 0 ? principal : extraRows[index]?.balance ?? 0;

    data.push({
      year,
      normal: Math.round(normal),
      extra: Math.round(extra),
    });
  }

  return data;
}

function downloadCsv(rows) {
  const header = "Period,Payment,Principal,Interest,Balance\n";
  const body = rows
    .map((row) =>
      [
        row.period,
        row.payment.toFixed(2),
        row.principalPaid.toFixed(2),
        row.interest.toFixed(2),
        row.balance.toFixed(2),
      ].join(",")
    )
    .join("\n");

  const blob = new Blob([header + body], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "loanwise-nz-schedule.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-400/30">
        <TrendingUp size={26} strokeWidth={3} />
      </div>
      <div>
        <p className="text-xl font-black tracking-tight text-white">
          LoanWise NZ
        </p>
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-emerald-200">
          Smarter loan planning
        </p>
      </div>
    </div>
  );
}

export default function App() {
  const [loanType, setLoanType] = useState("Mortgage");
  const [loanAmount, setLoanAmount] = useState(650000);
  const [interestRate, setInterestRate] = useState(6.25);
  const [loanTerm, setLoanTerm] = useState(30);
  const [frequency, setFrequency] = useState("monthly");
  const [extraPayment, setExtraPayment] = useState(100);
  const [lumpSum, setLumpSum] = useState(0);

  const [splits, setSplits] = useState([
    { id: 1, percentage: 50, rate: 5.99 },
    { id: 2, percentage: 30, rate: 6.49 },
    { id: 3, percentage: 20, rate: 7.1 },
  ]);

  const periodsPerYear = frequencies[frequency].periodsPerYear;

  const splitTotalPercentage = splits.reduce(
    (sum, item) => sum + Number(item.percentage || 0),
    0
  );

  const weightedRate = useMemo(() => {
    if (splitTotalPercentage <= 0) return Number(interestRate);

    return (
      splits.reduce((sum, item) => {
        return (
          sum +
          (Number(item.percentage || 0) / splitTotalPercentage) *
            Number(item.rate || 0)
        );
      }, 0)
    );
  }, [splits, splitTotalPercentage, interestRate]);

  const splitResults = useMemo(() => {
    return splits.map((item, index) => {
      const amount =
        (Number(loanAmount || 0) * Number(item.percentage || 0)) / 100;

      const repayment = calculatePayment(
        amount,
        Number(item.rate || 0),
        Number(loanTerm),
        periodsPerYear
      );

      return {
        ...item,
        name: `Split ${index + 1}`,
        amount,
        repayment,
      };
    });
  }, [splits, loanAmount, loanTerm, periodsPerYear]);

  const totalSplitRepayment = splitResults.reduce(
    (sum, item) => sum + item.repayment,
    0
  );

  const results = useMemo(() => {
    const normal = buildSchedule({
      principal: Number(loanAmount),
      annualRate: Number(weightedRate),
      years: Number(loanTerm),
      periodsPerYear,
      extraPayment: 0,
      lumpSum: 0,
    });

    const extra = buildSchedule({
      principal: Number(loanAmount),
      annualRate: Number(weightedRate),
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
      chartData: yearlyChartData(
        normal.rows,
        extra.rows,
        periodsPerYear,
        Number(loanAmount)
      ),
    };
  }, [
    loanAmount,
    weightedRate,
    loanTerm,
    periodsPerYear,
    extraPayment,
    lumpSum,
  ]);

  const resetExample = () => {
    setLoanType("Mortgage");
    setLoanAmount(650000);
    setInterestRate(6.25);
    setLoanTerm(30);
    setFrequency("monthly");
    setExtraPayment(100);
    setLumpSum(0);
    setSplits([
      { id: 1, percentage: 50, rate: 5.99 },
      { id: 2, percentage: 30, rate: 6.49 },
      { id: 3, percentage: 20, rate: 7.1 },
    ]);
  };

  const addSplit = () => {
    setSplits([
      ...splits,
      {
        id: Date.now(),
        percentage: 0,
        rate: Number(weightedRate.toFixed(2)),
      },
    ]);
  };

  const updateSplit = (id, field, value) => {
    setSplits(
      splits.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const removeSplit = (id) => {
    if (splits.length <= 1) return;
    setSplits(splits.filter((item) => item.id !== id));
  };

  return (
    <div className="min-h-screen bg-[#07111f] text-slate-900">
      <section className="relative overflow-hidden">
        <div className="absolute left-[-10%] top-[-20%] h-96 w-96 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="absolute right-[-10%] top-[10%] h-96 w-96 rounded-full bg-cyan-400/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <header className="mb-8 flex flex-col gap-6 rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl sm:p-8 lg:flex-row lg:items-center lg:justify-between">
            <Logo />

            <div className="max-w-2xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-300/10 px-4 py-2 text-sm font-semibold text-emerald-100">
                <Home size={16} />
                Built for NZ mortgage and personal loan planning
              </div>

              <h1 className="text-4xl font-black tracking-tight text-white sm:text-6xl">
                Plan your loan with confidence.
              </h1>

              <p className="mt-4 text-base leading-7 text-slate-300 sm:text-lg">
                Split your loan across multiple interest rates, compare extra
                repayments, and see how much time and interest you could save.
              </p>
            </div>
          </header>

          <main className="grid gap-6 lg:grid-cols-[420px_1fr]">
            <section className="rounded-[2rem] border border-white/10 bg-white p-6 shadow-xl">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-emerald-600">
                    Calculator
                  </p>
                  <h2 className="text-2xl font-black text-slate-950">
                    Loan details
                  </h2>
                </div>

                <button
                  onClick={resetExample}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200"
                >
                  <RefreshCcw size={16} /> Reset
                </button>
              </div>

              <div className="space-y-5">
                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-700">
                    Loan type
                  </span>
                  <select
                    value={loanType}
                    onChange={(e) => setLoanType(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 outline-none focus:border-emerald-500"
                  >
                    <option>Mortgage</option>
                    <option>Car loan</option>
                    <option>Personal loan</option>
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-700">
                    Loan amount
                  </span>
                  <input
                    type="number"
                    value={loanAmount}
                    onChange={(e) => setLoanAmount(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 outline-none focus:border-emerald-500"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-700">
                    Loan term in years
                  </span>
                  <input
                    type="number"
                    value={loanTerm}
                    onChange={(e) => setLoanTerm(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 outline-none focus:border-emerald-500"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-700">
                    Repayment frequency
                  </span>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 outline-none focus:border-emerald-500"
                  >
                    {Object.entries(frequencies).map(([key, item]) => (
                      <option key={key} value={key}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="rounded-3xl bg-slate-950 p-5 text-white">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-wide text-emerald-300">
                        Split interest rates
                      </p>
                      <h3 className="text-lg font-black">
                        Divide loan by rate
                      </h3>
                    </div>

                    <button
                      onClick={addSplit}
                      className="inline-flex items-center gap-1 rounded-xl bg-emerald-400 px-3 py-2 text-sm font-black text-slate-950 hover:bg-emerald-300"
                    >
                      <Plus size={16} /> Add
                    </button>
                  </div>

                  <div className="space-y-3">
                    {splits.map((item, index) => (
                      <div
                        key={item.id}
                        className="rounded-2xl border border-white/10 bg-white/10 p-3"
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <p className="text-sm font-bold text-white">
                            Split {index + 1}
                          </p>
                          <button
                            onClick={() => removeSplit(item.id)}
                            className="text-slate-300 hover:text-red-300"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <label>
                            <span className="mb-1 block text-xs text-slate-300">
                              Percentage %
                            </span>
                            <input
                              type="number"
                              value={item.percentage}
                              onChange={(e) =>
                                updateSplit(
                                  item.id,
                                  "percentage",
                                  e.target.value
                                )
                              }
                              className="w-full rounded-xl border border-white/10 bg-white p-2 text-slate-950 outline-none"
                            />
                          </label>

                          <label>
                            <span className="mb-1 block text-xs text-slate-300">
                              Interest %
                            </span>
                            <input
                              type="number"
                              step="0.01"
                              value={item.rate}
                              onChange={(e) =>
                                updateSplit(item.id, "rate", e.target.value)
                              }
                              className="w-full rounded-xl border border-white/10 bg-white p-2 text-slate-950 outline-none"
                            />
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 rounded-2xl bg-white p-4 text-slate-950">
                    <p className="text-sm font-bold text-slate-500">
                      Total split percentage
                    </p>
                    <p
                      className={`text-2xl font-black ${
                        splitTotalPercentage === 100
                          ? "text-emerald-600"
                          : "text-red-600"
                      }`}
                    >
                      {splitTotalPercentage}%
                    </p>
                    {splitTotalPercentage !== 100 && (
                      <p className="mt-1 text-xs font-semibold text-red-600">
                        Total should be 100% for accurate split calculation.
                      </p>
                    )}
                  </div>
                </div>

                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-700">
                    Extra repayment each{" "}
                    {frequencies[frequency].label.toLowerCase()}
                  </span>
                  <input
                    type="number"
                    value={extraPayment}
                    onChange={(e) => setExtraPayment(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 outline-none focus:border-emerald-500"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-700">
                    One-off lump sum payment
                  </span>
                  <input
                    type="number"
                    value={lumpSum}
                    onChange={(e) => setLumpSum(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 outline-none focus:border-emerald-500"
                  />
                </label>
              </div>
            </section>

            <section className="space-y-6">
              <div className="grid gap-4 md:grid-cols-4">
                <div className="rounded-[2rem] border border-white/10 bg-white p-6 shadow-xl">
                  <div className="mb-3 inline-flex rounded-2xl bg-emerald-100 p-3 text-emerald-700">
                    <Calculator size={22} />
                  </div>
                  <p className="text-sm font-bold text-slate-500">
                    Split repayment
                  </p>
                  <p className="mt-1 text-2xl font-black text-slate-950">
                    {currency(totalSplitRepayment)}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    per {frequencies[frequency].label.toLowerCase()}
                  </p>
                </div>

                <div className="rounded-[2rem] border border-white/10 bg-white p-6 shadow-xl">
                  <div className="mb-3 inline-flex rounded-2xl bg-cyan-100 p-3 text-cyan-700">
                    <TrendingUp size={22} />
                  </div>
                  <p className="text-sm font-bold text-slate-500">
                    Weighted rate
                  </p>
                  <p className="mt-1 text-2xl font-black text-slate-950">
                    {weightedRate.toFixed(2)}%
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    based on splits
                  </p>
                </div>

                <div className="rounded-[2rem] border border-white/10 bg-white p-6 shadow-xl">
                  <div className="mb-3 inline-flex rounded-2xl bg-amber-100 p-3 text-amber-700">
                    <Clock size={22} />
                  </div>
                  <p className="text-sm font-bold text-slate-500">
                    Time saved
                  </p>
                  <p className="mt-1 text-2xl font-black text-slate-950">
                    {formatYearsMonths(results.timeSaved, periodsPerYear)}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    with extra payments
                  </p>
                </div>

                <div className="rounded-[2rem] border border-white/10 bg-white p-6 shadow-xl">
                  <div className="mb-3 inline-flex rounded-2xl bg-violet-100 p-3 text-violet-700">
                    <DollarSign size={22} />
                  </div>
                  <p className="text-sm font-bold text-slate-500">
                    Interest saved
                  </p>
                  <p className="mt-1 text-2xl font-black text-slate-950">
                    {currency(results.interestSaved)}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    estimated saving
                  </p>
                </div>
              </div>

              <div className="rounded-[2rem] border border-white/10 bg-white p-6 shadow-xl">
                <p className="text-sm font-bold uppercase tracking-wide text-emerald-600">
                  Smart summary
                </p>
                <h2 className="mt-1 text-2xl font-black text-slate-950">
                  Your LoanWise result
                </h2>
                <p className="mt-3 text-xl font-semibold leading-8 text-slate-700">
                  Your split-loan repayment is approximately{" "}
                  <span className="font-black text-slate-950">
                    {currency(totalSplitRepayment)}
                  </span>{" "}
                  per {frequencies[frequency].label.toLowerCase()} using a
                  weighted average rate of{" "}
                  <span className="font-black text-slate-950">
                    {weightedRate.toFixed(2)}%
                  </span>
                  . By paying{" "}
                  <span className="font-black text-slate-950">
                    {currency(Number(extraPayment))}
                  </span>{" "}
                  extra each {frequencies[frequency].label.toLowerCase()}, you
                  could finish about{" "}
                  <span className="font-black text-slate-950">
                    {formatYearsMonths(results.timeSaved, periodsPerYear)}
                  </span>{" "}
                  earlier and save around{" "}
                  <span className="font-black text-emerald-600">
                    {currency(results.interestSaved)}
                  </span>{" "}
                  in interest.
                </p>
              </div>

              <div className="rounded-[2rem] border border-white/10 bg-white p-6 shadow-xl">
                <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-wide text-emerald-600">
                      Split breakdown
                    </p>
                    <h2 className="text-2xl font-black text-slate-950">
                      Loan portions
                    </h2>
                  </div>
                  <p className="text-sm font-semibold text-slate-500">
                    Based on total loan {currency(Number(loanAmount))}
                  </p>
                </div>

                <div className="overflow-hidden rounded-2xl border border-slate-200">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-100 text-slate-600">
                      <tr>
                        <th className="p-3">Split</th>
                        <th className="p-3">Percentage</th>
                        <th className="p-3">Rate</th>
                        <th className="p-3">Amount</th>
                        <th className="p-3">Repayment</th>
                      </tr>
                    </thead>
                    <tbody>
                      {splitResults.map((item) => (
                        <tr key={item.id} className="border-t border-slate-100">
                          <td className="p-3 font-bold">{item.name}</td>
                          <td className="p-3">{item.percentage}%</td>
                          <td className="p-3">{Number(item.rate).toFixed(2)}%</td>
                          <td className="p-3">{currency(item.amount)}</td>
                          <td className="p-3 font-bold">
                            {currency(item.repayment)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-[2rem] border border-white/10 bg-white p-6 shadow-xl">
                <div className="mb-4">
                  <p className="text-sm font-bold uppercase tracking-wide text-emerald-600">
                    Visual forecast
                  </p>
                  <h2 className="text-2xl font-black text-slate-950">
                    Loan balance comparison
                  </h2>
                </div>

                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={results.chartData}
                      margin={{ top: 10, right: 20, bottom: 10, left: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="year"
                        tickFormatter={(value) => `Y${value}`}
                      />
                      <YAxis
                        tickFormatter={(value) =>
                          `$${Math.round(value / 1000)}k`
                        }
                      />
                      <Tooltip
                        formatter={(value) => currency(value)}
                        labelFormatter={(value) => `Year ${value}`}
                      />
                      <Line
                        type="monotone"
                        dataKey="normal"
                        name="Normal plan"
                        strokeWidth={4}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="extra"
                        name="Extra payment plan"
                        strokeWidth={4}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-[2rem] border border-white/10 bg-white p-6 shadow-xl">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-wide text-emerald-600">
                      Repayment table
                    </p>
                    <h2 className="text-2xl font-black text-slate-950">
                      Amortisation schedule
                    </h2>
                  </div>

                  <button
                    onClick={() => downloadCsv(results.extra.rows)}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-emerald-600"
                  >
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
                          <td className="p-3 font-bold">
                            {currency(row.balance)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <p className="mt-3 text-sm text-slate-500">
                  Showing first 240 repayment periods. Download CSV for the full
                  schedule. Estimate only, not financial advice.
                </p>
              </div>
            </section>
          </main>
        </div>
      </section>
    </div>
  );
}