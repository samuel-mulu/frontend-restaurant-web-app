# Frontend-Backend Integration Guide

## Overview

This document explains how the frontend (React/Next.js) integrates with the backend (Express/Node.js) API for category management. This is a beginner-friendly guide that walks through the complete flow from user interaction to database and back.

---

## Architecture Overview

```
┌─────────────────┐         ┌──────────────┐         ┌──────────────┐
│   React UI      │  HTTP   │  API Client  │  HTTP   │   Backend    │
│  Component      │ ──────> │   (config)   │ ──────> │   Express    │
│                 │         │              │         │              │
│ CategoryManagement│         │ categories.ts│         │ category.controller│
└─────────────────┘         └──────────────┘         └──────────────┘
                                                              │
                                                              ▼
                                                       ┌──────────────┐
                                                       │   MongoDB    │
                                                       │  Database    │
                                                       └──────────────┘
```

---

## Complete Request Flow: Creating a Category

Let's trace what happens when a user creates a new category. This is the most complete example.

### Step 1: User Interaction (Frontend UI)

**File:** `components/features/CategoryManagement.tsx`

```typescript
// User clicks "Create Category" button
<Button onClick={() => setIsCreateOpen(true)}>Create Category</Button>

// User enters category name and clicks "Create"
<Button onClick={handleCreate}>Create Category</Button>
```

**What happens:**

- User fills in the category name in a dialog
- Clicks the "Create Category" button
- `handleCreate()` function is called

---

### Step 2: Frontend Handler Function

**File:** `components/features/CategoryManagement.tsx` (lines 88-119)

```typescript
const handleCreate = async () => {
  // 1. Validate input locally (client-side validation)
  if (!categoryName.trim()) {
    toast.error("Please enter a category name");
    return; // Stop here if invalid
  }

  try {
    setIsSubmitting(true); // Show loading state

    // 2. Call API function
    const newCategory = await createCategory(categoryName);

    // 3. Update local state (optimistic update)
    setCategories([...categories, newCategory]);

    // 4. Reset form and close dialog
    setCategoryName("");
    setIsCreateOpen(false);
    toast.success("Category created successfully");
  } catch (err: unknown) {
    // 5. Handle errors
    if (err instanceof ApiError) {
      if (err.status === 409) {
        toast.error(`Category "${categoryName}" already exists`);
      } else if (err.status === 0) {
        toast.error("Network error: Could not connect to the server");
      }
    }
  } finally {
    setIsSubmitting(false); // Hide loading state
  }
};
```

**Key Points:**

- **Client-side validation** happens first (fast feedback)
- **Loading state** prevents double submissions
- **Error handling** provides user-friendly messages
- **State update** keeps UI in sync with backend

---

### Step 3: API Client Function

**File:** `lib/api/categories.ts` (lines 80-99)

```typescript
export async function createCategory(name: string): Promise<Category> {
  try {
    // 1. Validate input again (defense in depth)
    if (!name || !name.trim()) {
      throw new ApiErrorClass(
        400,
        "Category name is required",
        "VALIDATION_ERROR"
      );
    }

    // 2. Call the generic API request function
    const backendCategory = await api.post<BackendCategory>("/categories", {
      name: name.trim(),
    });

    // 3. Transform backend response to frontend format
    return transformCategory(backendCategory);
  } catch (error) {
    // 4. Re-throw or wrap errors
    if (error instanceof ApiErrorClass) {
      throw error; // Pass through known errors
    }
    throw new ApiErrorClass(500, "Failed to create category", "CREATE_ERROR");
  }
}
```

**Key Points:**

- **Double validation** (client + API layer)
- **Data transformation** converts backend format to frontend format
- **Error propagation** maintains error context

---

### Step 4: Generic API Request Function

**File:** `lib/api/config.ts` (lines 45-95)

