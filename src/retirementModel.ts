/** Plan through this age, inclusive. */
export const MAX_PLAN_AGE = 120;

export interface RetirementInputs {
  dateOfBirth: Date;
  /** Valuation date for "today". Dollar inputs are in this day's dollars. */
  asOf: Date;
  retirementAge: number;
  /** Current salary, or the most recent salary expressed in today's dollars. */
  annualIncome: number;
  currentInvestments: number;
  /** Fraction of work income invested each year, from 0 to 1. */
  contributionRate: number;
  /** Nominal annual growth rate of investments, e.g. 0.07 for 7%. */
  annualReturn: number;
  /** Annual inflation, e.g. 0.03 for 3%. */
  annualInflation: number;
}

export interface ProjectionPoint {
  age: number;
  yearsFromNow: number;
  /** Investment balance in nominal dollars. */
  netWorth: number;
  /** Spendable work income for the month, after the investment contribution. */
  monthlyWorkIncome: number;
  /** Investment draw for the month. Zero while working. */
  monthlyInvestmentIncome: number;
  retired: boolean;
}

export interface RetirementProjection {
  currentAge: number;
  points: ProjectionPoint[];
  /** Age when a withdrawal could not be paid in full. */
  depletedAtAge: number | null;
  /** Balance when draws begin. Today's balance if already retired. */
  netWorthAtRetirement: number;
  monthlyIncomeAtRetirement: number;
  endingNetWorth: number;
}

export function ageInYears(dateOfBirth: Date, asOf: Date): number {
  const msPerYear = 365.2425 * 24 * 60 * 60 * 1000;
  return (asOf.getTime() - dateOfBirth.getTime()) / msPerYear;
}

export function toTodaysDollars(nominal: number, yearsFromNow: number, annualInflation: number): number {
  const base = 1 + annualInflation;
  if (base <= 0) return 0;
  return nominal / Math.pow(base, yearsFromNow);
}

/**
 * Project investment balance and monthly income from today through age 120.
 *
 * While working, salary rises with inflation and the contribution rate is
 * invested. Spendable income is the rest. Work and contributions stop at the
 * retirement age. Draws then replace that spendable income and themselves
 * rise with inflation. A draw is limited to the balance on hand, so the plan
 * can run out before 120.
 */
export function projectRetirement(inputs: RetirementInputs): RetirementProjection {
  const currentAge = ageInYears(inputs.dateOfBirth, inputs.asOf);
  const contributionRate = clamp(inputs.contributionRate, 0, 1);
  const annualIncome = Math.max(0, inputs.annualIncome);
  const points: ProjectionPoint[] = [];

  let portfolio = Math.max(0, inputs.currentInvestments);
  let annualSalary = annualIncome;
  let retired = currentAge >= inputs.retirementAge - 1e-9;
  let annualDraw = retired ? annualSalary * (1 - contributionRate) : 0;
  let depletedAtAge: number | null = null;

  const snapshot = (age: number) => {
    const yearsFromNow = Math.max(0, age - currentAge);
    const desiredDraw = retired ? Math.max(0, annualDraw) / 12 : 0;
    const monthlyInvestmentIncome = retired ? Math.min(desiredDraw, portfolio) : 0;
    const monthlyWorkIncome = retired ? 0 : (annualSalary * (1 - contributionRate)) / 12;
    points.push({
      age,
      yearsFromNow,
      netWorth: portfolio,
      monthlyWorkIncome,
      monthlyInvestmentIncome,
      retired,
    });
  };

  const pushIfNew = (age: number) => {
    const last = points[points.length - 1];
    if (last && Math.abs(last.age - age) < 1e-6) return;
    snapshot(age);
  };

  snapshot(currentAge);

  if (currentAge >= MAX_PLAN_AGE - 1e-9) {
    return summarize(currentAge, points, depletedAtAge);
  }

  let elapsedMonths = 0;
  const endMonths = (MAX_PLAN_AGE - currentAge) * 12;

  while (elapsedMonths < endMonths - 1e-8) {
    const step = Math.min(1, endMonths - elapsedMonths);
    const ageStart = currentAge + elapsedMonths / 12;
    const ageEnd = Math.min(MAX_PLAN_AGE, currentAge + (elapsedMonths + step) / 12);
    const retirementAge = inputs.retirementAge;
    const retirementInStep = !retired && retirementAge > ageStart + 1e-10 && retirementAge <= ageEnd + 1e-10;

    if (retirementInStep) {
      const workMonths = Math.max(0, (retirementAge - ageStart) * 12);
      applyWork(workMonths);
      retired = true;
      annualDraw = annualSalary * (1 - contributionRate);
      pushIfNew(retirementAge);
      applyRetirement(step - workMonths, retirementAge);
    } else if (!retired) {
      applyWork(step);
    } else {
      applyRetirement(step, ageStart);
    }

    elapsedMonths += step;
    const reachedEnd = elapsedMonths >= endMonths - 1e-8;
    pushIfNew(reachedEnd ? MAX_PLAN_AGE : currentAge + elapsedMonths / 12);
  }

  return summarize(currentAge, points, depletedAtAge);

  function applyWork(months: number) {
    if (months <= 1e-12) return;
    const years = months / 12;
    const contribution = annualSalary * contributionRate * years;
    portfolio = Math.max(0, portfolio * growthFactor(inputs.annualReturn, years)) + contribution;
    annualSalary *= growthFactor(inputs.annualInflation, years);
  }

  function applyRetirement(months: number, ageAtStart: number) {
    if (months <= 1e-12) return;
    const years = months / 12;
    const requested = Math.max(0, annualDraw) * years;
    portfolio = Math.max(0, portfolio * growthFactor(inputs.annualReturn, years));
    const actual = Math.min(requested, portfolio);
    const ranOut = requested > actual + 0.01;
    portfolio -= actual;
    const fraction = requested === 0 ? 1 : actual / requested;
    annualDraw *= growthFactor(inputs.annualInflation, years);
    if (ranOut && depletedAtAge === null) {
      depletedAtAge = ageAtStart + fraction * years;
      pushIfNew(depletedAtAge);
    }
  }
}

function summarize(
  currentAge: number,
  points: ProjectionPoint[],
  depletedAtAge: number | null,
): RetirementProjection {
  const retirementPoint = points.find((point) => point.retired) ?? points[0];
  const ending = points[points.length - 1];
  return {
    currentAge,
    points,
    depletedAtAge,
    netWorthAtRetirement: retirementPoint.netWorth,
    monthlyIncomeAtRetirement: retirementPoint.monthlyWorkIncome + retirementPoint.monthlyInvestmentIncome,
    endingNetWorth: ending.netWorth,
  };
}

function growthFactor(annualRate: number, years: number): number {
  const base = 1 + annualRate;
  if (base <= 0) return 0;
  return Math.pow(base, years);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
