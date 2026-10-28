// Shows a notification when the server sends one, and opens the parcel when it is tapped.
self.addEventListener("push", (event) => {
  let data = { title: "Izza", body: "Your parcel has an update.", url: "/" };
  try {
    data = { ...data, ...event.data.json() };
  } catch {
    // Not JSON: show the default message.
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      vibrate: [200, 100, 200],
      silent: false,
      tag: data.url,
      renotify: true,
      data: { url: data.url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      for (const w of windows) {
        if (w.url.includes(url) && "focus" in w) return w.focus();
      }
      return self.clients.openWindow(url);
    }),
  );
});
