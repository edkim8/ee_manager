# System Map: EE_manager V2

## Concept: The External Brain
This document serves as the high-level map of the system's "Brain". All key architectural decisions and structures are recorded here.

## Layer Responsibility Map

### 1. layers/base (Foundation)
**Role**: Provides the technical substrate for the application.
**Responsibilities**:
- **UI System**: Atomic components (Buttons, Inputs, Tables, Modals).
- **Authentication**: Global user session and auth guards (Supabase Auth).
- **Parsers**: Utilities to ingest and parse CSV/JSON data (e.g., Yardi exports).
- **Layouts**: Core application shells.

### 2. layers/ops (Business Domain)
**Role**: Implements the Apartment ERP business logic.
**Responsibilities**:
- **Assets**: Management of Buildings, Units, and Equipment.
- **Leases**: Resident and Lease tracking.
- **Ops**: Maintenance requests, Work Orders, and Inspections.
- **Maps**: Geospatial visualization of assets.

## Database Schema
- **Source**: Supabase (PostgreSQL)
- **Project**: `yeuzutjkxapfltvjcejz`
- **Management**: Managed via CLI and Migrations (`supabase/migrations/`)

### Tables

#### public.profiles
Extends `auth.users` with app-specific data (First Name, Last Name, Department, etc.).
*See Supabase Schema for full definition.*
