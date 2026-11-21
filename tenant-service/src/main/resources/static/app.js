'use strict';

// ── Backend service base URLs ─────────────────────────────────────────────────
const API = {
    tenant:    'http://localhost:8081',
    rent:      'http://localhost:8082',
    complaint: 'http://localhost:8083'
};

const root = document.getElementById('app');
let session = JSON.parse(sessionStorage.getItem('session') || 'null');

/* ══════════════════════════════════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════════════════════════════════ */

function esc(value) {
    return String(value === null || value === undefined ? '' : value)
        .replace(/[&<>"']/g, function (c) {
            return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
        });
}

function money(value) { return '₹' + Number(value).toFixed(2); }

function dateTime(value) {
    return value ? esc(new Date(value).toLocaleString('en-IN', {
        dateStyle: 'medium', timeStyle: 'short'
    })) : '—';
}

function dateOnly(value) {
    return value ? esc(new Date(value + 'T00:00:00').toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric'
    })) : '—';
}

function badge(text) {
    return '<span class="badge ' + esc(text) + '">' + esc(String(text).replace(/_/g, ' ')) + '</span>';
}

function toast(text, isError) {
    const el = document.getElementById('toast');
    el.innerHTML = '<span class="toast-icon">' + (isError ? '✕' : '✓') + '</span>' + esc(text);
    el.className = 'toast ' + (isError ? 'error' : 'ok');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(function () { el.className = 'toast hidden'; }, 5500);
}

function currentMonth() {
    const now = new Date();
    return now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
}

function safe(fn) {
    return async function (event) {
        if (event && event.preventDefault) event.preventDefault();
        try { await fn(event); }
        catch (err) { toast(err.message, true); }
    };
}

// Render a table or an empty-state block
function tableOrEmpty(headers, rows, emptyText, emptyIcon) {
    if (rows.length === 0) {
        return '<div class="empty-state"><div class="empty-icon">' + (emptyIcon || '📭') + '</div>' +
               '<p>' + esc(emptyText) + '</p></div>';
    }
    return '<div class="table-wrap"><table>' +
        '<thead><tr>' + headers.map(function (h) { return '<th>' + esc(h) + '</th>'; }).join('') + '</tr></thead>' +
        '<tbody>' + rows.join('') + '</tbody>' +
        '</table></div>';
}

function avatarLetter(name) {
    return name ? esc(name.trim()[0].toUpperCase()) : '?';
}

/* ══════════════════════════════════════════════════════════════════════════════
   API LAYER  (unchanged from original – same endpoints, same auth)
══════════════════════════════════════════════════════════════════════════════ */

async function api(service, path, method, body) {
    const headers = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (session) headers['Authorization'] = 'Bearer ' + session.token;
    let res;
    try {
        res = await fetch(API[service] + path, {
            method: method || 'GET',
            headers: headers,
            body: body !== undefined ? JSON.stringify(body) : undefined
        });
    } catch (e) {
        throw new Error('Cannot reach ' + service + '-service. Is it running?');
    }
    let data = null;
    const text = await res.text();
    if (text) { try { data = JSON.parse(text); } catch (e) { data = null; } }
    if (res.status === 401 && session) { logout(); throw new Error('Session expired. Please log in again.'); }
    if (!res.ok) throw new Error((data && data.message) || ('Request failed (' + res.status + ')'));
    return data;
}

function logout() {
    sessionStorage.removeItem('session');
    session = null;
    render();
}

/* ══════════════════════════════════════════════════════════════════════════════
   LOGIN PAGE
══════════════════════════════════════════════════════════════════════════════ */

function renderLogin() {
    root.innerHTML =
        '<div class="login-page">' +
        '<div class="login-box">' +

        '<div class="login-logo">' +
        '<div class="icon-circle" aria-hidden="true">N</div>' +
        '<h2>Nestwell</h2>' +
        '<p>Your property, beautifully in sync</p>' +
        '</div>' +

        '<form id="login-form">' +
        '<div class="form-group">' +
        '<label class="form-label" for="li-user">Username</label>' +
        '<input id="li-user" class="form-control" name="username" required autocomplete="username" placeholder="Enter your username">' +
        '</div>' +
        '<div class="form-group">' +
        '<label class="form-label" for="li-pass">Password</label>' +
        '<input id="li-pass" class="form-control" name="password" type="password" required autocomplete="current-password" placeholder="••••••••">' +
        '</div>' +
        '<button class="btn btn-primary" type="submit" style="width:100%;margin-top:4px">Sign in →</button>' +
        '</form>' +

        '<div class="login-divider">or</div>' +

        '<details>' +
        '<summary style="cursor:pointer;font-size:13px;color:var(--brand);">First time? Create the owner account</summary>' +
        '<form id="owner-form" style="margin-top:14px">' +
        '<div class="form-group"><label class="form-label">Username</label>' +
        '<input class="form-control" name="username" required placeholder="Owner username"></div>' +
        '<div class="form-group"><label class="form-label">Password <span class="muted">(min 6 chars)</span></label>' +
        '<input class="form-control" name="password" type="password" minlength="6" required placeholder="••••••••"></div>' +
        '<div class="form-group"><label class="form-label">Owner signup code</label>' +
        '<input class="form-control" name="signupCode" required placeholder="Secret code"></div>' +
        '<button class="btn btn-secondary" type="submit" style="width:100%">Create owner account</button>' +
        '</form>' +
        '</details>' +

        '<div class="login-hint">Tenants: ask your PG owner for your login credentials.</div>' +
        '</div>' +
        '</div>';

    document.getElementById('login-form').addEventListener('submit', safe(async function (e) {
        const f = new FormData(e.target);
        const btn = e.target.querySelector('button');
        btn.textContent = 'Signing in…';
        const result = await api('tenant', '/api/auth/login', 'POST',
            {username: f.get('username'), password: f.get('password')});
        session = result;
        sessionStorage.setItem('session', JSON.stringify(result));
        render();
    }));

    document.getElementById('owner-form').addEventListener('submit', safe(async function (e) {
        const f = new FormData(e.target);
        const result = await api('tenant', '/api/auth/register-owner', 'POST',
            {username: f.get('username'), password: f.get('password'), signupCode: f.get('signupCode')});
        toast(result.message, false);
        e.target.reset();
    }));
}

