<script setup lang="ts">
definePageMeta({ layout: 'dashboard' })
</script>

<template>
  <div class="max-w-3xl mx-auto py-8 px-4">
    <div class="flex items-center gap-3 mb-8">
      <UButton
        icon="i-heroicons-arrow-left"
        variant="ghost"
        color="gray"
        to="/solver/report"
      />
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Daily Solver Report — Guide</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
          What every section of the daily email means
        </p>
      </div>
    </div>

    <div class="space-y-8">

      <!-- Property Breakdown -->
      <section class="rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <span class="text-2xl">🏢</span> Property Breakdown
        </h2>
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
          One card per property processed in the run. Each card has two modules:
        </p>

        <div class="space-y-4">
          <div class="bg-blue-50 dark:bg-blue-950 rounded-lg p-4">
            <h3 class="font-semibold text-blue-900 dark:text-blue-100 mb-2">Availabilities</h3>
            <ul class="text-sm text-blue-800 dark:text-blue-200 space-y-2">
              <li><strong>Available Units</strong> — Current count of vacant units from the daily snapshot. The delta (e.g. −2) shows the change since yesterday. A negative delta is green — it means units were leased up.</li>
              <li><strong>Applications</strong> — Number of prospective tenant applications saved during this run.</li>
              <li><strong>Notices</strong> — Number of notice-to-vacate events processed in this run (residents who gave notice today).</li>
              <li><strong>Avg Contracted Rent</strong> — Portfolio-wide average of all active lease amounts at this property, from the daily snapshot. The delta shows change since yesterday.</li>
            </ul>
          </div>

          <div class="bg-indigo-50 dark:bg-indigo-950 rounded-lg p-4">
            <h3 class="font-semibold text-indigo-900 dark:text-indigo-100 mb-2">Renewals</h3>
            <ul class="text-sm text-indigo-800 dark:text-indigo-200 space-y-2">
              <li><strong>Offer Pending</strong> — Renewal worksheets created but not yet sent to the resident. These are in the queue and need an offer to go out.</li>
              <li><strong>Awaiting Response</strong> — Offers sent to residents who haven't replied yet. Follow up if these are aging.</li>
              <li><strong>Completed This Run</strong> — Leases that were renewed (signed) during this solver run.</li>
            </ul>
          </div>
        </div>
      </section>

      <!-- Operational Summary -->
      <section class="rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <span class="text-2xl">📊</span> Operational Summary
        </h2>
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Four live-data boxes sourced from the operational database at the time the email was sent. Red values indicate items needing attention.
        </p>

        <div class="space-y-3 text-sm">
          <div class="flex gap-3">
            <span class="text-xl">🚨</span>
            <div>
              <p class="font-semibold text-gray-800 dark:text-gray-200">Alerts</p>
              <p class="text-gray-600 dark:text-gray-400">Active system alerts across your properties. "New Today" = alerts created on the upload date. View in <strong>Operations → Alerts</strong>.</p>
            </div>
          </div>
          <div class="flex gap-3">
            <span class="text-xl">🔧</span>
            <div>
              <p class="font-semibold text-gray-800 dark:text-gray-200">Work Orders</p>
              <p class="text-gray-600 dark:text-gray-400">Open maintenance requests. <strong>Open &gt; 3 Days</strong> = orders that have been open (by call date) for more than 3 days and are not yet completed. These are highlighted red when &gt; 0. View in <strong>Operations → Work Orders</strong>.</p>
            </div>
          </div>
          <div class="flex gap-3">
            <span class="text-xl">🏠</span>
            <div>
              <p class="font-semibold text-gray-800 dark:text-gray-200">MakeReady</p>
              <p class="text-gray-600 dark:text-gray-400">Units currently flagged as needing MakeReady preparation (turn units). <strong>Overdue</strong> = flags at error severity, meaning the unit should already be ready. View in <strong>Operations → MakeReady</strong>.</p>
            </div>
          </div>
          <div class="flex gap-3">
            <span class="text-xl">💵</span>
            <div>
              <p class="font-semibold text-gray-800 dark:text-gray-200">Delinquencies</p>
              <p class="text-gray-600 dark:text-gray-400">Current active delinquent residents. <strong>Total Owed</strong> = sum of all unpaid balances. <strong>30+ Days</strong> = amount in the 31–60, 61–90, and 90+ aging buckets combined — this is the most collection-critical segment. View in <strong>Residents → Delinquencies</strong>.</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Today's Activity -->
      <section class="rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <span class="text-2xl">📋</span> Today's Activity
        </h2>
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Event tables generated directly from what the Solver processed in this run. Only sections with events are shown.
        </p>

        <div class="space-y-3 text-sm">
          <div class="flex gap-3">
            <span class="text-xl">👤</span>
            <div>
              <p class="font-semibold text-gray-800 dark:text-gray-200">New Residents</p>
              <p class="text-gray-600 dark:text-gray-400">Tenancies with a new resident record created in this run. Includes the resident name, unit, property, Yardi status (Current / Future), and move-in date.</p>
            </div>
          </div>
          <div class="flex gap-3">
            <span class="text-xl">🔄</span>
            <div>
              <p class="font-semibold text-gray-800 dark:text-gray-200">Lease Renewals</p>
              <p class="text-gray-600 dark:text-gray-400">Leases that were renewed in this run. Shows old vs. new rent with the dollar and percent change.</p>
            </div>
          </div>
          <div class="flex gap-3">
            <span class="text-xl">💰</span>
            <div>
              <p class="font-semibold text-gray-800 dark:text-gray-200">Price Changes</p>
              <p class="text-gray-600 dark:text-gray-400">Availability list price changes from this run. CV (Coeur Vieux) shows small $1–$2 decrements daily — this is normal AIRM revenue management behavior, not manual repricing.</p>
            </div>
          </div>
          <div class="flex gap-3">
            <span class="text-xl">📝</span>
            <div>
              <p class="font-semibold text-gray-800 dark:text-gray-200">New Applications</p>
              <p class="text-gray-600 dark:text-gray-400">Prospective tenant applications saved in this run. Shows applicant name, unit, application date, and screening result (Approved / Pending / Denied).</p>
            </div>
          </div>
          <div class="flex gap-3">
            <span class="text-xl">📋</span>
            <div>
              <p class="font-semibold text-gray-800 dark:text-gray-200">Notices on File</p>
              <p class="text-gray-600 dark:text-gray-400">Move-out notices processed in this run. The summary table shows count per property; the detail table lists each resident, their unit, and expected move-out date.</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Technical Health -->
      <section class="rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <span class="text-2xl">⚙️</span> Technical Health
        </h2>
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-3">
          File processing status for the solver batch. Green = all files parsed cleanly.
        </p>
        <ul class="text-sm text-gray-600 dark:text-gray-400 space-y-2">
          <li><strong>Status</strong> — SUCCESS means the full batch completed without a fatal error. FAILED means the solver threw an unhandled exception — check the error message and re-run after fixing the source file.</li>
          <li><strong>Files Processed</strong> — Count of import_staging rows for this batch.</li>
          <li><strong>Parse Errors</strong> — Files that had an error_log entry. Red when &gt; 0. Drill in at <strong>Admin → Import</strong>.</li>
        </ul>
      </section>

      <!-- Properties Reference -->
      <section class="rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <span class="text-2xl">🗺️</span> Property Codes
        </h2>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-gray-200 dark:border-gray-700">
                <th class="text-left py-2 pr-4 font-semibold text-gray-700 dark:text-gray-300">Code</th>
                <th class="text-left py-2 font-semibold text-gray-700 dark:text-gray-300">Property</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
              <tr><td class="py-2 pr-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">RS</td><td class="py-2 text-gray-700 dark:text-gray-300">Residences at 4225</td></tr>
              <tr><td class="py-2 pr-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">SB</td><td class="py-2 text-gray-700 dark:text-gray-300">Stonebridge Ranch</td></tr>
              <tr><td class="py-2 pr-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">CV</td><td class="py-2 text-gray-700 dark:text-gray-300">City View — uses AIRM (automated revenue management)</td></tr>
              <tr><td class="py-2 pr-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">OB</td><td class="py-2 text-gray-700 dark:text-gray-300">Ocean Breeze</td></tr>
              <tr><td class="py-2 pr-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">WO</td><td class="py-2 text-gray-700 dark:text-gray-300">Whispering Oaks</td></tr>
            </tbody>
          </table>
        </div>
      </section>

    </div>

    <div class="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 text-center">
      <UButton to="/solver/report" icon="i-heroicons-arrow-left">
        Back to Live Report
      </UButton>
    </div>
  </div>
</template>
