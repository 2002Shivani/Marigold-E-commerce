(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const money = n => '₹' + n.toLocaleString('en-IN');
  const FREE_AT = 499, FEE = 49;

  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };

  /* ---------- product data, read from the page ---------- */
  const grid = $('.pgrid');
  const products = $$('.card', grid).map((el, i) => ({
    el, order: i, id: el.dataset.id, cat: el.dataset.cat,
    name: $('h4', el).textContent.trim(),
    brand: $('.brandn', el).textContent.trim(),
    emoji: $('.pic', el).firstChild.textContent.trim(),
    price: parseInt($('.price b', el).textContent.replace(/\D/g, ''), 10),
    off: parseInt($('.price u', el).textContent, 10) || 0,
    rating: parseFloat($('.rate b', el).textContent)
  }));
  const byId = id => products.find(p => p.id === id);

  let cart = store.get('mg-cart', {});   // { id: qty }
  let wish = store.get('mg-wish', []);   // [id]
  const view = { cat: 'all', q: '', sort: 'rel' };

  /* ---------- toast ---------- */
  const toastEl = document.body.appendChild(Object.assign(document.createElement('div'), { className: 'toast', role: 'status' }));
  let toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('on'), 2200);
  }

  /* ---------- cart drawer ---------- */
  const overlay = document.body.appendChild(Object.assign(document.createElement('div'), { className: 'overlay' }));
  const drawer = document.body.appendChild(Object.assign(document.createElement('aside'), { className: 'drawer' }));
  drawer.setAttribute('aria-label', 'Shopping cart');
  drawer.setAttribute('aria-hidden', 'true');
  const cartBtn = $('#cartBtn'), wishBtn = $('#wishBtn');

  function openCart() {
    renderCart();
    drawer.classList.add('on'); overlay.classList.add('on');
    drawer.setAttribute('aria-hidden', 'false');
    $('.x', drawer).focus();
  }
  function closeCart() {
    drawer.classList.remove('on'); overlay.classList.remove('on');
    drawer.setAttribute('aria-hidden', 'true');
    cartBtn.focus();
  }

  function setBadge(el, n) { el.textContent = n; el.hidden = n === 0; }

  function renderCart() {
    const items = Object.entries(cart).map(([id, q]) => ({ p: byId(id), q })).filter(x => x.p);
    const count = items.reduce((a, x) => a + x.q, 0);
    const sub = items.reduce((a, x) => a + x.p.price * x.q, 0);
    const fee = sub === 0 || sub >= FREE_AT ? 0 : FEE;
    setBadge($('#cartCount'), count);

    const left = FREE_AT - sub;
    const ship = sub === 0 ? '' : `<div class="ship">${left > 0
      ? `Add <b>${money(left)}</b> more for free delivery`
      : '<b>You’ve unlocked free delivery</b>'}
      <div class="bar2"><i style="width:${Math.min(100, sub / FREE_AT * 100)}%"></i></div></div>`;

    const body = items.length ? items.map(({ p, q }) => `
      <div class="li">
        <div class="th">${p.emoji}</div>
        <div><h4>${p.name}</h4><small>${p.brand}</small><br>
          <span class="qty"><button data-act="dec" data-id="${p.id}" aria-label="Decrease quantity">−</button><span>${q}</span><button data-act="inc" data-id="${p.id}" aria-label="Increase quantity">+</button></span>
          <button class="rm" data-act="rm" data-id="${p.id}">Remove</button></div>
        <b>${money(p.price * q)}</b>
      </div>`).join('')
      : '<div class="mt"><b>🛍</b>Your cart is empty.<br>Add something you like.</div>';

    const foot = items.length ? `<div class="df">
      <div class="row"><span>Subtotal</span><span>${money(sub)}</span></div>
      <div class="row"><span>Delivery</span><span>${fee ? money(fee) : 'Free'}</span></div>
      <div class="row t"><span>Total</span><span>${money(sub + fee)}</span></div>
      <button class="co" data-act="checkout">Place order</button></div>` : '';

    drawer.innerHTML = `<div class="dh"><h3>Your cart (${count})</h3><button class="x" data-act="close" aria-label="Close cart">✕</button></div>${ship}<div class="db">${body}</div>${foot}`;
  }

  function changeQty(id, d) {
    const q = (cart[id] || 0) + d;
    if (q <= 0) delete cart[id]; else cart[id] = q;
    store.set('mg-cart', cart);
    renderCart();
  }

  drawer.addEventListener('click', e => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const { act, id } = b.dataset;
    if (act === 'close') closeCart();
    if (act === 'inc') changeQty(id, 1);
    if (act === 'dec') changeQty(id, -1);
    if (act === 'rm') changeQty(id, -(cart[id] || 0));
    if (act === 'checkout') {
      cart = {}; store.set('mg-cart', cart); renderCart(); closeCart();
      toast('Order placed. This is a demo, so nothing was charged.');
    }
  });
  overlay.addEventListener('click', closeCart);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && drawer.classList.contains('on')) closeCart(); });
  cartBtn.addEventListener('click', e => { e.preventDefault(); openCart(); });

  /* ---------- add to cart + wishlist ---------- */
  products.forEach(p => {
    const add = $('.add', p.el), heart = $('.heart', p.el);
    add.addEventListener('click', () => {
      cart[p.id] = (cart[p.id] || 0) + 1;
      store.set('mg-cart', cart);
      renderCart();
      add.textContent = 'Added ✓'; add.classList.add('done');
      setTimeout(() => { add.textContent = 'Add to cart'; add.classList.remove('done'); }, 1200);
      toast(`${p.name.split(',')[0]} added to cart`);
    });
    heart.addEventListener('click', () => {
      const i = wish.indexOf(p.id);
      if (i > -1) wish.splice(i, 1); else wish.push(p.id);
      store.set('mg-wish', wish);
      syncWish();
      toast(i > -1 ? 'Removed from saved items' : 'Saved for later');
      if (view.cat === 'saved') applyView();
    });
  });

  function syncWish() {
    products.forEach(p => {
      const h = $('.heart', p.el), on = wish.includes(p.id);
      h.classList.toggle('on', on); h.textContent = on ? '♥' : '♡'; h.setAttribute('aria-pressed', on);
    });
    setBadge($('#wishCount'), wish.length);
  }
  wishBtn.addEventListener('click', e => { e.preventDefault(); setCat('saved', true); });

  /* ---------- filter, search, sort ---------- */
  const emptyEl = grid.appendChild(Object.assign(document.createElement('div'), { className: 'empty' }));
  const title = $('#productsTitle');
  const catSelect = $('#catSelect');
  const labels = { all: 'Picked for you', saved: 'Your saved items', deals: 'Today’s deals' };

  function matches(p) {
    const q = view.q.trim().toLowerCase();
    if (q && !(p.name + ' ' + p.brand).toLowerCase().includes(q)) return false;
    if (view.cat === 'all') return true;
    if (view.cat === 'saved') return wish.includes(p.id);
    if (view.cat === 'deals') return p.off >= 40;
    return p.cat === view.cat;
  }

  function applyView() {
    const sorters = {
      rel: (a, b) => a.order - b.order,
      low: (a, b) => a.price - b.price,
      high: (a, b) => b.price - a.price,
      off: (a, b) => b.off - a.off,
      rate: (a, b) => b.rating - a.rating
    };
    const list = products.filter(matches).sort(sorters[view.sort]);
    products.forEach(p => { p.el.hidden = true; });
    list.forEach(p => { p.el.hidden = false; grid.insertBefore(p.el, emptyEl); });

    const catName = labels[view.cat] || (view.cat[0].toUpperCase() + view.cat.slice(1));
    title.textContent = view.q ? `Results for “${view.q}”` : (labels[view.cat] || catName);
    emptyEl.hidden = list.length > 0;
    emptyEl.textContent = view.cat === 'saved' && !view.q
      ? 'Nothing saved yet. Tap the heart on any product to keep it here.'
      : `No products found${view.q ? ` for “${view.q}”` : ` in ${catName}`}. Try a different search or category.`;

    $$('.cats a').forEach(a => a.classList.toggle('on', a.dataset.filter === view.cat));
    if (catSelect) catSelect.value = ['all', 'electronics', 'fashion', 'home'].includes(view.cat) ? view.cat : 'all';
  }

  function setCat(cat, scroll) {
    view.cat = cat;
    applyView();
    if (scroll) $('#new').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion:reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  }

  document.addEventListener('click', e => {
    const f = e.target.closest('[data-filter]');
    if (f) { e.preventDefault(); setCat(f.dataset.filter, !f.closest('.cats')); }
  });
  catSelect.addEventListener('change', () => setCat(catSelect.value, false));
  $('#sortSel').addEventListener('change', e => { view.sort = e.target.value; applyView(); });

  const searchForm = $('.search'), searchInput = $('input', searchForm);
  searchInput.addEventListener('input', () => { view.q = searchInput.value; applyView(); });
  searchForm.addEventListener('submit', e => {
    e.preventDefault();
    view.q = searchInput.value;
    applyView();
    $('#new').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  /* ---------- deal countdown (to local midnight) ---------- */
  const pad = n => String(n).padStart(2, '0');
  function tick() {
    const now = new Date(), end = new Date(now);
    end.setHours(24, 0, 0, 0);
    const s = Math.floor((end - now) / 1000);
    $('#hh').textContent = pad(Math.floor(s / 3600));
    $('#mm').textContent = pad(Math.floor(s % 3600 / 60));
    $('#ss').textContent = pad(s % 60);
  }
  tick(); setInterval(tick, 1000);

  /* ---------- newsletter ---------- */
  $('.news form').addEventListener('submit', e => {
    e.preventDefault();
    const input = $('input', e.target);
    if (!/^\S+@\S+\.\S+$/.test(input.value)) { toast('Enter a valid email address'); input.focus(); return; }
    toast('Subscribed. Look out for our Friday email.');
    e.target.reset();
  });

  /* ---------- init ---------- */
  syncWish();
  renderCart();
  applyView();
})();
