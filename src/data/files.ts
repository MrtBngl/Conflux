import type { Category, CategoryMeta, Language, ProjectFile } from "../types";

/* ------------------------------------------------------------------ */
/* Category metadata                                                   */
/* ------------------------------------------------------------------ */

export const CATEGORY_META: Record<Category, CategoryMeta> = {
  Checkout: {
    label: "Checkout",
    dot: "bg-violet-500",
    text: "text-violet-300",
    bg: "bg-violet-500/10",
    border: "border-violet-500/30",
    ring: "ring-violet-500/40",
    chip: "hover:bg-violet-500/10 data-[active=true]:bg-violet-500/15 data-[active=true]:border-violet-500/40 data-[active=true]:text-violet-200",
  },
  Auth: {
    label: "Auth",
    dot: "bg-emerald-500",
    text: "text-emerald-300",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    ring: "ring-emerald-500/40",
    chip: "hover:bg-emerald-500/10 data-[active=true]:bg-emerald-500/15 data-[active=true]:border-emerald-500/40 data-[active=true]:text-emerald-200",
  },
  Payment: {
    label: "Payment",
    dot: "bg-amber-500",
    text: "text-amber-300",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    ring: "ring-amber-500/40",
    chip: "hover:bg-amber-500/10 data-[active=true]:bg-amber-500/15 data-[active=true]:border-amber-500/40 data-[active=true]:text-amber-200",
  },
  Database: {
    label: "Database",
    dot: "bg-sky-500",
    text: "text-sky-300",
    bg: "bg-sky-500/10",
    border: "border-sky-500/30",
    ring: "ring-sky-500/40",
    chip: "hover:bg-sky-500/10 data-[active=true]:bg-sky-500/15 data-[active=true]:border-sky-500/40 data-[active=true]:text-sky-200",
  },
  UI: {
    label: "UI",
    dot: "bg-fuchsia-500",
    text: "text-fuchsia-300",
    bg: "bg-fuchsia-500/10",
    border: "border-fuchsia-500/30",
    ring: "ring-fuchsia-500/40",
    chip: "hover:bg-fuchsia-500/10 data-[active=true]:bg-fuchsia-500/15 data-[active=true]:border-fuchsia-500/40 data-[active=true]:text-fuchsia-200",
  },
};

export const CATEGORY_ORDER: Category[] = ["Checkout", "Auth", "Payment", "Database", "UI"];

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Strip the common leading indentation from a template literal block. */
function dedent(str: string): string {
  const lines = str.replace(/^\n/, "").replace(/\n[ \t]*$/, "").split("\n");
  const indents = lines
    .filter((l) => l.trim().length > 0)
    .map((l) => (l.match(/^[ \t]*/) as RegExpMatchArray)[0].length);
  const min = indents.length ? Math.min(...indents) : 0;
  return lines.map((l) => l.slice(min)).join("\n");
}

/** Store code verbatim: real newlines for structure, literal backslashes for regex/escapes. */
function code(raw: TemplateStringsArray, ...subs: unknown[]): string {
  return dedent(String.raw(raw, ...subs));
}

/* ------------------------------------------------------------------ */
/* Language -> file icon                                               */
/* ------------------------------------------------------------------ */

export const LANGUAGE_META: Record<
  Language,
  { label: string; cls: string }
