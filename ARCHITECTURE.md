# ISTExpert Architecture

## Overview

ISTExpert is a SaaS platform for fleet management and maintenance tracking. The application follows a **feature-based architecture** with clear separation of concerns.

## Project Structure

```
istexpert/
├── src/                          # Main source directory
│   ├── components/               # Reusable UI components (buttons, cards, modals)
│   ├── features/                 # Feature modules (domain-driven)
│   │   ├── auth/                 # Authentication & registration
│   │   ├── admin/                # Admin panel (super-admin only)
│   │   ├── dashboard/            # Main dashboard
│   │   ├── equipment/            # Fleet/equipment management
│   │   ├── fuel/                 # Fuel tracking
│   │   ├── landing/              # Landing page & pricing
│   │   ├── maintenance/          # Maintenance & repairs
│   │   ├── procurement/          # Procurement/supply chain
│   │   └── settings/             # Company settings
│   ├── services/                 # External services & API clients
│   │   ├── supabase.ts           # Supabase client & types
│   │   └── subscription.ts       # Subscription logic
│   ├── store/                    # Zustand state management
│   │   ├── useAuthStore.ts       # Authentication state
│   │   ├── useFleetStore.ts      # Fleet/equipment state
│   │   ├── useMaintenanceStore.ts # Maintenance records
│   │   ├── useNotificationStore.ts # Notifications
│   │   └── useProcurementStore.ts # Procurement requests
│   ├── utils/                    # Utility functions
│   │   ├── format.ts             # Formatting helpers
│   │   └── permissions.ts        # Role-based permissions
│   ├── types.ts                  # TypeScript type definitions
│   ├── App.tsx                   # Main application component
│   └── Layout.tsx                # App shell layout
├── public/                       # Static assets
├── index.html                    # HTML entry point
├── index.tsx                     # TypeScript entry point
├── package.json                  # Dependencies
├── tsconfig.json                 # TypeScript config
└── vite.config.ts                # Vite config
```

## Architecture Principles

### 1. Feature-Based Organization

Code is organized by **business domain** (features) rather than technical layers. This makes it easier to:
- Find related code
- Add new features
- Remove or modify existing features

### 2. Separation of Concerns

- **Components**: Pure UI components (no business logic)
- **Features**: Business logic and feature-specific components
- **Services**: External API integrations
- **Store**: Global state management
- **Utils**: Pure helper functions

### 3. State Management

Using **Zustand** for global state:
- `useAuthStore`: User authentication and session
- `useFleetStore`: Equipment/fleet data
- `useMaintenanceStore`: Maintenance records, breakdowns, fuel
- `useProcurementStore`: Procurement requests
- `useNotificationStore`: In-app notifications

### 4. Data Flow

```
User Action → Feature Component → Store Update → UI Re-render
                    ↓
              Service Layer (Supabase)
                    ↓
              Database
```

## Technology Stack

| Layer | Technology |
|-------|-----------|
| **Frontend Framework** | React 18.3 + TypeScript |
| **Build Tool** | Vite 6 |
| **State Management** | Zustand 5 |
| **Styling** | Tailwind CSS (Neomorphism design) |
| **Icons** | Lucide React |
| **Backend** | Supabase (Auth + Database + Storage) |
| **Deployment** | Vercel |

## Authentication & Authorization

### Roles

```typescript
enum UserRole {
  SUPER_ADMIN = 'super_admin',     // Platform owner
  OWNER = 'owner',                 // Company owner
  COMPANY_ADMIN = 'company_admin', // Company admin
  USER = 'user',                   // Full access user
  MECHANIC = 'mechanic',           // Maintenance access
  DRIVER = 'driver',               // Fuel & breakdown reports
  PROCUREMENT = 'procurement',     // Procurement access
  ACCOUNTANT = 'accountant'        // Documents & reports
}
```

### Permission System

Permissions are checked using the `usePermissions` hook from `utils/permissions.ts`:
- `canViewMaintenance`: Access to maintenance pages
- `canEditEquipment`: Can modify equipment
- `canManageProcurement`: Can create procurement requests
- `canViewReports`: Access to analytics

## Subscription System

### Plans

| Plan | Equipment | Users | Price |
|------|-----------|-------|-------|
| Free (Trial) | 5 | 3 | 0₽ / 14 days |
| Basic | 20 | 10 | 2900₽ / month |
| Pro | 100 | 50 | 7900₽ / month |
| Enterprise | Unlimited | Unlimited | 19900₽ / month |

### Subscription Status

- `trial`: Trial period (14 days)
- `active`: Active subscription
- `expired`: Subscription expired
- `suspended`: Blocked by admin

## Key Features

### 1. Equipment Management
- QR passports for each vehicle
- Maintenance schedules based on hours/mileage
- Status tracking (Active, Maintenance, Repair, etc.)

### 2. Maintenance & Repairs
- Scheduled maintenance planning
- Breakdown tracking with severity levels
- Automatic status updates

### 3. Procurement
- Kanban-style procurement board
- Link to breakdowns
- Status tracking (New, Search, Paid, In Transit, Delivered)

### 4. Fuel Management
- Fuel consumption tracking
- Cost analysis
- Integration with equipment hours

## Development Guidelines

### Adding a New Feature

1. Create a new folder in `src/features/`
2. Add components specific to the feature
3. Create a store if global state is needed
4. Add routes in `App.tsx`
5. Update navigation in `Layout.tsx`

### Code Style

- Use TypeScript for all new code
- Functional components with hooks
- Named exports for components
- Default exports only for main modules

### Testing

(To be implemented)
- Unit tests for utils
- Component tests for reusable components
- Integration tests for features

## Deployment

### Environment Variables

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_ADMIN_EMAIL=admin@istexpert.ru
```

### Build Commands

```bash
npm run dev      # Development server
npm run build    # Production build
npm run preview  # Preview production build
```

## Future Improvements

- [ ] Add unit testing with Vitest
- [ ] Implement code splitting for features
- [ ] Add error boundaries
- [ ] Implement service worker for offline support
- [ ] Add comprehensive error handling
- [ ] Implement caching strategy for Supabase queries
