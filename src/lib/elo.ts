export interface MatchInput {
  eloA1: number;
  eloA2: number;
  eloB1: number;
  eloB2: number;
  score_a: number;
  score_b: number;
}

export interface EloResult {
  newEloA1: number;
  newEloA2: number;
  newEloB1: number;
  newEloB2: number;
  elo_change: number;
}

/**
 * Pure Elo calculation for a 2v2 match.
 * No side effects, no database calls.
 */
export function calculateEloChange(input: MatchInput): EloResult {
  const { eloA1, eloA2, eloB1, eloB2, score_a, score_b } = input;

  // Team ratings (average of the two player Elos)
  const R_A = (eloA1 + eloA2) / 2;
  const R_B = (eloB1 + eloB2) / 2;

  // Expected outcome for Team A: E_A = 1 / (1 + 10^((R_B - R_A) / 400))
  const E_A = 1 / (1 + Math.pow(10, (R_B - R_A) / 400));
  const E_B = 1 - E_A;

  // Actual outcomes (S = 1 win, 0 loss, 0.5 draw)
  let S_A: number;
  let S_B: number;
  if (score_a > score_b) {
    S_A = 1;
    S_B = 0;
  } else if (score_b > score_a) {
    S_A = 0;
    S_B = 1;
  } else {
    S_A = 0.5;
    S_B = 0.5;
  }

  // Margin-of-victory multiplier
  // M = ln(|score_A - score_B| + 1) * 2.2 / ((R_winner - R_loser) * 0.001 + 2.2)
  const margin = Math.abs(score_a - score_b);
  const R_winner = S_A >= S_B ? R_A : R_B;
  const R_loser = S_A >= S_B ? R_B : R_A;
  // Clamp denominator to avoid division by zero when underdog wins by large margin
  const movDenominator = Math.max((R_winner - R_loser) * 0.001 + 2.2, 0.1);
  const M = (Math.log(margin + 1) * 2.2) / movDenominator;

  // New Elo = Old Elo + 32 * (S - E) * M
  const K = 32;
  const changeA = K * (S_A - E_A) * M;
  const changeB = K * (S_B - E_B) * M;

  return {
    newEloA1: Math.round(eloA1 + changeA),
    newEloA2: Math.round(eloA2 + changeA),
    newEloB1: Math.round(eloB1 + changeB),
    newEloB2: Math.round(eloB2 + changeB),
    elo_change: Math.abs(changeA),
  };
}
