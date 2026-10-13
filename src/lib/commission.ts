export const ENSENA_COMMISSION_PCT = 20;

export interface EarningsSplit {
  gross: number;
  commission: number;
  net: number;
}

export function splitEarnings(gross: number): EarningsSplit {
  const commission = Math.round(gross * (ENSENA_COMMISSION_PCT / 100));
  return { gross, commission, net: gross - commission };
}

export const commissionExplainer =
  "Ensena's commission covers secure payment processing, escrow protection, marketing and student acquisition, platform maintenance, customer support, dispute resolution, and identity verification.";
