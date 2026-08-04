import { UnitCalculationResult } from "./unitCalculations";

export type SettlementRow = {
  playerId: string;
  alias: string;
  units: number;
  amount: number;
  direction: "receive" | "pay" | "even";
};

export type SettlementSummary = {
  rows: SettlementRow[];
  totalToReceive: number;
  totalToPay: number;
  netDifference: number;
  hasImbalance: boolean;
};

export function buildSettlementSummary(
  results: UnitCalculationResult[],
  unitValue: number
): SettlementSummary {
  const rows = results.map((result) => {
    const amount = result.units * unitValue;

    return {
      playerId: result.playerId,
      alias: result.alias,
      units: result.units,
      amount,
      direction: amount > 0 ? ("receive" as const) : amount < 0 ? ("pay" as const) : ("even" as const),
    };
  });

  const totalToReceive = rows.reduce((sum, row) => sum + Math.max(0, row.amount), 0);
  const totalToPay = rows.reduce((sum, row) => sum + Math.max(0, Math.abs(Math.min(0, row.amount))), 0);
  const netDifference = totalToReceive - totalToPay;

  return {
    rows,
    totalToReceive,
    totalToPay,
    netDifference,
    hasImbalance: Math.abs(netDifference) > 0,
  };
}