/* ══════════════════════════════════════════════════════════════════════════════
   SHELL WITH SIDEBAR
══════════════════════════════════════════════════════════════════════════════ */

const NAV_ICONS = {
    rooms:      '⌂',
    tenants:    '♙',
    rent:       '₹',
    complaints: '✳',
    myrent:     '₹',
    mycomplaints:'✳'
};

function renderShell(tabs) {
    const keys = Object.keys(tabs);

    // Build nav items
    const navItems = keys.map(function (k) {
        const icon = NAV_ICONS[k] || '📄';
        return '<button class="nav-item" data-tab="' + esc(k) + '" aria-label="' + esc(tabs[k].label) + '" aria-current="false">' +
               '<span class="nav-icon" aria-hidden="true">' + icon + '</span>' +
               '<span>' + esc(tabs[k].label) + '</span>' +
               '<span class="nav-arrow" aria-hidden="true">↗</span>' +
               '</button>';
    }).join('');

    const initials = avatarLetter(session.username);
    const roleLower = (session.role || '').toLowerCase();

    root.innerHTML =
        '<div class="shell">' +

        // ── Sidebar ──────────────────────────────────────────────────────────
        '<aside class="sidebar" id="sidebar">' +
        '<div class="sidebar-logo">' +
        '<div class="logo-lockup"><div class="logo-icon" aria-hidden="true">N</div>' +
        '<div><h1>Nestwell</h1><p>PROPERTY MANAGEMENT</p></div></div>' +
        '<div class="workspace-label"><span class="workspace-dot"></span>' + esc(session.role === 'OWNER' ? 'Owner workspace' : 'Resident portal') + '</div>' +
        '</div>' +
        '<nav class="sidebar-nav" id="sidebar-nav" aria-label="Main navigation">' +
        '<div class="nav-caption">WORKSPACE</div>' + navItems + '</nav>' +
        '<div class="sidebar-footer">' +
        '<div class="user-info">' +
        '<div class="user-avatar">' + initials + '</div>' +
        '<div class="user-copy"><div class="user-name">' + esc(session.username) + '</div>' +
        '<div class="user-role">' + esc(roleLower) + '</div></div>' +
        '<button class="btn-logout" id="logout-btn" aria-label="Sign out" title="Sign out">↗</button>' +
        '</div>' +
        '</aside>' +

        // ── Main ─────────────────────────────────────────────────────────────
        '<div class="main">' +
        '<header class="topbar">' +
        '<div class="topbar-leading">' +
        '<button class="hamburger" id="hamburger" aria-label="Toggle menu" aria-expanded="false">' +
        '<span></span><span></span><span></span>' +
        '</button>' +
        '<div class="topbar-eyebrow">PROPERTY OVERVIEW</div>' +
        '<div id="topbar-title"><div class="topbar-title">' + esc(tabs[keys[0]].label) + '</div></div>' +
        '</div>' +
        '<div class="topbar-meta"><span class="live-indicator"><span></span> All systems normal</span>' +
        '<div class="topbar-divider"></div><div class="topbar-profile"><div class="topbar-avatar">' + initials + '</div>' +
        '<div><strong>' + esc(session.username) + '</strong><span>' + esc(roleLower) + '</span></div></div></div>' +
        '</header>' +
        '<div class="page-content" id="tab"></div>' +
        '</div>' +

        '</div>'; // .shell

    // hamburger toggle for mobile
    document.getElementById('hamburger').addEventListener('click', function (event) {
        const isOpen = document.getElementById('sidebar').classList.toggle('open');
        event.currentTarget.setAttribute('aria-expanded', String(isOpen));
    });

    document.getElementById('logout-btn').addEventListener('click', logout);

    async function openTab(key) {
        // Update nav active state
        document.querySelectorAll('.nav-item').forEach(function (b) {
            const isActive = b.getAttribute('data-tab') === key;
            b.className = 'nav-item' + (isActive ? ' active' : '');
            b.setAttribute('aria-current', isActive ? 'page' : 'false');
        });
        // Update topbar title
        document.getElementById('topbar-title').innerHTML =
            '<div class="topbar-title">' + esc(tabs[key].label) + '</div>';

        const el = document.getElementById('tab');
        el.innerHTML = '<div class="loading-state"><span class="spinner"></span> Loading…</div>';

        // Close sidebar on mobile after tap
        document.getElementById('sidebar').classList.remove('open');

        try { await tabs[key].render(el); }
        catch (err) {
            el.innerHTML = '<div class="empty-state"><div class="empty-icon">⚠️</div><p>' + esc(err.message) + '</p></div>';
        }
    }

    document.querySelectorAll('.nav-item').forEach(function (b) {
        b.addEventListener('click', function () { openTab(b.getAttribute('data-tab')); });
    });
    openTab(keys[0]);
}

