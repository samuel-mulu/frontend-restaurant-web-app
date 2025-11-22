import { MenuItem } from "./types";

// Shared menu data store
// In a real app, this would come from an API or database

export interface Menu {
  id: string;
  name: string;
  category: string;
  price: number;
  description: string;
  imageUrl?: string;
  available: boolean;
  updatedAt: string;
}

// Seed data for menus
export const initialMenus: Menu[] = [
  // Appetizers
  {
    id: "a1",
    name: "Spring Rolls",
    category: "appetizers",
    price: 8.99,
    description: "Crispy vegetable spring rolls with sweet chili sauce",
    available: true,
    updatedAt: "2025-11-20",
  },
  {
    id: "a2",
    name: "Bruschetta",
    category: "appetizers",
    price: 9.5,
    description: "Toasted bread topped with fresh tomatoes, basil, and garlic",
    available: true,
    updatedAt: "2025-11-20",
  },
  {
    id: "a3",
    name: "Garlic Bread",
    category: "appetizers",
    price: 6.99,
    description: "Warm bread with garlic butter and herbs",
    available: true,
    updatedAt: "2025-11-19",
  },
  {
    id: "a4",
    name: "Chicken Wings",
    category: "appetizers",
    price: 12.99,
    description: "Spicy buffalo wings with blue cheese dip",
    available: true,
    updatedAt: "2025-11-20",
  },
  // Main Courses
  {
    id: "m1",
    name: "Grilled Salmon",
    category: "main-courses",
    price: 24.99,
    description: "Fresh salmon grilled to perfection with vegetables",
    available: true,
    updatedAt: "2025-11-20",
  },
  {
    id: "m2",
    name: "Beef Steak",
    category: "main-courses",
    price: 28.99,
    description: "Premium beef steak with mashed potatoes",
    available: true,
    updatedAt: "2025-11-19",
  },
  {
    id: "m3",
    name: "Pasta Carbonara",
    category: "main-courses",
    price: 18.99,
    description: "Creamy pasta with bacon and parmesan cheese",
    available: true,
    updatedAt: "2025-11-20",
  },
  {
    id: "m4",
    name: "Chicken Parmesan",
    category: "main-courses",
    price: 21.99,
    description: "Breaded chicken with marinara and mozzarella",
    available: true,
    updatedAt: "2025-11-18",
  },
  {
    id: "m5",
    name: "Vegetable Stir Fry",
    category: "main-courses",
    price: 16.99,
    description: "Fresh vegetables stir-fried in savory sauce",
    available: true,
    updatedAt: "2025-11-20",
  },
  {
    id: "m6",
    name: "Fish and Chips",
    category: "main-courses",
    price: 19.99,
    description: "Beer-battered fish with crispy fries",
    available: true,
    updatedAt: "2025-11-19",
  },
  // Drinks
  {
    id: "d1",
    name: "Coca Cola",
    category: "drinks",
    price: 3.5,
    description: "Classic cola soft drink",
    available: true,
    updatedAt: "2025-11-20",
  },
  {
    id: "d2",
    name: "Orange Juice",
    category: "drinks",
    price: 4.5,
    description: "Fresh squeezed orange juice",
    available: true,
    updatedAt: "2025-11-20",
  },
  {
    id: "d3",
    name: "Iced Tea",
    category: "drinks",
    price: 3.5,
    description: "Refreshing iced tea with lemon",
    available: true,
    updatedAt: "2025-11-19",
  },
  {
    id: "d4",
    name: "Coffee",
    category: "drinks",
    price: 3.99,
    description: "Hot brewed coffee",
    available: true,
    updatedAt: "2025-11-20",
  },
  {
    id: "d5",
    name: "Mineral Water",
    category: "drinks",
    price: 2.5,
    description: "Natural mineral water",
    available: true,
    updatedAt: "2025-11-18",
  },
  // Desserts
  {
    id: "de1",
    name: "Tiramisu",
    category: "desserts",
    price: 8.99,
    description: "Classic Italian dessert with coffee and mascarpone",
    available: true,
    updatedAt: "2025-11-20",
  },
  {
    id: "de2",
    name: "Cheesecake",
    category: "desserts",
    price: 9.5,
    description: "Creamy New York style cheesecake",
    available: true,
    updatedAt: "2025-11-19",
  },
  {
    id: "de3",
    name: "Ice Cream Sundae",
    category: "desserts",
    price: 7.99,
    description: "Vanilla ice cream with chocolate sauce and toppings",
    available: true,
    updatedAt: "2025-11-20",
  },
  {
    id: "de4",
    name: "Chocolate Lava Cake",
    category: "desserts",
    price: 10.99,
    description: "Warm chocolate cake with molten center",
    available: true,
    updatedAt: "2025-11-18",
  },
];

// Helper function to convert Menu to MenuItem for CashierView
export function menuToMenuItem(menu: Menu): MenuItem {
  return {
    id: menu.id,
    name: menu.name,
    price: menu.price,
  };
}

// Helper function to get menus by category
export function getMenusByCategory(
  menus: Menu[],
  category: string
): MenuItem[] {
  return menus
    .filter((menu) => menu.category === category && menu.available)
    .map(menuToMenuItem);
}
