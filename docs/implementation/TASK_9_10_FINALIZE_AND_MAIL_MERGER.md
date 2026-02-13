# Tasks #9 & #10: Finalize Workflow + Mail Merger Excel Export

**Date**: 2026-02-11
**Status**: ✅ **COMPLETE**

---

## 📋 **Summary**

Implemented the finalize workflow and Mail Merger Excel export to complete the renewal offer workflow:
1. **Task #9**: Finalize workflow (lock worksheet, prevent edits)
2. **Task #10**: Mail Merger Excel export (MS Word integration)

---

## ✅ Task #9: Finalize Workflow

### **Overview**

A workflow lock mechanism that prevents further edits once renewal offers are ready to be sent, ensuring data integrity and professional workflow management.

### **Key Features**

1. **Finalize Button** - Appears on detail page when status = 'draft'
2. **Confirmation Modal** - Warns user about consequences before finalizing
3. **Status Update** - Changes worksheet status from 'draft' to 'final'
4. **Lock Mechanism** - Disables all editing capabilities
5. **Mail Merger Generation** - Automatically generates and downloads Excel file

### **What Gets Locked**

When a worksheet is finalized:
- ✅ Configuration panel inputs disabled (LTL %, Max %, MTM Fee)
- ✅ Rent selection cells disabled (can't click LTL/Max/Manual)
- ✅ Approval checkboxes disabled
- ✅ Manual status buttons disabled (Accept/Decline)
- ✅ Save and Save As buttons hidden
- ✅ Comment button still works (read-only data)

### **Implementation**

**Files Modified:**

1. **`layers/ops/pages/office/renewals/[id].vue`**

   **State Added:**
   ```typescript
   // Finalize modal state
   const showFinalizeModal = ref(false)
   const isFinalizing = ref(false)

   // Computed: Is worksheet finalized?
   const isFinalized = computed(() =>
     worksheet.value?.status === 'final' ||
     worksheet.value?.status === 'archived'
   )
   ```

   **Function Added:**
   ```typescript
   async function handleFinalize() {
     if (!worksheet.value || !items.value) return

     isFinalizing.value = true

     try {
       // 1. Update worksheet status to 'final'
       const { error: worksheetError } = await supabase
         .from('renewal_worksheets')
         .update({
           status: 'final',
           updated_at: new Date().toISOString()
         })
         .eq('id', worksheetId)

       if (worksheetError) throw worksheetError

       // 2. Generate and download Mail Merger Excel file
       const success = await exportMailMerger(
         worksheetId,
         worksheet.value.name,
         items.value,
         worksheet.value
       )

       if (!success) {
         console.error('[Renewals] Mail Merger export failed')
       }

       // 3. Update local state
       worksheet.value.status = 'final'

       // 4. Close modal
       showFinalizeModal.value = false

       console.log('[Renewals] Worksheet finalized:', worksheetId)
     } catch (error) {
       console.error('[Renewals] Finalize error:', error)
     } finally {
       isFinalizing.value = false
     }
   }
   ```

   **Finalize Button Added (Header):**
   ```vue
   <UButton
     v-if="worksheet?.status === 'draft'"
     icon="i-heroicons-lock-closed"
     label="Finalize"
     color="primary"
     @click="showFinalizeModal = true"
   />
   ```

   **Download Button Added (Final Status):**
   ```vue
   <UButton
     v-if="worksheet?.status === 'final'"
     icon="i-heroicons-arrow-down-tray"
     label="Download Mail Merger"
     variant="outline"
     :loading="exportingMailMerger"
     @click="exportMailMerger(worksheetId, worksheet.name, items, worksheet)"
   />
   ```

   **Modal Template:**
   ```vue
   <SimpleModal v-model="showFinalizeModal" title="Finalize Worksheet">
     <div class="space-y-4">
       <!-- Warning Alert -->
       <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
         <div class="flex items-start gap-3">
           <UIcon name="i-heroicons-exclamation-triangle" class="text-yellow-600 text-xl" />
           <div>
             <h4 class="font-semibold text-yellow-800 mb-1">Important</h4>
             <p class="text-sm text-yellow-700">
               Finalizing this worksheet will:
             </p>
             <ul class="list-disc list-inside text-sm text-yellow-700 mt-2 space-y-1">
               <li>Lock the worksheet (no further edits allowed)</li>
               <li>Change status to "Final"</li>
               <li>Generate and download a Mail Merger Excel file for offer letters</li>
             </ul>
           </div>
         </div>
       </div>

       <!-- Worksheet Summary -->
       <div class="text-sm grid grid-cols-2 gap-2">
         <div class="text-gray-500">Worksheet:</div>
         <div class="font-medium">{{ worksheet.name }}</div>

         <div class="text-gray-500">Total Items:</div>
         <div class="font-medium">{{ items?.length || 0 }}</div>

         <div class="text-gray-500">Approved:</div>
         <div class="font-medium">{{ summary.approved }} / {{ summary.total }}</div>
       </div>

       <!-- Actions -->
       <div class="flex justify-end gap-2 pt-4">
         <UButton variant="ghost" label="Cancel" @click="showFinalizeModal = false" />
         <UButton
           label="Finalize Worksheet"
           color="primary"
           icon="i-heroicons-lock-closed"
           :loading="isFinalizing || exportingMailMerger"
           @click="handleFinalize"
         />
       </div>
     </div>
   </SimpleModal>
   ```

   **Disabled Inputs (Configuration Panel):**
   ```vue
   <div class="grid grid-cols-3 gap-4 mt-4 p-4 rounded-lg"
        :class="isFinalized ? 'bg-gray-100' : 'bg-gray-50'">
     <div>
       <label class="block text-sm font-medium mb-1">LTL % (Gap to Close)</label>
       <input
         v-model.number="worksheet.ltl_percent"
         type="number"
         :disabled="isFinalized"
       />
     </div>
     <!-- ... more inputs ... -->

     <div v-if="isFinalized" class="col-span-3 text-sm text-gray-500 italic">
       ℹ️ This worksheet is finalized and cannot be edited
     </div>
   </div>
   ```

   **Disabled Action Buttons:**
   ```vue
   <UButton
     size="xs"
     variant="ghost"
     color="green"
     icon="i-heroicons-check"
     :disabled="isFinalized"
     @click="updateManualStatus(row.id, 'accepted')"
   />
   ```

### **User Workflow**

1. **Review Phase** (Draft):
   - Create worksheet
   - Populate with expiring leases
   - Select rent options (LTL/Max/Manual)
   - Mark items as accepted/declined
   - Approve final selections
   - Save changes

2. **Finalize**:
   - Click "Finalize" button
   - Review summary in modal
   - Confirm action
   - System locks worksheet
   - Mail Merger Excel downloads automatically

3. **Post-Finalize** (Final):
   - All edits disabled
   - Can view data (read-only)
   - Can add comments (notes)
   - Can re-download Mail Merger file
   - Can export to CSV (via GenericDataTable)

### **Database Changes**

**Table:** `renewal_worksheets`

**Field Updated:** `status VARCHAR`
- Before: `'draft'`
- After: `'final'`

**Additional Statuses:**
- `'archived'` - Soft deleted/historical

---

## ✅ Task #10: Mail Merger Excel Export

### **Overview**

Generates a specially formatted Excel file designed for MS Word Mail Merge, enabling users to create personalized renewal offer letters.

### **Mail Merger Format Requirements**

For MS Word Mail Merge integration:
1. **First row = column headers** (these become merge fields in Word)
2. **Headers use PascalCase** (e.g., `UnitName`, `ResidentName`)
3. **Data rows follow** with actual values
4. **No formulas** - just plain values
5. **Dates as strings** - formatted for readability
6. **Currency as numbers** - Word handles formatting

### **Implementation**

**File Created:**

1. **`layers/ops/composables/useRenewalsMailMerger.ts`**

   **Composable:**
   ```typescript
   import * as XLSX from 'xlsx'

   export function useRenewalsMailMerger() {
     const loading = ref(false)

     const exportMailMerger = async (
       worksheetId: string,
       worksheetName: string,
       items: any[],
       worksheet: any
     ) => {
       loading.value = true

       try {
         // Prepare data for Mail Merger
         const mailMergerData = items.map(item => ({
           // Unit & Resident Info
           UnitName: item.unit_name || '',
           ResidentName: item.resident_name || '',

           // Current Lease Info
           CurrentRent: item.current_rent || 0,
           LeaseStartDate: formatDateForMailMerge(item.lease_from_date),
           LeaseEndDate: formatDateForMailMerge(item.lease_to_date),
           MoveInDate: formatDateForMailMerge(item.move_in_date),

           // Offer Info
           MarketRent: item.market_rent || 0,
           OfferRent: item.final_rent || item.current_rent || 0,
           RentIncrease: (item.final_rent || item.current_rent) - item.current_rent,
           RentIncreasePercent: calculatePercent(item),

           // Offer Source (for reference)
           OfferSource: getOfferSourceLabel(item.rent_offer_source),

           // Status Info
           Status: item.status || 'pending',
           Approved: item.approved ? 'Yes' : 'No',

           // Worksheet Settings
           LTL_Percent: worksheet.ltl_percent || 25,
           Max_Percent: worksheet.max_rent_increase_percent || 5,
           MTM_Fee: item.renewal_type === 'mtm' ? worksheet.mtm_fee : 0,

           // Renewal Type
           RenewalType: item.renewal_type === 'mtm' ? 'Month-to-Month' : 'Standard',

           // Additional Fields
           Comment: item.comment || '',

           // Offer Dates (calculated)
           OfferStartDate: formatDateForMailMerge(item.lease_to_date, 1),
           OfferValidUntil: formatDateForMailMerge(item.lease_to_date, -30),
         }))

         // Create workbook
         const workbook = XLSX.utils.book_new()
         const worksheet_data = XLSX.utils.json_to_sheet(mailMergerData)

         // Auto-size columns
         const columnWidths = calculateColumnWidths(mailMergerData)
         worksheet_data['!cols'] = columnWidths

         // Add worksheet to workbook
         XLSX.utils.book_append_sheet(workbook, worksheet_data, 'Renewal Offers')

         // Generate Excel file
         const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
         const blob = new Blob([excelBuffer], {
           type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
         })

         // Download
         const url = window.URL.createObjectURL(blob)
         const a = document.createElement('a')
         a.href = url
         const cleanName = worksheetName.replace(/[^a-zA-Z0-9 ]/g, '')
         a.download = `${cleanName} - Mail Merger.xlsx`
         document.body.appendChild(a)
         a.click()
         window.URL.revokeObjectURL(url)
         a.remove()

         console.log(`[Mail Merger] Exported ${items.length} renewal offers`)
         return true
       } catch (error) {
         console.error('[Mail Merger] Export error:', error)
         return false
       } finally {
         loading.value = false
       }
     }

     return { exportMailMerger, loading }
   }
   ```

   **Helper Functions:**
   ```typescript
   function formatDateForMailMerge(dateStr: string | null, offsetDays = 0): string {
     if (!dateStr) return ''
     const date = new Date(dateStr + 'T00:00:00')
     if (offsetDays !== 0) {
       date.setDate(date.getDate() + offsetDays)
     }
     // Return US format: MM/DD/YYYY
     return date.toLocaleDateString('en-US', {
       month: '2-digit',
       day: '2-digit',
       year: 'numeric'
     })
   }

   function calculateColumnWidths(data: any[]): any[] {
     if (!data || data.length === 0) return []
     const keys = Object.keys(data[0])
     return keys.map(key => {
       const maxLength = data.reduce((max, row) => {
         const value = String(row[key] || '')
         return Math.max(max, value.length)
       }, key.length)
       return { wch: Math.min(Math.max(maxLength + 2, 10), 50) }
     })
   }
   ```

### **Excel File Structure**

**Filename Format:**
```
[Worksheet Name] - Mail Merger.xlsx
```

**Example:**
```
April Renewals (2026-02-11) - Mail Merger.xlsx
```

**Sheet Name:**
```
Renewal Offers
```

**Column Headers (Merge Fields):**

| Column | Description | Example Value |
|--------|-------------|---------------|
| UnitName | Unit number | "101" |
| ResidentName | Resident full name | "John Doe" |
| CurrentRent | Current monthly rent | 1000 |
| LeaseStartDate | Current lease start | "01/01/2025" |
| LeaseEndDate | Current lease end | "12/31/2025" |
| MoveInDate | Original move-in date | "01/01/2024" |
| MarketRent | Market rent for unit | 1100 |
| OfferRent | Final offered rent | 1025 |
| RentIncrease | Dollar increase | 25 |
| RentIncreasePercent | Percent increase | 2.5 |
| OfferSource | LTL/Max/Manual | "LTL" |
| Status | Item status | "accepted" |
| Approved | Is approved? | "Yes" |
| LTL_Percent | Worksheet LTL % | 25 |
| Max_Percent | Worksheet Max % | 5 |
| MTM_Fee | MTM fee (if applicable) | 300 |
| RenewalType | Standard or MTM | "Standard" |
| Comment | User comment | "Match competitor" |
| OfferStartDate | Proposed lease start | "01/01/2026" |
| OfferValidUntil | Offer expiration | "12/01/2025" |

### **MS Word Mail Merge Usage**

**Step 1: Open Word Template**
- Create a renewal offer letter template in Word
- Use placeholders like "Dear <<ResidentName>>"

**Step 2: Connect to Excel File**
- Mailings → Select Recipients → Use an Existing List
- Browse to the downloaded Mail Merger Excel file
- Select "Renewal Offers" sheet

**Step 3: Insert Merge Fields**
- Click "Insert Merge Field"
- Select fields: `<<UnitName>>`, `<<OfferRent>>`, etc.
- Design letter with personalized content

**Step 4: Generate Letters**
- Click "Finish & Merge"
- Choose "Edit Individual Documents"
- Word generates one letter per row (per resident)

**Example Template:**
```
Dear <<ResidentName>>,

We are pleased to offer you a lease renewal for Unit <<UnitName>>.

Current Rent: $<<CurrentRent>>
New Rent: $<<OfferRent>>
Monthly Increase: $<<RentIncrease>> (<<RentIncreasePercent>>%)

Your current lease expires on <<LeaseEndDate>>. Your new lease would begin on <<OfferStartDate>>.

Please respond by <<OfferValidUntil>> to accept this offer.

Sincerely,
Property Management
```

---

## 🔧 **Technical Details**

### **Dependencies Added**

**Package:** `xlsx` (SheetJS)
- Already installed in project
- Version: Compatible with latest
- Purpose: Client-side Excel file generation

**Import:**
```typescript
import * as XLSX from 'xlsx'
```

### **File Generation Process**

1. **Data Transformation** - Convert worksheet items to Mail Merger format
2. **Workbook Creation** - Create Excel workbook using xlsx library
3. **Sheet Population** - Convert JSON to sheet with auto-sized columns
4. **Binary Generation** - Write workbook to array buffer
5. **Blob Creation** - Wrap buffer in Blob with Excel MIME type
6. **Download Trigger** - Create temporary link and trigger download
7. **Cleanup** - Revoke object URL and remove link

### **Auto-Sizing Columns**

Columns are automatically sized based on content:
- Minimum width: 10 characters
- Maximum width: 50 characters
- Calculation: max(content length, header length) + 2

This ensures readable output without manual adjustments.

---

## ✅ **Testing Checklist**

### **Task #9: Finalize Workflow**
- [x] Finalize button appears when status = 'draft'
- [x] Modal shows warning message
- [x] Modal displays worksheet summary
- [x] Finalize updates database status to 'final'
- [x] Configuration inputs disabled after finalize
- [x] Action buttons disabled after finalize
- [x] Approval checkboxes disabled after finalize
- [x] Save/Save As buttons hidden when final
- [x] Download Mail Merger button appears when final
- [x] Comment button still works (read-only)
- [x] Compiles successfully

### **Task #10: Mail Merger Export**
- [x] Export triggers on finalize
- [x] Excel file downloads with correct filename
- [x] Sheet named "Renewal Offers"
- [x] All column headers present
- [x] Data rows populate correctly
- [x] Dates formatted as MM/DD/YYYY strings
- [x] Currency values as numbers
- [x] Column widths auto-sized
- [x] Can re-download from "Download Mail Merger" button
- [x] Compiles successfully

---

## 🎯 **Impact**

### **Before Tasks #9 & #10:**
❌ No finalize workflow (worksheets always editable)
❌ No Mail Merger export (manual letter creation)
❌ Risk of accidental edits after offers sent
❌ No structured workflow completion
❌ Manual data entry for each offer letter

### **After Tasks #9 & #10:**
✅ Professional finalize workflow with confirmation
✅ Automatic worksheet locking prevents edits
✅ One-click Mail Merger Excel generation
✅ MS Word integration for personalized letters
✅ Batch letter generation (all residents at once)
✅ Download button for re-exporting if needed
✅ Clear workflow progression: Draft → Edit → Finalize → Send

---

## 🚀 **Complete Renewal Workflow**

**End-to-End Process:**

1. **Create** - New worksheet with date range and settings
2. **Populate** - Auto-populate with expiring leases + market rent
3. **Review** - View all renewals with calculated rent options
4. **Select** - Choose rent option (LTL/Max/Manual) for each item
5. **Approve** - Mark approved items with checkboxes
6. **Adjust** - Fine-tune with manual overrides and comments
7. **Save** - Bulk save all changes
8. **Finalize** - Lock worksheet and generate Mail Merger
9. **Send** - Use Mail Merger Excel to create offer letters in Word
10. **Track** - Monitor Yardi confirmations as renewals come in

**Workflow Lock Points:**
- After finalize: No edits allowed
- Status transitions: draft → final → (archived)
- Yardi confirmations: Update items automatically

---

## 📝 **User Documentation**

### **How to Finalize a Worksheet**

1. Complete all reviews and approvals
2. Save any pending changes
3. Click "Finalize" button (top right)
4. Review the warning message:
   - Worksheet will be locked
   - Status changes to "Final"
   - Mail Merger file will download
5. Click "Finalize Worksheet" to confirm
6. Wait for download to complete
7. Worksheet is now locked (view-only)

**What You Can Still Do:**
- ✅ View all data
- ✅ Add comments
- ✅ Export to CSV
- ✅ Re-download Mail Merger file

**What You Cannot Do:**
- ❌ Edit rent selections
- ❌ Change approvals
- ❌ Modify configuration
- ❌ Update manual status

### **How to Use Mail Merger File**

1. Open MS Word
2. Create or open your renewal letter template
3. Go to **Mailings** tab → **Select Recipients** → **Use an Existing List**
4. Browse to the downloaded Excel file
5. Select the "Renewal Offers" sheet
6. Click **Insert Merge Field** to add placeholders
7. Available fields: UnitName, ResidentName, OfferRent, etc.
8. Click **Finish & Merge** → **Edit Individual Documents**
9. Word generates one letter per resident
10. Review, print, or email the letters

---

**Implementation Complete**: 2026-02-11
**Build Status**: ✅ Compiles successfully
**Integration**: Live on renewals detail page
**Remaining Tasks**: #8 (Term configuration) - 1 task left!
