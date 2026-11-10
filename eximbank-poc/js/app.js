// Shared interactions for Eximbank pages.
(() => {
  const menu = document.getElementById('menuBtn');
  menu?.addEventListener('click', () => document.getElementById('navLinks')?.classList.toggle('open'));
  let toastTimer;
  window.showToast = (message) => { const el = document.getElementById('toast'); if (!el) return; el.textContent = message; el.classList.remove('hidden'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.add('hidden'), 3000); };
  const slides = [
    { eyebrow:'ĐỒNG HÀNH CÙNG BẠN',title:'Tài chính vững vàng,<br>tương lai thịnh vượng',text:'Giải pháp ngân hàng dành riêng cho mọi hành trình của bạn.',primary:'Khám phá dịch vụ →',href:'#services' },
    { eyebrow:'CÙNG BẠN LẬP KẾ HOẠCH',title:'Vững bước cho những<br>dự định tương lai',text:'Lựa chọn giải pháp tài chính phù hợp cho gia đình bạn.',primary:'Tìm hiểu giải pháp →',href:'#offers' },
    { eyebrow:'GIẢI PHÁP CHO DOANH NGHIỆP',title:'Chủ động dòng tiền,<br>phát triển bền vững',text:'Dịch vụ ngân hàng đồng hành cùng hoạt động kinh doanh.',primary:'Khám phá dịch vụ →',href:'#services' }
  ];
  const slider=document.getElementById('heroSlider');
  if(slider){const dots=[...document.querySelectorAll('.hero-dots button')],images=[...slider.querySelectorAll('.hero-slide')];let active=0,timer;const show=i=>{active=(i+images.length)%images.length;images.forEach((x,n)=>x.classList.toggle('active',n===active));dots.forEach((x,n)=>x.classList.toggle('active',n===active));const d=slides[active];document.getElementById('heroEyebrow').textContent=d.eyebrow;document.getElementById('heroTitle').innerHTML=d.title;document.getElementById('heroText').textContent=d.text;const a=document.getElementById('heroPrimary');a.textContent=d.primary;a.href=d.href};const restart=()=>{clearInterval(timer);timer=setInterval(()=>show(active+1),6000)};document.getElementById('heroPrev')?.addEventListener('click',()=>{show(active-1);restart()});document.getElementById('heroNext')?.addEventListener('click',()=>{show(active+1);restart()});dots.forEach((x,i)=>x.addEventListener('click',()=>{show(i);restart()}));slider.addEventListener('mouseenter',()=>clearInterval(timer));slider.addEventListener('mouseleave',restart);show(0);restart()}

  const consultForm=document.getElementById('consultForm');
  if(consultForm){const consent=consultForm.querySelector('[name="consultPurpose"][value="respond_to_request"]'),submit=document.getElementById('consultSubmit');const refresh=()=>{submit.disabled=!consent.checked};consent.addEventListener('change',refresh);refresh();consultForm.addEventListener('submit',event=>{event.preventDefault();if(!consultForm.reportValidity()||!consent.checked)return;const name=document.getElementById('consultName').value.trim();consultForm.closest('.panel').classList.add('hidden');document.getElementById('consultSuccess').classList.remove('hidden');document.getElementById('consultSuccessText').textContent=`Cảm ơn ${name}. Chuyên viên Eximbank sẽ liên hệ theo thông tin bạn đã cung cấp.`;window.scrollTo({top:0,behavior:'smooth'})})}
})();
