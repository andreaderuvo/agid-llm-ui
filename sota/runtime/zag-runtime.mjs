/**
 * zag-runtime.mjs — il "binding" scritto UNA volta.
 * Fa girare QUALSIASI macchina Zag fuori da un framework (dentro un Web Component).
 * È il port vanilla di @zag-js/react/useMachine: importa tutta la logica dal core
 * agnostico e riscrive solo il ~collante reattivo (bindable/refs/track/render).
 */
import {
  createScope, findTransition, getExitEnterStates, hasTag,
  INIT_STATE, MachineStatus, matchesState, resolveStateValue,
} from "@zag-js/core";
import { callAll, compact, ensure, isFunction, isString, toArray, warn } from "@zag-js/utils";
import { createNormalizer } from "@zag-js/types";

// Zag emette props "React-style"; il normalizer è l'identità (come in React).
export const normalizeProps = createNormalizer((v) => v);

/** Applica al DOM reale i props che Zag produce (equivalente vanilla dello "spread"). */
export function spreadProps(el, props) {
  const listeners = (el.__zag ||= {});
  for (const [key, val] of Object.entries(props)) {
    if (key === "children" || val === undefined || val === null) continue;
    if (key === "style" && typeof val === "object") { Object.assign(el.style, val); continue; }
    if (/^on[A-Z]/.test(key)) {
      const evt = key.slice(2).toLowerCase();
      if (listeners[key]) el.removeEventListener(evt, listeners[key]);
      el.addEventListener(evt, val);
      listeners[key] = val;
      continue;
    }
    if (key === "className") { el.setAttribute("class", val); continue; }
    if (key === "htmlFor") { el.setAttribute("for", val); continue; }
    const attr = key === "tabIndex" ? "tabindex" : key;
    if (typeof val === "boolean") { val ? el.setAttribute(attr, "") : el.removeAttribute(attr); continue; }
    el.setAttribute(attr, String(val));
  }
}

/**
 * Crea un "service" Zag guidato in vanilla.
 * @param machine  la macchina (es. dialog.machine)
 * @param userProps props iniziali (id, controlled props, callback...)
 * @param render   callback chiamata (sincrona) a ogni cambiamento di stato/contesto
 * @returns { service, start, stop }  — `service` è ciò che si passa a connect()
 */