/* ══════════════════════════════════════════════════════════════════════════════
   OWNER — ROOMS
══════════════════════════════════════════════════════════════════════════════ */

async function ownerRooms(el) {
    const rooms = await api('tenant', '/api/rooms');

    // Stats
    const totalRooms    = rooms.length;
    const totalCapacity = rooms.reduce(function (s, r) { return s + r.capacity; }, 0);
    const totalOccupied = rooms.reduce(function (s, r) { return s + r.occupied; }, 0);
    const vacancy       = totalCapacity - totalOccupied;

    el.innerHTML =
        // ── Stats row ────────────────────────────────────────────────────────
        '<div class="section-header">' +
        '<div><div class="section-title">Rooms</div>' +
        '<div class="section-desc">Manage all rooms and their occupancy</div></div>' +
        '</div>' +

        '<div class="stats-row">' +
        '<div class="stat-card"><div class="stat-icon purple">🏘️</div><div>' +
        '<div class="stat-label">Total rooms</div><div class="stat-value">' + totalRooms + '</div></div></div>' +

        '<div class="stat-card"><div class="stat-icon green">✅</div><div>' +
        '<div class="stat-label">Occupied beds</div><div class="stat-value">' + totalOccupied + '</div>' +
        '<div class="stat-sub">of ' + totalCapacity + ' total</div></div></div>' +

        '<div class="stat-card"><div class="stat-icon blue">🛏️</div><div>' +
        '<div class="stat-label">Vacant beds</div><div class="stat-value">' + vacancy + '</div></div></div>' +
        '</div>' +

        // ── Add room form ────────────────────────────────────────────────────
        '<div class="card">' +
        '<div class="card-title"><span class="card-icon">➕</span> Add a new room</div>' +
        '<form id="room-form" class="form-row">' +
        '<div class="form-group"><label class="form-label">Room number</label>' +
        '<input class="form-control" name="roomNumber" required placeholder="e.g. 101"></div>' +
        '<div class="form-group"><label class="form-label">Floor</label>' +
        '<input class="form-control" name="floor" type="number" min="0" value="0" required style="width:90px"></div>' +
        '<div class="form-group"><label class="form-label">Monthly rent (₹)</label>' +
        '<input class="form-control" name="monthlyRent" type="number" min="1" step="0.01" required placeholder="5000"></div>' +
        '<div class="form-group"><label class="form-label">Capacity (beds)</label>' +
        '<input class="form-control" name="capacity" type="number" min="1" value="1" required style="width:90px"></div>' +
        '<div class="form-group" style="align-self:flex-end">' +
        '<button class="btn btn-primary" type="submit">Add room</button></div>' +
        '</form></div>' +

        // ── Table ────────────────────────────────────────────────────────────
        tableOrEmpty(
            ['Room', 'Floor', 'Monthly rent', 'Capacity', 'Occupied', 'Vacancy'],
            rooms.map(function (r) {
                const pct = r.capacity > 0 ? Math.round((r.occupied / r.capacity) * 100) : 0;
                const full = r.occupied >= r.capacity;
                return '<tr>' +
                    '<td><strong>' + esc(r.roomNumber) + '</strong></td>' +
                    '<td>' + esc(r.floor) + '</td>' +
                    '<td><strong>' + money(r.monthlyRent) + '</strong></td>' +
                    '<td>' + esc(r.capacity) + '</td>' +
                    '<td>' + esc(r.occupied) + ' / ' + esc(r.capacity) +
                    ' <span style="font-size:11px;color:var(--gray-400)">(' + pct + '%)</span></td>' +
                    '<td><span class="badge ' + (full ? 'CLOSED' : 'ACTIVE') + '">' + (full ? 'Full' : vacancy + ' free') + '</span></td>' +
                    '</tr>';
            }),
            'No rooms yet. Add your first room above.', '🏠'
        );

    document.getElementById('room-form').addEventListener('submit', safe(async function (e) {
        const f = new FormData(e.target);
        await api('tenant', '/api/rooms', 'POST', {
            roomNumber:  f.get('roomNumber').trim(),
            floor:       Number(f.get('floor')),
            monthlyRent: Number(f.get('monthlyRent')),
            capacity:    Number(f.get('capacity'))
        });
        toast('Room added successfully!', false);
        await ownerRooms(el);
    }));
}

