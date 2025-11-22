/**
 * Items API Client
 *
 * This file contains all API functions for item/menu operations.
 * Each function corresponds to a backend endpoint:
 *
 * - getItems() -> GET /api/v1/items
 * - getItem() -> GET /api/v1/items/:id
 * - createItem() -> POST /api/v1/items
 * - updateItem() -> PATCH /api/v1/items/:id
 * - deleteItem() -> DELETE /api/v1/items/:id
 * - updateItemAvailability() -> PATCH /api/v1/items/:id/availability
 */

import { api, ApiError as ApiErrorClass } from "./config";
import { Menu } from "../menu-store";

// Re-export ApiError for use in components
export { ApiErrorClass as ApiError };

/**
 * Backend Item Response
 * This matches what the backend actually returns
 */
interface BackendItem {
  id: string;
  name: string;
  category: {
    id: string;
    name: string;
  };
  description?: string;
  price: number; // Already in dollars (backend stores as cents but returns as dollars)
  image?: {
    url?: string;
    publicId?: string;
  };
  isAvailable: boolean;
  createdAt: string;
  updatedAt: string;
  clientId?: string;
}

/**
 * Create Item Input
 * What we send to the backend when creating/updating
 */
export interface CreateItemInput {
  categoryId: string;
  name: string;
  description?: string;
  price: number;
  isAvailable?: boolean;
  image?: File; // Optional image file
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
}

/**
 * Paginated response from backend
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Transform backend item to frontend menu format
 * Maps backend structure to Menu interface used in the component
 */
function transformItem(backendItem: BackendItem): Menu {
  return {
    id: backendItem.id,
    name: backendItem.name,
    // Use category.id as the category string for compatibility
    // The UI will display category.name but store category.id
    category: backendItem.category.id,
    price: backendItem.price,
    description: backendItem.description || "",
    // Map isAvailable to available
    available: backendItem.isAvailable,
    // Format the date for display (YYYY-MM-DD)
    updatedAt: new Date(backendItem.updatedAt).toISOString().split("T")[0],
  };
}

/**
 * Fetch items with pagination and optional category filter
 *
 * GET /api/v1/items?categoryId=xxx&page=1&limit=10
 *
 * @param categoryId - Optional category ID to filter by
 * @param pagination - Optional pagination parameters
 * @returns Promise with paginated menu items
 * @throws ApiError if request fails
 */
