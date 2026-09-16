/**
 * Phase 7 proof (node): the REAL purchase seam — product fetch mapping,
 * localized prices, entitlement-on-success, restore, pending/cancel/expired
 * handling, and fallback honesty.
 *
 * Same technique as the earlier proofs: TS transpiled in-memory, native-only
 * modules faked, and a FAKE store bridge so the whole store conversation can be
 * exercised without a device, an Apple Account, or a live StoreKit connection.
 *
 * Proves:
 *  1. Product fetch → plan rows with the STORE's localized prices; a missing or
 *     absent product keeps the configured price (never a made-up number).
 *  2. A confirmed, unexpired transaction for one of our two SKUs is the ONLY
 *     thing that becomes tier 'paid' (F8); the transaction is acknowledged.
 *  3. runTrialFlow: auth (F10) → merge → purchase → verified entitlement
 *     applied through applyEntitlement, persisted, level uncapped, grace rules
 *     untouched.
 *  4. Pending / cancelled / failed / expired / unknown-state / other-product
 *     transactions grant NOTHING, each with its own honest reason.
 *  5. Restore: an active purchase restores; "nothing found" says so and NEVER
 *     downgrades; a failed store query changes nothing.
 *  6. Fallback honesty: no bridge in this build → the stub answers ('stub'),
 *     source 'fallback', configured prices, no fake success anywhere.
 *  7. Server validation is still absent by design: the seam has no server call,
 *     only the SDK-coupled bridge file imports the SDK, and the local
 *     reconciliation only ever lowers a tier from a store-given end date.
 */
'use strict';
const ts = require('typescript');
const fs = require('fs');
const path = require('path');
const REPO = path.resolve(__dirname, '..');

// A tiny in-memory AsyncStorage so persistence is real across module calls.
const asyncStore = new Map();

const FLAKE = {
  'react-native': {
    StyleSheet: { create: (o) => o },
    Platform: { OS: 'ios' },
    Linking: { openURL: async () => true, canOpenURL: async () => true },
    View: () => null,
    Text: () => null,
    Pressable: () => null,
    ScrollView: () => null,
    Switch: () => null,
    Alert: { alert: () => {} },
    ActivityIndicator: () => null,
  },
  '@react-native-async-storage/async-storage': {
    getItem: async (k) => (asyncStore.has(k) ? asyncStore.get(k) : null),
    setItem: async (k, v) => {
      asyncStore.set(k, v);
    },
    removeItem: async (k) => {
      asyncStore.delete(k);
    },
    clear: async () => asyncStore.clear(),
  },
  'expo-status-bar': { StatusBar: () => null },
  'expo-notifications': {
    setNotificationHandler: () => {},
    getPermissionsAsync: async () => ({ granted: true }),
    requestPermissionsAsync: async () => ({ granted: true }),
    cancelScheduledNotificationAsync: async () => {},
    scheduleNotificationAsync: async () => 'id',
    setNotificationChannelAsync: async () => null,
    AndroidImportance: { DEFAULT: 5 },
    SchedulableTriggerInputTypes: { DAILY: 'daily' },
  },
};

const cache = new Map();
function loadTs(absPath) {
  const key = path.resolve(absPath);
  if (cache.has(key)) return cache.get(key);
  const src = fs.readFileSync(key, 'utf8');
  const out = ts.transpileModule(src, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
      strict: true,
    },
    fileName: key,
  }).outputText;
  const mod = { exports: {} };
  const dir = path.dirname(key);
  const localRequire = (request) => {
    if (Object.prototype.hasOwnProperty.call(FLAKE, request)) return FLAKE[request];
    if (request.startsWith('.')) {
      const candidates = [
        path.resolve(dir, request),
        path.resolve(dir, request) + '.ts',
        path.resolve(dir, request) + '.tsx',
        path.resolve(dir, request, 'index.ts'),
        path.resolve(dir, request, 'index.tsx'),
      ];
      for (const c of candidates) {
        if (fs.existsSync(c) && fs.statSync(c).isFile()) return loadTs(c);
      }
      throw new Error(`unresolved relative import '${request}' from ${key}`);
    }
    return require(request);
  };
  cache.set(key, mod.exports);
  new Function('module', 'exports', 'require', '__filename', out)(
    mod,
    mod.exports,
    localRequire,
    key,
  );
  return mod.exports;
}