/* ══════════════════════════════════════════════════════════════════════════════
   OWNER — TENANTS
══════════════════════════════════════════════════════════════════════════════ */

async function ownerTenants(el) {
    const [tenants, rooms] = await Promise.all([
        api('tenant', '/api/tenants'),
        api('tenant', '/api/rooms')
    ]);

    const active      = tenants.filter(function (t) { return t.status === 'ACTIVE'; }).length;
    const checkedOut  = tenants.filter(function (t) { return t.status === 'CHECKED_OUT'; }).length;

    el.innerHTML =
        '<div class="section-header">' +
        '<div><div class="section-title">Tenants</div>' +
        '<div class="section-desc">Manage tenant records and logins</div></div>' +
        '</div>' +

        '<div class="stats-row">' +
        '<div class="stat-card"><div class="stat-icon green">👥</div><div>' +
        '<div class="stat-label">Active tenants</div><div class="stat-value">' + active + '</div></div></div>' +
        '<div class="stat-card"><div class="stat-icon amber">🚪</div><div>' +
        '<div class="stat-label">Checked out</div><div class="stat-value">' + checkedOut + '</div></div></div>' +
        '<div class="stat-card"><div class="stat-icon purple">📋</div><div>' +
        '<div class="stat-label">Total records</div><div class="stat-value">' + tenants.length + '</div></div></div>' +
        '</div>' +

        '<div class="card">' +
        '<div class="card-title"><span class="card-icon">➕</span> Add a tenant <span class="muted" style="font-weight:400;font-size:12px">(also creates their login)</span></div>' +
        '<form id="tenant-form" class="form-row">' +
        '<div class="form-group"><label class="form-label">Full name</label>' +
        '<input class="form-control" name="name" required placeholder="Tenant name"></div>' +
        '<div class="form-group"><label class="form-label">Phone</label>' +
        '<input class="form-control" name="phone" required placeholder="+91 00000 00000"></div>' +
        '<div class="form-group"><label class="form-label">Room</label>' +
        '<select class="form-control" name="roomId" required>' +
        '<option value="">Choose a room…</option>' +
        rooms.map(function (r) {
            const full = r.occupied >= r.capacity;
            return '<option value="' + esc(r.id) + '"' + (full ? ' disabled' : '') + '>' +
                esc(r.roomNumber) + ' — ' + money(r.monthlyRent) + '/mo (' + esc(r.occupied) + '/' + esc(r.capacity) + ')' +
                (full ? ' [full]' : '') + '</option>';
        }).join('') +
        '</select></div>' +
        '<div class="form-group"><label class="form-label">Move-in date</label>' +
        '<input class="form-control" name="moveInDate" type="date"></div>' +
        '<div class="form-group"><label class="form-label">Login username</label>' +
        '<input class="form-control" name="username" required placeholder="tenant_username"></div>' +
        '<div class="form-group"><label class="form-label">Login password</label>' +
        '<input class="form-control" name="password" type="password" minlength="6" required placeholder="Min 6 chars"></div>' +
        '<div class="form-group" style="align-self:flex-end">' +
        '<button class="btn btn-primary" type="submit">Add tenant</button></div>' +
        '</form></div>' +

        tableOrEmpty(
            ['Tenant', 'Phone', 'Room', 'Move-in', 'Move-out', 'Status', 'Actions'],
            tenants.map(function (t) {
                return '<tr>' +
                    '<td><div style="display:flex;align-items:center;gap:8px">' +
                    '<div class="user-avatar" style="width:30px;height:30px;font-size:12px;background:var(--brand-bg);color:var(--brand-dark)">' +
                    avatarLetter(t.name) + '</div>' +
                    '<strong>' + esc(t.name) + '</strong></div></td>' +
                    '<td>' + esc(t.phone) + '</td>' +
                    '<td><span class="badge ACTIVE" style="background:#ede9fe;color:#4c1d95">Room ' + esc(t.roomNumber) + '</span></td>' +
                    '<td>' + dateOnly(t.moveInDate) + '</td>' +
                    '<td>' + (t.moveOutDate ? dateOnly(t.moveOutDate) : '<span class="muted">—</span>') + '</td>' +
                    '<td>' + badge(t.status) + '</td>' +
                    '<td>' + (t.status === 'ACTIVE'
                        ? '<button class="btn btn-sm btn-danger" data-checkout="' + esc(t.id) + '" data-name="' + esc(t.name) + '">🚪 Check out</button>'
                        : '<span class="muted">—</span>') + '</td>' +
                    '</tr>';
            }),
            'No tenants yet.', '👥'
        );

    document.getElementById('tenant-form').addEventListener('submit', safe(async function (e) {
        const f = new FormData(e.target);
        await api('tenant', '/api/tenants', 'POST', {
            name:       f.get('name').trim(),
            phone:      f.get('phone').trim(),
            roomId:     Number(f.get('roomId')),
            moveInDate: f.get('moveInDate') || null,
            username:   f.get('username').trim(),
            password:   f.get('password')
        });
        toast('Tenant added!', false);
        await ownerTenants(el);
    }));

    el.querySelectorAll('[data-checkout]').forEach(function (btn) {
        btn.addEventListener('click', safe(async function () {
            const name = btn.getAttribute('data-name');
            if (!confirm('Check out ' + name + '? Their login will be disabled, rent charges will be flagged and open complaints closed.')) return;
            await api('tenant', '/api/tenants/' + btn.getAttribute('data-checkout') + '/checkout', 'PUT');
            toast(name + ' checked out. Rent and complaint services will update shortly.', false);
            await ownerTenants(el);
        }));
    });
}

