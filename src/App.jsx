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
  Copy,
  Mail,
  HelpCircle,
  Users,
  WalletCards,
  Gauge,
} from "lucide-react";

const frequencies = {
  weekly: { label: "Weekly", periodsPerYear: 52 },
  fortnightly: { label: "Fortnightly", periodsPerYear: 26 },
  monthly: { label: "Monthly", periodsPerYear: 12 },
};

const currencyOptions = {
  NZD: { label: "New Zealand Dollar", locale: "en-NZ" },
  AUD: { label: "Australian Dollar", locale: "en-AU" },
  USD: { label: "US Dollar", locale: "en-US" },
  GBP: { label: "British Pound", locale: "en-GB" },
  EUR: { label: "Euro", locale: "de-DE" },
  INR: { label: "Indian Rupee", locale: "en-IN" },
};

function formatMoney(value, currencyCode = "NZD") {
  const option = currencyOptions[currencyCode] || currencyOptions.NZD;
  return new Intl.NumberFormat(option.locale, {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 0,
  }).format(Number.isFinite(Number(value)) ? Number(value) : 0);
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

  if (Number(principal) <= 0 || Number(years) <= 0 || Number(periodsPerYear) <= 0) return 0;
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
    data.push({
      year,
      normal: Math.round(year === 0 ? principal : normalRows[index]?.balance ?? 0),
      extra: Math.round(year === 0 ? principal : extraRows[index]?.balance ?? 0),
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
      <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25">
        <Home size={22} strokeWidth={2.8} />
        <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-slate-950">
          <TrendingUp size={12} className="text-emerald-300" />
        </div>
      </div>
      <div>
        <p className="text-lg font-black tracking-tight text-slate-950">
          LoanWise NZ
        </p>
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-600">
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

function ResultTile({ icon, label, value, note, tone = "emerald" }) {
  const colors = {
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
    teal: "bg-teal-50 text-teal-700 border-teal-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    slate: "bg-slate-50 text-slate-700 border-slate-200",
    sky: "bg-sky-50 text-sky-700 border-sky-100",
  };

  return (
    <div className={`rounded-3xl border p-4 ${colors[tone] || colors.emerald}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
          {label}
        </p>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-900 shadow-sm">
          {icon}
        </div>
      </div>
      <p className="break-words text-2xl font-black leading-tight text-slate-950">
        {value}
      </p>
      <p className="mt-2 text-sm font-black">{note}</p>
    </div>
  );
}

function SectionTitle({ eyebrow, title, note }) {
  return (
    <div className="mb-5">
      <p className="text-sm font-black uppercase tracking-wide text-emerald-600">
        {eyebrow}
      </p>
      <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
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
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [savedEstimate, setSavedEstimate] = useState(false);
  const [annualIncome, setAnnualIncome] = useState(120000);
  const [monthlyExpenses, setMonthlyExpenses] = useState(3500);
  const [selectedAdviser, setSelectedAdviser] = useState("LoanWise NZ Review Team");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerMessage, setCustomerMessage] = useState("");

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

  const money = (value) => formatMoney(value, currencyCode);

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
      const repayment = splits.reduce((sum, split) => {
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
        repayment,
      };
    });
  }, [splits, loanAmount, loanTerm]);

  const rateComparisonResults = useMemo(() => {
    const payments = rateComparisons.map((item) =>
      calculatePayment(
        loanAmount,
        Number(item.rate || 0),
        Number(loanTerm),
        periodsPerYear
      )
    );
    const lowestPayment = Math.min(...payments);

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

  const affordability = useMemo(() => {
    const income = Number(annualIncome || 0);
    const expenses = Number(monthlyExpenses || 0);
    const annualRepayment = totalSplitRepayment * periodsPerYear;
    const repaymentToIncome = income > 0 ? (annualRepayment / income) * 100 : 0;
    const monthlyRepayment =
      frequency === "monthly"
        ? totalSplitRepayment
        : (totalSplitRepayment * periodsPerYear) / 12;
    const monthlyIncome = income / 12;
    const monthlySurplus = monthlyIncome - expenses - monthlyRepayment;

    let label = "Add income to calculate";
    let tone = "text-slate-600";
    if (income > 0 && repaymentToIncome <= 30) {
      label = "Comfortable estimate";
      tone = "text-emerald-600";
    } else if (income > 0 && repaymentToIncome <= 40) {
      label = "Watch closely";
      tone = "text-amber-600";
    } else if (income > 0) {
      label = "High pressure estimate";
      tone = "text-red-600";
    }

    return {
      repaymentToIncome,
      monthlySurplus,
      monthlyRepayment,
      label,
      tone,
    };
  }, [annualIncome, monthlyExpenses, totalSplitRepayment, periodsPerYear, frequency]);

  const stressTests = useMemo(() => {
    return [1, 2, 3].map((increase) => {
      const stressedRate = weightedRate + increase;
      const repayment = calculatePayment(
        loanAmount,
        stressedRate,
        Number(loanTerm),
        periodsPerYear
      );
      return {
        increase,
        stressedRate,
        repayment,
        difference: repayment - results.normal.standardPayment,
      };
    });
  }, [weightedRate, loanAmount, loanTerm, periodsPerYear, results.normal.standardPayment]);

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
    money,
  ]);

  const aiCoach = useMemo(() => {
    const actions = [];
    let riskLevel = "Balanced";
    let headline = "Your plan is moving in the right direction.";
    let insight = "LoanWise AI Coach reviews your deposit, split rates, repayment strategy, and LoanWise Score to suggest practical next steps.";

    if (loanWiseScore >= 85) {
      riskLevel = "Strong";
      headline = "You have a strong estimated loan position.";
      insight = "Your deposit, repayment strategy, and split-rate setup look healthy. Use scenario comparison to test whether a shorter loan term creates worthwhile savings.";
    } else if (loanWiseScore >= 70) {
      riskLevel = "Healthy";
      headline = "Your plan looks healthy, with room to optimise.";
      insight = "Your numbers are generally balanced. The best next step is to compare a slightly higher extra repayment or a shorter term against your comfort level.";
    } else if (loanWiseScore >= 50) {
      riskLevel = "Review";
      headline = "Your plan may benefit from a few adjustments.";
      insight = "Your estimate suggests opportunities to improve deposit strength, reduce interest exposure, or increase extra repayments gradually.";
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
      actions.push(`Compare your current extra repayment against the aggressive ${money(Number(aggressiveExtraPayment || 0))} option.`);
    }

    if (Number(loanTerm) >= 30) {
      actions.push("Try a 25-year term scenario to compare interest saved against higher repayments.");
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
    money,
  ]);

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
    setAnnualIncome(120000);
    setMonthlyExpenses(3500);
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

    if (window.gtag) {
      window.gtag("event", "ai_coach_preset", {
        event_category: "engagement",
        event_label: preset,
      });
    }
  };

  const printPdfReport = () => {
    window.print();
  };

  const shareSummary = useMemo(() => {
    return `LoanWise NZ estimate
Property price: ${money(Number(propertyPrice || 0))}
Deposit: ${money(Number(depositAmount || 0))} (${depositPercent.toFixed(1)}%)
Loan required: ${money(loanAmount)}
Estimated ${frequencies[frequency].label.toLowerCase()} repayment: ${money(totalSplitRepayment)}
Weighted interest rate: ${weightedRate.toFixed(2)}%
LoanWise Score: ${loanWiseScore}/100 (${scoreLabel})
Estimated interest saved with extra repayments: ${money(results.interestSaved)}

Try LoanWise NZ:
https://loanfreedomcalculator.github.io/loan-freedom-calculator/`;
  }, [
    propertyPrice,
    depositAmount,
    depositPercent,
    loanAmount,
    frequency,
    totalSplitRepayment,
    weightedRate,
    loanWiseScore,
    scoreLabel,
    results.interestSaved,
    money,
  ]);

  const copyShareSummary = async () => {
    try {
      await navigator.clipboard.writeText(shareSummary);
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 2200);
    } catch (error) {
      const textArea = document.createElement("textarea");
      textArea.value = shareSummary;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 2200);
    }

    if (window.gtag) {
      window.gtag("event", "copy_summary", {
        event_category: "engagement",
        event_label: "LoanWise NZ summary copied",
      });
    }
  };

  const saveEstimate = () => {
    const estimate = {
      createdAt: new Date().toISOString(),
      currencyCode,
      propertyPrice,
      depositAmount,
      depositPercent,
      loanAmount,
      weightedRate,
      totalSplitRepayment,
      loanWiseScore,
      scoreLabel,
      recommendations,
    };

    localStorage.setItem("loanwise-nz-last-estimate", JSON.stringify(estimate));
    setSavedEstimate(true);
    setTimeout(() => setSavedEstimate(false), 2200);

    if (window.gtag) {
      window.gtag("event", "save_estimate", {
        event_category: "engagement",
        event_label: "LoanWise NZ estimate saved",
      });
    }
  };

  const enquiryMailto = useMemo(() => {
    const subject = encodeURIComponent(`LoanWise NZ enquiry - ${selectedAdviser}`);
    const body = encodeURIComponent(
      `Hello LoanWise NZ,

I would like someone to review this estimate or contact me.

Name: ${customerName || "[add name]"}
Email: ${customerEmail || "[add email]"}
Phone: ${customerPhone || "[optional]"}
Preferred adviser/team: ${selectedAdviser}

Message:
${customerMessage || "[add message]"}

${shareSummary}

Important: I understand this calculator is an estimate only and not financial advice.`
    );

    return `mailto:loanfreedomcalculator@gmail.com?subject=${subject}&body=${body}`;
  }, [
    selectedAdviser,
    customerName,
    customerEmail,
    customerPhone,
    customerMessage,
    shareSummary,
  ]);

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

      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Logo />

          <nav className="hidden items-center gap-6 text-sm font-bold text-slate-600 lg:flex">
            <a href="#calculator" className="hover:text-emerald-600">Calculator</a>
            <a href="#ai-coach" className="hover:text-emerald-600">AI Coach</a>
            <a href="#compare" className="hover:text-emerald-600">Compare</a>
            <a href="#adviser" className="hover:text-emerald-600">Adviser</a>
            <a href="#faq" className="hover:text-emerald-600">FAQ</a>
          </nav>

          <a
            href="#calculator"
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg shadow-slate-950/10 transition hover:bg-emerald-600"
          >
            Start
          </a>
        </div>
      </header>

      <main>
        <section id="calculator" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-6 rounded-[2rem] border border-emerald-100 bg-gradient-to-br from-white via-emerald-50/40 to-slate-50 p-6 shadow-sm">
            <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-black text-emerald-700 shadow-sm">
                  <Sparkles size={16} />
                  NZ mortgage and loan planning tool
                </div>
                <h1 className="max-w-4xl text-4xl font-black leading-tight tracking-tight text-slate-950 sm:text-5xl">
                  Calculate first. Decide smarter.
                </h1>
                <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
                  Enter property, deposit, loan term, split interest rates, and extra repayments.
                  Results stay visible while you calculate.
                </p>
              </div>

              <div className="no-print flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={copyShareSummary}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-800 shadow-sm transition hover:border-emerald-300 hover:text-emerald-700"
                >
                  <Copy size={16} /> {copiedSummary ? "Copied!" : "Copy summary"}
                </button>
                <button
                  type="button"
                  onClick={printPdfReport}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-600"
                >
                  <FileText size={16} /> PDF report
                </button>
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[470px_1fr] lg:items-start">
            <aside className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/60 sm:p-6">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-black uppercase tracking-wide text-emerald-600">
                    Calculator inputs
                  </p>
                  <h2 className="mt-1 text-2xl font-black tracking-tight">
                    Loan details
                  </h2>
                </div>

                <button
                  onClick={resetExample}
                  className="no-print inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-3 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-200"
                >
                  <RefreshCcw size={16} /> Reset
                </button>
              </div>

              <div className="space-y-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Toggle
                    checked={usePropertyMode}
                    onChange={setUsePropertyMode}
                    label="Property + deposit"
                    description="Calculate loan from purchase price."
                  />

                  <Toggle
                    checked={firstHomeBuyer}
                    onChange={setFirstHomeBuyer}
                    label="First-home buyer"
                    description="Show extra buyer guidance."
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
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
                          {code} - {item.label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>

                {usePropertyMode ? (
                  <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                    <div className="grid gap-4 sm:grid-cols-2">
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

                <div className="grid gap-4 sm:grid-cols-2">
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
                </div>

                <div className="rounded-[1.5rem] border border-emerald-100 bg-emerald-50/70 p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-black uppercase tracking-wide text-emerald-700">
                        Split interest rates
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-600">
                        Keep this here so customers see results update instantly.
                      </p>
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
                                updateSplit(item.id, "percentage", e.target.value)
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

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label={`Extra payment each ${frequencies[
                      frequency
                    ].label.toLowerCase()}`}
                  >
                    <Input
                      type="number"
                      value={extraPayment}
                      onChange={(e) => setExtraPayment(e.target.value)}
                    />
                  </Field>

                  <Field label="One-off lump sum">
                    <Input
                      type="number"
                      value={lumpSum}
                      onChange={(e) => setLumpSum(e.target.value)}
                    />
                  </Field>
                </div>
              </div>
            </aside>

            <section className="space-y-5 lg:sticky lg:top-24">
              <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
                <div className="bg-slate-950 p-5 text-white sm:p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-black uppercase tracking-wide text-emerald-300">
                        Instant result
                      </p>
                      <h2 className="mt-1 text-3xl font-black">
                        {money(totalSplitRepayment)}
                      </h2>
                      <p className="mt-1 text-sm font-semibold text-slate-300">
                        per {frequencies[frequency].label.toLowerCase()} at {weightedRate.toFixed(2)}% weighted rate
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white/10 p-3">
                      <Calculator className="text-emerald-300" size={26} />
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl bg-white/10 p-4">
                      <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                        Loan required
                      </p>
                      <p className="mt-1 text-xl font-black">{money(loanAmount)}</p>
                    </div>
                    <div className="rounded-2xl bg-white/10 p-4">
                      <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                        Interest saved
                      </p>
                      <p className="mt-1 text-xl font-black text-emerald-300">
                        {money(results.interestSaved)}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white/10 p-4">
                      <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                        Time saved
                      </p>
                      <p className="mt-1 text-xl font-black">
                        {formatYearsMonths(results.timeSaved, periodsPerYear)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[0.85fr_1.15fr]">
                  <div className="rounded-3xl border border-emerald-100 bg-emerald-50/60 p-5">
                    <p className="text-sm font-black uppercase tracking-wide text-emerald-700">
                      LoanWise Score
                    </p>
                    <div className="mt-3 flex items-end gap-2">
                      <p className="text-5xl font-black text-slate-950">
                        {loanWiseScore}
                      </p>
                      <p className="mb-2 text-sm font-black text-slate-500">/100</p>
                    </div>
                    <p className="mt-2 text-sm font-black text-emerald-700">
                      {scoreLabel}
                    </p>
                    <div className="mt-4 h-3 rounded-full bg-white">
                      <div
                        className="h-3 rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"
                        style={{ width: `${loanWiseScore}%` }}
                      />
                    </div>
                  </div>

                  <div id="ai-coach" className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                    <p className="text-sm font-black uppercase tracking-wide text-emerald-600">
                      LoanWise AI Coach
                    </p>
                    <h3 className="mt-2 text-xl font-black text-slate-950">
                      {aiCoach.headline}
                    </h3>
                    <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                      {aiCoach.insight}
                    </p>
                    <div className="no-print mt-4 grid gap-2 sm:grid-cols-2">
                      <button
                        onClick={() => applyAiPreset("improve")}
                        className="rounded-full bg-emerald-500 px-4 py-3 text-sm font-black text-white shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-600"
                      >
                        Improve my plan
                      </button>
                      <button
                        onClick={() => applyAiPreset("balanced")}
                        className="rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-800 transition hover:border-emerald-300 hover:text-emerald-700"
                      >
                        Balanced preset
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/60 sm:p-6">
                <SectionTitle
                  eyebrow="Smart recommendations"
                  title="Next best actions"
                  note="These tips update automatically as the customer changes the calculator."
                />

                <div className="grid gap-3">
                  {recommendations.slice(0, 4).map((tip, index) => (
                    <div key={tip} className="flex gap-3 rounded-3xl bg-emerald-50/70 p-4">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-sm font-black text-white">
                        {index + 1}
                      </div>
                      <p className="text-sm font-semibold leading-6 text-slate-700">
                        {tip}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </section>

        <section id="compare" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60">
              <SectionTitle
                eyebrow="Affordability check"
                title="Repayment pressure"
                note="Compare repayment against income and monthly expenses."
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Annual household income">
                  <Input
                    type="number"
                    value={annualIncome}
                    onChange={(e) => setAnnualIncome(e.target.value)}
                  />
                </Field>

                <Field label="Estimated monthly expenses">
                  <Input
                    type="number"
                    value={monthlyExpenses}
                    onChange={(e) => setMonthlyExpenses(e.target.value)}
                  />
                </Field>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                <ResultTile
                  icon={<Gauge size={18} />}
                  label="Repayment to income"
                  value={`${affordability.repaymentToIncome.toFixed(1)}%`}
                  note={affordability.label}
                  tone="emerald"
                />
                <ResultTile
                  icon={<WalletCards size={18} />}
                  label="Monthly repayment"
                  value={money(affordability.monthlyRepayment)}
                  note="converted"
                  tone="sky"
                />
                <ResultTile
                  icon={<DollarSign size={18} />}
                  label="Monthly surplus"
                  value={money(affordability.monthlySurplus)}
                  note="after expenses"
                  tone={affordability.monthlySurplus >= 0 ? "teal" : "amber"}
                />
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60">
              <SectionTitle
                eyebrow="Rate stress test"
                title="What if rates rise?"
                note="Check whether a higher interest rate would still be manageable."
              />

              <div className="grid gap-4 sm:grid-cols-3">
                {stressTests.map((item) => (
                  <div
                    key={item.increase}
                    className="rounded-3xl border border-slate-200 bg-slate-50 p-5"
                  >
                    <p className="text-sm font-black text-slate-500">
                      +{item.increase}% scenario
                    </p>
                    <p className="mt-2 text-3xl font-black text-slate-950">
                      {item.stressedRate.toFixed(2)}%
                    </p>
                    <p className="mt-3 text-sm font-bold text-slate-500">
                      Repayment
                    </p>
                    <p className="text-xl font-black text-slate-950">
                      {money(item.repayment)}
                    </p>
                    <p className="mt-2 text-sm font-bold text-red-600">
                      {money(item.difference)} more
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60">
              <SectionTitle
                eyebrow="Visual forecast"
                title="Loan balance comparison"
                note="Normal plan vs extra repayment plan."
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
                        `${Math.round(value / 1000)}k`
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
              <SectionTitle
                eyebrow="Scenario comparison"
                title="Repayment strategies"
                note="Normal, extra, and aggressive payoff."
              />

              <div className="space-y-3">
                {scenarioRows.map((row) => (
                  <div
                    key={row.name}
                    className="rounded-3xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-black text-slate-950">{row.name}</p>
                        <p className="text-sm font-semibold text-slate-500">
                          Extra: {money(row.extra)}
                        </p>
                      </div>
                      <p className="text-xl font-black text-slate-950">
                        {money(row.repayment)}
                      </p>
                    </div>
                    <p className="mt-3 text-sm font-bold text-emerald-600">
                      Saves {money(row.interestSaved)} • {row.timeSaved}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60">
              <SectionTitle
                eyebrow="Frequency comparison"
                title="Weekly vs fortnightly vs monthly"
                note="Quick comparison across payment frequencies."
              />

              <div className="space-y-3">
                {frequencyComparison.map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between rounded-3xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div>
                      <p className="font-black text-slate-950">{item.label}</p>
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
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <SectionTitle
                  eyebrow="Interest comparison"
                  title="Compare manual rates"
                  note="Later we can connect this to a bank-rate database."
                />
                <button
                  onClick={addRateComparison}
                  className="no-print inline-flex items-center justify-center gap-2 rounded-full bg-emerald-500 px-4 py-3 text-sm font-black text-white"
                >
                  <Plus size={16} /> Add rate
                </button>
              </div>

              <div className="space-y-3">
                {rateComparisonResults.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-3xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="grid gap-3 sm:grid-cols-[1fr_100px_auto] sm:items-end">
                      <Field label="Option">
                        <Input
                          type="text"
                          value={item.label}
                          onChange={(e) =>
                            updateRateComparison(item.id, "label", e.target.value)
                          }
                        />
                      </Field>
                      <Field label="Rate %">
                        <Input
                          type="number"
                          step="0.01"
                          value={item.rate}
                          onChange={(e) =>
                            updateRateComparison(item.id, "rate", e.target.value)
                          }
                        />
                      </Field>
                      <button
                        onClick={() => removeRateComparison(item.id)}
                        className="no-print rounded-2xl bg-white p-3 text-slate-400 hover:text-red-500"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                      <p className="rounded-2xl bg-white p-3 text-sm font-bold text-slate-600">
                        Repayment: <span className="block text-lg font-black text-slate-950">{money(item.repayment)}</span>
                      </p>
                      <p className="rounded-2xl bg-white p-3 text-sm font-bold text-slate-600">
                        Interest: <span className="block text-lg font-black text-slate-950">{money(item.totalInterest)}</span>
                      </p>
                      <p className="rounded-2xl bg-white p-3 text-sm font-bold text-slate-600">
                        Difference: <span className="block text-lg font-black text-emerald-600">{money(item.difference)}</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="adviser" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
            <div className="grid gap-0 lg:grid-cols-[0.95fr_1.05fr]">
              <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 p-6 text-white sm:p-8">
                <p className="text-sm font-black uppercase tracking-wide text-emerald-300">
                  Mortgage adviser enquiry
                </p>
                <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
                  Send your estimate for review
                </h2>
                <p className="mt-3 max-w-xl text-sm font-semibold leading-7 text-slate-300">
                  Choose a review option and send a pre-filled enquiry to LoanWise NZ.
                  The email includes your calculator summary so the next step is easier.
                </p>

                <div className="mt-6 grid gap-3">
                  {[
                    {
                      name: "LoanWise NZ Review Team",
                      region: "General enquiry",
                      focus: "Calculator feedback and estimate review",
                    },
                    {
                      name: "Auckland Partner Adviser",
                      region: "Auckland",
                      focus: "First-home buyer enquiries",
                    },
                    {
                      name: "NZ Refix Partner Adviser",
                      region: "Nationwide",
                      focus: "Refix and split-mortgage planning",
                    },
                  ].map((adviser) => (
                    <button
                      type="button"
                      key={adviser.name}
                      onClick={() => setSelectedAdviser(adviser.name)}
                      className={`group flex items-start gap-4 rounded-3xl border p-4 text-left transition ${
                        selectedAdviser === adviser.name
                          ? "border-emerald-300 bg-white text-slate-950 shadow-lg shadow-emerald-500/10"
                          : "border-white/10 bg-white/10 text-white hover:border-emerald-300/60 hover:bg-white/15"
                      }`}
                    >
                      <div
                        className={`mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                          selectedAdviser === adviser.name
                            ? "bg-emerald-500 text-white"
                            : "bg-white/10 text-emerald-200"
                        }`}
                      >
                        <ShieldCheck size={20} />
                      </div>
                      <div>
                        <p className="font-black">{adviser.name}</p>
                        <p
                          className={`mt-1 text-sm font-black ${
                            selectedAdviser === adviser.name
                              ? "text-emerald-700"
                              : "text-emerald-200"
                          }`}
                        >
                          {adviser.region}
                        </p>
                        <p
                          className={`mt-2 text-sm font-semibold leading-6 ${
                            selectedAdviser === adviser.name
                              ? "text-slate-600"
                              : "text-slate-300"
                          }`}
                        >
                          {adviser.focus}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>

                <p className="mt-5 rounded-3xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm font-semibold leading-6 text-amber-100">
                  Adviser cards are placeholders. Replace them with real adviser names,
                  licence/FAP details, and emails only after permission.
                </p>
              </div>

              <div className="bg-slate-50 p-6 sm:p-8">
                <div className="mb-5 rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-600">
                    Selected review option
                  </p>
                  <p className="mt-2 text-2xl font-black text-slate-950">
                    {selectedAdviser}
                  </p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                    This form opens a pre-filled email to loanfreedomcalculator@gmail.com.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Name">
                    <Input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Customer name"
                    />
                  </Field>

                  <Field label="Email">
                    <Input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="customer@email.com"
                    />
                  </Field>

                  <Field label="Phone optional">
                    <Input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="Phone number"
                    />
                  </Field>

                  <Field label="Selected adviser/team">
                    <Select
                      value={selectedAdviser}
                      onChange={(e) => setSelectedAdviser(e.target.value)}
                    >
                      <option>LoanWise NZ Review Team</option>
                      <option>Auckland Partner Adviser</option>
                      <option>NZ Refix Partner Adviser</option>
                    </Select>
                  </Field>
                </div>

                <label className="mt-4 block">
                  <span className="mb-2 block text-sm font-bold text-slate-700">
                    Message
                  </span>
                  <textarea
                    value={customerMessage}
                    onChange={(e) => setCustomerMessage(e.target.value)}
                    placeholder="Tell us what you would like reviewed."
                    className="min-h-32 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  />
                </label>

                <div className="no-print mt-5 grid gap-3 sm:grid-cols-2">
                  <a
                    href={enquiryMailto}
                    onClick={() => {
                      if (window.gtag) {
                        window.gtag("event", "adviser_enquiry_click", {
                          event_category: "lead",
                          event_label: selectedAdviser,
                        });
                      }
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-500 px-6 py-4 text-sm font-black text-white shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-600"
                  >
                    <Mail size={16} /> Send enquiry
                  </a>

                  <button
                    type="button"
                    onClick={saveEstimate}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-4 text-sm font-black text-slate-800 shadow-sm transition hover:border-emerald-300 hover:text-emerald-700"
                  >
                    <CheckCircle2 size={16} /> {savedEstimate ? "Saved!" : "Save estimate"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="report" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <SectionTitle
                eyebrow="Report + schedule"
                title="Amortisation schedule"
                note="Download CSV or use the PDF report button."
              />

              <div className="no-print flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={copyShareSummary}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-black text-slate-800 shadow-sm transition hover:border-emerald-300 hover:text-emerald-700"
                >
                  <Copy size={16} /> {copiedSummary ? "Copied!" : "Copy Summary"}
                </button>

                <button
                  onClick={printPdfReport}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-500 px-6 py-3 text-sm font-black text-white shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-600"
                >
                  <FileText size={16} /> PDF Report
                </button>

                <button
                  onClick={() => downloadCsv(results.extra.rows)}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-6 py-3 text-sm font-black text-white shadow-lg shadow-slate-950/10 transition hover:bg-emerald-600"
                >
                  <Download size={16} /> CSV
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
              Showing first 240 repayment periods. Download CSV for the full schedule.
            </p>
          </div>
        </section>

        <section id="about" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60">
              <SectionTitle
                eyebrow="About LoanWise NZ"
                title="Built to help borrowers understand their numbers."
                note="LoanWise NZ is designed for people who want a quick, practical view before talking to a lender, adviser, partner, or family member."
              />
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  "First-home buyers checking deposit and repayments",
                  "Existing borrowers testing extra payments",
                  "People comparing split mortgage rate options",
                  "Anyone wanting a PDF-ready loan summary",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <CheckCircle2 className="mt-1 shrink-0 text-emerald-500" size={18} />
                    <p className="text-sm font-semibold leading-6 text-slate-700">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-emerald-100 bg-emerald-50/70 p-6 shadow-xl shadow-emerald-100/50">
              <SectionTitle
                eyebrow="Shareable result"
                title="Copy a clean summary for your adviser or family."
                note="Use this after entering your numbers. It gives a simple snapshot of the estimate."
              />
              <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-3xl bg-white p-5 text-sm font-semibold leading-6 text-slate-700 shadow-sm">
                {shareSummary}
              </pre>
              <div className="no-print mt-4 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={copyShareSummary}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-500 px-6 py-3 text-sm font-black text-white shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-600"
                >
                  <Copy size={16} /> {copiedSummary ? "Copied!" : "Copy share summary"}
                </button>
                <a
                  href="mailto:?subject=My LoanWise NZ estimate&body=I created this loan estimate using LoanWise NZ. Please review the summary I copied from the calculator."
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-black text-slate-800 shadow-sm transition hover:border-emerald-300 hover:text-emerald-700"
                >
                  <Mail size={16} /> Email reminder
                </a>
              </div>
            </div>
          </div>
        </section>

        <section id="faq" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60">
            <SectionTitle
              eyebrow="Frequently asked questions"
              title="Common questions before using the calculator"
              note="These answers help users understand the tool and build trust before relying on the estimate."
            />
            <div className="grid gap-4 md:grid-cols-2">
              {[
                {
                  q: "Is LoanWise NZ financial advice?",
                  a: "No. It is an estimate and planning tool only. Users should speak with a qualified mortgage adviser or lender before making financial decisions.",
                },
                {
                  q: "Does the calculator include bank fees and low-equity margins?",
                  a: "No. It does not include all lender fees, low-equity conditions, insurance, cashback terms, or break fees.",
                },
                {
                  q: "What is a split mortgage?",
                  a: "A split mortgage divides one loan into multiple portions, often with different interest rates or fixed terms.",
                },
                {
                  q: "Can first-home buyers use it?",
                  a: "Yes. First-home buyer mode highlights deposit position and basic planning tips for people preparing for a first home loan.",
                },
                {
                  q: "Can I compare interest rates?",
                  a: "Yes. The rate comparison section lets users test different bank or rate options and see estimated repayment differences.",
                },
                {
                  q: "Can I download my result?",
                  a: "Yes. Users can copy a share summary, download CSV repayment schedule, or use the PDF report button to save a printable report.",
                },
              ].map((item) => (
                <div key={item.q} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex gap-3">
                    <HelpCircle className="mt-1 shrink-0 text-emerald-600" size={20} />
                    <div>
                      <h3 className="font-black text-slate-950">{item.q}</h3>
                      <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{item.a}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="contact" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="rounded-[2rem] border border-slate-200 bg-slate-950 p-6 text-white shadow-xl">
            <div className="grid gap-6 md:grid-cols-[1fr_1.1fr] md:items-center">
              <div>
                <p className="text-sm font-black uppercase tracking-wide text-emerald-300">
                  Feedback welcome
                </p>
                <h2 className="mt-2 text-3xl font-black tracking-tight">
                  Help make LoanWise NZ more useful.
                </h2>
                <p className="mt-3 text-sm font-semibold leading-6 text-slate-300">
                  Share feedback from first-home buyers, borrowers, mortgage advisers, or anyone comparing loan options.
                </p>
                <a
                  href="mailto:loanfreedomcalculator@gmail.com"
                  className="mt-5 inline-flex rounded-full bg-emerald-500 px-6 py-3 text-sm font-black text-white transition hover:bg-emerald-600"
                >
                  Contact: loanfreedomcalculator@gmail.com
                </a>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-3xl bg-white/10 p-5">
                  <Users className="text-emerald-300" size={24} />
                  <p className="mt-3 text-lg font-black">For borrowers</p>
                  <p className="mt-1 text-sm leading-6 text-slate-300">
                    Use it to prepare questions before a bank or adviser meeting.
                  </p>
                </div>
                <div className="rounded-3xl bg-white/10 p-5">
                  <ShieldCheck className="text-emerald-300" size={24} />
                  <p className="mt-3 text-lg font-black">For advisers</p>
                  <p className="mt-1 text-sm leading-6 text-slate-300">
                    Share it as a simple pre-consultation planning tool.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <footer className="mt-8 border-t border-slate-200 bg-white">
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


