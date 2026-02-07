/* ===========================================================
   NAVIGATION BAR
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

        // Desktop nav
        let html = '<nav class="nav-bar" role="navigation" aria-label="Main navigation">';
        html += '<div class="nav-links">';
        pages.forEach(p => {
            const cls = p.key === active ? 'nav-link active' : 'nav-link';
            html += `<a href="${p.href}" class="${cls}">${p.label}</a>`;
        });
        html += '</div>';
        html += '</nav>';

        // Mobile nav toggle + overlay
        html += '<button id="mobileMenuToggle" class="mobile-menu-toggle" onclick="toggleMobileNav()" aria-label="Open navigation menu">☰</button>';
        html += '<div id="mobileNavOverlay" class="mobile-nav-overlay">';
        html += '<h2 style="text-align:center; margin:0 0 20px 0; font-size:14px;">NAVIGATION</h2>';
        html += '<div class="mobile-nav-grid">';
        pages.forEach(p => {
            const cls = p.key === active ? 'mobile-nav-item active' : 'mobile-nav-item';
            html += `<a href="${p.href}" class="${cls}">${p.label}</a>`;
        });
        html += '</div></div>';

        placeholder.innerHTML = html;
    }

    // Mobile nav helpers
    window.toggleMobileNav = function() {
        const overlay = document.getElementById('mobileNavOverlay');
        const toggle = document.getElementById('mobileMenuToggle');
        if (!overlay || !toggle) return;

        if (overlay.classList.contains('show')) {
            overlay.classList.remove('show');
            toggle.classList.remove('open');
            toggle.innerHTML = '☰';
            document.body.style.overflow = '';
        } else {
            overlay.classList.add('show');
            toggle.classList.add('open');
            toggle.innerHTML = '×';
            document.body.style.overflow = 'hidden';
        }
    };

    // Close on Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const overlay = document.getElementById('mobileNavOverlay');
            if (overlay?.classList.contains('show')) {
                toggleMobileNav();
            }
        }
    });

    // Close mobile nav on resize to desktop
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
            const overlay = document.getElementById('mobileNavOverlay');
            const toggle = document.getElementById('mobileMenuToggle');
            if (overlay?.classList.contains('show')) {
                overlay.classList.remove('show');
                toggle?.classList.remove('open');
                if (toggle) toggle.innerHTML = '☰';
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
