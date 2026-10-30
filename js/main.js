/* ==========================================================================
   Tinary · main.js
   Dirección "Doble capa": preciso, sereno y firme.
   Orden: ayudantes y tokens · Lenis y reloj · lo que sirve siempre ·
   menos movimiento · estados iniciales y scroll · firma de la portada.
   ========================================================================== */
(() => {
  'use strict';

  // ---------- 1. Ayudantes, banderas y tokens de movimiento ----------
  const d = document;
  const html = d.documentElement;
  const $ = (s, c = d) => c.querySelector(s);
  const $$ = (s, c = d) => [...c.querySelectorAll(s)];
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGSAP = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  const safe = (fn) => { try { return fn(); } catch (e) { console.warn('[tinary]', e); return null; } };
  const ANCHO = '(min-width: 960px)';
  const ANGOSTO = '(max-width: 959px)';

  if (!hasGSAP) html.classList.remove('js', 'hv');   // sin GSAP: todo visible y quieto (y la portada de siempre)
  else {
    gsap.registerPlugin(ScrollTrigger);
    if (window.SplitText) gsap.registerPlugin(SplitText);
    ScrollTrigger.config({ ignoreMobileResize: true });
  }
  if (RM) html.classList.add('sin-movimiento');

  // Ficha "Doble capa". Sin rebotes, salvo el clic del cerrojo (pop).
  const M = { ease: 'power3.inOut', easeIO: 'power4.inOut', pop: 'back.out(1.3)', dur: 0.8, stagger: 0.07, dist: 18, lerp: 0.11 };

  // ---------- 2. Scroll con inercia y reloj compartido ----------
  let lenis = null;
  if (hasGSAP && !RM && window.Lenis && M.lerp) {
    lenis = new Lenis({ lerp: M.lerp, smoothWheel: true, wheelMultiplier: 1 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  const tickers = new Set();
  let lastT = performance.now();
  const loop = (now) => {
    const dt = Math.min((now - lastT) / 1000, 0.1);
    lastT = now;
    tickers.forEach((fn) => fn(dt, now));
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);

  const scrollBoost = (cap, k) => {
    const s = { boost: 0, dir: 1 };
    let last = window.scrollY;
    const on = (y, v) => {
      const vel = v !== undefined ? v : y - last;
      last = y;
      if (Math.abs(vel) > 0.5) s.dir = vel > 0 ? 1 : -1;
      s.boost = Math.min(Math.max(s.boost, Math.abs(vel) * k), cap);
    };
    if (lenis) lenis.on('scroll', (l) => on(l.scroll, l.velocity));
    else window.addEventListener('scroll', () => on(window.scrollY), { passive: true });
    return s;
  };

  // ---------- 3. Lo que sirve siempre (con o sin animación) ----------

  // 3.1 Los botones "Agenda un diagnóstico" dejan el formulario listo con su servicio y su origen
  const prepararFormulario = (a) => {
    const form = $('[data-form]');
    if (!form) return;
    if (a.hasAttribute('data-servicio')) form.elements.servicio.value = a.dataset.servicio;
    if (a.dataset.origen) form.elements.origen.value = a.dataset.origen;
  };

  // 3.2 Enlaces internos suaves
  const scrollToEl = (el, instant) => {
    if (lenis) lenis.scrollTo(el, { offset: 0, duration: instant ? 0 : 1.4, immediate: !!instant });
    else if (typeof el === 'number') window.scrollTo({ top: el, behavior: RM || instant ? 'auto' : 'smooth' });
    else el.scrollIntoView({ behavior: RM || instant ? 'auto' : 'smooth' });
  };
  d.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const hash = a.getAttribute('href');
    const el = hash.length > 1 && d.getElementById(hash.slice(1));
    if (!el) return;
    e.preventDefault();
    prepararFormulario(a);
    scrollToEl(el.getClientRects().length ? el : 0);   // #portada se oculta en escritorio: ir arriba
    history.replaceState(null, '', hash);
  });

  // 3.3 Navegación: se vuelve sólida al bajar, se esconde al bajar y vuelve al subir
  let menuAbierto = false;
  safe(() => {
    const nav = $('[data-nav]');
    let ultimo = window.scrollY;
    const alScroll = (y) => {
      nav.classList.toggle('is-solida', y > 40 || menuAbierto);
      const delta = y - ultimo;
      if (Math.abs(delta) < 6) return;
      nav.classList.toggle('is-escondida', !menuAbierto && delta > 0 && y > 520);
      ultimo = y;
    };
    if (lenis) lenis.on('scroll', (l) => alScroll(l.scroll));
    else window.addEventListener('scroll', () => alScroll(window.scrollY), { passive: true });
    nav.addEventListener('focusin', () => nav.classList.remove('is-escondida'));
    alScroll(window.scrollY);
  });

  // 3.4 Menú del celular
  safe(() => {
    const boton = $('[data-menu-boton]');
    const menu = $('[data-menu]');
    const texto = $('[data-menu-texto]');
    const nav = $('[data-nav]');
    if (!boton || !menu) return;
    const abrir = (si) => {
      menuAbierto = si;
      boton.setAttribute('aria-expanded', String(si));
      texto.textContent = si ? 'Cerrar menú' : 'Abrir menú';
      menu.hidden = !si;
      $$('main, .pie, .barra-movil').forEach((el) => { el.inert = si; });
      nav.classList.remove('is-escondida');
      nav.classList.toggle('is-solida', si || window.scrollY > 40);
      if (si) {
        if (lenis) lenis.stop();
        if (hasGSAP && !RM) {
          gsap.fromTo(menu, { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.6, ease: M.easeIO });
          gsap.fromTo($$('.menu__links a, .menu__pie > *', menu), { y: 28, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, stagger: 0.05, ease: M.ease, delay: 0.18 });
        }
      } else if (lenis) lenis.start();
    };
    boton.addEventListener('click', () => abrir(!menuAbierto));
    menu.addEventListener('click', (e) => { if (e.target.closest('a')) abrir(false); });
    d.addEventListener('keydown', (e) => { if (e.key === 'Escape' && menuAbierto) { abrir(false); boton.focus(); } });
    matchMedia(ANCHO).addEventListener('change', (mq) => { if (mq.matches && menuAbierto) abrir(false); });
  });

  // 3.5 Preguntas frecuentes: una abierta a la vez, con la altura real
  safe(() => {
    const items = $$('.qa');
    items.forEach((qa, n) => {
      const b = $('.qa__q', qa);
      const a = $('.qa__a', qa);
      a.id = `qa-${n + 1}`;
      a.setAttribute('role', 'region');
      b.setAttribute('aria-controls', a.id);
      a.inert = true;
      b.addEventListener('click', () => {
        const open = !qa.classList.contains('is-open');
        items.forEach((o) => {
          if (o === qa || !o.classList.contains('is-open')) return;
          o.classList.remove('is-open');
          $('.qa__q', o).setAttribute('aria-expanded', 'false');
          $('.qa__a', o).inert = true;
        });
        qa.classList.toggle('is-open', open);
        b.setAttribute('aria-expanded', String(open));
        a.inert = !open;
        if (hasGSAP) setTimeout(() => ScrollTrigger.refresh(), 650);
      });
    });
    const first = items[0];
    if (first) {
      first.classList.add('is-open');
      $('.qa__q', first).setAttribute('aria-expanded', 'true');
      $('.qa__a', first).inert = false;
    }
    requestAnimationFrame(() => { html.classList.add('qa-listo'); if (hasGSAP) ScrollTrigger.refresh(); });
  });

  // 3.6 Formulario: arma el mensaje y abre el correo hacia contacto@tinary.cl
  safe(() => {
    const form = $('[data-form]');
    if (!form) return;
    const f = form.elements;
    const error = $('[data-form-error]', form);
    const ok = $('[data-form-ok]', form);
    const obligatorios = [f.nombre, f.empresa];
    obligatorios.forEach((el) => el.addEventListener('input', () => {
      if (el.value.trim()) el.removeAttribute('aria-invalid');
      if (obligatorios.every((o) => o.value.trim())) error.hidden = true;
    }));
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const faltan = obligatorios.filter((el) => !el.value.trim());
      obligatorios.forEach((el) => { if (!el.value.trim()) el.setAttribute('aria-invalid', 'true'); });
      if (faltan.length) {
        error.textContent = 'Escribe tu nombre y tu empresa para continuar.';
        error.hidden = false;
        faltan[0].focus();
        return;
      }
      error.hidden = true;
      const servicio = f.servicio.value;
      const lineas = ['Hola Tinary, quiero agendar un diagnóstico de seguridad.', ''];
      const add = (etiqueta, valor) => { if (valor) lineas.push(`${etiqueta}: ${valor}`); };   // solo lo que llenó
      add('Nombre', f.nombre.value.trim());
      add('Empresa', f.empresa.value.trim());
      add('Contacto', f.contacto.value.trim());
      add('Servicio', servicio);
      add('Mensaje', f.mensaje.value.trim());
      lineas.push('', `Enviado desde: ${f.origen.value || 'Contacto'} (sitio web)`);
      const asunto = `Diagnóstico de seguridad: ${servicio || 'consulta general'}`;
      window.location.href = `mailto:contacto@tinary.cl?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(lineas.join('\r\n'))}`;
      ok.hidden = false;
      if (hasGSAP && !RM) gsap.fromTo(ok, { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: M.ease });
    });
  });

  // 3.7 Barra fija del celular: aparece después de la portada y se esconde en Contacto
  safe(() => {
    const bar = $('[data-barra]');
    const startEl = $('[data-cta-inicio]') || $('.hero');
    const endEl = $('#contacto');
    if (!bar || !startEl || !('IntersectionObserver' in window)) return;
    let past = false;
    let atEnd = false;
    const update = () => {
      const on = past && !atEnd;
      bar.classList.toggle('is-visible', on);
      bar.setAttribute('aria-hidden', String(!on));
      $$('a, button', bar).forEach((el) => { el.tabIndex = on ? 0 : -1; });
    };
    new IntersectionObserver(([e]) => {
      past = !e.isIntersecting && e.boundingClientRect.top < 0;
      update();
    }).observe(startEl);
    if (endEl) new IntersectionObserver(([e]) => { atEnd = e.isIntersecting; update(); }, { threshold: 0.12 }).observe(endEl);
    update();
  });

  // 3.8 Cintas que se deslizan sin fin y aceleran con el scroll (quietas con menos movimiento)
  safe(() => {
    if (RM) return;
    const tracks = $$('[data-marquee]').map((track) => ({
      track,
      speed: +track.dataset.speed || 40,
      rev: track.hasAttribute('data-reverse') ? -1 : 1,
      x: 0, w: 0, visible: true,
    }));
    if (!tracks.length) return;
    const measure = () => tracks.forEach((m) => { m.w = m.track.firstElementChild.getBoundingClientRect().width; });
    measure();
    window.addEventListener('resize', measure);
    if (d.fonts) d.fonts.ready.then(measure);
    window.addEventListener('load', measure);
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((ens) => ens.forEach((en) => {
        const m = tracks.find((t) => t.track === en.target);
        if (m) m.visible = en.isIntersecting;
      }), { rootMargin: '120px' });
      tracks.forEach((m) => io.observe(m.track));
    }
    const s = scrollBoost(50, 0.8);
    tickers.add((dt) => {
      s.boost *= 0.9;
      tracks.forEach((m) => {
        if (!m.visible || !m.w) return;
        m.x -= m.speed * (1 + s.boost / 8) * dt * m.rev * s.dir;
        if (m.x <= -m.w) m.x += m.w;
        if (m.x > 0) m.x -= m.w;
        m.track.style.transform = `translate3d(${m.x.toFixed(2)}px,0,0)`;   // marca sobria: no se inclina
      });
    });
  });

  // 3.9 Preguntas de Ethical hacking: una a la vez, con flechas; con movimiento, avanzan solas
  safe(() => {
    const caja = $('[data-preguntas]');
    if (!caja) return;
    if (RM) { caja.classList.add('is-lista'); return; }   // menos movimiento: las cinco preguntas a la vista
    const items = $$('.eh__pregunta', caja);
    const num = $('[data-pregunta-num]', caja);
    const barra = $('[data-pregunta-barra]', caja);
    let i = 0;
    let animando = false;
    let barraTl = null;
    const ir = (n, dir) => {
      if (animando || n === i) return;
      const sale = items[i];
      const entra = items[n];
      i = n;
      num.textContent = String(n + 1).padStart(2, '0');
      entra.classList.add('is-activa');
      if (hasGSAP && !RM) {
        animando = true;
        gsap.timeline({ onComplete: () => { sale.classList.remove('is-activa'); gsap.set(sale, { clearProps: 'transform,opacity' }); animando = false; } })
          .fromTo(sale, { yPercent: 0, opacity: 1 }, { yPercent: -70 * dir, opacity: 0, duration: 0.55, ease: M.easeIO }, 0)
          .fromTo(entra, { yPercent: 70 * dir, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.7, ease: M.easeIO }, 0.1)
          .fromTo(num, { yPercent: 60 * dir, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.5, ease: M.ease }, 0.1);
      } else sale.classList.remove('is-activa');
    };
    const siguiente = () => ir((i + 1) % items.length, 1);
    const anterior = () => ir((i - 1 + items.length) % items.length, -1);
    $('[data-pregunta-next]', caja).addEventListener('click', () => { siguiente(); if (barraTl) barraTl.restart(); });
    $('[data-pregunta-prev]', caja).addEventListener('click', () => { anterior(); if (barraTl) barraTl.restart(); });
    if (!hasGSAP || RM) return;
    let enVista = false;
    let encima = false;
    barraTl = gsap.fromTo(barra, { scaleX: 0 }, { scaleX: 1, duration: 4.8, ease: 'none', paused: true,
      onComplete: () => { siguiente(); barraTl.restart(); if (!enVista || encima) barraTl.pause(); } });
    const decidir = () => { if (enVista && !encima) barraTl.play(); else barraTl.pause(); };
    ScrollTrigger.create({ trigger: caja, start: 'top 85%', end: 'bottom 15%', onToggle: (st) => { enVista = st.isActive; decidir(); } });
    caja.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') { encima = true; decidir(); } });
    caja.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') { encima = false; decidir(); } });
    caja.addEventListener('focusin', () => { encima = true; decidir(); });
    caja.addEventListener('focusout', () => { encima = false; decidir(); });
  });

  // 3.10 El trazo de la portada: sale de una esquina recta del perímetro y termina junto al botón
  const r1 = (n) => Math.round(n * 10) / 10;
  const trazarCamino = () => {
    const hero = $('.hero');
    const svg = $('.hero .camino');
    const arte = $('[data-arte]');
    const hasta = $('[data-camino-hasta]');
    if (!hero || !svg || !arte || !hasta) return null;
    const h = hero.getBoundingClientRect();
    const r = arte.getBoundingClientRect();
    const b = hasta.getBoundingClientRect();
    if (!r.width || !b.width) return null;
    const k = r.width / 640;
    const ancho = matchMedia(ANCHO).matches;
    const A = ancho
      ? { x: r.left + 20 * k - h.left, y: r.top + 620 * k - h.top }
      : { x: r.left + 620 * k - h.left, y: r.top + 20 * k - h.top };
    const B = { x: b.right - h.left + 22, y: b.top - h.top + b.height / 2 };
    const R = 18;
    let ruta;
    if (ancho) {
      const X = B.x + 46;
      const dy = B.y - A.y;
      if (Math.abs(dy) < 3 || A.x <= X + R) ruta = `M${r1(A.x)},${r1(B.y)} H${r1(B.x)}`;
      else {
        const s = Math.sign(dy);
        const rr = Math.min(R, Math.abs(dy) / 2);
        ruta = `M${r1(A.x)},${r1(A.y)} H${r1(X + rr)} Q${r1(X)},${r1(A.y)} ${r1(X)},${r1(A.y + s * rr)} V${r1(B.y - s * rr)} Q${r1(X)},${r1(B.y)} ${r1(X - rr)},${r1(B.y)} H${r1(B.x)}`;
      }
    } else {
      const sy = Math.sign(B.y - A.y) || -1;
      const sx = Math.sign(B.x - A.x) || -1;
      const rr = Math.min(R, Math.abs(B.y - A.y) / 2, Math.abs(B.x - A.x) / 2);
      ruta = `M${r1(A.x)},${r1(A.y)} V${r1(B.y - sy * rr)} Q${r1(A.x)},${r1(B.y)} ${r1(A.x + sx * rr)},${r1(B.y)} H${r1(B.x)}`;
    }
    svg.setAttribute('viewBox', `0 0 ${r1(h.width)} ${r1(h.height)}`);
    const linea = $('.camino__linea', svg);
    const hoja = $('.camino__hoja', svg);
    linea.setAttribute('d', ruta);
    const s = 12; const cx = B.x - s / 2; const x0 = cx - s / 2; const y0 = B.y - s / 2; const rh = s / 2;
    hoja.setAttribute('d', `M${r1(x0)},${r1(B.y)} A${rh},${rh} 0 0 1 ${r1(cx)},${r1(y0)} H${r1(x0 + s)} V${r1(B.y)} A${rh},${rh} 0 0 1 ${r1(cx)},${r1(y0 + s)} H${r1(x0)} Z`);
    return linea;
  };
  safe(trazarCamino);
  let anchoCamino = window.innerWidth;
  let rCamino;
  window.addEventListener('resize', () => {
    if (window.innerWidth === anchoCamino) return;
    anchoCamino = window.innerWidth;
    clearTimeout(rCamino);
    rCamino = setTimeout(() => safe(() => {
      const linea = trazarCamino();
      if (linea && hasGSAP) gsap.set(linea, { strokeDasharray: 'none', strokeDashoffset: 0 });
    }), 200);
  });

  // ---------- 4. Sin librerías: hasta aquí, todo visible y funcionando ----------
  if (!hasGSAP) return;
  $$('[data-hero-in], .hero__linea-in').forEach((el) => { el.style.animation = 'none'; });   // JS vivo: ya no hace falta el rescate

  // ---------- 5. Menos movimiento: todo completo, nada corre solo ----------
  if (RM) {
    gsap.set('[data-hero-in]', { autoAlpha: 1 });
    gsap.set('.hero__linea-in', { yPercent: 0 });
    return;
  }

  // ---------- 6. Estados iniciales y efectos con el scroll ----------
  const largo = (p) => p.getTotalLength();
  const oculto = (p) => ({ strokeDasharray: () => `${largo(p)} ${largo(p) + 4}`, strokeDashoffset: () => largo(p) + 2 });

  gsap.set('.hero__linea-in', { yPercent: 130, y: 0 });
  gsap.set('[data-reveal]', { y: M.dist, opacity: 0 });
  gsap.set('[data-tarjeta], [data-guia], [data-valor]', { x: 56, opacity: 0 });

  // 6.1 Entradas discretas: todo sube un poco y aparece, en cascada
  safe(() => {
    ScrollTrigger.batch('[data-reveal]', {
      start: 'top 90%',
      once: true,
      onEnter: (lote) => gsap.to(lote, { y: 0, opacity: 1, duration: M.dur, ease: M.ease, stagger: Math.min(M.stagger, 0.6 / lote.length), overwrite: true }),
    });
  });

  // 6.2 Tarjetas que se deslizan desde la derecha
  safe(() => {
    ScrollTrigger.batch('[data-tarjeta], [data-guia], [data-valor]', {
      start: 'top 90%',
      once: true,
      onEnter: (lote) => gsap.to(lote, { x: 0, opacity: 1, duration: M.dur * 1.15, ease: M.ease, stagger: Math.min(0.1, 0.6 / lote.length), overwrite: true }),
    });
  });

  // 6.3 Títulos que suben por líneas desde una ranura
  const splitReveals = () => safe(() => {
    if (!window.SplitText) return;
    $$('[data-split]').forEach((el) => {
      SplitText.create(el, {
        type: 'lines',
        mask: 'lines',
        linesClass: 'linea',
        autoSplit: true,
        onSplit: (self) => gsap.from(self.lines, {
          yPercent: 130,
          duration: M.dur * 1.15,
          stagger: M.stagger * 1.4,
          ease: M.ease,
          scrollTrigger: { trigger: el, start: 'top 88%', once: true },
        }),
      });
    });
  });

  // 6.4 Cintas: cada palabra o logo sube al aparecer
  safe(() => {
    $$('.marquesina').forEach((caja) => {
      gsap.from($$('.marquesina__grupo:first-child > *', caja), {
        yPercent: 60, opacity: 0, duration: M.dur, stagger: 0.03, ease: M.ease,
        scrollTrigger: { trigger: caja, start: 'top 92%', once: true },
      });
    });
  });

  // 6.5 Las puertas: un escaneo las recorre y las va cerrando
  safe(() => {
    const caja = $('[data-puertas]');
    if (!caja) return;
    const lista = $('.puertas__lista', caja);
    const puertas = $$('[data-puerta]', caja);
    const esc = $('[data-puertas-escaneo]', caja);
    const abrirTodas = () => puertas.forEach((p) => { p.classList.add('is-abierta'); $('[data-estado]', p).textContent = 'Abierta'; });
    const cerrar = (p) => {
      p.classList.remove('is-abierta');
      $('[data-estado]', p).textContent = 'Cerrada';
      gsap.fromTo($('.hoja-punto', p), { scale: 1.8 }, { scale: 1, duration: 0.45, ease: M.pop });
    };
    abrirTodas();
    ScrollTrigger.create({
      trigger: lista,
      start: 'top 78%',
      once: true,
      onEnter: () => {
        const fila = matchMedia('(min-width: 1100px)').matches;   // en fila: de izquierda a derecha; apiladas: de arriba abajo
        esc.classList.toggle('puertas__escaneo--v', !fila);
        const L = lista.getBoundingClientRect();
        const total = fila ? L.width : L.height;
        const dur = 1.7;
        const tl = gsap.timeline();
        tl.fromTo(esc, fila ? { x: -90, y: 0, autoAlpha: 1 } : { y: -90, x: 0, autoAlpha: 1 },
          { [fila ? 'x' : 'y']: total, duration: dur, ease: 'none' })
          .to(esc, { autoAlpha: 0, duration: 0.25, ease: 'none' }, dur - 0.25);
        puertas.forEach((p) => {
          const r = p.getBoundingClientRect();
          const centro = fila ? r.left - L.left + r.width / 2 : r.top - L.top + r.height / 2;
          tl.call(() => cerrar(p), null, Math.max(0, ((centro + 45) / (total + 90)) * dur));
        });
      },
    });
  });

  // 6.6 Banda: una ola de luz recorre la red de puntos con el scroll
  safe(() => {
    gsap.fromTo('[data-banda-luz]', { '--luz': '-40%' }, {
      '--luz': '140%', ease: 'none',
      scrollTrigger: { trigger: '[data-banda]', start: 'top bottom', end: 'bottom top', scrub: true },
    });
  });

  // 6.7 Qué hacemos: la línea avanza con el scroll (izquierda a derecha es avanzar)
  safe(() => {
    gsap.matchMedia().add({ ancho: ANCHO, angosto: ANGOSTO }, (ctx) => {
      const prop = ctx.conditions.ancho ? 'scaleX' : 'scaleY';
      gsap.fromTo('[data-modos-linea]', { [prop]: 0 }, {
        [prop]: 1, ease: 'none',
        scrollTrigger: { trigger: '[data-modos]', start: 'top 82%', end: 'bottom 62%', scrub: true },
      });
    });
  });

  // 6.8 Ley 21.719: el bloque se abre desde su esquina redonda
  safe(() => {
    gsap.fromTo('[data-ley]', { clipPath: 'inset(0% 100% 100% 0% round 40px 0px 40px 0px)' }, {
      clipPath: 'inset(0% 0% 0% 0% round 40px 0px 40px 0px)', duration: 1.3, ease: M.easeIO,
      scrollTrigger: { trigger: '[data-ley]', start: 'top 82%', once: true },
    });
    gsap.fromTo('[data-ley-iso]', { yPercent: 14, rotate: -6 }, {
      yPercent: -10, rotate: 0, ease: 'none',
      scrollTrigger: { trigger: '[data-ley]', start: 'top bottom', end: 'bottom top', scrub: true },
    });
  });

  // 6.9 Automatizaciones e IA: las trazas conectan los nodos y cada uno pasa de revisando a protegido
  safe(() => {
    const red = $('[data-red]');
    if (!red) return;
    const lineas = $$('.red__linea', red);
    const nodos = $$('[data-nodo]', red);
    const centro = $('.red__centro', red);
    const paquetes = $$('.red__paquete', red);
    const puntos = [[50, 12], [82.9, 31], [82.9, 69], [50, 88], [17.1, 69], [17.1, 31]];
    nodos.forEach((n) => { n.classList.add('is-revisando'); $('[data-estado]', n).textContent = 'Revisando'; });
    const proteger = (n) => {
      n.classList.remove('is-revisando');
      $('[data-estado]', n).textContent = 'Protegido';
      gsap.fromTo($('.hoja-punto', n), { scale: 1.8 }, { scale: 1, duration: 0.45, ease: M.pop });
    };
    let vivo = false;
    const viaje = (p) => {
      if (!vivo) { p.dataset.parado = '1'; return; }
      p.dataset.parado = '';
      const [x, y] = puntos[Math.floor(Math.random() * puntos.length)];
      const entra = Math.random() < 0.6;   // casi siempre, datos que llegan al centro
      gsap.timeline({ onComplete: () => gsap.delayedCall(gsap.utils.random(0.3, 1.4), () => viaje(p)) })
        .set(p, { attr: { cx: entra ? x : 50, cy: entra ? y : 50 }, opacity: 0 })
        .to(p, { opacity: 1, duration: 0.2, ease: 'none' })
        .to(p, { attr: { cx: entra ? 50 : x, cy: entra ? 50 : y }, duration: 1.4, ease: 'sine.inOut' }, 0)
        .to(p, { opacity: 0, duration: 0.25, ease: 'none' }, 1.15);
    };
    const tl = gsap.timeline({ paused: true, defaults: { ease: M.ease } })
      .fromTo(centro, { scale: 0.86, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.6, ease: M.pop }, 0);
    lineas.forEach((l, k) => tl.fromTo(l, oculto(l), { strokeDashoffset: 0, duration: 0.7 }, 0.2 + k * 0.08));
    tl.fromTo(nodos, { autoAlpha: 0, scale: 0.9 }, { autoAlpha: 1, scale: 1, duration: 0.5, stagger: 0.08, ease: M.pop }, 0.55);
    nodos.forEach((n, k) => tl.call(() => proteger(n), null, 1.5 + k * 0.32));
    tl.call(() => { vivo = true; paquetes.forEach((p, k) => gsap.delayedCall(k * 0.7, () => viaje(p))); }, null, '+=0.3');
    ScrollTrigger.create({ trigger: red, start: 'top 75%', once: true, onEnter: () => tl.play() });
    ScrollTrigger.create({
      trigger: red, start: 'top bottom', end: 'bottom top',
      onToggle: (st) => {
        if (!tl.progress() || tl.progress() < 1) return;
        vivo = st.isActive;
        if (vivo) paquetes.forEach((p) => { if (p.dataset.parado) viaje(p); });
      },
    });
  });

  // 6.10 Cómo trabajamos: la traza avanza con el scroll y enciende cada paso
  safe(() => {
    const pasos = $$('[data-paso]');
    pasos.forEach((p) => p.classList.remove('is-activo'));
    gsap.matchMedia().add({ ancho: ANCHO, angosto: ANGOSTO }, (ctx) => {
      const prop = ctx.conditions.ancho ? 'scaleX' : 'scaleY';
      const n = pasos.length;
      gsap.fromTo('[data-pasos-linea]', { [prop]: 0 }, {
        [prop]: 1, ease: 'none',
        scrollTrigger: {
          trigger: '[data-pasos]', start: 'top 72%', end: 'bottom 60%', scrub: true,
          onUpdate: (st) => pasos.forEach((p, k) => p.classList.toggle('is-activo', st.progress >= (k / (n - 1)) * 0.97)),
          onLeaveBack: () => pasos.forEach((p) => p.classList.remove('is-activo')),
        },
      });
    });
  });

  // 6.11 Nosotros: el símbolo de fondo se desliza con el scroll
  safe(() => {
    gsap.fromTo('[data-nosotros-iso]', { yPercent: -14, rotate: -5 }, {
      yPercent: 14, rotate: 4, ease: 'none',
      scrollTrigger: { trigger: '#nosotros', start: 'top bottom', end: 'bottom top', scrub: true },
    });
  });

  // 6.12 El eslabón se traza y se cierra: firma de la portada (su rima vive en el logo del menú y en el del pie)
  const trazarEslabon = (raiz, dx = 73) => {
    const a = $('.trazo-a', raiz);
    const b = $('.trazo-b', raiz);
    const mover = $('.eslabon__mover', raiz);
    return gsap.timeline({ defaults: { ease: M.ease } })
      .fromTo(a, oculto(a), { strokeDashoffset: 0, duration: 1 }, 0)
      .fromTo(b, oculto(b), { strokeDashoffset: 0, duration: 1 }, 0.25)
      .fromTo(mover, { x: dx }, { x: 0, duration: 0.5, ease: M.pop }, 1.25);
  };

  // 6.13 Pie: el logo se arma pieza por pieza al aparecer (la pieza verde hace el clic del cerrojo)
  safe(() => {
    const marca = $('[data-pie-marca]');
    if (!marca) return;
    gsap.timeline({ defaults: { ease: M.ease }, scrollTrigger: { trigger: marca, start: 'top 90%', once: true } })
      .from($('.fl--iso-a', marca), { opacity: 0, duration: 0.5, ease: 'none' }, 0)
      .from($('.fl--iso-b', marca), { x: 18, opacity: 0, duration: 0.6, ease: M.pop }, 0.25)
      .from($$('.fl', marca), { yPercent: 70, opacity: 0, duration: M.dur, stagger: M.stagger }, 0.35);
  });

  // 6.14 Portada: al bajar, las líneas del titular se separan un poco
  safe(() => {
    gsap.matchMedia().add({ ancho: ANCHO, angosto: ANGOSTO }, (ctx) => {
      const f = ctx.conditions.ancho ? 1 : 0.5;   // en celular, más suave
      gsap.timeline({ scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } })
        .to('.hero__linea:nth-child(1)', { xPercent: -5 * f, ease: 'none' }, 0)
        .to('.hero__linea:nth-child(2)', { xPercent: 4 * f, ease: 'none' }, 0)
        .to('.hero__linea:nth-child(3)', { xPercent: -3 * f, ease: 'none' }, 0)
        .to('.hero__linea:nth-child(4)', { xPercent: 6 * f, ease: 'none' }, 0);
    });
  });

  // 6.15 Portada con recorrido (escritorio): el scroll mueve los clips y cada texto entra y sale con él
  const recorrido = safe(() => {
    const sec = $('[data-rv]');
    if (!sec || !html.classList.contains('hv')) return null;
    const intro = $('[data-rv-intro]', sec);
    const video = $('[data-rv-video]', sec);
    const escenas = $$('[data-rv-escena]', sec);
    const pasos = $$('[data-rv-paso]', sec);
    const pista = $('[data-rv-pista]', sec);
    const CLIP = 5.0833;                         // segundos de cada clip (los 4 van seguidos en un archivo)
    const T = { inicio: 0.25, clip: 1, pausa: 0.45, entra: 0.55 };   // unidades del recorrido
    const est = { t: 0 };
    let listo = false;
    let introViva = false;
    let cargado = false;
    let firma = null;
    let st = null;

    // Saltos de video sin amontonarse: uno a la vez (receta de scroll-world)
    let pendiente = false;
    const buscar = () => {
      if (!listo) return;
      if (video.seeking) { pendiente = true; return; }
      if (Math.abs(video.currentTime - est.t) > 0.02) video.currentTime = est.t;
    };
    video.addEventListener('seeked', () => { if (pendiente) { pendiente = false; buscar(); } });
    const capa = () => { video.style.opacity = listo && (est.t > 0.01 || !introViva) ? 1 : 0; };
    intro.addEventListener('ended', () => { introViva = false; capa(); });

    // Los videos se piden solo en escritorio. El del recorrido llega entero (Blob) para que siempre se pueda saltar.
    const cargar = () => {
      if (cargado) return;
      cargado = true;
      intro.poster = intro.dataset.poster;
      intro.src = intro.dataset.src;
      fetch(video.dataset.src)
        .then((r) => (r.ok ? r.blob() : Promise.reject(r.status)))
        .then((b) => {
          video.addEventListener('loadeddata', () => { listo = true; buscar(); capa(); }, { once: true });
          video.src = URL.createObjectURL(b);
        })
        .catch((e) => console.warn('[tinary] recorrido', e));
    };

    const entrada = (e) => gsap.timeline({ defaults: { ease: M.ease } })
      .fromTo(e, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.01, ease: 'none' }, 0)
      .fromTo($('[data-rv-ceja]', e), { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.22 }, 0)
      .fromTo($$('.rv__linea-in', e), { yPercent: 130 }, { yPercent: 0, duration: 0.3, stagger: 0.04 }, 0.03)
      .fromTo($$('[data-rv-resto]', e), { autoAlpha: 0, y: M.dist }, { autoAlpha: 1, y: 0, duration: 0.22, stagger: 0.05 }, 0.15);
    const salida = (e) => gsap.timeline({ defaults: { ease: 'power3.in', immediateRender: false } })
      .fromTo($$('.rv__linea-in', e), { yPercent: 0 }, { yPercent: -130, duration: 0.22, stagger: 0.03 }, 0)
      .fromTo([$('[data-rv-ceja]', e), ...$$('[data-rv-resto]', e)], { autoAlpha: 1, y: 0 }, { autoAlpha: 0, y: -12, duration: 0.18 }, 0)
      .fromTo(e, { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.01, ease: 'none' }, 0.3);

    const marcarPaso = (tiempo) => {
      let k = 0;
      for (let i = 1; i < escenas.length; i++) if (tiempo >= T.inicio + (i - 1) * (T.clip + T.pausa) + T.entra) k = i;
      pasos.forEach((p, i) => p.classList.toggle('is-activo', i === k - 1));
    };

    gsap.matchMedia().add(ANCHO, () => {
      if (!cargado && window.scrollY < 2) introViva = true;   // la intro se ve antes que el recorrido
      cargar();
      const tl = gsap.timeline({
        onUpdate: () => { buscar(); capa(); marcarPaso(tl.time()); },   // cada cuadro del scrub, no solo al mover la rueda
        scrollTrigger: {
          trigger: sec,
          start: 'top top',
          end: () => `+=${Math.round(window.innerHeight * 4.4)}`,
          pin: true,
          scrub: 0.6,
          refreshPriority: 1,
          onUpdate: (self) => {
            if (self.progress > 0.002) {
              if (firma && firma.isActive()) firma.progress(1);   // si bajan durante la firma, el texto ya está puesto
              if (introViva) { intro.pause(); introViva = false; }
            }
          },
        },
      });
      tl.fromTo(pista, { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.2, ease: 'none', immediateRender: false }, 0);
      for (let k = 1; k < escenas.length; k++) {
        const s = T.inicio + (k - 1) * (T.clip + T.pausa);
        tl.fromTo(est, { t: (k - 1) * CLIP }, { t: k * CLIP - 0.05, duration: T.clip, ease: 'none', immediateRender: false }, s)
          .add(salida(escenas[k - 1]), s + 0.02)
          .add(entrada(escenas[k]), s + T.entra);
      }
      tl.to({}, { duration: T.pausa });          // la última escena se queda un momento antes de soltar
      st = tl.scrollTrigger;
      return () => { st = null; intro.pause(); introViva = false; };
    });

    // La firma de la portada: el texto de la escena 0 entra y el isotipo se forma en el video
    return {
      firma: () => {
        if (!st || st.progress > 0.002) { introViva = false; capa(); return null; }
        const e = escenas[0];
        intro.currentTime = 0;
        const p = intro.play();
        introViva = true;
        if (p) p.catch(() => { introViva = false; capa(); });
        firma = gsap.timeline({ defaults: { ease: M.ease } })
          .fromTo($('[data-rv-ceja]', e), { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: M.dur }, 0)
          .fromTo($$('.rv__linea-in', e), { yPercent: 130 }, { yPercent: 0, duration: 0.95, stagger: 0.09 }, 0.1)
          .fromTo($$('[data-rv-resto]', e), { autoAlpha: 0, y: M.dist }, { autoAlpha: 1, y: 0, duration: M.dur, stagger: 0.15 }, 0.65);
        return firma;
      },
    };
  });
  if (html.classList.contains('hv') && !recorrido) html.classList.remove('hv');   // si algo falló, vuelve la portada de siempre

  // ---------- 7. La firma de la portada ----------
  const dibujarCamino = (linea) => {
    const t = gsap.timeline();
    if (!linea) return t;
    return t.fromTo(linea, oculto(linea), { strokeDashoffset: 0, duration: 0.8, ease: 'power2.inOut' })
      .fromTo('.camino__hoja', { autoAlpha: 0, scale: 0, transformOrigin: '50% 50%' }, { autoAlpha: 1, scale: 1, duration: 0.4, ease: M.pop }, '-=0.15');
  };

  function firmaPortada() {
    const arte = $('[data-arte]');
    const capas = $$('.capa', arte);
    const etiquetas = $$('.capa-etiqueta', arte);
    const escaneo = $('.escaneo', arte);
    const pulso = $('.pulso', arte);
    const chip = $('[data-chip]', arte);
    const navMover = $('.nav .iso-mover');
    const camino = trazarCamino();              // se mide antes de mover cualquier pieza

    const tl = gsap.timeline({ defaults: { ease: M.ease } });
    tl.fromTo('.nav', { autoAlpha: 0 }, { autoAlpha: 1, duration: M.dur, ease: 'none' }, 0)
      .fromTo('.nav__inner', { y: -14 }, { y: 0, duration: M.dur }, 0)
      .fromTo([arte, '.camino'], { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.15, ease: 'none' }, 0)
      // 1. el escaneo baja y las capas se trazan a su paso
      .fromTo(escaneo, { y: 0, autoAlpha: 1 }, { y: 760, duration: 1.4, ease: 'sine.inOut' }, 0.05)
      .to(escaneo, { autoAlpha: 0, duration: 0.3, ease: 'none' }, 1.2);
    capas.forEach((p, i) => tl.fromTo(p, oculto(p), { strokeDashoffset: 0, duration: 1.05 }, 0.1 + i * 0.13));
    tl.fromTo(etiquetas, { autoAlpha: 0, x: -10 }, { autoAlpha: 1, x: 0, duration: 0.55, stagger: 0.13, ease: 'power2.out' }, 0.45)
      // 2 y 3. las dos piezas del símbolo se trazan y la verde se desliza como un cerrojo
      .add(trazarEslabon(arte), 0.35);
    if (navMover) tl.fromTo(navMover, { x: 17.5 }, { x: 0, duration: 0.5, ease: M.pop }, 1.6);   // el logo del menú hace el mismo clic
    tl.fromTo(pulso, { autoAlpha: 0.9, scale: 1 }, { autoAlpha: 0, scale: 1.34, duration: 0.95, ease: 'power2.out', svgOrigin: '320 320', immediateRender: false }, 2)
      .fromTo(capas, { strokeOpacity: 0.18 }, { strokeOpacity: 0.55, duration: 0.24, stagger: 0.06, yoyo: true, repeat: 1, ease: 'power1.inOut' }, 2)
      .fromTo(chip, { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power2.out' }, 2.1)
      // el texto entra encimado con la firma, nunca la espera
      .fromTo('[data-ceja]', { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: M.dur }, 0.2)
      .fromTo('.hero__linea-in', { yPercent: 130 }, { yPercent: 0, duration: 0.95, stagger: 0.09 }, 0.3)
      .fromTo('.hero__bajada', { autoAlpha: 0, y: M.dist }, { autoAlpha: 1, y: 0, duration: M.dur }, 0.85)
      .fromTo('.hero__acciones', { autoAlpha: 0, y: M.dist }, { autoAlpha: 1, y: 0, duration: M.dur }, 1)
      // 4. el perímetro se extiende hasta el botón
      .add(dibujarCamino(camino), 2.05);
    const rv = recorrido && recorrido.firma();
    if (rv) tl.add(rv, 0.2);
    return tl;
  }

  // Vigilancia: después de la firma, el escaneo vuelve a pasar lento mientras la portada se ve
  const vigilancia = () => {
    const escaneo = $('[data-arte] .escaneo');
    const loop = gsap.timeline({ repeat: -1, paused: true })
      .to({}, { duration: 4.5 })
      .fromTo(escaneo, { y: 0, autoAlpha: 0.5 }, { y: 760, duration: 3.2, ease: 'none', immediateRender: false })
      .to(escaneo, { autoAlpha: 0, duration: 0.4, ease: 'none' }, '-=0.4');
    let activo = false;
    let visible = true;
    ScrollTrigger.create({
      trigger: '.hero', start: 'top bottom', end: 'bottom top',
      onToggle: (st) => { visible = st.isActive; if (!visible) loop.pause(); else if (activo) loop.play(); },
    });
    d.addEventListener('visibilitychange', () => { if (d.hidden) loop.pause(); else if (activo && visible) loop.play(); });
    return { iniciar: () => { activo = true; loop.restart(); if (!visible) loop.pause(); } };
  };

  // ---------- 8. Arranque ----------
  const mostrarTodo = () => {
    html.classList.remove('js');
    gsap.set('.hero__linea-in, [data-hero-in], [data-reveal], .rv__linea-in, [data-rv-ceja], [data-rv-resto]', { clearProps: 'transform,opacity,visibility' });
  };
  const vig = safe(vigilancia);
  Promise.race([d.fonts ? d.fonts.ready : Promise.resolve(), new Promise((r) => setTimeout(r, 1200))])
    .then(() => {
      const tl = safe(firmaPortada);
      if (!tl) { mostrarTodo(); return; }
      if (vig) tl.eventCallback('onComplete', vig.iniciar);
      splitReveals();
      ScrollTrigger.refresh();
      if (location.hash) {                    // si llegan con un #ancla, ir ahí sin esperar la firma
        const el = d.getElementById(location.hash.slice(1));
        if (el) scrollToEl(el, true);
      }
    });
  window.addEventListener('load', () => ScrollTrigger.refresh());
})();
