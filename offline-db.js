/**
 * Nabtex Offline-First Database — offline-db.js
 * ═══════════════════════════════════════════════
 * بناء Local Database احترافية باستخدام IndexedDB (Dexie.js)
 * مع نظام Sync Queue كامل للمزامنة مع Firebase
 *
 * الميزات:
 * - تخزين كامل لبيانات المزرعة محلياً
 * - Queue ذكي للعمليات غير المتزامنة
 * - مزامنة تلقائية عند عودة الإنترنت
 * - منع تكرار البيانات وتعارض الـ Sync
 * - دعم CRUD كامل Offline
 */

(function(root) {
  'use strict';

  var LOG = function() {
    var args = Array.prototype.slice.call(arguments);
    args.unshift('%c[Nabtex DB]', 'color:#2d9a58;font-weight:700');
    console.log.apply(console, args);
  };

  /* ══════════════════════════════════════════════
     DEXIE LAZY LOADER
  ══════════════════════════════════════════════ */
  function loadDexie() {
    return new Promise(function(resolve, reject) {
      if (root.Dexie) { resolve(root.Dexie); return; }
      var script = document.createElement('script');
      script.src = 'https://unpkg.com/dexie@3.2.4/dist/dexie.min.js';
      script.crossOrigin = 'anonymous';
      script.onload  = function() { resolve(root.Dexie); };
      script.onerror = function() {
        /* Fallback CDN */
        var s2 = document.createElement('script');
        s2.src = 'https://cdn.jsdelivr.net/npm/dexie@3.2.4/dist/dexie.min.js';
        s2.crossOrigin = 'anonymous';
        s2.onload  = function() { resolve(root.Dexie); };
        s2.onerror = reject;
        document.head.appendChild(s2);
      };
      document.head.appendChild(script);
    });
  }

  /* ══════════════════════════════════════════════
     DATABASE DEFINITION
  ══════════════════════════════════════════════ */
  var DB_NAME    = 'NabtexDB';
  var DB_VERSION = 3;

  /* Sync statuses */
  var STATUS = {
    PENDING  : 'pending',   /* لم يُرسل بعد */
    SYNCING  : 'syncing',   /* جاري الإرسال */
    SYNCED   : 'synced',    /* تمت المزامنة */
    FAILED   : 'failed',    /* فشل الإرسال */
    CONFLICT : 'conflict'   /* تعارض */
  };

  /* Operations */
  var OP = {
    ADD    : 'add',
    UPDATE : 'update',
    DELETE : 'delete'
  };

  var db; /* Dexie instance — يُعبّأ بعد init */

  /* ══════════════════════════════════════════════
     INITIALIZE
  ══════════════════════════════════════════════ */
  function initDB() {
    return loadDexie().then(function(Dexie) {
      db = new Dexie(DB_NAME);

      db.version(DB_VERSION).stores({
        /* بيانات المزرعة */
        farms   : '++_lid, id, userId, name, updatedAt',
        fields  : '++_lid, id, userId, farmId, name',
        crops   : '++_lid, id, userId, farmId, createdAt',
        operations : '++_lid, id, userId, farmId, fieldId, date, createdAt',
        expenses   : '++_lid, id, userId, farmId, date',

        /* المفضلة والمستخدمون */
        favorites : '++_lid, userId',
        userProfiles : '++_lid, userId',

        /* قائمة انتظار المزامنة */
        syncQueue : '++_lid, collection, docId, operation, status, ts, retries',

        /* كاش بيانات الموسوعة (نباتات) */
        plantsCache : 'id, category, *tags',

        /* إعدادات محلية */
        settings : 'key'
      });

      return db.open();
    }).then(function() {
      LOG('✅ IndexedDB ready — v' + DB_VERSION);
      /* بدء نظام المزامنة */
      _startSyncEngine();
      return db;
    }).catch(function(e) {
      LOG('❌ IndexedDB init failed:', e);
      throw e;
    });
  }

  /* ══════════════════════════════════════════════
     SYNC QUEUE ENGINE
  ══════════════════════════════════════════════ */
  var _syncRunning = false;
  var _syncTimer   = null;
  var MAX_RETRIES  = 5;
  var RETRY_DELAYS = [2000, 5000, 15000, 30000, 60000]; /* تصاعدي */

  function _startSyncEngine() {
    /* مزامنة فورية عند عودة الإنترنت */
    window.addEventListener('online', function() {
      LOG('🟢 Online — بدء المزامنة الفورية');
      _syncNow();
    });

    /* مزامنة دورية كل 30 ثانية أثناء الاتصال */
    setInterval(function() {
      if (navigator.onLine) _syncNow();
    }, 30000);

    /* أول مزامنة */
    if (navigator.onLine) {
      setTimeout(_syncNow, 3000);
    }
  }

  function _syncNow() {
    if (_syncRunning || !navigator.onLine) return;
    _syncRunning = true;

    _getPendingItems().then(function(items) {
      if (!items.length) { _syncRunning = false; return; }
      LOG('🔄 مزامنة', items.length, 'عملية معلقة...');
      return _processQueue(items);
    }).then(function() {
      _syncRunning = false;
    }).catch(function(e) {
      _syncRunning = false;
      LOG('❌ خطأ في المزامنة:', e);
    });
  }

  function _getPendingItems() {
    if (!db) return Promise.resolve([]);
    return db.syncQueue
      .where('status')
      .anyOf([STATUS.PENDING, STATUS.FAILED])
      .filter(function(item) {
        return item.retries < MAX_RETRIES;
      })
      .toArray();
  }

  function _processQueue(items) {
    /* تنفيذ تسلسلي لمنع التعارض */
    return items.reduce(function(chain, item) {
      return chain.then(function() { return _syncItem(item); });
    }, Promise.resolve());
  }

  function _syncItem(item) {
    if (!root.db || !root.firebase) return Promise.resolve();

    /* تعيين حالة "جاري المزامنة" */
    return db.syncQueue.update(item._lid, {
      status: STATUS.SYNCING,
      lastAttempt: Date.now()
    }).then(function() {
      return _executeFirestoreOp(item);
    }).then(function(firestoreId) {
      /* نجاح: تحديث الـ ID الحقيقي في الجداول المحلية */
      return _markSynced(item, firestoreId);
    }).catch(function(e) {
      return _markFailed(item, e);
    });
  }

  function _executeFirestoreOp(item) {
    var fsDb = root.db; /* Firebase Firestore */
    var col  = fsDb.collection(item.collection);

    if (item.operation === OP.ADD) {
      var data = Object.assign({}, item.data);
      /* إزالة الـ ID المؤقت */
      delete data._tempId;
      delete data._lid;
      /* إضافة serverTimestamp */
      data.createdAt = root.firebase.firestore.FieldValue.serverTimestamp();
      return col.add(data).then(function(ref) { return ref.id; });
    }

    if (item.operation === OP.UPDATE) {
      if (!item.docId || item.docId.startsWith('tmp_')) {
        /* لم يُزامن الـ add بعد — أُجّل */
        return Promise.reject(new Error('Waiting for parent ADD sync'));
      }
      return col.doc(item.docId).set(item.data, { merge: true }).then(function() {
        return item.docId;
      });
    }

    if (item.operation === OP.DELETE) {
      if (!item.docId || item.docId.startsWith('tmp_')) {
        /* لم يُرسل أصلاً، فقط احذفه محلياً */
        return Promise.resolve(null);
      }
      return col.doc(item.docId).delete().then(function() { return null; });
    }

    return Promise.resolve(null);
  }

  function _markSynced(item, firestoreId) {
    var ops = [
      db.syncQueue.update(item._lid, { status: STATUS.SYNCED, syncedAt: Date.now() })
    ];

    /* إذا كانت ADD وعندنا Firestore ID جديد، نُحدّث السجل المحلي */
    if (item.operation === OP.ADD && firestoreId && item.localLid) {
      var table = _getTable(item.collection);
      if (table) {
        ops.push(table.update(item.localLid, { id: firestoreId }));
      }
    }

    return Promise.all(ops).then(function() {
      LOG('✅ تمت مزامنة:', item.collection, item.operation, firestoreId || '');
      /* إشعار الصفحة بنجاح المزامنة */
      _dispatchSyncEvent('sync-success', { item: item, firestoreId: firestoreId });
    });
  }

  function _markFailed(item, err) {
    var retries = (item.retries || 0) + 1;
    var nextStatus = retries >= MAX_RETRIES ? STATUS.FAILED : STATUS.PENDING;
    LOG('⚠️ فشل مزامنة', item.collection, '— محاولة', retries, ':', err.message);

    return db.syncQueue.update(item._lid, {
      status   : nextStatus,
      retries  : retries,
      lastError: err.message,
      nextRetry: Date.now() + (RETRY_DELAYS[Math.min(retries - 1, 4)])
    }).then(function() {
      _dispatchSyncEvent('sync-error', { item: item, error: err.message });
    });
  }

  function _dispatchSyncEvent(type, detail) {
    try {
      window.dispatchEvent(new CustomEvent('nabtex-sync', {
        detail: Object.assign({ type: type }, detail)
      }));
    } catch(e) {}
  }

  function _getTable(collection) {
    var map = {
      'operations': db.operations,
      'farms'     : db.farms,
      'fields'    : db.fields,
      'crops'     : db.crops,
      'expenses'  : db.expenses,
      'favorites' : db.favorites
    };
    return map[collection] || null;
  }

  /* ══════════════════════════════════════════════
     PUBLIC API — FARM OPERATIONS (Offline-First)
  ══════════════════════════════════════════════ */

  /**
   * حفظ عملية زراعية (offline-first)
   * تُحفظ فوراً في IndexedDB وتُوضع في قائمة المزامنة
   */
  function saveOperation(opData) {
    if (!db) return Promise.reject(new Error('DB not ready'));

    var tempId = 'tmp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    var localData = Object.assign({}, opData, {
      id          : tempId,
      _tempId     : tempId,
      _syncStatus : STATUS.PENDING,
      _savedAt    : Date.now()
    });

    /* لا نضع serverTimestamp في IndexedDB (لا تدعمه) */
    delete localData.createdAt;
    localData.createdAt = new Date().toISOString();

    var localLid;

    return db.operations.add(localData).then(function(lid) {
      localLid = lid;
      /* إضافة لقائمة المزامنة */
      return db.syncQueue.add({
        collection : 'operations',
        docId      : tempId,
        localLid   : lid,
        operation  : OP.ADD,
        data       : Object.assign({}, opData),
        status     : STATUS.PENDING,
        retries    : 0,
        ts         : Date.now()
      });
    }).then(function() {
      /* محاولة مزامنة فورية إذا كنا أونلاين */
      if (navigator.onLine) _syncNow();
      LOG('💾 عملية محفوظة محلياً:', tempId);
      return { id: tempId, localLid: localLid };
    });
  }

  /**
   * حفظ مصروف (offline-first)
   */
  function saveExpense(expData) {
    if (!db) return Promise.reject(new Error('DB not ready'));

    var tempId = 'tmp_exp_' + Date.now();
    var localData = Object.assign({}, expData, {
      id         : tempId,
      _tempId    : tempId,
      _syncStatus: STATUS.PENDING,
      _savedAt   : Date.now(),
      createdAt  : new Date().toISOString()
    });

    return db.expenses.add(localData).then(function(lid) {
      return db.syncQueue.add({
        collection : 'expenses',
        docId      : tempId,
        localLid   : lid,
        operation  : OP.ADD,
        data       : Object.assign({}, expData),
        status     : STATUS.PENDING,
        retries    : 0,
        ts         : Date.now()
      });
    }).then(function() {
      if (navigator.onLine) _syncNow();
      return { id: tempId };
    });
  }

  /**
   * تعديل عملية
   */
  function updateOperation(localLid, firestoreId, changes) {
    if (!db) return Promise.reject(new Error('DB not ready'));

    return db.operations.update(localLid, changes).then(function() {
      return db.syncQueue.add({
        collection : 'operations',
        docId      : firestoreId,
        localLid   : localLid,
        operation  : OP.UPDATE,
        data       : changes,
        status     : STATUS.PENDING,
        retries    : 0,
        ts         : Date.now()
      });
    }).then(function() {
      if (navigator.onLine) _syncNow();
      return { ok: true };
    });
  }

  /**
   * حذف عملية
   */
  function deleteOperation(localLid, firestoreId) {
    if (!db) return Promise.reject(new Error('DB not ready'));

    return db.operations.delete(localLid).then(function() {
      return db.syncQueue.add({
        collection : 'operations',
        docId      : firestoreId || 'none',
        localLid   : localLid,
        operation  : OP.DELETE,
        data       : {},
        status     : STATUS.PENDING,
        retries    : 0,
        ts         : Date.now()
      });
    }).then(function() {
      if (navigator.onLine) _syncNow();
      return { ok: true };
    });
  }

  /**
   * قراءة العمليات (يقرأ من الكاش المحلي أولاً)
   */
  function getOperations(userId, opts) {
    if (!db) return Promise.resolve([]);
    opts = opts || {};

    var query = db.operations.where('userId').equals(userId);

    return query.toArray().then(function(ops) {
      /* فلترة حسب التاريخ */
      if (opts.startDate) {
        ops = ops.filter(function(op) {
          return (op.date || '') >= opts.startDate;
        });
      }
      if (opts.endDate) {
        ops = ops.filter(function(op) {
          return (op.date || '') <= opts.endDate;
        });
      }
      if (opts.fieldId) {
        ops = ops.filter(function(op) {
          return op.fieldId === opts.fieldId;
        });
      }

      /* ترتيب تنازلي حسب التاريخ */
      ops.sort(function(a, b) {
        return (b.date || '').localeCompare(a.date || '');
      });

      return ops.slice(0, opts.limit || 500);
    });
  }

  /**
   * حفظ/تحديث بيانات المزارع من Firestore إلى IndexedDB
   */
  function cacheFarmsFromFirestore(userId, farms) {
    if (!db) return Promise.resolve();

    return db.transaction('rw', db.farms, function() {
      /* احذف القديم */
      return db.farms.where('userId').equals(userId).delete().then(function() {
        /* أضف الجديد */
        return db.farms.bulkAdd(farms.map(function(f) {
          return Object.assign({}, f, { userId: userId });
        }));
      });
    }).catch(function(e) {
      LOG('⚠️ Cache farms error:', e);
    });
  }

  /**
   * حفظ العمليات من Firestore
   */
  function cacheOperationsFromFirestore(userId, ops) {
    if (!db) return Promise.resolve();

    return db.transaction('rw', db.operations, function() {
      return db.operations.where('userId').equals(userId).delete().then(function() {
        return db.operations.bulkAdd(ops.map(function(op) {
          return Object.assign({}, op, { userId: userId, _syncStatus: STATUS.SYNCED });
        }));
      });
    }).catch(function(e) {
      LOG('⚠️ Cache ops error:', e);
    });
  }

  /**
   * حفظ الحقول من Firestore
   */
  function cacheFieldsFromFirestore(userId, fields) {
    if (!db) return Promise.resolve();

    return db.transaction('rw', db.fields, function() {
      return db.fields.where('userId').equals(userId).delete().then(function() {
        if (!fields.length) return;
        return db.fields.bulkAdd(fields.map(function(f) {
          return Object.assign({}, f, { userId: userId });
        }));
      });
    }).catch(function(e) {
      LOG('⚠️ Cache fields error:', e);
    });
  }

  /**
   * قراءة بيانات المزارع من IndexedDB
   */
  function getCachedFarms(userId) {
    if (!db) return Promise.resolve([]);
    return db.farms.where('userId').equals(userId).toArray();
  }

  /**
   * قراءة الحقول من IndexedDB
   */
  function getCachedFields(userId) {
    if (!db) return Promise.resolve([]);
    return db.fields.where('userId').equals(userId).toArray();
  }

  /**
   * إحصاءات قائمة المزامنة
   */
  function getSyncStatus() {
    if (!db) return Promise.resolve({ pending: 0, failed: 0, synced: 0 });

    return db.syncQueue.toArray().then(function(items) {
      var pending  = items.filter(function(i) { return i.status === STATUS.PENDING; }).length;
      var syncing  = items.filter(function(i) { return i.status === STATUS.SYNCING; }).length;
      var failed   = items.filter(function(i) { return i.status === STATUS.FAILED; }).length;
      var synced   = items.filter(function(i) { return i.status === STATUS.SYNCED; }).length;
      return { pending: pending, syncing: syncing, failed: failed, synced: synced, total: items.length };
    });
  }

  /**
   * تنظيف السجلات القديمة (أكثر من 7 أيام)
   */
  function cleanOldSyncRecords() {
    if (!db) return Promise.resolve();
    var cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000);
    return db.syncQueue
      .where('status').equals(STATUS.SYNCED)
      .filter(function(item) { return item.ts < cutoff; })
      .delete();
  }

  /**
   * مزامنة يدوية فورية
   */
  function forceSyncNow() {
    LOG('⚡ مزامنة يدوية...');
    _syncNow();
    return getSyncStatus();
  }

  /* ══════════════════════════════════════════════
     SETTINGS (مفاتيح/قيم بسيطة)
  ══════════════════════════════════════════════ */
  function setSetting(key, value) {
    if (!db) return Promise.resolve();
    return db.settings.put({ key: key, value: value, ts: Date.now() });
  }

  function getSetting(key, defaultVal) {
    if (!db) return Promise.resolve(defaultVal);
    return db.settings.get(key).then(function(item) {
      return item ? item.value : defaultVal;
    });
  }

  /* ══════════════════════════════════════════════
     PLANTS CACHE (موسوعة النباتات)
  ══════════════════════════════════════════════ */
  function cachePlants(plants) {
    if (!db || !plants.length) return Promise.resolve();
    return db.plantsCache.bulkPut(plants).catch(function(e) {
      LOG('⚠️ Plants cache error:', e);
    });
  }

  function getCachedPlants(opts) {
    if (!db) return Promise.resolve([]);
    opts = opts || {};

    if (opts.category) {
      return db.plantsCache.where('category').equals(opts.category).toArray();
    }
    return db.plantsCache.toArray();
  }

  /* ══════════════════════════════════════════════
     EXPORT — NabtexOfflineDB
  ══════════════════════════════════════════════ */
  root.NabtexOfflineDB = {
    /* تهيئة */
    init          : initDB,

    /* CRUD للعمليات الزراعية */
    saveOperation    : saveOperation,
    saveExpense      : saveExpense,
    updateOperation  : updateOperation,
    deleteOperation  : deleteOperation,
    getOperations    : getOperations,

    /* كاش Firestore */
    cacheFarmsFromFirestore      : cacheFarmsFromFirestore,
    cacheFieldsFromFirestore     : cacheFieldsFromFirestore,
    cacheOperationsFromFirestore : cacheOperationsFromFirestore,

    /* قراءة الكاش */
    getCachedFarms  : getCachedFarms,
    getCachedFields : getCachedFields,

    /* المزامنة */
    getSyncStatus  : getSyncStatus,
    forceSyncNow   : forceSyncNow,
    cleanOldRecords: cleanOldSyncRecords,

    /* الإعدادات */
    setSetting : setSetting,
    getSetting : getSetting,

    /* النباتات */
    cachePlants    : cachePlants,
    getCachedPlants: getCachedPlants,

    /* الثوابت */
    STATUS : STATUS,
    OP     : OP,

    /* وصول للـ db مباشرة (للاستخدام المتقدم) */
    get db() { return db; }
  };

  LOG('📦 NabtexOfflineDB loaded — جاهز للتهيئة');

})(window);
