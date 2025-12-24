# Turf Bros Dashboard

## Overview

Turf Bros is a comprehensive web-based dashboard application for a lawn mowing business. The system centralizes operations including staff performance tracking, client management, job scheduling, route planning, client feedback collection with AI sentiment analysis, and tracking of ancillary services (fertilizing, aerating, pest control). The application supports flexible booking structures with three program tiers (22, 24, or 26 services) and handles irregular bookings, cancellations, and one-off jobs.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript, using Vite as the build tool
- **Routing**: Wouter for client-side routing (lightweight alternative to React Router)
- **State Management**: TanStack React Query for server state and caching
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom CSS variables for theming (natural green theme)
- **Typography**: Custom fonts (Outfit for display, Plus Jakarta Sans for body text)

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Language**: TypeScript with ES modules
- **API Pattern**: RESTful API with typed route definitions in `shared/routes.ts`
- **Validation**: Zod schemas for request/response validation, shared between client and server
- **Build**: esbuild for server bundling, Vite for client bundling

### Data Storage
- **Database**: PostgreSQL with Drizzle ORM
- **Schema Location**: `shared/schema.ts` contains all table definitions
- **Migrations**: Drizzle Kit with `db:push` command for schema synchronization
- **Session Storage**: PostgreSQL-backed sessions using connect-pg-simple

### Authentication
- **Provider**: Replit Auth via OpenID Connect
- **Session Management**: Express sessions stored in PostgreSQL
- **User Model**: Users table with profile information synced from Replit identity
- **Protected Routes**: AuthGuard component wraps authenticated pages

### Key Data Models
- **Staff**: Team members linked to auth users, with roles (admin/staff)
- **Clients**: Customer records with address, contact info, program tier, and coordinates
- **Job Runs**: Daily scheduling containers that group multiple jobs
- **Jobs**: Individual service appointments linked to clients and optionally to job runs
- **Feedback**: Client ratings and comments with AI-powered sentiment analysis
- **Applications**: Ancillary services tracking (products used, quantities, compliance notes)

### AI Integrations
- **OpenAI**: Used for feedback sentiment analysis and chat functionality
- **Image Generation**: GPT-image-1 model integration for image generation
- **Batch Processing**: Utility module for rate-limited batch API operations

## External Dependencies

### Database
- PostgreSQL database (connection via DATABASE_URL environment variable)
- Drizzle ORM for type-safe database queries

### Authentication
- Replit Auth (OpenID Connect)
- SESSION_SECRET environment variable required

### AI Services
- OpenAI API via Replit AI Integrations
- AI_INTEGRATIONS_OPENAI_API_KEY environment variable
- AI_INTEGRATIONS_OPENAI_BASE_URL for API endpoint

### Third-Party Libraries
- **UI**: Radix UI primitives, Lucide icons, recharts for analytics
- **Date Handling**: date-fns for formatting and manipulation
- **Form Handling**: React Hook Form with Zod resolvers
- **Utilities**: clsx, tailwind-merge for class management

### Planned Integrations (from requirements)
- Google Maps API for route optimization (placeholder currently implemented)
- Payment gateway (Stripe) for direct debits
- Calendar integrations (Google Calendar)
- Weather APIs for proactive scheduling