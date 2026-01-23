import { ref, computed, reactive, type Ref } from 'vue'

export function useTableFiltering(data: Ref<any[]>) {
  const state = reactive({
    globalFilter: ''
  })
  
  const filteredData = computed(() => {
    const safeData = data.value || []
    const filterValue = state.globalFilter.toLowerCase()
    
    return filterValue
      ? safeData.filter((item) =>
          Object.values(item).some((value) =>
            String(value).toLowerCase().includes(filterValue)
          )
        )
      : safeData
  })
  
  return { filteredData, state }
}
