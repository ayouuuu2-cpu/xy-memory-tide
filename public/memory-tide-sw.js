/* Memory Tide — 占位 Service Worker：安装/接管，便于后续扩展 Push；生日分钟提醒由页面主线程定时触发更可靠。 */
self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
