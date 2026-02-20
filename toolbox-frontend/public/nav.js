/* ===========================================================
   NAVIGATION — DaisyUI v5 Drawer Sidebar
   Uses native is-drawer-open: / is-drawer-close: variants.
   Restructures <body> into drawer layout on every page.
=============================================================*/

(function () {

    const SIDEBAR_KEY = 'sidebarOpen';

    /* -------------------------------------------------------
       Menu definition
    ------------------------------------------------------- */
    const MENU_GROUPS = [
        {
            group: null,
            items: [
                { key: 'home', label: 'Home', href: '/', icon: '🏠' }
            ]
        },
        {
            group: 'Productivity',
            items: [
                { key: 'memos', label: 'Memos', href: '/memos.html', icon: '📝' }
            ]
        },
        {
            group: 'Finance',
            items: [
                {
                    key: 'finance', label: 'Finance', href: '/finance.html', icon: '💳',
                    children: [
                        { label: 'Accounts',      href: '/finance.html?tab=accounts' },
                        { label: 'Budget',        href: '/finance.html?tab=budget' },
                        { label: 'Subscriptions', href: '/finance.html?tab=subscriptions' },
                        { label: 'Calendar',      href: '/finance.html?tab=calendar' },
                        { label: 'Analytics',     href: '/finance.html?tab=analytics' }
                    ]
                },
                {
                    key: 'investments', label: 'Investments', href: '/investments.html', icon: '📈',
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
                { key: 'fitness', label: 'Fitness', href: '/fitness.html', icon: '🏋️' }
            ]
        },
        {
            group: 'System',
            items: [
                { key: 'system', label: 'System', href: '/system.html', icon: '⚙️' }
            ]
        }
    ];

    /* -------------------------------------------------------
       Build sidebar menu HTML using DaisyUI v5 patterns
    ------------------------------------------------------- */
    function buildMenuHTML(activeKey) {
        let html = '<ul class="menu menu-sm w-full p-0 gap-0">';

        MENU_GROUPS.forEach(({ group, items }) => {

            // Group label — hidden in collapsed state via DaisyUI variant
            if (group) {
                html += `
                <li class="menu-title is-drawer-close:hidden mt-2 px-3 py-1 text-[10px] font-bold uppercase tracking-widest opacity-40">
                    ${group}
                </li>`;
            }

            items.forEach(item => {
                const isActive = item.key === activeKey;

                if (item.children) {
                    // Parent item with collapsible children
                    html += `
                    <li>
                        <details ${isActive ? 'open' : ''} class="is-drawer-close:[&>ul]:hidden">
                            <summary class="flex items-center gap-3 rounded-none px-4 py-3 ${isActive ? 'menu-active' : ''}
                                           tooltip is-drawer-open:tooltip-none tooltip-right"
                                     data-tip="${item.label}">
                                <span class="text-base leading-none">${item.icon}</span>
                                <span class="is-drawer-close:hidden flex-1 font-medium">${item.label}</span>
                            </summary>
                            <ul class="is-drawer-close:hidden pl-0">
                                ${item.children.map(child => `
                                <li>
                                    <a href="${child.href}" class="rounded-none py-2 pl-11 pr-4 text-sm opacity-70 hover:opacity-100">
                                        ${child.label}
                                    </a>
                                </li>`).join('')}
                            </ul>
                        </details>
                    </li>`;
                } else {
                    // Leaf item
                    html += `
                    <li>
                        <a href="${item.href}"
                           class="flex items-center gap-3 rounded-none px-4 py-3 ${isActive ? 'menu-active' : ''}
                                  tooltip is-drawer-open:tooltip-none tooltip-right"
                           data-tip="${item.label}">
                            <span class="text-base leading-none">${item.icon}</span>
                            <span class="is-drawer-close:hidden font-medium">${item.label}</span>
                        </a>
                    </li>`;
                }
            });
        });

        html += '</ul>';
        return html;
    }

    /* -------------------------------------------------------
       SVG icons
    ------------------------------------------------------- */
    function hamburgerSVG() {
        return `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="w-5 h-5 stroke-current">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
        </svg>`;
    }

    function chevronLeftSVG() {
        return `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="w-4 h-4 stroke-current" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/>
        </svg>`;
    }

    /* -------------------------------------------------------
       Main render
    ------------------------------------------------------- */
    function render() {
        const placeholder = document.getElementById('nav-placeholder');
        if (!placeholder) return;

        const activeKey = placeholder.dataset.active || 'home';

        // Collect body children to move (skip toast & loading overlay)
        const bodyChildren = Array.from(document.body.childNodes).filter(node => {
            if (node.nodeType !== Node.ELEMENT_NODE) return false;
            return node.id !== 'toastContainer' && node.id !== 'loadingOverlay';
        });

        // Sidebar state from localStorage
        const sidebarOpen = localStorage.getItem(SIDEBAR_KEY) !== 'false';
        const drawerStateClass = sidebarOpen ? 'is-drawer-open' : 'is-drawer-close';

        /* Build drawer DOM */
        const drawerRoot = document.createElement('div');
        drawerRoot.id = 'drawerRoot';
        // lg:drawer-open keeps sidebar pinned on desktop
        drawerRoot.className = `drawer lg:drawer-open ${drawerStateClass}`;

        drawerRoot.innerHTML = `
            <input id="sidebar-toggle" type="checkbox" class="drawer-toggle">

            <!-- ===== DRAWER CONTENT ===== -->
            <div class="drawer-content flex flex-col min-h-screen">

                <!-- Topbar -->
                <div class="navbar bg-base-200 sticky top-0 z-30 border-b border-base-300/60 min-h-[52px] px-4">
                    <div class="navbar-start gap-2">
                        <!-- Mobile hamburger -->
                        <label for="sidebar-toggle" class="btn btn-ghost btn-sm btn-square lg:hidden" aria-label="Open menu">
                            ${hamburgerSVG()}
                        </label>
                        <!-- Desktop collapse toggle -->
                        <button id="sidebarToggleBtn"
                                onclick="toggleSidebar()"
                                class="btn btn-ghost btn-sm btn-square hidden lg:flex"
                                aria-label="Toggle sidebar">
                            <span id="sidebarChevron" class="transition-transform duration-300 ${sidebarOpen ? '' : 'rotate-180'}">
                                ${chevronLeftSVG()}
                            </span>
                        </button>
                    </div>
                    <div class="navbar-end gap-2">
                        <div id="themePickerContainer"></div>
                        <div class="dropdown dropdown-end">
                            <div tabindex="0" role="button" class="btn btn-ghost btn-sm gap-2">
                                <div class="avatar placeholder">
                                    <div class="bg-primary text-primary-content rounded-full w-7 h-7 text-xs font-bold flex items-center justify-center">
                                        <span id="userInitials">?</span>
                                    </div>
                                </div>
                                <span id="userDisplayName" class="hidden sm:inline text-xs font-medium"></span>
                            </div>
                            <ul tabindex="0" class="dropdown-content z-[200] menu menu-sm bg-base-200 rounded-box shadow-2xl p-2 w-40 mt-1">
                                <li><a onclick="logout()" class="text-error">Logout</a></li>
                            </ul>
                        </div>
                    </div>
                </div>

                <!-- Page content -->
                <div id="pageContentWrapper" class="flex-1 p-6">
                </div>

            </div>

            <!-- ===== DRAWER SIDE ===== -->
            <div class="drawer-side z-40">
                <label for="sidebar-toggle" class="drawer-overlay"></label>

                <aside class="bg-base-200 border-r border-base-300/60 flex flex-col
                              is-drawer-open:w-60 is-drawer-close:w-16
                              transition-[width] duration-300 ease-in-out overflow-hidden"
                       style="height: 100vh">

                    <!-- Brand header -->
                    <div class="flex items-center gap-3 px-4 border-b border-base-300/60 min-h-[52px]">
                        <span class="text-xl">🧰</span>
                        <span class="font-bold text-base tracking-tight is-drawer-close:hidden whitespace-nowrap">ToolBox</span>
                    </div>

                    <!-- Nav menu -->
                    <nav class="flex-1 overflow-y-auto overflow-x-hidden py-2">
                        ${buildMenuHTML(activeKey)}
                    </nav>

                    <!-- Footer -->
                    <div class="border-t border-base-300/60 p-3 is-drawer-close:hidden">
                        <div class="text-[10px] opacity-30 text-center uppercase tracking-widest">ToolBox v1</div>
                    </div>

                </aside>
            </div>
        `;

        document.body.appendChild(drawerRoot);

        // Move page content into wrapper
        const wrapper = drawerRoot.querySelector('#pageContentWrapper');
        bodyChildren.forEach(node => wrapper.appendChild(node));

        // Set localStorage tab param from URL (so page init picks correct tab)
        const tabParam = new URLSearchParams(window.location.search).get('tab');
        if (tabParam) {
            if (activeKey === 'finance')     localStorage.setItem('finance_active_tab', tabParam);
            if (activeKey === 'investments') localStorage.setItem('investments_active_tab', tabParam);
        }

        // Render theme picker
        if (typeof renderThemePicker === 'function') renderThemePicker();

        // Populate user info in topbar
        const userName = localStorage.getItem('userName') || '';
        const initials = userName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
        const initialsEl = document.getElementById('userInitials');
        const nameEl = document.getElementById('userDisplayName');
        if (initialsEl) initialsEl.textContent = initials;
        if (nameEl) nameEl.textContent = userName;
    }

    /* -------------------------------------------------------
       Toggle sidebar open/close
    ------------------------------------------------------- */
    window.toggleSidebar = function () {
        const root = document.getElementById('drawerRoot');
        if (!root) return;

        const nowOpen = root.classList.contains('is-drawer-close');
        root.classList.toggle('is-drawer-open', nowOpen);
        root.classList.toggle('is-drawer-close', !nowOpen);
        localStorage.setItem(SIDEBAR_KEY, String(nowOpen));

        // Flip chevron
        const chevron = document.getElementById('sidebarChevron');
        if (chevron) chevron.classList.toggle('rotate-180', !nowOpen);
    };

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
