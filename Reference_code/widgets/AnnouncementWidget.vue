// app/components/widgets/AnnouncementWidget.vue

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { z } from 'zod';
import type { FormSubmitEvent } from '#ui/types';
import { useAnnouncements } from '@/composables/fetchers/announcements/useAnnouncements';
import { useCreateAnnouncement } from '@/composables/mutations/announcements/useCreateAnnouncement';
import { useAuth } from '@/composables/useAuth';
import { useProfileStore } from '@/stores/useProfileStore';
import { useFormatters } from '@/composables/useFormatters';
import UserAvatar from '@/components/UserAvatar.vue';

// --- Authorization & State ---
const { isManagerOrAdmin } = useAuth();
const profileStore = useProfileStore();
const { timeAgo } = useFormatters();

// --- Data Fetching ---
const { announcements, isLoading, refreshAnnouncements } = useAnnouncements();

// --- New Announcement Composer ---
const { createAnnouncement, isPosting } = useCreateAnnouncement();

const composerSchema = z.object({
  content: z.string().min(1, 'Message cannot be empty'),
});
type ComposerSchema = z.output<typeof composerSchema>;

const state = reactive({
  content: '',
  color: 'yellow',
  fontSize: 'normal',
});

const colorOptions = [
  { value: 'warning', class: 'bg-yellow-200' },
  { value: 'info', class: 'bg-blue-200' },
  { value: 'primary', class: 'bg-green-200' },
  { value: 'error', class: 'bg-red-200' },
];

const handlePostAnnouncement = async (
  event: FormSubmitEvent<ComposerSchema>
) => {
  // The user can only post to the properties they have access to.
  const userAptCodes = profileStore.profile?.access;
  if (!userAptCodes || userAptCodes.length === 0) {
    // Handle case where user has no properties assigned
    return;
  }

  const newAnnouncement = await createAnnouncement({
    content: event.data.content,
    apt_codes: userAptCodes,
    color: state.color,
    font_size: state.fontSize,
  });

  if (newAnnouncement) {
    state.content = ''; // Clear form on success
    refreshAnnouncements(); // Refresh the list to show the new post
  }
};

// --- Dynamic Styling for Displayed Announcements ---
const getAnnouncementClasses = (announcement: any) => {
  const colorClasses: Record<string, string> = {
    yellow:
      'bg-yellow-100 dark:bg-yellow-900/50 border-yellow-300 dark:border-yellow-700',
    blue: 'bg-blue-100 dark:bg-blue-900/50 border-blue-300 dark:border-blue-700',
    green:
      'bg-green-100 dark:bg-green-900/50 border-green-300 dark:border-green-700',
    red: 'bg-red-100 dark:bg-red-900/50 border-red-300 dark:border-red-700',
    default:
      'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700',
  };
  const sizeClasses: Record<string, string> = {
    large: 'text-lg',
    normal: 'text-base',
  };
  return [
    colorClasses[announcement.color] || colorClasses.default,
    sizeClasses[announcement.font_size] || sizeClasses.normal,
  ];
};
</script>

<template>
  <div class="h-full flex flex-col gap-4">
    <!-- Composer Section (only visible to authorized users) -->
    <div v-if="isManagerOrAdmin">
      <UForm
        :schema="composerSchema"
        :state="state"
        @submit="handlePostAnnouncement"
      >
        <UFormField name="content">
          <UTextarea
            v-model="state.content"
            placeholder="Post an announcement to your properties..."
            :rows="3"
            autoresize
          />
        </UFormField>
        <div class="flex justify-between items-center mt-2">
          <!-- Formatting Options -->
          <div class="flex items-center gap-2">
            <URadioGroup
              v-model="state.color"
              v-for="color in colorOptions"
              :key="color.value"
              :value="color.value"
              :ui="{ label: 'hidden' }"
            >
              <div
                :class="[
                  color.class,
                  'size-5 rounded-full ring-1 ring-inset ring-black/20',
                ]"
              />
            </URadioGroup>
            <UButtonGroup size="xs" class="ml-4">
              <UButton
                label="Normal"
                @click="state.fontSize = 'normal'"
                :variant="state.fontSize === 'normal' ? 'solid' : 'outline'"
              />
              <UButton
                label="Large"
                @click="state.fontSize = 'large'"
                :variant="state.fontSize === 'large' ? 'solid' : 'outline'"
              />
            </UButtonGroup>
          </div>
          <UButton type="submit" label="Post" :loading="isPosting" />
        </div>
      </UForm>
    </div>

    <!-- Separator -->
    <USeparator />

    <!-- Display Area -->
    <div class="flex-grow overflow-y-auto space-y-4 pr-2">
      <div v-if="isLoading" class="text-center text-gray-500">
        <UIcon name="i-lucide-loader-circle" class="animate-spin" /> Loading
        announcements...
      </div>
      <div v-else-if="announcements && announcements.length > 0">
        <div
          v-for="announcement in announcements"
          :key="announcement.announcement_id"
          class="p-4 rounded-lg border"
          :class="getAnnouncementClasses(announcement)"
        >
          <p class="whitespace-pre-wrap">{{ announcement.content }}</p>
          <div
            class="flex items-center justify-end gap-2 text-xs text-gray-500 dark:text-gray-400 mt-2"
          >
            <UserAvatar
              :first-name="announcement.creator_first_name"
              :last-name="announcement.creator_last_name"
              size="2xs"
            />
            <span
              >{{ announcement.creator_first_name }} -
              {{ timeAgo(announcement.created_at) }}</span
            >
          </div>
        </div>
      </div>
      <div v-else class="text-center text-gray-400 italic py-6">
        No announcements for your properties.
      </div>
    </div>
  </div>
</template>
