# Frontend Guide for Backend Developers

This guide helps backend developers understand how the frontend integrates with the backend API, what data formats are expected, and how to ensure compatibility.

## Table of Contents

1. [Project Structure](#project-structure)
2. [API Integration Architecture](#api-integration-architecture)
3. [Expected Response Formats](#expected-response-formats)
4. [Request Formats](#request-formats)
5. [Data Transformations](#data-transformations)
6. [Error Handling](#error-handling)
7. [Environment Variables](#environment-variables)
8. [Adding New Endpoints](#adding-new-endpoints)
9. [Common Patterns](#common-patterns)
10. [Testing API Integration](#testing-api-integration)

---

## Project Structure

```
frontend/
├── app/                    # Next.js app router pages
│   ├── cashier/           # Cashier page
│   ├── menus/             # Menu management page
│   ├── categories/        # Category management page
│   └── ...
├── components/
│   ├── features/          # Feature-specific components
│   │   ├── cashireview/   # Cashier view components
│   │   ├── MenuManagement.tsx
│   │   ├── CategoryManagement.tsx
│   │   └── ...
│   └── ui/                # Reusable UI components (Shadcn)
├── lib/
│   ├── api/               # API client functions
│   │   ├── config.ts      # Base API configuration
│   │   ├── categories.ts  # Categories API client
│   │   ├── items.ts       # Items/Menu API client
│   │   └── orders.ts      # Orders API client
│   └── types.ts           # TypeScript type definitions
└── .env.local             # Environment variables (not in git)
```

---

## API Integration Architecture

### Base Configuration (`lib/api/config.ts`)

The frontend uses a centralized API configuration that:

1. **Sets Base URL**: Reads from `NEXT_PUBLIC_API_URL` environment variable
2. **Standardizes Requests**: All requests go through `apiRequest()` wrapper
3. **Handles Errors**: Converts HTTP errors to `ApiError` class
4. **Manages Headers**: Automatically sets `Content-Type: application/json`
5. **Supports FormData**: Handles file uploads (removes Content-Type for FormData)

### Standard Response Format

The frontend expects **ALL** API responses to follow this format:

```typescript
{
  success: boolean;      // Required: true for success, false for errors
  data?: T;            // Optional: The actual response data
  message?: string;    // Optional: Error or success message
  code?: string;       // Optional: Error code (e.g., "VALIDATION_ERROR")
  pagination?: {        // Optional: For paginated responses
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}
```

**Important**: Even if your endpoint doesn't use this wrapper, the frontend `apiRequest()` function expects it. If you return data directly, you'll need to update the frontend API client.

---

## Expected Response Formats

### 1. Categories API (`/api/v1/categories`)

**GET /api/v1/categories**

Expected Response:
```json
{
  "success": true,
  "data": [
    {
      "id": "507f1f77bcf86cd799439011",
      "name": "Appetizers",
      "createdAt": "2025-01-20T10:00:00.000Z",
      "updatedAt": "2025-01-20T10:00:00.000Z"
    }
  ]
}
```

**Frontend Transformation**: 
- `id` field is required (MongoDB `_id` converted to string via virtual)
- `updatedAt` is formatted to `YYYY-MM-DD` for display
- `products` count is set to 0 (not provided by backend)

---

### 2. Items/Menu API (`/api/v1/items`)

**GET /api/v1/items?categoryId=xxx&page=1&limit=10**

Expected Response:
```json
{
  "success": true,
  "data": [
    {
      "id": "507f1f77bcf86cd799439012",
      "name": "Spring Rolls",
      "category": {
        "id": "507f1f77bcf86cd799439011",
        "name": "Appetizers"
      },
      "description": "Crispy vegetable spring rolls",
      "price": 8.99,
      "image": {
        "url": "https://cloudinary.com/image.jpg",
        "publicId": "menu/spring-rolls"
      },
      "isAvailable": true,
      "createdAt": "2025-01-20T10:00:00.000Z",
      "updatedAt": "2025-01-20T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "pages": 5
  }
}
```

**Critical Requirements**:
- `id` field is **REQUIRED** - Must be a virtual field in your Mongoose model
- `category` must be populated (object with `id` and `name`)
- `price` should be in **dollars** (not cents) - Frontend displays as-is
- `isAvailable` (not `available`) - Frontend maps this
- `image` is optional but should have `url` and `publicId` if present

**Mongoose Model Setup** (Backend):
```typescript
// Add this virtual to your Item schema
ItemSchema.virtual("id").get(function () {
  return this._id.toHexString();
});

// Ensure toJSON includes virtuals
{
  toJSON: {
    virtuals: true,
    transform: (_: any, ret: Record<string, any>) => {
      delete ret._id;  // Remove _id, keep id virtual
      return ret;
    }
  }
}
```

---

### 3. Orders API (`/api/v1/orders`)

**POST /api/v1/orders**

Expected Request:
```json
{
  "tableNumber": "3",
  "items": [
    {
      "itemId": "507f1f77bcf86cd799439012",
      "typeSnapshot": "food",
      "qty": 2,
      "nameSnapshot": "Spring Rolls",
      "priceSnapshot": 8.99
    }
  ],
  "waiterId": "507f1f77bcf86cd799439013",
  "note": "Delivery order"
}
```

Expected Response:
```json
{
  "id": "507f1f77bcf86cd799439014",
  "orderNumber": "ORD-20250120-0001",
  "orderCode": "GAR-1234",
  "tableNumber": "3",
  "items": [...],
  "totalAmount": 17.98,
  "status": "pending",
  "waiterId": "507f1f77bcf86cd799439013",
  "createdAt": "2025-01-20T10:00:00.000Z",
  "updatedAt": "2025-01-20T10:00:00.000Z"
}
```

**Note**: Orders API currently returns data directly (not wrapped in `{ success: true, data: ... }`). The frontend handles this specially.

---

## Request Formats

### Standard JSON Requests

All POST/PATCH requests (except file uploads) send JSON:

```typescript
{
  "categoryId": "507f1f77bcf86cd799439011",
  "name": "Spring Rolls",
  "description": "Crispy vegetable spring rolls",
  "price": 8.99,
  "isAvailable": true
}
```

### FormData Requests (File Uploads)

For endpoints that accept images (e.g., `/api/v1/items`), the frontend sends `FormData`:

```
categoryId: "507f1f77bcf86cd799439011"
name: "Spring Rolls"
description: "Crispy vegetable spring rolls"
price: "8.99"
isAvailable: "true"
image: [File object]
```

**Backend should**:
- Accept `multipart/form-data`
- Parse FormData fields
- Handle the image file upload
- Return the same response format as JSON requests

---

## Data Transformations

The frontend transforms backend data for UI display:

### Category Transformation

```typescript
Backend → Frontend
{
  id: string,           // From _id virtual
  name: string,
  updatedAt: string     // ISO date string
}
→
{
  id: string,
  name: string,
  products: 0,          // Default value (not from backend)
  updatedAt: "2025-01-20" // Formatted to YYYY-MM-DD
}
```

### Item/Menu Transformation

```typescript
Backend → Frontend
{
  id: string,
  name: string,
  category: { id: string, name: string },
  price: number,        // In dollars
  isAvailable: boolean,
  image?: { url: string, publicId: string }
}
→
{
  id: string,
  name: string,
  category: string,      // category.id
  categoryName: string,  // category.name (for display)
  price: number,
  available: boolean,    // isAvailable → available
  imageUrl?: string,     // image.url
  updatedAt: "2025-01-20" // Formatted date
}
```

---

## Error Handling

### Expected Error Response Format

```json
{
  "success": false,
  "message": "Category name already exists",
  "code": "DUPLICATE_CATEGORY"
}
```

### HTTP Status Codes

The frontend handles these status codes:

- **200-299**: Success (with `success: true`)
- **400**: Validation error - Shows error message to user
- **404**: Not found - Shows "Item not found" message
- **409**: Conflict - Shows "Already exists" message
- **500**: Server error - Shows generic error message
- **0**: Network error - Shows "Could not connect to server"

### Error Handling in Frontend

```typescript
try {
  const data = await createCategory(name);
  toast.success("Category created successfully");
} catch (err) {
  if (err instanceof ApiError) {
    if (err.status === 409) {
      toast.error(`Category "${name}" already exists`);
    } else if (err.status === 0) {
      toast.error("Network error: Could not connect to the server");
    } else {
      toast.error(err.message || "Failed to create category");
    }
  }
}
```

---

## Environment Variables

### Required Environment Variable

Create `.env.local` in the `frontend/` directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
```

**Important**: 
- `NEXT_PUBLIC_` prefix is required for Next.js to expose it to the browser
- Default fallback is `http://localhost:5000/api/v1`
- For production, set this to your production API URL

---

## Adding New Endpoints

### Step 1: Create API Client File

Create a new file in `lib/api/` (e.g., `lib/api/staff.ts`):

```typescript
import { api, ApiError as ApiErrorClass } from "./config";

// Re-export ApiError
export { ApiErrorClass as ApiError };

// Define backend response interface
interface BackendStaff {
  id: string;
  name: string;
  email: string;
  role: string;
}

// Transform backend data to frontend format
function transformStaff(backendStaff: BackendStaff): Staff {
  return {
    id: backendStaff.id,
    name: backendStaff.name,
    email: backendStaff.email,
    role: backendStaff.role,
  };
}

// API functions
export async function getStaff(): Promise<Staff[]> {
  try {
    const backendStaff = await api.get<BackendStaff[]>("/staff");
    return backendStaff.map(transformStaff);
  } catch (error) {
    if (error instanceof ApiErrorClass) {
      throw error;
    }
    throw new ApiErrorClass(500, "Failed to fetch staff", "FETCH_ERROR");
  }
}
```

### Step 2: Ensure Backend Response Format

Your backend endpoint should return:

```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "name": "...",
      ...
    }
  ]
}
```

### Step 3: Use in Component

```typescript
import { getStaff, ApiError } from "@/lib/api/staff";

const fetchStaff = async () => {
  try {
    const staff = await getStaff();
    setStaff(staff);
  } catch (err) {
    if (err instanceof ApiError) {
      toast.error(err.message);
    }
  }
};
```

---

## Common Patterns

### 1. Pagination

**Backend should return**:
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "pages": 10
  }
}
```

**Frontend usage**:
```typescript
const response = await getItems(categoryId, { page: 1, limit: 10 });
// response.data = items array
// response.pagination = pagination info
```

### 2. Filtering

**Query Parameters**:
- `categoryId`: Filter items by category
- `status`: Filter orders by status
- `page`, `limit`: Pagination

**Example**: `GET /api/v1/items?categoryId=xxx&page=1&limit=10`

### 3. File Uploads

**Frontend sends FormData**:
```typescript
const formData = new FormData();
formData.append("name", "Item Name");
formData.append("price", "10.99");
formData.append("image", file);
```

**Backend should**:
- Accept `multipart/form-data`
- Parse all fields as strings (convert numbers)
- Handle file upload to Cloudinary/storage

### 4. Date Formats

**Backend sends**: ISO 8601 format (`2025-01-20T10:00:00.000Z`)

**Frontend displays**: `YYYY-MM-DD` format (`2025-01-20`)

**Transformation**:
```typescript
new Date(backendDate).toISOString().split("T")[0]
```

---

## Testing API Integration

### 1. Check Response Format

Ensure your endpoint returns:
```json
{
  "success": true,
  "data": { ... }
}
```

### 2. Verify ID Field

All models must have an `id` virtual field:
```typescript
Schema.virtual("id").get(function () {
  return this._id.toHexString();
});
```

### 3. Test Error Responses

Test with invalid data:
- Missing required fields → Should return 400 with message
- Duplicate entries → Should return 409 with message
- Not found → Should return 404 with message

### 4. Check Network Tab

In browser DevTools → Network tab:
- Verify request URL is correct
- Check request payload format
- Verify response format matches expected structure

---

## Currency Format

**Important**: The frontend displays currency as **"ብር"** (Ethiopian Birr), not "$".

All price displays show: `{price} ብር` (e.g., "25.50 ብር")

Backend should send prices in **dollars** (decimal format), not cents.

---

## Quick Checklist for New Endpoints

- [ ] Endpoint returns `{ success: true, data: ... }` format
- [ ] All models have `id` virtual field (not `_id`)
- [ ] Dates are in ISO 8601 format
- [ ] Prices are in dollars (decimal), not cents
- [ ] Error responses include `success: false` and `message`
- [ ] Pagination includes `pagination` object when applicable
- [ ] File uploads accept `multipart/form-data`
- [ ] Response matches the expected interface in frontend API client

---

## Support

If you encounter issues:

1. **Check Browser Console**: Look for API errors
2. **Check Network Tab**: Verify request/response format
3. **Check Frontend API Client**: See `lib/api/[endpoint].ts` for expected format
4. **Check Types**: See `lib/types.ts` for interface definitions

---

## Example: Complete Integration Flow

### Backend Endpoint

```typescript
// GET /api/v1/categories
router.get("/", async (req, res) => {
  const categories = await Category.find();
  res.json({
    success: true,
    data: categories  // Mongoose automatically converts _id to id via virtual
  });
});
```

### Frontend API Client

```typescript
// lib/api/categories.ts
export async function getCategories(): Promise<Category[]> {
  const backendCategories = await api.get<BackendCategory[]>("/categories");
  return backendCategories.map(transformCategory);
}
```

### Component Usage

```typescript
// components/features/CategoryManagement.tsx
const [categories, setCategories] = useState<Category[]>([]);

useEffect(() => {
  const fetchCategories = async () => {
    try {
      const data = await getCategories();
      setCategories(data);
    } catch (err) {
      toast.error("Failed to load categories");
    }
  };
  fetchCategories();
}, []);
```

---

This guide should help you ensure your backend endpoints are compatible with the frontend. If you need to add new endpoints or modify existing ones, follow these patterns for seamless integration.

