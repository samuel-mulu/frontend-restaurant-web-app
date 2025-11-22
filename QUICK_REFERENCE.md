# Quick Reference: Category Integration Flow

## 🎯 The Big Picture

```
┌─────────────────────────────────────────────────────────────┐
│                    USER INTERACTION                         │
│  (Clicks button, fills form, sees results)                │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              CategoryManagement Component                   │
│  • handleCreate()                                           │
│  • handleUpdate()                                           │
│  • handleDelete()                                           │
│  • State: categories, isLoading, error                     │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ Calls API functions
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              lib/api/categories.ts                          │
│  • getCategories()                                          │
│  • createCategory(name)                                    │
│  • updateCategory(id, name)                                 │
│  • deleteCategory(id)                                       │
│  • transformCategory() - converts backend → frontend       │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ Uses generic API wrapper
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              lib/api/config.ts                             │
│  • apiRequest() - generic fetch wrapper                     │
│  • api.get(), api.post(), api.patch(), api.delete()         │
│  • ApiError class - standardized errors                     │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ HTTP Request
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              Backend API                                    │
│  POST /api/v1/categories                                    │
│  { "name": "Beverages" }                                    │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              MongoDB Database                               │
│  Stores: { _id, name, createdAt, updatedAt }               │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 Request/Response Examples

### CREATE Category

**Request:**
```http
POST http://localhost:5000/api/v1/categories
Content-Type: application/json

{
  "name": "Beverages"
}
```

**Response (Success):**
```json
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

**Response (Error - Duplicate):**
```json
{
  "success": false,
  "message": "Category 'beverages' already exists",
  "code": "DUPLICATE_CATEGORY"
}
```

---

### GET All Categories

**Request:**
```http
GET http://localhost:5000/api/v1/categories
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "507f1f77bcf86cd799439011",
      "name": "beverages",
      "createdAt": "2025-01-20T10:30:00.000Z",
      "updatedAt": "2025-01-20T10:30:00.000Z"
    },
    {
      "id": "507f1f77bcf86cd799439012",
      "name": "appetizers",
      "createdAt": "2025-01-20T10:31:00.000Z",
      "updatedAt": "2025-01-20T10:31:00.000Z"
    }
  ]
}
```

---

### UPDATE Category

**Request:**
```http
PATCH http://localhost:5000/api/v1/categories/507f1f77bcf86cd799439011
Content-Type: application/json

{
  "name": "Drinks"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "name": "drinks",
    "createdAt": "2025-01-20T10:30:00.000Z",
    "updatedAt": "2025-01-20T11:00:00.000Z"
  }
}
```

---

### DELETE Category

**Request:**
```http
DELETE http://localhost:5000/api/v1/categories/507f1f77bcf86cd799439011
```

**Response:**
```json
{
  "success": true,
  "message": "Category deleted successfully",
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "name": "drinks",
    "createdAt": "2025-01-20T10:30:00.000Z",
    "updatedAt": "2025-01-20T11:00:00.000Z"
  }
}
```

---

## 🔄 Data Flow: Create Category

```
1. User clicks "Create Category" button
   └─> setIsCreateOpen(true)

2. User enters name and clicks "Create"
   └─> handleCreate() called

3. handleCreate() validates input
   └─> if (!categoryName.trim()) return

4. handleCreate() calls createCategory(name)
   └─> lib/api/categories.ts

5. createCategory() validates again
   └─> if (!name.trim()) throw error

6. createCategory() calls api.post("/categories", {name})
   └─> lib/api/config.ts

7. apiRequest() constructs URL
   └─> "http://localhost:5000/api/v1/categories"

8. apiRequest() makes fetch() call
   └─> HTTP POST request sent

9. Backend receives request
   └─> category.controller.create()

10. Controller calls service
    └─> category.service.createCategory()

11. Service checks for duplicates
    └─> Category.findOne({name})

12. Service creates in database
    └─> Category.create({name})

13. MongoDB stores document
    └─> Returns document with _id

14. Service returns to controller
    └─> controller.send(res, 201, {data})

15. HTTP response sent
    └─> {success: true, data: {...}}

16. apiRequest() parses response
    └─> Returns data object

17. createCategory() transforms data
    └─> transformCategory(backendCategory)

18. handleCreate() receives Category
    └─> Updates state: setCategories([...])

19. UI re-renders with new category
    └─> User sees success message
```

