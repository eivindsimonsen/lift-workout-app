<script setup lang="ts">
  // ---------------------------------------------------------------------------
  // Imports
  // ---------------------------------------------------------------------------
  import { ref, computed, onMounted } from "vue";
  import { useRouter } from "vue-router";
  import { useHybridData } from "@/composables/useHybridData";
  import { useSupabase } from "@/composables/useSupabase";
  import { useErrorHandler } from "@/composables/useErrorHandler";

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  const router = useRouter();
  const workoutData = useHybridData();
  const { supabase } = useSupabase();
  const { showError, showSuccess, showWarning, handleAuthError } = useErrorHandler();

  const isLoading = computed(() => workoutData.isLoading.value);

  // Form data
  const profileName = ref("");
  const profileEmail = ref("");
  const phoneNumber = ref("");
  const currentPassword = ref("");
  const newPassword = ref("");
  const confirmPassword = ref("");

  const isUpdatingProfile = ref(false);
  const isUpdatingPassword = ref(false);

  // Subscription — visual only for now; everyone is on the free plan.
  const subscriptionType = ref("free");
  const subscriptionStatus = ref("active");

  const subscriptionOptions = [{ value: "free", label: "Gratis", description: "Grunnleggende funksjoner" }];

  const currentSubscription = computed(() => subscriptionOptions.find((option) => option.value === subscriptionType.value) || subscriptionOptions[0]);

  // ---------------------------------------------------------------------------
  // Header
  // ---------------------------------------------------------------------------

  const currentUser = computed(() => workoutData.currentUser.value);

  /** Same rule as the avatar in the navigation: two initials from the name, else from the e-mail. */
  const initials = computed(() => {
    const email: string | undefined = currentUser.value?.email;
    if (!email) return "";
    const name: string = currentUser.value?.user_metadata?.name || email.split("@")[0];
    const parts = name.trim().split(/\s+/);
    return (parts.length >= 2 ? parts[0][0] + parts[1][0] : name.substring(0, 2)).toUpperCase();
  });

  const displayName = computed(() => currentUser.value?.user_metadata?.name || "Profil");

  // ---------------------------------------------------------------------------
  // Profile
  // ---------------------------------------------------------------------------

  const initializeProfileData = async () => {
    const user = workoutData.currentUser.value;
    if (!user) return;
    // Profile data (name, email, phone) comes from Supabase Auth.
    profileName.value = user.user_metadata?.name || "";
    profileEmail.value = user.email || ""; // Always the auth e-mail — changing it requires verification.
    phoneNumber.value = user.user_metadata?.phone || "";
    subscriptionType.value = "free";
    subscriptionStatus.value = "active";
  };

  /** Saves name and phone to the auth metadata, and starts an e-mail change if it differs. */
  const updateBasicProfile = async () => {
    if (!workoutData.currentUser.value) return;
    isUpdatingProfile.value = true;

    try {
      const user = workoutData.currentUser.value;
      const currentName = profileName.value.trim();
      const currentPhone = phoneNumber.value.trim();
      const currentEmail = profileEmail.value.trim();

      const hasNameChange = currentName !== (user.user_metadata?.name || "");
      const hasPhoneChange = currentPhone !== (user.user_metadata?.phone || "");
      const hasEmailChange = currentEmail !== user.email;

      if (!hasNameChange && !hasPhoneChange && !hasEmailChange) {
        showWarning("Ingen endringer å oppdatere");
        return;
      }

      if (hasNameChange || hasPhoneChange) {
        const { error: authError } = await supabase.auth.updateUser({ data: { name: currentName, phone: currentPhone } });
        if (authError) {
          console.error("Error updating auth user metadata:", authError);
          handleAuthError({ message: "Kunne ikke oppdatere navn/telefon i Supabase Auth" });
          return;
        }

        // Reflect the change at once, then refresh from Supabase for the canonical copy.
        if (workoutData.currentUser.value) {
          workoutData.currentUser.value.user_metadata = { ...workoutData.currentUser.value.user_metadata, name: currentName, phone: currentPhone };
        }
        const {
          data: { user: refreshedUser },
          error: refreshError,
        } = await supabase.auth.getUser();
        if (!refreshError && refreshedUser) workoutData.currentUser.value = refreshedUser;
      }

      if (hasEmailChange) {
        const { error: emailError } = await supabase.auth.updateUser({ email: currentEmail });
        if (emailError) {
          console.error("Error updating auth email:", emailError);
          handleAuthError({ message: "Kunne ikke oppdatere e-postadresse. Prøv igjen senere." });
          return;
        }
      }

      if (hasEmailChange) {
        showSuccess("Profil oppdatert! Sjekk din nye e-postadresse for verifiseringslenke. E-postadressen vil bli oppdatert etter verifisering.");
      } else {
        showSuccess("Profil oppdatert!");
      }

      await initializeProfileData();
    } catch (error: any) {
      console.error("Error updating profile:", error);
      handleAuthError(error);
    } finally {
      isUpdatingProfile.value = false;
    }
  };

  // ---------------------------------------------------------------------------
  // Password
  // ---------------------------------------------------------------------------

  /** Re-checks the current password by signing in with it before setting the new one. */
  const updatePassword = async () => {
    if (!workoutData.currentUser.value) return;
    const user = workoutData.currentUser.value;

    if (!newPassword.value.trim()) {
      showError("Skriv inn nytt passord");
      return;
    }
    if (newPassword.value !== confirmPassword.value) {
      handleAuthError({ message: "Nye passord matcher ikke" });
      return;
    }
    if (!currentPassword.value.trim()) {
      handleAuthError({ message: "Du må oppgi nåværende passord for å endre passord" });
      return;
    }

    isUpdatingPassword.value = true;
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: user.email!, password: currentPassword.value });
      if (signInError) {
        handleAuthError({ message: "Nåværende passord er feil" });
        return;
      }

      const { error } = await supabase.auth.updateUser({ password: newPassword.value });
      if (error) {
        handleAuthError(error);
        return;
      }

      showSuccess("Passord oppdatert!");
      currentPassword.value = "";
      newPassword.value = "";
      confirmPassword.value = "";
    } catch (error: any) {
      console.error("Error updating password:", error);
      handleAuthError(error);
    } finally {
      isUpdatingPassword.value = false;
    }
  };

  // ---------------------------------------------------------------------------
  // Sign out
  // ---------------------------------------------------------------------------

  const handleSignOut = async () => {
    try {
      await workoutData.signOut();
    } catch (error) {
      console.error("Error during sign out:", error);
    } finally {
      router.push("/login");
    }
  };

  onMounted(async () => {
    await initializeProfileData();
  });
