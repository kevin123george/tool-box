/* ===========================================================
   Calendar — calendar.js
   Depends on: shared.js (authFetch, showToast, showLoading,
               hideLoading, requireAuth, openModal, closeModal, API)
=============================================================*/

const MONTH_NAMES = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December'
];

/* ── Event type config ─────────────────────────────────── */
const EVENT_TYPE_CFG = {
    INCOME:       { cls: 'chip-income',       label: 'Income',       badge: 'badge-success' },
    EXPENSE:      { cls: 'chip-expense',      label: 'Expense',      badge: 'badge-error'   },
    SUBSCRIPTION: { cls: 'chip-subscription', label: 'Subscription', badge: 'badge-warning' },
    DIVIDEND:     { cls: 'chip-dividend',     label: 'Dividend',     badge: 'badge-info'    },
    WORKOUT:      { cls: '',                  label: 'Workout',      badge: 'badge-success' }, // resolved per event
    VACATION:     { cls: 'chip-vacation',     label: 'Vacation',     badge: 'badge-secondary' },
    HOLIDAY:      { cls: 'chip-holiday',      label: 'Holiday',      badge: 'badge-accent'  },
    APPOINTMENT:  { cls: 'chip-appointment',  label: 'Appointment',  badge: 'badge-info'    },
    REMINDER:     { cls: 'chip-reminder',     label: 'Reminder',     badge: 'badge-warning' },
    BIRTHDAY:     { cls: 'chip-birthday',     label: 'Birthday',     badge: 'badge-error'   },
    OTHER:        { cls: 'chip-other',        label: 'Other',        badge: ''              },
};

function chipClass(e) {
    if (e.type === 'WORKOUT') return e.completed ? 'chip-workout-done' : 'chip-workout-pend';
    return EVENT_TYPE_CFG[e.type]?.cls || 'chip-other';
}

/* ── State ──────────────────────────────────────────────── */
let calYear   = new Date().getFullYear();
let calMonth  = new Date().getMonth() + 1;
let calEvents = [];
let _detailEvent = null; // event currently shown in detail modal

/* ── Init ───────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
    requireAuth();
    loadCalendar();
});

/* ── Data ───────────────────────────────────────────────── */
async function loadCalendar() {
    showLoading('Loading calendar…');
    try {
        const res = await authFetch(`${API}/api/calendar/${calYear}/${calMonth}`);
        if (!res || !res.ok) throw new Error();
        calEvents = await res.json();
        renderCalendar();
    } catch {
        showToast('Failed to load calendar', 'error');
    } finally {
        hideLoading();
    }
}

/* ── Render ─────────────────────────────────────────────── */
function renderCalendar() {
    document.getElementById('calMonthLabel').textContent =
        `${MONTH_NAMES[calMonth - 1]} ${calYear}`;

    const firstDow  = new Date(calYear, calMonth - 1, 1).getDay(); // 0=Sun
    const daysInMo  = new Date(calYear, calMonth, 0).getDate();
    const today     = new Date();
    const isThisMo  = today.getFullYear() === calYear && today.getMonth() + 1 === calMonth;

    // Group events by day
    const byDay = {};
    calEvents.forEach(e => {
        if (!byDay[e.day]) byDay[e.day] = [];
        byDay[e.day].push(e);
    });

    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    let html = days.map(d => `<div class="cal-day-header">${d}</div>`).join('');

    // Leading empty cells
    for (let i = 0; i < firstDow; i++) html += `<div class="cal-day empty"></div>`;

    // Day cells
    for (let day = 1; day <= daysInMo; day++) {
        const isToday  = isThisMo && day === today.getDate();
        const dayEvts  = byDay[day] || [];
        const visible  = dayEvts.slice(0, 3);
        const overflow = dayEvts.length - visible.length;

        // Format date as YYYY-MM-DD for the add-event modal
        const mm  = String(calMonth).padStart(2, '0');
        const dd  = String(day).padStart(2, '0');
        const dateStr = `${calYear}-${mm}-${dd}`;

        const chips = visible.map((e) => {
            const cls     = chipClass(e);
            const label   = eventLabel(e);
            const tooltip = e.rangeLabel ? `${label} (${e.rangeLabel})` : label;
            return `<span class="cal-chip ${cls}"
                         onclick="event.stopPropagation(); onChipClick(${encodeEvent(e)})"
                         title="${escHtml(tooltip)}">${escHtml(label)}</span>`;
        }).join('');

        const more = overflow > 0
            ? `<div class="cal-more">+${overflow} more</div>` : '';

        html += `
            <div class="cal-day${isToday ? ' today' : ''}"
                 onclick="onDayClick('${dateStr}')">
                <div class="cal-day-num">${day}</div>
                ${chips}${more}
            </div>`;
    }

    document.getElementById('calGrid').innerHTML = html;
}

function eventLabel(e) {
    if (e.type === 'WORKOUT') {
        return `${e.completed ? '✓' : '○'} ${e.title}`;
    }
    if (e.type === 'INCOME' || e.type === 'EXPENSE' ||
        e.type === 'SUBSCRIPTION' || e.type === 'DIVIDEND') {
        return e.title;
    }
    return e.title;
}

