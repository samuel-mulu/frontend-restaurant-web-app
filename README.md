# Restaurant Menu Management Frontend

This is a [Next.js](https://nextjs.org) project for managing restaurant menus, categories, orders, and inventory.

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- Backend API running on `http://localhost:5000` (or configure via environment variable)

### Installation

```bash
npm inst
# 
yarn install
# or
pnpm install
```

### Environment Setup

Create a `.env.local` file in the `frontend/` directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
```

### Run Development Server

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

- `app/` - Next.js app router pages
- `components/features/` - Feature-specific React components
- `lib/api/` - API client functions for backend integration
- `lib/types.ts` - TypeScript type definitions

## Documentation

- **[Frontend Guide for Backend Developers](./FRONTEND_GUIDE_FOR_BACKEND.md)** - Comprehensive guide for backend developers on API integration, data formats, and expected response structures
- **[Cashier View Flow](./CASHIER_VIEW_FLOW.md)** - Detailed explanation of the CashierView component flow and relationships

## Key Features

- **Category Management** - Create, update, and delete menu categories
- **Menu Management** - Manage menu items with images, pricing, and availability
- **Cashier View** - Point-of-sale interface for creating orders
- **Order History** - View and filter past orders
- **Product Management** - Manage inventory products

## API Integration

All API calls go through centralized API clients in `lib/api/`. See [FRONTEND_GUIDE_FOR_BACKEND.md](./FRONTEND_GUIDE_FOR_BACKEND.md) for detailed API integration guidelines.

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Shadcn UI Components](https://ui.shadcn.com/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
