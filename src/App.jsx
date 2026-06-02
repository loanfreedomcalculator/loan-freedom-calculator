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
  ShieldCheck,
  Split,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  FileText,
  Lightbulb,
  Target,
  Percent,
  BadgeCheck,
} from "lucide-react";

const frequencies = {
  weekly: { label: "Weekly", periodsPerYear: 52 },
  fortnightly: { label: "Fortnightly", periodsPerYear: 26 },
  monthly: { label: "Monthly", periodsPerYear: 12 },
};

const currencyOptions = {
  NZD: { label: "New Zealand Dollar", locale: "en-NZ", symbol: "$" },
  AUD: { label: "Australian Dollar", locale: "en-AU", symbol: "$" },
  USD: { label: "US Dollar", locale: "en-US", symbol: "$" },
  GBP: { label: "British Pound", locale: "en-GB", symbol: "£" },
  EUR: { label: "Euro", locale: "de-DE", symbol: "€" },
  INR: { label: "Indian Rupee", locale: "en-IN", symbol: "₹" },
};

function currency(value, currencyCode = "NZD") {
  const selected = currencyOptions[currencyCode] || currencyOptions.NZD;

  return new Intl.NumberFormat(selected.locale, {
    style: "currency",
    currency: currencyCode,
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
  const n = Number(years) * Number(periodsPerYear);
  const r = Number(annualRate) / 100 / Number(periodsPerYear);

  if (Number(principal) <= 0 || Number(years) <= 0) return 0;
  if (r === 0) return Number(principal) / n;

  return (Number(principal) * r) / (1 - Math.pow(1 + r, -n));
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

  const r = Number(annualRate) / 100 / Number(periodsPerYear);
  let balance = Number(principal);
  let period = 0;
  let totalInterest = 0;
  const maxPeriods = Number(years) * Number(periodsPerYear) * 3;
  const rows = [];

  while (balance > 0.01 && period < maxPeriods) {
    period += 1;

    const interest = balance * r;
    let payment = standardPayment + Number(extraPayment || 0);

    if (period === 1 && Number(lumpSum || 0) > 0) {
      payment += Number(lumpSum || 0);
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
    const normal = year === 0 ? principal : normalRows[index]?.balance ?? 0;
    const extra = year === 0 ? principal : extraRows[index]?.balance ?? 0;

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
      <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25">
        <Home size={23} strokeWidth={2.8} />
        <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-slate-950">
          <TrendingUp size={12} className="text-emerald-300" />
        </div>
      </div>
      <div>
        <p className="text-xl font-black tracking-tight text-slate-950">
          LoanWise NZ
        </p>
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-emerald-600">
          Smarter loan planning
        </p>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-slate-700">
        {label}
      </span>
      {children}
    </label>
  );
}

function Input(props) {
  return (
    <input
      {...props}
      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
    />
  );
}

function Select(props) {
  return (
    <select
      {...props}
      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
    />
  );
}

function Toggle({ checked, onChange, label, description }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left transition ${
        checked
          ? "border-emerald-200 bg-emerald-50"
          : "border-slate-200 bg-white hover:bg-slate-50"
      }`}
    >
      <span>
        <span className="block text-sm font-black text-slate-950">{label}</span>
        <span className="mt-1 block text-xs font-semibold leading-5 text-slate-500">
          {description}
        </span>
      </span>
      <span
        className={`ml-4 flex h-7 w-12 items-center rounded-full p-1 transition ${
          checked ? "bg-emerald-500" : "bg-slate-300"
        }`}
      >
        <span
          className={`h-5 w-5 rounded-full bg-white shadow transition ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </span>
    </button>
  );
}

function MetricCard({ icon, label, value, note, accent = "emerald" }) {
  const styles = {
    emerald: "bg-emerald-50 text-emerald-700",
    teal: "bg-teal-50 text-teal-700",
    amber: "bg-amber-50 text-amber-700",
    navy: "bg-slate-100 text-slate-800",
    blue: "bg-sky-50 text-sky-700",
  };

  return (
    <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl">
      <div
        className={`mb-4 inline-flex rounded-2xl p-3 ${
          styles[accent] || styles.emerald
        }`}
      >
        {icon}
      </div>
      <p className="text-sm font-bold text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-black tracking-tight text-slate-950">
        {value}
      </p>
      <p className="mt-1 text-sm text-slate-500">{note}</p>
    </div>
  );
}

function SectionTitle({ eyebrow, title, note }) {
  return (
    <div className="mb-5">
      <p className="text-sm font-black uppercase tracking-wide text-emerald-600">
        {eyebrow}
      </p>
      <h2 className="mt-1 text-3xl font-black tracking-tight text-slate-950">
        {title}
      </h2>
      {note && <p className="mt-2 text-sm leading-6 text-slate-500">{note}</p>}
    </div>
  );
}

export default function App() {
  const [loanType, setLoanType] = useState("Mortgage");
  const [currencyCode, setCurrencyCode] = useState("NZD");
  const [propertyPrice, setPropertyPrice] = useState(800000);
  const [depositAmount, setDepositAmount] = useState(80000);
  const [usePropertyMode, setUsePropertyMode] = useState(true);
  const [manualLoanAmount, setManualLoanAmount] = useState(650000);
  const [loanTerm, setLoanTerm] = useState(30);
  const [frequency, setFrequency] = useState("monthly");
  const [extraPayment, setExtraPayment] = useState(100);
  const [aggressiveExtraPayment, setAggressiveExtraPayment] = useState(300);
  const [lumpSum, setLumpSum] = useState(0);
  const [firstHomeBuyer, setFirstHomeBuyer] = useState(true);

  const [splits, setSplits] = useState([
    { id: 1, percentage: 50, rate: 5.99 },
    { id: 2, percentage: 30, rate: 6.49 },
    { id: 3, percentage: 20, rate: 7.1 },
  ]);

  const [rateComparisons, setRateComparisons] = useState([
    { id: 1, label: "Bank option A", rate: 5.99 },
    { id: 2, label: "Bank option B", rate: 6.49 },
    { id: 3, label: "Bank option C", rate: 6.99 },
  ]);

  const money = (value) => currency(value, currencyCode);

  const loanAmount = useMemo(() => {
    if (!usePropertyMode) return Number(manualLoanAmount || 0);
    return Math.max(0, Number(propertyPrice || 0) - Number(depositAmount || 0));
  }, [usePropertyMode, manualLoanAmount, propertyPrice, depositAmount]);

  const depositPercent = useMemo(() => {
    if (Number(propertyPrice || 0) <= 0) return 0;
    return (Number(depositAmount || 0) / Number(propertyPrice || 0)) * 100;
  }, [propertyPrice, depositAmount]);

  const periodsPerYear = frequencies[frequency].periodsPerYear;

  const splitTotalPercentage = splits.reduce(
    (sum, item) => sum + Number(item.percentage || 0),
    0
  );

  const weightedRate = useMemo(() => {
    if (splitTotalPercentage <= 0) return 0;

    return splits.reduce((sum, item) => {
      return (
        sum +
        (Number(item.percentage || 0) / splitTotalPercentage) *
          Number(item.rate || 0)
      );
    }, 0);
  }, [splits, splitTotalPercentage]);

  const splitResults = useMemo(() => {
    return splits.map((item, index) => {
      const amount = (loanAmount * Number(item.percentage || 0)) / 100;
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
      principal: loanAmount,
      annualRate: weightedRate,
      years: Number(loanTerm),
      periodsPerYear,
      extraPayment: 0,
      lumpSum: 0,
    });

    const extra = buildSchedule({
      principal: loanAmount,
      annualRate: weightedRate,
      years: Number(loanTerm),
      periodsPerYear,
      extraPayment: Number(extraPayment),
      lumpSum: Number(lumpSum),
    });

    const aggressive = buildSchedule({
      principal: loanAmount,
      annualRate: weightedRate,
      years: Number(loanTerm),
      periodsPerYear,
      extraPayment: Number(aggressiveExtraPayment),
      lumpSum: Number(lumpSum),
    });

    return {
      normal,
      extra,
      aggressive,
      interestSaved: normal.totalInterest - extra.totalInterest,
      aggressiveInterestSaved: normal.totalInterest - aggressive.totalInterest,
      timeSaved: normal.payoffPeriods - extra.payoffPeriods,
      aggressiveTimeSaved: normal.payoffPeriods - aggressive.payoffPeriods,
      chartData: yearlyChartData(
        normal.rows,
        extra.rows,
        periodsPerYear,
        loanAmount
      ),
    };
  }, [
    loanAmount,
    weightedRate,
    loanTerm,
    periodsPerYear,
    extraPayment,
    aggressiveExtraPayment,
    lumpSum,
  ]);

  const frequencyComparison = useMemo(() => {
    return Object.entries(frequencies).map(([key, item]) => {
      const splitRepayment = splits.reduce((sum, split) => {
        const amount = (loanAmount * Number(split.percentage || 0)) / 100;
        return (
          sum +
          calculatePayment(
            amount,
            Number(split.rate || 0),
            Number(loanTerm),
            item.periodsPerYear
          )
        );
      }, 0);

      return {
        key,
        label: item.label,
        repayment: splitRepayment,
        withExtra:
          splitRepayment +
          (key === frequency ? Number(extraPayment || 0) : 0),
      };
    });
  }, [splits, loanAmount, loanTerm, frequency, extraPayment]);

  const rateComparisonResults = useMemo(() => {
    const lowestPayment = Math.min(
      ...rateComparisons.map((item) =>
        calculatePayment(
          loanAmount,
          Number(item.rate || 0),
          Number(loanTerm),
          periodsPerYear
        )
      )
    );

    return rateComparisons.map((item) => {
      const repayment = calculatePayment(
        loanAmount,
        Number(item.rate || 0),
        Number(loanTerm),
        periodsPerYear
      );

      const schedule = buildSchedule({
        principal: loanAmount,
        annualRate: Number(item.rate || 0),
        years: Number(loanTerm),
        periodsPerYear,
        extraPayment: 0,
        lumpSum: 0,
      });

      return {
        ...item,
        repayment,
        totalInterest: schedule.totalInterest,
        difference: repayment - lowestPayment,
      };
    });
  }, [rateComparisons, loanAmount, loanTerm, periodsPerYear]);

  const loanWiseScore = useMemo(() => {
    let score = 50;

    if (depositPercent >= 20) score += 20;
    else if (depositPercent >= 15) score += 12;
    else if (depositPercent >= 10) score += 6;
    else score -= 5;

    if (Number(loanTerm) <= 20) score += 10;
    else if (Number(loanTerm) <= 25) score += 6;
    else if (Number(loanTerm) > 30) score -= 8;

    if (weightedRate <= 6) score += 8;
    else if (weightedRate <= 7) score += 4;
    else if (weightedRate >= 8) score -= 5;

    if (Number(extraPayment || 0) > 0) score += 10;
    if (splitTotalPercentage === 100) score += 7;
    else score -= 10;

    if (firstHomeBuyer && depositPercent < 20) score -= 3;

    return Math.max(0, Math.min(100, Math.round(score)));
  }, [
    depositPercent,
    loanTerm,
    weightedRate,
    extraPayment,
    splitTotalPercentage,
    firstHomeBuyer,
  ]);

  const scoreLabel = useMemo(() => {
    if (loanWiseScore >= 85) return "Strong position";
    if (loanWiseScore >= 70) return "Healthy plan";
    if (loanWiseScore >= 50) return "Needs review";
    return "Higher risk estimate";
  }, [loanWiseScore]);

  const recommendations = useMemo(() => {
    const tips = [];

    if (usePropertyMode) {
      tips.push(
        `Your estimated loan required is ${money(
          loanAmount
        )}, based on a ${depositPercent.toFixed(1)}% deposit.`
      );
    }

    if (firstHomeBuyer) {
      tips.push(
        "First-home buyer mode is on. Keep space for legal costs, moving costs, insurance, and possible lender conditions."
      );
    }

    if (depositPercent < 20 && usePropertyMode) {
      tips.push(
        "Your deposit is below 20%, so some lenders may treat this as a low-equity loan and apply extra conditions."
      );
    } else if (depositPercent >= 20 && usePropertyMode) {
      tips.push(
        "Your deposit is 20% or above, which may put you in a stronger position compared with a low-deposit loan."
      );
    }

    if (splitTotalPercentage !== 100) {
      tips.push(
        "Your split percentages do not total 100%. Adjust them to improve the accuracy of your split mortgage estimate."
      );
    } else {
      tips.push(
        "Your split mortgage percentages total 100%, so the split-rate estimate is balanced."
      );
    }

    if (Number(extraPayment || 0) > 0) {
      tips.push(
        `Adding ${money(Number(extraPayment))} extra each ${frequencies[
          frequency
        ].label.toLowerCase()} could save around ${money(
          results.interestSaved
        )} in estimated interest.`
      );
    } else {
      tips.push(
        "Try adding a small extra repayment to see how much interest and time you could save."
      );
    }

    if (Number(loanTerm) >= 30) {
      tips.push(
        "A long loan term can lower repayments, but it usually increases total interest over the life of the loan."
      );
    }

    return tips;
  }, [
    usePropertyMode,
    loanAmount,
    depositPercent,
    firstHomeBuyer,
    splitTotalPercentage,
    extraPayment,
    frequency,
    results.interestSaved,
    loanTerm,
  ]);


  const aiCoach = useMemo(() => {
    const actions = [];
    let riskLevel = "Balanced";
    let headline = "Your plan is moving in the right direction.";
    let insight = "LoanWise AI Coach reviews your deposit, split rates, repayment strategy, and LoanWise Score to suggest practical next steps.";

    if (loanWiseScore >= 85) {
      riskLevel = "Strong";
      headline = "You have a strong estimated loan position.";
      insight = "Your deposit, repayment strategy, and split-rate setup look healthy. You can use scenario comparison to test whether a shorter loan term creates worthwhile savings.";
    } else if (loanWiseScore >= 70) {
      riskLevel = "Healthy";
      headline = "Your plan looks healthy, with room to optimise.";
      insight = "Your numbers are generally balanced. The best next step is to compare a slightly higher extra repayment or a shorter term against your current comfort level.";
    } else if (loanWiseScore >= 50) {
      riskLevel = "Review";
      headline = "Your plan may benefit from a few adjustments.";
      insight = "Your estimate suggests there may be opportunities to improve deposit strength, reduce interest exposure, or increase extra repayments gradually.";
    } else {
      riskLevel = "Caution";
      headline = "Your plan needs careful review before relying on it.";
      insight = "The current estimate may carry higher repayment pressure or low-equity risk. Try improving the deposit, reducing the term, or testing more conservative rates.";
    }

    if (depositPercent < 20 && usePropertyMode) {
      actions.push("Aim toward a 20% deposit scenario to see how your position changes.");
    }

    if (splitTotalPercentage !== 100) {
      actions.push("Fix the split mortgage percentages so they total exactly 100%.");
    }

    if (Number(extraPayment || 0) <= 0) {
      actions.push("Test a small extra repayment to unlock time and interest savings.");
    } else {
      actions.push(`Compare your current extra repayment against the aggressive plan to see if the extra ${money(Number(aggressiveExtraPayment || 0))} option is comfortable.`);
    }

    if (Number(loanTerm) >= 30) {
      actions.push("Try a 25-year term scenario to compare interest saved against higher repayments.");
    }

    if (weightedRate >= 7) {
      actions.push("Use the interest rate comparison table to test lower-rate options and see the repayment difference.");
    }

    return {
      riskLevel,
      headline,
      insight,
      actions: actions.slice(0, 4),
    };
  }, [
    loanWiseScore,
    depositPercent,
    usePropertyMode,
    splitTotalPercentage,
    extraPayment,
    aggressiveExtraPayment,
    loanTerm,
    weightedRate,
    money,
  ]);

  const applyAiPreset = (preset) => {
    if (preset === "conservative") {
      setLoanTerm(30);
      setExtraPayment(50);
      setAggressiveExtraPayment(150);
      setSplits([
        { id: 1, percentage: 70, rate: 5.99 },
        { id: 2, percentage: 20, rate: 6.49 },
        { id: 3, percentage: 10, rate: 6.99 },
      ]);
    }

    if (preset === "balanced") {
      setLoanTerm(25);
      setExtraPayment(150);
      setAggressiveExtraPayment(350);
      setSplits([
        { id: 1, percentage: 50, rate: 5.99 },
        { id: 2, percentage: 30, rate: 6.49 },
        { id: 3, percentage: 20, rate: 7.1 },
      ]);
    }

    if (preset === "aggressive") {
      setLoanTerm(20);
      setExtraPayment(300);
      setAggressiveExtraPayment(600);
      setSplits([
        { id: 1, percentage: 40, rate: 5.99 },
        { id: 2, percentage: 35, rate: 6.29 },
        { id: 3, percentage: 25, rate: 6.79 },
      ]);
    }

    if (preset === "improve") {
      if (usePropertyMode && depositPercent < 20) {
        setDepositAmount(Math.round(Number(propertyPrice || 0) * 0.2));
      }
      if (splitTotalPercentage !== 100) {
        setSplits([
          { id: 1, percentage: 50, rate: 5.99 },
          { id: 2, percentage: 30, rate: 6.49 },
          { id: 3, percentage: 20, rate: 7.1 },
        ]);
      }
      if (Number(extraPayment || 0) <= 0) {
        setExtraPayment(100);
      }
      if (Number(loanTerm) > 25) {
        setLoanTerm(25);
      }
    }
  };

  const scenarioRows = [
    {
      name: "Normal plan",
      extra: 0,
      repayment: results.normal.standardPayment,
      interestSaved: 0,
      timeSaved: "—",
    },
    {
      name: "Extra payment plan",
      extra: Number(extraPayment || 0),
      repayment: results.normal.standardPayment + Number(extraPayment || 0),
      interestSaved: results.interestSaved,
      timeSaved: formatYearsMonths(results.timeSaved, periodsPerYear),
    },
    {
      name: "Aggressive payoff plan",
      extra: Number(aggressiveExtraPayment || 0),
      repayment:
        results.normal.standardPayment + Number(aggressiveExtraPayment || 0),
      interestSaved: results.aggressiveInterestSaved,
      timeSaved: formatYearsMonths(results.aggressiveTimeSaved, periodsPerYear),
    },
  ];

  const resetExample = () => {
    setLoanType("Mortgage");
    setCurrencyCode("NZD");
    setPropertyPrice(800000);
    setDepositAmount(80000);
    setUsePropertyMode(true);
    setManualLoanAmount(650000);
    setLoanTerm(30);
    setFrequency("monthly");
    setExtraPayment(100);
    setAggressiveExtraPayment(300);
    setLumpSum(0);
    setFirstHomeBuyer(true);
    setSplits([
      { id: 1, percentage: 50, rate: 5.99 },
      { id: 2, percentage: 30, rate: 6.49 },
      { id: 3, percentage: 20, rate: 7.1 },
    ]);
    setRateComparisons([
      { id: 1, label: "Bank option A", rate: 5.99 },
      { id: 2, label: "Bank option B", rate: 6.49 },
      { id: 3, label: "Bank option C", rate: 6.99 },
    ]);
  };

  const addSplit = () => {
    setSplits([
      ...splits,
      {
        id: Date.now(),
        percentage: 0,
        rate: Number(weightedRate.toFixed(2)) || 6,
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

  const addRateComparison = () => {
    setRateComparisons([
      ...rateComparisons,
      {
        id: Date.now(),
        label: `Bank option ${String.fromCharCode(65 + rateComparisons.length)}`,
        rate: Number(weightedRate.toFixed(2)) || 6,
      },
    ]);
  };

  const updateRateComparison = (id, field, value) => {
    setRateComparisons(
      rateComparisons.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const removeRateComparison = (id) => {
    if (rateComparisons.length <= 1) return;
    setRateComparisons(rateComparisons.filter((item) => item.id !== id));
  };

  const printPdfReport = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <style>{`
        @media print {
          header, nav, .no-print, button, a[href="#calculator"], a[href="#features"] {
            display: none !important;
          }
          body {
            background: white !important;
          }
          section, div {
            box-shadow: none !important;
          }
        }
      `}</style>

      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Logo />

          <nav className="hidden items-center gap-7 text-sm font-bold text-slate-600 md:flex">
            <a href="#calculator" className="hover:text-emerald-600">
              Calculator
            </a>
            <a href="#features" className="hover:text-emerald-600">
              Features
            </a>
            <a href="#compare" className="hover:text-emerald-600">
              Compare
            </a>
            <a href="#ai-coach" className="hover:text-emerald-600">
              AI Coach
            </a>
            <a href="#recommendations" className="hover:text-emerald-600">
              Tips
            </a>
          </nav>

          <a
            href="#calculator"
            className="hidden rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg shadow-slate-950/10 transition hover:bg-emerald-600 sm:inline-flex"
          >
            Start calculating
          </a>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden bg-gradient-to-b from-white via-emerald-50/40 to-slate-50">
          <div className="absolute left-[-10rem] top-24 h-72 w-72 rounded-full bg-emerald-200/60 blur-3xl" />
          <div className="absolute right-[-10rem] top-40 h-72 w-72 rounded-full bg-teal-200/50 blur-3xl" />

          <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-20">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-black text-emerald-700 shadow-sm">
                <Sparkles size={16} />
                NZ mortgage and loan planning tool
              </div>

              <h1 className="max-w-4xl text-5xl font-black leading-[1.02] tracking-tight text-slate-950 sm:text-6xl lg:text-7xl">
                Plan smarter before you borrow.
              </h1>

              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
                Calculate property price, deposit, split mortgage rates, extra
                repayments, frequency comparisons, LoanWise Score, and a simple
                PDF-ready report in one clean dashboard.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a
                  href="#calculator"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-500 px-7 py-4 text-base font-black text-white shadow-xl shadow-emerald-500/25 transition hover:bg-emerald-600"
                >
                  Use calculator <ArrowRight size={18} />
                </a>

                <button
                  type="button"
                  onClick={printPdfReport}
                  className="no-print inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-7 py-4 text-base font-black text-slate-800 shadow-sm transition hover:border-emerald-300 hover:text-emerald-700"
                >
                  <FileText size={18} /> Download PDF report
                </button>
              </div>

              <div className="mt-10 grid max-w-3xl gap-3 sm:grid-cols-3">
                {[
                  "Property + deposit calculator",
                  "Split mortgage calculator",
                  "LoanWise AI Coach",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-2 rounded-2xl bg-white p-4 text-sm font-bold text-slate-700 shadow-sm"
                  >
                    <CheckCircle2 size={18} className="text-emerald-500" />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-200/80">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-black uppercase tracking-wide text-emerald-600">
                      Live summary
                    </p>
                    <h2 className="text-2xl font-black text-slate-950">
                      LoanWise preview
                    </h2>
                  </div>
                  <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-700">
                    <BadgeCheck size={24} />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-3xl bg-slate-950 p-5 text-white">
                    <p className="text-sm font-bold text-slate-300">
                      LoanWise Score
                    </p>
                    <div className="mt-2 flex items-end justify-between gap-4">
                      <p className="text-5xl font-black">{loanWiseScore}</p>
                      <p className="mb-2 text-sm font-black text-emerald-300">
                        / 100
                      </p>
                    </div>
                    <p className="mt-2 text-sm text-slate-300">{scoreLabel}</p>
                    <div className="mt-4 h-3 rounded-full bg-white/10">
                      <div
                        className="h-3 rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"
                        style={{ width: `${loanWiseScore}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-3xl bg-emerald-50 p-5">
                      <p className="text-sm font-bold text-emerald-700">
                        Loan required
                      </p>
                      <p className="mt-1 text-2xl font-black text-slate-950">
                        {money(loanAmount)}
                      </p>
                    </div>

                    <div className="rounded-3xl bg-teal-50 p-5">
                      <p className="text-sm font-bold text-teal-700">
                        Split repayment
                      </p>
                      <p className="mt-1 text-2xl font-black text-slate-950">
                        {money(totalSplitRepayment)}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-white p-5">
                    <div className="mb-3 flex items-center justify-between text-sm font-bold">
                      <span className="text-slate-500">Deposit position</span>
                      <span className="text-emerald-600">
                        {depositPercent.toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-3 rounded-full bg-slate-100">
                      <div
                        className="h-3 rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"
                        style={{ width: `${Math.min(100, depositPercent * 4)}%` }}
                      />
                    </div>
                    <p className="mt-3 text-sm text-slate-500">
                      {depositPercent >= 20
                        ? "A 20%+ deposit may place you in a stronger position."
                        : "Below 20% deposit may involve low-equity conditions."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 inline-flex rounded-2xl bg-emerald-50 p-3 text-emerald-700">
                <Home size={24} />
              </div>
              <h3 className="text-xl font-black">Property + deposit</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Enter property price and deposit to calculate loan required and
                deposit percentage.
              </p>
            </div>

            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 inline-flex rounded-2xl bg-teal-50 p-3 text-teal-700">
                <Split size={24} />
              </div>
              <h3 className="text-xl font-black">Split mortgage</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Divide the loan across multiple percentages and interest rates.
              </p>
            </div>

            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 inline-flex rounded-2xl bg-sky-50 p-3 text-sky-700">
                <Target size={24} />
              </div>
              <h3 className="text-xl font-black">Scenario compare</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Compare normal, extra repayment, and aggressive payoff plans.
              </p>
            </div>

            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 inline-flex rounded-2xl bg-slate-100 p-3 text-slate-800">
                <Lightbulb size={24} />
              </div>
              <h3 className="text-xl font-black">AI Loan Coach</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Get AI-style insights, plan presets, and next-step guidance based on your inputs.
              </p>
            </div>
          </div>
        </section>

        <section
          id="calculator"
          className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[430px_1fr] lg:px-8"
        >
          <aside className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-black uppercase tracking-wide text-emerald-600">
                  Calculator
                </p>
                <h2 className="mt-1 text-3xl font-black tracking-tight">
                  Loan details
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Add property, deposit, split rates, and repayment goals.
                </p>
              </div>

              <button
                onClick={resetExample}
                className="no-print inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-3 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-200"
              >
                <RefreshCcw size={16} /> Reset
              </button>
            </div>

            <div className="space-y-5">
              <Toggle
                checked={usePropertyMode}
                onChange={setUsePropertyMode}
                label="Property price + deposit mode"
                description="Calculate the loan required from purchase price and deposit."
              />

              <Toggle
                checked={firstHomeBuyer}
                onChange={setFirstHomeBuyer}
                label="First-home buyer mode"
                description="Show extra guidance for first-home buyers."
              />

              <Field label="Loan type">
                <Select
                  value={loanType}
                  onChange={(e) => setLoanType(e.target.value)}
                >
                  <option>Mortgage</option>
                  <option>Car loan</option>
                  <option>Personal loan</option>
                </Select>
              </Field>

              <Field label="Currency">
                <Select
                  value={currencyCode}
                  onChange={(e) => setCurrencyCode(e.target.value)}
                >
                  {Object.entries(currencyOptions).map(([code, item]) => (
                    <option key={code} value={code}>
                      {code} — {item.label}
                    </option>
                  ))}
                </Select>
              </Field>

              {usePropertyMode ? (
                <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5">
                  <div className="grid gap-4">
                    <Field label="Property price">
                      <Input
                        type="number"
                        value={propertyPrice}
                        onChange={(e) => setPropertyPrice(e.target.value)}
                      />
                    </Field>

                    <Field label="Deposit amount">
                      <Input
                        type="number"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                      />
                    </Field>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-white p-4 shadow-sm">
                      <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                        Deposit
                      </p>
                      <p className="mt-1 text-xl font-black">
                        {depositPercent.toFixed(1)}%
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white p-4 shadow-sm">
                      <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                        Loan required
                      </p>
                      <p className="mt-1 text-xl font-black">
                        {money(loanAmount)}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <Field label="Loan amount">
                  <Input
                    type="number"
                    value={manualLoanAmount}
                    onChange={(e) => setManualLoanAmount(e.target.value)}
                  />
                </Field>
              )}

              <Field label="Loan term in years">
                <Input
                  type="number"
                  value={loanTerm}
                  onChange={(e) => setLoanTerm(e.target.value)}
                />
              </Field>

              <Field label="Repayment frequency">
                <Select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                >
                  {Object.entries(frequencies).map(([key, item]) => (
                    <option key={key} value={key}>
                      {item.label}
                    </option>
                  ))}
                </Select>
              </Field>

              <div className="rounded-[1.75rem] border border-emerald-100 bg-emerald-50/70 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-black uppercase tracking-wide text-emerald-700">
                      Split interest rates
                    </p>
                    <h3 className="text-xl font-black text-slate-950">
                      Divide mortgage by rate
                    </h3>
                  </div>

                  <button
                    onClick={addSplit}
                    className="no-print inline-flex items-center gap-1 rounded-full bg-emerald-500 px-4 py-2 text-sm font-black text-white shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-600"
                  >
                    <Plus size={16} /> Add
                  </button>
                </div>

                <div className="space-y-3">
                  {splits.map((item, index) => (
                    <div
                      key={item.id}
                      className="rounded-3xl border border-emerald-100 bg-white p-4 shadow-sm"
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-sm font-black text-slate-950">
                          Split {index + 1}
                        </p>
                        <button
                          onClick={() => removeSplit(item.id)}
                          className="no-print rounded-full p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Percentage %">
                          <Input
                            type="number"
                            value={item.percentage}
                            onChange={(e) =>
                              updateSplit(
                                item.id,
                                "percentage",
                                e.target.value
                              )
                            }
                          />
                        </Field>

                        <Field label="Interest %">
                          <Input
                            type="number"
                            step="0.01"
                            value={item.rate}
                            onChange={(e) =>
                              updateSplit(item.id, "rate", e.target.value)
                            }
                          />
                        </Field>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 rounded-3xl bg-white p-4 shadow-sm">
                  <p className="text-sm font-bold text-slate-500">
                    Total split percentage
                  </p>
                  <p
                    className={`text-3xl font-black ${
                      splitTotalPercentage === 100
                        ? "text-emerald-600"
                        : "text-red-600"
                    }`}
                  >
                    {splitTotalPercentage}%
                  </p>
                  {splitTotalPercentage !== 100 && (
                    <p className="mt-1 text-xs font-bold text-red-600">
                      Total should be 100% for the most accurate split estimate.
                    </p>
                  )}
                </div>
              </div>

              <Field
                label={`Extra repayment each ${frequencies[
                  frequency
                ].label.toLowerCase()}`}
              >
                <Input
                  type="number"
                  value={extraPayment}
                  onChange={(e) => setExtraPayment(e.target.value)}
                />
              </Field>

              <Field
                label={`Aggressive extra repayment each ${frequencies[
                  frequency
                ].label.toLowerCase()}`}
              >
                <Input
                  type="number"
                  value={aggressiveExtraPayment}
                  onChange={(e) => setAggressiveExtraPayment(e.target.value)}
                />
              </Field>

              <Field label="One-off lump sum payment">
                <Input
                  type="number"
                  value={lumpSum}
                  onChange={(e) => setLumpSum(e.target.value)}
                />
              </Field>
            </div>
          </aside>

          <section className="space-y-6">
            <div className="grid gap-4 md:grid-cols-5">
              <MetricCard
                icon={<Home size={23} />}
                label="Loan required"
                value={money(loanAmount)}
                note={`${depositPercent.toFixed(1)}% deposit`}
                accent="blue"
              />

              <MetricCard
                icon={<Calculator size={23} />}
                label="Split repayment"
                value={money(totalSplitRepayment)}
                note={`per ${frequencies[frequency].label.toLowerCase()}`}
                accent="emerald"
              />

              <MetricCard
                icon={<Percent size={23} />}
                label="Weighted rate"
                value={`${weightedRate.toFixed(2)}%`}
                note="based on split rates"
                accent="teal"
              />

              <MetricCard
                icon={<Clock size={23} />}
                label="Time saved"
                value={formatYearsMonths(results.timeSaved, periodsPerYear)}
                note="with extra repayments"
                accent="amber"
              />

              <MetricCard
                icon={<DollarSign size={23} />}
                label="Interest saved"
                value={money(results.interestSaved)}
                note="estimated saving"
                accent="navy"
              />
            </div>

            <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
              <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60">
                <SectionTitle
                  eyebrow="LoanWise Score"
                  title={`${loanWiseScore} / 100`}
                  note={scoreLabel}
                />
                <div className="h-4 rounded-full bg-slate-100">
                  <div
                    className="h-4 rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"
                    style={{ width: `${loanWiseScore}%` }}
                  />
                </div>
                <p className="mt-4 text-sm leading-6 text-slate-600">
                  Score is based on deposit position, loan term, weighted rate,
                  extra repayment habit, and split percentage accuracy.
                </p>
              </div>

              <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60">
                <SectionTitle
                  eyebrow="Smart summary"
                  title="Your LoanWise result"
                />
                <p className="text-xl font-semibold leading-9 text-slate-700">
                  Your estimated loan required is{" "}
                  <span className="font-black text-slate-950">
                    {money(loanAmount)}
                  </span>
                  . Your split-loan repayment is approximately{" "}
                  <span className="font-black text-slate-950">
                    {money(totalSplitRepayment)}
                  </span>{" "}
                  per {frequencies[frequency].label.toLowerCase()} using a
                  weighted average rate of{" "}
                  <span className="font-black text-slate-950">
                    {weightedRate.toFixed(2)}%
                  </span>
                  . Adding{" "}
                  <span className="font-black text-slate-950">
                    {money(Number(extraPayment))}
                  </span>{" "}
                  extra could save around{" "}
                  <span className="font-black text-emerald-600">
                    {money(results.interestSaved)}
                  </span>
                  .
                </p>
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60">
              <SectionTitle
                eyebrow="Visual forecast"
                title="Loan balance comparison"
                note="Normal plan vs extra repayment plan"
              />

              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={results.chartData}
                    margin={{ top: 10, right: 20, bottom: 10, left: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="year"
                      tickFormatter={(value) => `Y${value}`}
                      stroke="#64748b"
                    />
                    <YAxis
                      tickFormatter={(value) =>
                        `$${Math.round(value / 1000)}k`
                      }
                      stroke="#64748b"
                    />
                    <Tooltip
                      formatter={(value) => money(value)}
                      labelFormatter={(value) => `Year ${value}`}
                    />
                    <Line
                      type="monotone"
                      dataKey="normal"
                      name="Normal plan"
                      stroke="#0f172a"
                      strokeWidth={4}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="extra"
                      name="Extra payment plan"
                      stroke="#10b981"
                      strokeWidth={4}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60">
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <SectionTitle
                  eyebrow="Interest rate comparison"
                  title="Compare rate options"
                  note={`Compare different bank or fixed-rate options using your current ${frequencies[frequency].label.toLowerCase()} frequency.`}
                />

                <button
                  onClick={addRateComparison}
                  className="no-print inline-flex items-center justify-center gap-2 rounded-full bg-emerald-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-600"
                >
                  <Plus size={16} /> Add rate
                </button>
              </div>

              <div className="grid gap-3 lg:grid-cols-3">
                {rateComparisonResults.map((item, index) => (
                  <div
                    key={item.id}
                    className="rounded-3xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="text-sm font-black text-slate-500">
                        Option {index + 1}
                      </p>
                      <button
                        onClick={() => removeRateComparison(item.id)}
                        className="no-print rounded-full p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="space-y-3">
                      <Field label="Option name">
                        <Input
                          type="text"
                          value={item.label}
                          onChange={(e) =>
                            updateRateComparison(item.id, "label", e.target.value)
                          }
                        />
                      </Field>

                      <Field label="Interest rate %">
                        <Input
                          type="number"
                          step="0.01"
                          value={item.rate}
                          onChange={(e) =>
                            updateRateComparison(item.id, "rate", e.target.value)
                          }
                        />
                      </Field>
                    </div>

                    <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
                      <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                        Repayment
                      </p>
                      <p className="mt-1 text-2xl font-black text-slate-950">
                        {money(item.repayment)}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-500">
                        per {frequencies[frequency].label.toLowerCase()}
                      </p>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <div className="rounded-2xl bg-white p-3">
                        <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                          Total interest
                        </p>
                        <p className="font-black text-slate-950">
                          {money(item.totalInterest)}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-white p-3">
                        <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                          Difference
                        </p>
                        <p
                          className={`font-black ${
                            item.difference <= 0
                              ? "text-emerald-600"
                              : "text-amber-600"
                          }`}
                        >
                          {item.difference <= 0
                            ? "Best"
                            : `+${money(item.difference)}`}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div id="compare" className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60">
                <SectionTitle
                  eyebrow="Frequency comparison"
                  title="Weekly vs fortnightly vs monthly"
                  note="See estimated repayments across common payment frequencies."
                />

                <div className="space-y-3">
                  {frequencyComparison.map((item) => (
                    <div
                      key={item.key}
                      className="flex items-center justify-between rounded-3xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div>
                        <p className="font-black text-slate-950">
                          {item.label}
                        </p>
                        <p className="text-sm font-semibold text-slate-500">
                          Estimated repayment
                        </p>
                      </div>
                      <p className="text-xl font-black text-slate-950">
                        {money(item.repayment)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60">
                <SectionTitle
                  eyebrow="Scenario comparison"
                  title="Compare repayment strategies"
                  note="Normal, extra repayment, and aggressive payoff plan."
                />

                <div className="space-y-3">
                  {scenarioRows.map((row) => (
                    <div
                      key={row.name}
                      className="rounded-3xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-black text-slate-950">
                            {row.name}
                          </p>
                          <p className="text-sm font-semibold text-slate-500">
                            Extra: {money(row.extra)} per{" "}
                            {frequencies[frequency].label.toLowerCase()}
                          </p>
                        </div>
                        <p className="text-xl font-black text-slate-950">
                          {money(row.repayment)}
                        </p>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-3">
                        <div className="rounded-2xl bg-white p-3">
                          <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                            Interest saved
                          </p>
                          <p className="font-black text-emerald-600">
                            {money(row.interestSaved)}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-white p-3">
                          <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                            Time saved
                          </p>
                          <p className="font-black text-slate-950">
                            {row.timeSaved}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60">
              <SectionTitle
                eyebrow="Split breakdown"
                title="Mortgage portions"
                note={`Based on total loan ${money(loanAmount)}`}
              />

              <div className="overflow-x-auto rounded-3xl border border-slate-200">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-100 text-slate-600">
                    <tr>
                      <th className="p-4">Split</th>
                      <th className="p-4">Percentage</th>
                      <th className="p-4">Rate</th>
                      <th className="p-4">Amount</th>
                      <th className="p-4">Repayment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {splitResults.map((item) => (
                      <tr key={item.id} className="border-t border-slate-100">
                        <td className="p-4 font-black">{item.name}</td>
                        <td className="p-4">{item.percentage}%</td>
                        <td className="p-4">
                          {Number(item.rate).toFixed(2)}%
                        </td>
                        <td className="p-4">{money(item.amount)}</td>
                        <td className="p-4 font-black">
                          {money(item.repayment)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>


            <div
              id="ai-coach"
              className="rounded-[2rem] border border-emerald-200 bg-gradient-to-br from-white via-emerald-50/60 to-teal-50 p-6 shadow-xl shadow-slate-200/60"
            >
              <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <SectionTitle
                  eyebrow="LoanWise AI Coach"
                  title={aiCoach.headline}
                  note="AI-style guidance powered by smart rules inside your calculator. No API key required."
                />
                <div className="rounded-3xl bg-slate-950 px-5 py-4 text-white">
                  <p className="text-xs font-black uppercase tracking-wide text-emerald-300">
                    Plan status
                  </p>
                  <p className="mt-1 text-2xl font-black">{aiCoach.riskLevel}</p>
                </div>
              </div>

              <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm">
                  <div className="mb-3 inline-flex rounded-2xl bg-emerald-50 p-3 text-emerald-700">
                    <Sparkles size={22} />
                  </div>
                  <p className="text-sm font-black uppercase tracking-wide text-emerald-600">
                    AI Insight
                  </p>
                  <p className="mt-2 text-base font-semibold leading-7 text-slate-700">
                    {aiCoach.insight}
                  </p>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => applyAiPreset("conservative")}
                      className="no-print rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-black text-slate-800 transition hover:border-emerald-300 hover:bg-emerald-50"
                    >
                      Conservative plan
                      <span className="mt-1 block text-xs font-semibold text-slate-500">
                        Lower extra payment, longer term
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => applyAiPreset("balanced")}
                      className="no-print rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-left text-sm font-black text-emerald-800 transition hover:bg-emerald-100"
                    >
                      Balanced plan
                      <span className="mt-1 block text-xs font-semibold text-emerald-700">
                        Moderate extra payment, 25-year test
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => applyAiPreset("aggressive")}
                      className="no-print rounded-2xl border border-slate-200 bg-slate-950 px-4 py-3 text-left text-sm font-black text-white transition hover:bg-emerald-600"
                    >
                      Aggressive payoff
                      <span className="mt-1 block text-xs font-semibold text-slate-300">
                        Higher repayments, shorter term
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => applyAiPreset("improve")}
                      className="no-print rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3 text-left text-sm font-black text-teal-800 transition hover:bg-teal-100"
                    >
                      Improve my plan
                      <span className="mt-1 block text-xs font-semibold text-teal-700">
                        Auto-fix weak points where possible
                      </span>
                    </button>
                  </div>
                </div>

                <div className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm">
                  <p className="text-sm font-black uppercase tracking-wide text-emerald-600">
                    Suggested next moves
                  </p>
                  <div className="mt-4 space-y-3">
                    {aiCoach.actions.map((action, index) => (
                      <div key={action} className="flex gap-3 rounded-2xl bg-slate-50 p-3">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-xs font-black text-white">
                          {index + 1}
                        </div>
                        <p className="text-sm font-semibold leading-6 text-slate-700">
                          {action}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div
              id="recommendations"
              className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60"
            >
              <SectionTitle
                eyebrow="Smart recommendations"
                title="Personalised tips"
                note="These tips update automatically based on the numbers entered."
              />

              <div className="grid gap-3 md:grid-cols-2">
                {recommendations.map((tip, index) => (
                  <div
                    key={tip}
                    className="rounded-3xl border border-emerald-100 bg-emerald-50/60 p-4"
                  >
                    <div className="flex gap-3">
                      <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-sm font-black text-white">
                        {index + 1}
                      </div>
                      <p className="text-sm font-semibold leading-6 text-slate-700">
                        {tip}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60">
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <SectionTitle
                  eyebrow="Report + schedule"
                  title="Amortisation schedule"
                  note="Download CSV or use the PDF report button."
                />

                <div className="no-print flex flex-col gap-3 sm:flex-row">
                  <button
                    onClick={printPdfReport}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-500 px-6 py-3 text-sm font-black text-white shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-600"
                  >
                    <FileText size={16} /> Download PDF Report
                  </button>

                  <button
                    onClick={() => downloadCsv(results.extra.rows)}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white shadow-lg shadow-slate-950/10 transition hover:bg-emerald-600"
                  >
                    <Download size={16} /> Download CSV
                  </button>
                </div>
              </div>

              <div className="max-h-96 overflow-auto rounded-3xl border border-slate-200">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-slate-100 text-slate-600">
                    <tr>
                      <th className="p-4">Period</th>
                      <th className="p-4">Payment</th>
                      <th className="p-4">Principal</th>
                      <th className="p-4">Interest</th>
                      <th className="p-4">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.extra.rows.slice(0, 240).map((row) => (
                      <tr key={row.period} className="border-t border-slate-100">
                        <td className="p-4">{row.period}</td>
                        <td className="p-4">{money(row.payment)}</td>
                        <td className="p-4">{money(row.principalPaid)}</td>
                        <td className="p-4">{money(row.interest)}</td>
                        <td className="p-4 font-black">
                          {money(row.balance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="mt-3 text-sm text-slate-500">
                Showing first 240 repayment periods. Download CSV for the full
                schedule.
              </p>
            </div>
          </section>
        </section>

        <footer className="mt-12 border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
            <div className="grid gap-6 md:grid-cols-[1fr_1.5fr] md:items-center">
              <Logo />
              <div className="rounded-3xl bg-slate-50 p-5">
                <p className="text-sm leading-6 text-slate-600">
                  LoanWise NZ provides estimates only. Results are based on the
                  information entered and may not include all fees, bank rules,
                  low-equity margins, cashback terms, break fees, insurance, or
                  individual lending conditions. This is not financial advice.
                  Please speak with a qualified mortgage adviser or lender before
                  making financial decisions.
                </p>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}

