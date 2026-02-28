<script setup lang="ts">
const dynamicUrl = import.meta.env.VITE_DYNAMIC_SITE_URL || '#'
</script>

<template>
  <div class="static-banner">
    <span class="banner-text">
      当前为只读镜像站，评论/评分请访问
      <a :href="dynamicUrl" class="banner-link" target="_blank" rel="noopener">正式版</a>
    </span>
  </div>
</template>

<style scoped>
.static-banner {
  background: #fff3cd;
  color: #856404;
  text-align: center;
  padding: 8px 16px;
  font-size: 13px;
  letter-spacing: 0.25px;
}

.banner-link {
  color: #1a56db;
  font-weight: 500;
  text-decoration: none;
}

.banner-link:hover {
  text-decoration: underline;
}
</style>