export function createService(machine, userProps = {}, render = () => {}) {
  const scope = createScope({ id: userProps.id, ids: userProps.ids, getRootNode: userProps.getRootNode });
  const debug = (...a) => { if (machine.debug) console.log(...a); };
  const cleanups = [];
  let status = MachineStatus.NotStarted;

  const props = machine.props?.({ props: compact(userProps), scope }) ?? userProps;
  const prop = (key) => props[key];

  // --- bindable: cella reattiva. set() aggiorna il valore, RENDERizza il DOM
  //     (come flushSync in React) e POI esegue onChange (effetti enter/exit sul DOM già presente).
  function bindable(getProps) {
    const p = getProps();
    const initialValue = p.value ?? p.defaultValue;
    const eq = p.isEqual ?? Object.is;
    let value = initialValue;
    const ref = { current: value };
    let prev = value;
    const controlled = () => getProps().value !== undefined;
    return {
      initial: initialValue,
      ref,
      get() { return controlled() ? getProps().value : value; },
      set(v) {
        const next = isFunction(v) ? v(prev) : v;
        if (!controlled()) { value = next; ref.current = next; }
        try { render(); } catch (e) { console.error("[zag-runtime] render error", e); }
        if (!eq(next, prev)) { const old = prev; prev = next; getProps().onChange?.(next, old); }
      },
      invoke(nextValue, prevValue) { getProps().onChange?.(nextValue, prevValue); },
      hash(v) { return getProps().hash?.(v) ?? String(v); },
    };
  }
  bindable.cleanup = (fn) => cleanups.push(fn);
  bindable.ref = (defaultValue) => { let v = defaultValue; return { get: () => v, set: (n) => { v = n; } }; };

  const flush = (fn) => fn();

  const context = machine.context?.({
    prop, bindable, scope, flush,
    getContext: () => ctx, getComputed: () => computed, getRefs: () => refs, getEvent: () => getEvent(),
  });
  const ctx = {
    get: (key) => context?.[key].ref.current,
    set: (key, value) => context?.[key].set(value),
    initial: (key) => context?.[key].initial,
    hash: (key) => context?.[key].hash(context?.[key].get()),
  };

  const effects = new Map();
  let transition = null;
  let currentEvent = { type: "" };
  let previousEvent = null;
  const getEvent = () => ({ ...currentEvent, current: () => currentEvent, previous: () => previousEvent });

  const getState = () => ({
    ...state,
    matches: (...values) => values.some((value) => matchesState(state.ref.current, value)),
    hasTag: (tag) => hasTag(machine, state.ref.current, tag),
  });

  const refsObj = machine.refs?.({ prop, context: ctx }) ?? {};
  const refs = { get: (k) => refsObj[k], set: (k, v) => { refsObj[k] = v; } };

  // track per machine.watch (confronta le dipendenze tra un giro e l'altro)
  let trackStore = [];
  let trackIndex = 0;
  const track = (deps, fn) => {
    const idx = trackIndex++;
    const cur = (deps ?? []).map((d) => (isFunction(d) ? d() : d));
    const prev = trackStore[idx];
    trackStore[idx] = cur;
    if (prev !== undefined && cur.some((v, k) => !Object.is(v, prev[k]))) fn();
  };

  const getParams = () => ({
    state: getState(), context: ctx, event: getEvent(), prop, send, action, guard,
    track, refs, computed, flush, scope, choose,
  });

  const action = (keys) => {
    const strs = isFunction(keys) ? keys(getParams()) : keys;
    if (!strs) return;
    for (const s of strs) {
      const fn = machine.implementations?.actions?.[s];
      if (!fn) warn(`[zag-js] No implementation found for action "${JSON.stringify(s)}"`);
      fn?.(getParams());
    }
  };
  const guard = (str) => {
    if (isFunction(str)) return str(getParams());
    const fn = machine.implementations?.guards?.[str];
    return fn?.(getParams());
  };
  const effect = (keys) => {
    const strs = isFunction(keys) ? keys(getParams()) : keys;
    if (!strs) return;
    const cleanupsLocal = [];
    for (const s of strs) {
      const fn = machine.implementations?.effects?.[s];
      if (!fn) warn(`[zag-js] No implementation found for effect "${JSON.stringify(s)}"`);
      const cleanup = fn?.(getParams());
      if (cleanup) cleanupsLocal.push(cleanup);
    }
    return () => cleanupsLocal.forEach((fn) => fn?.());
  };
  const choose = (transitions) =>
    toArray(transitions).find((t) => {
      let result = !t.guard;
      if (isString(t.guard)) result = !!guard(t.guard);
      else if (isFunction(t.guard)) result = t.guard(getParams());
      return result;
    });
  const computed = (key) => {
    ensure(machine.computed, () => `[zag-js] No computed object found on machine`);
    return machine.computed[key]({ context: ctx, event: getEvent(), prop, refs, scope, computed });
  };

  const state = bindable(() => ({
    defaultValue: resolveStateValue(machine, machine.initialState({ prop })),
    onChange(nextState, prevState) {
      const { exiting, entering } = getExitEnterStates(machine, prevState, nextState, transition?.reenter);
      exiting.forEach((item) => { effects.get(item.path)?.(); effects.delete(item.path); });
      exiting.forEach((item) => action(item.state?.exit));
      action(transition?.actions);
      entering.forEach((item) => {
        const cleanup = effect(item.state?.effects);
        if (cleanup) { const ex = effects.get(item.path); effects.set(item.path, ex ? callAll(ex, cleanup) : cleanup); }
      });
      if (prevState === INIT_STATE) {
        action(machine.entry);
        const cleanup = effect(machine.effects);
        if (cleanup) { const ex = effects.get(INIT_STATE); effects.set(INIT_STATE, ex ? callAll(ex, cleanup) : cleanup); }
      }
      entering.forEach((item) => action(item.state?.entry));
    },
  }));

  const runWatch = () => { if (machine.watch) { trackIndex = 0; machine.watch(getParams()); } };

  const send = (event) => {
    if (status !== MachineStatus.Started) return;
    previousEvent = currentEvent;
    currentEvent = event;
    const currentState = state.ref.current;
    const { transitions, source } = findTransition(machine, currentState, event.type);
    const t = choose(transitions);
    if (!t) return;
    transition = t;
    const target = resolveStateValue(machine, t.target ?? currentState, source);
    debug("transition", event.type, t.target || currentState, `(${t.actions})`);
    if (target !== currentState) state.set(target);
    else if (t.reenter) state.invoke(currentState, currentState);
    else action(t.actions ?? []);
    runWatch();
  };

  const service = {
    state: getState(), send, context: ctx, prop, scope, refs, computed,
    event: getEvent(), getStatus: () => status,
  };

  const start = () => {
    status = MachineStatus.Started;
    state.invoke(state.initial, INIT_STATE);
    runWatch();
    render();
  };
  const stop = () => {
    status = MachineStatus.Stopped;
    effects.forEach((fn) => fn?.());
    effects.clear();
    transition = null;
    action(machine.exit);
    cleanups.forEach((fn) => fn?.());
  };

  return { service, start, stop };
}