</script>

<template>
  <div class="space-y-5 pb-24 md:pb-8">
    <!-- Header: who is signed in -->
    <header class="flex items-center gap-3">
      <div class="pf-avatar" aria-hidden="true">{{ initials }}</div>
      <div class="min-w-0">
        <h1 class="pf-title">{{ displayName }}</h1>
        <p v-if="currentUser?.email" class="pf-meta">{{ currentUser.email }}</p>
      </div>
    </header>

    <!-- Loading -->
    <div v-if="isLoading" class="space-y-4 animate-pulse">
      <div class="pf-panel h-72"></div>
      <div class="pf-panel h-64"></div>
    </div>

    <template v-else>
      <!-- Personal information -->
      <section class="pf-panel">
        <h2 class="pf-section-title">Personlig informasjon</h2>

        <div class="pf-fields">
          <label class="pf-field">
            <span class="pf-label">Navn</span>
            <input v-model="profileName" type="text" required autocomplete="name" class="input-field w-full" placeholder="Ditt navn" />
          </label>
          <label class="pf-field">
            <span class="pf-label">E-post</span>
            <input v-model="profileEmail" type="email" autocomplete="email" class="input-field w-full" placeholder="din@email.com" />
            <span class="pf-hint">Endringen trer i kraft når du har bekreftet den nye adressen.</span>
          </label>
          <label class="pf-field">
            <span class="pf-label">Mobilnummer <span class="pf-label__soft">valgfritt</span></span>
            <input v-model="phoneNumber" type="tel" autocomplete="tel" class="input-field w-full" placeholder="+47 123 45 678" />
            <span class="pf-hint">Brukes for gjenoppretting av konto.</span>
          </label>
        </div>

        <div class="pf-actions">
          <button type="button" class="btn-primary pf-action" :disabled="isUpdatingProfile" @click="updateBasicProfile">
            <span v-if="isUpdatingProfile" class="flex items-center gap-2">
              <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Lagrer…
            </span>
            <span v-else>Lagre endringer</span>
          </button>
        </div>
      </section>

      <!-- Password -->
      <section class="pf-panel">
        <h2 class="pf-section-title">Passord</h2>

        <div class="pf-fields">
          <label class="pf-field pf-field--wide">
            <span class="pf-label">Nåværende passord</span>
            <input v-model="currentPassword" type="password" autocomplete="current-password" class="input-field w-full" placeholder="Ditt nåværende passord" />
          </label>
          <label class="pf-field">
            <span class="pf-label">Nytt passord</span>
            <input v-model="newPassword" type="password" autocomplete="new-password" class="input-field w-full" placeholder="Ditt nye passord" />
          </label>
          <label class="pf-field">
            <span class="pf-label">Bekreft nytt passord</span>
            <input v-model="confirmPassword" type="password" autocomplete="new-password" class="input-field w-full" placeholder="Gjenta det nye passordet" />
          </label>
        </div>

        <div class="pf-actions">
          <button type="button" class="btn-secondary pf-action" :disabled="isUpdatingPassword" @click="updatePassword">
            <span v-if="isUpdatingPassword" class="flex items-center gap-2">
              <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Oppdaterer…
            </span>
            <span v-else>Oppdater passord</span>
          </button>
        </div>
      </section>

      <!-- Subscription — visual only for now -->
      <section class="pf-panel">
        <h2 class="pf-section-title">Abonnement</h2>
        <div class="pf-plan">
          <div class="min-w-0">
            <p class="pf-plan__name">{{ currentSubscription.label }}</p>
            <p class="pf-plan__desc">{{ currentSubscription.description }}</p>
          </div>
          <span class="pf-status" :class="{ 'pf-status--inactive': subscriptionStatus !== 'active' }">
            {{ subscriptionStatus === "active" ? "Aktiv" : "Inaktiv" }}
          </span>
        </div>
      </section>

      <!-- Sign out: a quiet row, not a big red button -->
      <div class="pf-panel pf-panel--list">
        <button type="button" class="pf-signout" @click="handleSignOut">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Logg ut
        </button>
      </div>
    </template>
  </div>
