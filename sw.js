/* Daily Briefing — service worker
   GitHub Pages 의 /daily-briefing/ 경로를 기준으로 캐시한다.
   네트워크 우선 + 캐시 폴백: 데이터(암호문 JSON)는 항상 최신을 먼저 시도하고,
   오프라인일 때만 마지막으로 받은 암호문을 그대로 돌려준다(복호화는 화면에서).
   캐시에는 암호문만 들어가고 평문은 저장하지 않는다. */

const VERSION = "briefing-v4-pin";
const BASE = new URL("./", self.location).pathname; // "/daily-briefing/"
const SHELL = [
  BASE,
  BASE + "index.html",
  BASE + "manifest.webmanifest",
  BASE + "icons/icon-180.png",
  BASE + "icons/icon-192.png",
  BASE + "icons/icon-512.png",
  BASE + "icons/maskable-512.png",
  BASE + "data/index.json"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(VERSION)
      .then((c) => Promise.allSettled(SHELL.map((u) => c.add(u))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.indexOf(BASE) !== 0) return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.status === 200 && res.type === "basic") {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() =>
        caches.match(req, { ignoreSearch: true }).then((hit) => {
          if (hit) return hit;
          if (req.mode === "navigate") return caches.match(BASE + "index.html");
          return new Response("offline", { status: 503, statusText: "offline" });
        })
      )
  );
});
