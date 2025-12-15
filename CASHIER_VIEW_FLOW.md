# CashierView Component - Flow and Relationships

## Overview

CashierView is the point-of-sale (POS) interface where cashiers create orders by selecting items from categories and adding them to a cart, then processing payments.

## Component Structure and Relationships

```
CashierView Component
│
├── Categories Section (Top)
│   └── Fetches from: GET /api/v1/categories
│   └── Purpose: Filter items by category
│
├── Items Display Section (Left Side)
│   └── Fetches from: GET /api/v1/items?categoryId=xxx
│   └── Shows: Available items from selected category
│   └── Action: Click item → Add to Cart
│
└── Order Summary Section (Right Side)
    ├── Cart Items List
    ├── Order Details (Type, Waiter, Table)
    └── Process Payment Button
```

## Data Flow Diagram

```
1. Component Mounts
   ↓
2. Fetch Categories (GET /api/v1/categories)
   ↓
3. Auto-select First Category
   ↓
4. Fetch Items for Selected Category (GET /api/v1/items?categoryId=xxx)
   ↓
5. User Clicks Category Button
   ↓
6. Update selectedCategory State
   ↓
7. useEffect Triggers → Fetch New Items for Category
   ↓
8. User Clicks Item or "Add" Button
   ↓
9. addToCart() Function Executes
   ↓
10. Item Added to Cart State
    ↓
11. Cart Updates in Order Summary (Right Side)
    ↓
12. User Selects: Order Type, Waiter, Table
    ↓
13. User Clicks "Process Payment"
    ↓
14. handleProcessPayment() Validates & Processes
    ↓
15. (Currently: Shows Toast, Clears Cart)
    (Future: Creates Order via POST /api/v1/orders)
```

### 1. Category → Item Relationship

**How it works:**

- A `useEffect` hook watches `selectedCategory` and automatically fetches items
- **Items** are fetched from `/api/v1/items?categoryId={selectedCategory}`
- Only **available items** (`isAvailable: true`) are displayed

**Code Flow:**

```typescript
// 1. User clicks category button
onClick={() => setSelectedCategory(category.id)}

// 2. useEffect detects change
useEffect(() => {
  if (selectedCategory) {
    fetchItems(selectedCategory); // Fetches items for that category
  }
}, [selectedCategory]);

// 3. Items are filtered and displayed
const availableItems = response.data.filter((item) => item.available);
setItems(availableItems);
```

### 2. Item → Cart Relationship

**How clicking works:**

- Each item card has **two click handlers**:
  1. **Card click** (entire div): `onClick={() => addToCart(item)}`
  2. **Add button click**: `onClick={(e) => { e.stopPropagation(); addToCart(item); }}`

**addToCart() Logic:**

```typescript
const addToCart = (item: MenuItem): void => {
  setCart((prevCart) => {
    // Check if item already exists in cart
    const existingItem = prevCart.find((cartItem) => cartItem.id === item.id);

    if (existingItem) {
      // If exists, increase quantity by 1
      return prevCart.map((cartItem) =>
        cartItem.id === item.id
          ? { ...cartItem, quantity: cartItem.quantity + 1 }
          : cartItem
      );
    }
    // If new item, add with quantity 1
    return [...prevCart, { ...item, quantity: 1 }];
  });
};
```

**Visual Feedback:**

- When item is in cart, a **red quantity badge** appears on the item card
- The badge shows how many of that item are in the cart

### 3. Cart → Order Summary Relationship

**Order Summary Components:**

1. **Cart Header:**

   - Shows total number of items: `cart.reduce((sum, item) => sum + item.quantity, 0)`
   - Clear cart button (trash icon)

2. **Order Details Section:**

   - **Order Type**: "Dine In" or "Delivery"
   - **Waiter**: Selected from dropdown
   - **Table**: Selected from dropdown

3. **Cart Items List:**

   - Displays all items in cart with:
     - Item number (1, 2, 3...)
     - Item name and price
     - Quantity controls (+ / - buttons)
     - Remove button (trash icon)

4. **Total Calculation:**

   ```typescript
   const calculateTotal = (): number => {
     return cart.reduce((total, item) => total + item.price * item.quantity, 0);
   };
   ```