/* ══════════════════════════════════════════════════════════════════════════════
   OWNER — RENT
══════════════════════════════════════════════════════════════════════════════ */

async function ownerRent(el) {
    el.innerHTML =
        '<div class="section-header">' +
        '<div><div class="section-title">Rent Management</div>' +
        '<div class="section-desc">View and collect rent charges from tenants</div></div>' +
        '</div>' +

        '<div class="filters-bar">' +
        '<div class="form-group"><label class="form-label">Month</label>' +
        '<input class="form-control" type="month" id="rent-month" value="' + currentMonth() + '"></div>' +
        '<div class="form-group"><label class="form-label">Status</label>' +
        '<select class="form-control" id="rent-status" style="min-width:130px">' +
        '<option value="">All statuses</option>' +
        '<option value="UNPAID">UNPAID</option>' +
        '<option value="PARTIAL">PARTIAL</option>' +
        '<option value="PAID">PAID</option>' +
        '</select></div>' +
        '<div class="form-group" style="align-self:flex-end">' +
        '<button class="btn btn-secondary" id="rent-load">🔍 Show</button></div>' +
        '<div class="form-group" style="align-self:flex-end">' +
        '<button class="btn btn-primary" id="rent-generate">⚡ Generate rent for all active tenants</button></div>' +
        '</div>' +

        '<div id="rent-table"></div>' +
        '<div id="pay-panel"></div>';

    let charges = [];

    async function load() {
        const month  = document.getElementById('rent-month').value;
        const status = document.getElementById('rent-status').value;
        const params = new URLSearchParams();
        if (month)  params.set('month', month);
        if (status) params.set('status', status);
        charges = await api('rent', '/api/rent/charges?' + params.toString());

        // Summary mini-stats
        const totalAmt = charges.reduce(function (s, c) { return s + Number(c.amount); }, 0);
        const totalPaid= charges.reduce(function (s, c) { return s + Number(c.amountPaid); }, 0);
        const totalDue = charges.reduce(function (s, c) { return s + Number(c.outstanding); }, 0);
        const overdueN = charges.filter(function (c) { return c.overdue; }).length;

        const statsHtml = charges.length === 0 ? '' :
            '<div class="stats-row" style="margin-bottom:16px">' +
            '<div class="stat-card"><div class="stat-icon purple">📄</div><div>' +
            '<div class="stat-label">Charges</div><div class="stat-value">' + charges.length + '</div></div></div>' +
            '<div class="stat-card"><div class="stat-icon green">✅</div><div>' +
            '<div class="stat-label">Collected</div><div class="stat-value">' + money(totalPaid) + '</div></div></div>' +
            '<div class="stat-card"><div class="stat-icon red">⏳</div><div>' +
            '<div class="stat-label">Outstanding</div><div class="stat-value">' + money(totalDue) + '</div></div></div>' +
            '<div class="stat-card"><div class="stat-icon amber">⚠️</div><div>' +
            '<div class="stat-label">Overdue</div><div class="stat-value">' + overdueN + '</div></div></div>' +
            '</div>';

        document.getElementById('rent-table').innerHTML = statsHtml +
            tableOrEmpty(
                ['Room', 'Tenant', 'Month', 'Amount', 'Paid', 'Outstanding', 'Due date', 'Status', 'Actions'],
                charges.map(function (c) {
                    return '<tr>' +
                        '<td><strong>' + esc(c.roomNumber) + '</strong></td>' +
                        '<td>' + esc(c.tenantName) +
                        (c.tenantCheckedOut ? ' <span class="muted">(checked out)</span>' : '') + '</td>' +
                        '<td>' + esc(c.month) + '</td>' +
                        '<td>' + money(c.amount) + '</td>' +
                        '<td class="text-success">' + money(c.amountPaid) + '</td>' +
                        '<td class="text-danger">' + money(c.outstanding) + '</td>' +
                        '<td>' + esc(c.dueDate) + '</td>' +
                        '<td>' + badge(c.status) +
                        (c.overdue ? ' <span class="badge overdue">OVERDUE</span>' : '') + '</td>' +
                        '<td style="display:flex;gap:6px;flex-wrap:wrap">' +
                        (c.status !== 'PAID'
                            ? '<button class="btn btn-sm btn-primary" data-pay="' + esc(c.id) + '">💵 Pay</button> '
                            : '') +
                        '<button class="btn btn-sm btn-secondary" data-hist="' + esc(c.id) + '">📜 History</button>' +
                        '</td>' +
                        '</tr>';
                }),
                'No rent charges for this selection. Use "Generate rent" to create them.', '💰'
            );

        document.querySelectorAll('[data-pay]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                showPayForm(charges.find(function (c) { return String(c.id) === btn.getAttribute('data-pay'); }));
            });
        });
        document.querySelectorAll('[data-hist]').forEach(function (btn) {
            btn.addEventListener('click', safe(async function () {
                await showHistory(btn.getAttribute('data-hist'));
            }));
        });
    }

    function showPayForm(charge) {
        const panel = document.getElementById('pay-panel');
        panel.innerHTML =
            '<div class="panel">' +
            '<div class="panel-title">' +
            '<span>💵 Record payment — ' + esc(charge.tenantName) + ' · Room ' + esc(charge.roomNumber) + ' · ' + esc(charge.month) + '</span>' +
            '<button class="btn btn-sm btn-secondary" id="pay-cancel">✕ Cancel</button>' +
            '</div>' +
            '<p class="muted" style="margin-bottom:14px">Outstanding: <strong class="text-danger">' + money(charge.outstanding) + '</strong></p>' +
            '<form id="pay-form" class="form-row">' +
            '<div class="form-group"><label class="form-label">Amount (₹)</label>' +
            '<input class="form-control" name="amount" type="number" step="0.01" min="0.01" max="' + esc(charge.outstanding) +
            '" value="' + esc(charge.outstanding) + '" required></div>' +
            '<div class="form-group"><label class="form-label">Mode</label>' +
            '<select class="form-control" name="mode">' +
            '<option>UPI</option><option>CASH</option><option>BANK_TRANSFER</option></select></div>' +
            '<div class="form-group"><label class="form-label">Reference <span class="muted">(optional)</span></label>' +
            '<input class="form-control" name="reference" placeholder="UPI ID / receipt no."></div>' +
            '<div class="form-group" style="align-self:flex-end">' +
            '<button class="btn btn-primary" type="submit">Save payment</button></div>' +
            '</form></div>';

        document.getElementById('pay-cancel').addEventListener('click', function () { panel.innerHTML = ''; });
        document.getElementById('pay-form').addEventListener('submit', safe(async function (e) {
            const f = new FormData(e.target);
            await api('rent', '/api/rent/payments', 'POST', {
                chargeId:  charge.id,
                amount:    Number(f.get('amount')),
                mode:      f.get('mode'),
                reference: f.get('reference').trim() || null
            });
            toast('Payment recorded!', false);
            panel.innerHTML = '';
            await load();
        }));
        panel.scrollIntoView({behavior: 'smooth'});
    }

    async function showHistory(chargeId) {
        const list = await api('rent', '/api/rent/charges/' + chargeId + '/payments');
        document.getElementById('pay-panel').innerHTML =
            '<div class="panel">' +
            '<div class="panel-title">📜 Payment history</div>' +
            tableOrEmpty(
                ['Date & Time', 'Amount', 'Mode', 'Reference'],
                list.map(function (p) {
                    return '<tr>' +
                        '<td>' + dateTime(p.paidAt) + '</td>' +
                        '<td class="text-success"><strong>' + money(p.amount) + '</strong></td>' +
                        '<td><span class="badge ACTIVE" style="background:#dbeafe;color:#1e40af">' + esc(p.mode) + '</span></td>' +
                        '<td>' + esc(p.reference || '—') + '</td>' +
                        '</tr>';
                }),
                'No payments recorded yet.', '💰'
            ) + '</div>';
    }

    document.getElementById('rent-load').addEventListener('click', safe(load));
    document.getElementById('rent-generate').addEventListener('click', safe(async function () {
        const month = document.getElementById('rent-month').value;
        if (!month) throw new Error('Choose a month first');
        const result = await api('rent', '/api/rent/charges/generate?month=' + encodeURIComponent(month), 'POST');
        toast('Rent for ' + result.month + ': ' + result.created + ' created, ' + result.skipped + ' skipped', false);
        await load();
    }));

    await load();
}

