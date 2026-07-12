/**
 * <image-slot> — admin-fillable image frame (production version).
 *
 * Same element API as the design prototype (id, src, shape, radius, fit,
 * placeholder), but persistence is real: a dropped/browsed image is
 * compressed in the browser (js/upload.js), uploaded to api/upload.php, and
 * the returned URL is written onto the parish record through
 * window.SlotBridge (js/store.js) — so it saves server-side and shows for
 * every visitor.
 *
 * Slots are only interactive while the admin is signed in
 * (window.AdminAuth.isAuthed()); the app renders plain <img> frames for
 * visitors anyway (see Frame in js/church.jsx), so this is belt-and-braces.
 *
 * Slot id convention (set by church.jsx):
 *   hero-<parishId>   → parish.heroImage
 *   side1-/side2-<id> → parish.images[1] / images[2]
 *   g0- … g5-<id>     → parish.images[0…5]
 */
(() => {
  const stylesheet =
    ':host{display:inline-block;position:relative;vertical-align:top;' +
    '  font:13px/1.3 system-ui,-apple-system,sans-serif;color:rgba(0,0,0,.55);width:240px;height:160px}' +
    '.frame{position:absolute;inset:0;overflow:hidden;background:rgba(0,0,0,.04)}' +
    '.frame img{width:100%;height:100%;object-fit:cover;display:block;-webkit-user-drag:none;user-select:none}' +
    '.empty{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;' +
    '  justify-content:center;gap:6px;text-align:center;padding:12px;box-sizing:border-box;' +
    '  cursor:pointer;user-select:none}' +
    '.empty svg{opacity:.45}' +
    '.empty .cap{max-width:90%;font-weight:500;letter-spacing:.01em}' +
    '.empty .sub{font-size:11px}' +
    '.empty .sub u{text-underline-offset:2px;text-decoration-color:rgba(0,0,0,.25)}' +
    '.empty:hover .sub u{color:rgba(0,0,0,.75);text-decoration-color:currentColor}' +
    ':host([data-over]) .frame{outline:2px solid #1462b8;outline-offset:-2px;background:rgba(20,98,184,.10)}' +
    '.ring{position:absolute;inset:0;pointer-events:none;border:1.5px dashed rgba(0,0,0,.25);transition:border-color .12s}' +
    ':host([data-over]) .ring{border-color:#1462b8}' +
    ':host([data-filled]) .ring{display:none}' +
    '.busy{position:absolute;inset:0;display:none;place-items:center;background:rgba(255,255,255,.6);z-index:3}' +
    ':host([data-busy]) .busy{display:grid}' +
    '.busy .spin{width:22px;height:22px;border-radius:50%;border:2.5px solid rgba(20,98,184,.25);' +
    '  border-top-color:#1462b8;animation:isspin .7s linear infinite}' +
    '@keyframes isspin{to{transform:rotate(360deg)}}' +
    '.ctl{position:absolute;top:100%;left:50%;transform:translateX(-50%);padding-top:8px;' +
    '  display:flex;gap:6px;opacity:0;pointer-events:none;transition:opacity .12s;z-index:2;white-space:nowrap}' +
    ':host([data-filled]:hover) .ctl{opacity:1;pointer-events:auto}' +
    '.ctl button{appearance:none;border:0;border-radius:6px;padding:5px 10px;cursor:pointer;' +
    '  background:rgba(0,0,0,.65);color:#fff;font:11px/1 system-ui,-apple-system,sans-serif;backdrop-filter:blur(6px)}' +
    '.ctl button:hover{background:rgba(0,0,0,.8)}' +
    '.err{position:absolute;left:8px;bottom:8px;right:8px;color:#b3261e;font-size:11px;' +
    '  background:rgba(255,255,255,.85);padding:4px 6px;border-radius:5px;pointer-events:none;z-index:4}';

  const icon =
    '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
    '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>' +
    '<path d="m21 15-5-5L5 21"/></svg>';

  class ImageSlot extends HTMLElement {
    static get observedAttributes() {
      return ['shape', 'radius', 'fit', 'placeholder', 'src', 'id'];
    }

    constructor() {
      super();
      const root = this.attachShadow({ mode: 'open' });
      root.innerHTML =
        '<style>' + stylesheet + '</style>' +
        '<div class="frame" part="frame">' +
        '  <img part="image" alt="" draggable="false" style="display:none">' +
        '  <div class="empty" part="empty">' + icon +
        '    <div class="cap"></div>' +
        '    <div class="sub">or <u>browse files</u></div></div>' +
        '  <div class="ring" part="ring"></div>' +
        '</div>' +
        '<div class="busy"><span class="spin"></span></div>' +
        '<div class="ctl"><button data-act="replace" title="Replace image">Replace</button>' +
        '  <button data-act="clear" title="Remove image">Remove</button></div>' +
        '<input type="file" hidden>';
      this._frame = root.querySelector('.frame');
      this._ring = root.querySelector('.ring');
      this._img = root.querySelector('.frame img');
      this._empty = root.querySelector('.empty');
      this._cap = root.querySelector('.cap');
      this._input = root.querySelector('input');
      this._input.accept = (window.Uploads ? window.Uploads.ACCEPT : ['image/png', 'image/jpeg', 'image/webp', 'image/gif']).join(',');
      this._err = null;
      this._depth = 0;

      this._empty.addEventListener('click', () => this._canEdit() && this._input.click());
      root.addEventListener('click', (e) => {
        const act = e.target && e.target.getAttribute && e.target.getAttribute('data-act');
        if (!act || !this._canEdit()) return;
        if (act === 'replace') this._input.click();
        if (act === 'clear' && window.SlotBridge && this.id) window.SlotBridge.clear(this.id);
      });
      this._input.addEventListener('change', () => {
        const f = this._input.files && this._input.files[0];
        if (f) this._ingest(f);
        this._input.value = '';
      });
    }

    _canEdit() {
      return !!(window.AdminAuth && window.AdminAuth.isAuthed());
    }

    connectedCallback() {
      this.addEventListener('dragenter', this);
      this.addEventListener('dragover', this);
      this.addEventListener('dragleave', this);
      this.addEventListener('drop', this);
      this._render();
    }

    disconnectedCallback() {
      this.removeEventListener('dragenter', this);
      this.removeEventListener('dragover', this);
      this.removeEventListener('dragleave', this);
      this.removeEventListener('drop', this);
    }

    attributeChangedCallback() { if (this.shadowRoot) this._render(); }

    handleEvent(e) {
      if (!this._canEdit()) return;
      if (e.type === 'dragenter' || e.type === 'dragover') {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
        if (e.type === 'dragenter') this._depth++;
        this.setAttribute('data-over', '');
      } else if (e.type === 'dragleave') {
        if (--this._depth <= 0) { this._depth = 0; this.removeAttribute('data-over'); }
      } else if (e.type === 'drop') {
        e.preventDefault();
        e.stopPropagation();
        this._depth = 0;
        this.removeAttribute('data-over');
        const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
        if (f) this._ingest(f);
      }
    }

    _ingest(file) {
      this._setError(null);
      const U = window.Uploads;
      if (!U) return;
      if (U.ACCEPT.indexOf(file.type) < 0) {
        this._setError('Drop a PNG, JPEG, WebP or GIF image.');
        return;
      }
      this.setAttribute('data-busy', '');
      U.compress(file)
        .then((blob) => U.upload(blob, file.name))
        .then((url) => {
          this.removeAttribute('data-busy');
          // show immediately; the store update re-renders with the same URL
          this.setAttribute('src', url);
          if (window.SlotBridge && this.id) window.SlotBridge.assign(this.id, url);
        })
        .catch((err) => {
          this.removeAttribute('data-busy');
          this._setError('Upload failed: ' + (err && err.message ? err.message : 'unknown error'));
        });
    }

    _setError(msg) {
      if (this._err) { this._err.remove(); this._err = null; }
      if (!msg) return;
      const d = document.createElement('div');
      d.className = 'err';
      d.textContent = msg;
      this.shadowRoot.appendChild(d);
      this._err = d;
      setTimeout(() => { if (this._err === d) { d.remove(); this._err = null; } }, 4000);
    }

    _render() {
      const shape = (this.getAttribute('shape') || 'rounded').toLowerCase();
      let radius = '';
      if (shape === 'circle') radius = '50%';
      else if (shape === 'pill') radius = '9999px';
      else if (shape === 'rounded') {
        const n = parseFloat(this.getAttribute('radius'));
        radius = (Number.isFinite(n) ? n : 12) + 'px';
      }
      this._frame.style.borderRadius = radius;
      this._ring.style.borderRadius = radius;

      const fit = this.getAttribute('fit') || 'cover';
      this._img.style.objectFit = fit;

      const url = this.getAttribute('src') || '';
      this._cap.textContent = this.getAttribute('placeholder') || 'Drop an image';
      if (url) {
        if (this._img.getAttribute('src') !== url) this._img.src = url;
        this._img.style.display = 'block';
        this._empty.style.display = 'none';
        this.setAttribute('data-filled', '');
      } else {
        this._img.style.display = 'none';
        this._img.removeAttribute('src');
        this._empty.style.display = 'flex';
        this.removeAttribute('data-filled');
      }
    }
  }

  if (!customElements.get('image-slot')) {
    customElements.define('image-slot', ImageSlot);
  }
})();
