<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { setOptions, importLibrary } from '@googlemaps/js-api-loader'
import { useRuntimeConfig } from '#app'

interface Location {
  id: string
  latitude: number
  longitude: number
  icon_type: string
  description?: string
  source_image_url?: string
}

const props = defineProps<{
  locations: Location[]
  initialCenter?: { lat: number; lng: number }
}>()

const emit = defineEmits<{
  'view-notes': [locationId: string]
}>()

const mapDiv = ref<HTMLElement | null>(null)
let map: google.maps.Map | null = null
let markers: google.maps.Marker[] = []

const config = useRuntimeConfig()

// Get unique location types for legend
const uniqueLocationTypes = computed(() => {
  const types = new Set(props.locations.map(loc => loc.icon_type))
  return Array.from(types).sort()
})

// Custom icon mapping with colors and symbols
const getIconConfig = (type: string) => {
  const configs: Record<string, { color: string; symbol: string; label: string }> = {
    electrical: { color: '#EAB308', symbol: '⚡', label: 'Electrical' },        // Yellow
    plumbing: { color: '#3B82F6', symbol: '🔧', label: 'Plumbing' },           // Blue
    hvac: { color: '#0EA5E9', symbol: '❄️', label: 'HVAC' },                   // Sky Blue
    structural: { color: '#F97316', symbol: '🏗️', label: 'Structural' },       // Orange
    lighting: { color: '#A855F7', symbol: '💡', label: 'Lighting' },           // Purple
    safety_fire: { color: '#EF4444', symbol: '🔥', label: 'Safety/Fire' },     // Red
    landscaping: { color: '#22C55E', symbol: '🌿', label: 'Landscaping' },     // Green
    pavement_parking: { color: '#EC4899', symbol: '🅿️', label: 'Parking' },    // Pink
    waste: { color: '#92400E', symbol: '🗑️', label: 'Waste' },                 // Brown
    incident: { color: '#DC2626', symbol: '⚠️', label: 'Incident' },           // Dark Red
    general: { color: '#6B7280', symbol: '📍', label: 'General' }              // Gray
  }
  return configs[type] || configs.general
}

// Create custom SVG marker icon
const createCustomIcon = (type: string): google.maps.Icon => {
  const config = getIconConfig(type)

  // Create SVG with custom styling
  const svg = `
    <svg width="40" height="50" viewBox="0 0 40 50" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="shadow-${type}" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
          <feOffset dx="0" dy="2" result="offsetblur"/>
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.3"/>
          </feComponentTransfer>
          <feMerge>
            <feMergeNode/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <!-- Pin shape -->
      <path d="M20 0 C 8.954 0 0 8.954 0 20 C 0 30 20 50 20 50 S 40 30 40 20 C 40 8.954 31.046 0 20 0 Z"
            fill="${config.color}"
            filter="url(#shadow-${type})"
            stroke="#FFF"
            stroke-width="2"/>
      <!-- White circle for symbol -->
      <circle cx="20" cy="18" r="10" fill="white" opacity="0.95"/>
      <!-- Symbol text -->
      <text x="20" y="24"
            font-size="14"
            text-anchor="middle"
            fill="${config.color}"
            font-weight="bold">${config.symbol}</text>
    </svg>
  `

  // Convert SVG to data URL
  const encodedSvg = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg)

  return {
    url: encodedSvg,
    scaledSize: new google.maps.Size(40, 50),
    anchor: new google.maps.Point(20, 50)
  }
}

const initMap = async () => {
  console.log('initMap called')
  if (!mapDiv.value) {
    console.error('mapDiv is null')
    return
  }
  if (!config.public.googleMapsApiKey) {
    console.error('Google Maps API Key is missing')
    return
  }
  console.log('API Key present, initializing options...')

  // Use new functional API
  setOptions({
    key: config.public.googleMapsApiKey,
    v: 'weekly',
    libraries: ['maps', 'marker']
  })

  try {
    console.log('Importing maps library...')
    const { Map } = await importLibrary('maps') as google.maps.MapsLibrary
    console.log('Maps library imported. Creating map...')
    
    // Default center: Prop provided > SF Default
    const defaultCenter = { lat: 37.7749, lng: -122.4194 }
    let center = defaultCenter

    if (props.initialCenter && props.initialCenter.lat !== undefined && props.initialCenter.lng !== undefined) {
        let lat = Number(props.initialCenter.lat)
        let lng = Number(props.initialCenter.lng)

        // Safety check: specific case where user has swapped lat/lng
        // Lat must be [-90, 90]. If lat is out of bounds (e.g. -111) and lng is potentially a valid lat (e.g. 33), scale/swap.
        if (Math.abs(lat) > 90 && Math.abs(lng) <= 90) {
           console.warn('Coordinates appear swapped. Auto-correcting...', { lat, lng });
           [lat, lng] = [lng, lat];
        }

        center = { lat, lng }
    }
    console.log('Final Center used:', center)

    // Small delay to ensure modal/container transition is complete
    setTimeout(() => {
        if (!mapDiv.value) return
        map = new Map(mapDiv.value, {
            center,
            zoom: 16,
            mapId: 'DEMO_MAP_ID'
        })
        console.log('Map instance created:', map)
        updateMarkers()
    }, 100)
    
  } catch (e) {
    console.error('Error loading Google Maps:', e)
  }
}