---

## 🎨 State Management

### Initial State
```typescript
categories: []           // Empty array
isLoading: true         // Show spinner
error: null             // No errors
isSubmitting: false     // Not submitting
```

### Loading Categories
```typescript
isLoading: true         // Show spinner
categories: []          // Still empty
error: null             // No errors yet
```

### Categories Loaded
```typescript
isLoading: false        // Hide spinner
categories: [...]       // Array of categories
error: null             // No errors
```

### Error State
```typescript
isLoading: false        // Hide spinner
categories: []          // Empty (or previous data)
error: "Network error..." // Error message
```

### Creating Category
```typescript
isSubmitting: true      // Show "Creating..." button
categories: [...]       // Current categories
```

### Category Created
```typescript
isSubmitting: false     // Hide loading
categories: [..., new]  // Updated with new category
```

---

## 🛡️ Error Handling

### Error Types

| Error | Status | Source | User Sees |
|-------|--------|--------|-----------|
| Network Error | 0 | Fetch fails | "Network error: Could not connect to the server" |
| Validation Error | 400 | Client/Server | "Please enter a category name" |
| Not Found | 404 | Server | "Category not found. It may have been deleted." |
| Duplicate | 409 | Server | "Category 'Beverages' already exists" |
| Server Error | 500 | Server | "An unexpected error occurred" |

### Error Flow

```
Error occurs
  ↓
Caught in try/catch
  ↓
Check error type (instanceof ApiError)
  ↓
Extract status code and message
  ↓
Show appropriate toast message
  ↓
Update error state (if needed)
  ↓
User sees friendly error message
```

---

## 🔑 Key Functions

### Component Functions
- `fetchCategories()` - Loads all categories on mount
- `handleCreate()` - Creates new category
- `handleUpdate()` - Updates existing category
- `handleDelete()` - Deletes category

### API Functions
- `getCategories()` - GET /api/v1/categories
- `createCategory(name)` - POST /api/v1/categories
- `updateCategory(id, name)` - PATCH /api/v1/categories/:id
- `deleteCategory(id)` - DELETE /api/v1/categories/:id

### Utility Functions
- `apiRequest()` - Generic fetch wrapper
- `transformCategory()` - Backend → Frontend format
- `api.get/post/patch/delete()` - HTTP method helpers

---

## 📝 Code Locations

| What | Where |
|------|-------|
| UI Component | `components/features/CategoryManagement.tsx` |
| API Client | `lib/api/categories.ts` |
| API Config | `lib/api/config.ts` |
| Type Definitions | `lib/types.ts` |
| Backend Routes | `restaurant-menu-backend/src/modules/categories/category.routes.ts` |
| Backend Controller | `restaurant-menu-backend/src/modules/categories/category.controller.ts` |
| Backend Service | `restaurant-menu-backend/src/modules/categories/category.service.ts` |
| Backend Model | `restaurant-menu-backend/src/modules/categories/category.model.ts` |

---

## 🧪 Testing Checklist

- [ ] Create category successfully
- [ ] See loading spinner while creating
- [ ] See success message after creation
- [ ] New category appears in list
- [ ] Try to create duplicate → see error
- [ ] Update category name
- [ ] Delete category with confirmation
- [ ] Stop backend → see network error
- [ ] Refresh page → categories load automatically
- [ ] Empty state shows when no categories

---

## 💡 Pro Tips

1. **Open DevTools Network tab** to see all HTTP requests
2. **Check Console** for any JavaScript errors
3. **Verify backend is running** on port 5000
4. **Check .env.local** has correct API URL
5. **Look at Response tab** in Network to see actual data
6. **Use React DevTools** to inspect component state

---

## 🚀 Next Steps

1. Read `INTEGRATION_GUIDE.md` for detailed explanation
2. Add breakpoints in browser DevTools
3. Trace through code while testing
4. Try modifying the API calls
5. Add new features using the same pattern

