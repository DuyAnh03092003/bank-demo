// MARTI catalog, cart and simulated ShopeePay flow.
(() => {
  const productData = [
    { id:'p1', name:'Tai nghe không dây AirBeat', price:890000, old:1190000, cat:'tech', image:'assets/shop-headphones.png', rating:'4.9', sold:'Đã bán 1,2k' },
    { id:'p2', name:'Bình giữ nhiệt Urban 500ml', price:320000, old:450000, cat:'life', image:'assets/shop-bottle.png', rating:'4.8', sold:'Đã bán 860' },
    { id:'p3', name:'Đèn bàn LED thông minh', price:560000, old:720000, cat:'home', image:'assets/shop-lamp.png', rating:'4.9', sold:'Đã bán 540' },
    { id:'p4', name:'Loa Bluetooth Mini', price:1250000, old:1590000, cat:'tech', image:'assets/shop-headphones.png', rating:'4.7', sold:'Đã bán 2k' },
    { id:'p5', name:'Bộ cốc sứ phong cách', price:275000, old:390000, cat:'home', image:'assets/shop-bottle.png', rating:'4.8', sold:'Đã bán 730' },
    { id:'p6', name:'Túi du lịch gọn nhẹ', price:490000, old:650000, cat:'life', image:'assets/shop-backpack.png', rating:'4.9', sold:'Đã bán 1,1k' },
    { id:'p7', name:'Sạc dự phòng 10.000mAh', price:690000, old:890000, cat:'tech', image:'assets/shop-headphones.png', rating:'4.8', sold:'Đã bán 980' },
    { id:'p8', name:'Máy xay cầm tay', price:420000, old:590000, cat:'home', image:'assets/shop-lamp.png', rating:'4.7', sold:'Đã bán 410' }
  ];
  let cart = {}; let currentCategory = 'all';
  const $ = (id) => document.getElementById(id);
  const money = (value) => new Intl.NumberFormat('vi-VN').format(value) + ' ₫';
  const renderProducts = () => {
    const query = ($('shopSearch').value || '').trim().toLowerCase();
    const list = productData.filter(p => (currentCategory === 'all' || p.cat === currentCategory) && p.name.toLowerCase().includes(query));
    $('shopProducts').innerHTML = list.map(p => `<article class="shop-item"><div class="shop-thumb"><img src="${p.image}" alt="${p.name}" loading="lazy"></div><div class="shop-info"><h3>${p.name}</h3><div><span class="price">${money(p.price)}</span><span class="old-price">${money(p.old)}</span></div><div class="shop-meta">★ ${p.rating}　${p.sold}</div><button class="add-btn" data-add="${p.id}">Thêm vào giỏ</button></div></article>`).join('') || '<div class="empty-state">Không tìm thấy sản phẩm phù hợp.</div>';
  };
  const updateCart = () => {
    $('cartCount').textContent = Object.values(cart).reduce((sum, qty) => sum + qty, 0);
    const rows = Object.entries(cart).map(([id, qty]) => {
      const p = productData.find(item => item.id === id);
      return `<div class="cart-row"><div class="cart-product-thumb"><img src="${p.image}" alt="" loading="lazy"></div><div class="cart-text"><strong>${p.name}</strong><small>${money(p.price)}</small></div><div class="qty"><button data-qty="${id}" data-step="-1">−</button><span>${qty}</span><button data-qty="${id}" data-step="1">+</button></div></div>`;
    }).join('');
    $('cartItems').innerHTML = rows || '<div class="empty-state">Giỏ hàng đang trống.</div>';
    $('cartTotal').textContent = money(Object.entries(cart).reduce((sum, [id, qty]) => sum + productData.find(p => p.id === id).price * qty, 0));
  };
  const addToCart = (id) => { cart[id] = (cart[id] || 0) + 1; updateCart(); window.showToast('Đã thêm sản phẩm vào giỏ hàng.'); };
  document.addEventListener('click', (event) => {
    const add = event.target.closest('[data-add]');
    if (add) addToCart(add.dataset.add);
    const quantity = event.target.closest('[data-qty]');
    if (quantity) { const id = quantity.dataset.qty; cart[id] = (cart[id] || 0) + Number(quantity.dataset.step); if (cart[id] <= 0) delete cart[id]; updateCart(); }
  });
  document.querySelectorAll('.shop-cat').forEach(button => button.addEventListener('click', () => {
    document.querySelectorAll('.shop-cat').forEach(item => item.classList.remove('active')); button.classList.add('active'); currentCategory = button.dataset.cat; renderProducts();
  }));
  $('shopSearch').addEventListener('input', renderProducts); $('searchBtn').addEventListener('click', renderProducts);
  $('openCart').addEventListener('click', () => { updateCart(); $('cartOverlay').classList.remove('hidden'); });
  $('closeCart').addEventListener('click', () => $('cartOverlay').classList.add('hidden'));
  $('cartOverlay').addEventListener('click', (event) => { if (event.target.id === 'cartOverlay') event.currentTarget.classList.add('hidden'); });
  document.querySelectorAll('.pay-method').forEach(label => label.addEventListener('click', () => {
    document.querySelectorAll('.pay-method').forEach(item => item.classList.remove('selected')); label.classList.add('selected'); label.querySelector('input').checked = true;
  }));
  const closeWallet = () => { $('walletPage').classList.add('hidden'); document.title = 'MARTI | Mua sắm trực tuyến'; };
  $('checkoutBtn').addEventListener('click', () => {
    if (!Object.keys(cart).length) { window.showToast('Vui lòng thêm sản phẩm vào giỏ hàng trước.'); return; }
    const method = document.querySelector('input[name="pay"]:checked').value; $('cartOverlay').classList.add('hidden');
    if (method === 'shopeepay') { $('walletPage').classList.remove('hidden'); document.title = 'ShopeePay | Liên kết ví'; }
    else window.showToast('Đã ghi nhận phương thức thanh toán Eximbank.');
  });
  $('walletBack').addEventListener('click', closeWallet); $('walletCancel').addEventListener('click', closeWallet);
  $('walletConfirm').addEventListener('click', () => {
    const phone = $('walletPhone').value.trim(); const account = $('walletAccount').value.trim();
    if (!phone || !account) { window.showToast('Vui lòng nhập số điện thoại và mã khách hàng.'); return; }
    if (!/^0\d{9}$/.test(phone)) { window.showToast('Số điện thoại cần gồm 10 chữ số và bắt đầu bằng số 0.'); $('walletPhone').focus(); return; }
    if (!/^[A-Za-z0-9_-]{4,32}$/.test(account)) { window.showToast('Mã khách hàng cần có từ 4 đến 32 ký tự chữ hoặc số.'); $('walletAccount').focus(); return; }
    closeWallet(); cart = {}; updateCart(); window.showToast('Yêu cầu liên kết ví đã được ghi nhận.');
  });
  renderProducts(); updateCart();
})();
