# 3T Juice House — Frontend

Next.js frontend for **3T Juice House**: juice-house management for POS, menus, inventory, orders, analytics, and reporting.

The production name is set in one place: [`config/branding.ts`](./config/branding.ts) → `LOUNGE_NAME`.

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- Backend API running on `http://localhost:5000` (or configure via environment variable)

### Installation

```bash
npm install
# or
yarn install
# or
pnpm install
```

### Environment Setup

Create a `.env.local` file in the project root:

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
- `config/branding.ts` - Juice house name, assets, and receipt branding
- `lib/` - Utilities, offline sync, and export helpers
- `stores/` - Redux Toolkit API slices

## Documentation

- **[Frontend Guide for Backend Developers](./FRONTEND_GUIDE_FOR_BACKEND.md)** - API integration, data formats, and expected response structures
- **[Cashier View Flow](./CASHIER_VIEW_FLOW.md)** - CashierView component flow and relationships

## Key Features

- **Category Management** - Create, update, and delete menu categories
- **Menu Management** - Manage menu items with images, pricing, and availability
- **Cashier View** - Point-of-sale interface for creating orders
- **Order History** - View and filter past orders
- **Product Management** - Manage inventory products
- **Analytics & Reports** - Performance dashboards and PDF/thermal exports

## Assets

Replace placeholder images in `public/` with production assets (paths are set in `config/branding.ts`):

- `public/logo1.png` — juice house logo
- `public/background.jpg` — login page background

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Shadcn UI Components](https://ui.shadcn.com/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
