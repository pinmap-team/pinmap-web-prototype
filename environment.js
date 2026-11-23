// The published app has only the authenticated account mode.
const PM_ENV = (() => {
  const requiresAuth = true;
  const development = true;
  const cloudPlaceTest = false;
  const placeholderImage = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="240"><rect width="400" height="240" fill="#F4F4F4"/><text x="200" y="125" text-anchor="middle" font-family="sans-serif" font-size="18" fill="#6C6C6C">사진 없음</text></svg>');
  return Object.freeze({development, requiresAuth, cloudPlaceTest, storageKey:'pinmap.dev.v1', placeholderImage});
})();
