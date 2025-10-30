<template>
  <article class="halfway-notification">
    <header class="header">
      <h3 class="title">Milestone Unlocked</h3>
      <span class="badge">50%</span>
    </header>
    <p class="message">{{ notification.message }}</p>
    <footer class="footer">
      <span class="meta">Frequency: {{ notification.frequency }}</span>
      <button type="button" class="view-btn" @click="$emit('view', notification.progress)">
        View Goal
      </button>
    </footer>
  </article>
</template>

<script setup>
const props = defineProps({
  notification: { type: Object, required: true }
})
</script>

<style scoped>
.halfway-notification {
  background: #fff9db;
  border: 1px solid #ffe58f;
  border-radius: 10px;
  padding: 1.2rem 1.4rem;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.title {
  margin: 0;
  color: #8a5d00;
  font-size: 1.1rem;
  font-weight: 600;
}
.badge {
  background: #ffd666;
  color: #663c00;
  border-radius: 999px;
  padding: 0.15rem 0.75rem;
  font-size: 0.85rem;
  font-weight: 600;
}
.message {
  margin: 0;
  color: #5c3d00;
  font-size: 1rem;
}
.footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}
.meta {
  color: #8a5d00;
  font-size: 0.9rem;
}
.view-btn {
  border: none;
  background: #ffe58f;
  color: #5c3d00;
  padding: 0.45rem 1rem;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}
.view-btn:hover {
  background: #ffd666;
}
</style>
