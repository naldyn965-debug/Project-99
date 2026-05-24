/**
 * Nabtex Performance Engine — performance.js
 * ═══════════════════════════════════════════
 * تحسين شامل للأداء:
 * - إزالة Layout Shifts
 * - تحسين الـ Scroll السلس
 * - تقليل Re-renders غير الضرورية
 * - تحسين الاستجابة للمس
 * - تقليل استهلاك الذاكرة والـ CPU
 * - Virtual DOM دفاعي للقوائم الكبيرة
 * - Intersection Observer للـ Lazy Loading
 * - RAF-based animations
 * - Debounce / Throttle احترافي
 * - Memory leak prevention
 */

(function(root) {
  'use strict';

  var LOG = function() {
    var args = Array.prototype.slice.call(arguments);
    args.unshift('%c[Nabtex Perf]', 'color:#d97706;font-weight:700');
    console.log.apply(console, args);
  };

  /* ══════════════════════════════════════════════
     DEBOUNCE / THROTTLE
  ══════════════════════════════════════════════ */
  function debounce(fn, ms) {
    var timer;
    return function() {
      var ctx  = this;
      var args = arguments;
      clearTimeout(timer);
      timer = setTimeout(function() { fn.apply(ctx, args); }, ms);
    };
  }

  function throttle(fn, ms) {
    var last = 0;
    return function() {
      var now = Date.now();
      if (now - last >= ms) {
        last = now;
        fn.apply(this, arguments);
      }
    };
  }

  /* ══════════════════════════════════════════════
     RAF SCHEDULER — دُفع الـ animations لـ rAF
  ══════════════════════════════════════════════ */
  var _rafCallbacks = [];
  var _rafRunning   = false;

  function rafSchedule(fn) {
    _rafCallbacks.push(fn);
    if (!_rafRunning) {
      _rafRunning = true;
      requestAnimationFrame(function _flush() {
        var cbs = _rafCallbacks.splice(0);
        cbs.forEach(function(cb) { try { cb(); } catch(e) {} });
        _rafRunning = _rafCallbacks.length > 0;
        if (_rafRunning) requestAnimationFrame(_flush);
      });
    }
  }

  /* ══════════════════════════════════════════════
     SMOOTH SCROLL — تحسين التمرير
  ══════════════════════════════════════════════ */
  function initSmoothScroll() {
    /* CSS will-change على عناصر التمرير */
    var scrollContainers = document.querySelectorAll('.farm-main, .page, #pg-plant, #pg-citrus');
    scrollContainers.forEach(function(el) {
      el.style.webkitOverflowScrolling = 'touch';
      el.style.overscrollBehavior = 'contain';
    });

    /* Passive event listeners للتمرير السلس */
    var passiveOpts = { passive: true };

    /* تحسين scroll performance */
    document.addEventListener('scroll', throttle(function() {
      /* تحديث sticky nav فقط عند الحاجة */
      var nav = document.querySelector('.nav');
      if (!nav) return;
      var scrolled = window.scrollY > 10;
      if (scrolled !== nav._wasScrolled) {
        nav._wasScrolled = scrolled;
        rafSchedule(function() {
          nav.classList.toggle('up', scrolled);
        });
      }
    }, 50), passiveOpts);
  }

  /* ══════════════════════════════════════════════
     INTERSECTION OBSERVER — Lazy loading
  ══════════════════════════════════════════════ */
  var _revealObserver;

  function initRevealObserver() {
    if (!root.IntersectionObserver) return;

    _revealObserver = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          rafSchedule(function() {
            entry.target.classList.add('revealed');
            entry.target.classList.remove('reveal');
          });
          _revealObserver.unobserve(entry.target);
        }
      });
    }, {
      threshold   : 0.08,
      rootMargin  : '0px 0px -40px 0px'
    });

    /* مراقبة عناصر .reveal الموجودة */
    _observeRevealElements();
  }

  function _observeRevealElements() {
    if (!_revealObserver) return;
    var els = document.querySelectorAll('.reveal:not(.revealed)');
    els.forEach(function(el) { _revealObserver.observe(el); });
  }

  /* إعادة المراقبة بعد تغيير الـ DOM */
  var _domObserver;
  function initDomObserver() {
    if (!root.MutationObserver) return;

    _domObserver = new MutationObserver(debounce(function(mutations) {
      var hasNewNodes = mutations.some(function(m) {
        return m.addedNodes.length > 0;
      });
      if (hasNewNodes) {
        _observeRevealElements();
        _lazyLoadImages();
      }
    }, 100));

    _domObserver.observe(document.body, {
      childList : true,
      subtree   : true
    });
  }

  /* ══════════════════════════════════════════════
     LAZY IMAGE LOADING
  ══════════════════════════════════════════════ */
  var _imgObserver;

  function initLazyImages() {
    if (!root.IntersectionObserver) return;

    _imgObserver = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          var img = entry.target;
          if (img.dataset.src) {
            img.src = img.dataset.src;
            delete img.dataset.src;
          }
          if (img.dataset.srcset) {
            img.srcset = img.dataset.srcset;
            delete img.dataset.srcset;
          }
          img.classList.add('img-loaded');
          _imgObserver.unobserve(img);
        }
      });
    }, {
      rootMargin : '200px 0px',
      threshold  : 0
    });

    _lazyLoadImages();
  }

  function _lazyLoadImages() {
    if (!_imgObserver) return;
    var imgs = document.querySelectorAll('img[data-src], img[data-srcset]');
    imgs.forEach(function(img) { _imgObserver.observe(img); });
  }

  /* ══════════════════════════════════════════════
     TOUCH OPTIMIZATION — تحسين اللمس
  ══════════════════════════════════════════════ */
  function initTouchOptimizations() {
    /* CSS لتحسين استجابة اللمس */
    var style = document.createElement('style');
    style.textContent = [
      '* { touch-action: pan-y; }',
      'button, a, [role=button], .nl, .farm-btn-primary, .farm-btn-secondary {',
      '  touch-action: manipulation;',
      '  -webkit-user-select: none;',
      '  user-select: none;',
      '}',
      '.farm-main, .page { overscroll-behavior: contain; }',
      /* منع flash اللمس */
      'body { -webkit-tap-highlight-color: transparent; }',
      /* أنيميشن سلس للعناصر */
      '.reveal {',
      '  opacity: 0;',
      '  transform: translateY(16px);',
      '  transition: opacity .4s ease, transform .4s ease;',
      '  will-change: opacity, transform;',
      '}',
      '.revealed {',
      '  opacity: 1 !important;',
      '  transform: none !important;',
      '}',
      /* تحسين الصور */
      '.img-loaded { animation: imgFadeIn .3s ease; }',
      '@keyframes imgFadeIn { from { opacity: 0 } to { opacity: 1 } }',
      /* Sync status badge */
      '.nabtex-sync-badge {',
      '  position: fixed;',
      '  bottom: calc(env(safe-area-inset-bottom, 0px) + 16px);',
      '  left: 16px;',
      '  z-index: 7000;',
      '  display: flex;',
      '  align-items: center;',
      '  gap: 6px;',
      '  padding: 7px 14px;',
      '  border-radius: 9999px;',
      '  font-size: 12px;',
      '  font-weight: 700;',
      '  background: var(--card, #fff);',
      '  border: 1.5px solid var(--line, #e2eee5);',
      '  box-shadow: 0 4px 16px rgba(0,0,0,.08);',
      '  transition: all .3s cubic-bezier(.16,1,.3,1);',
      '  pointer-events: none;',
      '  transform: translateY(0);',
      '}',
      '.nabtex-sync-badge.hidden {',
      '  opacity: 0;',
      '  transform: translateY(20px);',
      '  pointer-events: none;',
      '}',
      '.nabtex-sync-dot {',
      '  width: 7px; height: 7px;',
      '  border-radius: 50%;',
      '  background: #22c55e;',
      '}',
      '.nabtex-sync-dot.pending { background: #f59e0b; animation: syncPulse 1s infinite; }',
      '.nabtex-sync-dot.failed  { background: #ef4444; }',
      '@keyframes syncPulse {',
      '  0%,100%{ opacity:1; transform:scale(1); }',
      '  50%{ opacity:.5; transform:scale(.8); }',
      '}'
    ].join('\n');
    document.head.appendChild(style);
  }

  /* ══════════════════════════════════════════════
     VIRTUAL LIST — للقوائم الكبيرة (تحسين الذاكرة)
  ══════════════════════════════════════════════ */
  function createVirtualList(opts) {
    /* opts: { container, items, itemHeight, renderItem } */
    var container  = opts.container;
    var items      = opts.items;
    var itemHeight = opts.itemHeight || 80;
    var renderItem = opts.renderItem;
    var buffer     = opts.buffer || 3;

    var totalHeight = items.length * itemHeight;
    var wrapper = document.createElement('div');
    wrapper.style.cssText = 'position:relative;height:' + totalHeight + 'px;';
    container.appendChild(wrapper);

    var rendered = {};

    function render() {
      var scrollTop  = container.scrollTop;
      var viewHeight = container.clientHeight;
      var startIdx   = Math.max(0, Math.floor(scrollTop / itemHeight) - buffer);
      var endIdx     = Math.min(items.length - 1, Math.ceil((scrollTop + viewHeight) / itemHeight) + buffer);

      /* Unmount items hors plage */
      Object.keys(rendered).forEach(function(idx) {
        idx = parseInt(idx);
        if (idx < startIdx || idx > endIdx) {
          var el = rendered[idx];
          if (el && el.parentNode) el.parentNode.removeChild(el);
          delete rendered[idx];
        }
      });

      /* Mount items in range */
      for (var i = startIdx; i <= endIdx; i++) {
        if (!rendered[i]) {
          var el = document.createElement('div');
          el.style.cssText = 'position:absolute;top:' + (i * itemHeight) + 'px;width:100%;';
          el.innerHTML = renderItem(items[i], i);
          wrapper.appendChild(el);
          rendered[i] = el;
        }
      }
    }

    container.addEventListener('scroll', throttle(render, 16), { passive: true });
    render();

    return {
      update: function(newItems) {
        items = newItems;
        totalHeight = items.length * itemHeight;
        wrapper.style.height = totalHeight + 'px';
        rendered = {};
        render();
      },
      destroy: function() {
        if (wrapper.parentNode) wrapper.parentNode.removeChild(wrapper);
      }
    };
  }

  /* ══════════════════════════════════════════════
     SYNC STATUS UI
  ══════════════════════════════════════════════ */
  var _syncBadge;
  var _syncBadgeTimer;

  function initSyncStatusUI() {
    _syncBadge = document.createElement('div');
    _syncBadge.className = 'nabtex-sync-badge hidden';
    _syncBadge.setAttribute('aria-live', 'polite');
    document.body.appendChild(_syncBadge);

    /* استمع لأحداث المزامنة */
    window.addEventListener('nabtex-sync', function(e) {
      var d = e.detail;
      if (d.type === 'sync-success') {
        _showSyncBadge('✓ تمت المزامنة', 'synced');
      } else if (d.type === 'sync-error') {
        _showSyncBadge('⚠️ فشل الإرسال — سيُعاد المحاولة', 'failed');
      }
    });

    /* مراقبة الحالة أونلاين/أوفلاين */
    window.addEventListener('offline', function() {
      _showSyncBadge('📴 وضع بلا إنترنت — البيانات محفوظة محلياً', 'pending', 0);
    });
    window.addEventListener('online', function() {
      _showSyncBadge('🟢 عاد الاتصال — جاري المزامنة...', 'synced', 3000);
    });
  }

  function _showSyncBadge(text, state, duration) {
    if (!_syncBadge) return;
    clearTimeout(_syncBadgeTimer);

    _syncBadge.innerHTML = '<div class="nabtex-sync-dot ' + (state || '') + '"></div>' +
                           '<span style="color:var(--ink,#1e2a24)">' + text + '</span>';
    _syncBadge.classList.remove('hidden');

    if (duration !== 0) {
      _syncBadgeTimer = setTimeout(function() {
        _syncBadge.classList.add('hidden');
      }, duration || 4000);
    }
  }

  /* ══════════════════════════════════════════════
     MEMORY MANAGEMENT — منع memory leaks
  ══════════════════════════════════════════════ */
  var _listeners = [];

  function addManagedListener(el, event, fn, opts) {
    el.addEventListener(event, fn, opts || false);
    _listeners.push({ el: el, event: event, fn: fn, opts: opts });
  }

  function clearManagedListeners() {
    _listeners.forEach(function(l) {
      l.el.removeEventListener(l.event, l.fn, l.opts || false);
    });
    _listeners = [];
  }

  /* تنظيف تلقائي عند إعادة تحميل الصفحة */
  window.addEventListener('pagehide', clearManagedListeners);
  window.addEventListener('beforeunload', clearManagedListeners);

  /* ══════════════════════════════════════════════
     PAGE TRANSITIONS — انتقالات سلسة
  ══════════════════════════════════════════════ */
  function initPageTransitions() {
    /* Override showPage لإضافة transitions */
    var originalShowPage = root.showPage;
    if (typeof originalShowPage !== 'function') return;

    root.showPage = function(pageId) {
      var current = document.querySelector('.page.active');
      var next    = document.getElementById('pg-' + pageId);

      if (!next || (current && current === next)) {
        return originalShowPage.call(root, pageId);
      }

      /* Animation */
      if (current) {
        current.style.transition = 'opacity .15s, transform .15s';
        current.style.opacity    = '0';
        current.style.transform  = 'translateY(6px)';
      }

      setTimeout(function() {
        originalShowPage.call(root, pageId);
        if (next) {
          next.style.opacity   = '0';
          next.style.transform = 'translateY(-6px)';
          requestAnimationFrame(function() {
            requestAnimationFrame(function() {
              next.style.transition = 'opacity .2s, transform .2s';
              next.style.opacity    = '1';
              next.style.transform  = '';
            });
          });
        }
        /* Scroll to top */
        window.scrollTo({ top: 0, behavior: 'instant' });
      }, 120);
    };
  }

  /* ══════════════════════════════════════════════
     FONT LOADING OPTIMIZATION
  ══════════════════════════════════════════════ */
  function optimizeFonts() {
    /* إذا كان الـ font مُحمّل مسبقاً من الكاش، نتجنب FOUT */
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function() {
        document.documentElement.classList.add('fonts-loaded');
      });
    } else {
      /* Fallback */
      setTimeout(function() {
        document.documentElement.classList.add('fonts-loaded');
      }, 2000);
    }
  }

  /* ══════════════════════════════════════════════
     BATTERY / CPU SAVER
  ══════════════════════════════════════════════ */
  function initResourceSaver() {
    /* تقليل الأنيميشن عند الطاقة المنخفضة */
    if (navigator.getBattery) {
      navigator.getBattery().then(function(battery) {
        function check() {
          if (battery.level < 0.15 && !battery.charging) {
            document.documentElement.classList.add('save-battery');
            LOG('🔋 وضع توفير البطارية');
          } else {
            document.documentElement.classList.remove('save-battery');
          }
        }
        battery.addEventListener('levelchange', check);
        battery.addEventListener('chargingchange', check);
        check();
      }).catch(function() {});
    }

    /* تقليل الأنيميشن إذا prefersReducedMotion */
    if (root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.documentElement.classList.add('no-motion');
    }

    /* Style للـ battery saver */
    var style = document.createElement('style');
    style.textContent = [
      '.save-battery *, .no-motion * {',
      '  animation-duration: 0.01ms !important;',
      '  animation-iteration-count: 1 !important;',
      '  transition-duration: 0.01ms !important;',
      '}'
    ].join('\n');
    document.head.appendChild(style);
  }

  /* ══════════════════════════════════════════════
     CRITICAL CSS INJECTION — تحسين FCP
  ══════════════════════════════════════════════ */
  function injectCriticalStyles() {
    var style = document.createElement('style');
    style.textContent = [
      /* Skeleton loader لعناصر المزرعة */
      '.farm-skeleton {',
      '  background: linear-gradient(90deg, var(--bg2,#f3faf4) 25%, var(--bg3,#ecf5ee) 50%, var(--bg2,#f3faf4) 75%);',
      '  background-size: 200% 100%;',
      '  animation: skelPulse 1.5s infinite;',
      '  border-radius: 8px;',
      '}',
      '@keyframes skelPulse {',
      '  0% { background-position: 200% 0; }',
      '  100% { background-position: -200% 0; }',
      '}',
      /* Offline indicator */
      '.farm-offline-indicator {',
      '  display: inline-flex;',
      '  align-items: center;',
      '  gap: 6px;',
      '  padding: 4px 10px;',
      '  border-radius: 9999px;',
      '  background: rgba(245,158,11,.12);',
      '  border: 1px solid rgba(245,158,11,.3);',
      '  color: #d97706;',
      '  font-size: 11px;',
      '  font-weight: 700;',
      '}',
      /* Pending sync indicator */
      '.has-pending-sync::after {',
      '  content: "";',
      '  position: absolute;',
      '  top: -3px;',
      '  left: -3px;',
      '  width: 8px;',
      '  height: 8px;',
      '  border-radius: 50%;',
      '  background: #f59e0b;',
      '  animation: syncPulse 1.5s infinite;',
      '}',
      /* Image loading state */
      'img:not(.img-loaded):not([src*="data:"]) {',
      '  opacity: 0;',
      '  transition: opacity .3s;',
      '}',
      'img.img-loaded { opacity: 1; }'
    ].join('\n');
    document.head.appendChild(style);
  }

  /* ══════════════════════════════════════════════
     INITIALIZE ALL
  ══════════════════════════════════════════════ */
  function init() {
    LOG('🚀 تهيئة محرك الأداء...');

    /* أنماط CSS فورية */
    injectCriticalStyles();
    initTouchOptimizations();
    optimizeFonts();

    /* بعد تحميل الـ DOM */
    function onReady() {
      initSmoothScroll();
      initRevealObserver();
      initDomObserver();
      initLazyImages();
      initSyncStatusUI();
      initResourceSaver();

      /* تأجير transitions قليلاً لعدم إبطاء الـ FCP */
      setTimeout(initPageTransitions, 500);

      LOG('✅ Performance Engine جاهز');
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', onReady);
    } else {
      onReady();
    }
  }

  /* ══════════════════════════════════════════════
     EXPORT
  ══════════════════════════════════════════════ */
  root.NabtexPerf = {
    init            : init,
    debounce        : debounce,
    throttle        : throttle,
    rafSchedule     : rafSchedule,
    createVirtualList : createVirtualList,
    showSyncBadge   : _showSyncBadge,
    addManagedListener : addManagedListener,
    observeReveal   : _observeRevealElements,
    lazyLoadImages  : _lazyLoadImages
  };

  /* التشغيل التلقائي */
  init();

  LOG('📦 NabtexPerf loaded');

})(window);
