'use strict';

// Where each backend service is running. Open the UI at http://localhost:8081 (not 127.0.0.1).
const API = {
    tenant: 'http://localhost:8081',
    rent: 'http://localhost:8082',
    complaint: 'http://localhost:8083'
};

const root = document.getElementById('app');
let session = JSON.parse(sessionStorage.getItem('session') || 'null');

/* ---------------------------------------------------------------- helpers */

// Escape text before putting it into HTML (prevents script injection from user-typed data)
function esc(value) {
    return String(value === null || value === undefined ? '' : value).replace(/[&<>"']/g, function (c) {
        return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c];
    });
}

function money(value) {
    return '₹' + Number(value).toFixed(2);
}

function dateTime(value) {
    return value ? esc(new Date(value).toLocaleString()) : '-';
}

function badge(text) {
    return '<span class="badge ' + esc(text) + '">' + esc(String(text).replace('_', ' ')) + '</span>';
}

function toast(text, isError) {
    const el = document.getElementById('toast');
    el.textContent = text;
    el.className = 'toast ' + (isError ? 'error' : 'ok');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(function () {
        el.className = 'toast hidden';
    }, 6000);
}

function currentMonth() {
    const now = new Date();
    return now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
}

// Wraps an async handler so any error is shown as a red message instead of crashing
function safe(fn) {
    return async function (event) {
        if (event && event.preventDefault) {
            event.preventDefault();
        }
        try {
            await fn(event);
        } catch (err) {
            toast(err.message, true);
        }
    };
}

function tableOrEmpty(headers, rows, emptyText) {
    if (rows.length === 0) {
        return '<div class="empty">' + esc(emptyText) + '</div>';
    }
    return '<div class="table-wrap"><table><thead><tr>' +
        headers.map(function (h) { return '<th>' + esc(h) + '</th>'; }).join('') +
        '</tr></thead><tbody>' + rows.join('') + '</tbody></table></div>';
}

/* -------------------------------------------------------------------- API */

async function api(service, path, method, body) {
    const headers = {};
    if (body !== undefined) {
        headers['Content-Type'] = 'application/json';
    }
    if (session) {
        headers['Authorization'] = 'Bearer ' + session.token;
    }
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
    if (text) {
        try {
            data = JSON.parse(text);
        } catch (e) {
            data = null;
        }
    }
    if (res.status === 401 && session) {
        logout();
        throw new Error('Session expired. Please log in again.');
    }
    if (!res.ok) {
        throw new Error((data && data.message) || ('Request failed (' + res.status + ')'));
    }
    return data;
}

function logout() {
    sessionStorage.removeItem('session');
    session = null;
    render();
}

/* ------------------------------------------------------------------ login */

