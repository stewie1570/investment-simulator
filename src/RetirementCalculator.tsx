import { useMemo, useState, useEffect } from 'react';
import type { ChangeEvent, Dispatch, ReactNode, SetStateAction } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { TooltipProps } from 'recharts';
import AppNav from './AppNav';
import {
  MAX_PLAN_AGE,
  ageInYears,
  projectRetirement,
  toTodaysDollars,
} from './retirementModel';
import type { ProjectionPoint, RetirementProjection } from './retirementModel';
import './App.css';
import './RetirementCalculator.css';

interface FormState {
  dob: string;
  retirementAge: string;
  annualIncome: string;
  currentInvestments: string;
  contributionRate: string;
  drawRate: string;
  annualReturn: string;
  annualInflation: string;
}

interface ParsedForm {
  error: string | null;
  retirementAge: number;
  annualInflation: number;
  projection: RetirementProjection | null;
}

const defaultDob = () => {
  const today = new Date();
  const date = new Date(today.getFullYear() - 40, today.getMonth(), today.getDate());
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
};

const initialForm: FormState = {
  dob: defaultDob(),
  retirementAge: '65',
  annualIncome: '120000',
  currentInvestments: '350000',
  contributionRate: '15',
  drawRate: '4',
  annualReturn: '7',
  annualInflation: '3',
};

const FORM_STORAGE_KEY = 'retirement-calculator';

function loadStoredForm(): FormState {
  try {
    const raw = localStorage.getItem(FORM_STORAGE_KEY);
    if (!raw) return initialForm;
    const stored = JSON.parse(raw) as Partial<FormState>;
    const form = { ...initialForm };
    (Object.keys(initialForm) as (keyof FormState)[]).forEach((key) => {
      if (typeof stored?.[key] === 'string') form[key] = stored[key];
    });
    return form;
  } catch {
    return initialForm;
  }
}

function storeForm(form: FormState) {
  try {
    localStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(form));
  } catch {
    // A full quota or blocked storage should leave the calculator usable.
  }
}

