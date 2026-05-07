export interface Round {
  id: string;
  roundNumber: number;
  status: "BETTING" | "IN_PROGRESS" | "CRASHED";
  serverSeedHash: string;
  serverSeed: string | null;
  crashPointHundredths: number | null;
  bettingStartsAt: string;
  bettingClosesAt: string;
  startedAt: string | null;
  crashedAt: string | null;
  settledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Bet {
  id: string;
  roundId: string;
  playerId: string;
  amountInCents: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "CASHOUT_PENDING" | "CASHED_OUT" | "LOST";
  cashoutMultiplierHundredths: number | null;
  payoutInCents: string | null;
  correlationId: string | null;
  rejectionReason: string | null;
  placedAt: string;
  acceptedAt: string | null;
  cashedOutAt: string | null;
  settledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Wallet {
  id: string;
  playerId: string;
  balanceInCents: string;
  createdAt: string;
  updatedAt: string;
}

export interface RoundHistoryItem {
  id: string;
  roundNumber: number;
  crashPointHundredths: number | null;
  crashedAt: string | null;
  serverSeedHash: string;
}

export interface GameState {
  round: Round | null;
  myBet: Bet | null;
  wallet: Wallet | null;
  history: RoundHistoryItem[];
  bets: Bet[];
  serverTime: string | null;
}
