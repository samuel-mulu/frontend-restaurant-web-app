/**
 * Menu item type used in the frontend
 * This matches the transformed item from the API
 */
export interface Menu {
  id: string;
  name: string;
  category: string; // categoryId
  price: number;
  description?: string;
  imageUrl?: string;
  available: boolean;
  approvalStatus?: "pendingapproval" | "approved" | "rejected";
  ingredients?: string[];
  mealType?: "breakfast" | "lunch" | "dinner" | "treats";
  special?: boolean;
  updatedAt: string;
}