> = {
  jsx: { label: "JSX", cls: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  js: { label: "JS", cls: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30" },
  ts: { label: "TS", cls: "bg-sky-500/15 text-sky-300 border-sky-500/30" },
  css: { label: "CSS", cls: "bg-blue-500/15 text-blue-300 border-blue-500/30" },
  html: { label: "HTML", cls: "bg-orange-500/15 text-orange-300 border-orange-500/30" },
  sql: { label: "SQL", cls: "bg-rose-500/15 text-rose-300 border-rose-500/30" },
};

/* ------------------------------------------------------------------ */
/* Inline script injected into the preview sandbox                     */
/* ------------------------------------------------------------------ */

const PREVIEW_SCRIPT = code`
  (function () {
    var form = document.getElementById('payForm');
    if (!form) return;
    var btn = document.getElementById('payButton');
    var msg = document.getElementById('payMsg');
    var num = document.getElementById('cardNumber');
    var label = btn ? btn.textContent : 'Pay';
    if (num) {
      num.addEventListener('input', function () {
        var v = num.value.replace(/\D/g, '').slice(0, 16);
        num.value = v.replace(/(.{4})/g, '$1 ').trim();
      });
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!btn || btn.disabled) return;
      btn.disabled = true;
      btn.textContent = 'Processing…';
      if (msg) { msg.hidden = false; msg.className = 'checkout-msg'; msg.textContent = 'Contacting payment gateway…'; }
      setTimeout(function () {
        if (btn) { btn.disabled = false; btn.textContent = label; }
        if (msg) { msg.className = 'checkout-msg success'; msg.textContent = 'Payment confirmed — TXN-8F3A21'; }
      }, 1400);
    });
  })();
`;

/* ------------------------------------------------------------------ */
/* Preview sandbox document                                            */
/* ------------------------------------------------------------------ */

export function buildPreviewSrcDoc(files: ProjectFile[]): string {
  // Find primary HTML file
  const htmlFile =
    files.find((f) => f.name.toLowerCase() === "index.html") ||
    files.find((f) => f.language === "html");

  let htmlContent = htmlFile ? htmlFile.content : "";
  const isDemoStorefront = files.some((f) => f.name === "Checkout.jsx");

  // If no HTML file is present, build a clean fallback container with all CSS and JS
  if (!htmlContent.trim()) {
    const allCss = files
      .filter((f) => f.language === "css")
      .map((f) => `/* ${f.name} */\n${f.content}`)
      .join("\n\n");
    const allJs = files
      .filter((f) => f.language === "js" || f.language === "html")
      .map((f) => f.content)
      .join("\n\n");
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>${allCss}</style>
</head>
<body>
  <div id="app"></div>
  <script>${allJs}</script>
</body>
</html>`;
  }

  const inlinedFiles = new Set<string>();

  // Inline <link rel="stylesheet" href="..."> tags
  htmlContent = htmlContent.replace(
    /<link\s+[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi,
    (match, href) => {
      const filename = href.split("/").pop();
      const matchedFile = files.find(
        (f) => f.name === filename || f.path === href || f.path.endsWith("/" + filename)
      );
      if (matchedFile) {
        inlinedFiles.add(matchedFile.id);
        return `<style>/* Inlined ${matchedFile.name} */\n${matchedFile.content}\n</style>`;
      }
      return match;
    }
  );

  // Inline <script src="..."></script> tags
  htmlContent = htmlContent.replace(
    /<script\s+[^>]*src=["']([^"']+)["'][^>]*\s*>\s*<\/script>/gi,
    (match, src) => {
      const filename = src.split("/").pop();
      const matchedFile = files.find(
        (f) => f.name === filename || f.path === src || f.path.endsWith("/" + filename)
      );
      if (matchedFile) {
        inlinedFiles.add(matchedFile.id);
        return `<script>/* Inlined ${matchedFile.name} */\n${matchedFile.content}\n</script>`;
      }
      return match;
    }
  );

  // Inline any remaining CSS stylesheets not explicitly linked in HTML
  const remainingCss = files
    .filter((f) => f.language === "css" && !inlinedFiles.has(f.id))
    .map((f) => `<style>/* ${f.name} */\n${f.content}\n</style>`)
    .join("\n");

  // Inline any remaining JS files not explicitly linked in HTML
  const remainingJs = files
    .filter(
      (f) =>
        f.language === "js" &&
        !inlinedFiles.has(f.id) &&
        f.name !== "api.js" &&
        f.name !== "db.js" &&
        f.name !== "queries.js"
    )
    .map((f) => `<script>/* ${f.name} */\n${f.content}\n</script>`)
    .join("\n");

  // Inject remaining CSS into <head>
  if (remainingCss) {
    if (htmlContent.includes("</head>")) {
      htmlContent = htmlContent.replace("</head>", `${remainingCss}\n</head>`);
    } else {
      htmlContent = `<head>${remainingCss}</head>\n${htmlContent}`;
    }
  }

  // Inject remaining JS before </body>
  if (remainingJs) {
    if (htmlContent.includes("</body>")) {
      htmlContent = htmlContent.replace("</body>", `${remainingJs}\n</body>`);
    } else {
      htmlContent = `${htmlContent}\n${remainingJs}`;
    }
  }

  // Inject demo storefront interactive script if this is the storefront demo
  if (isDemoStorefront) {
    const demoScript = `<script>\n${PREVIEW_SCRIPT}\n</script>`;
    if (htmlContent.includes("</body>")) {
      htmlContent = htmlContent.replace("</body>", `${demoScript}\n</body>`);
    } else {
      htmlContent = `${htmlContent}\n${demoScript}`;
    }
  }

  return htmlContent;
}


/* ------------------------------------------------------------------ */
/* Sample source files                                                 */
/* ------------------------------------------------------------------ */

const formatJs = code`
  // Shared formatting helpers
  export function formatCurrency(amount, currency = 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  }

  export function formatDate(date) {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  }
`;

const apiJs = code`
  // Central API client — owns the base URL & request contract.
  export const API_BASE = 'https://api.storefront.dev';

  export async function apiFetch(path, options = {}) {
    const res = await fetch(API_BASE + path, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options,
    });
    if (!res.ok) {
      throw new Error('API ' + res.status + ' for ' + path);
    }
    return res.json();
  }
`;

const sessionJs = code`
  const SESSION_KEY = 'storefront.session';

  export function getSession() {
    try {
      return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
    } catch {
      return null;
    }
  }

  export function setSession(user) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  }

  export function clearSession() {
    localStorage.removeItem(SESSION_KEY);
  }
`;

const authJs = code`
  import { apiFetch } from './api';

  export async function login(email, password) {
    const data = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    return data.user;
  }

  export async function logout() {
    await apiFetch('/api/auth/logout', { method: 'POST' });
  }

  export function hashPassword(password) {
    // demo-only deterministic hash
    let h = 0;
    for (let i = 0; i < password.length; i++) {
      h = (h * 31 + password.charCodeAt(i)) >>> 0;
    }
    return 'h' + h.toString(16);
  }
`;

const dbJs = code`
  // Minimal in-memory database client (sandbox).
  const tables = { users: [], carts: [], orders: [] };

  export const db = {
    tables,
    async query(sql, params = []) {
      // Sandbox stub — logs the statement and returns an empty set.
      console.log('[db]', sql, params);
      return { rows: [], rowCount: 0 };
    },
  };

  export async function connect() {
    return db;
  }
`;

const queriesJs = code`
  import { db } from './db';

  export async function getCart(userId) {
    const { rows } = await db.query('SELECT * FROM carts WHERE user_id = ?', [userId]);
    return rows[0] || null;
  }

  export async function createOrder(userId, total) {
    const { rows } = await db.query(
      'INSERT INTO orders (user_id, total) VALUES (?, ?) RETURNING *',
      [userId, total]
    );
    return rows[0] || null;
  }

  export async function getUser(email) {
    const { rows } = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    return rows[0] || null;
  }
`;

const paymentJs = code`
  import { apiFetch } from './api';
  import { getSession } from './session';

  export async function processPayment({ amount, card }) {
    const session = getSession();
    if (!session) throw new Error('Not authenticated');

    const data = await apiFetch('/api/payments/charge', {
      method: 'POST',
      body: JSON.stringify({
        amount,
        card: card.number,
        userId: session.id,
      }),
    });
    return data; // { ok, transactionId }
  }

  export function validateCard(card) {
    if (!card || !card.number) return false;
    const digits = card.number.replace(/\s/g, '');
    return digits.length === 16 && /^\d+$/.test(digits);
  }

  export function luhnCheck(number) {
    const digits = number.replace(/\s/g, '');
    let sum = 0;
    let dbl = false;
    for (let i = digits.length - 1; i >= 0; i--) {
      let d = Number(digits[i]);
      if (dbl) { d *= 2; if (d > 9) d -= 9; }
      sum += d;
      dbl = !dbl;
    }
    return sum % 10 === 0;
  }
`;

const cartJsx = code`
  import { formatCurrency } from '../lib/format';

  export default function Cart({ items = [] }) {
    const total = items.reduce((sum, i) => sum + i.price * i.qty, 0);

    return (
      <aside className="cart-summary">
        <h2>Your Cart</h2>
        <ul className="cart-items">
          {items.map((item) => (
            <li key={item.id} className="cart-item">
              <span className="cart-item-name">{item.name}</span>
              <span className="cart-item-qty">x{item.qty}</span>
              <span className="cart-item-price">{formatCurrency(item.price * item.qty)}</span>
            </li>
          ))}
        </ul>
        <div className="cart-total">
          <span>Total</span>
          <strong>{formatCurrency(total)}</strong>
        </div>
      </aside>
    );
  }
`;

const checkoutJsxOriginal = code`
  import { useState } from 'react';
  import { processPayment, validateCard } from '../lib/payment';
  import { getSession } from '../lib/session';
  import { formatCurrency } from '../lib/format';
  import Cart from './Cart';
  import '../styles/checkout.css';

  export default function Checkout({ items = [] }) {
    const [card, setCard] = useState({ number: '', name: '', expiry: '', cvc: '' });
    const [status, setStatus] = useState('idle'); // idle | processing | success | error
    const [message, setMessage] = useState('');

    const total = items.reduce((sum, i) => sum + i.price * i.qty, 0);

    async function handlePay(e) {
      e.preventDefault();
      if (!validateCard(card)) {
        setStatus('error');
        setMessage('Invalid card number');
        return;
      }
      setStatus('processing');
      try {
        const res = await processPayment({ amount: total, card });
        if (res.ok) {
          setStatus('success');
          setMessage('Payment confirmed — ' + res.transactionId);
        } else {
          throw new Error('Payment declined');
        }
      } catch (err) {
        setStatus('error');
        setMessage(err.message);
      }
    }

    return (
      <main className="checkout">
        <Cart items={items} />
        <form className="checkout-form" onSubmit={handlePay}>
          <h1>Checkout</h1>
          <label className="field">
            <span>Card number</span>
            <input
              value={card.number}
              onChange={(e) => setCard({ ...card, number: e.target.value })}
              placeholder="4242 4242 4242 4242"
            />
          </label>
          <label className="field">
            <span>Name on card</span>
            <input
              value={card.name}
              onChange={(e) => setCard({ ...card, name: e.target.value })}
            />
          </label>
          <div className="field-row">
            <label className="field">
              <span>Expiry</span>
              <input
                value={card.expiry}
                onChange={(e) => setCard({ ...card, expiry: e.target.value })}
                placeholder="12/27"
              />
            </label>
            <label className="field">
              <span>CVC</span>
              <input
                value={card.cvc}
                onChange={(e) => setCard({ ...card, cvc: e.target.value })}
                placeholder="123"
              />
            </label>
          </div>
          <button type="submit" className="pay-button" disabled={status === 'processing'}>
            {status === 'processing' ? 'Processing…' : 'Pay ' + formatCurrency(total)}
          </button>
          {message && <p className={'checkout-msg ' + status}>{message}</p>}
        </form>
      </main>
    );
  }
`;

/** The default open file is intentionally "modified" (heading tweak + comment). */
const checkoutJsxModified = code`
  import { useState } from 'react';
  import { processPayment, validateCard } from '../lib/payment';
  import { getSession } from '../lib/session';
  import { formatCurrency } from '../lib/format';
  import Cart from './Cart';
  import '../styles/checkout.css';

  // TODO: wire up 3-D Secure before launch
  export default function Checkout({ items = [] }) {
    const [card, setCard] = useState({ number: '', name: '', expiry: '', cvc: '' });
    const [status, setStatus] = useState('idle'); // idle | processing | success | error
    const [message, setMessage] = useState('');

    const total = items.reduce((sum, i) => sum + i.price * i.qty, 0);

    async function handlePay(e) {
      e.preventDefault();
      if (!validateCard(card)) {
        setStatus('error');
        setMessage('Invalid card number');
        return;
      }
      setStatus('processing');
      try {
        const res = await processPayment({ amount: total, card });
        if (res.ok) {
          setStatus('success');
          setMessage('Payment confirmed — ' + res.transactionId);
        } else {
          throw new Error('Payment declined');
        }
      } catch (err) {
        setStatus('error');
        setMessage(err.message);
      }
    }

    return (
      <main className="checkout">
        <Cart items={items} />
        <form className="checkout-form" onSubmit={handlePay}>
          <h1>Secure Checkout</h1>
          <label className="field">
            <span>Card number</span>
            <input
              value={card.number}
              onChange={(e) => setCard({ ...card, number: e.target.value })}
              placeholder="4242 4242 4242 4242"
            />
          </label>
          <label className="field">
            <span>Name on card</span>
            <input
              value={card.name}
              onChange={(e) => setCard({ ...card, name: e.target.value })}
            />
          </label>
          <div className="field-row">
            <label className="field">
              <span>Expiry</span>
              <input
                value={card.expiry}
                onChange={(e) => setCard({ ...card, expiry: e.target.value })}
                placeholder="12/27"
              />
            </label>
            <label className="field">
              <span>CVC</span>
              <input
                value={card.cvc}
                onChange={(e) => setCard({ ...card, cvc: e.target.value })}
                placeholder="123"
              />
            </label>
          </div>
          <button type="submit" className="pay-button" disabled={status === 'processing'}>
            {status === 'processing' ? 'Processing…' : 'Pay ' + formatCurrency(total)}
          </button>
          {message && <p className={'checkout-msg ' + status}>{message}</p>}
        </form>
      </main>
    );
  }
`;

const globalsCss = code`
  :root {
    --bg: #0f172a;
    --panel: #1e293b;
    --text: #e2e8f0;
    --muted: #94a3b8;
    --accent: #8b5cf6;
    --accent-2: #10b981;
    --danger: #f43f5e;
    --radius: 10px;
  }

  * { box-sizing: border-box; }

  body {
    margin: 0;
    font-family: 'Inter', system-ui, sans-serif;
    background: radial-gradient(1200px 600px at 80% -10%, #1e1b4b 0%, var(--bg) 55%);
    color: var(--text);
    min-height: 100vh;
  }

  .storefront { min-height: 100vh; }

  .store-nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    max-width: 960px;
    margin: 0 auto;
    padding: 20px 24px;
  }

  .brand { font-weight: 700; font-size: 15px; letter-spacing: 0.02em; }

  .nav-links { display: flex; gap: 18px; font-size: 13px; color: var(--muted); }
  .nav-links span { cursor: pointer; transition: color 0.15s ease; }
  .nav-links span:hover { color: var(--text); }
`;

const checkoutCss = code`
  .checkout {
    display: grid;
    grid-template-columns: 1fr 1.4fr;
    gap: 24px;
    max-width: 960px;
    margin: 48px auto;
    padding: 0 24px;
  }

  .checkout-form {
    background: var(--panel);
    border: 1px solid #334155;
    border-radius: var(--radius);
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .checkout-form h1 {
    margin: 0 0 8px;
    font-size: 22px;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 13px;
    color: var(--muted);
  }

  .field input {
    background: #0b1220;
    border: 1px solid #334155;
    color: var(--text);
    padding: 10px 12px;
    border-radius: 8px;
    font-size: 14px;
    outline: none;
  }

  .field input:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.25);
  }

  .field-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .pay-button {
    margin-top: 8px;
    background: linear-gradient(135deg, #10b981, #059669);
    color: #04110c;
    font-weight: 700;
    border: none;
    padding: 13px 16px;
    border-radius: 9px;
    font-size: 15px;
    cursor: pointer;
    transition: transform 0.08s ease, box-shadow 0.2s ease;
    box-shadow: 0 8px 24px rgba(16, 185, 129, 0.35);
  }

  .pay-button:hover { transform: translateY(-1px); }
  .pay-button:disabled { opacity: 0.6; cursor: not-allowed; }

  .cart-summary {
    background: var(--panel);
    border: 1px solid #334155;
    border-radius: var(--radius);
    padding: 20px;
    height: fit-content;
  }

  .cart-summary h2 { margin: 0 0 12px; font-size: 16px; }

  .cart-items { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }

  .cart-item {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    font-size: 13px;
    padding-bottom: 10px;
    border-bottom: 1px dashed #334155;
  }

  .cart-item-name { color: var(--text); }
  .cart-item-qty { color: var(--muted); }
  .cart-item-price { color: var(--accent-2); font-weight: 600; }

  .cart-total {
    display: flex;
    justify-content: space-between;
    margin-top: 14px;
    font-size: 15px;
  }

  .checkout-msg { margin: 4px 0 0; font-size: 13px; padding: 10px 12px; border-radius: 8px; }
  .checkout-msg.success { background: rgba(16,185,129,0.12); color: #6ee7b7; border: 1px solid rgba(16,185,129,0.4); }
  .checkout-msg.error { background: rgba(244,63,94,0.12); color: #fda4af; border: 1px solid rgba(244,63,94,0.4); }
`;

const indexHtml = code`
  <div class="storefront">
    <header class="store-nav">
      <div class="brand">◆ Storefront</div>
      <nav class="nav-links">
        <span>Shop</span><span>Cart</span><span>Account</span>
      </nav>
    </header>

    <main class="checkout">
      <aside class="cart-summary">
        <h2>Your Cart</h2>
        <ul class="cart-items">
          <li class="cart-item">
            <span class="cart-item-name">Aurora Lamp</span>
            <span class="cart-item-qty">x1</span>
            <span class="cart-item-price">$129.00</span>
          </li>
          <li class="cart-item">
            <span class="cart-item-name">Nimbus Keyboard</span>
            <span class="cart-item-qty">x2</span>
            <span class="cart-item-price">$198.00</span>
          </li>
        </ul>
        <div class="cart-total">
          <span>Total</span>
          <strong>$327.00</strong>
        </div>
      </aside>

      <form class="checkout-form" id="payForm">
        <h1>Secure Checkout</h1>
        <label class="field">
          <span>Card number</span>
          <input id="cardNumber" inputmode="numeric" placeholder="4242 4242 4242 4242" />
        </label>
        <label class="field">
          <span>Name on card</span>
          <input id="cardName" placeholder="Ada Lovelace" />
        </label>
        <div class="field-row">
          <label class="field">
            <span>Expiry</span>
            <input id="cardExpiry" placeholder="12/27" />
          </label>
          <label class="field">
            <span>CVC</span>
            <input id="cardCvc" placeholder="123" />
          </label>
        </div>
        <button type="submit" class="pay-button" id="payButton">Pay $327.00</button>
        <p class="checkout-msg" id="payMsg" hidden></p>
      </form>
    </main>
  </div>
`;

const schemaSql = code`
  -- Storefront schema
  CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
  );

  CREATE TABLE carts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT now()
  );

  CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    total NUMERIC(10, 2) NOT NULL,
    status VARCHAR(32) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT now()
  );
`;

/* ------------------------------------------------------------------ */
/* File registry                                                       */
/* ------------------------------------------------------------------ */

function file(
  path: string,
  language: Language,
  category: Category,
  content: string,
  original?: string
): ProjectFile {
  return {
    id: path,
    name: path.split("/").pop() as string,
    path,
    language,
    category,
    content,
    originalContent: original ?? content,
  };
}

export const PROJECT_FILES: ProjectFile[] = [
  file("src/components/Checkout.jsx", "jsx", "Checkout", checkoutJsxModified, checkoutJsxOriginal),
  file("src/components/Cart.jsx", "jsx", "UI", cartJsx),
  file("src/lib/format.js", "js", "Checkout", formatJs),
  file("src/styles/checkout.css", "css", "UI", checkoutCss),
  file("src/styles/globals.css", "css", "UI", globalsCss),
  file("src/index.html", "html", "UI", indexHtml),
  file("src/lib/payment.js", "js", "Payment", paymentJs),
  file("src/lib/api.js", "js", "Payment", apiJs),
  file("src/lib/auth.js", "js", "Auth", authJs),
  file("src/lib/session.js", "js", "Auth", sessionJs),
  file("src/lib/db.js", "js", "Database", dbJs),
  file("src/lib/queries.js", "js", "Database", queriesJs),
  file("src/data/schema.sql", "sql", "Database", schemaSql),
];

export const DEFAULT_ACTIVE_PATH = "src/components/Checkout.jsx";

export const PROJECT_NAME = "storefront-app";
