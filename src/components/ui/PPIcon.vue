<script setup lang="ts">
import type { PPIconName } from '~/types/ui'

const props = withDefaults(defineProps<{ name: PPIconName, size?: number }>(), { size: 18 })

const paths: Record<PPIconName, string[]> = {
  home: ['M3 10.5 12 3l9 7.5', 'M5 9.5V21h14V9.5', 'M9 21v-7h6v7'],
  users: ['M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2', 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8', 'M22 21v-2a4 4 0 0 0-3-3.87', 'M16 3.13a4 4 0 0 1 0 7.75'],
  groups: ['M7 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6', 'M17 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6', 'M2 21v-2a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v2', 'M14 15.3a5 5 0 0 1 8 4V21'],
  rooms: ['M3 4h18v14H7l-4 3V4Z', 'M8 9h8', 'M8 13h5'],
  server: ['M4 5h16v6H4z', 'M4 13h16v6H4z', 'M8 8h.01', 'M8 16h.01'],
  config: ['M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7', 'M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.12 3.67-.08-.03a1.7 1.7 0 0 0-1.8-.08l-.05.03a1.7 1.7 0 0 0-1 .44 1.7 1.7 0 0 0-.5 1.03H9.75a1.7 1.7 0 0 0-.5-1.03 1.7 1.7 0 0 0-1-.44l-.05-.03a1.7 1.7 0 0 0-1.8.08l-.08.03L4.2 16.94l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.08-1.23L3.4 13.7V9.3l.12-.07A1.7 1.7 0 0 0 4.6 8a1.7 1.7 0 0 0-.34-1.88L4.2 6.06 6.32 2.4l.08.03a1.7 1.7 0 0 0 1.8.08l.05-.03a1.7 1.7 0 0 0 1-.44A1.7 1.7 0 0 0 9.75 1h4.5a1.7 1.7 0 0 0 .5 1.03 1.7 1.7 0 0 0 1 .44l.05.03a1.7 1.7 0 0 0 1.8-.08l.08-.03 2.12 3.67-.06.06A1.7 1.7 0 0 0 19.4 8c.17.55.56 1 1.08 1.23l.12.07v4.4l-.12.07A1.7 1.7 0 0 0 19.4 15Z'],
  site: ['M4 5h16v14H4z', 'M4 9h16', 'M8 7h.01'],
  plugins: ['M8.5 3v4H5a2 2 0 0 0-2 2v3.5h4V16H3v5h5v-4h3.5v4H16v-4h5v-4.5h-4V9a2 2 0 0 0-2-2h-3.5V3z'],
  logs: ['M5 3h14v18H5z', 'M9 8h6', 'M9 12h6', 'M9 16h4'],
  console: ['M4 5h16v14H4z', 'm8 10-3 3 3 3', 'M13 16h4'],
  audit: ['M6 3h9l3 3v15H6z', 'M14 3v4h4', 'M9 12h6', 'M9 16h4'],
  jobs: ['M6 7V4h12v3', 'M5 7h14v14H5z', 'M9 11h6', 'M9 15h6'],
  notification: ['M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9', 'M10 21h4'],
  automation: ['M4 7h16', 'M4 17h16', 'M8 3v8', 'M16 13v8'],
  preferences: ['M4 6h16', 'M4 12h16', 'M4 18h16', 'M8 3v6', 'M16 9v6', 'M10 15v6'],
  download: ['M12 3v12', 'm7 10 5 5 5-5', 'M5 21h14'],
  logout: ['M10 17l5-5-5-5', 'M15 12H3', 'M13 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6'],
  lock: ['M6 10V8a6 6 0 0 1 12 0v2', 'M5 10h14v11H5z', 'M12 14v3'],
  warning: ['M12 3 2 21h20L12 3Z', 'M12 9v5', 'M12 18h.01'],
  error: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20', 'm15 9-6 6', 'm9 9 6 6'],
  live: ['M8.5 8.5a5 5 0 0 0 0 7', 'M15.5 8.5a5 5 0 0 1 0 7', 'M5.5 5.5a9 9 0 0 0 0 13', 'M18.5 5.5a9 9 0 0 1 0 13'],
  replay: ['M4 12a8 8 0 1 0 3-6', 'M4 4v6h6', 'M10 9l6 3-6 3z'],
  charts: ['M4 20V10', 'M10 20V4', 'M16 20v-7', 'M22 20V7'],
  menu: ['M4 7h16', 'M4 12h16', 'M4 17h16'],
  close: ['M6 6l12 12', 'M18 6 6 18'],
  chevron: ['m9 18 6-6-6-6'],
  search: ['M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16', 'm21 21-4.35-4.35'],
}
</script>

<template>
  <svg :width="props.size" :height="props.size" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path v-for="d in paths[props.name]" :key="d" :d="d" />
  </svg>
</template>
