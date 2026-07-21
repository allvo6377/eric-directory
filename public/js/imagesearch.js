/* imagesearch.js — retrieve parish photos from the internet (Wikimedia Commons).
   Plain JS, loaded after store.js. Exposes window.ImageSearch.

   - Curated, confirmed Commons files for the flagship cathedrals (guaranteed to load).
   - Live Commons API search (CORS-open via origin=*) for everything else.
   Images are served from upload.wikimedia.org and embed in <img> without CORS. */
(function () {
  "use strict";

  function filePath(name, width) {
    return "https://commons.wikimedia.org/wiki/Special:FilePath/" +
      encodeURIComponent(name) + "?width=" + (width || 1200);
  }

  /* confirmed Wikimedia Commons filenames, keyed by seed parish id.
     Each file was verified to exist, load, and depict the correct Catholic church. */
  var CURATED = {
    "holy-family-basilica": {
      hero: "Holy Family Basilica (Nairobi, Kenya) 01.JPG",
      images: [
        "Holy Family Basilica (Nairobi, Kenya) 02.JPG",
        "Lascar Holy Family Basilica Cathedral (4540191843).jpg",
        "Nairobi City centre including Basilica.jpg",
      ],
    },
    "holy-ghost-cathedral-mombasa": {
      hero: "Catholic Church in Mombasa.JPG",
      images: [
        "The Roman Archdiocese of Mombasa, Holy Ghost Cathedral.jpg",
        "Holy Ghost RC cathedral in Mombasa.jpg",
        "Holy Ghost Cathedral Mombasa.JPG",
      ],
    },
    "consolata-cathedral-nyeri": {
      hero: "Nyeri katedral.jpg",
      images: [],
    },
    "st-teresas-cathedral-kisumu": {
      hero: "St-Therese-of-Lisieux-Cathedral-RC-Archdiocese-of-Kisumu-Kenya.jpg",
      images: [],
    },
    "sacred-heart-cathedral-kericho": {
      hero: "Sacred Heart Cathedral of Kericho Kenya by John Macaslan and Partners Image edmund sumner.jpg",
      images: [
        "KC W Facade Evening.jpg",
        "Kericho Cathedral-JamiiForum.png",
      ],
    },
  };

  function curatedFor(church) {
    var c = CURATED[church.id];
    if (!c) return null;
    return {
      heroImage: filePath(c.hero, 1400),
      images: (c.images || []).map(function (n) { return filePath(n, 1100); }),
    };
  }

  /* ---- live Commons API ---- */
  function api(params, signal) {
    var url = "https://commons.wikimedia.org/w/api.php?origin=*&format=json&" + params;
    return fetch(url, { signal: signal, headers: { Accept: "application/json" } })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); });
  }

  function withTimeout(promise, ms) {
    var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    var t = setTimeout(function () { if (ctrl) ctrl.abort(); }, ms || 7000);
    return { signal: ctrl ? ctrl.signal : undefined, done: function () { clearTimeout(t); } };
  }

  /* search File namespace, return [{url, title}] of usable photos (largest thumbs) */
  function searchCommons(query, limit) {
    var to = withTimeout(null, 7000);
    var params = "action=query&prop=imageinfo&iiprop=url|mime|size&iiurlwidth=1200" +
      "&generator=search&gsrnamespace=6&gsrlimit=" + (limit || 8) +
      "&gsrsearch=" + encodeURIComponent(query);
    return api(params, to.signal).then(function (data) {
      to.done();
      var pages = data && data.query && data.query.pages;
      if (!pages) return [];
      return Object.keys(pages).map(function (k) { return pages[k]; })
        .sort(function (a, b) { return (a.index || 0) - (b.index || 0); })
        .filter(function (p) {
          var ii = p.imageinfo && p.imageinfo[0];
          return ii && /image\/(jpeg|png)/i.test(ii.mime || "") && (ii.width || 0) >= 480 &&
            !/\b(map|locator|coat of arms|flag|logo|seal|diagram|plan|panoramio)\b/i.test(p.title || "");
        })
        .map(function (p) {
          var ii = p.imageinfo[0];
          return { url: ii.thumburl || ii.url, title: (p.title || "").replace(/^File:/, "") };
        });
    }).catch(function () { to.done(); return []; });
  }

  function norm(s) { return (s || "").toLowerCase().replace(/[^a-z0-9]+/g, ""); }

  /* keep only results whose filename clearly references this church's place/name —
     prevents attaching a wrong-town or wrong-denomination photo from a fuzzy search */
  function relevant(results, church) {
    var place = [norm(church.city), norm(church.county)].filter(function (x) { return x && x.length >= 4; });
    var nameWords = (church.name || "").split(/\s+/)
      .filter(function (w) { return w.length >= 5 && !/cathedral|church|parish|basilica|shrine|chapel/i.test(w); })
      .map(norm);
    var tokens = place.concat(nameWords).filter(Boolean);
    if (!tokens.length) return [];
    return results.filter(function (r) {
      var t = norm(r.title);
      var hitsPlace = place.some(function (p) { return t.indexOf(p) >= 0; });
      var hitsName = nameWords.some(function (n) { return t.indexOf(n) >= 0; });
      // require a place match (or a strong patron/name match) AND a church-ish word
      return (hitsPlace || hitsName) && /catholic|cathedral|church|basilica|shrine|chapel|parish|katedral/i.test(r.title);
    });
  }

  /* find images for one church: curated, else relevance-filtered live searches */
  function findImages(church) {
    var cur = curatedFor(church);
    if (cur) return Promise.resolve({ heroImage: cur.heroImage, images: cur.images, source: "archive" });

    var queries = [];
    var nm = church.name || "";
    if (church.city) queries.push(nm + " " + church.city);
    queries.push(nm + " Kenya");
    if (church.city) queries.push("Catholic church " + church.city + " Kenya");

    var i = 0;
    function tryNext() {
      if (i >= queries.length) return Promise.resolve(null);
      return searchCommons(queries[i++], 8).then(function (results) {
        var ok = relevant(results, church);
        if (ok.length) {
          var urls = ok.map(function (r) { return r.url; });
          return { heroImage: urls[0], images: urls.slice(0, 4), source: "web" };
        }
        return tryNext();
      });
    }
    return tryNext();
  }

  /* apply bundled (verified, no-network) curated photos to any seed parish missing one */
  function applyCurated() {
    if (!window.ParishStore) return 0;
    var n = 0;
    window.ParishStore.getAll().forEach(function (c) {
      if (!c.heroImage && CURATED[c.id]) {
        var r = curatedFor(c);
        window.ParishStore.update(c.id, { heroImage: r.heroImage, images: r.images });
        n++;
      }
    });
    return n;
  }

  window.ImageSearch = {
    filePath: filePath,
    curatedFor: curatedFor,
    searchCommons: searchCommons,
    findImages: findImages,
    applyCurated: applyCurated,
    CURATED: CURATED,
  };
})();
