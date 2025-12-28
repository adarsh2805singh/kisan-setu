// Admin dashboard JS — fetch orders from backend admin endpoints
(function () {
  const base = window.location.origin.replace(/:\d+$/, ':5001'); // default to port 5001 where backend usually runs
  const tokenKey = 'kisan_admin_token';

  function $(sel, ctx=document) { return ctx.querySelector(sel); }
  function $all(sel, ctx=document) { return Array.from((ctx || document).querySelectorAll(sel)); }

  const adminTokenInput = $('#adminToken');
  const saveTokenBtn = $('#saveToken');
  const clearTokenBtn = $('#clearToken');
  const fetchBtn = $('#fetchOrders');
  const refreshBtn = $('#refresh');
  const limitSelect = $('#limit');
  const searchInput = $('#search');
  const tbody = $('#ordersTbody');
  const detailsPre = $('#detailsPre');

  function getSavedToken() {
    return localStorage.getItem(tokenKey) || '';
  }
  function saveToken(t) {
    if (!t) localStorage.removeItem(tokenKey);
    else localStorage.setItem(tokenKey, t);
    adminTokenInput.value = getSavedToken();
  }

  // render a list of orders
  function renderOrders(list) {
    tbody.innerHTML = '';
    if (!list || list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty">No orders</td></tr>';
      return;
    }

    list.forEach(o => {
      const tr = document.createElement('tr');
      const idTd = document.createElement('td'); idTd.textContent = o._id || o.id || 'n/a';
      const userTd = document.createElement('td'); userTd.textContent = o.userEmail || (o.user && (o.user.email || o.user.username)) || o.userId || '-';
      const totalTd = document.createElement('td'); totalTd.textContent = o.total ? '₹ ' + o.total : '-';
      const dateTd = document.createElement('td'); dateTd.textContent = o.orderDate ? new Date(o.orderDate).toLocaleString() : '-';
      const statusTd = document.createElement('td'); statusTd.textContent = o.status || '-';
      const actionsTd = document.createElement('td'); actionsTd.className = 'order-actions';

      const viewBtn = document.createElement('button'); viewBtn.textContent = 'View';
      viewBtn.addEventListener('click', () => fetchOrderDetails(o._id || o.id));

      const copyBtn = document.createElement('button'); copyBtn.textContent = 'Copy ID';
      copyBtn.addEventListener('click', () => navigator.clipboard.writeText(o._id || o.id || '').then(() => alert('Copied')));

      actionsTd.appendChild(viewBtn);
      actionsTd.appendChild(copyBtn);

      tr.appendChild(idTd);
      tr.appendChild(userTd);
      tr.appendChild(totalTd);
      tr.appendChild(dateTd);
      tr.appendChild(statusTd);
      tr.appendChild(actionsTd);

      tbody.appendChild(tr);
    });
  }

  async function fetchOrders() {
    const token = adminTokenInput.value.trim() || getSavedToken();
    const limit = Number(limitSelect.value || 20);
    const q = searchInput.value.trim();

    const url = new URL(base + '/api/admin/orders');
    url.searchParams.set('limit', String(limit));
    if (q) url.searchParams.set('q', q);

    try {
      const headers = {};
      if (token) headers['x-admin-token'] = token;

      const res = await fetch(url.toString(), { headers });
      if (!res.ok) {
        const txt = await res.text().catch(()=>res.statusText);
        alert('Failed to fetch orders: ' + res.status + '\n' + txt);
        return;
      }
      const data = await res.json();
      if (!data || !Array.isArray(data)) {
        // some implementations return { success: true, orders: [...] }
        if (data && Array.isArray(data.orders)) renderOrders(data.orders);
        else {
          alert('Unexpected response shape from server');
        }
        return;
      }
      renderOrders(data);
    } catch (err) {
      alert('Network error: ' + (err.message || err));
      console.error(err);
    }
  }

  async function fetchOrderDetails(id) {
    if (!id) return;
    const token = adminTokenInput.value.trim() || getSavedToken();
    const url = base + '/api/admin/orders/' + encodeURIComponent(id);
    try {
      const headers = {};
      if (token) headers['x-admin-token'] = token;
      const res = await fetch(url, { headers });
      if (!res.ok) {
        const txt = await res.text().catch(()=>res.statusText);
        alert('Failed to fetch order details: ' + res.status + '\n' + txt);
        return;
      }
      const data = await res.json();
      detailsPre.textContent = JSON.stringify(data, null, 2);
    } catch (err) {
      alert('Network error: ' + (err.message || err));
      console.error(err);
    }
  }

  // wire buttons
  saveTokenBtn.addEventListener('click', () => saveToken(adminTokenInput.value.trim()));
  clearTokenBtn.addEventListener('click', () => saveToken(''));
  fetchBtn.addEventListener('click', () => fetchOrders());
  refreshBtn.addEventListener('click', () => fetchOrders());

  // quick load saved token
  adminTokenInput.value = getSavedToken();

  // hotkey: Ctrl+F to focus search
  document.addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') { e.preventDefault(); searchInput.focus(); } });

})();