export async function getItems(
  categoryId?: string,
  pagination?: PaginationParams
): Promise<PaginatedResponse<Menu>> {
  try {
    // Build query string
    const queryParams = new URLSearchParams();
    if (categoryId) {
      queryParams.append("categoryId", categoryId);
    }
    if (pagination?.page) {
      queryParams.append("page", pagination.page.toString());
    }
    if (pagination?.limit) {
      queryParams.append("limit", pagination.limit.toString());
    }

    const endpoint = `/items${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
    
    // Check if backend returns paginated response or array
    const response = await api.get<PaginatedResponse<BackendItem> | BackendItem[]>(endpoint);

    // Handle both paginated and non-paginated responses
    if (Array.isArray(response)) {
      // Backend doesn't support pagination yet, return as paginated with all items
      const items = response.map(transformItem);
      return {
        data: items,
        pagination: {
          page: 1,
          limit: items.length,
          total: items.length,
          totalPages: 1,
        },
      };
    } else {
      // Backend returns paginated response
      return {
        data: response.data.map(transformItem),
        pagination: response.pagination,
      };
    }
  } catch (error) {
    // Re-throw ApiError as-is, but add context for logging
    if (error instanceof ApiErrorClass) {
      throw error;
    }
    throw new ApiErrorClass(500, "Failed to fetch items", "FETCH_ERROR");
  }
}

/**
 * Fetch a single item by ID
 *
 * GET /api/v1/items/:id
 *
 * @param id - Item ID
 * @returns Promise<Menu> - Menu item
 * @throws ApiError if request fails (e.g., not found - 404)
 */
export async function getItem(id: string): Promise<Menu> {
  try {
    // Validate input
    if (!id) {
      throw new ApiErrorClass(400, "Item ID is required", "VALIDATION_ERROR");
    }

    const backendItem = await api.get<BackendItem>(`/items/${id}`);
    return transformItem(backendItem);
  } catch (error) {
    // Re-throw ApiError as-is
    if (error instanceof ApiErrorClass) {
      throw error;
    }
    throw new ApiErrorClass(500, "Failed to fetch item", "FETCH_ERROR");
  }
}

/**
 * Create a new item
 *
 * POST /api/v1/items
 * Body: FormData with { categoryId, name, description?, price, isAvailable?, image }
 *
 * @param data - Item creation data
 * @returns Promise<Menu> - Created menu item
 * @throws ApiError if request fails
 */
export async function createItem(data: CreateItemInput): Promise<Menu> {
  try {
    // Validate input
    if (!data.categoryId) {
      throw new ApiErrorClass(
        400,
        "Category ID is required",
        "VALIDATION_ERROR"
      );
    }
    if (!data.name || !data.name.trim()) {
      throw new ApiErrorClass(400, "Item name is required", "VALIDATION_ERROR");
    }
    if (data.price === undefined || data.price < 0) {
      throw new ApiErrorClass(
        400,
        "Valid price is required",
        "VALIDATION_ERROR"
      );
    }

    // If image is provided, use FormData; otherwise use JSON
    if (data.image) {
      const formData = new FormData();
      formData.append("categoryId", data.categoryId);
      formData.append("name", data.name.trim());
      if (data.description) {
        formData.append("description", data.description.trim());
      }
      formData.append("price", data.price.toString());
      formData.append("isAvailable", (data.isAvailable !== undefined ? data.isAvailable : true).toString());
      formData.append("image", data.image);

      const backendItem = await api.postFormData<BackendItem>("/items", formData);
      return transformItem(backendItem);
    } else {
      // No image, use regular JSON request
      const backendItem = await api.post<BackendItem>("/items", {
        categoryId: data.categoryId,
        name: data.name.trim(),
        description: data.description?.trim(),
        price: data.price,
        isAvailable: data.isAvailable !== undefined ? data.isAvailable : true,
      });

      return transformItem(backendItem);
    }
  } catch (error) {
    // Re-throw ApiError as-is
    if (error instanceof ApiErrorClass) {
      throw error;
    }
    throw new ApiErrorClass(500, "Failed to create item", "CREATE_ERROR");
  }
}

/**
 * Update an existing item
 *
 * PATCH /api/v1/items/:id
 * Body: FormData or JSON with { categoryId?, name?, description?, price?, isAvailable?, image? }
 *
 * @param id - Item ID
 * @param data - Update data
 * @returns Promise<Menu> - Updated menu item
 * @throws ApiError if request fails (e.g., not found - 404)
 */
export async function updateItem(
  id: string,
  data: Partial<CreateItemInput>
): Promise<Menu> {
  try {
    // Validate input
    if (!id) {
      throw new ApiErrorClass(400, "Item ID is required", "VALIDATION_ERROR");
    }

    // If image is provided, use FormData; otherwise use JSON
    if (data.image) {
      const formData = new FormData();
      
      if (data.categoryId !== undefined) {
        formData.append("categoryId", data.categoryId);
      }
      if (data.name !== undefined) {
        if (!data.name.trim()) {
          throw new ApiErrorClass(400, "Item name cannot be empty", "VALIDATION_ERROR");
        }
        formData.append("name", data.name.trim());
      }
      if (data.description !== undefined) {
        formData.append("description", data.description.trim());
      }
      if (data.price !== undefined) {
        if (data.price < 0) {
          throw new ApiErrorClass(400, "Price cannot be negative", "VALIDATION_ERROR");
        }
        formData.append("price", data.price.toString());
      }
      if (data.isAvailable !== undefined) {
        formData.append("isAvailable", data.isAvailable.toString());
      }
      formData.append("image", data.image);

      const backendItem = await api.patchFormData<BackendItem>(`/items/${id}`, formData);
      return transformItem(backendItem);
    } else {
      // No image, use regular JSON request
      const updateData: any = {};
      if (data.categoryId !== undefined) {
        updateData.categoryId = data.categoryId;
      }
      if (data.name !== undefined) {
        if (!data.name.trim()) {
          throw new ApiErrorClass(400, "Item name cannot be empty", "VALIDATION_ERROR");
        }
        updateData.name = data.name.trim();
      }
      if (data.description !== undefined) {
        updateData.description = data.description.trim();
      }
      if (data.price !== undefined) {
        if (data.price < 0) {
          throw new ApiErrorClass(400, "Price cannot be negative", "VALIDATION_ERROR");
        }
        updateData.price = data.price;
      }
      if (data.isAvailable !== undefined) {
        updateData.isAvailable = data.isAvailable;
      }

      const backendItem = await api.patch<BackendItem>(`/items/${id}`, updateData);
      return transformItem(backendItem);
    }
  } catch (error) {
    // Re-throw ApiError as-is
    if (error instanceof ApiErrorClass) {
      throw error;
    }
    throw new ApiErrorClass(500, "Failed to update item", "UPDATE_ERROR");
  }
}

/**
 * Delete an item (soft delete)
 *
 * DELETE /api/v1/items/:id
 *
 * @param id - Item ID
 * @returns Promise<void>
 * @throws ApiError if request fails (e.g., not found - 404)
 */
export async function deleteItem(id: string): Promise<void> {
  try {
    // Validate input
    if (!id) {
      throw new ApiErrorClass(400, "Item ID is required", "VALIDATION_ERROR");
    }

    await api.delete(`/items/${id}`);
  } catch (error) {
    // Re-throw ApiError as-is
    if (error instanceof ApiErrorClass) {
      throw error;
    }
    throw new ApiErrorClass(500, "Failed to delete item", "DELETE_ERROR");
  }
}

/**
 * Update item availability status
 *
 * PATCH /api/v1/items/:id/availability
 * Body: { isAvailable: boolean }
 *
 * @param id - Item ID
 * @param isAvailable - New availability status
 * @returns Promise<Menu> - Updated menu item
 * @throws ApiError if request fails (e.g., not found - 404)
 */
export async function updateItemAvailability(
  id: string,
  isAvailable: boolean
): Promise<Menu> {
  try {
    // Validate input
    if (!id) {
      throw new ApiErrorClass(400, "Item ID is required", "VALIDATION_ERROR");
    }

    const backendItem = await api.patch<BackendItem>(
      `/items/${id}/availability`,
      { isAvailable }
    );

    return transformItem(backendItem);
  } catch (error) {
    // Re-throw ApiError as-is
    if (error instanceof ApiErrorClass) {
      throw error;
    }
    throw new ApiErrorClass(
      500,
      "Failed to update item availability",
      "UPDATE_AVAILABILITY_ERROR"
    );
  }
}

