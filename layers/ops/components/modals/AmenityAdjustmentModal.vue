<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSupabaseClient } from '#imports'
import { usePricingEngine } from '../../utils/pricing-engine'
import SimpleTabs from '../../../base/components/SimpleTabs.vue'
import AmenityPriceList from '../amenities/AmenityPriceList.vue'

const props = defineProps<{
    unit: any
    onClose: (saved: boolean) => void
}>()

console.log('[AmenityAdjustmentModal] Props received:', {
    unit: props.unit,
    unitName: props.unit?.unit_name,
    unitId: props.unit?.unit_id
})

const supabase = useSupabaseClient()
const { solveForTargetRent } = usePricingEngine()

const isLoading = ref(true)
const availableAmenities = ref<any[]>([])
const fixedAmenities = ref<any[]>([])
const appliedAmenityIds = ref<Set<string>>(new Set())
const activeTab = ref('manual') // 'manual', 'solver', 'concessions'

// Manual Selection State
const toggledAmenities = ref<Set<string>>(new Set())

// Target Solver State
const targetAdjustment = ref<number | null>(null)
const solverSuggestion = ref<any>(null)
const isSolving = ref(false)

// Upfront Concessions State
const concessionType = ref<'dollar' | 'time'>('dollar')
const concessionDollarAmount = ref<number | null>(null)
const concessionDays = ref<number | null>(null)
const concessionComment = ref('')

// Fetch all amenities for this property and unit
onMounted(async () => {
    if (!props.unit || !props.unit.unit_id) {
        console.error('[AmenityAdjustmentModal] No unit data provided!')
        isLoading.value = false
        return
    }

    // 1. Fetch available temporary amenities
    const { data: allAmens } = await supabase
        .from('amenities')
        .select('*')
        .eq('property_code', props.unit.property_code)
        .eq('active', true)
        .neq('type', 'fixed')

    // 2. Fetch current applied amenities
    const { data: currentLinks } = await supabase
        .from('unit_amenities')
        .select('amenity_id')
        .eq('unit_id', props.unit.unit_id)
        .eq('active', true)

    // 3. Fetch fixed amenities for pricing breakdown
    const { data: fixedAmens } = await supabase
        .from('unit_amenities')
        .select('amenity_id, amenities(yardi_name, amount, type)')
        .eq('unit_id', props.unit.unit_id)
        .eq('active', true)

    availableAmenities.value = allAmens || []
    appliedAmenityIds.value = new Set((currentLinks as any[])?.map(l => l.amenity_id) || [])
    fixedAmenities.value = (fixedAmens as any[])
        ?.filter(f => f.amenities && f.amenities.type?.toLowerCase() === 'fixed')
        .map(f => ({ name: f.amenities.yardi_name, amount: f.amenities.amount })) || []
    isLoading.value = false
})

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val)
}

// Manual Selection Logic
const isApplied = (amenityId: string) => {
    const originallyApplied = appliedAmenityIds.value.has(amenityId)
    const isToggled = toggledAmenities.value.has(amenityId)
    return isToggled ? !originallyApplied : originallyApplied
}

const toggleAmenity = (amenityId: string) => {
    if (toggledAmenities.value.has(amenityId)) {
        toggledAmenities.value.delete(amenityId)
    } else {
        toggledAmenities.value.add(amenityId)
    }
}

// Target Solver Logic
const handleSolveForTarget = async () => {
    if (!targetAdjustment.value) return

    isSolving.value = true
    solverSuggestion.value = null

    try {
        const targetRent = props.unit.calculated_market_rent + targetAdjustment.value
        const solution = await solveForTargetRent(props.unit.unit_id, props.unit.property_code, targetRent)

        if (solution && solution.solution) {
            solverSuggestion.value = solution
        } else {
            solverSuggestion.value = { error: 'No solution found. Try a different target amount.' }
        }
    } catch (e) {
        console.error(e)
        solverSuggestion.value = { error: 'Error calculating solution' }
    } finally {
        isSolving.value = false
    }
}

const applySolverSuggestion = () => {
    if (!solverSuggestion.value || !solverSuggestion.value.solution) return

    // Clear current toggles
    toggledAmenities.value.clear()

    // Apply suggested amenities
    solverSuggestion.value.solution.forEach((amen: any) => {
        const wasApplied = appliedAmenityIds.value.has(amen.id)
        if (!wasApplied) {
            toggledAmenities.value.add(amen.id)
        }
    })

    // Switch to manual tab to show the selection
    activeTab.value = 'manual'
}

