/**
 * Service Worker — Prediabetes Tracker & Planner
 * Provides basic offline-first caching so the app (and its saved
 * localStorage data) remains usable without a network connection.
 * Deploy this file alongside index.html at the same directory root.
 */

"use strict";

const CACHE_NAME = "prediabetes-tracker-v1";

// Only the app shell needs to be cached — everything else (fonts,
// Tailwind CDN) is fetched normally and falls back gracefully if
// offline, since the core UI/logic still works without them.
const APP_SHELL = ["./", "./index.html"];

/* ---------------------------------------------------------------
   INSTALL — pre-cache the app shell
   --------------------------------------------------------------- */
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

/* ---------------------------------------------------------------
   ACTIVATE — clean up any old cache versions
   --------------------------------------------------------------- */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

/* ---------------------------------------------------------------
   FETCH — cache-first for same-origin app shell requests,
   network-first (with cache fallback) for everything else.
   --------------------------------------------------------------- */
self.addEventListener("fetch", (event) => {
  const request = event.request;

  // Only handle GET requests; let everything else pass through
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const isSameOrigin = url.origin === self.location.origin;

  if (isSameOrigin) {
    // Cache-first for our own app shell files
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request)
          .then((response) => {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            return response;
          })
          .catch(() => cached);
      })
    );
  } else {
    // Network-first for third-party assets (fonts, Tailwind CDN),
    // falling back to cache if offline
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request))
    );
  }
});
