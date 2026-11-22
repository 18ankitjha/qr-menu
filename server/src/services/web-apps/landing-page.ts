// ============================================================
// Landing page at "/" in production — tells each role where to sign in.
// (Locally the dev gateway serves its own version with dev notes.)
// ============================================================

export const LANDING_PAGE_HTML = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>QR Menu</title>
<style>
*{box-sizing:border-box}
body{margin:0;font-family:system-ui,-apple-system,sans-serif;background:#f5f3ff;color:#111}
main{max-width:720px;margin:0 auto;padding:48px 20px}
h1{margin:0 0 6px;font-size:30px}
p.sub{margin:0 0 28px;color:#555}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px}
a.card{display:block;background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:18px;text-decoration:none;color:inherit;box-shadow:0 1px 2px rgba(0,0,0,.04)}
a.card:hover{border-color:#7c3aed}
a.card strong{display:block;font-size:17px;margin-bottom:4px;color:#6d28d9}
a.card span{font-size:14px;color:#555}
.note{margin-top:28px;font-size:14px;color:#555;background:#fff;border-radius:12px;padding:14px 16px;border:1px solid #e5e7eb}
</style></head>
<body><main>
<h1>QR Menu</h1>
<p class="sub">Scan-to-order for restaurants.</p>
<div class="grid">
<a class="card" href="/admin/login"><strong>Restaurant owner</strong><span>Sign in with Google</span></a>
<a class="card" href="/admin/login"><strong>Waiter</strong><span>Choose "Waiter login": restaurant code, username and PIN</span></a>
<a class="card" href="/super-admin/"><strong>Super admin</strong><span>Platform administration</span></a>
</div>
<p class="note">Customers: scan the QR code on your table to open the menu.</p>
</main></body></html>`;
