/* ===========================================================
   NAVIGATION — DaisyUI Drawer Sidebar
   Restructures the entire <body> into a drawer layout.
   Renders into every page that has <div id="nav-placeholder" data-active="...">.
=============================================================*/

(function () {

    /* -------------------------------------------------------
       Menu definition
       key      — matches data-active on nav-placeholder
       label    — display name
       href     — navigation target
       icon     — emoji icon shown in collapsed mode
       children — optional sub-items (details/summary accordion)
    ------------------------------------------------------- */
    const MENU_GROUPS = [
        {
            group: null,
            items: [
                { key: 'home', label: 'Home', href: '/', icon: '🏠' }
            ]
        },
        {
            group: 'PRODUCTIVITY',
            items: [
                { key: 'memos', label: 'Memos', href: '/memos.html', icon: '📝' }
            ]
        },
        {
            group: 'FINANCE',
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
                        { label: 'Portfolio',     href: '/investments.html?tab=portfolio' },
                        { label: 'History',       href: '/investments.html?tab=history' },
                        { label: 'Research',      href: '/investments.html?tab=research' },
                        { label: 'Fundamentals',  href: '/investments.html?tab=fundamentals' },
                        { label: 'DCF',           href: '/investments.html?tab=dcf' },
                        { label: 'Screener',      href: '/investments.html?tab=screener' }
                    ]
                }
            ]
        },
        {
            group: 'HEALTH',
            items: [
                { key: 'fitness', label: 'Fitness', href: '/fitness.html', icon: '🏋️' }
            ]
        },
        {
            group: 'SYSTEM',
            items: [
                { key: 'system', label: 'System', href: '/system.html', icon: '⚙️' }
            ]
        }
    ];

    /* -------------------------------------------------------
       Build a single nav item (leaf — no children)
    ------------------------------------------------------- */
    function buildLeafItem(item, isActive) {
        const activeCls = isActive ? ' active' : '';
        return `
            <li>
                <a href="${item.href}" class="flex items-center gap-2${activeCls}" title="${item.label}">
                    <span class="sidebar-icon">${item.icon}</span>
                    <span class="menu-label-text">${item.label}</span>
                </a>
            </li>`;
    }

    /* -------------------------------------------------------
       Build a parent item with children (details/summary)
    ------------------------------------------------------- */
    function buildParentItem(item, isActive) {
        const openAttr = isActive ? ' open' : '';
        const summaryActiveCls = isActive ? ' active' : '';
        const childLinks = item.children.map(child => `
                <li>
                    <a href="${child.href}" class="flex items-center gap-2 pl-2" title="${child.label}">
                        <span class="menu-label-text">${child.label}</span>
                    </a>
                </li>`).join('');

        return `
            <li>
                <details${openAttr}>
                    <summary class="flex items-center gap-2${summaryActiveCls}" title="${item.label}">
                        <span class="sidebar-icon">${item.icon}</span>
                        <span class="menu-label-text">${item.label}</span>
                    </summary>
                    <ul>
                        ${childLinks}
                    </ul>
                </details>
            </li>`;
    }

    /* -------------------------------------------------------
       Build the full sidebar <nav> inner HTML
    ------------------------------------------------------- */
    function buildMenuHTML(activeKey) {
        let html = '<ul class="menu menu-sm w-full px-1">';

        MENU_GROUPS.forEach(group => {
            // Group label (hidden when sidebar is collapsed via CSS)
            if (group.group) {
                html += `
                <li class="sidebar-group-label menu-title px-2 pt-3 pb-1 text-xs font-bold uppercase opacity-50">
                    <span>${group.group}</span>
                </li>`;
            }

            group.items.forEach(item => {
                const isActive = item.key === activeKey;
                if (item.children && item.children.length > 0) {
                    html += buildParentItem(item, isActive);
                } else {
                    html += buildLeafItem(item, isActive);
                }
            });
        });

        html += '</ul>';
        return html;
    }

    /* -------------------------------------------------------
       Chevron SVG — direction flips based on sidebar state
    ------------------------------------------------------- */
    function chevronSVG() {
        // Points left when open (to close), right when closed (to open).
        // The icon is rotated via JS in toggleSidebar().
        return `<svg id="sidebarChevron" xmlns="http://www.w3.org/2000/svg" width="16" height="16"
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
                    style="transition:transform 0.25s ease">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/>
                </svg>`;
    }

    /* -------------------------------------------------------
       Hamburger SVG for mobile topbar
    ------------------------------------------------------- */
    function hamburgerSVG() {
        return `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                    class="inline-block w-5 h-5 stroke-current">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M4 6h16M4 12h16M4 18h16"/>
                </svg>`;
    }

    /* -------------------------------------------------------
       Main render — restructures the DOM into drawer layout
    ------------------------------------------------------- */
    function render() {
        const placeholder = document.getElementById('nav-placeholder');
        if (!placeholder) return;

        const activeKey = placeholder.dataset.active || 'home';

        /* --- 1. Collect all body children to move into drawer-content --- */
        const bodyChildren = Array.from(document.body.childNodes).filter(node => {
            if (node.nodeType !== Node.ELEMENT_NODE) return false;
            const id = node.id;
            // Keep toast and loading overlay at body level — do NOT collect them
            if (id === 'toastContainer' || id === 'loadingOverlay') return false;
            return true;
        });

        /* --- 2. Determine initial sidebar state from localStorage --- */
        const sidebarOpen = localStorage.getItem('sidebarOpen') !== 'false';
        const drawerStateClass = sidebarOpen ? 'is-drawer-open' : 'is-drawer-close';
        const chevronRotation = sidebarOpen ? '' : 'transform:rotate(180deg)';

        /* --- 3. Build the drawer root element --- */
        const drawerRoot = document.createElement('div');
        drawerRoot.id = 'drawerRoot';
        drawerRoot.className = `drawer lg:drawer-open ${drawerStateClass}`;

        drawerRoot.innerHTML = `
            <!-- Drawer toggle checkbox (used for mobile overlay) -->
            <input id="sidebar-toggle" type="checkbox" class="drawer-toggle" aria-label="Toggle sidebar">

            <!-- ============ DRAWER CONTENT (main area) ============ -->
            <div class="drawer-content flex flex-col" style="min-height:100vh">

                <!-- Mobile topbar — hidden on lg+ -->
                <div class="navbar bg-base-300 lg:hidden sticky top-0 z-30 shadow" role="banner">
                    <div class="navbar-start">
                        <label for="sidebar-toggle" class="btn btn-ghost btn-sm" aria-label="Open sidebar">
                            ${hamburgerSVG()}
                        </label>
                        <a href="/" class="btn btn-ghost font-bold">ToolBox</a>
                    </div>
                    <div class="navbar-end">
                        <div id="themePickerContainerMobile"></div>
                    </div>
                </div>

                <!-- Page content wrapper — all collected body children go here -->
                <div id="pageContentWrapper" class="p-5 flex-1 max-w-full overflow-x-hidden">
                </div>

            </div>

            <!-- ============ DRAWER SIDE (sidebar) ============ -->
            <div class="drawer-side z-40">
                <!-- Mobile overlay backdrop -->
                <label for="sidebar-toggle" class="drawer-overlay" aria-label="Close sidebar"></label>

                <!-- Sidebar aside -->
                <aside id="sidebarAside" class="sidebar-aside bg-base-200 flex flex-col" style="height:100vh;overflow-y:auto" aria-label="Main navigation">

                    <!-- Sidebar header -->
                    <div class="sidebar-header flex items-center justify-between p-3 border-b border-base-300">
                        <a href="/" class="sidebar-brand font-bold text-lg menu-label-text" tabindex="0">ToolBox</a>
                        <!-- Desktop collapse/expand toggle button -->
                        <button onclick="toggleSidebar()"
                                class="btn btn-ghost btn-xs btn-square hidden lg:flex"
                                title="Toggle sidebar"
                                aria-label="Toggle sidebar">
                            <span id="sidebarChevronWrap" style="${chevronRotation}">${chevronSVG()}</span>
                        </button>
                    </div>

                    <!-- Sidebar nav menu -->
                    <nav class="flex-1 overflow-y-auto py-2" aria-label="Site navigation">
                        ${buildMenuHTML(activeKey)}
                    </nav>

                    <!-- Sidebar footer — theme picker -->
                    <div class="sidebar-footer p-3 border-t border-base-300">
                        <div id="themePickerContainer"></div>
                    </div>

                </aside>
            </div>
        `;

        /* --- 4. Append drawer to body --- */
        document.body.appendChild(drawerRoot);

        /* --- 5. Move collected children into #pageContentWrapper --- */
        const wrapper = drawerRoot.querySelector('#pageContentWrapper');
        bodyChildren.forEach(node => wrapper.appendChild(node));

        /* --- 6. Render theme pickers --- */
        if (typeof renderThemePicker === 'function') {
            renderThemePicker();
            // Also render a copy in the mobile topbar
            _renderMobileThemePicker();
        }

        /* --- 7. Update chevron rotation to match initial state --- */
        _updateChevron(sidebarOpen);
    }

    /* -------------------------------------------------------
       Render theme picker clone into mobile topbar container
    ------------------------------------------------------- */
    function _renderMobileThemePicker() {
        const mobileContainer = document.getElementById('themePickerContainerMobile');
        if (!mobileContainer || typeof DAISY_THEMES === 'undefined') return;

        const current = localStorage.getItem('daisyTheme') || 'dark';
        mobileContainer.innerHTML = `
            <div class="dropdown dropdown-end">
                <div tabindex="0" role="button" class="btn btn-ghost btn-sm gap-1" aria-label="Change theme">
                    <svg width="18" height="18" xmlns="http://www.w3.org/2000/svg" fill="none"
                        viewBox="0 0 24 24" class="inline-block stroke-current">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"/>
                    </svg>
                </div>
                <ul tabindex="0" class="dropdown-content z-[200] menu menu-sm bg-base-200 rounded-box shadow-2xl p-2 w-44 max-h-72 overflow-y-auto flex-nowrap">
                    ${DAISY_THEMES.map(t => `
                        <li><button class="text-xs ${t === current ? 'active font-bold' : ''}"
                            onclick="setTheme('${t}')">${t}</button></li>
                    `).join('')}
                </ul>
            </div>
        `;
    }

    /* -------------------------------------------------------
       Update chevron icon direction based on sidebar state
    ------------------------------------------------------- */
    function _updateChevron(isOpen) {
        const wrap = document.getElementById('sidebarChevronWrap');
        if (!wrap) return;
        // Open = chevron points left (no rotation). Closed = points right (180deg).
        wrap.style.transform = isOpen ? '' : 'rotate(180deg)';
        wrap.style.transition = 'transform 0.25s ease';
        wrap.style.display = 'inline-flex';
    }

    /* -------------------------------------------------------
       Global: toggleSidebar()
       Toggles is-drawer-open <-> is-drawer-close on #drawerRoot
       and persists the state to localStorage.
    ------------------------------------------------------- */
    window.toggleSidebar = function () {
        const root = document.getElementById('drawerRoot');
        if (!root) return;

        const isCurrentlyOpen = root.classList.contains('is-drawer-open');
        const nowOpen = !isCurrentlyOpen;

        root.classList.toggle('is-drawer-open', nowOpen);
        root.classList.toggle('is-drawer-close', !nowOpen);

        localStorage.setItem('sidebarOpen', String(nowOpen));
        _updateChevron(nowOpen);
    };

    /* -------------------------------------------------------
       Close mobile drawer on Escape key
    ------------------------------------------------------- */
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            const toggle = document.getElementById('sidebar-toggle');
            if (toggle && toggle.checked) {
                toggle.checked = false;
            }
        }
    });

    /* -------------------------------------------------------
       Bootstrap: run after DOM is ready
    ------------------------------------------------------- */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', render);
    } else {
        render();
    }

})();