```typescript
export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  // 1. Construct full URL
  const url = `${API_BASE_URL}${endpoint}`;
  // Example: "http://localhost:5000/api/v1/categories"

  // 2. Prepare headers
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  // 3. Serialize body to JSON
  const config: RequestInit = {
    ...options,
    headers,
    body:
      options.body && typeof options.body === "object"
        ? JSON.stringify(options.body)
        : options.body,
  };

  try {
    // 4. Make HTTP request
    const response = await fetch(url, config);
    // This sends: POST http://localhost:5000/api/v1/categories
    // Body: {"name": "Beverages"}

    // 5. Parse JSON response
    const data: ApiResponse<T> = await response.json();

    // 6. Check for errors
    if (!response.ok || !data.success) {
      throw new ApiError(
        response.status,
        data.message || `Request failed with status ${response.status}`,
        data.code
      );
    }

    // 7. Return the data
    return data.data as T;
  } catch (error) {
    // 8. Handle network errors
    if (error instanceof ApiError) {
      throw error;
    }
    if (error instanceof TypeError && error.message.includes("fetch")) {
      throw new ApiError(0, "Network error...", "NETWORK_ERROR");
    }
    throw new ApiError(500, "An unexpected error occurred", "UNKNOWN_ERROR");
  }
}
```

**Key Points:**

- **URL construction** combines base URL + endpoint
- **JSON serialization** converts JavaScript objects to JSON strings
- **Response parsing** converts JSON strings back to objects
- **Error standardization** converts HTTP errors to ApiError objects

---

### Step 5: HTTP Request (Network Layer)

**What actually gets sent over the network:**

```
POST http://localhost:5000/api/v1/categories HTTP/1.1
Host: localhost:5000
Content-Type: application/json
Content-Length: 20

{"name":"Beverages"}
```

**What comes back:**

```
HTTP/1.1 201 Created
Content-Type: application/json

{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "name": "beverages",
    "createdAt": "2025-01-20T10:30:00.000Z",
    "updatedAt": "2025-01-20T10:30:00.000Z"
  }
}
```

---

### Step 6: Backend Route Handler

**File:** `restaurant-menu-backend/src/modules/categories/category.routes.ts`

```typescript
router.post("/", ctrl.create);
```

**What happens:**

- Express matches the POST request to `/api/v1/categories`
- Calls the `create` controller function

---

### Step 7: Backend Controller

**File:** `restaurant-menu-backend/src/modules/categories/category.controller.ts` (lines 24-31)

```typescript
export const create = async (req: Request, res: Response) => {
  try {
    // 1. Extract data from request body
    const category = await categoryService.createCategory(req.body);
    // req.body = { name: "Beverages" }

    // 2. Send success response
    send(res, 201, { data: category });
    // Sends: { success: true, data: {...} }
  } catch (err) {
    // 3. Handle errors
    sendError(res, err);
  }
};
```

**Key Points:**

- **Request parsing** - Express automatically parses JSON body
- **Service layer** - Business logic is in the service, not controller
- **Response formatting** - Consistent response structure

---

### Step 8: Backend Service

**File:** `restaurant-menu-backend/src/modules/categories/category.service.ts` (lines 21-56)

```typescript
export const createCategory = async (data: {
  name: string;
  clientId?: string;
}): Promise<CategoryDoc> => {
  // 1. Normalize name (lowercase, trim)
  const name = data.name.trim().toLowerCase();
  const escaped = escapeRegex(name);

  // 2. Check for duplicates
  const exists = await Category.findOne({
    name: { $regex: `^${escaped}$`, $options: "i" },
  });

  if (exists) {
    throw new CategoryServiceError(
      409,
      `Category "${name}" already exists`,
      "DUPLICATE_CATEGORY"
    );
  }

  // 3. Create in database
  try {
    const category = await Category.create({
      name,
      clientId: data.clientId,
    });
    return category;
  } catch (err: any) {
    // 4. Handle database errors
    if (err.code === 11000) {
      throw new CategoryServiceError(
        409,
        "Category already exists",
        "DUPLICATE_CATEGORY"
      );
    }
    throw new CategoryServiceError(500, "Create failed");
  }
};
```

**Key Points:**

- **Business logic** - Validation, duplicate checking
- **Database interaction** - MongoDB operations
- **Error handling** - Database-specific error codes

