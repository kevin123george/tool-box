/* ===========================================================
   NAVIGATION — DaisyUI v5 Drawer Sidebar
   Professional admin dashboard style with SVG icons.
   Uses native is-drawer-open: / is-drawer-close: variants.
=============================================================*/

(function () {

    const SIDEBAR_KEY = 'sidebarOpen';

    /* -------------------------------------------------------
       SVG Icon library (Heroicons outline 24px)
    ------------------------------------------------------- */
    const ICONS = {
        home: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 shrink-0">
            <path stroke-linecap="round" stroke-linejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"/>
        </svg>`,
        memos: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 shrink-0">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"/>
        </svg>`,
        finance: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 shrink-0">
            <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z"/>
        </svg>`,
        investments: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 shrink-0">
            <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941"/>
        </svg>`,
        fitness: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 shrink-0">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"/>
        </svg>`,
        system: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5 shrink-0">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z"/>
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/>
        </svg>`,
        chevronDown: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-3.5 h-3.5 shrink-0 transition-transform duration-200">
            <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5"/>
        </svg>`,
        chevronLeft: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-4 h-4">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5"/>
        </svg>`,
        menu: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"/>
        </svg>`,
        logout: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75"/>
        </svg>`,
        logo: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
            <path stroke-linecap="round" stroke-linejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437 1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008Z"/>
        </svg>`
    };

    /* -------------------------------------------------------
       Page title map
    ------------------------------------------------------- */
    const PAGE_TITLES = {
        home:        'Dashboard',
        memos:       'Memos',
        finance:     'Finance',
        investments: 'Investments',
        fitness:     'Fitness',
        system:      'System'
    };

    /* -------------------------------------------------------
       Menu definition
    ------------------------------------------------------- */
    const MENU_GROUPS = [
        {
            group: null,
            items: [
                { key: 'home', label: 'Dashboard', href: '/', icon: 'home' }
            ]
        },
        {
            group: 'Workspace',
            items: [
                { key: 'memos', label: 'Memos', href: '/memos.html', icon: 'memos' }
            ]
        },
        {
            group: 'Finance',
            items: [
                {
                    key: 'finance', label: 'Finance', href: '/finance.html', icon: 'finance',
                    children: [
                        { label: 'Accounts',      href: '/finance.html?tab=accounts' },
                        { label: 'Budget',        href: '/finance.html?tab=budget' },
                        { label: 'Subscriptions', href: '/finance.html?tab=subscriptions' },
                        { label: 'Calendar',      href: '/finance.html?tab=calendar' },
                        { label: 'Analytics',     href: '/finance.html?tab=analytics' }
                    ]
                },
                {
                    key: 'investments', label: 'Investments', href: '/investments.html', icon: 'investments',
                    children: [
                        { label: 'Portfolio',    href: '/investments.html?tab=stocks' },
                        { label: 'History',      href: '/investments.html?tab=stockhistory' },
                        { label: 'Research',     href: '/investments.html?tab=research' },
                        { label: 'Fundamentals', href: '/investments.html?tab=fundamentals' },
                        { label: 'DCF',          href: '/investments.html?tab=dcf' },
                        { label: 'Screener',     href: '/investments.html?tab=screener' }
                    ]
                }
            ]
        },
        {
            group: 'Health',
            items: [
                { key: 'fitness', label: 'Fitness', href: '/fitness.html', icon: 'fitness' }
            ]
        },
        {
            group: 'Admin',
            items: [
                { key: 'system', label: 'System', href: '/system.html', icon: 'system' }
            ]
        }
    ];

    /* -------------------------------------------------------
       Build sidebar menu HTML
    ------------------------------------------------------- */
    function buildMenuHTML(activeKey) {
        let html = '<ul class="menu menu-sm w-full p-0 gap-0.5">';

        MENU_GROUPS.forEach(({ group, items }) => {
            if (group) {
                html += `
                <li class="is-drawer-close:hidden mt-3 mb-0.5 px-3">
                    <span class="text-[10px] font-semibold uppercase tracking-widest opacity-35">${group}</span>
                </li>`;
            }

            items.forEach(item => {
                const isActive = item.key === activeKey;
                const activeClasses = isActive
                    ? 'bg-primary/10 text-primary font-semibold'
                    : 'hover:bg-base-300/50 text-base-content/70 hover:text-base-content';

                if (item.children) {
                    html += `
                    <li class="px-1.5">
                        <details ${isActive ? 'open' : ''} class="is-drawer-close:[&>ul]:hidden">
                            <summary class="flex items-center gap-3 rounded-lg px-2.5 py-2 cursor-pointer select-none
                                           ${activeClasses} list-none [&::-webkit-details-marker]:hidden
                                           tooltip is-drawer-open:tooltip-none tooltip-right"
                                     data-tip="${item.label}">
                                <span class="${isActive ? 'text-primary' : 'opacity-60'}">${ICONS[item.icon] || ''}</span>
                                <span class="is-drawer-close:hidden flex-1 text-sm">${item.label}</span>
                                <span class="is-drawer-close:hidden opacity-40">${ICONS.chevronDown}</span>
                            </summary>
                            <ul class="is-drawer-close:hidden pl-0 mt-0.5 gap-0">
                                ${item.children.map(child => {
                                    const u = new URL(child.href, 'http://x');
                                    const tab = u.searchParams.get('tab') || '';
                                    return `
                                <li>
                                    <a href="${child.href}"
                                       data-nav-tab="${tab}"
                                       class="flex items-center rounded-lg py-1.5 pl-10 pr-3 text-xs text-base-content/55
                                              hover:text-base-content hover:bg-base-300/50 transition-colors">
                                        ${child.label}
                                    </a>
                                </li>`;
                                }).join('')}
                            </ul>
                        </details>
                    </li>`;
                } else {
                    html += `
                    <li class="px-1.5">
                        <a href="${item.href}"
                           class="flex items-center gap-3 rounded-lg px-2.5 py-2 transition-colors
                                  ${activeClasses}
                                  tooltip is-drawer-open:tooltip-none tooltip-right"
                           data-tip="${item.label}">
                            <span class="${isActive ? 'text-primary' : 'opacity-60'}">${ICONS[item.icon] || ''}</span>
                            <span class="is-drawer-close:hidden text-sm">${item.label}</span>
                        </a>
                    </li>`;
                }
            });
        });

        html += '</ul>';
        return html;
    }

    /* -------------------------------------------------------
       Main render
    ------------------------------------------------------- */
    function render() {
        const placeholder = document.getElementById('nav-placeholder');
        if (!placeholder) return;

        const activeKey = placeholder.dataset.active || 'home';
        const pageTitle = PAGE_TITLES[activeKey] || 'ToolBox';

        // Collect body children to move
        const bodyChildren = Array.from(document.body.childNodes).filter(node => {
            if (node.nodeType !== Node.ELEMENT_NODE) return false;
            return node.id !== 'toastContainer' && node.id !== 'loadingOverlay';
        });

        const sidebarOpen = localStorage.getItem(SIDEBAR_KEY) !== 'false';
        const drawerStateClass = sidebarOpen ? 'is-drawer-open' : 'is-drawer-close';

        const drawerRoot = document.createElement('div');
        drawerRoot.id = 'drawerRoot';
        drawerRoot.className = `drawer lg:drawer-open ${drawerStateClass}`;

        drawerRoot.innerHTML = `
            <input id="sidebar-toggle" type="checkbox" class="drawer-toggle">

            <!-- ===== DRAWER CONTENT ===== -->
            <div class="drawer-content flex flex-col min-h-screen bg-base-100">

                <!-- Topbar -->
                <header class="navbar bg-base-100 sticky top-0 z-30 border-b border-base-200 min-h-[56px] px-4 gap-2">
                    <div class="navbar-start gap-3">
                        <!-- Mobile hamburger -->
                        <label for="sidebar-toggle" class="btn btn-ghost btn-sm btn-square lg:hidden" aria-label="Open menu">
                            ${ICONS.menu}
                        </label>
                        <!-- Desktop collapse toggle -->
                        <button id="sidebarToggleBtn"
                                onclick="toggleSidebar()"
                                class="btn btn-ghost btn-sm btn-square hidden lg:flex"
                                aria-label="Toggle sidebar">
                            <span id="sidebarChevron" class="transition-transform duration-300 ${sidebarOpen ? '' : 'rotate-180'}">
                                ${ICONS.chevronLeft}
                            </span>
                        </button>
                        <!-- Page title -->
                        <h1 class="hidden sm:block text-sm font-semibold">${pageTitle}</h1>
                    </div>

                    <div class="navbar-end gap-2">
                        <div id="themePickerContainer"></div>

                        <!-- User dropdown -->
                        <div class="dropdown dropdown-end">
                            <div tabindex="0" role="button" class="btn btn-ghost btn-sm h-9 px-2 gap-2 rounded-lg">
                                <div class="avatar placeholder">
                                    <div class="bg-primary/15 text-primary rounded-full w-7 h-7 text-xs font-bold">
                                        <span id="userInitials">?</span>
                                    </div>
                                </div>
                                <span id="userDisplayName" class="hidden sm:inline text-sm font-medium max-w-[100px] truncate"></span>
                            </div>
                            <ul tabindex="0" class="dropdown-content z-[200] menu bg-base-100 rounded-xl shadow-lg border border-base-200 p-1.5 w-44 mt-2">
                                <li class="menu-title text-xs px-2 pt-1 pb-1.5">
                                    <span id="userEmailInDropdown" class="opacity-50 truncate block"></span>
                                </li>
                                <li><a onclick="logout()" class="flex items-center gap-2 text-error rounded-lg text-sm">
                                    ${ICONS.logout} Logout
                                </a></li>
                            </ul>
                        </div>
                    </div>
                </header>

                <!-- Page content -->
                <div id="pageContentWrapper" class="flex-1 p-6">
                </div>

            </div>

            <!-- ===== DRAWER SIDE ===== -->
            <div class="drawer-side z-40">
                <label for="sidebar-toggle" class="drawer-overlay"></label>

                <aside class="bg-base-100 border-r border-base-200 flex flex-col
                              is-drawer-open:w-60 is-drawer-close:w-[60px]
                              transition-[width] duration-300 ease-in-out overflow-hidden"
                       style="height: 100vh; min-height: 100vh;">

                    <!-- Brand header -->
                    <div class="flex items-center gap-3 px-4 border-b border-base-200 min-h-[56px] shrink-0">
                        <div class="text-primary shrink-0">${ICONS.logo}</div>
                        <span class="font-bold text-[15px] tracking-tight is-drawer-close:hidden whitespace-nowrap">ToolBox</span>
                    </div>

                    <!-- Nav menu -->
                    <nav class="flex-1 overflow-y-auto overflow-x-hidden py-3">
                        ${buildMenuHTML(activeKey)}
                    </nav>

                    <!-- Sidebar footer -->
                    <div class="border-t border-base-200 p-3 shrink-0">
                        <div class="is-drawer-close:hidden text-[10px] opacity-25 text-center uppercase tracking-widest">v1.0</div>
                    </div>

                </aside>
            </div>
        `;

        document.body.appendChild(drawerRoot);

        // Move page content into wrapper
        const wrapper = drawerRoot.querySelector('#pageContentWrapper');
        bodyChildren.forEach(node => wrapper.appendChild(node));

        // Set localStorage tab param from URL
        const tabParam = new URLSearchParams(window.location.search).get('tab');
        if (tabParam) {
            if (activeKey === 'finance')     localStorage.setItem('finance_active_tab', tabParam);
            if (activeKey === 'investments') localStorage.setItem('investments_active_tab', tabParam);
        }

        // Render theme picker
        if (typeof renderThemePicker === 'function') renderThemePicker();

        // Populate user info
        const userName  = localStorage.getItem('userName')  || '';
        const userEmail = localStorage.getItem('userEmail') || '';
        const initials  = userName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';

        const initialsEl = document.getElementById('userInitials');
        const nameEl     = document.getElementById('userDisplayName');
        const emailEl    = document.getElementById('userEmailInDropdown');

        if (initialsEl) initialsEl.textContent = initials;
        if (nameEl)     nameEl.textContent     = userName;
        if (emailEl)    emailEl.textContent    = userEmail;
    }

    /* -------------------------------------------------------
       Toggle sidebar
    ------------------------------------------------------- */
    window.toggleSidebar = function () {
        const root = document.getElementById('drawerRoot');
        if (!root) return;

        const nowOpen = root.classList.contains('is-drawer-close');
        root.classList.toggle('is-drawer-open', nowOpen);
        root.classList.toggle('is-drawer-close', !nowOpen);
        localStorage.setItem(SIDEBAR_KEY, String(nowOpen));

        const chevron = document.getElementById('sidebarChevron');
        if (chevron) chevron.classList.toggle('rotate-180', !nowOpen);
    };

    /* -------------------------------------------------------
       Same-page tab switching — no full reload
       Maps page pathname → global tab-switch function name.
       Intercepts when the function is already loaded (i.e. we
       are on that page), otherwise lets normal navigation happen.
    ------------------------------------------------------- */
    const TAB_FN_MAP = {
        '/finance.html':     'switchFinanceTab',
        '/investments.html': 'switchInvestmentTab',
    };

    document.addEventListener('click', function (e) {
        const link = e.target.closest('a[data-nav-tab]');
        if (!link) return;

        const tab = link.dataset.navTab;
        if (!tab) return;

        // Derive function name from the link's target page
        const fnName = TAB_FN_MAP[link.pathname];

        // If the function is defined, we're already on that page — intercept
        if (fnName && typeof window[fnName] === 'function') {
            e.preventDefault();
            window[fnName](tab);
            history.pushState({}, '', link.href);
        }
        // Otherwise let the browser navigate normally
    });

    // Close mobile drawer on Escape
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            const t = document.getElementById('sidebar-toggle');
            if (t && t.checked) t.checked = false;
        }
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', render);
    } else {
        render();
    }

})();
