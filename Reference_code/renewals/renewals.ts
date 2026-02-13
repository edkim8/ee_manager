// app/types/renewals.ts

// Defines the shape of a single lease record for the worksheet
export interface RenewalListItem {
  // --- From Database (v_leases_list) ---
  lease_id: number;
  lease_rent: number;
  market_rent: number;
  lease_to_date: string;
  unit_id: number;
  resident_id: number;
  resident_name: string;
  move_in_date: string;
  unit_code: string;
  unit_type: string;
  is_mtm?: boolean; // From v_leases_list
  mtm_rent?: number;
  ai_rent?: number | null;

  // --- Calculated in UI ---
  ltl?: number;
  live_ai_rent?: number;
  ai_percent?: number;
  percent_rent?: number;
  final_rent?: number;
  final_rent_percent?: number;
  mtm_percent_increase?: number;

  // --- Editable in UI (from worksheet_items) ---
  custom_rent?: number | null;
  approved?: boolean;
  comment?: string | null;
  approver_comment?: string | null;
  rent_offer_source?: string;
  renewal_type?: 'standard' | 'mtm';
}

// Defines the structure of a main worksheet record
export interface RenewalWorksheet {
  worksheet_id: number;
  apt_code: string;
  name: string;
  start_date: string;
  end_date: string;
  status: string;
  approved: boolean;
  max_rent_increase_percent: number;
  created_at: string;
  updated_at: string;
  mtm_fee: number;
  mtm_max_percent: number;
}

// Defines a worksheet with its items nested inside
export interface RenewalWorksheetWithItems extends RenewalWorksheet {
  renewal_worksheet_items: RenewalListItem[];
}

// Defines the shape of the data payload sent to the API when saving
export interface SaveWorksheetPayload {
  worksheet: Partial<RenewalWorksheet>;
  items: RenewalListItem[];
}