5. **Process Payment Button:**
   - Validates: cart not empty, orderType selected, waiter selected, table selected
   - Currently shows success toast and clears cart
   - **Future**: Will create order via `POST /api/v1/orders`

## State Management

### State Variables:

```typescript
const [categories, setCategories] = useState<Category[]>([]); // All categories
const [items, setItems] = useState<Menu[]>([]); // Items for selected category
const [selectedCategory, setSelectedCategory] = useState<string>(""); // Currently selected category
const [cart, setCart] = useState<CartItem[]>([]); // Shopping cart items
const [orderType, setOrderType] = useState<string>("home"); // "home" or "delivery"
const [selectedWaiter, setSelectedWaiter] = useState<string>(""); // Selected waiter name
const [selectedTable, setSelectedTable] = useState<string>(""); // Selected table name
```

### State Dependencies:

- `selectedCategory` → Triggers `fetchItems()` → Updates `items`
- `items` → Filtered to `currentItems` → Displayed in Items Section
- User clicks item → `addToCart()` → Updates `cart`
- `cart` → Displayed in Order Summary → Used for total calculation

## Click Event Flow

### Category Selection:

```
User clicks category button
  ↓
setSelectedCategory(category.id)
  ↓
useEffect([selectedCategory]) triggers
  ↓
fetchItems(selectedCategory)
  ↓
GET /api/v1/items?categoryId={categoryId}
  ↓
setItems(availableItems)
  ↓
Items displayed in left panel
```

### Adding Item to Cart:

```
User clicks item card OR "Add" button
  ↓
addToCart(item) called
  ↓
Check if item exists in cart
  ↓
If exists: Increase quantity by 1
If new: Add item with quantity 1
  ↓
setCart(updatedCart)
  ↓
Cart updates in Order Summary
  ↓
Quantity badge appears on item card
```

### Cart Management:

```
User clicks "+" button
  ↓
updateQuantity(item.id, 1)
  ↓
Increase quantity by 1

User clicks "-" button
  ↓
updateQuantity(item.id, -1)
  ↓
Decrease quantity by 1
  ↓
If quantity reaches 0, item removed from cart

User clicks trash icon
  ↓
removeFromCart(item.id)
  ↓
Item removed from cart
```

### Processing Payment:

```
User clicks "Process Payment"
  ↓
handleProcessPayment() called
  ↓
Validation:
  - cart.length > 0?
  - orderType selected?
  - selectedWaiter set?
  - selectedTable set?
  ↓
If valid:
  - Calculate total
  - Show success toast
  - Clear cart
  - Reset form
  ↓
(Future: Create order via API)
```

## Data Transformation

### Menu → MenuItem:

```typescript
// Backend returns Menu format
Menu {
  id: string
  name: string
  category: string (categoryId)
  price: number
  available: boolean
}

// Transformed to MenuItem for cart
MenuItem {
  id: string
  name: string
  price: number
}
```

### CartItem Structure:

```typescript
CartItem {
  id: string        // Item ID
  name: string      // Item name
  price: number     // Item price
  quantity: number  // Quantity in cart
}
```

## Current vs Future Implementation

### Current (Mock):

- `handleProcessPayment()` only shows toast
- No actual order creation
- Cart cleared locally

### Future (API Integration):

- `handleProcessPayment()` will call `POST /api/v1/orders`
- Order created in backend with:
  - `tableNumber`: Extracted from selectedTable
  - `items`: Cart items transformed to order format
  - `waiterId`: Selected waiter's ID
  - `totalAmount`: Calculated total
- Order saved to database
- Cart cleared after successful order creation

## Key Relationships Summary

1. **Category → Items**: One-to-Many

   - One category has many items
   - Selecting category filters items

2. **Item → Cart**: Many-to-Many (with quantity)

   - One item can be added multiple times (quantity increases)
   - Multiple items can be in cart

3. **Cart → Order Summary**: One-to-One

   - Cart state directly drives Order Summary display
   - Total calculated from cart items

4. **Order Summary → Order**: One-to-One (Future)
   - Order Summary data will be sent to backend
   - Creates one order record in database