const updateMarkers = () => {
  if (!map) return

  // Clear existing
  markers.forEach(m => m.setMap(null))
  markers = []

  if (props.locations.length === 0) return

  const bounds = new google.maps.LatLngBounds()

  props.locations.forEach(loc => {
    const position = {
        lat: Number(loc.latitude),
        lng: Number(loc.longitude)
    }
    const config = getIconConfig(loc.icon_type)
    const marker = new google.maps.Marker({
      position,
      map: map!,
      title: loc.description || config.label,
      icon: createCustomIcon(loc.icon_type),
      animation: google.maps.Animation.DROP
    })
    
    // Add enhanced info window
    const infoContent = `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 240px; padding: 8px;">
        ${loc.source_image_url ? `
          <img src="${loc.source_image_url}"
               style="width: 100%; height: auto; margin-bottom: 12px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        ` : ''}
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
          <div style="background-color: ${config.color}; color: white; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
            ${config.symbol} ${config.label}
          </div>
        </div>
        ${loc.description ? `
          <p style="color: #374151; font-size: 14px; line-height: 1.5; margin: 8px 0 0 0;">
            ${loc.description}
          </p>
        ` : ''}
        <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #E5E7EB; font-size: 11px; color: #9CA3AF;">
          📍 ${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}
        </div>
        <button
          id="view-notes-${loc.id}"
          style="margin-top: 12px; width: 100%; background-color: #3B82F6; color: white; padding: 8px 12px; border: none; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; transition: background-color 0.2s;"
          onmouseover="this.style.backgroundColor='#2563EB'"
          onmouseout="this.style.backgroundColor='#3B82F6'"
        >
          📝 View Notes
        </button>
      </div>
    `
    const infoWindow = new google.maps.InfoWindow({
        content: infoContent
    })
    marker.addListener('click', () => {
        infoWindow.open(map, marker)

        // Add click listener to the View Notes button after info window opens
        setTimeout(() => {
          const notesButton = document.getElementById(`view-notes-${loc.id}`)
          if (notesButton) {
            notesButton.addEventListener('click', () => {
              emit('view-notes', loc.id)
              infoWindow.close()
            })
          }
        }, 100)
    })

    markers.push(marker)
    bounds.extend(position)
  })

  // Fit bounds if we have points
  if (!bounds.isEmpty()) {
    map.fitBounds(bounds)
    // Avoid too much zoom if only one point
    if (props.locations.length === 1) {
        map.setZoom(18)
    }
  } else if (props.initialCenter) {
      // If no locations, go to initial center
      map.setCenter(props.initialCenter)
      map.setZoom(18)
  }
}

onMounted(() => {
  initMap()
})

watch(() => props.locations, () => {
  updateMarkers()
}, { deep: true })

watch(() => props.initialCenter, (newCenter) => {
    if (map && newCenter) {
        map.setCenter(newCenter)
        // If no locations, zoom to this center
        if (props.locations.length === 0) {
            map.setZoom(18)
        }
    }
})
</script>

<template>
  <div class="relative w-full h-full min-h-[400px] rounded-xl overflow-hidden shadow-sm border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800">
    <div ref="mapDiv" class="w-full h-full"></div>

    <!-- Map Legend -->
    <div v-if="config.public.googleMapsApiKey && props.locations.length > 0"
         class="absolute bottom-4 left-4 bg-white dark:bg-gray-900 rounded-lg shadow-lg p-4 max-w-xs z-10 border border-gray-200 dark:border-gray-700">
      <h4 class="text-xs font-black uppercase tracking-wider text-gray-500 mb-3">Location Types</h4>
      <div class="grid grid-cols-2 gap-2 text-xs">
        <div v-for="type in uniqueLocationTypes" :key="type" class="flex items-center gap-2">
          <div
            class="w-3 h-3 rounded-full flex-shrink-0"
            :style="{ backgroundColor: getIconConfig(type).color }"
          />
          <span class="text-gray-700 dark:text-gray-300 truncate">
            {{ getIconConfig(type).label }}
          </span>
        </div>
      </div>
    </div>

    <div v-if="!config.public.googleMapsApiKey" class="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 z-10 p-6 text-center">
        <div class="max-w-md">
            <UIcon name="i-heroicons-exclamation-triangle" class="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-2">Map Configuration Missing</h3>
            <p class="text-sm text-gray-600 dark:text-gray-400">
                The Google Maps API key is missing. Please set <code class="bg-gray-200 dark:bg-gray-700 px-1 py-0.5 rounded">GOOGLE_MAPS_API_KEY</code> in your .env file.
            </p>
        </div>
    </div>
  </div>
</template>
