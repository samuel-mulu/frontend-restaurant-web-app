import { InventoryManagement } from "@/components/features/InventoryManagement";
import { RoleGuard } from "@/components/shared/RoleGuard";

export default function InventoryPage() {
  return (
    <RoleGuard allowedRoles={["owner", "cashier"]}>
      <InventoryManagement />
    </RoleGuard>
  );
}
