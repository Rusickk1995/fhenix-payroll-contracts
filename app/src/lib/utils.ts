import { BaseError } from "viem";
import type { RoundView } from "@/types/round";

export function shortenAddress(address?: string) {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatRoundStatus(status: number) {
  if (status === 0) return "Draft";
  if (status === 1) return "Open";
  return "Closed";
}

export function formatDeadline(deadline: bigint) {
  if (deadline === 0n) return "No deadline";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(Number(deadline) * 1000));
}

export function formatAmount(amount: bigint, suffix = "units") {
  return `${new Intl.NumberFormat("en-US").format(Number(amount))} ${suffix}`;
}

export function formatAmountCompact(amount: bigint) {
  return new Intl.NumberFormat("en-US").format(Number(amount));
}

export function getRoundCompletion(round: RoundView) {
  if (round.recipientCount === 0) return 0;
  return Math.min(100, (round.claimedCount / round.recipientCount) * 100);
}

export function getClaimStateLabel(round: RoundView) {
  if (round.status === 0) return "Draft";
  if (round.status === 2) return "Closed";
  if (round.claimActive) return "Claim Live";
  return "Window Ended";
}

export function getExplorerLink(baseUrl: string, type: "address" | "tx", value: string) {
  return `${baseUrl.replace(/\/$/, "")}/${type === "address" ? "address" : "tx"}/${value}`;
}

export function extractErrorMessage(error: unknown) {
  if (error instanceof BaseError) return error.shortMessage || error.message;
  if (error instanceof Error) return error.message;
  return "Something went wrong.";
}