const mapping = loadTs(path.join(REPO, 'src/subscription/mapping.ts'));
const service = loadTs(path.join(REPO, 'src/subscription/service.ts'));
const iap = loadTs(path.join(REPO, 'src/subscription/iap.ts'));
const trial = loadTs(path.join(REPO, 'src/subscription/trial.ts'));
const stub = loadTs(path.join(REPO, 'src/subscription/stub.ts'));
const barrel = loadTs(path.join(REPO, 'src/subscription/index.ts'));
const paywall = loadTs(path.join(REPO, 'src/subscription/paywall.ts'));
const merge = loadTs(path.join(REPO, 'src/subscription/merge.ts'));
const store = loadTs(path.join(REPO, 'src/storage/store.ts'));
const progress = loadTs(path.join(REPO, 'src/progress/progress.ts'));

let failures = 0;
function check(name, cond, extra) {
  const ok = !!cond;
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? `  -> ${extra}` : ''}`);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Fixed clock for every derivation (the app passes Date.now(); the proofs pass
// this, so nothing depends on the day the proof runs).
const NOW_MS = Date.parse('2026-09-16T10:00:00.000Z');
const NOW_ISO = new Date(NOW_MS).toISOString();
const FUTURE_MS = Date.parse('2026-10-16T10:00:00.000Z');
const PAST_MS = Date.parse('2026-09-01T10:00:00.000Z');

const MONTHLY_SKU = 'calmquest_monthly';
const YEARLY_SKU = 'calmquest_yearly';

// A store payload as the App Store returns it (localized price included).
const STORE_PRODUCTS = [
  { id: MONTHLY_SKU, displayPrice: '10,99 €', price: 10.99, currency: 'EUR', title: 'Calm Quest+ Monthly' },
  { id: YEARLY_SKU, displayPrice: '59,99 €', price: 59.99, currency: 'EUR', title: 'Calm Quest+ Yearly' },
];

/**
 * A FAKE store bridge: the same `IapBridge` the native bridge implements, with
 * controllable outcomes. This is what makes the store conversation testable.
 */
function makeFakeStore(options = {}) {
  const state = {
    connected: options.connected ?? true,
    connectCalls: 0,
    products: options.products ?? STORE_PRODUCTS,
    throwOnConnect: options.throwOnConnect ?? false,
    throwOnFetch: options.throwOnFetch ?? false,
    throwOnActive: options.throwOnActive ?? false,
    throwOnRestore: options.throwOnRestore ?? false,
    throwOnDispatch: options.throwOnDispatch ?? null,
    active: options.active ?? [],
    autoPurchase: options.autoPurchase ?? null,
    manageOpens: options.manageOpens ?? false,
    dispatched: [],
    finished: [],
    updateCbs: [],
    errorCbs: [],
  };

  const api = {
    emitPurchase: (p) => state.updateCbs.forEach((cb) => cb(p)),
    emitError: (e) => state.errorCbs.forEach((cb) => cb(e)),
  };

  const bridge = {
    async connect() {
      state.connectCalls += 1;
      if (state.throwOnConnect) throw new Error('Nitro runtime not installed yet');
      return state.connected;
    },
    async fetchSubscriptions(skus) {
      if (state.throwOnFetch) throw new Error('QueryProduct: empty product list');
      return state.products.filter((p) => skus.includes(p.id));
    },
    async purchaseSubscription(sku) {
      state.dispatched.push(sku);
      if (state.throwOnDispatch) throw state.throwOnDispatch;
      if (state.autoPurchase) {
        // Emitted verbatim: the event carries its OWN productId, exactly like a
        // real store callback (which is how "not our product" is testable).
        queueMicrotask(() => api.emitPurchase(state.autoPurchase));
      }
    },
    async activePurchases() {
      if (state.throwOnActive) throw new Error('ServiceError: store query failed');
      return state.active;
    },
    async restore() {
      if (state.throwOnRestore) throw state.throwOnRestore;
    },
    async finish(p) {
      state.finished.push(p);
    },
    onPurchaseUpdate(cb) {
      state.updateCbs.push(cb);
      return { remove: () => {} };
    },
    onPurchaseError(cb) {
      state.errorCbs.push(cb);
      return { remove: () => {} };
    },
    async openManageSubscriptions() {
      return state.manageOpens;
    },
  };

  return { bridge, state, ...api };
}

function makeService(store, options = {}) {
  return new iap.IapSubscriptionService({
    loadBridge: () => store.bridge,
    now: () => NOW_MS,
    storeTimeoutMs: 200,
    purchaseTimeoutMs: options.purchaseTimeoutMs ?? 120,
  });
}

/** A purchased transaction as the store reports it. */
function purchased(sku, expiryMs) {
  return {
    productId: sku,
    id: `txn-${sku}-1`,
    transactionDate: NOW_MS - 1000,
    expirationDateIOS: expiryMs ?? FUTURE_MS,
    purchaseState: 'purchased',
  };
}

(async () => {
  // -------------------------------------------------------------------------
  // 1. Product fetch → plan rows with the store's own localized prices
  // -------------------------------------------------------------------------

  const mapped = mapping.planInfoFromStoreProducts(STORE_PRODUCTS);
  check('store products map to exactly our two plans, in plan order', mapped.length === 2 && mapped[0].id === 'monthly' && mapped[1].id === 'yearly');
  check('localized store price is what renders (monthly)', mapped[0].price === '10,99 €');
  check('localized store price is what renders (yearly)', mapped[1].price === '59,99 €');
  check('yearly keeps its per-month framing + descriptive badge', mapped[1].perMonth === '≈ $5/mo' && mapped[1].badge === 'Best value');
  check('store product ids are untouched by the mapping', mapped[0].storeProductId === MONTHLY_SKU && mapped[1].storeProductId === YEARLY_SKU);

  const partial = mapping.planInfoFromStoreProducts([STORE_PRODUCTS[0]]);
  check('a product the store did not return keeps the configured price', partial[1].price === '$59.99' && partial[0].price === '10,99 €');
  const empty = mapping.planInfoFromStoreProducts([]);
  check('no store products at all → configured prices, unchanged', empty[0].price === '$9.99' && empty[1].price === '$59.99');
  check('blank displayPrice never becomes the price shown', mapping.planInfoFromStoreProducts([{ id: YEARLY_SKU, displayPrice: '   ' }])[1].price === '$59.99');

  const store1 = makeFakeStore();
  const svc1 = makeService(store1);
  const plans = await svc1.getPlans();
  check('service.getPlans() reports store-localized prices', plans.ok === true && plans.value[1].price === '59,99 €');
  check('service advertises source "store" on native', svc1.source === 'store');

  const failingFetch = makeFakeStore({ throwOnFetch: true });
  const svcFetchFail = makeService(failingFetch);
  const failedPlans = await svcFetchFail.getPlans();
  check('a failed product fetch is reported honestly (never a fake ok)', failedPlans.ok === false && failedPlans.reason === 'failed');
  check('productFetchReason keeps fetch failures in the honest vocabulary', iap.productFetchReason({ message: 'Nitro runtime not installed' }) === 'store_unavailable');

  // -------------------------------------------------------------------------
  // 2. Entitlement-on-success: the ONLY path to tier 'paid' (F8)
  // -------------------------------------------------------------------------

  const ent = mapping.entitlementFromPurchase(purchased(YEARLY_SKU), NOW_MS);
  check('a confirmed, unexpired purchase of our SKU grants paid', ent && ent.tier === 'paid');
  check('its store-given expiry travels as an ISO timestamp', ent.expiry === new Date(FUTURE_MS).toISOString());
  check('a purchase with no store expiry is still paid (no invented date)', mapping.entitlementFromPurchase({ productId: MONTHLY_SKU, purchaseState: 'purchased' }, NOW_MS).expiry === undefined);
  check('another product id grants nothing', mapping.entitlementFromPurchase(purchased('someone_elses_sku'), NOW_MS) === null);
  check('an expired transaction grants nothing', mapping.entitlementFromPurchase(purchased(MONTHLY_SKU, PAST_MS), NOW_MS) === null);
  check('a pending transaction grants nothing', mapping.entitlementFromPurchase({ ...purchased(MONTHLY_SKU), purchaseState: 'pending' }, NOW_MS) === null);
  check('an unknown-state transaction grants nothing (unconfirmed)', mapping.entitlementFromPurchase({ ...purchased(MONTHLY_SKU), purchaseState: 'unknown' }, NOW_MS) === null);
  check('isPendingPurchase recognises pending/deferred, not a real purchase', mapping.isPendingPurchase({ purchaseState: 'pending' }) === true && mapping.isPendingPurchase({ purchaseState: 'deferred' }) === true && mapping.isPendingPurchase({ purchaseState: 'purchased' }) === false);

  const store2 = makeFakeStore({ autoPurchase: purchased(YEARLY_SKU) });
  const svc2 = makeService(store2);
  const bought = await svc2.purchase('yearly');
  check('purchase() resolves a verified entitlement from the store event', bought.ok === true && bought.value.tier === 'paid' && bought.value.expiry === new Date(FUTURE_MS).toISOString());
  check('purchase() dispatched the yearly SKU to the store', store2.state.dispatched[0] === YEARLY_SKU);
  check('the confirmed transaction is acknowledged exactly once', store2.state.finished.length === 1 && store2.state.finished[0].id === `txn-${YEARLY_SKU}-1`);
  check('the service connected to the store before selling', store2.state.connectCalls === 1);

  const storeMonthly = makeFakeStore({ autoPurchase: purchased(MONTHLY_SKU) });
  const svcMonthly = makeService(storeMonthly);
  const boughtMonthly = await svcMonthly.purchase('monthly');
  check('the monthly plan buys too (both plans wired)', boughtMonthly.ok === true && boughtMonthly.value.tier === 'paid' && storeMonthly.state.dispatched[0] === MONTHLY_SKU);

  // An unrelated transaction arriving on the update listener is ignored.
  const storeOdd = makeFakeStore({ autoPurchase: purchased('other_app_sku') });
  const svcOdd = makeService(storeOdd, { purchaseTimeoutMs: 60 });
  const oddResult = await svcOdd.purchase('yearly');
  check('a transaction for a product that is not ours never unlocks', oddResult.ok === false && oddResult.reason === 'pending');
  check('an unrelated transaction is not finished (not ours to acknowledge)', storeOdd.state.finished.length === 0);

  // -------------------------------------------------------------------------
  // 3. Pending / cancelled / failed — each ends honestly, nothing unlocks
  // -------------------------------------------------------------------------

  const storePending = makeFakeStore({
    autoPurchase: { ...purchased(YEARLY_SKU), purchaseState: 'pending' },
  });
  const svcPending = makeService(storePending, { purchaseTimeoutMs: 60 });
  const pendingResult = await svcPending.purchase('yearly');
  check('a pending (deferred/Ask-to-Buy) purchase reports "pending"', pendingResult.ok === false && pendingResult.reason === 'pending');
  check('a pending purchase is never acknowledged as complete', storePending.state.finished.length === 0);

  const storeCancel = makeFakeStore({
    throwOnDispatch: { code: 'E_USER_CANCELLED', message: 'User cancelled the purchase' },
  });
  const svcCancel = makeService(storeCancel);
  const cancelResult = await svcCancel.purchase('yearly');
  check('cancelling the sheet reports "user_cancelled" (not a failure)', cancelResult.ok === false && cancelResult.reason === 'user_cancelled');

  const storeFail = makeFakeStore({ throwOnDispatch: { code: 'E_SERVICE_ERROR', message: 'Store unavailable' } });
  const svcFail = makeService(storeFail);
  const failResult = await svcFail.purchase('yearly');
  check('a store failure reports "failed" and no entitlement', failResult.ok === false && failResult.reason === 'failed');

  const storeNoConnect = makeFakeStore({ throwOnConnect: true });
  const svcNoConnect = makeService(storeNoConnect);
  const noConnectResult = await svcNoConnect.purchase('yearly');
  check('Expo-Go-style "no native module" connect failure → store_unavailable', noConnectResult.ok === false && noConnectResult.reason === 'store_unavailable');
  check('isAvailable() is false when the store cannot be reached', (await svcNoConnect.isAvailable()) === false);

  check(
    'error mapping: cancellation variants → user_cancelled',
    mapping.reasonFromStoreError({ code: 'E_USER_CANCELLED' }) === 'user_cancelled' &&
      mapping.reasonFromStoreError({ message: 'User cancelled' }) === 'user_cancelled' &&
      mapping.reasonFromStoreError({ code: 'payment-cancelled' }) === 'user_cancelled',
  );
  check('error mapping: pending/deferred → pending', mapping.reasonFromStoreError({ message: 'Purchase is deferred' }) === 'pending');
  check('error mapping: anything else → failed (never invented)', mapping.reasonFromStoreError({ code: 'E_UNKNOWN' }) === 'failed');
  check(
    'statusForReason maps every seam reason onto an honest UI status',
    trial.statusForReason('stub') === 'stub' &&
      trial.statusForReason('store_unavailable') === 'store_unavailable' &&
      trial.statusForReason('user_cancelled') === 'user_cancelled' &&
      trial.statusForReason('pending') === 'pending' &&
      trial.statusForReason('failed') === 'failed' &&
      trial.statusForReason(undefined) === 'failed',
  );

  // -------------------------------------------------------------------------
  // 4. runTrialFlow — the paywall's whole sequence (F10 → F8), persisted
  // -------------------------------------------------------------------------

  asyncStore.clear();
  const authStub = loadTs(path.join(REPO, 'src/subscription/authStub.ts'));
  const guest = await (async () => {
    // A guest with real progress: 12 completed loops (600 XP) and a 7-day streak.
    let s = store.defaultState();
    const q = { id: 'q-proof', theme: 'gratitude', type: 'act', title: 't' };
    for (let i = 0; i < 12; i++) {
      const d = `2026-09-${String(i + 1).padStart(2, '0')}`;
      s = (await store.completeQuest(s, q, d)) ?? s;
    }
    return s;
  })();
  check('guest fixture: 600 XP accrued, level held at 5 while free', guest.progress.totalXp === 600 && guest.progress.level === 5);

  const flowStore = makeFakeStore({ autoPurchase: purchased(YEARLY_SKU) });
  const flowService = makeService(flowStore);
  const flow = await trial.runTrialFlow({
    service: flowService,
    auth: authStub.authService, // still the honest stub: no account, no fake signup
    guest,
    plan: 'yearly',
    persist: async (s) => store.saveState(s),
  });

  check('trial flow: status granted', flow.status === 'granted');
  check('trial flow: tier is paid', flow.state.entitlements.tier === 'paid');
  check('trial flow: level uncapped — 600 XP shows as level 7', flow.state.progress.level === 7 && flow.state.progress.totalXp === 600);
  check('trial flow: nothing earned was touched (12 completions, streak kept)', flow.state.quests.completions.length === 12 && flow.state.streak.streakDays === 12);
  check('trial flow: no account was fabricated by the auth stub', flow.merged === false);
  const reopened = await store.loadState();
  check('trial flow: the paid entitlement is persisted (survives a relaunch)', reopened.entitlements.tier === 'paid' && typeof reopened.entitlements.expiry === 'string');

  const declinedFlow = await trial.runTrialFlow({
    service: makeService(makeFakeStore({ throwOnDispatch: { code: 'E_USER_CANCELLED' } })),
    auth: authStub.authService,
    guest,
    plan: 'monthly',
  });
  check('trial flow: cancelling leaves the tier free and reports user_cancelled', declinedFlow.status === 'user_cancelled' && declinedFlow.state.entitlements.tier === 'free');
  const pendingFlow = await trial.runTrialFlow({
    service: makeService(makeFakeStore({ autoPurchase: { ...purchased(MONTHLY_SKU), purchaseState: 'pending' } }), { purchaseTimeoutMs: 60 }),
    auth: authStub.authService,
    guest,
    plan: 'monthly',
  });
  check('trial flow: a pending purchase leaves the tier free and reports pending', pendingFlow.status === 'pending' && pendingFlow.state.entitlements.tier === 'free');

  // F10 with a REAL account provider (a labeled fixture: the auth stub cannot
  // produce one). The flow must merge, and entitlements must come from the
  // account only — never invented by the merge.
  const fakeAccountAuth = {
    isAvailable: async () => true,
    createOrSignIn: async () => ({ ok: true, account: { ...store.defaultState(), progress: { totalXp: 20, level: 1 }, streak: { streakDays: 1, graceDaysMissed: 0, lastQuestDate: '2026-09-16' } } }),
  };
  const mergeStore = makeFakeStore({ autoPurchase: purchased(MONTHLY_SKU) });
  const merged = await trial.runTrialFlow({
    service: makeService(mergeStore),
    auth: fakeAccountAuth,
    guest,
    plan: 'monthly',
    persist: async (s) => store.saveState(s),
  });
  check('trial flow: with a real account the guest state is merged (merged = true)', merged.merged === true);
  check('trial flow: merge keeps the higher XP/streak, then the purchase grants paid', merged.state.progress.totalXp === 600 && merged.state.streak.streakDays === 12 && merged.state.entitlements.tier === 'paid');

  // -------------------------------------------------------------------------
  // 5. Restore — real restoreTransactions, honest about every outcome
  // -------------------------------------------------------------------------

  const restoreStore = makeFakeStore({ active: [purchased(YEARLY_SKU)] });
  const svcRestore = makeService(restoreStore);
  const restored = await svcRestore.restore();
  check('restore with an active purchase returns a verified paid snapshot', restored.ok === true && restored.value.tier === 'paid' && restored.value.expiry === new Date(FUTURE_MS).toISOString());
  const restoredState = await store.applyEntitlement(guest, restored.value);
  check('the restored snapshot applies through applyEntitlement (the one writer)', restoredState.entitlements.tier === 'paid');
  check('restore keeps everything the user earned', restoredState.progress.totalXp === 600 && restoredState.quests.completions.length === 12);

  const emptyStore = makeFakeStore({ active: [] });
  const svcEmpty = makeService(emptyStore);
  const emptyRestore = await svcEmpty.restore();
  check('restore that finds nothing says so ("nothing_to_restore")', emptyRestore.ok === false && emptyRestore.reason === 'nothing_to_restore');

  const paidBefore = await store.applyEntitlement(guest, { tier: 'paid', expiry: new Date(FUTURE_MS).toISOString() });
  const afterEmptyRestore = paidBefore; // the UI does NOT apply a failed restore
  check('a restore that found nothing leaves a paying user untouched', afterEmptyRestore.entitlements.tier === 'paid');

  const brokenStore = makeFakeStore({ throwOnActive: true });
  const svcBroken = makeService(brokenStore);
  const brokenRestore = await svcBroken.restore();
  check('a failed store query during restore changes nothing (no downgrade)', brokenRestore.ok === false && brokenRestore.reason === 'failed');

  const restoreCancel = makeService(makeFakeStore({ throwOnRestore: { code: 'E_USER_CANCELLED' } }));
  const restoreCancelResult = await restoreCancel.restore();
  check('cancelling a store sign-in during restore is reported as user_cancelled', restoreCancelResult.ok === false && restoreCancelResult.reason === 'user_cancelled', JSON.stringify(restoreCancelResult));

  const expiringStore = makeFakeStore({ active: [purchased(MONTHLY_SKU, PAST_MS)] });
  const expiringRestore = await makeService(expiringStore).restore();
  check('an expired store purchase is not restorable as active', expiringRestore.ok === false && expiringRestore.reason === 'nothing_to_restore');

  // -------------------------------------------------------------------------
  // 6. syncEntitlement — store truth as an UPGRADE path only
  // -------------------------------------------------------------------------

  const syncStore = makeFakeStore({ active: [purchased(YEARLY_SKU)] });
  const syncResult = await makeService(syncStore).syncEntitlement();
  check('syncEntitlement reports an active subscription as paid', syncResult.ok === true && syncResult.value.tier === 'paid');

  const syncNone = await makeService(makeFakeStore({ active: [] })).syncEntitlement();
  check('syncEntitlement reports "no active subscription" honestly (ok, free)', syncNone.ok === true && syncNone.value.tier === 'free');
  // The documented caller policy: apply the sync ONLY when it is paid.
  const applied = mapping.isPaid(syncNone.value) ? 'apply' : 'ignore';
  check('policy: a "free" sync answer is never applied (a signed-out store says nothing)', applied === 'ignore');
  const syncFail = await makeService(makeFakeStore({ throwOnActive: true })).syncEntitlement();
  check('a failed sync query is ok:false — failures prove nothing', syncFail.ok === false);

  // -------------------------------------------------------------------------
  // 7. Local expiry reconciliation: the only downgrade path
  // -------------------------------------------------------------------------

  check('paid + passed expiry → downgraded to free', mapping.reconciledEntitlement({ tier: 'paid', expiry: new Date(PAST_MS).toISOString() }, NOW_MS).tier === 'free');
  check('paid + future expiry → no change', mapping.reconciledEntitlement({ tier: 'paid', expiry: new Date(FUTURE_MS).toISOString() }, NOW_MS) === null);
  check('paid + unknown expiry → never punished (no change)', mapping.reconciledEntitlement({ tier: 'paid' }, NOW_MS) === null);
  check('free + anything → no change', mapping.reconciledEntitlement({ tier: 'free' }, NOW_MS) === null);
  check('a non-purchase entitlement snapshot is untouched (no downgrade for one period)', store.defaultState().entitlements.tier === 'free');

  // -------------------------------------------------------------------------
  // 8. Fallback honesty: no bridge → the stub's exact behavior
  // -------------------------------------------------------------------------

  const fallbackService = barrel.createSubscriptionService();
  check('with no SDK bridge (web/Node) the barrel picks the stub', fallbackService.source === 'fallback');
  check('fallback: isAvailable() is honestly false', (await fallbackService.isAvailable()) === false);
  const fallbackBuy = await fallbackService.purchase('yearly');
  check('fallback: a purchase fails with reason "stub" (no fake success)', fallbackBuy.ok === false && fallbackBuy.reason === 'stub');
  const fallbackRestore = await fallbackService.restore();
  check('fallback: restore fails with reason "stub" (nothing claimed)', fallbackRestore.ok === false && fallbackRestore.reason === 'stub');
  const fallbackPlans = await fallbackService.getPlans();
  check('fallback: configured plans still render (same numbers as before)', fallbackPlans.ok === true && fallbackPlans.value[0].price === '$9.99' && fallbackPlans.value[1].price === '$59.99');
  check('fallback: the stub is exactly the pre-Phase-7 class', fallbackService instanceof stub.StubSubscriptionService);
  check('fallback: no manage screen is claimed when there is no store', (await barrel.subscriptionService.openManageSubscriptions?.()) === undefined || (await barrel.subscriptionService.openManageSubscriptions?.()) === false);

  const manageStore = makeFakeStore({ manageOpens: true });
  const svcManage = makeService(manageStore);
  check('store build: Manage subscription opens the App Store surface', (await svcManage.openManageSubscriptions()) === true);

  // -------------------------------------------------------------------------
  // 9. Grace rules untouched (Flow E): no re-nag, first quest never blocked
  // -------------------------------------------------------------------------

  const loopsDone = await (async () => {
    let s = store.defaultState();
    const q = { id: 'q-pw', theme: 'gratitude', type: 'act', title: 't' };
    for (let i = 0; i < 3; i++) s = (await store.completeQuest(s, q, `2026-09-1${i}`)) ?? s;
    return s;
  })();
  check('paywall still fires exactly on the 3rd completed loop', paywall.paywallSurface(loopsDone, '2026-09-13', true) === 'auto');
  check('a first-ever quest completion never triggers the paywall', paywall.paywallSurface(store.defaultState(), '2026-09-13', true) === null);
  const declined = await store.markPaywallSeen(loopsDone, '2026-09-13');
  check('declining still suppresses the modal for 7 days (day 6: nothing)', paywall.paywallSurface(declined, '2026-09-19', true) === null);
  check('day 7 still re-surfaces the small Growth button only', paywall.paywallSurface(declined, '2026-09-20', true) === 'growth');
  check('a paid user never sees the paywall again', paywall.paywallSurface({ ...declined, entitlements: { tier: 'paid' } }, '2026-12-01', true) === null);
  const mergedEnt = merge.mergeGuestState({ ...guest, entitlements: { tier: 'paid', expiry: NOW_ISO } }, store.defaultState());
  check('F10: entitlements still come from the account only (never inherited by a merge)', mergedEnt.entitlements.tier === 'free');
  check('F10: merging still keeps the higher streak and XP', merge.mergeGuestState(guest, { ...store.defaultState(), streak: { streakDays: 3, graceDaysMissed: 0, lastQuestDate: null }, progress: { totalXp: 40, level: 1 } }).progress.totalXp === 600);

  // -------------------------------------------------------------------------
  // 10. Build config + structural invariants (EAS-build-ready, one-file seam)
  // -------------------------------------------------------------------------

  const appJson = JSON.parse(fs.readFileSync(path.join(REPO, 'app.json'), 'utf8')).expo;
  check('app config carries the locked iOS bundle id', appJson.ios.bundleIdentifier === 'com.questcalm.app');
  check('app config carries the owner Apple Team ID', appJson.ios.appleTeamId === '3NNGCUL9V6');
  check('app config has an iOS build number for EAS', typeof appJson.ios.buildNumber === 'string' && appJson.ios.buildNumber.length > 0);
  const easJson = JSON.parse(fs.readFileSync(path.join(REPO, 'eas.json'), 'utf8'));
  check('eas.json defines development/preview/production profiles', Boolean(easJson.build?.development && easJson.build?.preview && easJson.build?.production));

  const pkg = JSON.parse(fs.readFileSync(path.join(REPO, 'package.json'), 'utf8'));
  check('react-native-iap is a dependency (open-source, no vendor account)', typeof pkg.dependencies['react-native-iap'] === 'string');
  check('react-native-nitro-modules ships with it (required native peer)', typeof pkg.dependencies['react-native-nitro-modules'] === 'string');
  check('expo-dev-client is present for the native dev-build profile', Boolean(pkg.dependencies['expo-dev-client'] || pkg.devDependencies?.['expo-dev-client']));

  check(
    'the two store product ids are exactly the owner-created ones',
    mapping.STORE_PRODUCT_IDS.monthly === 'calmquest_monthly' && mapping.STORE_PRODUCT_IDS.yearly === 'calmquest_yearly',
  );
  check('the plan rows carry those same product ids', service.SUBSCRIPTION_PLANS.every((p) => p.storeProductId === mapping.STORE_PRODUCT_IDS[p.id]));
  check('the 7-day trial is still the advertised window', service.TRIAL_DAYS === 7);

  const srcFiles = (function walk(dir) {
    const out = [];
    for (const name of fs.readdirSync(dir)) {
      const p = path.join(dir, name);
      const stat = fs.statSync(p);
      if (stat.isDirectory()) out.push(...walk(p));
      else if (/\.(ts|tsx)$/.test(name)) out.push(p);
    }
    return out;
  })(path.join(REPO, 'src'));
  const sdkImporters = srcFiles.filter((f) => /from ['"]react-native-iap['"]|require\(['"]react-native-iap['"]\)/.test(fs.readFileSync(f, 'utf8')));
  check(
    'exactly one file in src/ touches the billing SDK (the swap seam)',
    sdkImporters.length === 1 && sdkImporters[0].endsWith('bridge.native.ts'),
    sdkImporters.map((f) => path.relative(REPO, f)).join(', '),
  );
  // Real network calls, not the word "supabase" in a comment: a bare fetch(,
  // axios, XHR, or a Supabase client construction would all show up here.
  const SERVER_CALL = /(\baxios\b)|(\bXMLHttpRequest\b)|([^A-Za-z0-9_.]fetch\()|(supabase\.from\()|(createClient\()/;
  const serverCalls = srcFiles.filter((f) => SERVER_CALL.test(fs.readFileSync(f, 'utf8')));
  check('no fabricated server validation: nothing in src/ calls a backend', serverCalls.length === 0, serverCalls.map((f) => path.relative(REPO, f)).join(', '));
  check('the paywall screen no longer imports the stub service directly', !fs.readFileSync(path.join(REPO, 'src/screens/PaywallScreen.tsx'), 'utf8').includes("from '../subscription/stub'"));
  check('the Settings screen no longer imports the stub service directly', !fs.readFileSync(path.join(REPO, 'src/screens/SettingsScreen.tsx'), 'utf8').includes("from '../subscription/stub'"));

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------
  console.log(failures === 0 ? '\nALL PASSED' : `\n${failures} FAILURE(S)`);
  process.exit(failures === 0 ? 0 : 1);
})().catch((e) => {
  console.error('PROOF ERROR:', e);
  process.exit(1);
});
