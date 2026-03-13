<script setup lang="ts">
definePageMeta({ layout: 'dashboard' })
</script>

<template>
  <div class="max-w-3xl mx-auto py-8 px-4">
    <div class="flex items-center gap-3 mb-8">
      <UButton
        icon="i-heroicons-arrow-left"
        variant="ghost"
        color="neutral"
        to="/solver/weekly-report"
      />
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Weekly Report — Guide</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
          What every section of the weekly operational summary means
        </p>
      </div>
    </div>

    <div class="space-y-8">

      <!-- Overview -->
      <section class="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950 p-6">
        <h2 class="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
          <span class="text-2xl">📋</span> What This Report Is
        </h2>
        <p class="text-sm text-blue-800 dark:text-blue-200">
          The Weekly Report is a Monday morning operational briefing covering the past 7 days (Monday → Sunday).
          It aggregates data across all five properties to answer: <em>"What happened this week and where do we stand?"</em>
          It is sent automatically every Monday to recipients subscribed to <strong>Weekly Summary</strong> in the Notifications admin.
        </p>
        <p class="text-sm text-blue-800 dark:text-blue-200 mt-2">
          Use the date picker on the report page to view any prior week. The picker snaps to Mondays — each Monday is one week.
        </p>
      </section>

      <!-- Occupancy WoW -->
      <section class="rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <span class="text-2xl">📈</span> Occupancy — Week over Week
        </h2>
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
          One row per property. Compares the availability snapshot from Sunday (week end) to the previous Monday (week start) using the
          <code class="bg-gray-100 dark:bg-gray-800 px-1 rounded text-xs">availability_snapshots</code> table.
        </p>
        <ul class="text-sm text-gray-600 dark:text-gray-400 space-y-2">
          <li><strong>Available Now</strong> — Vacant units as of Sunday's snapshot.</li>
          <li><strong>WoW Change</strong> — Delta vs last Monday's snapshot. <span class="text-green-600">Green = fewer vacancies (units leased up).</span> <span class="text-red-600">Red = more vacancies (units came back available).</span></li>
          <li><strong>Avg Rent</strong> — Portfolio-wide average contracted rent for this property as of Sunday.</li>
          <li><strong>Rent Change</strong> — Delta in avg rent vs last Monday. Up = rent increased (renewals, new leases). Down = price reductions or lower-rent leases signed.</li>
        </ul>
      </section>

      <!-- Leasing Activity -->
      <section class="rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <span class="text-2xl">🏃</span> Leasing Activity — This Week
        </h2>
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Counts of solver events recorded between Monday and Sunday of this week, sourced from
          <code class="bg-gray-100 dark:bg-gray-800 px-1 rounded text-xs">solver_events</code>.
          These reflect what Yardi reported each day, processed by the daily solver run.
        </p>
        <ul class="text-sm text-gray-600 dark:text-gray-400 space-y-2">
          <li><strong>Move-Ins</strong> — New tenancies that came in as <em>Current</em> status. These are residents who actually moved in this week per Yardi. <span class="text-green-600">Shown in green when > 0.</span></li>
          <li><strong>Move-Outs</strong> — Explicit <code class="bg-gray-100 dark:bg-gray-800 px-1 rounded text-xs">move_out</code> events: tenancies that transitioned to Past this week (property manager closed the record in Yardi).</li>
          <li><strong>Silent Drops</strong> — Tenancies that disappeared from Yardi without a formal close-out. Could be denied applicants, early exits, or Yardi data cleanup. Shown in amber when > 0.</li>
          <li><strong>Notices Given</strong> — Residents who gave formal notice to vacate this week.</li>
          <li><strong>Renewals</strong> — Lease renewals completed and recorded this week.</li>
          <li><strong>Pipeline Added</strong> — New Future or Applicant tenancies added this week — prospective residents who signed or applied but haven't moved in yet.</li>
        </ul>
      </section>

      <!-- Pipelines -->
      <section class="rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <span class="text-2xl">🔀</span> Move-Out & Move-In Pipelines
        </h2>
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-3">
          These are real-time snapshots of current pipeline state — not limited to this week. They show everyone in the system right now:
        </p>
        <ul class="text-sm text-gray-600 dark:text-gray-400 space-y-2">
          <li><strong>Move-Out Pipeline</strong> — All residents with status <em>Notice</em> and a move_out_date. Rows are color-coded: <span class="text-red-600">red OVERDUE badge</span> = move_out_date has passed, <span class="text-amber-600">Xd badge</span> = within 3 days.</li>
          <li><strong>Move-In Pipeline</strong> — All Future and Applicant tenancies with a move_in_date. The <strong>Make-Ready</strong> column flags whether the unit still has an open make-ready flag — a conflict that needs resolution before the resident arrives.</li>
        </ul>
      </section>

      <!-- Make-Ready -->
      <section class="rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <span class="text-2xl">🏠</span> Make-Ready Status
        </h2>
        <ul class="text-sm text-gray-600 dark:text-gray-400 space-y-2">
          <li><strong>Completed This Week</strong> — Make-ready flags that were resolved between Monday and Sunday. Green when > 0: units were turned and handed back.</li>
          <li><strong>Currently Overdue</strong> — Open make-ready flags with <em>error</em> severity (ready date has passed). Red when > 0: these units are blocking future move-ins or sitting vacant past target.</li>
        </ul>
      </section>

      <!-- Work Orders -->
      <section class="rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <span class="text-2xl">🔧</span> Work Orders
        </h2>
        <ul class="text-sm text-gray-600 dark:text-gray-400 space-y-2">
          <li><strong>Opened</strong> — Work orders created this week.</li>
          <li><strong>Completed</strong> — Work orders with a completion date this week.</li>
          <li><strong>Overdue (Open > 3d)</strong> — Open work orders whose <em>call_date</em> is more than 3 days ago. Red when > 0: residents are waiting on outstanding maintenance.</li>
        </ul>
      </section>

      <!-- Delinquencies -->
      <section class="rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <span class="text-2xl">💵</span> Delinquencies — Current
        </h2>
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-3">
          A snapshot of <em>current</em> active delinquencies — not week-specific. Reflects the state as of when the report was generated.
        </p>
        <ul class="text-sm text-gray-600 dark:text-gray-400 space-y-2">
          <li><strong>Residents</strong> — Count of residents with any balance owed.</li>
          <li><strong>Total Owed</strong> — Sum of all unpaid balances at this property.</li>
          <li><strong>30+ Days</strong> — Balance in the 31–60, 61–90, and 90+ day aging buckets combined. This is the portion most at risk and typically eligible for collections action.</li>
        </ul>
        <p class="text-sm text-gray-500 dark:text-gray-500 mt-3">
          If any balance exists, a red alert banner appears at the top of the report with the portfolio-wide total.
        </p>
      </section>

      <!-- Navigation tip -->
      <section class="rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <span class="text-2xl">🗓️</span> Navigating Weeks
        </h2>
        <ul class="text-sm text-gray-600 dark:text-gray-400 space-y-2">
          <li>Use the <strong>← / →</strong> buttons to step back or forward one week at a time.</li>
          <li>The date picker is locked to <strong>Mondays</strong> (step=7 from a known Monday anchor). Picking any date snaps it to the nearest Monday.</li>
          <li>The <strong>This Week</strong> button always returns to the current week.</li>
        </ul>
      </section>

    </div>

    <!-- Footer -->
    <div class="mt-10 flex justify-center">
      <UButton to="/solver/weekly-report" icon="i-heroicons-arrow-left" variant="outline">
        Back to Weekly Report
      </UButton>
    </div>
  </div>
</template>
