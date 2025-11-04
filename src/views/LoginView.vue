<template>
  <section>
    <h2>{{ mode === 'login' ? 'Login' : 'Register' }}</h2>

    <form @submit.prevent="onSubmit" class="form">
      <label>
        Username
        <input v-model="username" type="text" autocomplete="username" required minlength="8" />
      </label>

      <label>
        Password
        <input v-model="password" type="password" autocomplete="current-password" required minlength="8" />
      </label>

      <div class="actions">
        <button type="submit" :disabled="loading">{{ mode === 'login' ? 'Sign in' : 'Create account' }}</button>
        <button type="button" @click="toggleMode">{{ mode === 'login' ? 'Switch to Register' : 'Switch to Login' }}</button>
      </div>
      <div v-if="success" class="success">{{ success }}</div>
      <div v-if="error" class="error">{{ error }}</div>
    </form>
  </section>
</template>

<script>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'

export default {
  name: 'LoginView',
  setup() {
    const username = ref('')
    const password = ref('')
    const mode = ref('login') // or 'register'
  const loading = ref(false)
  const error = ref(null)
  const success = ref('')

  const userStore = useUserStore()
  const router = useRouter()

    function toggleMode() {
      mode.value = mode.value === 'login' ? 'register' : 'login'
      error.value = null
      success.value = ''
    }

    async function onSubmit() {
      loading.value = true
      error.value = null
      success.value = ''
      try {
        if (mode.value === 'login') {
          await userStore.login(username.value, password.value)
          // after successful login, navigate to Home (router)
          router.push('/')
        } else {
          await userStore.register(username.value, password.value)
          // Do not auto-login or navigate. Prompt the user to sign in.
          success.value = 'Account created. Please sign in with your new credentials.'
          mode.value = 'login'
          // Optionally clear password field for security
          password.value = ''
        }
      } catch (err) {
        error.value = err?.toString() || 'Authentication failed'
      } finally {
        loading.value = false
      }
    }

    return { username, password, mode, loading, error, success, toggleMode, onSubmit }
  }
}
</script>

<style scoped>
.form { display: flex; flex-direction: column; gap: .75rem; max-width: 320px; }
label { display: flex; flex-direction: column; font-size: .95rem; }
input { padding: .5rem; font-size: 1rem; }
.actions { display:flex; gap:.5rem; }
.error { color: #a00; margin-top: .5rem }
.success { color: #0a7a26; margin-top: .5rem }
</style>
