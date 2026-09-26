/* ═══════════════════════════════════════════════════════════════
   McGrath stop-motion students
   Paper-cutout SVG characters in the real McGrath uniforms:
     girl — white blouse, sky-blue pleated skirt, sky-blue striped tie
     boy  — khaki shirt & trousers, sky-blue striped tie
   Stop-motion feel = poses snap (no tweening), frames run at ~12fps,
   and a "line boil" filter re-seeds a few times a second.

   Usage:
     const kid = McGrathStudents.create('girl', { width: 72 });
     container.appendChild(kid.el);
     kid.pose('wave1');  kid.play(['wave1','wave2'], 4, 3);  kid.say('Hi!');
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var NS = 'http://www.w3.org/2000/svg';

  // Colours matched to the Peace Day photos. Change here to restyle every character.
  var C = {
    skin: '#7a4a2c', skinShade: '#653b22', hair: '#1c1310', mouth: '#4a1717', cheek: '#e2806c',
    white: '#fbfbf8', whiteShade: '#d9dee2',
    sky: '#43b2c7', skyDark: '#2d91a6', skyLight: '#8fd6e3',
    tie: '#86cde2',
    khaki: '#c4b28c', khakiDark: '#a4916b', khakiLight: '#d8caa8',
    shoe: '#141519', buckle: '#c9cdd1'
  };

  // Joint angles in degrees. Arms/legs hang straight down at 0; +ve swings the
  // viewer's-left limb outward, -ve swings the viewer's-right limb outward.
  var POSES = {
    stand:   { la: 6,   ra: -6,   ll: 2,  rl: -2,  sx: 1,    sy: 1,    tilt: 0,  face: 'smile' },
    breathe: { la: 9,   ra: -9,   ll: 2,  rl: -2,  sx: 1.01, sy: 0.99, tilt: 0,  face: 'smile' },
    crouch:  { la: 38,  ra: -38,  ll: 14, rl: -14, sx: 1.08, sy: 0.86, tilt: 0,  face: 'smile' },
    jump:    { la: 160, ra: -160, ll: -3, rl: 3,   sx: 0.95, sy: 1.07, tilt: 0,  face: 'open' },
    fall:    { la: 105, ra: -115, ll: 18, rl: -6,  sx: 1,    sy: 1,    tilt: 4,  face: 'open' },
    land:    { la: 70,  ra: -70,  ll: 16, rl: -16, sx: 1.12, sy: 0.84, tilt: 0,  face: 'smile' },
    wave1:   { la: 6,   ra: -150, ll: 2,  rl: -2,  sx: 1,    sy: 1,    tilt: -2, face: 'smile' },
    wave2:   { la: 6,   ra: -118, ll: 2,  rl: -2,  sx: 1,    sy: 1,    tilt: -2, face: 'smile' },
    cheer1:  { la: 160, ra: -135, ll: 4,  rl: -4,  sx: 0.98, sy: 1.03, tilt: -3, face: 'open' },
    cheer2:  { la: 135, ra: -160, ll: 4,  rl: -4,  sx: 0.98, sy: 1.03, tilt: 3,  face: 'open' },
    present: { la: 6,   ra: -75,  ll: 2,  rl: -2,  sx: 1,    sy: 1,    tilt: -2, face: 'smile' }
  };

  var VB = { x: -20, y: -6, w: 140, h: 186 }; // feet rest on y = 176

  /* ── shared <defs>: tie stripes + three "boil" filters with a white sticker edge ── */
  function ensureDefs() {
    if (document.getElementById('mcg-kid-defs')) return;
    var boil = '';
    for (var i = 0; i < 3; i++) {
      boil +=
        '<filter id="mcg-boil-' + i + '" x="-25%" y="-25%" width="150%" height="150%">' +
          '<feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="1" seed="' + (i * 7 + 3) + '" result="n"/>' +
          '<feDisplacementMap in="SourceGraphic" in2="n" scale="' + (reduced ? 0 : 3) + '" xChannelSelector="R" yChannelSelector="G" result="d"/>' +
          '<feMorphology in="d" operator="dilate" radius="3.2" result="thick"/>' +
          '<feFlood flood-color="#ffffff" result="w"/>' +
          '<feComposite in="w" in2="thick" operator="in" result="edge"/>' +
          '<feMerge><feMergeNode in="edge"/><feMergeNode in="d"/></feMerge>' +
        '</filter>';
    }
    var holder = document.createElement('div');
    holder.innerHTML =
      '<svg id="mcg-kid-defs" width="0" height="0" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true" focusable="false"><defs>' +
        '<pattern id="mcg-tie" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(38)">' +
          '<rect width="5" height="5" fill="' + C.tie + '"/><rect width="1.6" height="5" fill="#ffffff"/></pattern>' +
        boil +
      '</defs></svg>';
    document.body.appendChild(holder.firstChild);

    var css = document.createElement('style');
    css.textContent =
      '.mcg-kid{position:relative;display:inline-block;line-height:0;user-select:none;-webkit-tap-highlight-color:transparent}' +
      '.mcg-kid svg{width:100%;height:auto;overflow:visible;display:block}' +
      '.mcg-bubble{position:absolute;left:50%;bottom:100%;transform:translate(-50%,-4px);background:#fff;color:#0d1b2a;' +
        'font:700 12px/1.3 "Figtree","Nunito",system-ui,sans-serif;padding:7px 11px;border-radius:12px;white-space:nowrap;' +
        'box-shadow:0 6px 18px rgba(0,0,0,.25);pointer-events:none;opacity:0;transition:opacity .15s steps(2)}' +
      '.mcg-bubble::after{content:"";position:absolute;left:50%;top:100%;margin-left:-6px;border:6px solid transparent;border-top-color:#fff}' +
      '.mcg-bubble.on{opacity:1}';
    document.head.appendChild(css);
  }

  function arm(px, py, sleeve, sleeveShade) {
    return '<g data-j="' + px + ' ' + py + '">' +
      '<rect x="' + (px - 4) + '" y="' + (py + 6) + '" width="8" height="25" rx="4" fill="' + C.skin + '"/>' +
      '<circle cx="' + px + '" cy="' + (py + 31) + '" r="4.8" fill="' + C.skin + '"/>' +
      '<rect x="' + (px - 6.5) + '" y="' + (py - 4) + '" width="13" height="14" rx="5" fill="' + sleeve + '" stroke="' + sleeveShade + '" stroke-width="1"/>' +
    '</g>';
  }

  function head(kind) {
    var hair = kind === 'girl'
      ? '<circle cx="35" cy="17" r="8.5" fill="' + C.hair + '"/><circle cx="65" cy="17" r="8.5" fill="' + C.hair + '"/>' +
        '<path d="M32.5 35 Q33 15.5 50 15.5 Q67 15.5 67.5 35 Q62 23.5 50 23.5 Q38 23.5 32.5 35Z" fill="' + C.hair + '"/>' +
        '<path d="M39.5 22.5 l-6 -3.6 l0 7.2z M39.5 22.5 l5 -3.6 l0 7.2z" fill="' + C.sky + '"/>' +
        '<path d="M60.5 22.5 l6 -3.6 l0 7.2z M60.5 22.5 l-5 -3.6 l0 7.2z" fill="' + C.sky + '"/>'
      : '<path d="M33 33 Q32.5 17 50 17 Q67.5 17 67 33 Q63.5 23 50 23 Q36.5 23 33 33Z" fill="' + C.hair + '"/>';
    return '<g class="k-head">' +
      '<rect x="46" y="47" width="8" height="13" fill="' + C.skinShade + '"/>' +
      '<circle cx="33.5" cy="37" r="3.6" fill="' + C.skin + '"/><circle cx="66.5" cy="37" r="3.6" fill="' + C.skin + '"/>' +
      '<circle cx="50" cy="35" r="17" fill="' + C.skin + '"/>' +
      hair +
      '<path d="M41 30.5 Q44 29 47 30.5 M53 30.5 Q56 29 59 30.5" stroke="' + C.hair + '" stroke-width="1.3" fill="none" stroke-linecap="round"/>' +
      '<g class="k-eyes-open"><ellipse cx="44" cy="36" rx="2.1" ry="2.7" fill="' + C.hair + '"/><ellipse cx="56" cy="36" rx="2.1" ry="2.7" fill="' + C.hair + '"/>' +
        '<circle cx="44.8" cy="35" r=".8" fill="#fff"/><circle cx="56.8" cy="35" r=".8" fill="#fff"/></g>' +
      '<g class="k-eyes-shut" style="display:none"><path d="M41.6 36.6 Q44 38.6 46.4 36.6 M53.6 36.6 Q56 38.6 58.4 36.6" stroke="' + C.hair + '" stroke-width="1.4" fill="none" stroke-linecap="round"/></g>' +
      '<circle cx="39.5" cy="42" r="2.7" fill="' + C.cheek + '" opacity=".35"/><circle cx="60.5" cy="42" r="2.7" fill="' + C.cheek + '" opacity=".35"/>' +
      '<path class="k-mouth-smile" d="M45 43.5 Q50 48.5 55 43.5" stroke="' + C.mouth + '" stroke-width="1.7" fill="none" stroke-linecap="round"/>' +
      '<path class="k-mouth-open" style="display:none" d="M45 43 Q50 51.5 55 43Z" fill="' + C.mouth + '"/>' +
    '</g>';
  }

  var tie = function (end) {
    return '<path d="M47 60.5 H53 L52 66 H48Z" fill="url(#mcg-tie)" stroke="' + C.skyDark + '" stroke-width=".6"/>' +
      '<path d="M48 66 H52 L54.5 ' + (end - 5) + ' L50 ' + end + ' L45.5 ' + (end - 5) + 'Z" fill="url(#mcg-tie)" stroke="' + C.skyDark + '" stroke-width=".6"/>';
  };

  function shoe(px, dir) {
    return '<ellipse cx="' + (px + dir * 2) + '" cy="171" rx="6.6" ry="3.8" fill="' + C.shoe + '"/>';
  }

  function girlSVG() {
    var leg = function (px, dir) {
      return '<g data-j="' + px + ' 122">' +
        '<rect x="' + (px - 3.6) + '" y="122" width="7.2" height="46" rx="3" fill="' + C.skin + '"/>' +
        '<rect x="' + (px - 4) + '" y="157" width="8" height="10" rx="2" fill="' + C.white + '" stroke="' + C.whiteShade + '" stroke-width=".8"/>' +
        shoe(px, dir) + '</g>';
    };
    var pleats = '';
    [[40, 31.5], [45, 40.5], [50, 50], [55, 59.5], [60, 68.5]].forEach(function (p) {
      pleats += '<path d="M' + p[0] + ' 93 L' + p[1] + ' 144" stroke="' + C.skyDark + '" stroke-width="1.3"/>';
    });
    return '<g class="k-legl">' + leg(44, -1) + '</g><g class="k-legr">' + leg(56, 1) + '</g>' +
      '<g class="k-body">' +
        '<path d="M34 62 Q50 55.5 66 62 L67.5 93 L32.5 93Z" fill="' + C.white + '" stroke="' + C.whiteShade + '" stroke-width="1"/>' +
        '<path d="M43.5 57 L50 64 L40.5 63.5Z M56.5 57 L50 64 L59.5 63.5Z" fill="' + C.white + '" stroke="' + C.whiteShade + '" stroke-width=".9"/>' +
        '<path d="M34.5 90 L65.5 90 L77 145 Q50 149 23 145Z" fill="' + C.sky + '"/>' + pleats +
        '<rect x="34" y="88" width="32" height="4.5" rx="1.5" fill="' + C.skyLight + '"/>' +
        tie(86) +
      '</g>' +
      '<g class="k-arml">' + arm(35, 65, C.white, C.whiteShade) + '</g>' +
      '<g class="k-armr">' + arm(65, 65, C.white, C.whiteShade) + '</g>' +
      head('girl');
  }

  function boySVG() {
    var leg = function (px, dir) {
      return '<g data-j="' + px + ' 100">' +
        '<rect x="' + (px - 5.8) + '" y="100" width="11.6" height="67" rx="3" fill="' + C.khaki + '" stroke="' + C.khakiDark + '" stroke-width="1"/>' +
        shoe(px, dir) + '</g>';
    };
    return '<g class="k-legl">' + leg(44.2, -1) + '</g><g class="k-legr">' + leg(55.8, 1) + '</g>' +
      '<g class="k-body">' +
        '<path d="M33 62 Q50 55.5 67 62 L67 101 L33 101Z" fill="' + C.khaki + '" stroke="' + C.khakiDark + '" stroke-width="1"/>' +
        '<path d="M43.5 57 L50 64 L40 63.5Z M56.5 57 L50 64 L60 63.5Z" fill="' + C.khakiLight + '" stroke="' + C.khakiDark + '" stroke-width=".9"/>' +
        '<rect x="56.5" y="70" width="7.5" height="8" rx="1" fill="none" stroke="' + C.khakiDark + '" stroke-width="1"/>' +
        '<rect x="33" y="97" width="34" height="5" fill="' + C.shoe + '"/><rect x="47" y="96.5" width="6" height="6" rx="1" fill="' + C.buckle + '"/>' +
        tie(94) +
      '</g>' +
      '<g class="k-arml">' + arm(34, 65, C.khaki, C.khakiDark) + '</g>' +
      '<g class="k-armr">' + arm(66, 65, C.khaki, C.khakiDark) + '</g>' +
      head('boy');
  }

  /* ── one clock for every character on the page: boil + idle life ── */
  var kids = [];
  var boilIdx = 0;
  if (!reduced) {
    setInterval(function () {
      if (document.hidden) return;
      boilIdx = (boilIdx + 1) % 3;
      for (var i = 0; i < kids.length; i++) kids[i]._tick(boilIdx);
    }, 125); // 8 boils/sec
  }

  function Kid(kind, opts) {
    opts = opts || {};
    ensureDefs();
    this.kind = kind;
    this.el = document.createElement('div');
    this.el.className = 'mcg-kid mcg-kid-' + kind;
    this.el.setAttribute('aria-hidden', 'true');
    this.el.innerHTML =
      '<svg viewBox="' + VB.x + ' ' + VB.y + ' ' + VB.w + ' ' + VB.h + '" xmlns="' + NS + '">' +
        '<ellipse class="k-shadow" cx="50" cy="176" rx="22" ry="3.8" fill="rgba(0,0,0,.28)"/>' +
        '<g class="k-root" filter="url(#mcg-boil-0)">' + (kind === 'girl' ? girlSVG() : boySVG()) + '</g>' +
      '</svg>';
    var q = this.el.querySelector.bind(this.el);
    this._root = q('.k-root');
    this._parts = { la: q('.k-arml > g'), ra: q('.k-armr > g'), ll: q('.k-legl > g'), rl: q('.k-legr > g') };
    this._eyesOpen = q('.k-eyes-open'); this._eyesShut = q('.k-eyes-shut');
    this._smile = q('.k-mouth-smile'); this._open = q('.k-mouth-open');
    this._shadow = q('.k-shadow');
    this._jitter = 0; this._blinkAt = Date.now() + 1500 + Math.random() * 3000; this._blinking = 0;
    this.idle = opts.idle !== false;
    this.setWidth(opts.width || 72);
    this.pose(opts.pose || 'stand');
    kids.push(this);
  }

  Kid.prototype.setWidth = function (w) {
    this.width = w; this.height = w * VB.h / VB.w;
    this.el.style.width = w + 'px';
    return this;
  };

  Kid.prototype.pose = function (name) {
    var p = POSES[name] || POSES.stand;
    this.current = name; this._p = p;
    for (var k in this._parts) {
      var g = this._parts[k], j = g.getAttribute('data-j');
      g.setAttribute('transform', 'rotate(' + p[k] + ' ' + j + ')');
    }
    this._eyesShut.style.display = this._blinking ? '' : 'none';
    this._eyesOpen.style.display = this._blinking ? 'none' : '';
    this._smile.style.display = p.face === 'open' ? 'none' : '';
    this._open.style.display = p.face === 'open' ? '' : 'none';
    this._applyRoot();
    return this;
  };

  Kid.prototype._applyRoot = function () {
    var p = this._p;
    this._root.setAttribute('transform',
      'translate(50 176) rotate(' + (p.tilt + this._jitter) + ') scale(' + p.sx + ' ' + p.sy + ') translate(-50 -176)');
  };

  Kid.prototype.airborne = function (on) { this._shadow.style.opacity = on ? '0' : ''; };

  Kid.prototype._tick = function (b) {
    this._root.setAttribute('filter', 'url(#mcg-boil-' + b + ')');
    this._jitter = (Math.random() - 0.5) * 1.4; // hand-placed wobble
    var now = Date.now();
    if (this.idle && !this._playing) {
      if (!this._blinking && now > this._blinkAt) { this._blinking = 1; this._blinkAt = now + 140; }
      else if (this._blinking && now > this._blinkAt) { this._blinking = 0; this._blinkAt = now + 2200 + Math.random() * 3500; }
      if (this.current === 'stand' || this.current === 'breathe') {
        this.pose(Math.floor(now / 900) % 2 ? 'breathe' : 'stand');
        return;
      }
    }
    this.pose(this.current);
  };

  // Play a pose sequence at `fps`, `loops` times (Infinity = until stop()). Resolves when done.
  Kid.prototype.play = function (seq, fps, loops, endPose) {
    var self = this;
    this.stop();
    if (reduced) { this.pose(endPose || seq[seq.length - 1]); return Promise.resolve(); }
    return new Promise(function (resolve) {
      var i = 0, total = seq.length * (loops || 1);
      self._playing = true; self._blinking = 0;
      self.pose(seq[0]);
      self._timer = setInterval(function () {
        i++;
        if (i >= total) { self.stop(); self.pose(endPose || 'stand'); resolve(); return; }
        self.pose(seq[i % seq.length]);
      }, 1000 / (fps || 12));
      self._resolve = resolve;
    });
  };

  Kid.prototype.stop = function () {
    if (this._timer) clearInterval(this._timer);
    this._timer = null; this._playing = false;
    if (this._resolve) { var r = this._resolve; this._resolve = null; r(); }
  };

  Kid.prototype.say = function (text, ms) {
    var b = this._bubble;
    if (!b) { b = this._bubble = document.createElement('div'); b.className = 'mcg-bubble'; this.el.appendChild(b); }
    b.textContent = text;
    b.classList.add('on');
    clearTimeout(this._sayT);
    this._sayT = setTimeout(function () { b.classList.remove('on'); }, ms || 2200);
  };

  window.McGrathStudents = {
    create: function (kind, opts) { return new Kid(kind, opts); },
    POSES: POSES,
    COLORS: C,
    reducedMotion: reduced
  };
})();
