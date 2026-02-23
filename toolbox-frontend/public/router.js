/* ===========================================================
   SPA ROUTER
   Intercepts same-origin page navigations, swaps
   #pageContentWrapper content, loads page scripts once,
   then calls the registered window.__pageInits[key] handler.
=============================================================*/

(function () {

    // Pages eligible for SPA navigation
    const SPA_PATHS = new Set([
        '/finance.html', '/investments.html', '/calendar.html',
        '/memos.html',   '/pdfs.html',        '/fitness.html',
        '/system.html',  '/admin.html',        '/readme.html'
    ]);

    // Scripts shared on every page — never unload or reload
    const SHARED = new Set(['shared.js', 'router.js', 'nav.js']);

    // Tab-switch functions by page pathname (mirrors nav.js TAB_FN_MAP)
    const TAB_FN_MAP = {
        '/finance.html':     'switchFinanceTab',
        '/investments.html': 'switchInvestmentTab',
    };

    // Track loaded script basenames
    const loaded = new Set();

    function basename(src) {
        try { return new URL(src, location.href).pathname.split('/').pop(); }
        catch (_) { return src; }
    }

    function scanLoadedScripts() {
        document.querySelectorAll('script[src]').forEach(s => {
            try { loaded.add(basename(s.src)); } catch (_) {}
        });
    }
    // Scan now (captures shared scripts already parsed before router.js)
    scanLoadedScripts();
    // Also scan at DOMContentLoaded so page-specific scripts loaded after router.js are tracked
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', scanLoadedScripts);
    } else {
        scanLoadedScripts();
    }

    function loadScript(src) {
        const name = basename(src);
        if (loaded.has(name)) return Promise.resolve();
        loaded.add(name);
        return new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src     = src;
            s.async   = false;
            s.onload  = resolve;
            s.onerror = () => { loaded.delete(name); reject(new Error('Script load failed: ' + src)); };
            document.head.appendChild(s);
        });
    }

    async function navigate(rawUrl) {
        const url = new URL(rawUrl, location.href);

        // Fade out
        const wrapper = document.getElementById('pageContentWrapper');
        if (wrapper) {
            wrapper.style.transition = 'opacity 0.12s ease';
            wrapper.style.opacity    = '0';
        }

        // Run current page cleanup (e.g. clear intervals)
        if (typeof window.__pageCleanup === 'function') {
            window.__pageCleanup();
            window.__pageCleanup = null;
        }

        try {
            const res = await fetch(url.href, { credentials: 'same-origin' });
            if (!res.ok) throw new Error('HTTP ' + res.status);

            const html = await res.text();
            const doc  = new DOMParser().parseFromString(html, 'text/html');

            // Determine active page key
            const ph        = doc.getElementById('nav-placeholder');
            const activeKey = ph ? (ph.dataset.active || 'home') : 'home';

            // Extract tab param from new URL (before pushState)
            const tabParam = url.searchParams.get('tab');
            if (tabParam) {
                if (activeKey === 'finance')     localStorage.setItem('finance_active_tab',     tabParam);
                if (activeKey === 'investments') localStorage.setItem('investments_active_tab', tabParam);
            }

            // Extract body content — skip scripts, toast, overlay
            const frag = document.createDocumentFragment();
            doc.body.childNodes.forEach(n => {
                if (n.nodeType !== Node.ELEMENT_NODE) return;
                if (n.tagName === 'SCRIPT') return;
                if (n.id === 'toastContainer' || n.id === 'loadingOverlay') return;
                frag.appendChild(document.adoptNode(n));
            });

            // Swap content
            if (wrapper) {
                wrapper.innerHTML = '';
                wrapper.appendChild(frag);
            }

            // Update sidebar active state + topbar title
            if (typeof window.__navUpdate === 'function') window.__navUpdate(activeKey);

            // Update document title
            document.title = doc.title;

            // Load page-specific scripts sequentially (preserves dependency order)
            const scriptSrcs = Array.from(doc.querySelectorAll('script[src]'))
                .map(s => s.src)
                .filter(src => !SHARED.has(basename(src)));

            for (const src of scriptSrcs) {
                await loadScript(src);
            }

            // Call page init
            const initFn = window.__pageInits && window.__pageInits[activeKey];
            if (typeof initFn === 'function') initFn();

            // Push history entry
            history.pushState({ activeKey, url: url.href }, '', url.href);

            // Scroll to top
            window.scrollTo(0, 0);

        } catch (err) {
            console.error('[Router] Navigation failed, falling back:', err);
            location.href = url.href;
            return;
        }

        // Fade in
        if (wrapper) {
            requestAnimationFrame(() => {
                wrapper.style.transition = 'opacity 0.18s ease';
                wrapper.style.opacity    = '1';
            });
        }
    }

    /* ── Click interception (bubble phase, after nav.js handles tabs) ── */
    document.addEventListener('click', function (e) {
        // Skip if nav.js already handled this (e.g. same-page tab switch)
        if (e.defaultPrevented) return;

        const link = e.target.closest('a[href]');
        if (!link) return;

        const href = link.getAttribute('href');
        if (!href) return;

        // Skip non-navigating links
        if (href.startsWith('#') || href.startsWith('mailto:') ||
            href.startsWith('javascript:') || link.target || link.download) return;

        const url = new URL(href, location.href);
        if (url.origin !== location.origin) return;

        // Skip auth / external pages
        const p = url.pathname;
        if (!SPA_PATHS.has(p)) return;

        // Skip if a same-page tab-switch function is already defined AND we're on that page
        // (nav.js will handle it without a full nav)
        const tab = link.dataset.navTab;
        if (tab && location.pathname === p) {
            const fnName = TAB_FN_MAP[p];
            if (fnName && typeof window[fnName] === 'function') return;
        }

        e.preventDefault();
        navigate(url.href);
    });

    /* ── Back / Forward ── */
    window.addEventListener('popstate', function (e) {
        const url = (e.state && e.state.url) ? e.state.url : location.href;
        const p   = new URL(url, location.href).pathname;
        if (SPA_PATHS.has(p)) {
            navigate(url);
        } else {
            location.href = url;
        }
    });

    /* ── Seed current history entry ── */
    const ph0     = document.getElementById('nav-placeholder');
    const key0    = ph0 ? (ph0.dataset.active || 'home') : 'home';
    history.replaceState({ activeKey: key0, url: location.href }, '', location.href);

    window.Router = { navigate };

})();
