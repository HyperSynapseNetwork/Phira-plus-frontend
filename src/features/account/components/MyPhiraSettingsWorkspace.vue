<script setup lang="ts">
import type { Identity } from '~/features/account/types'
import PPSettingsRow from '~/components/patterns/PPSettingsRow.vue'

const props = defineProps<{ githubIdentity?: Identity }>()
const emit = defineEmits<{
  bindGithub: []
  unbindGithub: []
  openPrivacy: []
  openSessions: []
  openPush: []
  openAppearance: []
  openRedemption: []
  signOut: []
}>()
const { t } = useI18n()
</script>

<template>
  <div class="space-y-6">
    <section>
      <h2 class="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--pp-text-tertiary)]">
        {{ t('myphira.account') }}
      </h2>
      <div class="divide-y divide-[var(--pp-border-subtle)] border-y border-[var(--pp-border-subtle)]">
        <PPSettingsRow :title="t('myphira.identities')" :description="props.githubIdentity ? `${t('myphira.github')}: ${props.githubIdentity.provider_name ?? props.githubIdentity.provider_id}` : t('myphira.githubNotBound')">
          <PPButton v-if="props.githubIdentity" weight="quiet" size="sm" @click="emit('unbindGithub')">
            {{ t('myphira.githubUnbind') }}
          </PPButton>
          <PPButton v-else weight="quiet" size="sm" @click="emit('bindGithub')">
            {{ t('myphira.githubBind') }}
          </PPButton>
        </PPSettingsRow>
      </div>
    </section>

    <section>
      <h2 class="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--pp-text-tertiary)]">
        {{ t('myphira.privacy') }}
      </h2>
      <div class="divide-y divide-[var(--pp-border-subtle)] border-y border-[var(--pp-border-subtle)]">
        <PPSettingsRow :title="t('myphira.privacy')" :description="t('myphira.privacyHint')">
          <PPButton weight="quiet" size="sm" @click="emit('openPrivacy')">
            {{ t('common.open') }}
          </PPButton>
        </PPSettingsRow>
        <PPSettingsRow :title="t('myphira.sessions')" :description="t('myphira.sessionsHint')">
          <PPButton weight="quiet" size="sm" @click="emit('openSessions')">
            {{ t('common.open') }}
          </PPButton>
        </PPSettingsRow>
      </div>
    </section>

    <section>
      <h2 class="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--pp-text-tertiary)]">
        {{ t('preferences.title') }}
      </h2>
      <div class="divide-y divide-[var(--pp-border-subtle)] border-y border-[var(--pp-border-subtle)]">
        <PPSettingsRow :title="t('myphira.pushTitle')">
          <PPButton weight="quiet" size="sm" @click="emit('openPush')">
            {{ t('common.open') }}
          </PPButton>
        </PPSettingsRow>
        <PPSettingsRow :title="t('preferences.title')">
          <PPButton weight="quiet" size="sm" @click="emit('openAppearance')">
            {{ t('common.open') }}
          </PPButton>
        </PPSettingsRow>
      </div>
    </section>

    <section>
      <h2 class="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--pp-text-tertiary)]">
        {{ t('myphira.redemptionCode') }}
      </h2>
      <div class="divide-y divide-[var(--pp-border-subtle)] border-y border-[var(--pp-border-subtle)]">
        <PPSettingsRow :title="t('myphira.redemptionCode')" :description="t('myphira.redemptionHintShort')">
          <PPButton weight="quiet" size="sm" @click="emit('openRedemption')">
            {{ t('common.open') }}
          </PPButton>
        </PPSettingsRow>
      </div>
    </section>

    <div class="border-t border-[var(--pp-border-subtle)] pt-5">
      <PPButton weight="dangerous" @click="emit('signOut')">
        {{ t('myphira.signOut') }}
      </PPButton>
    </div>
  </div>
</template>
