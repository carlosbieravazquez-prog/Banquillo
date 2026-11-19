/* Presentation only. Auth, permissions and persistence remain in their existing modules. */
(() => {
  'use strict';
  const root = document.querySelector('#landing');
  if (!root) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const field = document.querySelector('#holograms');
  const formations = {
    '4-3-3': [[50,94],[11,79],[36,75],[64,75],[89,79],[26,49],[50,58],[75,49],[32,23],[50,12],[68,23]],
    '4-4-2': [[50,94],[11,79],[36,75],[64,75],[89,79],[17,47],[39,50],[61,50],[83,47],[39,17],[61,17]],
    '3-5-2': [[50,94],[22,76],[50,76],[78,76],[11,44],[31,50],[50,42],[69,50],[89,44],[39,14],[61,14]]
  };
  const positions = formations['4-3-3'];
  const drawLines = points => {
    document.querySelector('.tactical-lines path').setAttribute('d', points.map(([x,y],i) => `${i?'L':'M'}${x*8} ${y*1.9}`).join(' '));
  };
  drawLines(positions);
  positions.forEach(([x,y], i) => {
    const player = document.createElement('div');
    player.className = 'hologram';
    player.style.cssText = `--x:${x}%;--y:${y}%;--delay:${i * .16}s`;
    player.innerHTML = '<svg viewBox="0 0 30 55"><circle cx="15" cy="7" r="4"/><path d="M10 14h10l5 17-4 1-3-10 1 15 2 16h-5l-2-14-1 14H8l2-18V22L6 32l-4-2 6-15z"/></svg>';
    field.append(player);
  });
  root.querySelectorAll('[data-entry]').forEach(link => link.addEventListener('click', event => {
    event.preventDefault();
    const dialog = document.getElementById('acceso');
    dialog.dataset.view = 'auth';
    if (!dialog.open) dialog.showModal();
    if (typeof Auth !== 'undefined' && Auth.state !== 'recovery') {
      Auth.ui.mode = link.dataset.entry;
      Auth.ui.msg = null;
      Auth.render();
    }
    setTimeout(() => root.querySelector('#authSlot input')?.focus({preventScroll:true}), 150);
  }));
  root.querySelector('#formation').addEventListener('change', e => {
    const points = formations[e.target.value];
    field.querySelectorAll('.hologram').forEach((p,i) => {
      p.style.setProperty('--x', `${points[i][0]}%`);
      p.style.setProperty('--y', `${points[i][1]}%`);
    });
    drawLines(points);
  });
  root.querySelectorAll('[data-period]').forEach(button => button.addEventListener('click', () => {
    const recent = button.dataset.period === 'recent';
    [['percent',recent?'60%':'75%'],['games',recent?'5':'12'],['wins',recent?'3':'9'],['draws',recent?'1':'2']].forEach(([key,value]) => {document.getElementById(`stat-${key}`).textContent=value;});
    root.querySelectorAll('[data-period]').forEach(b => {b.classList.toggle('active', b===button);b.setAttribute('aria-pressed',String(b===button));});
  }));
  const access = document.getElementById('acceso');
  const info = document.getElementById('scene-info');
  if (new URLSearchParams(location.search).get('acceso') === 'entrar' && typeof Auth !== 'undefined' && Auth.state !== 'in') {
    access.dataset.view = 'auth';
    Auth.ui.mode = 'login';
    if (!access.open) access.showModal();
    Auth.render();
  }
  root.querySelectorAll('.scene-close').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
  root.querySelectorAll('.scene-dialog').forEach(dialog => dialog.addEventListener('click', event => {
    if (event.target === dialog) {
      const box = dialog.getBoundingClientRect();
      if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
    }
  }));
  root.addEventListener('click', event => {
    const link = event.target.closest('a[href^="#"]');
    if (!link || link.hasAttribute('data-entry')) return;
    const target = document.getElementById(link.getAttribute('href').slice(1));
    if (!target) return;
    event.preventDefault();
    if (target === access || target.id === 'demostraciones') {
      access.dataset.view = target.id === 'demostraciones' ? 'demo' : 'auth';
      if (!access.open) access.showModal();
    } else if (target.classList.contains('l-sec')) {
      const content = target.cloneNode(true);
      content.removeAttribute('id');
      content.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
      content.querySelectorAll('.reveal-ready').forEach(node => node.classList.add('visible'));
      info.querySelector('.scene-info-content').replaceChildren(content);
      if (!info.open) info.showModal();
    }
  });
  new MutationObserver(() => {
    if (typeof Auth !== 'undefined' && Auth.state === 'recovery' && !access.open) {
      access.dataset.view = 'auth';
      access.showModal();
    }
    if (document.body.classList.contains('in-app')) {
      access.close(); info.close();
    }
  }).observe(document.body, {attributes:true,attributeFilter:['class']});
  const fitScene = () => {
    const headerHeight = root.querySelector('.l-top').getBoundingClientRect().height;
    root.style.setProperty('--header-height', `${headerHeight}px`);
    const available = root.querySelector('.cinema').getBoundingClientRect().height;
    root.style.setProperty('--scene-scale', Math.min(1, available / (innerWidth <= 560 ? 810 : 850)));
  };
  new ResizeObserver(fitScene).observe(root.querySelector('.l-top'));
  window.addEventListener('resize', fitScene, {passive:true});
  fitScene();
  let frame = 0;
  const cinema = root.querySelector('.cinema');
  cinema.addEventListener('pointermove', e => {
    if (reduced.matches || e.pointerType !== 'mouse' || frame || document.body.classList.contains('in-app')) return;
    frame = requestAnimationFrame(() => {
      const rect = cinema.getBoundingClientRect();
      cinema.style.setProperty('--mx',`${(e.clientX/innerWidth-.5)*12}px`);
      cinema.style.setProperty('--my',`${((e.clientY-rect.top)/rect.height-.5)*8}px`);
      frame=0;
    });
  },{passive:true});
  cinema.addEventListener('pointerleave',()=>{cinema.style.setProperty('--mx','0px');cinema.style.setProperty('--my','0px');});
  if ('IntersectionObserver' in window && !reduced.matches) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if(entry.isIntersecting){entry.target.classList.add('visible');observer.unobserve(entry.target);}
    }),{threshold:.08});
    root.querySelectorAll('.l-sec .l-in').forEach(section => {section.classList.add('reveal-ready');observer.observe(section);});
  }
})();
