// Screen navigation
function showScreen(id){
  window.location.href=id+'.html';
}
// Onboarding stepper
const onbSteps=document.querySelectorAll('.onb-step');
const onbDots=document.querySelectorAll('.onb-dot');
let onbIdx=0;
function nextStep(){
  if(!onbSteps.length)return;
  onbSteps.forEach(s=>s.classList.remove('active'));
  onbDots.forEach(d=>d.classList.remove('active'));
  onbIdx++;
  if(onbIdx>=onbSteps.length)return window.location.href='03-home.html';
  onbSteps[onbIdx].classList.add('active');
  onbDots[onbIdx].classList.add('active');
}
// Tab bar activation
function initTabs(){
  document.querySelectorAll('.tab-item, .tab').forEach(t=>{
    t.addEventListener('click',function(){
      document.querySelectorAll('.tab-item, .tab').forEach(x=>x.classList.remove('active'));
      this.classList.add('active');
    });
  });
}
// Bottom sheet
function openSheet(id){
  const el=document.getElementById(id);
  if(!el)return;
  el.classList.add('open');
  const ov=el.querySelector('.sheet-overlay')||el;
  if(ov!==el)ov.classList.add('open');
}
function closeSheet(id){
  const el=document.getElementById(id);
  if(!el)return;
  el.classList.remove('open');
}
// Toast
function showToast(msg,dur=2000){
  const existing=document.querySelector('.toast');
  if(existing)existing.remove();
  const t=document.createElement('div');t.className='toast show';
  t.innerHTML='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#92d9bb" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>'+msg;
  document.body.appendChild(t);
  setTimeout(()=>t.remove(),dur);
}
// Filter documents
function filterDocs(cat){
  document.querySelectorAll('.filter-chip').forEach(c=>c.classList.remove('active'));
  document.querySelectorAll('.filter-chip').forEach(c=>{
    if(c.textContent.toLowerCase()===cat||(cat==='all'&&c.textContent==='All'))c.classList.add('active');
  });
  document.querySelectorAll('.doc-item, [data-cat]').forEach(el=>{
    if(cat==='all'||el.dataset.cat===cat)el.style.display='flex';
    else el.style.display='none';
  });
}
// Scan processing simulation
function captureScan(){
  window.location.href='07-scan-result.html';
}
// Search
function initSearch(){
  const input=document.getElementById('search-input');
  const results=document.getElementById('search-results');
  if(!input)return;
  const data=[
    {name:'Residence Permit Application 2026',type:'document',status:'translated'},
    {name:'Tax Card 2026',type:'document',status:'translated'},
    {name:'KELA Benefit Statement',type:'letter',status:'pending'},
    {name:'Employment Contract — Node Solutions',type:'document',status:'translated'},
    {name:'Helsinki Housing Agreement',type:'letter',status:'done'},
    {name:'Healthcare Registration',type:'form',status:'pending'},
    {name:'Finnish Tax Return 2025',type:'document',status:'translated'},
    {name:'Bank Account Confirmation',type:'letter',status:'done'},
  ];
  input.addEventListener('input',function(){
    const q=this.value.toLowerCase().trim();
    if(!q||q.length<1){results.innerHTML='<h3>Recent</h3>';return}
    const match=data.filter(d=>d.name.toLowerCase().includes(q));
    if(!match.length){results.innerHTML='<p style="color:var(--muted);text-align:center;padding:32px 0;font-size:14px">No results found</p>';return}
    results.innerHTML=match.map(d=>`
      <div class="result-item" onclick="window.location.href='08-document.html'">
        <div class="icon-box"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#92d9bb" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div>
        <div class="info"><div class="name">${d.name}</div><div class="meta">${d.type} · ${d.status}</div></div>
      </div>
    `).join('');
  });
}
// Language picker
function initLangPicker(){
  document.querySelectorAll('.lang-option').forEach(el=>{
    el.addEventListener('click',function(){
      document.querySelectorAll('.lang-option').forEach(x=>x.classList.remove('selected'));
      this.classList.add('selected');
    });
  });
}
// Document detail tabs
function initDocTabs(){
  document.querySelectorAll('.doc-tab').forEach(t=>{
    t.addEventListener('click',function(){
      document.querySelectorAll('.doc-tab').forEach(x=>x.classList.remove('active'));
      this.classList.add('active');
      document.querySelectorAll('.doc-pane').forEach(p=>p.classList.remove('active'));
      const target=document.getElementById(this.dataset.target);
      if(target)target.classList.add('active');
    });
  });
}
// Auto-init
document.addEventListener('DOMContentLoaded',function(){
  initTabs();
  initSearch();
  initLangPicker();
  initDocTabs();
});
