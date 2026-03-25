import { AllocationCheck } from "@/features/recipient/allocation-check";

export const metadata = {
  title: "Claim | Fhenix Payroll",
};

export default function ClaimPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <AllocationCheck />
    </div>
  );
}
