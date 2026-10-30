import React from 'react';
import { createPortal } from 'react-dom';
import { useSession } from '../../context/session';
import { useGates } from '../../context/gates';
import { API_BASE, fetchSharedJson } from '../../services/client';
import { initPush, requestPushPermission } from '../../services/onesignal';
import './PushPrompt.css';

/* THIS BUILD'S — the "allow notifications" soft-ask in the site's own look, before the browser's
 * dialog, so a "Not now" here costs nothing (a browser "Block" cannot be asked again). Its copy,
 * delay and cooldown come from site admin → Push notifications → Prompt & settings
 * (GET /api/v1/admin/push/prompt). Shown only when push is on, the player is signed in and the
 * browser has not been asked yet. OneSignal's own slide prompt must be removed in its dashboard,
 * or the player sees both. */

const DISMISSED_KEY = 'push-prompt-dismissed-at';
const DAY_MS = 864e5;

const readDismissed = () => {
  try {
    return Number(localStorage.getItem(DISMISSED_KEY)) || 0;
  } catch {
    return 0;
  }
};

export default function PushPrompt() {
  const { session } = useSession();
  const { demo } = useGates();
  const [prompt, setPrompt] = React.useState(null);

  React.useEffect(() => {
    if (!session.login || demo || typeof Notification === 'undefined' || Notification.permission !== 'default') return undefined;
    let alive = true;
    let timer;
    // This effect runs before AppShell's (children first), so it must pass the base itself: initPush caches its first answer.
    Promise.all([initPush({ apiBase: API_BASE }), fetchSharedJson('/api/v1/admin/push/prompt')]).then(([on, json]) => {
      const p = json?.data;
      // shortcut: 'after_first_deposit' is not wired (the page has no first-deposit signal here), so only 'after_login' shows.
      if (!alive || !on || !p?.enabled || p.trigger !== 'after_login') return;
      if (Date.now() - readDismissed() < (p.cooldownDays || 0) * DAY_MS) return;
      timer = setTimeout(() => {
        if (Notification.permission === 'default') setPrompt(p);
      }, (p.delaySeconds || 0) * 1000);
    });
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [session.login, demo]);

  if (!prompt) return null;

  const later = () => {
    try {
      localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    } catch {
      /* private mode: it asks again next visit */
    }
    setPrompt(null);
  };
  const allow = () => {
    requestPushPermission();
    setPrompt(null);
  };

  return createPortal(
    <div
      role="dialog"
      aria-labelledby="push-prompt-title"
      className="fixed left-1/2 top-4 z-[1200] w-[calc(100%-2rem)] max-w-[24rem] -translate-x-1/2 rounded-xl border border-layer5 bg-layer4 p-4 shadow-lg"
    >
      <div className="flex gap-3">
        <div className="flex size-10 flex-none items-center justify-center rounded-lg bg-layer5">
          <div className="color_icon_img notice scale-[80%] size-[26px]" />
        </div>
        <div className="min-w-0">
          <div id="push-prompt-title" className="text-base font-extrabold text-primary">
            {prompt.title}
          </div>
          <p className="mt-1 text-sm text-secondary">{prompt.text}</p>
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" className="button button-second button-m px-4" onClick={later}>
          {prompt.laterLabel}
        </button>
        <button type="button" className="button button-brand button-m px-5" onClick={allow}>
          {prompt.allowLabel}
        </button>
      </div>
    </div>,
    document.body,
  );
}
