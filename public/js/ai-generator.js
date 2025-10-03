// AI Generator - Parametric Template Support
// Handles "Create" suggestion clicks that open parameter modals

(function () {
  const panel = document.querySelector('.ai-suggestions-panel');
  if (!panel) return;

  function getPromptBox(){ return document.getElementById('designPrompt') || document.getElementById('promptText'); }
  function toNumber(v, def){ const n = Number(v); return Number.isFinite(n) && n>0 ? n : def; }

  function openParamModal(templateId){
    const fields = {
      'rounded-box': [
        {id:'len',label:'Length (mm)',def:40},
        {id:'wid',label:'Width (mm)',def:30},
        {id:'ht', label:'Height (mm)',def:20},
        {id:'r',  label:'Corner radius (mm)',def:3}
      ],
      'cylinder-cap': [
        {id:'d', label:'Diameter (mm)',def:30},
        {id:'h', label:'Height (mm)',def:15}
      ]
    }[templateId] || [
      {id:'len',label:'Length (mm)',def:30},
      {id:'wid',label:'Width (mm)',def:20},
      {id:'ht', label:'Height (mm)',def:10}
    ];

    const inputs = fields.map(f=>`
      <label style="display:block;margin:6px 0;">
        <span>${f.label}</span>
        <input id="param_${f.id}" type="number" min="1" value="${f.def}" style="width:100%;padding:6px;margin-top:4px;">
      </label>
    `).join('');

   const html = `<div style="max-width:420px">${inputs}</div>`;
    if (window.FCModals?.open){
      FCModals.open({
        title: 'Template Parameters',
        content: html,
        buttons: [
          { text:'Cancel', role:'close' },
          { text:'Apply', role:'confirm', variant:'primary', onClick: ()=>{
              const vals = Object.fromEntries(fields.map(f=>[f.id, toNumber(document.getElementById(`param_${f.id}`).value, f.def)]));
              applyTemplateToPrompt(templateId, vals);
            }}
        ]
      });
    } else {
      const vals = Object.fromEntries(fields.map(f=>[f.id, prompt(f.label, String(f.def))]));
      applyTemplateToPrompt(templateId, vals);
    }
  }

  function applyTemplateToPrompt(templateId, p){
    const box = getPromptBox(); if(!box) return;
    let snippet;
    if (templateId === 'rounded-box'){
      snippet = `A rounded-rectangle box ${p.len}×${p.wid}×${p.ht} mm with filleted corners r=${p.r} mm.`;
    } else if (templateId === 'cylinder-cap'){
      snippet = `A cylindrical cap d=${p.d} mm, h=${p.h} mm.`;
    } else {
      snippet = `Parametric part ${p.len}×${p.wid}×${p.ht} mm.`;
    }
    box.value = (box.value ? box.value.trim() + '\n' : '') + snippet;
  }

  panel.addEventListener('click', (e)=>{
    const item = e.target.closest('.suggestion-item'); if(!item) return;
    const action = item.getAttribute('data-action') || '';
    if (action === 'create-template'){
      const tid = item.getAttribute('data-template-id') || 'rounded-box';
      openParamModal(tid);
      return;
    }
    // default: toggle selection adds plain text to prompt
    const txt = item.getAttribute('data-text') || item.textContent.trim();
    const box = getPromptBox(); if(!box) return;
    if (!box.value.includes(txt)) box.value = (box.value ? box.value + ', ' : '') + txt;
  });

  console.log('[ai-generator] Parametric template handler loaded');
})();
