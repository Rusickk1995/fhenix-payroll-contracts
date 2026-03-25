import { RoundManagement } from "@/features/admin/round-management";

export const metadata = {
  title: "Operate | Fhenix Payroll",
};

export default function AdminPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <RoundManagement />
    </div>
  );
}