// Pricing Preview (works across all tabs)
const previewBreakdown = computed(() => {
    const currentTemp = availableAmenities.value.filter(a => isApplied(a.id))
    const tempTotal = currentTemp.reduce((sum, a) => sum + (a.amount || 0), 0)

    return {
        baseRent: props.unit.base_rent || 0,
        fixedAmenities: fixedAmenities.value,
        marketRent: props.unit.calculated_market_rent || 0,
        tempAmenities: currentTemp.map(a => ({ name: a.yardi_name, amount: a.amount })),
        offeredRent: (props.unit.calculated_market_rent || 0) + tempTotal
    }
})

const hasChanges = computed(() => {
    return toggledAmenities.value.size > 0 ||
           concessionDollarAmount.value !== null ||
           concessionDays.value !== null
})

// Save Logic
const handleSave = async () => {
    isLoading.value = true
    try {
        // 1. Handle amenity changes (manual or solver-applied)
        if (toggledAmenities.value.size > 0) {
            const { data: currentLinks } = await supabase
                .from('unit_amenities')
                .select('id, amenity_id')
                .eq('unit_id', props.unit.unit_id)
                .eq('active', true)

            const toDeactivate = []
            const toInsert = []

            for (const amen of availableAmenities.value) {
                const isNowApplied = isApplied(amen.id)
                const wasApplied = appliedAmenityIds.value.has(amen.id)

                if (wasApplied && !isNowApplied) {
                    const link = currentLinks?.find((l: any) => l.amenity_id === amen.id)
                    if (link) toDeactivate.push(link.id)
                } else if (!wasApplied && isNowApplied) {
                    toInsert.push({
                        unit_id: props.unit.unit_id,
                        amenity_id: amen.id,
                        active: true,
                        comment: concessionComment.value || `Pricing Adjustment: ${formatCurrency(previewBreakdown.value.offeredRent)}`
                    })
                }
            }

            if (toDeactivate.length > 0) {
                await supabase.from('unit_amenities').update({ active: false }).in('id', toDeactivate)
            }
            if (toInsert.length > 0) {
                await supabase.from('unit_amenities').insert(toInsert)
            }
        }

        // 2. Handle upfront concessions
        // TODO: Implement concessions storage when table/schema is ready
        // For now, just log them
        if (concessionDollarAmount.value || concessionDays.value) {
            console.log('[Concessions]', {
                type: concessionType.value,
                dollar: concessionDollarAmount.value,
                days: concessionDays.value,
                comment: concessionComment.value
            })
        }

        props.onClose(true)
    } catch (e) {
        console.error(e)
    } finally {
        isLoading.value = false
    }
}

const tabs = [
    { value: 'manual', label: 'Manual Selection', icon: 'i-heroicons-adjustments-horizontal' },
    { value: 'solver', label: 'Target Solver', icon: 'i-heroicons-sparkles' },
    { value: 'concessions', label: 'Upfront Concessions', icon: 'i-heroicons-gift' }
]
</script>

