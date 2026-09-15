import { ProductManagement } from "@/components/features/ProductManagement";
import { RoleGuard } from "@/components/shared/RoleGuard";

export default function ProductsPage() {
  return (
    <RoleGuard allowedRoles={["owner", "cashier"]}>
      <ProductManagement />
    </RoleGuard>
  );
}
