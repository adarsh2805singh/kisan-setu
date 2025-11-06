/* Lightweight UI behavior: mobile nav toggle, sign-in modal, product search, and simple cart (localStorage) */

(function () {
    /* Helpers */
    const qs = (s, ctx = document) => ctx.querySelector(s);
    const qsa = (s, ctx = document) => Array.from(ctx.querySelectorAll(s));
    const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));
    const load = (k, defaultVal) => {
        try { return JSON.parse(localStorage.getItem(k)) ?? defaultVal; }
        catch (e) { return defaultVal; }
    };

    /* Mobile nav toggle */
    function initMobileNav() {
        const toggle = qs('.mobile-nav-toggle');
        const nav = qs('.nav');
        if (!toggle || !nav) return;
        toggle.setAttribute('aria-expanded', 'false');
        toggle.addEventListener('click', () => {
            const open = nav.classList.toggle('open');
            toggle.setAttribute('aria-expanded', String(open));
            toggle.classList.toggle('active', open);
        });
        // Close nav when clicking outside on small screens
        document.addEventListener('click', (e) => {
            if (!nav.classList.contains('open')) return;
            if (e.target === toggle || nav.contains(e.target)) return;
            nav.classList.remove('open');
            toggle.setAttribute('aria-expanded', 'false');
            toggle.classList.remove('active');
        });
    }

    /* Modal sign-in */
    function initModal() {
        const openBtn = qs('.signin');
        const modal = qs('.modal');
        if (!openBtn || !modal) return;

        const closeBtn = qs('.modal-close', modal);
        const backdrop = qs('.modal-backdrop', modal);

        function openModal() {
            modal.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';
            // focus first input if present
            const firstInput = qs('input, button, [tabindex]:not([tabindex="-1"])', modal);
            if (firstInput) firstInput.focus();
        }
        function closeModal() {
            modal.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
            openBtn.focus();
        }

        // sign-in form handling
        const form = qs('.signin-form', modal);
        const usernameInput = qs('#username', modal);
        const emailInput = qs('#email', modal);
        if (form && usernameInput) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const username = usernameInput.value.trim();
                const email = emailInput ? emailInput.value.trim() : '';
                if (!username) {
                    showFeedback(usernameInput, 'Please enter a username', 'error');
                    usernameInput.focus();
                    return;
                }
                // persist user (demo-only, no password handling)
                const user = { username, email };
                save('kisan_user', user);
                applyUserToUI(user);
                closeModal();
                showNotification(`Welcome back, ${username}!`, 'success');
            });
        }

        // handle Sign In button click: open modal when signed out, otherwise sign out
        function handleSigninClick(e) {
            e.preventDefault();
            const stored = load('kisan_user', null);
            if (stored && stored.username) {
                if (!confirm('Sign out? This will remove your local data from this device.')) return;
                clearKisanData();
                applyUserToUI(null);
            } else {
                openModal();
            }
        }
        openBtn.addEventListener('click', handleSigninClick);
        if (closeBtn) closeBtn.addEventListener('click', closeModal);
        if (backdrop) backdrop.addEventListener('click', closeModal);

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.getAttribute('aria-hidden') === 'false') closeModal();
        });
    }

    function applyUserToUI(user) {
        const openBtn = qs('.signin');
        if (!openBtn) return;
        if (user && user.username) {
            openBtn.textContent = `Hi, ${user.username}`;
            openBtn.setAttribute('aria-label', `Signed in as ${user.username}`);
        } else {
            openBtn.textContent = 'Sign In';
            openBtn.onclick = null;
        }
    }

    // remove all local app data stored in localStorage and clear runtime state
    function clearKisanData() {
        try {
            const toRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('kisan_')) toRemove.push(key);
            }
            toRemove.forEach(k => localStorage.removeItem(k));
        } catch (err) {
            console.error('Error clearing local storage', err);
        }

        if (window.kisanCart && typeof window.kisanCart.clear === 'function') {
            try { window.kisanCart.clear(); } catch (e) { /* ignore */ }
        }

        const badge = qs('.cart-badge');
        if (badge) { badge.textContent = ''; badge.style.display = 'none'; }
    }

    /* Search/filter products */
    function initSearch() {
        const input = qs('.search-bar input');
        const button = qs('.search-bar button');
        const cards = qsa('.product-card');
        if (!input || !button || cards.length === 0) return;

        function runSearch() {
            const q = input.value.trim().toLowerCase();
            cards.forEach(card => {
                const titleEl = qs('h3', card);
                const text = titleEl ? titleEl.textContent.trim().toLowerCase() : card.textContent.toLowerCase();
                card.style.display = q === '' || text.includes(q) ? '' : 'none';
            });
        }

        button.addEventListener('click', runSearch);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') runSearch();
            if (e.key === 'Escape') { input.value = ''; runSearch(); }
        });
    }

    /* Simple cart (stores items in localStorage) */
    function initCart() {
        const BADGE_KEY = 'kisan_cart';
        const badgeEl = qs('.cart-badge');
        const addButtons = qsa('.product-card .add-to-cart');
        const cartPanel = qs('.cart-panel');
        const cartItemsEl = qs('.cart-items');
        const cartTotalValue = qs('.cart-total-value');
        const cartClose = qs('.cart-close');
        const cartBackdrop = qs('.cart-backdrop');
        const checkoutBtn = qs('.checkout-btn');
        let cart = load(BADGE_KEY, []);

        function updateBadge() {
            const count = cart.reduce((s, it) => s + (it.qty || 1), 0);
            if (badgeEl) {
                badgeEl.textContent = count > 0 ? String(count) : '';
                badgeEl.style.display = count > 0 ? 'inline-block' : 'none';
                badgeEl.setAttribute('aria-label', `${count} items in cart`);
            }
        }

        function saveCart() {
            save(BADGE_KEY, cart);
            updateBadge();
            renderCartPanel();
        }

        if (badgeEl) updateBadge();

        addButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const card = btn.closest('.product-card');
                if (!card) return;
                const title = (qs('h3', card) || { textContent: 'Item' }).textContent.trim();
                const priceAttr = card.getAttribute('data-price');
                const price = priceAttr ? parseFloat(priceAttr) : 0;
                const existing = cart.find(i => i.title === title);
                if (existing) existing.qty = (existing.qty || 1) + 1;
                else cart.push({ title, price: price, qty: 1 });
                saveCart();

                // quick feedback animation
                btn.disabled = true;
                const orig = btn.textContent;
                btn.textContent = 'Added ✓';
                setTimeout(() => { btn.textContent = orig; btn.disabled = false; }, 900);
            });
        });

        function openCart() {
            if (!cartPanel) return;
            cartPanel.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';
            renderCartPanel();
        }
        function closeCart() {
            if (!cartPanel) return;
            cartPanel.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
        }

        if (cartClose) cartClose.addEventListener('click', closeCart);
        if (cartBackdrop) cartBackdrop.addEventListener('click', closeCart);
        // show cart when clicking cart button
        const cartButton = qs('.cart');
        if (cartButton) cartButton.addEventListener('click', (e) => { e.preventDefault(); openCart(); });

        if (checkoutBtn) checkoutBtn.addEventListener('click', () => {
            if (cart.length === 0) return alert('Cart is empty');
            // demo checkout: clear cart and show message
            alert('Checkout demo: order placed');
            cart = [];
            saveCart();
            closeCart();
        });

        // render cart items inside the drawer
        function renderCartPanel() {
            if (!cartItemsEl || !cartTotalValue) return;
            cartItemsEl.innerHTML = '';
            let total = 0;
            cart.forEach((it, idx) => {
                const li = document.createElement('li');
                li.className = 'cart-item';
                const title = document.createElement('div');
                title.className = 'ci-title';
                title.textContent = it.title;
                const qtyWrap = document.createElement('div');
                qtyWrap.className = 'ci-qty';
                const minus = document.createElement('button'); minus.textContent = '-';
                const qty = document.createElement('span'); qty.textContent = it.qty;
                const plus = document.createElement('button'); plus.textContent = '+';
                const remove = document.createElement('button'); remove.textContent = 'Remove';
                qtyWrap.appendChild(minus);
                qtyWrap.appendChild(qty);
                qtyWrap.appendChild(plus);
                qtyWrap.appendChild(remove);
                li.appendChild(title);
                li.appendChild(qtyWrap);
                cartItemsEl.appendChild(li);

                const itemTotal = (it.price || 0) * (it.qty || 1);
                total += itemTotal;

                minus.addEventListener('click', () => {
                    if ((it.qty || 1) <= 1) return;
                    it.qty = (it.qty || 1) - 1;
                    saveCart();
                });
                plus.addEventListener('click', () => {
                    it.qty = (it.qty || 1) + 1;
                    saveCart();
                });
                remove.addEventListener('click', () => {
                    cart.splice(idx, 1);
                    saveCart();
                });
            });
            cartTotalValue.textContent = String(total.toFixed ? total.toFixed(2) : total);
            updateBadge();
        }

        // expose a simple clear function on window for dev/testing
        window.kisanCart = {
            get: () => cart.slice(),
            clear: () => { cart = []; saveCart(); }
        };
        // allow external code to request a refresh of the cart view
        window.kisanCart.refresh = () => { cart = load(BADGE_KEY, []); saveCart(); };
    }

    /* Product variants (mapping product title -> array of {id,name,price}) */
    const VARIANTS = {
        'Wheat': [
            { id: 'wheat-1kg', name: 'Wheat - 1 kg', price: 40 },
            { id: 'wheat-5kg', name: 'Wheat - 5 kg', price: 180 },
            { id: 'wheat-25kg', name: 'Wheat - 25 kg', price: 800 }
        ],
        'Tomato': [
            { id: 'tomato-kg', name: 'Tomato - 1 kg', price: 30 },
            { id: 'tomato-5kg', name: 'Tomato - 5 kg', price: 140 }
        ],
        'Milk': [
            { id: 'milk-1l', name: 'Milk - 1 L', price: 50 },
            { id: 'milk-5l', name: 'Milk - 5 L', price: 240 }
        ],
        'Potato': [
            { id: 'potato-kg', name: 'Potato - 1 kg', price: 20 },
            { id: 'potato-5kg', name: 'Potato - 5 kg', price: 90 }
        ],
        'Pulses': [
            { id: 'pulses-kg', name: 'Pulses - 1 kg', price: 120 },
            { id: 'pulses-5kg', name: 'Pulses - 5 kg', price: 580 }
        ],
        'Rice': [
            { id: 'rice-kg', name: 'Rice - 1 kg', price: 60 },
            { id: 'rice-5kg', name: 'Rice - 5 kg', price: 280 }
        ],
        'Onion': [
            { id: 'onion-kg', name: 'Onion - 1 kg', price: 35 },
            { id: 'onion-5kg', name: 'Onion - 5 kg', price: 160 }
        ],
        'Vegetables': [
            { id: 'veg-mix-1kg', name: 'Mixed Vegetables - 1 kg', price: 70 },
            { id: 'veg-box', name: 'Vegetable Box (assorted)', price: 220 }
        ]
    };

    // Variants modal handling
    function initVariants() {
        const exploreBtns = qsa('.explore-btn');
        const variantsModal = qs('.variants-modal');
        const variantsList = qs('.variants-list');
        const variantsClose = qs('.variants-close');
        const variantsBackdrop = qs('.variants-backdrop');

        function openVariantsFor(title) {
            if (!variantsModal || !variantsList) return;
            variantsList.innerHTML = '';
            const items = VARIANTS[title] || [];
            if (items.length === 0) {
                const li = document.createElement('li');
                li.textContent = 'No variants available';
                variantsList.appendChild(li);
            }
            items.forEach(v => {
                const li = document.createElement('li');
                li.className = 'variant';
                const left = document.createElement('div'); left.className = 'v-left';
                const name = document.createElement('div'); name.className = 'v-title'; name.textContent = v.name;
                const price = document.createElement('div'); price.className = 'v-price'; price.textContent = `₹ ${v.price}`;
                left.appendChild(name);
                left.appendChild(price);
                const btn = document.createElement('button'); btn.textContent = 'Add';
                btn.addEventListener('click', () => {
                    // add variant to cart
                    // reuse cart API by programmatically pushing into local cart storage
                    const existingCart = load('kisan_cart', []);
                    const existing = existingCart.find(it => it.id === v.id);
                    if (existing) existing.qty = (existing.qty || 1) + 1;
                    else existingCart.push({ id: v.id, title: v.name, price: v.price, qty: 1 });
                    save('kisan_cart', existingCart);
                    if (window.kisanCart && typeof window.kisanCart.refresh === 'function') {
                        try { window.kisanCart.refresh(); } catch (e) { /* ignore */ }
                    }
                    // notify and update UI via exposed kisanCart methods
                    if (window.kisanCart && typeof window.kisanCart.clear !== 'undefined') {
                        // trigger a save by calling clear/get pattern; better to call internal save — but we will simulate by reloading the page state
                        try { /* no-op */ } catch (e) {}
                    }
                    // brief feedback
                    btn.disabled = true; btn.textContent = 'Added ✓';
                    setTimeout(() => { btn.disabled = false; btn.textContent = 'Add'; }, 800);
                });
                li.appendChild(left);
                li.appendChild(btn);
                variantsList.appendChild(li);
            });
            variantsModal.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';
        }

        function closeVariants() {
            if (!variantsModal) return;
            variantsModal.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
        }

        exploreBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const card = btn.closest('.product-card');
                if (!card) return;
                const title = (qs('h3', card) || { textContent: 'Item' }).textContent.trim();
                // navigate to product page on same site
                const href = `product.html?product=${encodeURIComponent(title)}`;
                window.location.href = href;
            });
        });

        if (variantsClose) variantsClose.addEventListener('click', closeVariants);
        if (variantsBackdrop) variantsBackdrop.addEventListener('click', closeVariants);
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && qs('.variants-modal') && qs('.variants-modal').getAttribute('aria-hidden') === 'false') closeVariants();
        });
    }

    /* Create account modal handling (robust) */
    function initCreateAccount() {
        const openBtn = qs('.create-account') || qs('#open-create');
        let modal = qs('.create-modal');

        // if modal missing, create it dynamically (keeps page working if HTML was reverted)
        if (!modal) {
            modal = document.createElement('div');
            modal.className = 'create-modal';
            modal.setAttribute('aria-hidden', 'true');
            // ensure hidden by default
            modal.style.display = 'none';
            modal.innerHTML = `
                <div class="modal-backdrop" aria-hidden="true"></div>
                <div class="modal-panel" role="dialog" aria-modal="true" aria-labelledby="create-title">
                    <button class="create-close" aria-label="Close create account">✕</button>
                    <h2 id="create-title">Create an account</h2>
                    <form class="create-form" onsubmit="return false;">
                        <label for="create-username">Username</label>
                        <input id="create-username" type="text" required placeholder="Choose a username">
                        <label for="create-email">Email</label>
                        <input id="create-email" type="email" placeholder="you@example.com">
                        <label for="create-password">Password (optional)</label>
                        <input id="create-password" type="password" placeholder="Create a password">
                        <div style="margin-top:12px; text-align:right;">
                            <button type="submit" class="create-submit">Create account</button>
                        </div>
                    </form>
                    <p style="font-size:0.9rem; margin-top:8px; color:#666;">(Demo: account stored locally in your browser only.)</p>
                </div>
            `;
            document.body.appendChild(modal);
        }

    const openButton = openBtn || qs('.create-account') || qs('#open-create');
        if (!openButton) return;

        const closeBtn = qs('.create-close', modal);
        const backdrop = qs('.modal-backdrop', modal);
        const form = qs('.create-form', modal);
        const usernameInput = qs('#create-username', modal);
        const emailInput = qs('#create-email', modal);

        // ensure modal respects hidden state initially
        if (modal.getAttribute('aria-hidden') !== 'false') {
            modal.style.display = 'none';
        }

        function open() {
            modal.setAttribute('aria-hidden', 'false');
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            if (usernameInput) usernameInput.focus();
        }
        function close() {
            modal.setAttribute('aria-hidden', 'true');
            modal.style.display = 'none';
            document.body.style.overflow = '';
            try { openButton.focus(); } catch (e) {}
        }

        openButton.addEventListener('click', (e) => { e.preventDefault(); open(); });
        if (closeBtn) closeBtn.addEventListener('click', close);
        if (backdrop) backdrop.addEventListener('click', close);
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal.getAttribute('aria-hidden') === 'false') close(); });

        if (form && usernameInput) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const username = usernameInput.value.trim();
                const email = emailInput ? emailInput.value.trim() : '';
                if (!username) { 
                    showFeedback(usernameInput, 'Please choose a username', 'error');
                    usernameInput.focus(); 
                    return; 
                }
                const user = { username, email, createdAt: Date.now() };
                save('kisan_user', user);
                applyUserToUI(user);
                close();
                showNotification(`Account created! Welcome, ${username}!`, 'success');
            });
        }
    }

    /* Notification system */
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => notification.classList.add('show'), 10);
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    function showFeedback(input, message, type = 'error') {
        const existing = input.parentElement.querySelector('.field-feedback');
        if (existing) existing.remove();
        
        const feedback = document.createElement('div');
        feedback.className = `field-feedback field-feedback-${type}`;
        feedback.textContent = message;
        input.parentElement.appendChild(feedback);
        input.classList.add('input-error');
        
        setTimeout(() => {
            feedback.remove();
            input.classList.remove('input-error');
        }, 3000);
    }

    /* Init all */
    function init() {
        initMobileNav();
        initModal();
        initCreateAccount();
        initSearch();
        initCart();
        initVariants();
        initScrollToTop();
        // apply stored user (if any) to update UI
        const stored = load('kisan_user', null);
        if (stored && stored.username) applyUserToUI(stored);
    }

    /* Scroll to top button */
    function initScrollToTop() {
        const scrollBtn = qs('.scroll-to-top');
        if (!scrollBtn) return;

        window.addEventListener('scroll', () => {
            if (window.pageYOffset > 300) {
                scrollBtn.classList.add('visible');
            } else {
                scrollBtn.classList.remove('visible');
            }
        });

        scrollBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