/** Serialise a CalendarEventDTO to a safe inline JS expression for onclick. */
function encodeEvent(e) {
    return `JSON.parse(decodeURIComponent('${encodeURIComponent(JSON.stringify(e))}'))`;
}

/* ── Navigation ─────────────────────────────────────────── */
function prevMonth() {
    calMonth--;
    if (calMonth < 1) { calMonth = 12; calYear--; }
    loadCalendar();
}
function nextMonth() {
    calMonth++;
    if (calMonth > 12) { calMonth = 1; calYear++; }
    loadCalendar();
}
function goToToday() {
    const now = new Date();
    calYear  = now.getFullYear();
    calMonth = now.getMonth() + 1;
    loadCalendar();
}

/* ── Day click → add event ──────────────────────────────── */
function onDayClick(dateStr) {
    document.getElementById('addEventDate').value    = dateStr;
    document.getElementById('addEventEndDate').value = dateStr; // default end = start
    document.getElementById('addEventEndDate').min   = dateStr;
    document.getElementById('addEventTitle').value   = '';
    document.getElementById('addEventType').value    = 'VACATION';
    document.getElementById('addEventDesc').value    = '';
    openModal('addEventModal');
}

/** Keep end-date min in sync when start date changes. */
function onStartDateChange() {
    const start  = document.getElementById('addEventDate').value;
    const endEl  = document.getElementById('addEventEndDate');
    endEl.min    = start;
    if (endEl.value && endEl.value < start) endEl.value = start;
}

async function confirmAddEvent() {
    const date    = document.getElementById('addEventDate').value;
    const endDate = document.getElementById('addEventEndDate').value;
    const title   = document.getElementById('addEventTitle').value.trim();
    const type    = document.getElementById('addEventType').value;
    const desc    = document.getElementById('addEventDesc').value.trim();
    if (!title) { showToast('Please enter a title', 'warning'); return; }
    closeModal('addEventModal');
    // Only send endDate if it's actually different (i.e. a range)
    const body = {
        date, title,
        description: desc || null,
        eventType: type,
        endDate: (endDate && endDate !== date) ? endDate : null
    };
    try {
        const res = await authFetch(`${API}/api/events`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (!res || !res.ok) throw new Error();
        showToast('Event saved', 'success');
        await loadCalendar();
    } catch { showToast('Failed to save event', 'error'); }
}

/* ── Chip click → event detail ──────────────────────────── */
function onChipClick(e) {
    _detailEvent = e;
    const cfg     = EVENT_TYPE_CFG[e.type] || EVENT_TYPE_CFG.OTHER;
    const isCustom = !!e.id; // only custom (personal) events have an id

    document.getElementById('detailTitle').textContent = e.title || '';

    // Date line: show full range if present, otherwise just the clicked day
    const dateLine = e.rangeLabel
        ? e.rangeLabel
        : `${MONTH_NAMES[calMonth - 1]} ${e.day}, ${calYear}`;
    document.getElementById('detailDate').textContent = dateLine;

    // Range sub-line (hidden for single-day)
    const rangeEl = document.getElementById('detailRange');
    rangeEl.classList.toggle('hidden', !e.rangeLabel);

    const typeBadge = document.getElementById('detailType');
    typeBadge.textContent = cfg.label;
    typeBadge.className   = `badge badge-sm ${cfg.badge}`;

    const descEl = document.getElementById('detailDesc');
    descEl.textContent = e.description || '';
    descEl.classList.toggle('hidden', !e.description);

    // Amount / duration row for financial / workout events
    const amtEl = document.getElementById('detailAmount');
    if (['INCOME','EXPENSE','SUBSCRIPTION','DIVIDEND'].includes(e.type) && e.amount) {
        amtEl.textContent = `€${Number(e.amount).toFixed(2)}`;
        amtEl.classList.remove('hidden');
    } else if (e.type === 'WORKOUT' && e.amount) {
        amtEl.textContent = `${e.amount} min · ${e.completed ? 'completed ✓' : 'pending'}`;
        amtEl.classList.remove('hidden');
    } else {
        amtEl.classList.add('hidden');
    }

    // Delete button only for custom events
    document.getElementById('detailDeleteBtn').classList.toggle('hidden', !isCustom);

    openModal('eventDetailModal');
}

async function deleteEvent() {
    if (!_detailEvent?.id) return;
    const id = _detailEvent.id;
    _detailEvent = null;
    closeModal('eventDetailModal');
    try {
        const res = await authFetch(`${API}/api/events/${id}`, { method: 'DELETE' });
        if (!res || !res.ok) throw new Error();
        showToast('Event deleted', 'success');
        await loadCalendar();
    } catch { showToast('Failed to delete event', 'error'); }
}

/* ── Utils ───────────────────────────────────────────────── */
function escHtml(str) {
    return String(str || '')
        .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
