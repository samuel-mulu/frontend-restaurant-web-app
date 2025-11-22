import { api, ApiError as ApiErrorClass } from "./config";
import { Category } from "../types";

// Re-export ApiError for use in components
export { ApiErrorClass as ApiError };

/**
 * Backend Category Response
 * This matches what the backend actually returns
 */
interface BackendCategory {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  clientId?: string;
}

/**
 * Transform backend category to frontend category format
 * The backend returns dates as ISO strings, and doesn't include products count
 */
function transformCategory(backendCategory: BackendCategory): Category {
  return {
    id: backendCategory.id,
    name: backendCategory.name,
    // Backend doesn't provide products count, so we set it to 0
    // In a real app, you might want to fetch this separately or include it in the backend response
    products: 0,
    // Format the date for display (YYYY-MM-DD)
    updatedAt: new Date(backendCategory.updatedAt).toISOString().split("T")[0],
  };
}

/**
 * Fetch all categories
 *
 * GET /api/v1/categories
 *
 * @returns Promise<Category[]> - Array of categories
 * @throws ApiError if request fails
 */
export async function getCategories(): Promise<Category[]> {
  try {
    const backendCategories = await api.get<BackendCategory[]>("/categories");

    // Transform each category to match frontend format
    return backendCategories.map(transformCategory);
  } catch (error) {
    // Re-throw ApiError as-is, but add context for logging
    if (error instanceof ApiErrorClass) {
      throw error;
    }
    throw new ApiErrorClass(500, "Failed to fetch categories", "FETCH_ERROR");
  }
}

/**
 * Create a new category
 *
 * POST /api/v1/categories
 * Body: { name: string }
 *
 * @param name - Category name
 * @returns Promise<Category> - Created category
 * @throws ApiError if request fails (e.g., duplicate name - 409)
 */
export async function createCategory(name: string): Promise<Category> {
  try {
    // Validate input
    if (!name || !name.trim()) {
      throw new ApiErrorClass(
        400,
        "Category name is required",
        "VALIDATION_ERROR"
      );
    }

    const backendCategory = await api.post<BackendCategory>("/categories", {
      name: name.trim(),
    });

    return transformCategory(backendCategory);
  } catch (error) {
    // Re-throw ApiError as-is
    if (error instanceof ApiErrorClass) {
      throw error;
    }
    throw new ApiErrorClass(500, "Failed to create category", "CREATE_ERROR");
  }
}

/**
 * Update an existing category
 *
 * PATCH /api/v1/categories/:id
 * Body: { name: string }
 *
 * @param id - Category ID
 * @param name - New category name
 * @returns Promise<Category> - Updated category
 * @throws ApiError if request fails (e.g., not found - 404, duplicate - 409)
 */
export async function updateCategory(
  id: string,
  name: string
): Promise<Category> {
  try {
    // Validate input
    if (!id) {
      throw new ApiErrorClass(
        400,
        "Category ID is required",
        "VALIDATION_ERROR"
      );
    }
    if (!name || !name.trim()) {
      throw new ApiErrorClass(
        400,
        "Category name is required",
        "VALIDATION_ERROR"
      );
    }

    const backendCategory = await api.patch<BackendCategory>(
      `/categories/${id}`,
      {
        name: name.trim(),
      }
    );

    return transformCategory(backendCategory);
  } catch (error) {
    // Re-throw ApiError as-is
    if (error instanceof ApiErrorClass) {
      throw error;
    }
    throw new ApiErrorClass(500, "Failed to update category", "UPDATE_ERROR");
  }
}

/**
 * Delete a category
 *
 * DELETE /api/v1/categories/:id
 *
 * @param id - Category ID
 * @returns Promise<void>
 * @throws ApiError if request fails (e.g., not found - 404)
 */
export async function deleteCategory(id: string): Promise<void> {
  try {
    // Validate input
    if (!id) {
      throw new ApiErrorClass(
        400,
        "Category ID is required",
        "VALIDATION_ERROR"
      );
    }

    await api.delete(`/categories/${id}`);
  } catch (error) {
    // Re-throw ApiError as-is
    if (error instanceof ApiErrorClass) {
      throw error;
    }
    throw new ApiErrorClass(500, "Failed to delete category", "DELETE_ERROR");
  }
}
