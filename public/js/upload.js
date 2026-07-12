/* upload.js — client-side image compression + upload to api/upload.php.
   Exposes window.Uploads. Used by <image-slot>, the parish form and the
   site-settings modal so every image on the site can be replaced by the admin.

   Images are downscaled in the browser (canvas → WebP) before upload, so a
   12 MP phone photo becomes a ~200 KB web-ready file — important on Kenyan
   mobile connections and for shared-hosting disk space. */
(function () {
  "use strict";
  var API = "api/upload.php";
  var MAX_DIM = 1600;           // longest side after downscale
  var ACCEPT = ["image/png", "image/jpeg", "image/webp", "image/gif"];

  function compress(file) {
    // GIFs pass through untouched (canvas would drop animation)
    if (file.type === "image/gif" || typeof createImageBitmap !== "function") {
      return Promise.resolve(file);
    }
    return createImageBitmap(file).then(function (bmp) {
      try {
        var scale = Math.min(1, MAX_DIM / Math.max(bmp.width, bmp.height));
        if (scale >= 1 && file.size < 600 * 1024) return file; // already small
        var w = Math.max(1, Math.round(bmp.width * scale));
        var h = Math.max(1, Math.round(bmp.height * scale));
        var canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d").drawImage(bmp, 0, 0, w, h);
        return new Promise(function (resolve) {
          canvas.toBlob(function (blob) {
            resolve(blob || file);
          }, "image/webp", 0.85);
        });
      } finally {
        if (bmp.close) bmp.close();
      }
    }).catch(function () { return file; });
  }

  /* upload a File/Blob; resolves with the server URL ("uploads/img_….webp") */
  function upload(fileOrBlob, name) {
    var fd = new FormData();
    fd.append("file", fileOrBlob, name || "image.webp");
    return fetch(API, {
      method: "POST",
      credentials: "same-origin",
      headers: { "X-Requested-With": "fetch" },
      body: fd,
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok || !j.ok || !j.url) throw new Error((j && j.error) || ("HTTP " + r.status));
        return j.url;
      });
    });
  }

  /* open a file picker; resolves with the chosen File (or null on cancel) */
  function pick() {
    return new Promise(function (resolve) {
      var input = document.createElement("input");
      input.type = "file";
      input.accept = ACCEPT.join(",");
      input.onchange = function () { resolve(input.files && input.files[0] ? input.files[0] : null); };
      // most browsers won't fire change on cancel; that's fine — promise just idles
      input.click();
    });
  }

  /* one-call helper: pick → compress → upload → url */
  function pickAndUpload() {
    return pick().then(function (f) {
      if (!f) return null;
      if (ACCEPT.indexOf(f.type) < 0) throw new Error("Choose a PNG, JPEG, WebP or GIF image.");
      return compress(f).then(function (blob) { return upload(blob, f.name); });
    });
  }

  window.Uploads = {
    ACCEPT: ACCEPT,
    compress: compress,
    upload: upload,
    pick: pick,
    pickAndUpload: pickAndUpload,
  };
})();