</template>

<style scoped>
  /* ── Header ──────────────────────────────────────────────────────────────── */

  /* Same orange initials circle as in the navigation, larger. */
  .pf-avatar {
    flex-shrink: 0;
    width: 3rem;
    height: 3rem;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1rem;
    font-weight: 700;
    letter-spacing: 0.02em;
    color: #fff;
    background: #f97316;
    border-radius: 50%;
  }

  .pf-title {
    font-size: 1.5rem;
    font-weight: 700;
    line-height: 1.2;
    color: #fff;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .pf-meta {
    margin-top: 0.125rem;
    font-size: 0.8125rem;
    color: #94a3b8;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* ── Panels ──────────────────────────────────────────────────────────────── */

  .pf-panel {
    padding: 1.125rem;
    background: #111827;
    border: 1px solid #1f2937;
    border-radius: 1rem;
  }

  .pf-panel--list {
    padding: 0;
    overflow: hidden;
  }

  .pf-section-title {
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #94a3b8;
  }

  /* ── Forms ───────────────────────────────────────────────────────────────── */

  .pf-fields {
    display: grid;
    gap: 1rem;
    margin-top: 0.875rem;
  }

  @media (min-width: 768px) {
    .pf-fields {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .pf-field--wide {
      grid-column: 1 / -1;
    }
  }

  .pf-field {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .pf-label {
    font-size: 0.8125rem;
    font-weight: 600;
    color: #cbd5e1;
  }

  .pf-label__soft {
    margin-left: 0.25rem;
    font-weight: 500;
    color: #64748b;
  }

  .pf-hint {
    font-size: 0.75rem;
    color: #64748b;
  }

  .pf-actions {
    display: flex;
    justify-content: flex-end;
    margin-top: 1.125rem;
    padding-top: 1rem;
    border-top: 1px solid #1f2937;
  }

  @media (max-width: 639px) {
    .pf-action {
      width: 100%;
    }
  }

  /* ── Subscription ────────────────────────────────────────────────────────── */

  .pf-plan {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    margin-top: 0.75rem;
  }

  .pf-plan__name {
    font-size: 1.0625rem;
    font-weight: 700;
    color: #fff;
  }

  .pf-plan__desc {
    margin-top: 0.125rem;
    font-size: 0.8125rem;
    color: #94a3b8;
  }

  .pf-status {
    flex-shrink: 0;
    padding: 0.1875rem 0.625rem;
    font-size: 0.75rem;
    font-weight: 700;
    color: #4ade80;
    background: #16a34a1a;
    border: 1px solid #16a34a50;
    border-radius: 999px;
  }

  .pf-status--inactive {
    color: #94a3b8;
    background: #1e293b;
    border-color: #334155;
  }

  /* ── Sign out ────────────────────────────────────────────────────────────── */

  .pf-signout {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.9375rem 1.125rem;
    font-size: 0.9375rem;
    font-weight: 600;
    color: #f87171;
    text-align: left;
    cursor: pointer;
    transition: background 0.15s;
  }

  .pf-signout:active {
    background: #7f1d1d40;
  }

  @media (hover: hover) {
    .pf-signout:hover {
      background: #7f1d1d26;
    }
  }
</style>