function renderLogin() {
    root.innerHTML =
        '<div class="card login-card stack">' +
        '<h2>PG &amp; Hostel Rent Manager</h2>' +
        '<form id="login-form">' +
        '<label>Username <input name="username" required autocomplete="username"></label>' +
        '<label>Password <input name="password" type="password" required autocomplete="current-password"></label>' +
        '<button class="primary" type="submit">Log in</button>' +
        '</form>' +
        '<hr>' +
        '<details><summary>First time? Create the owner account</summary>' +
        '<form id="owner-form" style="margin-top:10px">' +
        '<label>Username <input name="username" required></label>' +
        '<label>Password (min 6 characters) <input name="password" type="password" minlength="6" required></label>' +
        '<label>Owner signup code <input name="signupCode" required></label>' +
        '<button type="submit">Create owner account</button>' +
        '</form></details>' +
        '<p class="muted">Tenants: ask your PG owner for your username and password.</p>' +
        '</div>';

    document.getElementById('login-form').addEventListener('submit', safe(async function (e) {
        const f = new FormData(e.target);
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

/* ------------------------------------------------------------------ shell */

function renderShell(tabs) {
    const keys = Object.keys(tabs);
    root.innerHTML =
        '<header class="bar"><h1>PG &amp; Hostel Rent Manager</h1>' +
        '<div>' + esc(session.username) + ' (' + esc(session.role) + ') ' +
        '<button id="logout-btn">Log out</button></div></header>' +
        '<div class="container">' +
        '<nav class="tabs">' +
        keys.map(function (k) {
            return '<button data-tab="' + esc(k) + '">' + esc(tabs[k].label) + '</button>';
        }).join('') +
        '</nav><div id="tab"></div></div>';

    document.getElementById('logout-btn').addEventListener('click', logout);

    async function open(key) {
        document.querySelectorAll('nav.tabs button').forEach(function (b) {
            b.className = b.getAttribute('data-tab') === key ? 'active' : '';
        });
        const el = document.getElementById('tab');
        el.innerHTML = '<div class="empty">Loading...</div>';
        try {
            await tabs[key].render(el);
        } catch (err) {
            el.innerHTML = '<div class="empty">' + esc(err.message) + '</div>';
        }
    }

    document.querySelectorAll('nav.tabs button').forEach(function (b) {
        b.addEventListener('click', function () {
            open(b.getAttribute('data-tab'));
        });
    });
    open(keys[0]);
}

/* ---------------------------------------------------------- OWNER: rooms */

async function ownerRooms(el) {
    const rooms = await api('tenant', '/api/rooms');
    el.innerHTML =
        '<h2>Rooms</h2>' +
        '<div class="card"><form id="room-form" class="row">' +
        '<label>Room number <input name="roomNumber" required></label>' +
        '<label>Floor <input name="floor" type="number" min="0" value="0" required></label>' +
        '<label>Monthly rent (₹) <input name="monthlyRent" type="number" min="1" step="0.01" required></label>' +
        '<label>Capacity (beds) <input name="capacity" type="number" min="1" value="1" required></label>' +
        '<button class="primary" type="submit">Add room</button>' +
        '</form></div>' +
        tableOrEmpty(['Room', 'Floor', 'Rent / month', 'Capacity', 'Occupied'],
            rooms.map(function (r) {
                return '<tr><td>' + esc(r.roomNumber) + '</td><td>' + esc(r.floor) + '</td><td>' +
                    money(r.monthlyRent) + '</td><td>' + esc(r.capacity) + '</td><td>' +
                    esc(r.occupied) + ' / ' + esc(r.capacity) + '</td></tr>';
            }), 'No rooms yet. Add your first room above.');

    document.getElementById('room-form').addEventListener('submit', safe(async function (e) {
        const f = new FormData(e.target);
        await api('tenant', '/api/rooms', 'POST', {
            roomNumber: f.get('roomNumber').trim(),
            floor: Number(f.get('floor')),
            monthlyRent: Number(f.get('monthlyRent')),
            capacity: Number(f.get('capacity'))
        });
        toast('Room added', false);
        await ownerRooms(el);
    }));
}

/* -------------------------------------------------------- OWNER: tenants */

async function ownerTenants(el) {
    const results = await Promise.all([api('tenant', '/api/tenants'), api('tenant', '/api/rooms')]);
    const tenants = results[0];
    const rooms = results[1];

    el.innerHTML =
        '<h2>Tenants</h2>' +
        '<div class="card"><h3>Add a tenant (also creates their login)</h3>' +
        '<form id="tenant-form" class="row">' +
        '<label>Name <input name="name" required></label>' +
        '<label>Phone <input name="phone" required></label>' +
        '<label>Room <select name="roomId" required>' +
        '<option value="">Choose...</option>' +
        rooms.map(function (r) {
            const full = r.occupied >= r.capacity;
            return '<option value="' + esc(r.id) + '"' + (full ? ' disabled' : '') + '>' +
                esc(r.roomNumber) + ' (' + esc(r.occupied) + '/' + esc(r.capacity) + ', ' + money(r.monthlyRent) + ')' +
                (full ? ' - full' : '') + '</option>';
        }).join('') +
        '</select></label>' +
        '<label>Move-in date <input name="moveInDate" type="date"></label>' +
        '<label>Login username <input name="username" required></label>' +
        '<label>Login password <input name="password" type="password" minlength="6" required></label>' +
        '<button class="primary" type="submit">Add tenant</button>' +
        '</form></div>' +
        tableOrEmpty(['Name', 'Phone', 'Room', 'Move-in', 'Move-out', 'Status', ''],
            tenants.map(function (t) {
                return '<tr><td>' + esc(t.name) + '</td><td>' + esc(t.phone) + '</td><td>' +
                    esc(t.roomNumber) + '</td><td>' + esc(t.moveInDate) + '</td><td>' +
                    esc(t.moveOutDate || '-') + '</td><td>' + badge(t.status) + '</td><td>' +
                    (t.status === 'ACTIVE'
                        ? '<button class="small danger" data-checkout="' + esc(t.id) + '" data-name="' + esc(t.name) + '">Check out</button>'
                        : '') +
                    '</td></tr>';
            }), 'No tenants yet.');

    document.getElementById('tenant-form').addEventListener('submit', safe(async function (e) {
        const f = new FormData(e.target);
        await api('tenant', '/api/tenants', 'POST', {
            name: f.get('name').trim(),
            phone: f.get('phone').trim(),
            roomId: Number(f.get('roomId')),
            moveInDate: f.get('moveInDate') || null,
            username: f.get('username').trim(),
            password: f.get('password')
        });
        toast('Tenant added', false);
        await ownerTenants(el);
    }));

    el.querySelectorAll('[data-checkout]').forEach(function (btn) {
        btn.addEventListener('click', safe(async function () {
            const name = btn.getAttribute('data-name');
            if (!confirm('Check out ' + name + '? Their login will be disabled, rent charges will be flagged and open complaints closed.')) {
                return;
            }
            await api('tenant', '/api/tenants/' + btn.getAttribute('data-checkout') + '/checkout', 'PUT');
            toast(name + ' checked out. Rent and complaint services will update shortly.', false);
            await ownerTenants(el);
        }));
    });
}

/* ----------------------------------------------------------- OWNER: rent */

async function ownerRent(el) {
    el.innerHTML =
        '<h2>Rent</h2>' +
        '<div class="card"><div class="row">' +
        '<label>Month <input type="month" id="rent-month" value="' + currentMonth() + '"></label>' +
        '<label>Status <select id="rent-status"><option value="">All</option>' +
        '<option value="UNPAID">UNPAID</option><option value="PARTIAL">PARTIAL</option><option value="PAID">PAID</option></select></label>' +
        '<button id="rent-load">Show</button>' +
        '<button id="rent-generate" class="primary">Generate rent for all active tenants</button>' +
        '</div></div>' +
        '<div id="rent-table"></div><div id="pay-panel"></div>';

    let charges = [];

    async function load() {
        const month = document.getElementById('rent-month').value;
        const status = document.getElementById('rent-status').value;
        const params = new URLSearchParams();
        if (month) { params.set('month', month); }
        if (status) { params.set('status', status); }
        charges = await api('rent', '/api/rent/charges?' + params.toString());

        document.getElementById('rent-table').innerHTML = tableOrEmpty(
            ['Room', 'Tenant', 'Month', 'Amount', 'Paid', 'Outstanding', 'Due date', 'Status', ''],
            charges.map(function (c) {
                return '<tr><td>' + esc(c.roomNumber) + '</td><td>' + esc(c.tenantName) +
                    (c.tenantCheckedOut ? ' <span class="muted">(checked out)</span>' : '') + '</td><td>' +
                    esc(c.month) + '</td><td>' + money(c.amount) + '</td><td>' + money(c.amountPaid) +
                    '</td><td>' + money(c.outstanding) + '</td><td>' + esc(c.dueDate) + '</td><td>' +
                    badge(c.status) + (c.overdue ? ' <span class="badge overdue">OVERDUE</span>' : '') + '</td><td>' +
                    (c.status !== 'PAID' ? '<button class="small primary" data-pay="' + esc(c.id) + '">Record payment</button> ' : '') +
                    '<button class="small" data-hist="' + esc(c.id) + '">Payments</button></td></tr>';
            }), 'No rent charges for this selection. Use "Generate rent" to create them.');

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
            '<div class="card"><h3>Record payment: ' + esc(charge.tenantName) + ' (room ' + esc(charge.roomNumber) +
            ', ' + esc(charge.month) + ')</h3>' +
            '<p class="muted">Outstanding: ' + money(charge.outstanding) + '</p>' +
            '<form id="pay-form" class="row">' +
            '<label>Amount (₹) <input name="amount" type="number" step="0.01" min="0.01" max="' + esc(charge.outstanding) +
            '" value="' + esc(charge.outstanding) + '" required></label>' +
            '<label>Mode <select name="mode"><option>UPI</option><option>CASH</option><option>BANK_TRANSFER</option></select></label>' +
            '<label>Reference (UPI id / receipt no.) <input name="reference"></label>' +
            '<button class="primary" type="submit">Save payment</button>' +
            '<button type="button" id="pay-cancel">Cancel</button>' +
            '</form></div>';
        document.getElementById('pay-cancel').addEventListener('click', function () { panel.innerHTML = ''; });
        document.getElementById('pay-form').addEventListener('submit', safe(async function (e) {
            const f = new FormData(e.target);
            await api('rent', '/api/rent/payments', 'POST', {
                chargeId: charge.id,
                amount: Number(f.get('amount')),
                mode: f.get('mode'),
                reference: f.get('reference').trim() || null
            });
            toast('Payment saved', false);
            panel.innerHTML = '';
            await load();
        }));
        panel.scrollIntoView({behavior: 'smooth'});
    }

    async function showHistory(chargeId) {
        const list = await api('rent', '/api/rent/charges/' + chargeId + '/payments');
        document.getElementById('pay-panel').innerHTML =
            '<div class="card"><h3>Payments for this charge</h3>' +
            tableOrEmpty(['When', 'Amount', 'Mode', 'Reference'], list.map(function (p) {
                return '<tr><td>' + dateTime(p.paidAt) + '</td><td>' + money(p.amount) + '</td><td>' +
                    esc(p.mode) + '</td><td>' + esc(p.reference || '-') + '</td></tr>';
            }), 'No payments yet.') + '</div>';
    }

    document.getElementById('rent-load').addEventListener('click', safe(load));
    document.getElementById('rent-generate').addEventListener('click', safe(async function () {
        const month = document.getElementById('rent-month').value;
        if (!month) {
            throw new Error('Choose a month first');
        }
        const result = await api('rent', '/api/rent/charges/generate?month=' + encodeURIComponent(month), 'POST');
        toast('Rent for ' + result.month + ': ' + result.created + ' created, ' + result.skipped + ' skipped', false);
        await load();
    }));
    await load();
}

/* ------------------------------------------------------ complaint table */

function complaintTimeline(c) {
    return '<details><summary>History (' + c.timeline.length + ')</summary><ul class="timeline">' +
        c.timeline.map(function (t) {
            return '<li>' + dateTime(t.at) + ' - ' + esc(t.status) + ' by ' + esc(t.by) +
                (t.note ? ': ' + esc(t.note) : '') + '</li>';
        }).join('') + '</ul></details>';
}

function complaintPhotos(c) {
    return (c.photoUrls || []).filter(function (u) {
        return /^https?:\/\//i.test(u); // only show real web links
    }).map(function (u, i) {
        return '<a href="' + esc(u) + '" target="_blank" rel="noopener noreferrer">photo ' + (i + 1) + '</a>';
    }).join(' ');
}

/* ------------------------------------------------------ OWNER: complaints */

async function ownerComplaints(el) {
    el.innerHTML =
        '<h2>Complaints</h2>' +
        '<div class="card"><div class="row">' +
        '<label>Status <select id="c-status"><option value="">All</option><option>OPEN</option>' +
        '<option>IN_PROGRESS</option><option>RESOLVED</option><option>CLOSED</option></select></label>' +
        '<label>Room <input id="c-room" placeholder="e.g. 101"></label>' +
        '<button id="c-load" class="primary">Show</button></div></div>' +
        '<div id="c-table"></div>';

    async function load() {
        const params = new URLSearchParams();
        const status = document.getElementById('c-status').value;
        const room = document.getElementById('c-room').value.trim();
        if (status) { params.set('status', status); }
        if (room) { params.set('room', room); }
        const list = await api('complaint', '/api/complaints?' + params.toString());

        document.getElementById('c-table').innerHTML = tableOrEmpty(
            ['Room', 'Tenant', 'Category', 'Description', 'Status', 'Update'],
            list.map(function (c) {
                const closed = c.status === 'CLOSED';
                return '<tr><td>' + esc(c.roomNumber) + '</td><td>' + esc(c.tenantName) + '</td><td>' +
                    esc(c.category) + '</td><td>' + esc(c.description) + '<br>' + complaintPhotos(c) +
                    complaintTimeline(c) + '</td><td>' + badge(c.status) + '<br><span class="muted">' +
                    dateTime(c.updatedAt) + '</span></td><td>' +
                    (closed ? '<span class="muted">Closed</span>' :
                        '<form class="row" data-complaint="' + esc(c.id) + '">' +
                        '<select name="status"><option>IN_PROGRESS</option><option>RESOLVED</option><option>CLOSED</option><option>OPEN</option></select>' +
                        '<input name="note" placeholder="note (optional)">' +
                        '<button class="small primary" type="submit">Update</button></form>') +
                    '</td></tr>';
            }), 'No complaints found.');

        document.querySelectorAll('form[data-complaint]').forEach(function (form) {
            form.addEventListener('submit', safe(async function () {
                const f = new FormData(form);
                await api('complaint', '/api/complaints/' + form.getAttribute('data-complaint') + '/status', 'PATCH',
                    {status: f.get('status'), note: f.get('note').trim() || null});
                toast('Complaint updated', false);
                await load();
            }));
        });
    }

    document.getElementById('c-load').addEventListener('click', safe(load));
    await load();
}

/* ---------------------------------------------------------- TENANT views */

async function tenantRent(el) {
    const results = await Promise.all([api('tenant', '/api/tenants/me'), api('rent', '/api/rent/my-dues')]);
    const me = results[0];
    const dues = results[1];
    const totalOutstanding = dues.reduce(function (sum, c) { return sum + Number(c.outstanding); }, 0);

    el.innerHTML =
        '<h2>My rent</h2>' +
        '<div class="card"><strong>' + esc(me.name) + '</strong> - Room ' + esc(me.roomNumber) +
        ' - Rent ' + money(me.monthlyRent) + ' / month<br>' +
        '<span class="muted">Moved in: ' + esc(me.moveInDate) + '</span><br>' +
        '<h3>Total outstanding: ' + money(totalOutstanding) + '</h3></div>' +
        tableOrEmpty(['Month', 'Amount', 'Paid', 'Outstanding', 'Due date', 'Status'],
            dues.map(function (c) {
                return '<tr><td>' + esc(c.month) + '</td><td>' + money(c.amount) + '</td><td>' + money(c.amountPaid) +
                    '</td><td>' + money(c.outstanding) + '</td><td>' + esc(c.dueDate) + '</td><td>' + badge(c.status) +
                    (c.overdue ? ' <span class="badge overdue">OVERDUE</span>' : '') + '</td></tr>';
            }), 'No rent charges yet.');
}

async function tenantComplaints(el) {
    const list = await api('complaint', '/api/complaints/my');
    el.innerHTML =
        '<h2>My complaints</h2>' +
        '<div class="card"><h3>Raise a new complaint</h3><form id="new-complaint" class="row">' +
        '<label>Category <select name="category"><option>PLUMBING</option><option>ELECTRICAL</option>' +
        '<option>CLEANING</option><option>WIFI</option><option>FOOD</option><option>OTHER</option></select></label>' +
        '<label>Describe the problem <textarea name="description" maxlength="1000" required></textarea></label>' +
        '<label>Photo links (optional, one per line, start with https://) <textarea name="photos"></textarea></label>' +
        '<button class="primary" type="submit">Submit</button></form></div>' +
        tableOrEmpty(['Category', 'Description', 'Status', 'Raised'],
            list.map(function (c) {
                return '<tr><td>' + esc(c.category) + '</td><td>' + esc(c.description) + '<br>' + complaintPhotos(c) +
                    complaintTimeline(c) + '</td><td>' + badge(c.status) + '</td><td>' + dateTime(c.createdAt) + '</td></tr>';
            }), 'You have not raised any complaints.');

    document.getElementById('new-complaint').addEventListener('submit', safe(async function (e) {
        const f = new FormData(e.target);
        const photos = f.get('photos').split('\n').map(function (s) { return s.trim(); })
            .filter(function (s) { return s.length > 0; });
        await api('complaint', '/api/complaints', 'POST', {
            category: f.get('category'),
            description: f.get('description').trim(),
            photoUrls: photos
        });
        toast('Complaint submitted', false);
        await tenantComplaints(el);
    }));
}

/* ----------------------------------------------------------------- start */

function render() {
    if (!session) {
        renderLogin();
    } else if (session.role === 'OWNER') {
        renderShell({
            rooms: {label: 'Rooms', render: ownerRooms},
            tenants: {label: 'Tenants', render: ownerTenants},
            rent: {label: 'Rent', render: ownerRent},
            complaints: {label: 'Complaints', render: ownerComplaints}
        });
    } else {
        renderShell({
            rent: {label: 'My rent', render: tenantRent},
            complaints: {label: 'My complaints', render: tenantComplaints}
        });
    }
}

render();