<template>
  <div class="p-6 flex gap-8">
    <!-- Left: Tabs for Different Adjustment Methods -->
    <div class="flex-1 space-y-6">
        <div>
            <h3 class="text-lg font-bold mb-2">Adjust Pricing for Unit {{ unit.unit_name }}</h3>
            <p class="text-sm text-gray-600 dark:text-gray-400">Choose how you want to adjust the rent offered for this unit.</p>
        </div>

        <SimpleTabs v-model="activeTab" :items="tabs">
            <!-- Tab 1: Manual Selection -->
            <template #manual>
                <div class="space-y-4 pt-4">
                    <div v-if="isLoading" class="py-10 text-center">
                        <UIcon name="i-heroicons-arrow-path" class="animate-spin text-2xl text-gray-400" />
                    </div>
                    <div v-else-if="availableAmenities.length === 0" class="py-10 text-center">
                        <UIcon name="i-heroicons-exclamation-circle" class="text-4xl text-gray-300 mb-2" />
                        <p class="text-gray-500">No temporary amenities available for this property.</p>
                    </div>
                    <div v-else class="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                        <div
                            v-for="amen in availableAmenities"
                            :key="amen.id"
                            class="flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer hover:shadow-sm"
                            :class="isApplied(amen.id) ? 'bg-primary-50 border-primary-200 dark:bg-primary-900/20 dark:border-primary-800' : 'bg-gray-50 border-gray-100 dark:bg-gray-800 dark:border-gray-700'"
                            @click="toggleAmenity(amen.id)"
                        >
                            <div class="flex items-center gap-3">
                                <UCheckbox :model-value="isApplied(amen.id)" readonly />
                                <div>
                                    <p class="text-sm font-bold" :class="isApplied(amen.id) ? 'text-primary-700 dark:text-primary-300' : 'text-gray-700 dark:text-gray-300'">{{ amen.yardi_name }}</p>
                                    <p class="text-[10px] text-gray-400 uppercase font-black tracking-widest">{{ amen.type }}</p>
                                </div>
                            </div>
                            <span class="font-mono font-bold text-sm" :class="amen.amount >= 0 ? 'text-green-600' : 'text-red-600'">
                                {{ amen.amount >= 0 ? '+' : '' }}{{ formatCurrency(amen.amount) }}
                            </span>
                        </div>
                    </div>
                    <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                        <p class="text-xs text-blue-700 dark:text-blue-300">
                            <UIcon name="i-heroicons-information-circle" class="inline mr-1" />
                            <strong>Legacy Method:</strong> Manually select amenities to add or remove. Check boxes to apply, uncheck to remove.
                        </p>
                    </div>
                </div>
            </template>

            <!-- Tab 2: Target Solver -->
            <template #solver>
                <div class="space-y-4 pt-4">
                    <div class="space-y-3">
                        <div>
                            <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                Target Adjustment Amount
                            </label>
                            <div class="flex items-center gap-3">
                                <UInput
                                    v-model.number="targetAdjustment"
                                    type="number"
                                    placeholder="e.g., -50 for discount, +100 for premium"
                                    class="flex-1"
                                    size="lg"
                                />
                                <UButton
                                    label="Find Best Combination"
                                    icon="i-heroicons-sparkles"
                                    color="primary"
                                    :loading="isSolving"
                                    :disabled="!targetAdjustment"
                                    @click="handleSolveForTarget"
                                />
                            </div>
                            <p class="text-xs text-gray-500 mt-1">
                                Current Market: {{ formatCurrency(unit.calculated_market_rent || 0) }}
                                <span v-if="targetAdjustment"> → Target: {{ formatCurrency((unit.calculated_market_rent || 0) + targetAdjustment) }}</span>
                            </p>
                        </div>

                        <!-- Solver Results -->
                        <div v-if="solverSuggestion" class="mt-4">
                            <div v-if="solverSuggestion.error" class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                                <p class="text-sm text-red-700 dark:text-red-300">{{ solverSuggestion.error }}</p>
                            </div>
                            <div v-else class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 space-y-3">
                                <div class="flex items-center justify-between">
                                    <div>
                                        <p class="text-sm font-bold text-green-700 dark:text-green-300">Solution Found!</p>
                                        <p class="text-xs text-green-600 dark:text-green-400 mt-1">
                                            Suggested {{ solverSuggestion.solution.length }} amenity change(s)
                                            <span v-if="solverSuggestion.remainingGap"> - Gap: {{ formatCurrency(Math.abs(solverSuggestion.remainingGap)) }}</span>
                                        </p>
                                    </div>
                                    <UButton
                                        label="Apply Suggestion"
                                        size="sm"
                                        color="green"
                                        @click="applySolverSuggestion"
                                    />
                                </div>
                                <div class="space-y-1">
                                    <p class="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Suggested Amenities:</p>
                                    <div class="flex flex-wrap gap-2">
                                        <span
                                            v-for="amen in solverSuggestion.solution"
                                            :key="amen.id"
                                            class="px-2 py-1 bg-white dark:bg-gray-800 border border-green-300 dark:border-green-700 rounded text-xs font-mono"
                                        >
                                            {{ amen.yardi_name }} ({{ amen.amount >= 0 ? '+' : '' }}{{ formatCurrency(amen.amount) }})
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3 mt-4">
                            <p class="text-xs text-purple-700 dark:text-purple-300">
                                <UIcon name="i-heroicons-information-circle" class="inline mr-1" />
                                <strong>Improvement:</strong> Enter the desired adjustment amount (negative for discount, positive for premium).
                                The solver will find the best combination of available amenities to achieve that target.
                            </p>
                        </div>
                    </div>
                </div>
            </template>

            <!-- Tab 3: Upfront Concessions -->
            <template #concessions>
                <div class="space-y-4 pt-4">
                    <div class="space-y-4">
                        <!-- Concession Type Toggle -->
                        <div>
                            <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                Concession Type
                            </label>
                            <div class="flex gap-3">
                                <UButton
                                    :label="`Dollar Amount`"
                                    :variant="concessionType === 'dollar' ? 'solid' : 'outline'"
                                    :color="concessionType === 'dollar' ? 'primary' : 'neutral'"
                                    @click="concessionType = 'dollar'"
                                />
                                <UButton
                                    label="Time-Based (Days/Weeks Free)"
                                    :variant="concessionType === 'time' ? 'solid' : 'outline'"
                                    :color="concessionType === 'time' ? 'primary' : 'neutral'"
                                    @click="concessionType = 'time'"
                                />
                            </div>
                        </div>

                        <!-- Dollar Amount Input -->
                        <div v-if="concessionType === 'dollar'">
                            <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                Upfront Dollar Amount
                            </label>
                            <UInput
                                v-model.number="concessionDollarAmount"
                                type="number"
                                placeholder="e.g., 500"
                                size="lg"
                            >
                                <template #leading>
                                    <span class="text-gray-500">$</span>
                                </template>
                            </UInput>
                            <p class="text-xs text-gray-500 mt-1">One-time upfront concession amount</p>
                        </div>

                        <!-- Time-Based Input -->
                        <div v-if="concessionType === 'time'">
                            <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                Days/Weeks Free
                            </label>
                            <UInput
                                v-model.number="concessionDays"
                                type="number"
                                placeholder="e.g., 7 for 1 week, 14 for 2 weeks"
                                size="lg"
                            >
                                <template #trailing>
                                    <span class="text-gray-500 text-sm">days</span>
                                </template>
                            </UInput>
                            <p class="text-xs text-gray-500 mt-1">Number of days rent-free (e.g., 7, 14, 30)</p>
                        </div>

                        <!-- Comment Field -->
                        <div>
                            <label class="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                Notes / Comment
                            </label>
                            <UTextarea
                                v-model="concessionComment"
                                placeholder="Optional notes about this concession..."
                                :rows="3"
                            />
                            <p class="text-xs text-gray-500 mt-1">Saved to unit_amenities.comment for audit trail</p>
                        </div>

                        <div class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                            <p class="text-xs text-amber-700 dark:text-amber-300">
                                <UIcon name="i-heroicons-information-circle" class="inline mr-1" />
                                <strong>Future Feature:</strong> Upfront concessions (lump sum payments or time-based discounts)
                                instead of amortized amenity adjustments. This will be stored separately and linked to the lease.
                            </p>
                        </div>
                    </div>
                </div>
            </template>
        </SimpleTabs>

        <!-- Action Buttons (consistent across all tabs) -->
        <div class="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <UButton label="Cancel" color="neutral" variant="ghost" @click="onClose(false)" />
            <UButton
                label="Save Changes"
                color="primary"
                icon="i-heroicons-check"
                :disabled="!hasChanges"
                :loading="isLoading"
                @click="handleSave"
            />
        </div>
    </div>

    <!-- Right: Pricing Preview (consistent across all tabs) -->
    <div class="w-80 bg-gray-50 dark:bg-gray-800/50 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-4">
        <div>
            <h3 class="text-xs font-black uppercase tracking-[0.2em] text-gray-400 mb-1">Live Pricing Preview</h3>
            <p class="text-[10px] text-gray-500">Updates as you make changes</p>
        </div>
        <AmenityPriceList v-bind="previewBreakdown" />

        <!-- Concession Preview -->
        <div v-if="concessionDollarAmount || concessionDays" class="pt-4 border-t border-gray-200 dark:border-gray-700">
            <p class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">+ Upfront Concession</p>
            <div class="bg-white dark:bg-gray-800 rounded-lg p-3 border border-amber-200 dark:border-amber-800">
                <p v-if="concessionDollarAmount" class="text-lg font-black text-amber-600">
                    {{ formatCurrency(concessionDollarAmount) }} <span class="text-xs font-normal">upfront</span>
                </p>
                <p v-if="concessionDays" class="text-lg font-black text-amber-600">
                    {{ concessionDays }} days free <span class="text-xs font-normal">({{ Math.round(concessionDays / 7) }} weeks)</span>
                </p>
            </div>
        </div>
    </div>
  </div>
</template>
