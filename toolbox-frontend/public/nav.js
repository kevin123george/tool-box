/* ===========================================================
   NAVIGATION BAR (DaisyUI navbar)
   Renders into <div id="nav-placeholder" data-active="...">
=============================================================*/

(function() {
    const pages = [
        { key: 'home',        label: 'Home',        href: '/' },
        { key: 'memos',       label: 'Memos',       href: '/memos.html' },
        { key: 'finance',     label: 'Finance',     href: '/finance.html' },
        { key: 'investments', label: 'Investments', href: '/investments.html' },
        { key: 'fitness',     label: 'Fitness',     href: '/fitness.html' },
        { key: 'system',      label: 'System',      href: '/system.html' }
    ];

    function render() {
        const placeholder = document.getElementById('nav-placeholder');
        if (!placeholder) return;

        const active = placeholder.dataset.active || 'home';

        // Desktop navbar
        let html = `<div class="navbar bg-base-300 rounded-box shadow mb-4" role="navigation" aria-label="Main navigation">`;
        html += `<div class="navbar-start">`;
        html += `<a href="/" class="btn btn-ghost text-lg font-bold">ToolBox</a>`;
        html += `</div>`;
        html += `<div class="navbar-center hidden md:flex">`;
        html += `<ul class="menu menu-horizontal px-1 gap-1">`;
        pages.forEach(p => {
            const cls = p.key === active ? 'font-bold text-primary' : '';
            html += `<li><a href="${p.href}" class="${cls}">${p.label}</a></li>`;
        });
        html += `</ul>`;
        html += `</div>`;
        html += `<div class="navbar-end">`;
        html += `<div id="themePickerContainer" class="mr-2"></div>`;
        html += `<button id="mobileMenuToggle" class="btn btn-square btn-ghost md:hidden" onclick="toggleMobileNav()" aria-label="Open navigation menu">`;
        html += `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="inline-block w-5 h-5 stroke-current"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>`;
        html += `</button>`;
        html += `</div>`;
        html += `</div>`;

        // Mobile nav overlay
        html += `<div id="mobileNavOverlay" class="fixed inset-0 bg-base-100 z-[1000] hidden flex-col items-center justify-center">`;
        html += `<button class="btn btn-ghost btn-lg absolute top-4 right-4" onclick="toggleMobileNav()" aria-label="Close navigation">&times;</button>`;
        html += `<div class="grid grid-cols-2 gap-3 p-6 max-w-sm w-full">`;
        pages.forEach(p => {
            const cls = p.key === active ? 'btn-primary' : 'btn-ghost';
            html += `<a href="${p.href}" class="btn ${cls}">${p.label}</a>`;
        });
        html += `</div></div>`;

        placeholder.innerHTML = html;

        // Render theme picker after nav is in DOM
        if (typeof renderThemePicker === 'function') {
            renderThemePicker();
        }
    }

    // Mobile nav helpers
    window.toggleMobileNav = function() {
        const overlay = document.getElementById('mobileNavOverlay');
        const toggle = document.getElementById('mobileMenuToggle');
        if (!overlay || !toggle) return;

        if (!overlay.classList.contains('hidden')) {
            overlay.classList.add('hidden');
            overlay.classList.remove('flex');
            document.body.style.overflow = '';
        } else {
            overlay.classList.remove('hidden');
            overlay.classList.add('flex');
            document.body.style.overflow = 'hidden';
        }
    };

    // Close on Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const overlay = document.getElementById('mobileNavOverlay');
            if (overlay && !overlay.classList.contains('hidden')) {
                toggleMobileNav();
            }
        }
    });

    // Close mobile nav on resize to desktop
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
            const overlay = document.getElementById('mobileNavOverlay');
            if (overlay && !overlay.classList.contains('hidden')) {
                overlay.classList.add('hidden');
                overlay.classList.remove('flex');
                document.body.style.overflow = '';
            }
        }
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', render);
    } else {
        render();
    }
})();