/* ══════════════════════════════════════════════════════════════════════════════
   COMPLAINT HELPERS (shared)
══════════════════════════════════════════════════════════════════════════════ */

function complaintTimeline(c) {
    if (!c.timeline || !c.timeline.length) return '';
    return '<details><summary>History (' + c.timeline.length + ')</summary>' +
        '<ul class="timeline">' +
        c.timeline.map(function (t) {
            return '<li><strong>' + dateTime(t.at) + '</strong> — ' + esc(t.status) + ' by ' + esc(t.by) +
                (t.note ? ': <em>' + esc(t.note) + '</em>' : '') + '</li>';
        }).join('') +
        '</ul></details>';
}

function complaintPhotos(c) {
    const links = (c.photoUrls || []).filter(function (u) { return /^https?:\/\//i.test(u); });
    if (!links.length) return '';
    return '<div class="photo-links">' +
        links.map(function (u, i) {
            return '<a href="' + esc(u) + '" target="_blank" rel="noopener noreferrer">📷 Photo ' + (i + 1) + '</a>';
        }).join('') +
        '</div>';
}

function categoryBadge(cat) {
    const map = {PLUMBING:'🔧', ELECTRICAL:'⚡', CLEANING:'🧹', WIFI:'📶', FOOD:'🍽️', OTHER:'📌'};
    return (map[cat] || '📌') + ' ' + esc(cat);
}

/* ══════════════════════════════════════════════════════════════════════════════
   OWNER — COMPLAINTS
══════════════════════════════════════════════════════════════════════════════ */

async function ownerComplaints(el) {
    el.innerHTML =
        '<div class="section-header">' +
        '<div><div class="section-title">Complaints</div>' +
        '<div class="section-desc">Review and manage tenant complaints</div></div>' +
        '</div>' +

        '<div class="filters-bar">' +
        '<div class="form-group"><label class="form-label">Status</label>' +
        '<select class="form-control" id="c-status" style="min-width:140px">' +
        '<option value="">All statuses</option>' +
        '<option>OPEN</option><option>IN_PROGRESS</option><option>RESOLVED</option><option>CLOSED</option>' +
        '</select></div>' +
        '<div class="form-group"><label class="form-label">Room</label>' +
        '<input class="form-control" id="c-room" placeholder="e.g. 101" style="width:110px"></div>' +
        '<button class="btn btn-primary" id="c-load" style="align-self:flex-end">🔍 Show</button>' +
        '</div>' +

        '<div id="c-table"></div>';

    async function load() {
        const params = new URLSearchParams();
        const status = document.getElementById('c-status').value;
        const room   = document.getElementById('c-room').value.trim();
        if (status) params.set('status', status);
        if (room)   params.set('room', room);
        const list = await api('complaint', '/api/complaints?' + params.toString());

        document.getElementById('c-table').innerHTML = tableOrEmpty(
            ['Room', 'Tenant', 'Category', 'Description', 'Status', 'Last updated', 'Action'],
            list.map(function (c) {
                const closed = c.status === 'CLOSED';
                return '<tr>' +
                    '<td><strong>' + esc(c.roomNumber) + '</strong></td>' +
                    '<td>' + esc(c.tenantName) + '</td>' +
                    '<td>' + categoryBadge(c.category) + '</td>' +
                    '<td style="max-width:260px"><span>' + esc(c.description) + '</span>' +
                    complaintPhotos(c) + complaintTimeline(c) + '</td>' +
                    '<td>' + badge(c.status) + '</td>' +
                    '<td class="muted">' + dateTime(c.updatedAt) + '</td>' +
                    '<td>' +
                    (closed
                        ? '<span class="badge CLOSED">Closed</span>'
                        : '<form class="form-row" data-complaint="' + esc(c.id) + '" style="gap:6px;flex-wrap:nowrap">' +
                          '<select class="form-control" name="status" style="font-size:12px;padding:5px 8px">' +
                          '<option>IN_PROGRESS</option><option>RESOLVED</option><option>CLOSED</option><option>OPEN</option>' +
                          '</select>' +
                          '<input class="form-control" name="note" placeholder="Note…" style="font-size:12px;padding:5px 8px;min-width:100px">' +
                          '<button class="btn btn-sm btn-primary" type="submit">Update</button>' +
                          '</form>') +
                    '</td>' +
                    '</tr>';
            }),
            'No complaints found for this filter.', '📋'
        );

        document.querySelectorAll('form[data-complaint]').forEach(function (form) {
            form.addEventListener('submit', safe(async function (e) {
                e.preventDefault();
                const f = new FormData(form);
                await api('complaint', '/api/complaints/' + form.getAttribute('data-complaint') + '/status', 'PATCH',
                    {status: f.get('status'), note: f.get('note').trim() || null});
                toast('Complaint updated!', false);
                await load();
            }));
        });
    }

    document.getElementById('c-load').addEventListener('click', safe(load));
    await load();
}

/* ══════════════════════════════════════════════════════════════════════════════
   TENANT — MY RENT
══════════════════════════════════════════════════════════════════════════════ */

async function tenantRent(el) {
    const [me, dues] = await Promise.all([
        api('tenant', '/api/tenants/me'),
        api('rent', '/api/rent/my-dues')
    ]);
    const totalOutstanding = dues.reduce(function (s, c) { return s + Number(c.outstanding); }, 0);
    const totalPaid        = dues.reduce(function (s, c) { return s + Number(c.amountPaid); }, 0);

    el.innerHTML =
        '<div class="section-header">' +
        '<div><div class="section-title">My Rent</div>' +
        '<div class="section-desc">Your rent summary and payment history</div></div>' +
        '</div>' +

        '<div class="card" style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">' +
        '<div class="user-avatar" style="width:50px;height:50px;font-size:22px;background:var(--brand-bg);color:var(--brand-dark)">' +
        avatarLetter(me.name) + '</div>' +
        '<div>' +
        '<div style="font-size:17px;font-weight:800;color:var(--gray-900)">' + esc(me.name) + '</div>' +
        '<div class="muted" style="margin-top:2px">Room <strong>' + esc(me.roomNumber) + '</strong> · ' +
        money(me.monthlyRent) + '/month · Moved in ' + dateOnly(me.moveInDate) + '</div>' +
        '</div>' +
        '</div>' +

        '<div class="stats-row">' +
        '<div class="stat-card"><div class="stat-icon green">✅</div><div>' +
        '<div class="stat-label">Total paid</div><div class="stat-value">' + money(totalPaid) + '</div></div></div>' +
        '<div class="stat-card"><div class="stat-icon red">⏳</div><div>' +
        '<div class="stat-label">Total outstanding</div><div class="stat-value' + (totalOutstanding > 0 ? ' text-danger' : '') + '">' + money(totalOutstanding) + '</div></div></div>' +
        '</div>' +

        tableOrEmpty(
            ['Month', 'Amount', 'Paid', 'Outstanding', 'Due date', 'Status'],
            dues.map(function (c) {
                return '<tr>' +
                    '<td>' + esc(c.month) + '</td>' +
                    '<td>' + money(c.amount) + '</td>' +
                    '<td class="text-success">' + money(c.amountPaid) + '</td>' +
                    '<td class="' + (Number(c.outstanding) > 0 ? 'text-danger' : '') + '">' + money(c.outstanding) + '</td>' +
                    '<td>' + esc(c.dueDate) + '</td>' +
                    '<td>' + badge(c.status) +
                    (c.overdue ? ' <span class="badge overdue">OVERDUE</span>' : '') + '</td>' +
                    '</tr>';
            }),
            'No rent charges yet.', '💳'
        );
}

/* ══════════════════════════════════════════════════════════════════════════════
   TENANT — MY COMPLAINTS
══════════════════════════════════════════════════════════════════════════════ */

async function tenantComplaints(el) {
    const list = await api('complaint', '/api/complaints/my');
    const openCount = list.filter(function (c) { return c.status === 'OPEN' || c.status === 'IN_PROGRESS'; }).length;

    el.innerHTML =
        '<div class="section-header">' +
        '<div><div class="section-title">My Complaints</div>' +
        '<div class="section-desc">Track your complaints and their resolution</div></div>' +
        '</div>' +

        (openCount > 0
            ? '<div class="card" style="border-left:4px solid var(--warning);padding:12px 16px;margin-bottom:16px">' +
              '<span style="font-weight:600;color:var(--warning)">⚠️ ' + openCount + ' open complaint' + (openCount > 1 ? 's' : '') + '</span>' +
              '<span class="muted" style="margin-left:8px">being tracked</span></div>'
            : '') +

        '<div class="card">' +
        '<div class="card-title"><span class="card-icon">📝</span> Raise a new complaint</div>' +
        '<form id="new-complaint">' +
        '<div class="form-row">' +
        '<div class="form-group"><label class="form-label">Category</label>' +
        '<select class="form-control" name="category">' +
        '<option>PLUMBING</option><option>ELECTRICAL</option><option>CLEANING</option>' +
        '<option>WIFI</option><option>FOOD</option><option>OTHER</option>' +
        '</select></div>' +
        '</div>' +
        '<div class="form-group" style="margin-top:10px"><label class="form-label">Describe the problem</label>' +
        '<textarea class="form-control" name="description" maxlength="1000" required placeholder="Describe what&apos;s wrong in detail…"></textarea></div>' +
        '<div class="form-group"><label class="form-label">Photo links <span class="muted">(optional — one URL per line, start with https://)</span></label>' +
        '<textarea class="form-control" name="photos" placeholder="https://…"></textarea></div>' +
        '<button class="btn btn-primary" type="submit" style="margin-top:4px">📤 Submit complaint</button>' +
        '</form></div>' +

        tableOrEmpty(
            ['Category', 'Description', 'Status', 'Raised'],
            list.map(function (c) {
                return '<tr>' +
                    '<td>' + categoryBadge(c.category) + '</td>' +
                    '<td style="max-width:300px">' + esc(c.description) + complaintPhotos(c) + complaintTimeline(c) + '</td>' +
                    '<td>' + badge(c.status) + '</td>' +
                    '<td class="muted">' + dateTime(c.createdAt) + '</td>' +
                    '</tr>';
            }),
            'You have not raised any complaints.', '📝'
        );

    document.getElementById('new-complaint').addEventListener('submit', safe(async function (e) {
        const f = new FormData(e.target);
        const photos = f.get('photos').split('\n')
            .map(function (s) { return s.trim(); })
            .filter(function (s) { return s.length > 0; });
        await api('complaint', '/api/complaints', 'POST', {
            category:    f.get('category'),
            description: f.get('description').trim(),
            photoUrls:   photos
        });
        toast('Complaint submitted!', false);
        await tenantComplaints(el);
    }));
}

/* ══════════════════════════════════════════════════════════════════════════════
   BOOTSTRAP
══════════════════════════════════════════════════════════════════════════════ */

function render() {
    if (!session) {
        renderLogin();
    } else if (session.role === 'OWNER') {
        renderShell({
            rooms:      {label: 'Rooms',      render: ownerRooms},
            tenants:    {label: 'Tenants',    render: ownerTenants},
            rent:       {label: 'Rent',       render: ownerRent},
            complaints: {label: 'Complaints', render: ownerComplaints}
        });
    } else {
        renderShell({
            myrent:       {label: 'My Rent',       render: tenantRent},
            mycomplaints: {label: 'My Complaints',  render: tenantComplaints}
        });
    }
}

render();