export default function RetirementCalculator() {
  const [form, setForm] = useState<FormState>(loadStoredForm);

  useEffect(() => {
    storeForm(form);
  }, [form]);
  const [todaysDollars, setTodaysDollars] = useState(false);
  const dark = useMediaQuery('(prefers-color-scheme: dark)');
  const narrow = useMediaQuery('(max-width: 768px)');
  const parsed = useMemo(() => parseForm(form), [form]);

  const chart = useMemo(() => {
    if (!parsed.projection) return [];
    return parsed.projection.points.map((point) => toChartRow(point, todaysDollars, parsed.annualInflation));
  }, [parsed, todaysDollars]);

  const dollarsLabel = todaysDollars ? "Today's dollars" : 'Future dollars';
  const axisColor = dark ? '#94a3b8' : '#64748b';
  const gridColor = dark ? '#334155' : '#e2e8f0';

  return (
    <div className="sim-container retirement-page">
      <AppNav />
      <h2>Retirement Calculator</h2>
      <p className="retirement-intro">
        Project investments and monthly income through age {MAX_PLAN_AGE}. Work and contributions
        stop at retirement. Investment draws start then.
      </p>

      <form className="retirement-form" onSubmit={(event) => event.preventDefault()}>
        <Field label="Date of birth" hint="Used to calculate your current age.">
          <input
            className="sim-input"
            type="date"
            name="dob"
            autoComplete="bday"
            value={form.dob}
            onChange={update(setForm, 'dob')}
          />
        </Field>
        <Field label="Retirement age" hint="Work stops here. This can be in the past.">
          <input
            className="sim-input"
            type="number"
            inputMode="decimal"
            min={0}
            max={MAX_PLAN_AGE}
            step="1"
            name="retirementAge"
            value={form.retirementAge}
            onChange={update(setForm, 'retirementAge')}
          />
        </Field>
        <Field label="Annual income" hint="Current salary, or most recent salary in today's dollars.">
          <input
            className="sim-input"
            type="number"
            inputMode="decimal"
            min={0}
            step="1000"
            name="annualIncome"
            value={form.annualIncome}
            onChange={update(setForm, 'annualIncome')}
          />
        </Field>
        <Field label="Current investments" hint="What the portfolio is worth today.">
          <input
            className="sim-input"
            type="number"
            inputMode="decimal"
            min={0}
            step="1000"
            name="currentInvestments"
            value={form.currentInvestments}
            onChange={update(setForm, 'currentInvestments')}
          />
        </Field>
        <Field label="Contribution rate" hint="Percent of income invested each year while working.">
          <PercentInput
            name="contributionRate"
            value={form.contributionRate}
            onChange={update(setForm, 'contributionRate')}
          />
        </Field>
        <Field label="Draw amount" hint="Percent of the portfolio withdrawn each year in retirement. The dollar amount changes as the balance changes.">
          <PercentInput
            name="drawRate"
            value={form.drawRate}
            onChange={update(setForm, 'drawRate')}
          />
        </Field>
        <Field label="Average rate of return" hint="Expected nominal growth of investments.">
          <PercentInput
            name="annualReturn"
            value={form.annualReturn}
            onChange={update(setForm, 'annualReturn')}
          />
        </Field>
        <Field label="Average rate of inflation" hint="Used for raises, draws, and today's dollars.">
          <PercentInput
            name="annualInflation"
            value={form.annualInflation}
            onChange={update(setForm, 'annualInflation')}
          />
        </Field>
      </form>

      {parsed.error && <div className="sim-error">{parsed.error}</div>}

      {parsed.projection && (
        <>
          <div className="retirement-toolbar">
            <button
              type="button"
              className={todaysDollars ? 'retirement-toggle on' : 'retirement-toggle'}
              aria-pressed={todaysDollars}
              onClick={() => setTodaysDollars((value) => !value)}
            >
              <span className="retirement-toggle-track" aria-hidden="true">
                <span className="retirement-toggle-knob" />
              </span>
              Today's dollars
            </button>
            <p className="retirement-toolbar-note">
              {todaysDollars
                ? 'Graphs are adjusted for inflation so later years match today’s purchasing power.'
                : 'Graphs show future dollars, with inflation left in the amounts.'}
            </p>
          </div>

          <Summary
            projection={parsed.projection}
            retirementAge={parsed.retirementAge}
            annualInflation={parsed.annualInflation}
            todaysDollars={todaysDollars}
          />

          <section className="retirement-chart-card">
            <h3>Net worth over time</h3>
            <div className="retirement-chart">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chart} margin={{ top: 16, right: 36, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="netWorthFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#667eea" stopOpacity={0.85} />
                      <stop offset="100%" stopColor="#667eea" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="age"
                    type="number"
                    domain={['dataMin', 'dataMax']}
                    ticks={ageTicks(parsed.projection.currentAge, MAX_PLAN_AGE, narrow ? 20 : 10)}
                    tickFormatter={(age: number) => String(Math.round(age))}
                    interval={0}
                    stroke={axisColor}
                    tick={{ fill: axisColor, fontSize: 12 }}
                  />
                  <YAxis
                    tickFormatter={formatAxisMoney}
                    stroke={axisColor}
                    tick={{ fill: axisColor, fontSize: 12 }}
                    width={72}
                  />
                  <Tooltip content={<MoneyTooltip dollarsLabel={dollarsLabel} />} />
                  {showRetirementLine(parsed.projection.currentAge, parsed.retirementAge) && (
                    <ReferenceLine
                      x={parsed.retirementAge}
                      stroke={axisColor}
                      strokeDasharray="4 4"
                      label={{ value: 'Retire', fill: axisColor, fontSize: 12, position: 'insideTopRight' }}
                    />
                  )}
                  <Area
                    type="monotone"
                    dataKey="netWorth"
                    name="Net worth"
                    stroke="#667eea"
                    strokeWidth={2}
                    fill="url(#netWorthFill)"
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="retirement-chart-card">
            <h3>Monthly income</h3>
            <div className="retirement-chart">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chart} margin={{ top: 16, right: 36, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="workFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#764ba2" stopOpacity={0.8} />
                      <stop offset="100%" stopColor="#764ba2" stopOpacity={0.08} />
                    </linearGradient>
                    <linearGradient id="drawFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.85} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0.08} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="age"
                    type="number"
                    domain={['dataMin', 'dataMax']}
                    ticks={ageTicks(parsed.projection.currentAge, MAX_PLAN_AGE, narrow ? 20 : 10)}
                    tickFormatter={(age: number) => String(Math.round(age))}
                    interval={0}
                    stroke={axisColor}
                    tick={{ fill: axisColor, fontSize: 12 }}
                  />
                  <YAxis
                    tickFormatter={formatAxisMoney}
                    stroke={axisColor}
                    tick={{ fill: axisColor, fontSize: 12 }}
                    width={72}
                  />
                  <Tooltip content={<MoneyTooltip dollarsLabel={dollarsLabel} />} />
                  {showRetirementLine(parsed.projection.currentAge, parsed.retirementAge) && (
                    <ReferenceLine
                      x={parsed.retirementAge}
                      stroke={axisColor}
                      strokeDasharray="4 4"
                      label={{ value: 'Retire', fill: axisColor, fontSize: 12, position: 'insideTopRight' }}
                    />
                  )}
                  <Area
                    type="linear"
                    dataKey="work"
                    name="Work"
                    stroke="#764ba2"
                    strokeWidth={2}
                    fill="url(#workFill)"
                    dot={false}
                    activeDot={{ r: 4 }}
                    connectNulls={false}
                  />
                  <Area
                    type="linear"
                    dataKey="draws"
                    name="Investment draws"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="url(#drawFill)"
                    dot={false}
                    activeDot={{ r: 4 }}
                    connectNulls={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="retirement-legend">
              <span><i className="swatch work" /> Work, after contributions</span>
              <span><i className="swatch draws" /> Investment draws</span>
            </div>
          </section>

          <details className="retirement-assumptions">
            <summary>How this plan is calculated</summary>
            <p>
              Salary rises with inflation until retirement. Each year the contribution rate is
              invested, and monthly income while working is the remainder. At the retirement age,
              work income and contributions stop. Each retirement draw is the draw amount times
              the portfolio value at that time, so monthly income moves with the balance. A draw cannot exceed the
              investment balance, and the plan continues through age {MAX_PLAN_AGE}. Today’s dollars
              divides out inflation so every year is shown in current purchasing power.
            </p>
          </details>
        </>
      )}
    </div>
  );
}

function Summary({
  projection,
  retirementAge,
  annualInflation,
  todaysDollars,
}: {
  projection: RetirementProjection;
  retirementAge: number;
  annualInflation: number;
  todaysDollars: boolean;
}) {
  const alreadyRetired = projection.currentAge >= retirementAge - 1e-6;
  const retirementPoint = projection.points.find((point) => point.retired) ?? projection.points[0];
  const ending = projection.points[projection.points.length - 1];
  const money = (nominal: number, yearsFromNow: number) =>
    formatMoney(todaysDollars ? toTodaysDollars(nominal, yearsFromNow, annualInflation) : nominal);

  const timing = alreadyRetired
    ? `${formatYears(projection.currentAge - retirementAge)} ago`
    : `In ${formatYears(retirementAge - projection.currentAge)}`;

  const lasts = projection.depletedAtAge === null
    ? `Through age ${MAX_PLAN_AGE}`
    : `Runs out at age ${projection.depletedAtAge.toFixed(1)}`;

  return (
    <div className="retirement-stats">
      <Stat label="Current age" value={formatYears(projection.currentAge)} />
      <Stat label={alreadyRetired ? 'Retired' : 'Retires'} value={timing} />
      <Stat
        label={alreadyRetired ? 'Net worth today' : 'Net worth at retirement'}
        value={money(retirementPoint.netWorth, retirementPoint.yearsFromNow)}
      />
      <Stat
        label={alreadyRetired ? 'Monthly income today' : 'Monthly income at retirement'}
        value={money(
          retirementPoint.monthlyWorkIncome + retirementPoint.monthlyInvestmentIncome,
          retirementPoint.yearsFromNow,
        )}
      />
      <Stat label={`Net worth at ${MAX_PLAN_AGE}`} value={money(ending.netWorth, ending.yearsFromNow)} />
      <Stat label="Investments last" value={lasts} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="retirement-stat">
      <div className="retirement-stat-label">{label}</div>
      <div className="retirement-stat-value">{value}</div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint: string; children: ReactNode }) {
  return (
    <label className="retirement-field">
      <span>{label}</span>
      {children}
      <span className="retirement-hint">{hint}</span>
    </label>
  );
}

function PercentInput({
  name,
  value,
  onChange,
}: {
  name: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <span className="retirement-percent">
      <input
        className="sim-input"
        type="number"
        inputMode="decimal"
        step="0.1"
        name={name}
        value={value}
        onChange={onChange}
      />
      <span className="retirement-percent-sign">%</span>
    </span>
  );
}

function MoneyTooltip({
  active,
  payload,
  label,
  dollarsLabel,
}: TooltipProps<number, string> & { dollarsLabel: string }) {
  if (!active || !payload || payload.length === 0) return null;
  const age = Number(label);
  return (
    <div className="retirement-tooltip">
      <div className="retirement-tooltip-age">Age {Number.isFinite(age) ? age.toFixed(1) : label}</div>
      {payload.map((entry) => (
        <div key={String(entry.dataKey)} className="retirement-tooltip-row">
          <span style={{ color: entry.color }}>{entry.name}</span>
          <span>{formatMoney(Number(entry.value))}</span>
        </div>
      ))}
      <div className="retirement-tooltip-note">{dollarsLabel}</div>
    </div>
  );
}

function toChartRow(point: ProjectionPoint, todaysDollars: boolean, annualInflation: number) {
  const scale = (value: number) => (todaysDollars ? toTodaysDollars(value, point.yearsFromNow, annualInflation) : value);
  const work = scale(point.monthlyWorkIncome);
  const draws = scale(point.monthlyInvestmentIncome);
  return {
    age: point.age,
    netWorth: scale(point.netWorth),
    // Null keeps a finished series from stroking along the axis for the rest of the plan.
    work: work > 0.5 ? work : null,
    draws: draws > 0.5 ? draws : null,
  };
}

function parseForm(form: FormState): ParsedForm {
  const empty: ParsedForm = { error: null, retirementAge: NaN, annualInflation: 0, projection: null };
  const dateOfBirth = parseDateInput(form.dob);
  if (!dateOfBirth) return { ...empty, error: 'Enter a valid date of birth.' };

  const asOf = startOfToday();
  if (dateOfBirth.getTime() > asOf.getTime()) {
    return { ...empty, error: 'Date of birth has to be today or earlier.' };
  }

  const currentAge = ageInYears(dateOfBirth, asOf);
  if (currentAge > MAX_PLAN_AGE) {
    return { ...empty, error: `This plan stops at age ${MAX_PLAN_AGE}, and that date of birth is already past it.` };
  }

  const retirementAge = readNumber(form.retirementAge);
  if (retirementAge === null || retirementAge < 0 || retirementAge > MAX_PLAN_AGE) {
    return { ...empty, error: `Enter a retirement age from 0 to ${MAX_PLAN_AGE}.` };
  }

  const annualIncome = readNumber(form.annualIncome);
  if (annualIncome === null || annualIncome < 0) {
    return { ...empty, error: 'Enter a current or most recent annual income of zero or more.' };
  }

  const currentInvestments = readNumber(form.currentInvestments);
  if (currentInvestments === null || currentInvestments < 0) {
    return { ...empty, error: 'Enter a current investment value of zero or more.' };
  }

  const contributionRate = readNumber(form.contributionRate);
  if (contributionRate === null || contributionRate < 0 || contributionRate > 100) {
    return { ...empty, error: 'Enter a contribution rate from 0% to 100%.' };
  }

  const drawRate = readNumber(form.drawRate);
  if (drawRate === null || drawRate < 0 || drawRate > 100) {
    return { ...empty, error: 'Enter a draw amount from 0% to 100%.' };
  }

  const annualReturn = readNumber(form.annualReturn);
  if (annualReturn === null || annualReturn <= -100 || annualReturn > 100) {
    return { ...empty, error: 'Enter an average rate of return greater than -100% and at most 100%.' };
  }

  const annualInflation = readNumber(form.annualInflation);
  if (annualInflation === null || annualInflation <= -100 || annualInflation > 100) {
    return { ...empty, error: 'Enter an average inflation rate greater than -100% and at most 100%.' };
  }

  const projection = projectRetirement({
    dateOfBirth,
    asOf,
    retirementAge,
    annualIncome,
    currentInvestments,
    contributionRate: contributionRate / 100,
    drawRate: drawRate / 100,
    annualReturn: annualReturn / 100,
    annualInflation: annualInflation / 100,
  });

  return {
    error: null,
    retirementAge,
    annualInflation: annualInflation / 100,
    projection,
  };
}

function update(
  setForm: Dispatch<SetStateAction<FormState>>,
  key: keyof FormState,
) {
    return (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setForm((current) => ({ ...current, [key]: value }));
  };
}

function readNumber(value: string): number | null {
  if (value.trim() === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

function parseDateInput(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
}

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function formatMoney(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatAxisMoney(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '−' : '';
  if (abs >= 1e12) return `${sign}$${(abs / 1e12).toFixed(1)}T`;
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${sign}$${Math.round(abs / 1e3)}k`;
  return `${sign}$${Math.round(abs)}`;
}

function formatYears(years: number): string {
  const totalMonths = Math.max(0, Math.round(Math.abs(years) * 12));
  const wholeYears = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  const yearPart = `${wholeYears} year${wholeYears === 1 ? '' : 's'}`;
  if (months === 0) return yearPart;
  const monthPart = `${months} month${months === 1 ? '' : 's'}`;
  if (wholeYears === 0) return monthPart;
  return `${yearPart}, ${monthPart}`;
}

function ageTicks(minAge: number, maxAge: number, step: number): number[] {
  const ticks: number[] = [];
  for (let age = Math.ceil(minAge / step) * step; age <= maxAge; age += step) ticks.push(age);
  const startLabel = Math.round(minAge);
  if (ticks.length === 0 || ticks[0] - startLabel >= 4) ticks.unshift(startLabel);
  if (ticks[ticks.length - 1] !== maxAge) ticks.push(maxAge);
  return ticks;
}

function showRetirementLine(currentAge: number, retirementAge: number): boolean {
  return retirementAge > currentAge + 0.05 && retirementAge < MAX_PLAN_AGE;
}

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const media = window.matchMedia(query);
    const onChange = () => setMatches(media.matches);
    onChange();
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}
