import webpush from "web-push";

let initialized = false;

function ensureVapid() {
  if (initialized) return;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const prv = process.env.VAPID_PRIVATE_KEY;
  if (pub && prv) {
    webpush.setVapidDetails("mailto:admin@pillpal.app", pub, prv);
  }
  initialized = true;
}

export async function sendPush(
  subscription: webpush.PushSubscription,
  payload: { title: string; body: string; url: string }
) {
  ensureVapid();
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return "sent";
  } catch (err: unknown) {
    const e = err as { statusCode?: number };
    if (e.statusCode === 410 || e.statusCode === 404) {
      return "expired";
    }
    console.error("Push notification error:", err);
    return "failed";
  }
}
