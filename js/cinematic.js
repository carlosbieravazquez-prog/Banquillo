/* Presentation only. Auth, permissions and persistence remain in their existing modules. */
(() => {
  'use strict';
  const root = document.querySelector('#landing');
  if (!root) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const field = document.querySelector('#holograms');
  const positions = [[11,79],[26,39],[40,68],[50,24],[61,68],[75,39],[89,79]];
  positions.forEach(([x,y], i) => {
    const player = document.createElement('div');
    player.className = 'hologram';
    player.style.cssText = `--x:${x}%;--y:${y}%;--delay:${i * .16}s`;
    player.innerHTML = '<svg viewBox="0 0 30 55"><circle cx="15" cy="7" r="4"/><path d="M10 14h10l5 17-4 1-3-10 1 15 2 16h-5l-2-14-1 14H8l2-18V22L6 32l-4-2 6-15z"/></svg>';
    field.append(player);
  });
  root.querySelectorAll('[data-entry]').forEach(link => link.addEventListener('click', () => {
    if (typeof Auth !== 'undefined' && Auth.state !== 'recovery') {
      Auth.ui.mode = link.dataset.entry;
      Auth.ui.msg = null;
      Auth.render();
    }
    setTimeout(() => root.querySelector('#authSlot input')?.focus({preventScroll:true}), 150);
  }));
  root.querySelector('#formation').addEventListener('change', e => {
    const compact = e.target.value !== '4-3-3';
    field.querySelectorAll('.hologram').forEach((p,i) => {
      p.style.setProperty('--x', `${compact ? 13 + i * 12 : positions[i][0]}%`);
      p.style.setProperty('--y', `${compact ? 40 + (i % 2) * 35 : positions[i][1]}%`);
    });
  });
  root.querySelectorAll('[data-period]').forEach(button => button.addEventListener('click', () => {
    const recent = button.dataset.period === 'recent';
    [['percent',recent?'60%':'75%'],['games',recent?'5':'12'],['wins',recent?'3':'9'],['draws',recent?'1':'2']].forEach(([key,value]) => {document.getElementById(`stat-${key}`).textContent=value;});
    root.querySelectorAll('[data-period]').forEach(b => {b.classList.toggle('active', b===button);b.setAttribute('aria-pressed',String(b===button));});
  }));
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
