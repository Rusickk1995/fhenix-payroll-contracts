export type RoundStatus = 0 | 1 | 2;

export type RoundView = {
  id: number;
  name: string;
  claimDeadline: bigint;
  status: RoundStatus;
  recipientCount: number;
  claimedCount: number;
  fundedAmount: bigint;
  totalAllocated: bigint;
  totalClaimed: bigint;
  totalReclaimed: bigint;
  fundingShortfall: bigint;
  isExactFunding: boolean;
  openable: boolean;
  claimActive: boolean;
  reclaimableAmount: bigint;
};

export type ProtocolSnapshot = {
  rounds: RoundView[];
  totalRounds: number;
  openRounds: number;
  totalFunded: bigint;
  totalClaimed: bigint;
};
