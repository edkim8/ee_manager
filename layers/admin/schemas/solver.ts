import { z } from 'zod'

// --- Helper Schemas ---
const NonEmptyString = z.string().trim().min(1, { message: "Required field is empty" })
const OptionalString = z.string().trim().nullish().transform(v => v || null)
const YardiDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Invalid Date Format (Expected YYYY-MM-DD)" }).or(z.date()).nullish().transform(v => {
    if (!v) return null
    if (v instanceof Date) return v.toISOString().split('T')[0]
    return v
})

// --- 1. Residents Status Schema ---
export const ResidentsStatusSchema = z.object({
    property_code: NonEmptyString.describe("Property Code"),
    unit_name: NonEmptyString.describe("Unit Name"),
    tenancy_id: NonEmptyString.describe("Tenancy ID (t_code)"),
    status: NonEmptyString.describe("Status"), // We will validate Enum values deeper if needed, for now just required
    resident: OptionalString,
    type: OptionalString, // 'Current', 'Roommate' etc
    rent: z.number().nullish().describe("Rent Amount"),
    deposit: z.number().nullish(),
    move_in_date: YardiDate.describe("Move In Date"),
    move_out_date: YardiDate.describe("Move Out Date"),
    lease_start_date: YardiDate,
    lease_end_date: YardiDate,
    email: z.string().email().or(z.string()).nullish().describe("Email"), // Loose email validation to avoid blocking on bad user input
    phone: OptionalString
})

// --- 2. Expiring Leases Schema ---
export const ExpiringLeasesSchema = z.object({
    property_code: NonEmptyString, // Injected by 'yardi_report' strategy
    unit_name: NonEmptyString,
    tenancy_code: NonEmptyString.describe("Tenancy Code"), // Parser uses tenancy_code
    resident: OptionalString,
    status: OptionalString,
    lease_start_date: YardiDate.describe("Lease Start"),
    lease_end_date: YardiDate.describe("Lease End"),
    lease_rent: z.number().nullish().describe("Lease Rent"),
    market_rent: z.number().nullish().describe("Market Rent"),
    floor_plan: OptionalString,
    sqft: OptionalString,
    move_out_date: YardiDate
})

// --- Map Parser ID to Schema ---
export const SOLVER_SCHEMAS: Record<string, z.ZodObject<any>> = {
    'residents_status': ResidentsStatusSchema,
    'expiring_leases': ExpiringLeasesSchema
}
