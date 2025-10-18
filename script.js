// filepath: d:\Websites\cv-generator\script.js
/*
  Minimal runtime that:
  - Loads a selected template folder (figma_basic/ | figma_professional/ | figma_creative/)
  - Inlines template CSS and fixes relative paths for images/assets
  - Injects a small script into the template that listens for postMessage({type:'cvData', payload:{...}})
    to populate elements with data-field attributes or matching ids
  - Posts form data to the iframe so the preview updates
  - Provides print-as-PDF via iframe.contentWindow.print()
*/
(() => {
  const templateMap = {
    basic: 'figma_basic',
    professional: 'figma_professional',
    creative: 'figma_creative'
  };

  // DOM refs
  const templateSelect = document.getElementById('templateSelect');
  const creativeColor = document.getElementById('creativeColor');
  const photoInput = document.getElementById('photo');
  const updatePreviewBtn = document.getElementById('updatePreviewBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  const cvPreview = document.getElementById('cv-preview');

  const firstName = document.getElementById('firstName');
  const lastName = document.getElementById('lastName');
  const address = document.getElementById('address');
  const email = document.getElementById('email');
  const phone = document.getElementById('phone');
  const summary = document.getElementById('summary');
  const skillsInput = document.getElementById('skills');

  const experienceListPreview = document.getElementById('experienceListPreview');
  const experienceInput = document.getElementById('experienceInput');
  const addExperienceBtn = document.getElementById('addExperienceBtn');
  const clearExperienceBtn = document.getElementById('clearExperienceBtn');

  const educationListPreview = document.getElementById('educationListPreview');
  const educationInput = document.getElementById('educationInput');
  const addEducationBtn = document.getElementById('addEducationBtn');
  const clearEducationBtn = document.getElementById('clearEducationBtn');

  let experiences = [];
  let education = [];
  let photoDataUrl = null;
  let iframe = null;
  let iframeReady = false;
  let pendingPayload = null;
  let pendingRetryTimer = null;
  let currentTemplateFolder = '';

  function escapeHtml(s){ return String(s || '').replace(/[&<>"']/g, (m)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
  function renderMiniList(container, list){ if(!container) return; container.innerHTML = list.length ? list.map(it=>`<div>${escapeHtml(it)}</div>`).join('') : ''; }

  function buildData(){
    return {
      firstName: (firstName && firstName.value) || '',
      lastName: (lastName && lastName.value) || '',
      address: (address && address.value) || '',
      email: (email && email.value) || '',
      phone: (phone && phone.value) || '',
      summary: (summary && summary.value) || '',
      skills: ((skillsInput && skillsInput.value) || '').split(',').map(s=>s.trim()).filter(Boolean),
      experiences,
      education,
      creativeColor: (creativeColor && creativeColor.value) || null,
      photo: photoDataUrl
    };
  }

  function postDataToIframe(){
    if(!iframe || !iframe.contentWindow){ pendingPayload = buildData(); return; }
    const payload = buildData();
    if(iframeReady){
      try{ iframe.contentWindow.postMessage({type:'cvData', payload}, '*'); }catch(e){ console.warn(e); }
      pendingPayload = null;
      if(pendingRetryTimer){ clearTimeout(pendingRetryTimer); pendingRetryTimer = null; }
      return;
    }
    pendingPayload = payload;
    if(pendingRetryTimer) return;
    pendingRetryTimer = setTimeout(function retry(){
      if(iframeReady){
        try{ iframe.contentWindow.postMessage({type:'cvData', payload:pendingPayload}, '*'); }catch(e){ console.warn(e); }
        pendingPayload = null;
        pendingRetryTimer = null;
      } else {
        pendingRetryTimer = setTimeout(retry, 200);
      }
    }, 200);
  }

  async function loadTemplate(key){
    iframeReady = false;
    const folder = templateMap[key] || templateMap.basic;
    const indexUrl = `${folder}/index.html`;
    try{
      const res = await fetch(indexUrl);
      if(!res.ok) throw new Error('Template not found: '+indexUrl);
      let html = await res.text();

      // inline main.css if present
      try{
        const cssRes = await fetch(`${folder}/css/main.css`);
        if(cssRes.ok){
          let css = await cssRes.text();
          css = css.replace(/url\((['"]?)(?!https?:|data:)([^'")]+)\1\)/g, (m,q,p)=>`url(${q}${folder}/${p}${q})`);
          if(/<\/head>/i.test(html)) html = html.replace(/<\/head>/i, `<style>${css}</style></head>`);
          else html = `<head><style>${css}</style></head>` + html;
        }
      }catch(e){ /* ignore */ }

      // fix relative asset paths in HTML
      html = html
        .replace(/(<(?:img|source)[^>]*\s)(src\s*=\s*)(["'])(?!https?:|data:)([^"'>]+)\3/gi, (m,p1,p2,q,src)=>`${p1}${p2}${q}${folder}/${src}${q}`)
        .replace(/(<link[^>]*\s)(href\s*=\s*)(["'])(?!https?:|data:)([^"'>]+)\3/gi, (m,p1,p2,q,href)=>`${p1}${p2}${q}${folder}/${href}${q}`)
        .replace(/(<script[^>]*\s)(src\s*=\s*)(["'])(?!https?:|data:)([^"'>]+)\3/gi, (m,p1,p2,q,src)=>`${p1}${p2}${q}${folder}/${src}${q}`);

      // inject helper script to clear template text and accept postMessage
      // Inject small helper script to accept postMessage to populate fields.
      // Improved: only apply accent when the template actually contains [data-accent] and don't force .name to white.
      const helperScript = `
<script>
  (function(){
    function escapeHtml(s){ return String(s || '').replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',\"'\":'&#39;'}[m];}); }

    function clearTemplateText(root){
      try {
        root = root || document.body;
        function inHeading(el){ return !!(el && (el.closest && el.closest('h1,h2,h3,h4,h5,h6'))); }
        var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
          acceptNode: function(node){
            if(!node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
            var parent = node.parentElement;
            if(!parent) return NodeFilter.FILTER_REJECT;
            if(parent.closest('[data-preserve]')) return NodeFilter.FILTER_REJECT;
            if(inHeading(parent)) return NodeFilter.FILTER_REJECT;
            var ban = /^(SCRIPT|STYLE|NOSCRIPT|IMG|SVG|CANVAS|PICTURE|INPUT|TEXTAREA|BUTTON|SELECT|OPTION|H1|H2|H3|H4|H5|H6)$/;
            if(ban.test(parent.tagName)) return NodeFilter.FILTER_REJECT;
            return NodeFilter.FILTER_ACCEPT;
          }
        }, false);
        var nodes = [];
        while(walker.nextNode()) nodes.push(walker.currentNode);
        nodes.forEach(function(n){ n.nodeValue = ''; });

        var els = root.querySelectorAll('*:not(script):not(style):not([data-preserve])');
        els.forEach(function(el){
          if(el.children.length === 0 && el.tagName !== 'IMG' && el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA' && el.tagName !== 'SVG'){
            if(/^H[1-6]$/.test(el.tagName) || inHeading(el)) return;
            if(!el.hasAttribute('data-no-clear')) el.textContent = '';
          }
        });
      } catch(e){ console.warn('clearTemplateText error', e); }
    }

    // Inject small accent stylesheet (appended after template CSS so it can override)
    function ensureAccentStyles(){
      if(document.getElementById('__cv_accent_style')) return;
      var s = document.createElement('style');
      s.id = '__cv_accent_style';
      s.textContent = "\\
      :root { --accent-color: var(--accent-color, #0b6bfd); }\\
      .has-accent [data-accent], [data-accent].accent-applied { background-color: var(--accent-color) !important; border-color: var(--accent-color) !important; }\\
      /* only headings inside accent areas should be forced white for contrast; do NOT force .name */\\
      .has-accent [data-accent] h1, .has-accent [data-accent] h2, .has-accent [data-accent] h3, .has-accent [data-accent] h4, .has-accent [data-accent] h5, .has-accent [data-accent] h6,\\
      .accent-applied h1, .accent-applied h2, .accent-applied h3, .accent-applied h4, .accent-applied h5, .accent-applied h6 { color: #ffffff !important; }\\
      ";
      document.head.appendChild(s);
    }

    function applyAccent(color){
      try {
        // only add accent class/vars when template actually contains accent regions
        var hasAccentRegions = !!document.querySelector('[data-accent]');
        if(color && hasAccentRegions){
          document.documentElement.style.setProperty('--accent-color', color);
          document.body.classList.add('has-accent');
        } else {
          document.documentElement.style.removeProperty('--accent-color');
          document.body.classList.remove('has-accent');
        }
        // per-element fallback for [data-accent] elements only
        document.querySelectorAll('[data-accent]').forEach(function(el){
          if(color){
            el.style.setProperty('--accent-color', color);
            // leave computed background if present, otherwise set fallback
            if(!getComputedStyle(el).backgroundColor || getComputedStyle(el).backgroundColor === 'rgba(0, 0, 0, 0)'){
              el.style.backgroundColor = color;
            }
            el.style.borderColor = color;
            el.classList.add('accent-applied');
          } else {
            el.style.removeProperty('--accent-color');
            el.style.removeProperty('background-color');
            el.style.removeProperty('border-color');
            el.classList.remove('accent-applied');
          }
        });
        ensureAccentStyles();
      } catch(e){ console.warn('applyAccent error', e); }
    }

    function setText(el, v){ if(!el) return; if(el.tagName === 'IMG') el.src = v || el.src || ''; else el.textContent = Array.isArray(v) ? v.join(', ') : (v==null ? '' : v); }
    function renderList(containerSelector, list){
      var container = document.querySelector(containerSelector);
      if(!container) return;
      container.innerHTML = '';
      (list || []).forEach(function(item){
        var div = document.createElement('div');
        div.textContent = item;
        container.appendChild(div);
      });
    }

    function populate(data){
      if(!data) return;
      var fields = ['firstName','lastName','address','email','phone','summary','creativeColor'];
      fields.forEach(function(key){
        var el = document.querySelector('[data-field=\"' + key + '\"]') || document.getElementById(key);
        if(el){
          if(el.tagName === 'IMG') el.src = data[key] || el.src || '';
          else el.textContent = data[key] || '';
        }
      });

      var photoEl = document.querySelector('[data-field=\"photo\"]');
      if(photoEl){
        if(data.photo) photoEl.src = data.photo;
        else { if(photoEl.tagName === 'IMG') photoEl.removeAttribute('src'); else photoEl.textContent = ''; }
      }

      var expContainer = document.querySelector('[data-field=\"experiences\"]') || document.getElementById('experiences');
      if(expContainer){ expContainer.innerHTML = ''; (data.experiences || []).forEach(function(it){ var d=document.createElement('div'); d.textContent = it; expContainer.appendChild(d); }); }

      var eduContainer = document.querySelector('[data-field=\"education\"]') || document.getElementById('education');
      if(eduContainer){ eduContainer.innerHTML = ''; (data.education || []).forEach(function(it){ var d=document.createElement('div'); d.textContent = it; eduContainer.appendChild(d); }); }

      var skillsContainer = document.querySelector('[data-field=\"skills\"]') || document.getElementById('skills');
      if(skillsContainer) skillsContainer.textContent = (data.skills || []).join(', ');

      // apply creative/professional accent via CSS variable and fallbacks
      applyAccent(data.creativeColor);
    }

    if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ clearTemplateText(); });
    else clearTemplateText();

    window.addEventListener('message', function(ev){
      try{
        var msg = ev.data;
        if(msg && msg.type === 'cvData'){
          populate(msg.payload);
        }
      }catch(e){console.warn(e);}
    }, false);

    if(window.parent) try { window.parent.postMessage({ type: 'iframeReady' }, '*'); } catch(e){}
  })();
<\/script>`;

      if(/<\/body>/i.test(html)) html = html.replace(/<\/body>/i, helperScript + '</body>');
      else html += helperScript;

      if(iframe){ try{ cvPreview.removeChild(iframe); }catch(e){} iframe=null; }
      iframe = document.createElement('iframe');
      iframe.style.width='100%'; iframe.style.height='820px'; iframe.style.border='none';
      // allow-modals is required by some browsers so window.print() works from iframe
      iframe.sandbox = 'allow-same-origin allow-scripts allow-popups allow-forms allow-modals';
      iframe.srcdoc = html;
      if(downloadBtn) downloadBtn.style.display = 'inline-block';
      cvPreview.innerHTML=''; cvPreview.appendChild(iframe);

      function handleMessage(e){
        if(!iframe) return;
        if(e.source !== iframe.contentWindow) return;
        if(e.data && e.data.type === 'iframeReady'){ iframeReady = true; postDataToIframe(); window.removeEventListener('message', handleMessage); }
      }
      window.addEventListener('message', handleMessage);
      setTimeout(postDataToIframe, 600);
    }catch(err){
      cvPreview.innerHTML = '<div style="padding:12px;background:#fff;border-radius:8px">Failed to load template: '+escapeHtml(err.message||err)+'</div>';
      console.error(err);
    }
  }

  // populate selects and wire up events
  function initUI(){
    if(templateSelect){
      templateSelect.innerHTML = '<option value="basic">Basic</option><option value="professional">Professional</option><option value="creative">Creative</option>';
      templateSelect.addEventListener('change', ()=> loadTemplate(templateSelect.value));
    }
    if(creativeColor){
      const colors = [
        {name:'Blue', value:'#0b6bfd'},
        {name:'Dark', value:'#111827'},
        {name:'Teal', value:'#0d9488'},
        {name:'Purple', value:'#7c3aed'},
        {name:'Orange', value:'#f97316'}
      ];
      creativeColor.innerHTML = colors.map(c=>`<option value="${c.value}">${c.name}</option>`).join('');
      creativeColor.addEventListener('change', postDataToIframe);
    }

    if(addExperienceBtn) addExperienceBtn.addEventListener('click', ()=>{ const v = experienceInput && experienceInput.value.trim(); if(!v) return; experiences.push(v); if(experienceInput) experienceInput.value=''; renderMiniList(experienceListPreview, experiences); postDataToIframe(); });
    if(clearExperienceBtn) clearExperienceBtn.addEventListener('click', ()=>{ experiences=[]; renderMiniList(experienceListPreview, experiences); postDataToIframe(); });

    if(addEducationBtn) addEducationBtn.addEventListener('click', ()=>{ const v = educationInput && educationInput.value.trim(); if(!v) return; education.push(v); if(educationInput) educationInput.value=''; renderMiniList(educationListPreview, education); postDataToIframe(); });
    if(clearEducationBtn) clearEducationBtn.addEventListener('click', ()=>{ education=[]; renderMiniList(educationListPreview, education); postDataToIframe(); });

    if(photoInput) photoInput.addEventListener('change', (ev)=>{ const f = ev.target.files && ev.target.files[0]; if(!f){ photoDataUrl=null; postDataToIframe(); return; } const reader=new FileReader(); reader.onload=()=>{ photoDataUrl=reader.result; postDataToIframe(); }; reader.readAsDataURL(f); });

    [firstName,lastName,address,email,phone,summary,skillsInput].filter(Boolean).forEach(el=>el.addEventListener('input', postDataToIframe));
    if(updatePreviewBtn) updatePreviewBtn.addEventListener('click', ()=> loadTemplate((templateSelect && templateSelect.value) || 'basic'));
    // Download -> ensure selected template is loaded and populated, inline computed accent styles and force print colors, then print (with fallback)
    if(downloadBtn) downloadBtn.addEventListener('click', async () => {
      try {
        const selected = (templateSelect && templateSelect.value) || 'basic';
        // If preview already shows selected template, don't reload unnecessarily
        if (!iframe || (currentTemplateFolder !== selected)) {
          await loadTemplate(selected);
          // small delay so iframeReady and postDataToIframe run
          await new Promise(r => setTimeout(r, 120));
        }

        // ensure iframe has latest data
        postDataToIframe();

        // wait for images in iframe doc
        const waitForImages = (doc, timeout = 3000) => new Promise(resolve => {
          try {
            const imgs = Array.from((doc && doc.images) || []);
            if (imgs.length === 0) return setTimeout(resolve, 120);
            let remaining = imgs.length;
            const done = () => { if (--remaining <= 0) resolve(); };
            const timer = setTimeout(() => resolve(), timeout);
            imgs.forEach(img => {
              if (img.complete) return done();
              img.addEventListener('load', done, { once: true });
              img.addEventListener('error', done, { once: true });
            });
          } catch (e) { resolve(); }
        });

        const doc = iframe && (iframe.contentDocument || (iframe.contentWindow && iframe.contentWindow.document));
        if (doc) {
          await waitForImages(doc, 3500);
          // inject print-adjust rules to force background/colors printing
          let printStyle = doc.getElementById('__cv_print_style');
          if (!printStyle) {
            printStyle = doc.createElement('style');
            printStyle.id = '__cv_print_style';
            printStyle.textContent = `
              * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
              /* ensure backgrounds defined by variables get considered */
              :root { --_cv_print_dummy: 1; }
            `;
            (doc.head || doc.documentElement).appendChild(printStyle);
          }

          // Inline computed styles for accent areas so printed snapshot matches preview
          try {
            const accentEls = Array.from(doc.querySelectorAll('[data-accent]'));
            accentEls.forEach(el => {
              const cs = doc.defaultView.getComputedStyle(el);
              if (cs.backgroundColor && cs.backgroundColor !== 'rgba(0, 0, 0, 0)') el.style.setProperty('background-color', cs.backgroundColor, 'important');
              if (cs.borderColor) el.style.setProperty('border-color', cs.borderColor, 'important');
              const textColor = cs.color;
              const rgb = (cs.backgroundColor || '').match(/rgba?\(([^)]+)\)/);
              if (rgb) {
                const parts = rgb[1].split(',').map(p => parseFloat(p.trim()));
                const [r,g,b] = parts;
                const luminance = (0.2126*r + 0.7152*g + 0.0722*b);
                if (luminance < 140) {
                  el.style.setProperty('color', '#ffffff', 'important');
                  // only force heading tags to white (do NOT force .name)
                  Array.from(el.querySelectorAll('h1,h2,h3,h4,h5,h6,.title,.summary')).forEach(h => {
                    h.style.setProperty('color', '#ffffff', 'important');
                  });
                } else {
                  if (textColor) el.style.setProperty('color', textColor, 'important');
                }
              } else {
                if (textColor) el.style.setProperty('color', textColor, 'important');
              }
            });

            // also inline styles for elements that use --accent-color variable (fallback)
            const allEls = Array.from(doc.querySelectorAll('*'));
            allEls.forEach(el => {
              const cs = doc.defaultView.getComputedStyle(el);
              // if element uses var(--accent-color) in computed background or border, copy those computed values inline
              const bg = cs.backgroundColor;
              const border = cs.borderColor;
              if (bg && bg !== 'rgba(0, 0, 0, 0)') el.style.setProperty('background-color', bg, 'important');
              if (border && border !== 'rgba(0, 0, 0, 0)') el.style.setProperty('border-color', border, 'important');
            });
          } catch (e) {
            console.warn('inlining accent styles failed', e);
          }

          // tiny delay so DOM updates apply
          await new Promise(r => setTimeout(r, 120));
        }

        // Preferred: print from same iframe (needs allow-modals and same-origin)
        if (iframe && iframe.contentWindow && typeof iframe.contentWindow.print === 'function') {
          try {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
            return;
          } catch (e) {
            console.warn('iframe.print failed, falling back', e);
          }
        }

        // Fallback: open new window with srcdoc, inline computed accent styles from preview (so it matches)
        try {
          const w = window.open('', '_blank');
          if (!w) throw new Error('popup-blocked');
          w.document.open();
          w.document.write(iframe && iframe.srcdoc ? iframe.srcdoc : '<html><body><p>Preview unavailable</p></body></html>');
          w.document.close();
          // wait, then print
          await new Promise(resolve => {
            const onLoad = async () => {
              try { await waitForImages(w.document, 3500); } catch (e) {}
              setTimeout(resolve, 180);
            };
            if (w.document.readyState === 'complete' || w.document.readyState === 'interactive') onLoad();
            else w.addEventListener('load', onLoad, { once: true });
            setTimeout(resolve, 4000);
          });
          try { w.focus(); w.print(); } catch (err) { console.warn('fallback print failed', err); }
        } catch (err) {
          alert('Unable to open print dialog. Ensure popups are allowed and you are running via Live Server.');
        }
      } catch (err) {
        console.error('Download failed', err);
        alert('Failed to prepare CV for download. See console for details.');
      }
    });
  }

  initUI();
  loadTemplate((templateSelect && templateSelect.value) || 'basic');
})();
