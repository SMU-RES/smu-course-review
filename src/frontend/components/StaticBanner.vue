<script setup lang="ts">
import { ref, onMounted } from 'vue'

const dynamicUrl = import.meta.env.VITE_DYNAMIC_SITE_URL || '#'
const dismissKey = 'smu_static_banner_dismissed'
const visible = ref(true)

onMounted(() => {
  try {
    if (localStorage.getItem(dismissKey) === '1') {
      visible.value = false
    }
  } catch {
    // ignore storage errors
  }
})

function closeBanner() {
  visible.value = false
  try {
    localStorage.setItem(dismissKey, '1')
  } catch {
    // ignore storage errors
  }
}
</script>

<template>
  <div v-if="visible" class="static-banner">
    <span class="banner-text">
      当前为只读镜像站，评论/评分请访问
      <a :href="dynamicUrl" class="banner-link" target="_blank" rel="noopener">正式版</a>
      。第一次操作需要下载数据库，可能需要比较久的时间。使用代理以获得更好的体验。
    </span>
    <button
      type="button"
      class="close-btn"
      aria-label="关闭提示"
      @click="closeBanner"
    >
      ×
    </button>
  </div>
</template>

<style scoped>
.static-banner {
  background: #fff3cd;
  color: #856404;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 16px;
  font-size: 13px;
  letter-spacing: 0.25px;
}

.banner-text {
  flex: 1;
  text-align: center;
}

.banner-link {
  color: #1a56db;
  font-weight: 500;
  text-decoration: none;
}

.banner-link:hover {
  text-decoration: underline;
}

.close-btn {
  border: none;
  background: transparent;
  color: #856404;
  font-size: 18px;
  line-height: 1;
  width: 24px;
  height: 24px;
  border-radius: 50%;
}

.close-btn:hover {
  background: rgba(133, 100, 4, 0.12);
}
</style>