---

### Step 9: Database (MongoDB)

**What happens:**

- MongoDB receives the insert operation
- Creates a new document in the `categories` collection
- Generates a unique `_id` (ObjectId)
- Adds timestamps (`createdAt`, `updatedAt`)

**Document stored:**

```json
{
  "_id": ObjectId("507f1f77bcf86cd799439011"),
  "name": "beverages",
  "isDeleted": false,
  "createdAt": ISODate("2025-01-20T10:30:00.000Z"),
  "updatedAt": ISODate("2025-01-20T10:30:00.000Z")
}
```

---

### Step 10: Response Journey Back

The response travels back through the same layers in reverse:

1. **Database** → Returns document
2. **Service** → Returns CategoryDoc
3. **Controller** → Wraps in `{ success: true, data: {...} }`
4. **Express** → Sends HTTP response
5. **Network** → Transmits JSON
6. **API Client** → Parses JSON, checks for errors
7. **Transform** → Converts backend format to frontend format
8. **Component** → Updates state, shows success message

---

## Data Transformation Flow

### Backend Format (MongoDB Document)

```typescript
{
  _id: ObjectId("507f1f77bcf86cd799439011"),
  name: "beverages",
  createdAt: ISODate("2025-01-20T10:30:00.000Z"),
  updatedAt: ISODate("2025-01-20T10:30:00.000Z"),
  isDeleted: false
}
```

### Backend Response (After toJSON transform)

```typescript
{
  id: "507f1f77bcf86cd799439011",  // _id converted to id
  name: "beverages",
  createdAt: "2025-01-20T10:30:00.000Z",  // Date to ISO string
  updatedAt: "2025-01-20T10:30:00.000Z",
  // isDeleted is removed by transform
}
```

### Frontend Format (After transformCategory)

```typescript
{
  id: "507f1f77bcf86cd799439011",
  name: "beverages",
  products: 0,  // Added (backend doesn't provide)
  updatedAt: "2025-01-20"  // Formatted for display
}
```

**Transformation happens in:** `lib/api/categories.ts` → `transformCategory()`

---

## Error Handling Flow

### Error Types and Their Journey

#### 1. Network Error (Backend Down)

```
User Action → API Call → fetch() fails
  ↓
ApiError(status: 0, message: "Network error...")
  ↓
Component catch block
  ↓
toast.error("Network error: Could not connect to the server")
```

#### 2. Validation Error (Empty Name)

```
User Action → handleCreate() → Validation fails
  ↓
toast.error("Please enter a category name")
  ↓
(No API call made - saves network request)
```

#### 3. Duplicate Category (409 Conflict)

```
User Action → API Call → Backend Service → Database check
  ↓
CategoryServiceError(409, "Category already exists")
  ↓
Controller → sendError() → HTTP 409
  ↓
API Client → ApiError(status: 409)
  ↓
Component → toast.error("Category 'Beverages' already exists")
```

#### 4. Not Found Error (404)

```
User Action → Update/Delete → API Call → Backend
  ↓
Service → Category.findById() → null
  ↓
CategoryServiceError(404, "Category not found")
  ↓
Controller → HTTP 404
  ↓
Component → toast.error("Category not found. It may have been deleted.")
  ↓
fetchCategories() // Refresh list
```

---

## State Management Flow

### Component State Lifecycle

```typescript
// Initial State
const [categories, setCategories] = useState<Category[]>([]);
const [isLoading, setIsLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

// 1. Component Mounts
useEffect(() => {
  fetchCategories(); // Triggered automatically
}, []);

// 2. Loading State
setIsLoading(true);
// UI shows: <Loader2 /> spinner

// 3. Success State
setCategories(data);
setIsLoading(false);
// UI shows: Table with categories

// 4. Error State
setError(errorMessage);
setIsLoading(false);
// UI shows: Error message + Retry button

// 5. Create Category
setIsSubmitting(true);
// Button shows: "Creating..." with spinner

// 6. Update Local State
setCategories([...categories, newCategory]);
setIsSubmitting(false);
// UI updates immediately (optimistic update)
```

---

## Key Design Patterns Used

### 1. **Separation of Concerns**

- **UI Layer** (Component): User interaction, state management
- **API Layer** (categories.ts): HTTP communication, data transformation
- **Config Layer** (config.ts): Reusable fetch wrapper, error handling

### 2. **Error Boundaries**

- Each layer handles errors appropriately
- Errors bubble up with context preserved
- User-friendly messages at the UI layer

### 3. **Data Transformation**

- Backend format ≠ Frontend format
- Transformation happens at the API layer
- Component doesn't need to know backend structure

### 4. **Optimistic Updates**

- UI updates immediately after successful API call
- No need to refetch entire list
- Better user experience

### 5. **Loading States**

- Prevents double submissions
- Provides user feedback
- Improves perceived performance

---

## File Structure and Responsibilities

```
frontend/
├── components/features/
│   └── CategoryManagement.tsx    # UI Layer
│       ├── User interactions
│       ├── State management
│       ├── Loading/error UI
│       └── Calls API functions
│
├── lib/api/
│   ├── config.ts                 # Infrastructure Layer
│   │   ├── Base URL configuration
│   │   ├── Fetch wrapper
│   │   └── Error handling
│   │
│   └── categories.ts             # API Layer
│       ├── HTTP method mapping
│       ├── Data transformation
│       └── Error propagation
│
└── lib/types.ts                  # Type Definitions
    └── Category interface        # Shared types
```

---

## Testing the Flow

### 1. **Test Successful Create**

1. Open browser DevTools → Network tab
2. Click "Create Category"
3. Enter name: "Test Category"
4. Click "Create"
5. Watch the request:
   - Method: POST
   - URL: `http://localhost:5000/api/v1/categories`
   - Request Body: `{"name":"Test Category"}`
   - Response: `{"success":true,"data":{...}}`
6. Verify UI updates with new category

### 2. **Test Duplicate Error**

1. Create category: "Beverages"
2. Try to create "Beverages" again
3. Watch the request:
   - Status: 409 Conflict
   - Response: `{"success":false,"message":"Category 'beverages' already exists"}`
4. Verify error toast appears

### 3. **Test Network Error**

1. Stop the backend server
2. Try to create a category
3. Watch the request:
   - Status: (failed)
   - Error: Network error
4. Verify error message appears

---

## Common Questions

### Q: Why transform data at the API layer?

**A:** Backend and frontend have different needs:

- Backend uses MongoDB ObjectIds, dates, etc.
- Frontend needs simple strings, formatted dates
- Transformation keeps components simple

### Q: Why validate on both client and server?

**A:**

- **Client validation**: Fast feedback, better UX
- **Server validation**: Security, data integrity
- Never trust client-side validation alone

### Q: Why use a separate API client file?

**A:**

- **Reusability**: Same functions used across components
- **Maintainability**: Change API logic in one place
- **Testability**: Easy to mock for testing
- **Type safety**: TypeScript ensures correct usage

### Q: What if the backend changes?

**A:** Only need to update:

1. `lib/api/categories.ts` - API functions
2. `lib/types.ts` - Type definitions
3. Components remain unchanged (if interface stays same)

---

## Next Steps for Learning

1. **Add Authentication**: Learn how to send auth tokens
2. **Add Caching**: Learn about React Query or SWR
3. **Add Optimistic Updates**: Update UI before API confirms
4. **Add Pagination**: Handle large lists
5. **Add Real-time Updates**: WebSocket integration

---

## Summary

The integration follows a clear pattern:

1. **User Action** → Component handler
2. **Component** → API client function
3. **API Client** → Generic fetch wrapper
4. **Fetch** → HTTP request to backend
5. **Backend** → Processes request, queries database
6. **Response** → Travels back through layers
7. **Component** → Updates UI with new data

Each layer has a specific responsibility, making the code:

- **Maintainable**: Easy to find and fix issues
- **Testable**: Each layer can be tested independently
- **Scalable**: Easy to add new features
- **Reliable**: Proper error handling at each level
