!(function () {
  try {
    var e =
        "undefined" != typeof window
          ? window
          : "undefined" != typeof global
            ? global
            : "undefined" != typeof globalThis
              ? globalThis
              : "undefined" != typeof self
                ? self
                : {},
      n = new e.Error().stack;
    n &&
      ((e._posthogChunkIds = e._posthogChunkIds || {}),
      (e._posthogChunkIds[n] = "01a099e9-5e6c-7af1-aa32-3f5ef7c322a7"));
  } catch (e) {}
})();
const gs = Symbol("Comlink.proxy"),
  Xa = Symbol("Comlink.endpoint"),
  $a = Symbol("Comlink.releaseProxy"),
  yr = Symbol("Comlink.finalizer"),
  Cn = Symbol("Comlink.thrown"),
  hs = (e) => (typeof e == "object" && e !== null) || typeof e == "function",
  Ka = {
    canHandle: (e) => hs(e) && e[gs],
    serialize(e) {
      const { port1: t, port2: n } = new MessageChannel();
      return (li(e, t), [n, [n]]);
    },
    deserialize(e) {
      return (e.start(), ec(e));
    },
  },
  Qa = {
    canHandle: (e) => hs(e) && Cn in e,
    serialize({ value: e }) {
      let t;
      return (
        e instanceof Error
          ? (t = {
              isError: !0,
              value: { message: e.message, name: e.name, stack: e.stack },
            })
          : (t = { isError: !1, value: e }),
        [t, []]
      );
    },
    deserialize(e) {
      throw e.isError
        ? Object.assign(new Error(e.value.message), e.value)
        : e.value;
    },
  },
  ps = new Map([
    ["proxy", Ka],
    ["throw", Qa],
  ]);
function qa(e, t) {
  for (const n of e)
    if (t === n || n === "*" || (n instanceof RegExp && n.test(t))) return !0;
  return !1;
}
function li(e, t = globalThis, n = ["*"]) {
  (t.addEventListener("message", function r(i) {
    if (!i || !i.data) return;
    if (!qa(n, i.origin)) {
      console.warn(`Invalid origin '${i.origin}' for comlink proxy`);
      return;
    }
    const { id: o, type: s, path: a } = Object.assign({ path: [] }, i.data),
      c = (i.data.argumentList || []).map(ut);
    let l;
    try {
      const u = a.slice(0, -1).reduce((f, m) => f[m], e),
        d = a.reduce((f, m) => f[m], e);
      switch (s) {
        case "GET":
          l = d;
          break;
        case "SET":
          ((u[a.slice(-1)[0]] = ut(i.data.value)), (l = !0));
          break;
        case "APPLY":
          l = d.apply(u, c);
          break;
        case "CONSTRUCT":
          {
            const f = new d(...c);
            l = vs(f);
          }
          break;
        case "ENDPOINT":
          {
            const { port1: f, port2: m } = new MessageChannel();
            (li(e, m), (l = bs(f, [f])));
          }
          break;
        case "RELEASE":
          l = void 0;
          break;
        default:
          return;
      }
    } catch (u) {
      l = { value: u, [Cn]: 0 };
    }
    Promise.resolve(l)
      .catch((u) => ({ value: u, [Cn]: 0 }))
      .then((u) => {
        const [d, f] = Rn(u);
        (t.postMessage(Object.assign(Object.assign({}, d), { id: o }), f),
          s === "RELEASE" &&
            (t.removeEventListener("message", r),
            _s(t),
            yr in e && typeof e[yr] == "function" && e[yr]()));
      })
      .catch((u) => {
        const [d, f] = Rn({
          value: new TypeError("Unserializable return value"),
          [Cn]: 0,
        });
        t.postMessage(Object.assign(Object.assign({}, d), { id: o }), f);
      });
  }),
    t.start && t.start());
}
function Ya(e) {
  return e.constructor.name === "MessagePort";
}
function _s(e) {
  Ya(e) && e.close();
}
function ec(e, t) {
  const n = new Map();
  return (
    e.addEventListener("message", function (i) {
      const { data: o } = i;
      if (!o || !o.id) return;
      const s = n.get(o.id);
      if (s)
        try {
          s(o);
        } finally {
          n.delete(o.id);
        }
    }),
    Er(e, n, [], t)
  );
}
function ln(e) {
  if (e) throw new Error("Proxy has been released and is not useable");
}
function ys(e) {
  return Tt(e, new Map(), { type: "RELEASE" }).then(() => {
    _s(e);
  });
}
const On = new WeakMap(),
  zn =
    "FinalizationRegistry" in globalThis &&
    new FinalizationRegistry((e) => {
      const t = (On.get(e) || 0) - 1;
      (On.set(e, t), t === 0 && ys(e));
    });
function tc(e, t) {
  const n = (On.get(t) || 0) + 1;
  (On.set(t, n), zn && zn.register(e, t, e));
}
function nc(e) {
  zn && zn.unregister(e);
}
function Er(e, t, n = [], r = function () {}) {
  let i = !1;
  const o = new Proxy(r, {
    get(s, a) {
      if ((ln(i), a === $a))
        return () => {
          (nc(o), ys(e), t.clear(), (i = !0));
        };
      if (a === "then") {
        if (n.length === 0) return { then: () => o };
        const c = Tt(e, t, {
          type: "GET",
          path: n.map((l) => l.toString()),
        }).then(ut);
        return c.then.bind(c);
      }
      return Er(e, t, [...n, a]);
    },
    set(s, a, c) {
      ln(i);
      const [l, u] = Rn(c);
      return Tt(
        e,
        t,
        { type: "SET", path: [...n, a].map((d) => d.toString()), value: l },
        u,
      ).then(ut);
    },
    apply(s, a, c) {
      ln(i);
      const l = n[n.length - 1];
      if (l === Xa) return Tt(e, t, { type: "ENDPOINT" }).then(ut);
      if (l === "bind") return Er(e, t, n.slice(0, -1));
      const [u, d] = Gi(c);
      return Tt(
        e,
        t,
        { type: "APPLY", path: n.map((f) => f.toString()), argumentList: u },
        d,
      ).then(ut);
    },
    construct(s, a) {
      ln(i);
      const [c, l] = Gi(a);
      return Tt(
        e,
        t,
        {
          type: "CONSTRUCT",
          path: n.map((u) => u.toString()),
          argumentList: c,
        },
        l,
      ).then(ut);
    },
  });
  return (tc(o, e), o);
}
function rc(e) {
  return Array.prototype.concat.apply([], e);
}
function Gi(e) {
  const t = e.map(Rn);
  return [t.map((n) => n[0]), rc(t.map((n) => n[1]))];
}
const ws = new WeakMap();
function bs(e, t) {
  return (ws.set(e, t), e);
}
function vs(e) {
  return Object.assign(e, { [gs]: !0 });
}
function Rn(e) {
  for (const [t, n] of ps)
    if (n.canHandle(e)) {
      const [r, i] = n.serialize(e);
      return [{ type: "HANDLER", name: t, value: r }, i];
    }
  return [{ type: "RAW", value: e }, ws.get(e) || []];
}
function ut(e) {
  switch (e.type) {
    case "HANDLER":
      return ps.get(e.name).deserialize(e.value);
    case "RAW":
      return e.value;
  }
}
function Tt(e, t, n, r) {
  return new Promise((i) => {
    const o = ic();
    (t.set(o, i),
      e.start && e.start(),
      e.postMessage(Object.assign({ id: o }, n), r));
  });
}
function ic() {
  return new Array(4)
    .fill(0)
    .map(() => Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(16))
    .join("-");
}
var oc = "/_astro/C4q1boG87vQ4.simd.wasm",
  Ss = "/_astro/BIhsZSp9IFGv.wasm";
class kr {
  __destroy_into_raw() {
    const t = this.__wbg_ptr;
    return ((this.__wbg_ptr = 0), Ui.unregister(this), t);
  }
  free() {
    const t = this.__destroy_into_raw();
    b.__wbg_a_free(t, 0);
  }
  a(t, n) {
    return b.a_a(this.__wbg_ptr, t, n);
  }
  constructor(t, n) {
    X(t, re);
    var r = t.__destroy_into_raw();
    const i = Cs(n, b.__wbindgen_malloc, b.__wbindgen_realloc),
      o = Fn,
      s = b.a_new(r, i, o);
    return (
      (this.__wbg_ptr = s),
      Ui.register(this, this.__wbg_ptr, this),
      this
    );
  }
}
Symbol.dispose && (kr.prototype[Symbol.dispose] = kr.prototype.free);
class Vr {
  __destroy_into_raw() {
    const t = this.__wbg_ptr;
    return ((this.__wbg_ptr = 0), Zi.unregister(this), t);
  }
  free() {
    const t = this.__destroy_into_raw();
    b.__wbg_b_free(t, 0);
  }
  a(t, n) {
    b.b_a(this.__wbg_ptr, t, n);
  }
  b(t) {
    return b.b_b(this.__wbg_ptr, t);
  }
  c() {
    return b.b_c(this.__wbg_ptr);
  }
  d() {
    return b.b_d(this.__wbg_ptr) >>> 0;
  }
  e(t, n) {
    return b.b_e(this.__wbg_ptr, t, n);
  }
  f() {
    return b.b_f(this.__wbg_ptr);
  }
  g() {
    return b.b_g(this.__wbg_ptr);
  }
  h() {
    return b.b_h(this.__wbg_ptr) !== 0;
  }
  constructor(t, n) {
    const r = b.b_new(t, n);
    return (
      (this.__wbg_ptr = r),
      Zi.register(this, this.__wbg_ptr, this),
      this
    );
  }
}
Symbol.dispose && (Vr.prototype[Symbol.dispose] = Vr.prototype.free);
class Mr {
  __destroy_into_raw() {
    const t = this.__wbg_ptr;
    return ((this.__wbg_ptr = 0), Ji.unregister(this), t);
  }
  free() {
    const t = this.__destroy_into_raw();
    b.__wbg_c_free(t, 0);
  }
  a(t, n, r, i) {
    const o = b.c_a(this.__wbg_ptr, t, n, r, i);
    var s = Oe(o[0], o[1]).slice();
    return (b.__wbindgen_free(o[0], o[1] * 4, 4), s);
  }
  b(t, n, r, i) {
    const o = b.c_b(this.__wbg_ptr, t, n, r, i);
    var s = Oe(o[0], o[1]).slice();
    return (b.__wbindgen_free(o[0], o[1] * 4, 4), s);
  }
  constructor(t) {
    X(t, re);
    var n = t.__destroy_into_raw();
    const r = b.c_new(n);
    return (
      (this.__wbg_ptr = r),
      Ji.register(this, this.__wbg_ptr, this),
      this
    );
  }
}
Symbol.dispose && (Mr.prototype[Symbol.dispose] = Mr.prototype.free);
class Ar {
  __destroy_into_raw() {
    const t = this.__wbg_ptr;
    return ((this.__wbg_ptr = 0), Xi.unregister(this), t);
  }
  free() {
    const t = this.__destroy_into_raw();
    b.__wbg_d_free(t, 0);
  }
  a(t, n) {
    return b.d_a(this.__wbg_ptr, t, n);
  }
  b(t, n) {
    return b.d_b(this.__wbg_ptr, t, n);
  }
  c(t, n, r, i, o) {
    const s = b.d_c(this.__wbg_ptr, t, n, r, i, o);
    var a = Tn(s[0], s[1]).slice();
    return (b.__wbindgen_free(s[0], s[1] * 1, 1), a);
  }
  constructor(t) {
    X(t, re);
    var n = t.__destroy_into_raw();
    const r = b.d_new(n);
    return (
      (this.__wbg_ptr = r),
      Xi.register(this, this.__wbg_ptr, this),
      this
    );
  }
}
Symbol.dispose && (Ar.prototype[Symbol.dispose] = Ar.prototype.free);
class Or {
  __destroy_into_raw() {
    const t = this.__wbg_ptr;
    return ((this.__wbg_ptr = 0), $i.unregister(this), t);
  }
  free() {
    const t = this.__destroy_into_raw();
    b.__wbg_e_free(t, 0);
  }
  a(t, n, r, i, o) {
    return (X(t, ie), b.e_a(this.__wbg_ptr, t.__wbg_ptr, n, r, i, o));
  }
  constructor(t) {
    X(t, re);
    var n = t.__destroy_into_raw();
    const r = b.e_new(n);
    return (
      (this.__wbg_ptr = r),
      $i.register(this, this.__wbg_ptr, this),
      this
    );
  }
}
Symbol.dispose && (Or.prototype[Symbol.dispose] = Or.prototype.free);
class zr {
  __destroy_into_raw() {
    const t = this.__wbg_ptr;
    return ((this.__wbg_ptr = 0), Ki.unregister(this), t);
  }
  free() {
    const t = this.__destroy_into_raw();
    b.__wbg_f_free(t, 0);
  }
  a(t, n) {
    const r = b.f_a(this.__wbg_ptr, t, n);
    var i = Oe(r[0], r[1]).slice();
    return (b.__wbindgen_free(r[0], r[1] * 4, 4), i);
  }
  constructor(t) {
    X(t, re);
    var n = t.__destroy_into_raw();
    const r = b.f_new(n);
    return (
      (this.__wbg_ptr = r),
      Ki.register(this, this.__wbg_ptr, this),
      this
    );
  }
}
Symbol.dispose && (zr.prototype[Symbol.dispose] = zr.prototype.free);
class Rr {
  __destroy_into_raw() {
    const t = this.__wbg_ptr;
    return ((this.__wbg_ptr = 0), Qi.unregister(this), t);
  }
  free() {
    const t = this.__destroy_into_raw();
    b.__wbg_g_free(t, 0);
  }
  a(t, n, r, i, o) {
    return (X(t, ie), b.g_a(this.__wbg_ptr, t.__wbg_ptr, n, r, i, o));
  }
  b(t, n, r, i) {
    return b.g_b(this.__wbg_ptr, t, n, r, i);
  }
  constructor(t) {
    X(t, re);
    var n = t.__destroy_into_raw();
    const r = b.g_new(n);
    return (
      (this.__wbg_ptr = r),
      Qi.register(this, this.__wbg_ptr, this),
      this
    );
  }
}
Symbol.dispose && (Rr.prototype[Symbol.dispose] = Rr.prototype.free);
class Fr {
  __destroy_into_raw() {
    const t = this.__wbg_ptr;
    return ((this.__wbg_ptr = 0), Yi.unregister(this), t);
  }
  free() {
    const t = this.__destroy_into_raw();
    b.__wbg_h_free(t, 0);
  }
  a(t, n) {
    b.h_a(this.__wbg_ptr, t, n);
  }
  b() {
    const t = b.h_b(this.__wbg_ptr);
    var n = Oe(t[0], t[1]).slice();
    return (b.__wbindgen_free(t[0], t[1] * 4, 4), n);
  }
  c(t, n) {
    b.h_c(this.__wbg_ptr, t, n);
  }
  d(t) {
    return b.h_d(this.__wbg_ptr, t);
  }
  e(t) {
    return b.h_e(this.__wbg_ptr, t);
  }
  f() {
    return b.h_f(this.__wbg_ptr);
  }
  g() {
    const t = b.h_g(this.__wbg_ptr);
    var n = Oe(t[0], t[1]).slice();
    return (b.__wbindgen_free(t[0], t[1] * 4, 4), n);
  }
  h() {
    return b.h_h(this.__wbg_ptr);
  }
  i() {
    return b.h_i(this.__wbg_ptr);
  }
  j() {
    return b.h_j(this.__wbg_ptr) !== 0;
  }
  k(t) {
    b.h_k(this.__wbg_ptr, t);
  }
  constructor(t, n) {
    const r = b.h_new(t, n);
    return (
      (this.__wbg_ptr = r),
      Yi.register(this, this.__wbg_ptr, this),
      this
    );
  }
}
Symbol.dispose && (Fr.prototype[Symbol.dispose] = Fr.prototype.free);
class Pr {
  __destroy_into_raw() {
    const t = this.__wbg_ptr;
    return ((this.__wbg_ptr = 0), eo.unregister(this), t);
  }
  free() {
    const t = this.__destroy_into_raw();
    b.__wbg_i_free(t, 0);
  }
  a(t, n, r, i, o) {
    return (X(t, ie), b.i_a(this.__wbg_ptr, t.__wbg_ptr, n, r, i, o));
  }
  constructor(t) {
    X(t, re);
    var n = t.__destroy_into_raw();
    const r = b.i_new(n);
    return (
      (this.__wbg_ptr = r),
      eo.register(this, this.__wbg_ptr, this),
      this
    );
  }
}
Symbol.dispose && (Pr.prototype[Symbol.dispose] = Pr.prototype.free);
class Lr {
  __destroy_into_raw() {
    const t = this.__wbg_ptr;
    return ((this.__wbg_ptr = 0), to.unregister(this), t);
  }
  free() {
    const t = this.__destroy_into_raw();
    b.__wbg_j_free(t, 0);
  }
  a(t, n) {
    return (X(t, ie), b.j_a(this.__wbg_ptr, t.__wbg_ptr, n));
  }
  b(t, n, r, i, o) {
    return (X(t, ie), b.j_b(this.__wbg_ptr, t.__wbg_ptr, n, r, i, o));
  }
  constructor(t) {
    X(t, re);
    var n = t.__destroy_into_raw();
    const r = b.j_new(n);
    return (
      (this.__wbg_ptr = r),
      to.register(this, this.__wbg_ptr, this),
      this
    );
  }
}
Symbol.dispose && (Lr.prototype[Symbol.dispose] = Lr.prototype.free);
class ie {
  static __wrap(t) {
    const n = Object.create(ie.prototype);
    return ((n.__wbg_ptr = t), no.register(n, n.__wbg_ptr, n), n);
  }
  __destroy_into_raw() {
    const t = this.__wbg_ptr;
    return ((this.__wbg_ptr = 0), no.unregister(this), t);
  }
  free() {
    const t = this.__destroy_into_raw();
    b.__wbg_k_free(t, 0);
  }
  static a(t) {
    X(t, re);
    var n = t.__destroy_into_raw();
    const r = b.k_a(n);
    return ie.__wrap(r);
  }
  static b(t) {
    X(t, re);
    var n = t.__destroy_into_raw();
    const r = b.k_b(n);
    return ie.__wrap(r);
  }
  c(t, n, r) {
    return b.k_c(this.__wbg_ptr, t, n, r);
  }
  d(t, n, r) {
    return b.k_d(this.__wbg_ptr, t, n, r);
  }
  e(t, n, r) {
    return b.k_e(this.__wbg_ptr, t, n, r);
  }
  f(t, n, r, i) {
    return b.k_f(this.__wbg_ptr, t, n, r, i);
  }
  g(t, n, r, i) {
    return b.k_g(this.__wbg_ptr, t, n, r, i);
  }
  h(t, n, r, i, o, s, a) {
    const c = b.k_h(this.__wbg_ptr, t, n, r, i, o, s, a);
    var l = Oe(c[0], c[1]).slice();
    return (b.__wbindgen_free(c[0], c[1] * 4, 4), l);
  }
  i(t, n, r, i, o, s, a) {
    const c = b.k_i(this.__wbg_ptr, t, n, r, i, o, s, a);
    var l = Tn(c[0], c[1]).slice();
    return (b.__wbindgen_free(c[0], c[1] * 1, 1), l);
  }
  j(t, n, r, i, o, s) {
    const a = b.k_j(this.__wbg_ptr, t, n, r, i, o, s);
    var c = Tn(a[0], a[1]).slice();
    return (b.__wbindgen_free(a[0], a[1] * 1, 1), c);
  }
  k() {
    const t = b.k_k(this.__wbg_ptr);
    var n = Oe(t[0], t[1]).slice();
    return (b.__wbindgen_free(t[0], t[1] * 4, 4), n);
  }
  l(t, n) {
    return b.k_l(this.__wbg_ptr, t, n);
  }
  m(t, n, r, i) {
    return b.k_m(this.__wbg_ptr, t, n, r, i);
  }
  n(t, n, r) {
    const i = b.k_n(this.__wbg_ptr, t, n, r);
    var o = Tn(i[0], i[1]).slice();
    return (b.__wbindgen_free(i[0], i[1] * 1, 1), o);
  }
  o(t, n, r, i, o, s, a, c) {
    const l = b.k_o(this.__wbg_ptr, t, n, r, i, o, s, a, c);
    var u = Oe(l[0], l[1]).slice();
    return (b.__wbindgen_free(l[0], l[1] * 4, 4), u);
  }
}
Symbol.dispose && (ie.prototype[Symbol.dispose] = ie.prototype.free);
class Nr {
  __destroy_into_raw() {
    const t = this.__wbg_ptr;
    return ((this.__wbg_ptr = 0), ro.unregister(this), t);
  }
  free() {
    const t = this.__destroy_into_raw();
    b.__wbg_l_free(t, 0);
  }
  a(t, n, r, i, o) {
    return (X(o, ie), b.l_a(this.__wbg_ptr, t, n, r, i, o.__wbg_ptr));
  }
  constructor(t) {
    X(t, re);
    var n = t.__destroy_into_raw();
    const r = b.l_new(n);
    return (
      (this.__wbg_ptr = r),
      ro.register(this, this.__wbg_ptr, this),
      this
    );
  }
}
Symbol.dispose && (Nr.prototype[Symbol.dispose] = Nr.prototype.free);
class Hr {
  __destroy_into_raw() {
    const t = this.__wbg_ptr;
    return ((this.__wbg_ptr = 0), io.unregister(this), t);
  }
  free() {
    const t = this.__destroy_into_raw();
    b.__wbg_m_free(t, 0);
  }
  a(t, n, r, i, o) {
    return (X(t, ie), b.m_a(this.__wbg_ptr, t.__wbg_ptr, n, r, i, o));
  }
  constructor(t) {
    X(t, re);
    var n = t.__destroy_into_raw();
    const r = b.m_new(n);
    return (
      (this.__wbg_ptr = r),
      io.register(this, this.__wbg_ptr, this),
      this
    );
  }
}
Symbol.dispose && (Hr.prototype[Symbol.dispose] = Hr.prototype.free);
class re {
  __destroy_into_raw() {
    const t = this.__wbg_ptr;
    return ((this.__wbg_ptr = 0), so.unregister(this), t);
  }
  free() {
    const t = this.__destroy_into_raw();
    b.__wbg_n_free(t, 0);
  }
  constructor(t, n, r, i, o, s) {
    const a = b.n_new(t, n, r, i, xs(o) ? Number.MAX_SAFE_INTEGER : o >> 0, s);
    return (
      (this.__wbg_ptr = a),
      so.register(this, this.__wbg_ptr, this),
      this
    );
  }
}
Symbol.dispose && (re.prototype[Symbol.dispose] = re.prototype.free);
class mt {
  static __wrap(t) {
    const n = Object.create(mt.prototype);
    return ((n.__wbg_ptr = t), wr.register(n, n.__wbg_ptr, n), n);
  }
  __destroy_into_raw() {
    const t = this.__wbg_ptr;
    return ((this.__wbg_ptr = 0), wr.unregister(this), t);
  }
  free() {
    const t = this.__destroy_into_raw();
    b.__wbg_p_free(t, 0);
  }
  static a(t, n) {
    const r = b.p_a(t, n);
    return mt.__wrap(r);
  }
  b(t, n) {
    b.p_b(this.__wbg_ptr, t, n);
  }
  c(t) {
    return b.p_c(this.__wbg_ptr, t);
  }
  d() {
    const t = b.p_d(this.__wbg_ptr);
    var n = Oe(t[0], t[1]).slice();
    return (b.__wbindgen_free(t[0], t[1] * 4, 4), n);
  }
  e() {
    return b.p_e(this.__wbg_ptr);
  }
  f() {
    return b.p_f(this.__wbg_ptr);
  }
  g(t) {
    b.p_g(this.__wbg_ptr, t);
  }
  constructor(t, n, r, i) {
    const o = b.p_new(t, n, r, i);
    return (
      (this.__wbg_ptr = o),
      wr.register(this, this.__wbg_ptr, this),
      this
    );
  }
}
Symbol.dispose && (mt.prototype[Symbol.dispose] = mt.prototype.free);
class Dr {
  __destroy_into_raw() {
    const t = this.__wbg_ptr;
    return ((this.__wbg_ptr = 0), ji.unregister(this), t);
  }
  free() {
    const t = this.__destroy_into_raw();
    b.__wbg_q_free(t, 0);
  }
  a(t, n, r, i, o) {
    X(t, ie);
    const s = b.q_a(this.__wbg_ptr, t.__wbg_ptr, n, r, i, o);
    var a = Oe(s[0], s[1]).slice();
    return (b.__wbindgen_free(s[0], s[1] * 4, 4), a);
  }
  constructor(t) {
    X(t, re);
    var n = t.__destroy_into_raw();
    const r = b.q_new(n);
    return (
      (this.__wbg_ptr = r),
      ji.register(this, this.__wbg_ptr, this),
      this
    );
  }
}
Symbol.dispose && (Dr.prototype[Symbol.dispose] = Dr.prototype.free);
class Wr {
  __destroy_into_raw() {
    const t = this.__wbg_ptr;
    return ((this.__wbg_ptr = 0), oo.unregister(this), t);
  }
  free() {
    const t = this.__destroy_into_raw();
    b.__wbg_r_free(t, 0);
  }
  a(t, n, r, i, o) {
    X(t, ie);
    const s = b.r_a(this.__wbg_ptr, t.__wbg_ptr, n, r, i, o);
    var a = Oe(s[0], s[1]).slice();
    return (b.__wbindgen_free(s[0], s[1] * 4, 4), a);
  }
  constructor(t) {
    X(t, re);
    var n = t.__destroy_into_raw();
    const r = b.r_new(n);
    return (
      (this.__wbg_ptr = r),
      oo.register(this, this.__wbg_ptr, this),
      this
    );
  }
}
Symbol.dispose && (Wr.prototype[Symbol.dispose] = Wr.prototype.free);
class Gr {
  __destroy_into_raw() {
    const t = this.__wbg_ptr;
    return ((this.__wbg_ptr = 0), qi.unregister(this), t);
  }
  free() {
    const t = this.__destroy_into_raw();
    b.__wbg_s_free(t, 0);
  }
  a(t, n) {
    return b.s_a(this.__wbg_ptr, t, n) !== 0;
  }
  constructor(t) {
    X(t, re);
    var n = t.__destroy_into_raw();
    const r = b.s_new(n);
    return (
      (this.__wbg_ptr = r),
      qi.register(this, this.__wbg_ptr, this),
      this
    );
  }
}
Symbol.dispose && (Gr.prototype[Symbol.dispose] = Gr.prototype.free);
function sc() {
  return {
    __proto__: null,
    "./rust_wasm_bg.js": {
      __proto__: null,
      __wbg___wbindgen_throw_9c75d47bf9e7731e: function (t, n) {
        throw new Error(co(t, n));
      },
      __wbg_parse_96694afe7f805200: function (t, n) {
        let r, i;
        try {
          return ((r = t), (i = n), JSON.parse(co(t, n)));
        } finally {
          b.__wbindgen_free(r, i, 1);
        }
      },
      __wbg_stringify_f469d2b07ec0ff60: function (t, n) {
        const r = JSON.stringify(n);
        var i = xs(r) ? 0 : Cs(r, b.__wbindgen_malloc, b.__wbindgen_realloc),
          o = Fn;
        (ao().setInt32(t + 4, o, !0), ao().setInt32(t + 0, i, !0));
      },
      __wbindgen_init_externref_table: function () {
        const t = b.__wbindgen_externrefs,
          n = t.grow(4);
        (t.set(0, void 0),
          t.set(n + 0, void 0),
          t.set(n + 1, null),
          t.set(n + 2, !0),
          t.set(n + 3, !1));
      },
    },
  };
}
const ji =
    typeof FinalizationRegistry > "u"
      ? { register: () => {}, unregister: () => {} }
      : new FinalizationRegistry((e) => b.__wbg_q_free(e, 1)),
  Ui =
    typeof FinalizationRegistry > "u"
      ? { register: () => {}, unregister: () => {} }
      : new FinalizationRegistry((e) => b.__wbg_a_free(e, 1)),
  Zi =
    typeof FinalizationRegistry > "u"
      ? { register: () => {}, unregister: () => {} }
      : new FinalizationRegistry((e) => b.__wbg_b_free(e, 1)),
  Ji =
    typeof FinalizationRegistry > "u"
      ? { register: () => {}, unregister: () => {} }
      : new FinalizationRegistry((e) => b.__wbg_c_free(e, 1)),
  Xi =
    typeof FinalizationRegistry > "u"
      ? { register: () => {}, unregister: () => {} }
      : new FinalizationRegistry((e) => b.__wbg_d_free(e, 1)),
  $i =
    typeof FinalizationRegistry > "u"
      ? { register: () => {}, unregister: () => {} }
      : new FinalizationRegistry((e) => b.__wbg_e_free(e, 1)),
  Ki =
    typeof FinalizationRegistry > "u"
      ? { register: () => {}, unregister: () => {} }
      : new FinalizationRegistry((e) => b.__wbg_f_free(e, 1)),
  Qi =
    typeof FinalizationRegistry > "u"
      ? { register: () => {}, unregister: () => {} }
      : new FinalizationRegistry((e) => b.__wbg_g_free(e, 1)),
  qi =
    typeof FinalizationRegistry > "u"
      ? { register: () => {}, unregister: () => {} }
      : new FinalizationRegistry((e) => b.__wbg_s_free(e, 1)),
  Yi =
    typeof FinalizationRegistry > "u"
      ? { register: () => {}, unregister: () => {} }
      : new FinalizationRegistry((e) => b.__wbg_h_free(e, 1)),
  eo =
    typeof FinalizationRegistry > "u"
      ? { register: () => {}, unregister: () => {} }
      : new FinalizationRegistry((e) => b.__wbg_i_free(e, 1)),
  to =
    typeof FinalizationRegistry > "u"
      ? { register: () => {}, unregister: () => {} }
      : new FinalizationRegistry((e) => b.__wbg_j_free(e, 1)),
  no =
    typeof FinalizationRegistry > "u"
      ? { register: () => {}, unregister: () => {} }
      : new FinalizationRegistry((e) => b.__wbg_k_free(e, 1)),
  ro =
    typeof FinalizationRegistry > "u"
      ? { register: () => {}, unregister: () => {} }
      : new FinalizationRegistry((e) => b.__wbg_l_free(e, 1)),
  io =
    typeof FinalizationRegistry > "u"
      ? { register: () => {}, unregister: () => {} }
      : new FinalizationRegistry((e) => b.__wbg_m_free(e, 1)),
  oo =
    typeof FinalizationRegistry > "u"
      ? { register: () => {}, unregister: () => {} }
      : new FinalizationRegistry((e) => b.__wbg_r_free(e, 1)),
  so =
    typeof FinalizationRegistry > "u"
      ? { register: () => {}, unregister: () => {} }
      : new FinalizationRegistry((e) => b.__wbg_n_free(e, 1));
typeof FinalizationRegistry > "u" ||
  new FinalizationRegistry((e) => b.__wbg_o_free(e, 1));
const wr =
  typeof FinalizationRegistry > "u"
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry((e) => b.__wbg_p_free(e, 1));
function X(e, t) {
  if (!(e instanceof t)) throw new Error(`expected instance of ${t.name}`);
}
function Oe(e, t) {
  return ((e = e >>> 0), ac().subarray(e / 4, e / 4 + t));
}
function Tn(e, t) {
  return ((e = e >>> 0), Ht().subarray(e / 1, e / 1 + t));
}
let ct = null;
function ao() {
  return (
    (ct === null ||
      ct.buffer.detached === !0 ||
      (ct.buffer.detached === void 0 && ct.buffer !== b.memory.buffer)) &&
      (ct = new DataView(b.memory.buffer)),
    ct
  );
}
let Lt = null;
function ac() {
  return (
    (Lt === null || Lt.byteLength === 0) &&
      (Lt = new Int32Array(b.memory.buffer)),
    Lt
  );
}
function co(e, t) {
  return lc(e >>> 0, t);
}
let Nt = null;
function Ht() {
  return (
    (Nt === null || Nt.byteLength === 0) &&
      (Nt = new Uint8Array(b.memory.buffer)),
    Nt
  );
}
function xs(e) {
  return e == null;
}
function Cs(e, t, n) {
  if (n === void 0) {
    const a = Dt.encode(e),
      c = t(a.length, 1) >>> 0;
    return (
      Ht()
        .subarray(c, c + a.length)
        .set(a),
      (Fn = a.length),
      c
    );
  }
  let r = e.length,
    i = t(r, 1) >>> 0;
  const o = Ht();
  let s = 0;
  for (; s < r; s++) {
    const a = e.charCodeAt(s);
    if (a > 127) break;
    o[i + s] = a;
  }
  if (s !== r) {
    (s !== 0 && (e = e.slice(s)),
      (i = n(i, r, (r = s + e.length * 3), 1) >>> 0));
    const a = Ht().subarray(i + s, i + r),
      c = Dt.encodeInto(e, a);
    ((s += c.written), (i = n(i, r, s, 1) >>> 0));
  }
  return ((Fn = s), i);
}
let Bn = new TextDecoder("utf-8", { ignoreBOM: !0, fatal: !0 });
Bn.decode();
const cc = 2146435072;
let br = 0;
function lc(e, t) {
  return (
    (br += t),
    br >= cc &&
      ((Bn = new TextDecoder("utf-8", { ignoreBOM: !0, fatal: !0 })),
      Bn.decode(),
      (br = t)),
    Bn.decode(Ht().subarray(e, e + t))
  );
}
const Dt = new TextEncoder();
"encodeInto" in Dt ||
  (Dt.encodeInto = function (e, t) {
    const n = Dt.encode(e);
    return (t.set(n), { read: e.length, written: n.length });
  });
let Fn = 0,
  b;
function uc(e, t) {
  return (
    (b = e.exports),
    (ct = null),
    (Lt = null),
    (Nt = null),
    b.__wbindgen_start(),
    b
  );
}
async function fc(e, t) {
  if (typeof Response == "function" && e instanceof Response) {
    if (typeof WebAssembly.instantiateStreaming == "function")
      try {
        return await WebAssembly.instantiateStreaming(e, t);
      } catch (i) {
        if (
          e.ok &&
          n(e.type) &&
          e.headers.get("Content-Type") !== "application/wasm"
        )
          console.warn(
            "`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n",
            i,
          );
        else throw i;
      }
    const r = await e.arrayBuffer();
    return await WebAssembly.instantiate(r, t);
  } else {
    const r = await WebAssembly.instantiate(e, t);
    return r instanceof WebAssembly.Instance ? { instance: r, module: e } : r;
  }
  function n(r) {
    switch (r) {
      case "basic":
      case "cors":
      case "default":
        return !0;
    }
    return !1;
  }
}
async function dc(e) {
  if (b !== void 0) return b;
  (e !== void 0 &&
    (Object.getPrototypeOf(e) === Object.prototype
      ? ({ module_or_path: e } = e)
      : console.warn(
          "using deprecated parameters for the initialization function; pass a single object instead",
        )),
    e === void 0 && (e = Ss));
  const t = sc();
  (typeof e == "string" ||
    (typeof Request == "function" && e instanceof Request) ||
    (typeof URL == "function" && e instanceof URL)) &&
    (e = fetch(e));
  const { instance: n, module: r } = await fc(await e, t);
  return uc(n);
}
const mc = async () =>
  WebAssembly.validate(
    new Uint8Array([
      0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10,
      1, 8, 0, 65, 0, 253, 15, 253, 98, 11,
    ]),
  );
let vr;
async function gc() {
  if (!vr) {
    const t = (await mc().catch(
      (n) => (
        console.error(
          "wasm-feature-detect failed, defaulting to SIMD build",
          n,
        ),
        !0
      ),
    ))
      ? oc
      : Ss;
    vr = await dc({ module_or_path: t });
  }
  return vr;
}
function hc() {
  return new Promise((e) => {
    const { port1: t, port2: n } = new MessageChannel();
    ((t.onmessage = () => {
      (t.close(), e());
    }),
      n.postMessage(null));
  });
}
const pc = 64,
  Bt = new Set();
function _c(e) {
  if ((Bt.add(e), Bt.size > pc))
    for (const t of Bt) {
      Bt.delete(t);
      break;
    }
}
class Et extends Error {
  constructor() {
    super("task cancelled");
  }
}
const Ie = async () => {},
  yc = 200;
function Ts(e) {
  if (e === void 0) return Ie;
  let t = performance.now();
  return async () => {
    if (Bt.has(e)) throw new Et();
    if (
      !(performance.now() - t < yc) &&
      (await hc(), (t = performance.now()), Bt.has(e))
    )
      throw new Et();
  };
}
class wc extends Map {
  #n = 0;
  #e = new Map();
  #t = new Map();
  #i;
  #s;
  #o;
  constructor(t = {}) {
    if ((super(), !(t.maxSize && t.maxSize > 0)))
      throw new TypeError("`maxSize` must be a number greater than 0");
    if (typeof t.maxAge == "number" && t.maxAge === 0)
      throw new TypeError("`maxAge` must be a number greater than 0");
    ((this.#i = t.maxSize),
      (this.#s = t.maxAge || Number.POSITIVE_INFINITY),
      (this.#o = t.onEviction));
  }
  get __oldCache() {
    return this.#t;
  }
  #a(t) {
    if (typeof this.#o == "function")
      for (const [n, r] of t) this.#o(n, r.value);
  }
  #r(t, n) {
    return typeof n.expiry == "number" && n.expiry <= Date.now()
      ? (typeof this.#o == "function" && this.#o(t, n.value), this.delete(t))
      : !1;
  }
  #d(t, n) {
    if (this.#r(t, n) === !1) return n.value;
  }
  #l(t, n) {
    return n.expiry ? this.#d(t, n) : n.value;
  }
  #u(t, n) {
    const r = n.get(t);
    return this.#l(t, r);
  }
  #f(t, n) {
    (this.#e.set(t, n),
      this.#n++,
      this.#n >= this.#i &&
        ((this.#n = 0),
        this.#a(this.#t),
        (this.#t = this.#e),
        (this.#e = new Map())));
  }
  #m(t, n) {
    (this.#t.delete(t), this.#f(t, n));
  }
  *#c() {
    for (const t of this.#t) {
      const [n, r] = t;
      this.#e.has(n) || (this.#r(n, r) === !1 && (yield t));
    }
    for (const t of this.#e) {
      const [n, r] = t;
      this.#r(n, r) === !1 && (yield t);
    }
  }
  get(t) {
    if (this.#e.has(t)) {
      const n = this.#e.get(t);
      return this.#l(t, n);
    }
    if (this.#t.has(t)) {
      const n = this.#t.get(t);
      if (this.#r(t, n) === !1) return (this.#m(t, n), n.value);
    }
  }
  set(t, n, { maxAge: r = this.#s } = {}) {
    const i =
      typeof r == "number" && r !== Number.POSITIVE_INFINITY
        ? Date.now() + r
        : void 0;
    return (
      this.#e.has(t)
        ? this.#e.set(t, { value: n, expiry: i })
        : this.#f(t, { value: n, expiry: i }),
      this
    );
  }
  has(t) {
    return this.#e.has(t)
      ? !this.#r(t, this.#e.get(t))
      : this.#t.has(t)
        ? !this.#r(t, this.#t.get(t))
        : !1;
  }
  peek(t) {
    if (this.#e.has(t)) return this.#u(t, this.#e);
    if (this.#t.has(t)) return this.#u(t, this.#t);
  }
  expiresIn(t) {
    const n = this.#e.get(t) ?? this.#t.get(t);
    if (n) return n.expiry ? n.expiry - Date.now() : Number.POSITIVE_INFINITY;
  }
  delete(t) {
    const n = this.#e.delete(t);
    return (n && this.#n--, this.#t.delete(t) || n);
  }
  clear() {
    (this.#e.clear(), this.#t.clear(), (this.#n = 0));
  }
  resize(t) {
    if (!(t && t > 0))
      throw new TypeError("`maxSize` must be a number greater than 0");
    const n = [...this.#c()],
      r = n.length - t;
    (r < 0
      ? ((this.#e = new Map(n)), (this.#t = new Map()), (this.#n = n.length))
      : (r > 0 && this.#a(n.slice(0, r)),
        (this.#t = new Map(n.slice(r))),
        (this.#e = new Map()),
        (this.#n = 0)),
      (this.#i = t));
  }
  evict(t = 1) {
    const n = Number(t);
    if (!n || n <= 0) return;
    const r = [...this.#c()],
      i = Math.trunc(Math.min(n, Math.max(r.length - 1, 0)));
    i <= 0 ||
      (this.#a(r.slice(0, i)),
      (this.#t = new Map(r.slice(i))),
      (this.#e = new Map()),
      (this.#n = 0));
  }
  *keys() {
    for (const [t] of this) yield t;
  }
  *values() {
    for (const [, t] of this) yield t;
  }
  *[Symbol.iterator]() {
    for (const t of this.#e) {
      const [n, r] = t;
      this.#r(n, r) === !1 && (yield [n, r.value]);
    }
    for (const t of this.#t) {
      const [n, r] = t;
      this.#e.has(n) || (this.#r(n, r) === !1 && (yield [n, r.value]));
    }
  }
  *entriesDescending() {
    let t = [...this.#e];
    for (let n = t.length - 1; n >= 0; --n) {
      const r = t[n],
        [i, o] = r;
      this.#r(i, o) === !1 && (yield [i, o.value]);
    }
    t = [...this.#t];
    for (let n = t.length - 1; n >= 0; --n) {
      const r = t[n],
        [i, o] = r;
      this.#e.has(i) || (this.#r(i, o) === !1 && (yield [i, o.value]));
    }
  }
  *entriesAscending() {
    for (const [t, n] of this.#c()) yield [t, n.value];
  }
  get size() {
    if (!this.#n) return this.#t.size;
    let t = 0;
    for (const n of this.#t.keys()) this.#e.has(n) || t++;
    return Math.min(this.#n + t, this.#i);
  }
  get maxSize() {
    return this.#i;
  }
  get maxAge() {
    return this.#s;
  }
  entries() {
    return this.entriesAscending();
  }
  forEach(t, n = this) {
    for (const [r, i] of this.entriesAscending()) t.call(n, i, r, this);
  }
  get [Symbol.toStringTag]() {
    return "QuickLRU";
  }
  toString() {
    return `QuickLRU(${this.size}/${this.maxSize})`;
  }
  [Symbol.for("nodejs.util.inspect.custom")]() {
    return this.toString();
  }
}
const ui = new wc({ maxSize: 1024 });
function bc(e) {
  return ui.get(e);
}
function vc(e, t) {
  ui.set(e, t);
}
function Sc() {
  ui.clear();
}
var Ce = null;
try {
  Ce = new WebAssembly.Instance(
    new WebAssembly.Module(
      new Uint8Array([
        0, 97, 115, 109, 1, 0, 0, 0, 1, 13, 2, 96, 0, 1, 127, 96, 4, 127, 127,
        127, 127, 1, 127, 3, 7, 6, 0, 1, 1, 1, 1, 1, 6, 6, 1, 127, 1, 65, 0, 11,
        7, 50, 6, 3, 109, 117, 108, 0, 1, 5, 100, 105, 118, 95, 115, 0, 2, 5,
        100, 105, 118, 95, 117, 0, 3, 5, 114, 101, 109, 95, 115, 0, 4, 5, 114,
        101, 109, 95, 117, 0, 5, 8, 103, 101, 116, 95, 104, 105, 103, 104, 0, 0,
        10, 191, 1, 6, 4, 0, 35, 0, 11, 36, 1, 1, 126, 32, 0, 173, 32, 1, 173,
        66, 32, 134, 132, 32, 2, 173, 32, 3, 173, 66, 32, 134, 132, 126, 34, 4,
        66, 32, 135, 167, 36, 0, 32, 4, 167, 11, 36, 1, 1, 126, 32, 0, 173, 32,
        1, 173, 66, 32, 134, 132, 32, 2, 173, 32, 3, 173, 66, 32, 134, 132, 127,
        34, 4, 66, 32, 135, 167, 36, 0, 32, 4, 167, 11, 36, 1, 1, 126, 32, 0,
        173, 32, 1, 173, 66, 32, 134, 132, 32, 2, 173, 32, 3, 173, 66, 32, 134,
        132, 128, 34, 4, 66, 32, 135, 167, 36, 0, 32, 4, 167, 11, 36, 1, 1, 126,
        32, 0, 173, 32, 1, 173, 66, 32, 134, 132, 32, 2, 173, 32, 3, 173, 66,
        32, 134, 132, 129, 34, 4, 66, 32, 135, 167, 36, 0, 32, 4, 167, 11, 36,
        1, 1, 126, 32, 0, 173, 32, 1, 173, 66, 32, 134, 132, 32, 2, 173, 32, 3,
        173, 66, 32, 134, 132, 130, 34, 4, 66, 32, 135, 167, 36, 0, 32, 4, 167,
        11,
      ]),
    ),
    {},
  ).exports;
} catch {}
function V(e, t, n) {
  ((this.low = e | 0), (this.high = t | 0), (this.unsigned = !!n));
}
V.prototype.__isLong__;
Object.defineProperty(V.prototype, "__isLong__", { value: !0 });
function le(e) {
  return (e && e.__isLong__) === !0;
}
function lo(e) {
  var t = Math.clz32(e & -e);
  return e ? 31 - t : t;
}
V.isLong = le;
var uo = {},
  fo = {};
function bt(e, t) {
  var n, r, i;
  return t
    ? ((e >>>= 0),
      (i = 0 <= e && e < 256) && ((r = fo[e]), r)
        ? r
        : ((n = j(e, 0, !0)), i && (fo[e] = n), n))
    : ((e |= 0),
      (i = -128 <= e && e < 128) && ((r = uo[e]), r)
        ? r
        : ((n = j(e, e < 0 ? -1 : 0, !1)), i && (uo[e] = n), n));
}
V.fromInt = bt;
function Te(e, t) {
  if (isNaN(e)) return t ? je : Ae;
  if (t) {
    if (e < 0) return je;
    if (e >= Bs) return ks;
  } else {
    if (e <= -go) return pe;
    if (e + 1 >= go) return Es;
  }
  return e < 0 ? Te(-e, t).neg() : j((e % kt) | 0, (e / kt) | 0, t);
}
V.fromNumber = Te;
function j(e, t, n) {
  return new V(e, t, n);
}
V.fromBits = j;
var Pn = Math.pow;
function fi(e, t, n) {
  if (e.length === 0) throw Error("empty string");
  if (
    (typeof t == "number" ? ((n = t), (t = !1)) : (t = !!t),
    e === "NaN" || e === "Infinity" || e === "+Infinity" || e === "-Infinity")
  )
    return t ? je : Ae;
  if (((n = n || 10), n < 2 || 36 < n)) throw RangeError("radix");
  var r;
  if ((r = e.indexOf("-")) > 0) throw Error("interior hyphen");
  if (r === 0) return fi(e.substring(1), t, n).neg();
  for (var i = Te(Pn(n, 8)), o = Ae, s = 0; s < e.length; s += 8) {
    var a = Math.min(8, e.length - s),
      c = parseInt(e.substring(s, s + a), n);
    if (a < 8) {
      var l = Te(Pn(n, a));
      o = o.mul(l).add(Te(c));
    } else ((o = o.mul(i)), (o = o.add(Te(c))));
  }
  return ((o.unsigned = t), o);
}
V.fromString = fi;
function Ee(e, t) {
  return typeof e == "number"
    ? Te(e, t)
    : typeof e == "string"
      ? fi(e, t)
      : j(e.low, e.high, typeof t == "boolean" ? t : e.unsigned);
}
V.fromValue = Ee;
var mo = 65536,
  xc = 1 << 24,
  kt = mo * mo,
  Bs = kt * kt,
  go = Bs / 2,
  ho = bt(xc),
  Ae = bt(0);
V.ZERO = Ae;
var je = bt(0, !0);
V.UZERO = je;
var It = bt(1);
V.ONE = It;
var Is = bt(1, !0);
V.UONE = Is;
var jr = bt(-1);
V.NEG_ONE = jr;
var Es = j(-1, 2147483647, !1);
V.MAX_VALUE = Es;
var ks = j(-1, -1, !0);
V.MAX_UNSIGNED_VALUE = ks;
var pe = j(0, -2147483648, !1);
V.MIN_VALUE = pe;
var T = V.prototype;
T.toInt = function () {
  return this.unsigned ? this.low >>> 0 : this.low;
};
T.toNumber = function () {
  return this.unsigned
    ? (this.high >>> 0) * kt + (this.low >>> 0)
    : this.high * kt + (this.low >>> 0);
};
T.toString = function (t) {
  if (((t = t || 10), t < 2 || 36 < t)) throw RangeError("radix");
  if (this.isZero()) return "0";
  if (this.isNegative())
    if (this.eq(pe)) {
      var n = Te(t),
        r = this.div(n),
        i = r.mul(n).sub(this);
      return r.toString(t) + i.toInt().toString(t);
    } else return "-" + this.neg().toString(t);
  for (var o = Te(Pn(t, 6), this.unsigned), s = this, a = ""; ;) {
    var c = s.div(o),
      l = s.sub(c.mul(o)).toInt() >>> 0,
      u = l.toString(t);
    if (((s = c), s.isZero())) return u + a;
    for (; u.length < 6;) u = "0" + u;
    a = "" + u + a;
  }
};
T.getHighBits = function () {
  return this.high;
};
T.getHighBitsUnsigned = function () {
  return this.high >>> 0;
};
T.getLowBits = function () {
  return this.low;
};
T.getLowBitsUnsigned = function () {
  return this.low >>> 0;
};
T.getNumBitsAbs = function () {
  if (this.isNegative()) return this.eq(pe) ? 64 : this.neg().getNumBitsAbs();
  for (
    var t = this.high != 0 ? this.high : this.low, n = 31;
    n > 0 && (t & (1 << n)) == 0;
    n--
  );
  return this.high != 0 ? n + 33 : n + 1;
};
T.isSafeInteger = function () {
  var t = this.high >> 21;
  return t
    ? this.unsigned
      ? !1
      : t === -1 && !(this.low === 0 && this.high === -2097152)
    : !0;
};
T.isZero = function () {
  return this.high === 0 && this.low === 0;
};
T.eqz = T.isZero;
T.isNegative = function () {
  return !this.unsigned && this.high < 0;
};
T.isPositive = function () {
  return this.unsigned || this.high >= 0;
};
T.isOdd = function () {
  return (this.low & 1) === 1;
};
T.isEven = function () {
  return (this.low & 1) === 0;
};
T.equals = function (t) {
  return (
    le(t) || (t = Ee(t)),
    this.unsigned !== t.unsigned &&
    this.high >>> 31 === 1 &&
    t.high >>> 31 === 1
      ? !1
      : this.high === t.high && this.low === t.low
  );
};
T.eq = T.equals;
T.notEquals = function (t) {
  return !this.eq(t);
};
T.neq = T.notEquals;
T.ne = T.notEquals;
T.lessThan = function (t) {
  return this.comp(t) < 0;
};
T.lt = T.lessThan;
T.lessThanOrEqual = function (t) {
  return this.comp(t) <= 0;
};
T.lte = T.lessThanOrEqual;
T.le = T.lessThanOrEqual;
T.greaterThan = function (t) {
  return this.comp(t) > 0;
};
T.gt = T.greaterThan;
T.greaterThanOrEqual = function (t) {
  return this.comp(t) >= 0;
};
T.gte = T.greaterThanOrEqual;
T.ge = T.greaterThanOrEqual;
T.compare = function (t) {
  if ((le(t) || (t = Ee(t)), this.eq(t))) return 0;
  var n = this.isNegative(),
    r = t.isNegative();
  return n && !r
    ? -1
    : !n && r
      ? 1
      : this.unsigned
        ? t.high >>> 0 > this.high >>> 0 ||
          (t.high === this.high && t.low >>> 0 > this.low >>> 0)
          ? -1
          : 1
        : this.sub(t).isNegative()
          ? -1
          : 1;
};
T.comp = T.compare;
T.negate = function () {
  return !this.unsigned && this.eq(pe) ? pe : this.not().add(It);
};
T.neg = T.negate;
T.add = function (t) {
  le(t) || (t = Ee(t));
  var n = this.high >>> 16,
    r = this.high & 65535,
    i = this.low >>> 16,
    o = this.low & 65535,
    s = t.high >>> 16,
    a = t.high & 65535,
    c = t.low >>> 16,
    l = t.low & 65535,
    u = 0,
    d = 0,
    f = 0,
    m = 0;
  return (
    (m += o + l),
    (f += m >>> 16),
    (m &= 65535),
    (f += i + c),
    (d += f >>> 16),
    (f &= 65535),
    (d += r + a),
    (u += d >>> 16),
    (d &= 65535),
    (u += n + s),
    (u &= 65535),
    j((f << 16) | m, (u << 16) | d, this.unsigned)
  );
};
T.subtract = function (t) {
  return (le(t) || (t = Ee(t)), this.add(t.neg()));
};
T.sub = T.subtract;
T.multiply = function (t) {
  if (this.isZero()) return this;
  if ((le(t) || (t = Ee(t)), Ce)) {
    var n = Ce.mul(this.low, this.high, t.low, t.high);
    return j(n, Ce.get_high(), this.unsigned);
  }
  if (t.isZero()) return this.unsigned ? je : Ae;
  if (this.eq(pe)) return t.isOdd() ? pe : Ae;
  if (t.eq(pe)) return this.isOdd() ? pe : Ae;
  if (this.isNegative())
    return t.isNegative() ? this.neg().mul(t.neg()) : this.neg().mul(t).neg();
  if (t.isNegative()) return this.mul(t.neg()).neg();
  if (this.lt(ho) && t.lt(ho))
    return Te(this.toNumber() * t.toNumber(), this.unsigned);
  var r = this.high >>> 16,
    i = this.high & 65535,
    o = this.low >>> 16,
    s = this.low & 65535,
    a = t.high >>> 16,
    c = t.high & 65535,
    l = t.low >>> 16,
    u = t.low & 65535,
    d = 0,
    f = 0,
    m = 0,
    h = 0;
  return (
    (h += s * u),
    (m += h >>> 16),
    (h &= 65535),
    (m += o * u),
    (f += m >>> 16),
    (m &= 65535),
    (m += s * l),
    (f += m >>> 16),
    (m &= 65535),
    (f += i * u),
    (d += f >>> 16),
    (f &= 65535),
    (f += o * l),
    (d += f >>> 16),
    (f &= 65535),
    (f += s * c),
    (d += f >>> 16),
    (f &= 65535),
    (d += r * u + i * l + o * c + s * a),
    (d &= 65535),
    j((m << 16) | h, (d << 16) | f, this.unsigned)
  );
};
T.mul = T.multiply;
T.divide = function (t) {
  if ((le(t) || (t = Ee(t)), t.isZero())) throw Error("division by zero");
  if (Ce) {
    if (
      !this.unsigned &&
      this.high === -2147483648 &&
      t.low === -1 &&
      t.high === -1
    )
      return this;
    var n = (this.unsigned ? Ce.div_u : Ce.div_s)(
      this.low,
      this.high,
      t.low,
      t.high,
    );
    return j(n, Ce.get_high(), this.unsigned);
  }
  if (this.isZero()) return this.unsigned ? je : Ae;
  var r, i, o;
  if (this.unsigned) {
    if ((t.unsigned || (t = t.toUnsigned()), t.gt(this))) return je;
    if (t.gt(this.shru(1))) return Is;
    o = je;
  } else {
    if (this.eq(pe)) {
      if (t.eq(It) || t.eq(jr)) return pe;
      if (t.eq(pe)) return It;
      var s = this.shr(1);
      return (
        (r = s.div(t).shl(1)),
        r.eq(Ae)
          ? t.isNegative()
            ? It
            : jr
          : ((i = this.sub(t.mul(r))), (o = r.add(i.div(t))), o)
      );
    } else if (t.eq(pe)) return this.unsigned ? je : Ae;
    if (this.isNegative())
      return t.isNegative() ? this.neg().div(t.neg()) : this.neg().div(t).neg();
    if (t.isNegative()) return this.div(t.neg()).neg();
    o = Ae;
  }
  for (i = this; i.gte(t);) {
    r = Math.max(1, Math.floor(i.toNumber() / t.toNumber()));
    for (
      var a = Math.ceil(Math.log(r) / Math.LN2),
        c = a <= 48 ? 1 : Pn(2, a - 48),
        l = Te(r),
        u = l.mul(t);
      u.isNegative() || u.gt(i);
    )
      ((r -= c), (l = Te(r, this.unsigned)), (u = l.mul(t)));
    (l.isZero() && (l = It), (o = o.add(l)), (i = i.sub(u)));
  }
  return o;
};
T.div = T.divide;
T.modulo = function (t) {
  if ((le(t) || (t = Ee(t)), Ce)) {
    var n = (this.unsigned ? Ce.rem_u : Ce.rem_s)(
      this.low,
      this.high,
      t.low,
      t.high,
    );
    return j(n, Ce.get_high(), this.unsigned);
  }
  return this.sub(this.div(t).mul(t));
};
T.mod = T.modulo;
T.rem = T.modulo;
T.not = function () {
  return j(~this.low, ~this.high, this.unsigned);
};
T.countLeadingZeros = function () {
  return this.high ? Math.clz32(this.high) : Math.clz32(this.low) + 32;
};
T.clz = T.countLeadingZeros;
T.countTrailingZeros = function () {
  return this.low ? lo(this.low) : lo(this.high) + 32;
};
T.ctz = T.countTrailingZeros;
T.and = function (t) {
  return (
    le(t) || (t = Ee(t)),
    j(this.low & t.low, this.high & t.high, this.unsigned)
  );
};
T.or = function (t) {
  return (
    le(t) || (t = Ee(t)),
    j(this.low | t.low, this.high | t.high, this.unsigned)
  );
};
T.xor = function (t) {
  return (
    le(t) || (t = Ee(t)),
    j(this.low ^ t.low, this.high ^ t.high, this.unsigned)
  );
};
T.shiftLeft = function (t) {
  return (
    le(t) && (t = t.toInt()),
    (t &= 63) === 0
      ? this
      : t < 32
        ? j(
            this.low << t,
            (this.high << t) | (this.low >>> (32 - t)),
            this.unsigned,
          )
        : j(0, this.low << (t - 32), this.unsigned)
  );
};
T.shl = T.shiftLeft;
T.shiftRight = function (t) {
  return (
    le(t) && (t = t.toInt()),
    (t &= 63) === 0
      ? this
      : t < 32
        ? j(
            (this.low >>> t) | (this.high << (32 - t)),
            this.high >> t,
            this.unsigned,
          )
        : j(this.high >> (t - 32), this.high >= 0 ? 0 : -1, this.unsigned)
  );
};
T.shr = T.shiftRight;
T.shiftRightUnsigned = function (t) {
  return (
    le(t) && (t = t.toInt()),
    (t &= 63) === 0
      ? this
      : t < 32
        ? j(
            (this.low >>> t) | (this.high << (32 - t)),
            this.high >>> t,
            this.unsigned,
          )
        : t === 32
          ? j(this.high, 0, this.unsigned)
          : j(this.high >>> (t - 32), 0, this.unsigned)
  );
};
T.shru = T.shiftRightUnsigned;
T.shr_u = T.shiftRightUnsigned;
T.rotateLeft = function (t) {
  var n;
  return (
    le(t) && (t = t.toInt()),
    (t &= 63) === 0
      ? this
      : t === 32
        ? j(this.high, this.low, this.unsigned)
        : t < 32
          ? ((n = 32 - t),
            j(
              (this.low << t) | (this.high >>> n),
              (this.high << t) | (this.low >>> n),
              this.unsigned,
            ))
          : ((t -= 32),
            (n = 32 - t),
            j(
              (this.high << t) | (this.low >>> n),
              (this.low << t) | (this.high >>> n),
              this.unsigned,
            ))
  );
};
T.rotl = T.rotateLeft;
T.rotateRight = function (t) {
  var n;
  return (
    le(t) && (t = t.toInt()),
    (t &= 63) === 0
      ? this
      : t === 32
        ? j(this.high, this.low, this.unsigned)
        : t < 32
          ? ((n = 32 - t),
            j(
              (this.high << n) | (this.low >>> t),
              (this.low << n) | (this.high >>> t),
              this.unsigned,
            ))
          : ((t -= 32),
            (n = 32 - t),
            j(
              (this.low << n) | (this.high >>> t),
              (this.high << n) | (this.low >>> t),
              this.unsigned,
            ))
  );
};
T.rotr = T.rotateRight;
T.toSigned = function () {
  return this.unsigned ? j(this.low, this.high, !1) : this;
};
T.toUnsigned = function () {
  return this.unsigned ? this : j(this.low, this.high, !0);
};
T.toBytes = function (t) {
  return t ? this.toBytesLE() : this.toBytesBE();
};
T.toBytesLE = function () {
  var t = this.high,
    n = this.low;
  return [
    n & 255,
    (n >>> 8) & 255,
    (n >>> 16) & 255,
    n >>> 24,
    t & 255,
    (t >>> 8) & 255,
    (t >>> 16) & 255,
    t >>> 24,
  ];
};
T.toBytesBE = function () {
  var t = this.high,
    n = this.low;
  return [
    t >>> 24,
    (t >>> 16) & 255,
    (t >>> 8) & 255,
    t & 255,
    n >>> 24,
    (n >>> 16) & 255,
    (n >>> 8) & 255,
    n & 255,
  ];
};
V.fromBytes = function (t, n, r) {
  return r ? V.fromBytesLE(t, n) : V.fromBytesBE(t, n);
};
V.fromBytesLE = function (t, n) {
  return new V(
    t[0] | (t[1] << 8) | (t[2] << 16) | (t[3] << 24),
    t[4] | (t[5] << 8) | (t[6] << 16) | (t[7] << 24),
    n,
  );
};
V.fromBytesBE = function (t, n) {
  return new V(
    (t[4] << 24) | (t[5] << 16) | (t[6] << 8) | t[7],
    (t[0] << 24) | (t[1] << 16) | (t[2] << 8) | t[3],
    n,
  );
};
typeof BigInt == "function" &&
  ((V.fromBigInt = function (t, n) {
    var r = Number(BigInt.asIntN(32, t)),
      i = Number(BigInt.asIntN(32, t >> BigInt(32)));
    return j(r, i, n);
  }),
  (V.fromValue = function (t, n) {
    return typeof t == "bigint" ? V.fromBigInt(t, n) : Ee(t, n);
  }),
  (T.toBigInt = function () {
    var t = BigInt(this.low >>> 0),
      n = BigInt(this.unsigned ? this.high >>> 0 : this.high);
    return (n << BigInt(32)) | t;
  }));
var _ = ((e) => ((e.Java = "Java"), (e.Bedrock = "Bedrock"), e))(_ || {}),
  p = ((e) => (
    (e[(e.V1_7 = 100700)] = "V1_7"),
    (e[(e.V1_8 = 100800)] = "V1_8"),
    (e[(e.V1_9 = 100900)] = "V1_9"),
    (e[(e.V1_10 = 101e3)] = "V1_10"),
    (e[(e.V1_11 = 101100)] = "V1_11"),
    (e[(e.V1_12 = 101200)] = "V1_12"),
    (e[(e.V1_13 = 101300)] = "V1_13"),
    (e[(e.V1_14 = 101400)] = "V1_14"),
    (e[(e.V1_15 = 101500)] = "V1_15"),
    (e[(e.V1_16 = 101600)] = "V1_16"),
    (e[(e.V1_17 = 101700)] = "V1_17"),
    (e[(e.V1_18 = 101800)] = "V1_18"),
    (e[(e.V1_19 = 101900)] = "V1_19"),
    (e[(e.V1_19_3 = 101903)] = "V1_19_3"),
    (e[(e.V1_20 = 102e3)] = "V1_20"),
    (e[(e.V1_21 = 102100)] = "V1_21"),
    (e[(e.V1_21_2 = 102102)] = "V1_21_2"),
    (e[(e.V1_21_4 = 102104)] = "V1_21_4"),
    (e[(e.V1_21_5 = 102105)] = "V1_21_5"),
    (e[(e.V1_21_6 = 102106)] = "V1_21_6"),
    (e[(e.V1_21_9 = 102109)] = "V1_21_9"),
    (e[(e.V26_1 = 260100)] = "V26_1"),
    (e[(e.V26_2 = 260200)] = "V26_2"),
    (e[(e.V26_3 = 260300)] = "V26_3"),
    e
  ))(p || {}),
  S = ((e) => (
    (e[(e.V1_14 = 101400)] = "V1_14"),
    (e[(e.V1_16 = 101600)] = "V1_16"),
    (e[(e.V1_17 = 101700)] = "V1_17"),
    (e[(e.V1_18 = 101800)] = "V1_18"),
    (e[(e.V1_19 = 101900)] = "V1_19"),
    (e[(e.V1_20 = 102e3)] = "V1_20"),
    (e[(e.V1_20_60 = 102006)] = "V1_20_60"),
    (e[(e.V1_21 = 102100)] = "V1_21"),
    (e[(e.V1_21_40 = 102104)] = "V1_21_40"),
    (e[(e.V1_21_50 = 102105)] = "V1_21_50"),
    (e[(e.V1_21_60 = 102106)] = "V1_21_60"),
    (e[(e.V1_21_70 = 102107)] = "V1_21_70"),
    (e[(e.V1_21_80 = 102108)] = "V1_21_80"),
    (e[(e.V1_21_90 = 102109)] = "V1_21_90"),
    (e[(e.V1_21_110 = 102111)] = "V1_21_110"),
    (e[(e.V1_21_120 = 102112)] = "V1_21_120"),
    (e[(e.V26_30 = 263e3)] = "V26_30"),
    (e[(e.V26_40 = 264e3)] = "V26_40"),
    (e[(e.V26_50 = 265e3)] = "V26_50"),
    e
  ))(S || {}),
  y = ((e) => (
    (e.Overworld = "overworld"),
    (e.Nether = "nether"),
    (e.End = "end"),
    e
  ))(y || {}),
  ve = ((e) => (
    (e[(e.ZOMBIE = 0)] = "ZOMBIE"),
    (e[(e.SPIDER = 1)] = "SPIDER"),
    (e[(e.SKELETON = 2)] = "SKELETON"),
    e
  ))(ve || {}),
  g = ((e) => (
    (e.AbandonedCamp = "abandonedCamp"),
    (e.BastionRemnant = "bastionRemnant"),
    (e.BuriedTreasure = "buriedTreasure"),
    (e.Dungeon = "dungeon"),
    (e.EndCity = "endCity"),
    (e.NetherFortress = "netherFortress"),
    (e.SlimeChunk = "slimeChunk"),
    (e.Stronghold = "stronghold"),
    (e.Village = "village"),
    (e.Mineshaft = "mineshaft"),
    (e.WoodlandMansion = "woodlandMansion"),
    (e.PillagerOutpost = "pillagerOutpost"),
    (e.OceanRuin = "oceanRuin"),
    (e.OceanMonument = "oceanMonument"),
    (e.Shipwreck = "shipwreck"),
    (e.DesertTemple = "desertTemple"),
    (e.JungleTemple = "jungleTemple"),
    (e.WitchHut = "witchHut"),
    (e.Igloo = "igloo"),
    (e.RuinedPortalOverworld = "ruinedPortalOverworld"),
    (e.RuinedPortalNether = "ruinedPortalNether"),
    (e.Spawn = "spawn"),
    (e.Fossil = "fossil"),
    (e.FossilNether = "fossilNether"),
    (e.Ravine = "ravine"),
    (e.EndGateway = "endGateway"),
    (e.AmethystGeode = "amethystGeode"),
    (e.AncientCity = "ancientCity"),
    (e.ItemOverworld = "itemOverworld"),
    (e.OreVein = "oreVein"),
    (e.Cave = "cave"),
    (e.DesertWell = "desertWell"),
    (e.TrailRuin = "trailRuin"),
    (e.TrialChamber = "trialChamber"),
    (e.LavaPool = "lavaPool"),
    e
  ))(g || {});
const ye = 0,
  Un = "none",
  Le = [],
  Cc = {},
  Ke = B({
    id: 0,
    key: "ocean",
    name: "Ocean",
    category: "ocean",
    temperature: 0.5,
    precipitation: "rain",
    depth: -1,
    rgb: [0, 0, 112],
    dimension: y.Overworld,
    displayCategory: "water",
  }),
  ke = B({
    id: 1,
    key: "plains",
    name: "Plains",
    category: "plains",
    temperature: 0.8,
    precipitation: "rain",
    depth: 0.125,
    rgb: [141, 179, 96],
    dimension: y.Overworld,
    displayCategory: "plains",
  }),
  Y = B({
    id: 2,
    key: "desert",
    name: "Desert",
    category: "desert",
    temperature: 2,
    precipitation: "none",
    depth: 0.125,
    rgb: [250, 148, 24],
    dimension: y.Overworld,
    displayCategory: "sandy",
  }),
  Jt = B({
    id: 3,
    key: "windswept_hills",
    name: "Windswept Hills",
    oldNames: ["Mountains"],
    category: "extreme_hills",
    temperature: 0.2,
    precipitation: "rain",
    depth: 1,
    rgb: [96, 96, 96],
    dimension: y.Overworld,
    displayCategory: "mountains",
  }),
  Xt = B({
    id: 4,
    key: "forest",
    name: "Forest",
    category: "forest",
    temperature: 0.7,
    precipitation: "rain",
    depth: 0.1,
    rgb: [5, 102, 33],
    dimension: y.Overworld,
    displayCategory: "woodlands",
  }),
  we = B({
    id: 5,
    key: "taiga",
    name: "Taiga",
    category: "taiga",
    temperature: 0.25,
    precipitation: "rain",
    depth: 0.2,
    rgb: [11, 102, 89],
    dimension: y.Overworld,
    displayCategory: "woodlands",
  }),
  gt = B({
    id: 6,
    key: "swamp",
    name: "Swamp",
    category: "swamp",
    temperature: 0.8,
    precipitation: "rain",
    depth: -0.2,
    rgb: [7, 249, 178],
    dimension: y.Overworld,
    displayCategory: "swamps",
  }),
  di = B({
    id: 7,
    key: "river",
    name: "River",
    category: "river",
    temperature: 0.5,
    precipitation: "rain",
    depth: -0.5,
    rgb: [0, 0, 255],
    dimension: y.Overworld,
    displayCategory: "water",
  }),
  mi = B({
    id: 8,
    key: "nether_wastes",
    name: "Nether Wastes",
    category: "nether",
    temperature: 2,
    precipitation: "none",
    depth: 0.1,
    rgb: [191, 59, 59],
    climates: [
      { temperature: 0, humidity: 0, altitude: 0, weirdness: 0, offset: 0 },
    ],
    dimension: y.Nether,
    displayCategory: "nether",
  }),
  Tc = B({
    id: 9,
    key: "the_end",
    name: "The End",
    category: "the_end",
    temperature: 0.5,
    precipitation: "none",
    depth: 0.1,
    rgb: [128, 128, 255],
    dimension: y.End,
    displayCategory: "end",
  }),
  Ne = B({
    id: 10,
    key: "frozen_ocean",
    name: "Frozen Ocean",
    category: "ocean",
    temperature: 0,
    precipitation: "snow",
    depth: -1,
    rgb: [112, 112, 214],
    dimension: y.Overworld,
    displayCategory: "water",
  }),
  $t = B({
    id: 11,
    key: "frozen_river",
    name: "Frozen River",
    category: "river",
    temperature: 0,
    precipitation: "snow",
    depth: -0.5,
    rgb: [160, 160, 255],
    dimension: y.Overworld,
    displayCategory: "water",
  }),
  Ve = B({
    id: 12,
    key: "snowy_plains",
    name: "Snowy Plains",
    oldNames: ["Snowy Tundra"],
    category: "icy",
    temperature: 0,
    precipitation: "snow",
    depth: 0.125,
    rgb: [255, 255, 255],
    dimension: y.Overworld,
    displayCategory: "plains",
  }),
  Bc = B({
    id: 13,
    name: "Snowy Mountains",
    category: "icy",
    temperature: 0,
    precipitation: "snow",
    depth: 0.45,
    rgb: [160, 160, 160],
    dimension: y.Overworld,
    displayCategory: "legacy",
  }),
  Vs = B({
    id: 14,
    key: "mushroom_fields",
    name: "Mushroom Fields",
    category: "mushroom",
    temperature: 0.9,
    precipitation: "rain",
    depth: 0.2,
    rgb: [255, 0, 255],
    dimension: y.Overworld,
    displayCategory: "plains",
  }),
  Zn = B({
    id: 15,
    name: "Mushroom Fields Shore",
    category: "mushroom",
    temperature: 0.9,
    precipitation: "rain",
    depth: 0,
    rgb: [160, 0, 255],
    dimension: y.Overworld,
    displayCategory: "legacy",
  }),
  ft = B({
    id: 16,
    key: "beach",
    name: "Beach",
    category: "beach",
    temperature: 0.8,
    precipitation: "rain",
    depth: 0,
    rgb: [250, 222, 85],
    dimension: y.Overworld,
    displayCategory: "sandy",
  }),
  Ms = B({
    id: 17,
    name: "Desert Hills",
    category: "desert",
    temperature: 2,
    precipitation: "none",
    depth: 0.45,
    rgb: [210, 95, 18],
    dimension: y.Overworld,
    displayCategory: "legacy",
  }),
  Kt = B({
    id: 18,
    key: "windswept_forest",
    name: "Windswept Forest",
    oldNames: ["Wooded Hills"],
    category: "forest",
    temperature: 0.7,
    precipitation: "rain",
    depth: 0.45,
    rgb: [34, 85, 28],
    dimension: y.Overworld,
    displayCategory: "mountains",
  }),
  Qt = B({
    id: 19,
    name: "Taiga Hills",
    category: "taiga",
    temperature: 0.25,
    precipitation: "rain",
    depth: 0.45,
    rgb: [22, 57, 51],
    dimension: y.Overworld,
    displayCategory: "legacy",
  }),
  Ic = B({
    id: 20,
    name: "Mountain Edge",
    category: "extreme_hills",
    temperature: 0.2,
    precipitation: "rain",
    depth: 0.8,
    rgb: [114, 120, 154],
    dimension: y.Overworld,
    displayCategory: "legacy",
  }),
  vt = B({
    id: 21,
    key: "jungle",
    name: "Jungle",
    category: "jungle",
    temperature: 0.95,
    precipitation: "rain",
    depth: 0.1,
    rgb: [83, 123, 9],
    dimension: y.Overworld,
    displayCategory: "woodlands",
  }),
  gi = B({
    id: 22,
    name: "Jungle Hills",
    category: "jungle",
    temperature: 0.95,
    precipitation: "rain",
    depth: 0.45,
    rgb: [44, 66, 5],
    dimension: y.Overworld,
    displayCategory: "legacy",
  }),
  Jn = B({
    id: 23,
    key: "sparse_jungle",
    name: "Sparse Jungle",
    oldNames: ["Jungle Edge"],
    category: "jungle",
    temperature: 0.95,
    precipitation: "rain",
    depth: 0.1,
    rgb: [98, 139, 23],
    dimension: y.Overworld,
    displayCategory: "woodlands",
  }),
  He = B({
    id: 24,
    key: "deep_ocean",
    name: "Deep Ocean",
    category: "ocean",
    temperature: 0.5,
    precipitation: "rain",
    depth: -1.8,
    rgb: [0, 0, 48],
    dimension: y.Overworld,
    displayCategory: "water",
  }),
  As = B({
    id: 25,
    key: "stony_shore",
    name: "Stony Shore",
    oldNames: ["Stone Shore"],
    category: "none",
    temperature: 0.2,
    precipitation: "rain",
    depth: 0.1,
    rgb: [162, 162, 132],
    dimension: y.Overworld,
    displayCategory: "mountains",
  }),
  Ze = B({
    id: 26,
    key: "snowy_beach",
    name: "Snowy Beach",
    category: "beach",
    temperature: 0.05,
    precipitation: "snow",
    depth: 0,
    rgb: [250, 240, 192],
    dimension: y.Overworld,
    displayCategory: "sandy",
  }),
  Xn = B({
    id: 27,
    key: "birch_forest",
    name: "Birch Forest",
    category: "forest",
    temperature: 0.6,
    precipitation: "rain",
    depth: 0.1,
    rgb: [48, 116, 68],
    dimension: y.Overworld,
    displayCategory: "woodlands",
  }),
  Os = B({
    id: 28,
    name: "Birch Forest Hills",
    category: "forest",
    temperature: 0.6,
    precipitation: "rain",
    depth: 0.45,
    rgb: [31, 95, 50],
    dimension: y.Overworld,
    displayCategory: "legacy",
  }),
  ot = B({
    id: 29,
    key: "dark_forest",
    name: "Dark Forest",
    category: "forest",
    temperature: 0.7,
    precipitation: "rain",
    depth: 0.1,
    rgb: [64, 81, 26],
    dimension: y.Overworld,
    displayCategory: "woodlands",
  }),
  Re = B({
    id: 30,
    key: "snowy_taiga",
    name: "Snowy Taiga",
    category: "taiga",
    temperature: -0.5,
    precipitation: "snow",
    depth: 0.2,
    rgb: [49, 85, 74],
    dimension: y.Overworld,
    displayCategory: "woodlands",
  }),
  $n = B({
    id: 31,
    name: "Snowy Taiga Hills",
    category: "taiga",
    temperature: -0.5,
    precipitation: "snow",
    depth: 0.45,
    rgb: [36, 63, 54],
    dimension: y.Overworld,
    displayCategory: "legacy",
  }),
  Mt = B({
    id: 32,
    key: "old_growth_pine_taiga",
    name: "Old Growth Pine Taiga",
    oldNames: ["Giant Tree Taiga"],
    category: "taiga",
    temperature: 0.3,
    precipitation: "rain",
    depth: 0.2,
    rgb: [89, 102, 81],
    dimension: y.Overworld,
    displayCategory: "woodlands",
  }),
  zs = B({
    id: 33,
    name: "Giant Tree Taiga Hills",
    category: "taiga",
    temperature: 0.3,
    precipitation: "rain",
    depth: 0.45,
    rgb: [69, 79, 62],
    dimension: y.Overworld,
    displayCategory: "legacy",
  }),
  Rs = B({
    id: 34,
    name: "Wooded Mountains",
    category: "extreme_hills",
    temperature: 0.2,
    precipitation: "rain",
    depth: 1,
    rgb: [80, 112, 80],
    dimension: y.Overworld,
    displayCategory: "legacy",
  }),
  Me = B({
    id: 35,
    key: "savanna",
    name: "Savanna",
    category: "savanna",
    temperature: 1.2,
    precipitation: "none",
    depth: 0.125,
    rgb: [189, 178, 95],
    dimension: y.Overworld,
    displayCategory: "plains",
  }),
  Kn = B({
    id: 36,
    key: "savanna_plateau",
    name: "Savanna Plateau",
    category: "savanna",
    temperature: 1,
    precipitation: "none",
    depth: 1.5,
    rgb: [167, 157, 100],
    dimension: y.Overworld,
    displayCategory: "mountains",
  }),
  Qn = B({
    id: 37,
    key: "badlands",
    name: "Badlands",
    category: "mesa",
    temperature: 2,
    precipitation: "none",
    depth: 0.1,
    rgb: [217, 69, 21],
    dimension: y.Overworld,
    displayCategory: "sandy",
  }),
  qn = B({
    id: 38,
    key: "wooded_badlands",
    name: "Wooded Badlands",
    oldNames: ["Wooded Badlands Plateau"],
    category: "mesa",
    temperature: 2,
    precipitation: "none",
    depth: 1.5,
    rgb: [176, 151, 101],
    dimension: y.Overworld,
    displayCategory: "sandy",
  }),
  Fs = B({
    id: 39,
    name: "Badlands Plateau",
    category: "mesa",
    temperature: 2,
    precipitation: "none",
    depth: 1.5,
    rgb: [202, 140, 101],
    dimension: y.Overworld,
    displayCategory: "legacy",
  }),
  Ec = B({
    id: 40,
    key: "small_end_islands",
    name: "Small End Islands",
    category: "the_end",
    temperature: 0.5,
    precipitation: "none",
    depth: 0.1,
    rgb: [0, 0, 42],
    dimension: y.End,
    displayCategory: "end",
  }),
  Ps = B({
    id: 41,
    key: "end_midlands",
    name: "End Midlands",
    category: "the_end",
    temperature: 0.5,
    precipitation: "none",
    depth: 0.1,
    rgb: [235, 248, 182],
    dimension: y.End,
    displayCategory: "end",
  }),
  qt = B({
    id: 42,
    key: "end_highlands",
    name: "End Highlands",
    category: "the_end",
    temperature: 0.5,
    precipitation: "none",
    depth: 0.1,
    rgb: [195, 189, 137],
    dimension: y.End,
    displayCategory: "end",
  }),
  kc = B({
    id: 43,
    key: "end_barrens",
    name: "End Barrens",
    category: "the_end",
    temperature: 0.5,
    precipitation: "none",
    depth: 0.1,
    rgb: [144, 144, 114],
    dimension: y.End,
    displayCategory: "end",
  }),
  Qe = B({
    id: 44,
    key: "warm_ocean",
    name: "Warm Ocean",
    category: "ocean",
    temperature: 0.5,
    precipitation: "rain",
    depth: -1,
    rgb: [0, 0, 172],
    dimension: y.Overworld,
    displayCategory: "water",
  }),
  ht = B({
    id: 45,
    key: "lukewarm_ocean",
    name: "Lukewarm Ocean",
    category: "ocean",
    temperature: 0.5,
    precipitation: "rain",
    depth: -1,
    rgb: [0, 0, 144],
    dimension: y.Overworld,
    displayCategory: "water",
  }),
  pt = B({
    id: 46,
    key: "cold_ocean",
    name: "Cold Ocean",
    category: "ocean",
    temperature: 0.5,
    precipitation: "rain",
    depth: -1,
    rgb: [32, 32, 112],
    dimension: y.Overworld,
    displayCategory: "water",
  }),
  Yt = B({
    id: 47,
    key: "deep_warm_ocean",
    name: "Deep Warm Ocean",
    category: "ocean",
    temperature: 0.5,
    precipitation: "rain",
    depth: -1.8,
    rgb: [0, 0, 80],
    dimension: y.Overworld,
    displayCategory: "legacy",
  }),
  qe = B({
    id: 48,
    key: "deep_lukewarm_ocean",
    name: "Deep Lukewarm Ocean",
    category: "ocean",
    temperature: 0.5,
    precipitation: "rain",
    depth: -1.8,
    rgb: [0, 0, 64],
    dimension: y.Overworld,
    displayCategory: "water",
  }),
  Ye = B({
    id: 49,
    key: "deep_cold_ocean",
    name: "Deep Cold Ocean",
    category: "ocean",
    temperature: 0.5,
    precipitation: "rain",
    depth: -1.8,
    rgb: [32, 32, 56],
    dimension: y.Overworld,
    displayCategory: "water",
  }),
  De = B({
    id: 50,
    key: "deep_frozen_ocean",
    name: "Deep Frozen Ocean",
    category: "ocean",
    temperature: 0.5,
    precipitation: "rain",
    depth: -1.8,
    rgb: [64, 64, 144],
    dimension: y.Overworld,
    displayCategory: "water",
  }),
  en = B({
    id: 129,
    name: "Sunflower Plains",
    key: "sunflower_plains",
    category: "plains",
    temperature: 0.8,
    precipitation: "rain",
    depth: 0.125,
    rgb: [181, 219, 136],
    parent: ke.id,
    dimension: y.Overworld,
    displayCategory: "plains",
  }),
  Vc = B({
    id: 130,
    name: "Desert Lakes",
    category: "desert",
    temperature: 2,
    precipitation: "none",
    depth: 0.125,
    rgb: [255, 188, 64],
    parent: Y.id,
    dimension: y.Overworld,
    displayCategory: "legacy",
  }),
  Yn = B({
    id: 131,
    key: "windswept_gravelly_hills",
    name: "Windswept Gravelly Hills",
    oldNames: ["Gravelly Mountains"],
    category: "extreme_hills",
    temperature: 0.2,
    precipitation: "rain",
    depth: 1,
    rgb: [136, 136, 136],
    parent: Jt.id,
    dimension: y.Overworld,
    displayCategory: "mountains",
  }),
  hi = B({
    id: 132,
    key: "flower_forest",
    name: "Flower Forest",
    category: "forest",
    temperature: 0.7,
    precipitation: "rain",
    depth: 0.1,
    rgb: [45, 142, 73],
    parent: Xt.id,
    dimension: y.Overworld,
    displayCategory: "woodlands",
  }),
  Mc = B({
    id: 133,
    name: "Taiga Mountains",
    category: "taiga",
    temperature: 0.25,
    precipitation: "rain",
    depth: 0.3,
    rgb: [51, 142, 129],
    parent: we.id,
    dimension: y.Overworld,
    displayCategory: "legacy",
  }),
  Ls = B({
    id: 134,
    name: "Swamp Hills",
    category: "swamp",
    temperature: 0.8,
    precipitation: "rain",
    depth: -0.1,
    rgb: [47, 255, 218],
    parent: gt.id,
    dimension: y.Overworld,
    displayCategory: "legacy",
  }),
  er = B({
    id: 140,
    key: "ice_spikes",
    name: "Ice Spikes",
    category: "icy",
    temperature: 0,
    precipitation: "snow",
    depth: 0.425,
    rgb: [180, 220, 220],
    parent: Ve.id,
    dimension: y.Overworld,
    displayCategory: "plains",
  }),
  Ac = B({
    id: 149,
    name: "Modified Jungle",
    category: "jungle",
    temperature: 0.95,
    precipitation: "rain",
    depth: 0.2,
    rgb: [123, 163, 49],
    parent: vt.id,
    dimension: y.Overworld,
    displayCategory: "legacy",
  }),
  Oc = B({
    id: 151,
    name: "Modified Jungle Edge",
    category: "jungle",
    temperature: 0.95,
    precipitation: "rain",
    depth: 0.2,
    rgb: [138, 179, 63],
    parent: Jn.id,
    dimension: y.Overworld,
    displayCategory: "legacy",
  }),
  tr = B({
    id: 155,
    key: "old_growth_birch_forest",
    name: "Old Growth Birch Forest",
    oldNames: ["Tall Birch Forest"],
    category: "forest",
    temperature: 0.6,
    precipitation: "rain",
    depth: 0.2,
    rgb: [88, 156, 108],
    parent: Xn.id,
    dimension: y.Overworld,
    displayCategory: "woodlands",
  }),
  zc = B({
    id: 156,
    name: "Tall Birch Hills",
    category: "forest",
    temperature: 0.6,
    precipitation: "rain",
    depth: 0.55,
    rgb: [71, 135, 90],
    parent: Os.id,
    dimension: y.Overworld,
    displayCategory: "legacy",
  }),
  tn = B({
    id: 157,
    name: "Dark Forest Hills",
    category: "forest",
    temperature: 0.7,
    precipitation: "rain",
    depth: 0.2,
    rgb: [104, 121, 66],
    parent: ot.id,
    dimension: y.Overworld,
    displayCategory: "legacy",
  }),
  Rc = B({
    id: 158,
    name: "Snowy Taiga Mountains",
    category: "taiga",
    temperature: -0.5,
    precipitation: "snow",
    depth: 0.3,
    rgb: [89, 125, 114],
    parent: Re.id,
    dimension: y.Overworld,
    displayCategory: "legacy",
  }),
  nn = B({
    id: 160,
    key: "old_growth_spruce_taiga",
    name: "Old Growth Spruce Taiga",
    oldNames: ["Giant Spruce Taiga"],
    category: "taiga",
    temperature: 0.25,
    precipitation: "rain",
    depth: 0.2,
    rgb: [129, 142, 121],
    parent: Mt.id,
    dimension: y.Overworld,
    displayCategory: "woodlands",
  }),
  Fc = B({
    id: 161,
    name: "Giant Spruce Taiga Hills",
    category: "taiga",
    temperature: 0.25,
    precipitation: "rain",
    depth: 0.2,
    rgb: [109, 119, 102],
    parent: zs.id,
    dimension: y.Overworld,
    displayCategory: "legacy",
  }),
  Pc = B({
    id: 162,
    name: "Gravelly Mountains+",
    category: "extreme_hills",
    temperature: 0.2,
    precipitation: "rain",
    depth: 1,
    rgb: [120, 152, 120],
    parent: Rs.id,
    dimension: y.Overworld,
    displayCategory: "legacy",
  }),
  pi = B({
    id: 163,
    key: "windswept_savanna",
    name: "Windswept Savanna",
    oldNames: ["Shattered Savanna"],
    category: "savanna",
    temperature: 1.1,
    precipitation: "none",
    depth: 0.3625,
    rgb: [229, 218, 135],
    parent: Me.id,
    dimension: y.Overworld,
    displayCategory: "mountains",
  }),
  Lc = B({
    id: 164,
    name: "Shattered Savanna Plateau",
    category: "savanna",
    temperature: 1,
    precipitation: "none",
    rgb: [207, 197, 140],
    depth: 1.05,
    parent: Kn.id,
    dimension: y.Overworld,
    displayCategory: "legacy",
  }),
  _i = B({
    id: 165,
    key: "eroded_badlands",
    name: "Eroded Badlands",
    category: "mesa",
    temperature: 2,
    precipitation: "none",
    depth: 0.1,
    rgb: [255, 109, 61],
    parent: Qn.id,
    dimension: y.Overworld,
    displayCategory: "sandy",
  }),
  Nc = B({
    id: 166,
    name: "Modified Wooded Badlands Plateau",
    category: "mesa",
    temperature: 2,
    precipitation: "none",
    depth: 0.45,
    rgb: [216, 191, 141],
    parent: qn.id,
    dimension: y.Overworld,
    displayCategory: "legacy",
  }),
  Hc = B({
    id: 167,
    name: "Modified Badlands Plateau",
    category: "mesa",
    temperature: 2,
    precipitation: "none",
    depth: 0.45,
    rgb: [242, 180, 141],
    parent: Fs.id,
    dimension: y.Overworld,
    displayCategory: "legacy",
  }),
  nr = B({
    id: 168,
    key: "bamboo_jungle",
    name: "Bamboo Jungle",
    category: "jungle",
    temperature: 0.95,
    precipitation: "rain",
    depth: 0.1,
    rgb: [118, 142, 20],
    dimension: y.Overworld,
    displayCategory: "woodlands",
  }),
  Ns = B({
    id: 169,
    name: "Bamboo Jungle Hills",
    category: "jungle",
    temperature: 0.95,
    precipitation: "rain",
    depth: 0.45,
    rgb: [59, 71, 10],
    dimension: y.Overworld,
    displayCategory: "legacy",
  }),
  Hs = B({
    id: 170,
    key: "soul_sand_valley",
    name: "Soul Sand Valley",
    category: "nether",
    temperature: 2,
    precipitation: "none",
    depth: 0.1,
    rgb: [94, 56, 48],
    climates: [
      { temperature: 0, humidity: -0.5, altitude: 0, weirdness: 0, offset: 0 },
    ],
    dimension: y.Nether,
    displayCategory: "nether",
  }),
  Ds = B({
    id: 171,
    key: "crimson_forest",
    name: "Crimson Forest",
    category: "nether",
    temperature: 2,
    precipitation: "none",
    depth: 0.1,
    rgb: [221, 8, 8],
    climates: [
      { temperature: 0.4, humidity: 0, altitude: 0, weirdness: 0, offset: 0 },
    ],
    dimension: y.Nether,
    displayCategory: "nether",
  }),
  Ws = B({
    id: 172,
    key: "warped_forest",
    name: "Warped Forest",
    category: "nether",
    temperature: 2,
    precipitation: "none",
    depth: 0.1,
    rgb: [73, 144, 123],
    climates: [
      {
        temperature: 0,
        humidity: 0.5,
        altitude: 0,
        weirdness: 0,
        offset: 0.375,
      },
    ],
    dimension: y.Nether,
    displayCategory: "nether",
  }),
  Dc = B({
    id: 173,
    key: "basalt_deltas",
    name: "Basalt Deltas",
    category: "nether",
    temperature: 2,
    precipitation: "none",
    depth: 0.1,
    rgb: [64, 54, 54],
    climates: [
      {
        temperature: -0.5,
        humidity: 0,
        altitude: 0,
        weirdness: 0,
        offset: 0.175,
      },
    ],
    dimension: y.Nether,
    displayCategory: "nether",
  }),
  rr = B({
    id: 174,
    key: "dripstone_caves",
    name: "Dripstone Caves",
    category: "none",
    temperature: 0.8,
    precipitation: "rain",
    depth: ye,
    rgb: [193, 165, 143],
    dimension: y.Overworld,
    displayCategory: "caves",
  }),
  ir = B({
    id: 175,
    key: "lush_caves",
    name: "Lush Caves",
    category: "none",
    temperature: 0.5,
    precipitation: "rain",
    depth: ye,
    rgb: [223, 150, 52],
    dimension: y.Overworld,
    displayCategory: "caves",
  }),
  St = B({
    id: 177,
    key: "meadow",
    name: "Meadow",
    category: "mountain",
    temperature: 0.5,
    precipitation: "rain",
    depth: ye,
    rgb: [140, 164, 112],
    dimension: y.Overworld,
    displayCategory: "mountains",
  }),
  At = B({
    id: 178,
    key: "grove",
    name: "Grove",
    category: "forest",
    temperature: -0.2,
    precipitation: "snow",
    depth: ye,
    rgb: [146, 178, 160],
    dimension: y.Overworld,
    displayCategory: "woodlands",
  }),
  xt = B({
    id: 179,
    key: "snowy_slopes",
    name: "Snowy Slopes",
    category: "mountain",
    temperature: -0.3,
    precipitation: "snow",
    depth: ye,
    rgb: [218, 241, 241],
    dimension: y.Overworld,
    displayCategory: "mountains",
  }),
  Ot = B({
    id: 180,
    key: "frozen_peaks",
    name: "Frozen Peaks",
    category: "mountain",
    temperature: -0.7,
    precipitation: "snow",
    depth: ye,
    rgb: [234, 251, 251],
    dimension: y.Overworld,
    displayCategory: "mountains",
  }),
  zt = B({
    id: 181,
    key: "jagged_peaks",
    name: "Jagged Peaks",
    category: "mountain",
    temperature: -0.7,
    precipitation: "snow",
    depth: ye,
    rgb: [186, 188, 182],
    dimension: y.Overworld,
    displayCategory: "mountains",
  }),
  rn = B({
    id: 182,
    key: "stony_peaks",
    name: "Stony Peaks",
    category: "mountain",
    temperature: 1,
    precipitation: "rain",
    depth: ye,
    rgb: [209, 209, 209],
    dimension: y.Overworld,
    displayCategory: "mountains",
  }),
  _t = B({
    id: 183,
    key: "deep_dark",
    name: "Deep Dark",
    category: "none",
    temperature: 0.8,
    precipitation: "rain",
    depth: ye,
    rgb: [0, 0, 0],
    dimension: y.Overworld,
    displayCategory: "caves",
  }),
  or = B({
    id: 184,
    key: "mangrove_swamp",
    name: "Mangrove Swamp",
    category: "none",
    temperature: 0.8,
    precipitation: "rain",
    depth: ye,
    rgb: [36, 196, 142],
    dimension: y.Overworld,
    displayCategory: "swamps",
  }),
  yi = B({
    id: 185,
    key: "cherry_grove",
    name: "Cherry Grove",
    category: "mountain",
    temperature: 0.5,
    precipitation: Un,
    depth: ye,
    rgb: [247, 185, 220],
    dimension: y.Overworld,
    displayCategory: "woodlands",
  }),
  sr = B({
    id: 186,
    key: "pale_garden",
    name: "Pale Garden",
    category: "forest",
    temperature: 0.7,
    precipitation: Un,
    depth: ye,
    rgb: [108, 111, 150],
    dimension: y.Overworld,
    displayCategory: "woodlands",
  }),
  ar = B({
    id: 187,
    key: "sulfur_caves",
    name: "Sulfur Caves",
    category: "none",
    temperature: 0.8,
    precipitation: Un,
    depth: ye,
    rgb: [200, 200, 40],
    dimension: y.Overworld,
    displayCategory: "caves",
  }),
  wi = B({
    id: 188,
    key: "dappled_forest",
    name: "Dappled Forest",
    category: "forest",
    temperature: 0.6,
    precipitation: Un,
    depth: ye,
    rgb: [154, 63, 53],
    dimension: y.Overworld,
    displayCategory: "woodlands",
  });
function B(e) {
  return ((Le[e.id] = e), e.parent != null && (Cc[e.parent] = e.id), e);
}
function Ue(e) {
  return e >= 0 && e <= Le.length ? Le[e] : Ke;
}
function Wc(e) {
  return Gc(e) ? "caveDepth" : jc(e) ? "bottom" : "depth0";
}
function Gc(e) {
  return [ir.id, rr.id, ar.id].includes(e);
}
function jc(e) {
  return e === _t.id;
}
function de(e) {
  if (typeof e.seed == "string")
    throw new Error(
      "toRustWorld received a PlainWorld — call fromPlainWorld() first",
    );
  return new re(
    e.seed.low,
    e.seed.high,
    e.edition === _.Java ? 1 : 2,
    e.edition === _.Java ? e.javaVersion : e.bedrockVersion,
    e.config.biomeSize,
    !!e.config.largeBiomes,
  );
}
class Uc {
  provider;
  constructor(t) {
    const n = de(t);
    this.provider = new Mr(n);
  }
  getInts(t, n, r, i) {
    return this.provider.a(t, n, r, i);
  }
  getInts1(t, n, r, i) {
    return this.provider.b(t, n, r, i);
  }
  free() {
    this.provider.free();
  }
}
class Zc {
  provider;
  constructor(t) {
    const n = de(t);
    this.provider = new Ar(n);
  }
  getChunkBiome(t, n) {
    return this.provider.a(t, n);
  }
  getNoiseBiome(t, n) {
    return this.provider.b(t, n);
  }
  getBiomeArea(t, n, r, i, o) {
    return this.provider.c(t, n, r, i, o);
  }
  free() {
    this.provider.free();
  }
}
class oe {
  rng;
  constructor(t) {
    const n = typeof t == "number" ? V.fromInt(t) : t;
    this.rng = new Vr(n.low, n.high);
  }
  setSeed(t) {
    const n = typeof t == "number" ? V.fromInt(t) : t;
    this.rng.a(n.low, n.high);
  }
  nextInt(t) {
    return t == null ? this.rng.c() : this.rng.b(t);
  }
  nextIntRaw() {
    return this.rng.d();
  }
  nextIntRange(t, n) {
    return this.rng.e(t, n);
  }
  nextFloat() {
    return this.rng.f();
  }
  nextDouble() {
    return this.rng.g();
  }
  nextBoolean() {
    return this.rng.h();
  }
  free() {
    this.rng.free();
  }
}
const po = (e) => e.map((t) => [t.x, t.y, t.z, ve[t.dungeon_type]]);
class Jc {
  rustFinder;
  constructor(t) {
    this.rustFinder = new Rr(de(t));
  }
  find(t, n) {
    return po(this.rustFinder.a(t.provider, n.x, n.z, n.sizeX, n.sizeZ));
  }
  findLegacy(t) {
    return po(this.rustFinder.b(t.x, t.z, t.sizeX, t.sizeZ));
  }
  free() {
    this.rustFinder.free();
  }
}
class Se {
  rng;
  constructor(t = V.ZERO) {
    this.rng = new Fr(t.low, t.high);
  }
  setSeed(t) {
    this.rng.a(t.low, t.high);
  }
  getSeed() {
    const t = Array.from(this.rng.b());
    return V.fromBits(t[0], t[1]);
  }
  restoreSeed(t) {
    this.rng.c(t.low, t.high);
  }
  nextInt(t) {
    return t == null ? this.rng.f() : this.rng.e(t);
  }
  nextIntVoid(t) {
    if (t == null) {
      this.rng.k(1);
      return;
    }
    this.rng.e(t);
  }
  nextLong() {
    const t = Array.from(this.rng.g());
    return V.fromBits(t[0], t[1]);
  }
  nextLongVoid() {
    this.rng.g();
  }
  nextFloat() {
    return this.rng.h();
  }
  nextFloatVoid() {
    this.rng.h();
  }
  nextDouble() {
    return this.rng.i();
  }
  nextDoubleVoid() {
    this.rng.i();
  }
  nextBoolean() {
    return this.rng.j();
  }
  _next(t) {
    return this.rng.d(t);
  }
  _nextVoid() {
    this.rng.k(1);
  }
  consumeCount(t) {
    this.rng.k(t);
  }
  free() {
    this.rng.free();
  }
}
class Xc {
  chunkGen;
  constructor(t) {
    const n = de(t);
    this.chunkGen = new zr(n);
  }
  buildHeightmap(t, n) {
    return this.chunkGen.a(t, n);
  }
  free() {
    this.chunkGen.free();
  }
}
class jt {
  rng;
  constructor(t) {
    this.rng = t;
  }
  static fromLoHi(t, n) {
    return new jt(new mt(t.low, t.high, n.low, n.high));
  }
  static fromSeed(t) {
    return new jt(mt.a(t.low, t.high));
  }
  setSeed(t) {
    this.rng.b(t.low, t.high);
  }
  nextInt(t) {
    return this.rng.c(t);
  }
  nextLong() {
    const t = Array.from(this.rng.d());
    return V.fromBits(t[0], t[1]);
  }
  nextFloat() {
    return this.rng.e();
  }
  nextDouble() {
    return this.rng.f();
  }
  skipNextN(t) {
    return this.rng.g(t);
  }
  free() {
    this.rng.free();
  }
}
class $c {
  rustFinder;
  constructor(t) {
    this.rustFinder = new Hr(de(t));
  }
  find(t, n) {
    return this.rustFinder
      .a(n.provider, t.x, t.z, t.sizeX, t.sizeZ)
      .map((r) => ({
        min: r.min,
        max: r.max,
        reference: r.reference,
        count: r.count,
        type: r.vein_type === "COPPER" ? "copper" : "iron",
        oreCount: r.ore_count,
      }));
  }
  free() {
    this.rustFinder.free();
  }
}
const _o = 10,
  Kc = 1,
  Qc = ["biome", "barrel", "chest", "special"];
function qc(e, t) {
  let n = new Dr(de(e));
  return Object.assign(
    (r) => {
      if (!n) throw new Error("freed");
      const i = n.a(t.provider, r.x, r.z, r.sizeX, r.sizeZ),
        o = new Array(i.length / _o);
      for (let s = 0, a = 0; s < i.length; s += _o, a++)
        o[a] = {
          placementChunkX: i[s],
          placementChunkZ: i[s + 1],
          x: i[s + 2],
          y: i[s + 3],
          z: i[s + 4],
          hasSecretChest: (i[s + 5] & Kc) !== 0,
          campBiomeId: i[s + 6],
          campsiteKind: Qc[i[s + 7]],
          campsiteNumber: i[s + 8],
          tentNumber: i[s + 9],
        };
      return o;
    },
    {
      free() {
        (n?.free(), (n = void 0));
      },
    },
  );
}
const yo = 6,
  Yc = 1,
  el = 2,
  tl = ["standard", "desert", "jungle", "swamp", "mountain", "ocean", "nether"],
  nl = [
    "on_land_surface",
    "partly_buried",
    "on_ocean_floor",
    "in_mountain",
    "underground",
  ];
function wo(e, t) {
  let n = new Wr(de(e));
  return Object.assign(
    (r) => {
      if (!n) throw new Error("freed");
      const i = n.a(t.provider, r.x, r.z, r.sizeX, r.sizeZ),
        o = new Array(i.length / yo);
      for (let s = 0, a = 0; s < i.length; s += yo, a++) {
        const c = i[s],
          l = i[s + 2],
          u = tl[i[s + 3]],
          d = nl[i[s + 4]],
          f = i[s + 5];
        if (u === void 0 || d === void 0)
          throw new Error("ruined portal record out of sync with wasm");
        o[a] = {
          portal: {
            x: c,
            y: i[s + 1],
            z: l,
            variant: u,
            placement: d,
            giant: (f & Yc) !== 0,
            mirror: (f & el) !== 0,
            rotation: (f >> 2) & 3,
            template: (f >> 4) & 15,
          },
          placementChunkX: (c >> 4) + ((f >> 8) & 3) - 1,
          placementChunkZ: (l >> 4) + ((f >> 10) & 3) - 1,
        };
      }
      return o;
    },
    {
      free() {
        (n?.free(), (n = void 0));
      },
    },
  );
}
var Wt = ((e) => (
  (e[(e.Unset = 0)] = "Unset"),
  (e[(e.DefaultCaveStone = 254)] = "DefaultCaveStone"),
  (e[(e.Stone = 1)] = "Stone"),
  (e[(e.Water = 9)] = "Water"),
  (e[(e.Lava = 11)] = "Lava"),
  (e[(e.Chest = 54)] = "Chest"),
  (e[(e.Air = 255)] = "Air"),
  e
))(Wt || {});
Object.freeze(Wt);
const st = {
    caveDepth: 3,
    worldSurface: 1,
    oceanFloor: 2,
    bottom: 4,
    depth0: 5,
  },
  un = {
    fastApproximate: 1,
    enhanced: 3,
    enhancedNoCaves: 2,
    topmostAccurate: 4,
  };
class et {
  provider;
  static newOverworld(t) {
    const n = ie.a(de(t));
    return new et(n);
  }
  static newNether(t) {
    const n = ie.b(de(t));
    return new et(n);
  }
  constructor(t) {
    this.provider = t;
  }
  getNoiseBiome(t, n, r) {
    return this.provider.c(t, n, r);
  }
  getNoiseBiomeBlock(t, n, r) {
    return this.provider.d(t, n, r);
  }
  getNoiseBiomeAtHeightType(t, n, r) {
    return this.provider.e(t, n, st[r]);
  }
  getSurface(t, n, r, i) {
    return this.provider.f(t, n, st[r], un[i]);
  }
  getSurfaceBlock(t, n, r, i) {
    return this.provider.g(t, n, st[r], un[i]);
  }
  getSurfaceArea(t, n, r, i, o, s, a) {
    return this.provider.h(t, n, r, i, o, st[s], un[a]);
  }
  getNoiseBiomeArea(t, n, r, i, o, s, a) {
    return this.provider.i(t, n, r, i, o, s, a);
  }
  getNoiseBiomeAreaAtHeightType(t, n, r, i, o, s) {
    return this.provider.j(t, n, r, i, o, st[s]);
  }
  findSpawnPosition() {
    return Array.from(this.provider.k());
  }
  getPreliminarySurfaceLevel(t, n) {
    return Math.min(312, Math.max(-64, this.provider.l(t, n)));
  }
  getNoiseBlock(t, n, r, i) {
    return this.provider.m(t, n, r, i);
  }
  getNoiseBiomeYColumn(t, n, r) {
    return this.provider.n(t, n, r);
  }
  getNoiseBiomeAreaAtHeightTypeWithSurface(t, n, r, i, o, s, a, c) {
    const l = this.provider.o(t, n, r, i, o, st[s], st[a], un[c]),
      u = r * i;
    return { biomes: l.slice(0, u), heights: l.slice(u) };
  }
  free() {
    this.provider.free();
  }
}
function rl(e) {
  return e === 1 || e === 254;
}
function il(e, t, n, r, i, o, s) {
  const a = t >> 2,
    c = n >> 2,
    l = r >> 2,
    u = i >> 2;
  let d = null,
    f = 0;
  for (let m = -u; m <= u; m++)
    for (let h = -u; h <= u; h++) {
      const w = a + h,
        v = l + m,
        x = Ue(e.getNoiseBiome(w, c, v));
      o(x) &&
        ((d == null || s.nextInt(f + 1) === 0) && (d = [w << 2, n, v << 2]),
        (f += 1));
    }
  return d;
}
class bi {
  static getBiome(t, n, r) {
    return new bi(t).getBiomeAtChunk(n, r);
  }
  provider;
  constructor(t) {
    this.provider = new Zc(t);
  }
  getBiomeAtChunk(t, n) {
    return Ue(this.provider.getChunkBiome(t, n));
  }
  getNoiseBiome(t, n, r) {
    return this.provider.getNoiseBiome(t, r);
  }
  getBiomeArea(t, n, r, i, o) {
    return this.provider.getBiomeArea(t, n, r, i, o);
  }
  free() {
    this.provider.free();
  }
}
function _e(e, t, n, r, i) {
  const o = r ? e.seed.add(r) : e.seed;
  if (i === "java" || (e.edition === _.Java && i !== "bedrock")) {
    const s = new Se(o),
      a = V.fromInt(t).multiply(s.nextLong()),
      c = V.fromInt(n).multiply(s.nextLong());
    return (s.setSeed(a.xor(c).xor(o)), s);
  } else {
    const s = new oe(o),
      a = V.fromInt(t).multiply(s.nextInt()),
      c = V.fromInt(n).multiply(s.nextInt());
    return (s.setSeed(a.xor(c).xor(o)), s);
  }
}
let In;
try {
  In = new WebAssembly.Instance(
    new WebAssembly.Module(
      new Uint8Array([
        0, 97, 115, 109, 1, 0, 0, 0, 1, 13, 2, 96, 0, 1, 127, 96, 4, 127, 127,
        127, 127, 1, 127, 3, 7, 6, 0, 1, 1, 1, 1, 1, 6, 6, 1, 127, 1, 65, 0, 11,
        7, 50, 6, 3, 109, 117, 108, 0, 1, 5, 100, 105, 118, 95, 115, 0, 2, 5,
        100, 105, 118, 95, 117, 0, 3, 5, 114, 101, 109, 95, 115, 0, 4, 5, 114,
        101, 109, 95, 117, 0, 5, 8, 103, 101, 116, 95, 104, 105, 103, 104, 0, 0,
        10, 191, 1, 6, 4, 0, 35, 0, 11, 36, 1, 1, 126, 32, 0, 173, 32, 1, 173,
        66, 32, 134, 132, 32, 2, 173, 32, 3, 173, 66, 32, 134, 132, 126, 34, 4,
        66, 32, 135, 167, 36, 0, 32, 4, 167, 11, 36, 1, 1, 126, 32, 0, 173, 32,
        1, 173, 66, 32, 134, 132, 32, 2, 173, 32, 3, 173, 66, 32, 134, 132, 127,
        34, 4, 66, 32, 135, 167, 36, 0, 32, 4, 167, 11, 36, 1, 1, 126, 32, 0,
        173, 32, 1, 173, 66, 32, 134, 132, 32, 2, 173, 32, 3, 173, 66, 32, 134,
        132, 128, 34, 4, 66, 32, 135, 167, 36, 0, 32, 4, 167, 11, 36, 1, 1, 126,
        32, 0, 173, 32, 1, 173, 66, 32, 134, 132, 32, 2, 173, 32, 3, 173, 66,
        32, 134, 132, 129, 34, 4, 66, 32, 135, 167, 36, 0, 32, 4, 167, 11, 36,
        1, 1, 126, 32, 0, 173, 32, 1, 173, 66, 32, 134, 132, 32, 2, 173, 32, 3,
        173, 66, 32, 134, 132, 130, 34, 4, 66, 32, 135, 167, 36, 0, 32, 4, 167,
        11,
      ]),
    ),
    {},
  ).exports;
} catch {}
function bo(e) {
  ((e.low = -e.low & -1),
    (e.high = ~e.high),
    e.low === 0 && (e.high = (e.high + 1) & -1));
}
function En(e, t) {
  const n = e.high >>> 16,
    r = e.high & 65535,
    i = e.low >>> 16,
    o = e.low & 65535,
    s = t.high >>> 16,
    a = t.high & 65535,
    c = t.low >>> 16,
    l = t.low & 65535;
  let u = 0,
    d = 0,
    f = 0,
    m = 0;
  ((m += o + l),
    (f += m >>> 16),
    (m &= 65535),
    (f += i + c),
    (d += f >>> 16),
    (f &= 65535),
    (d += r + a),
    (u += d >>> 16),
    (d &= 65535),
    (u += n + s),
    (u &= 65535),
    (e.low = (f << 16) | m),
    (e.high = (u << 16) | d));
}
function vo(e, t) {
  if (e.isZero()) return;
  if (In) {
    ((e.low = In.mul(e.low, e.high, t.low, t.high)), (e.high = In.get_high()));
    return;
  }
  let n, r, i, o, s, a, c, l, u, d, f, m, h;
  if (e.low === 0 && e.high === -2147483648) {
    (t.low & 1) === 0 && (e.high = 0);
    return;
  } else if (t.low === 0 && t.high === -2147483648) {
    (e.low & 1) === 0 && (e.high = 0);
    return;
  } else
    ((h = !1),
      e.high < 0 && (bo(e), (h = !h)),
      t.high < 0 && ((t = t.negate()), (h = !h)),
      (n = e.low & 65535),
      (r = e.low >>> 16),
      (i = e.high & 65535),
      (o = e.high >>> 16),
      (s = t.low & 65535),
      (a = t.low >>> 16),
      (c = t.high & 65535),
      (l = t.high >>> 16),
      (u = d = f = m = 0),
      (u += n * s),
      (d += u >>> 16),
      (u &= 65535),
      (d += r * s),
      (f += d >>> 16),
      (d &= 65535),
      (d += n * a),
      (f += d >>> 16),
      (d &= 65535),
      (f += i * s),
      (m += f >>> 16),
      (f &= 65535),
      (f += r * a),
      (m += f >>> 16),
      (f &= 65535),
      (f += n * c),
      (m += f >>> 16),
      (f &= 65535),
      (m += o * s + i * a + r * c + n * l),
      (m &= 65535),
      (e.low = u | (d << 16)),
      (e.high = f | (m << 16)),
      h && bo(e));
}
const ol = V.fromString("341873128712"),
  sl = V.fromString("132897987541");
function Gs(e, t, n, r, i) {
  const o = V.fromNumber(t);
  vo(o, ol);
  const s = V.fromNumber(n);
  (vo(s, sl), En(o, s), En(o, e.seed), En(o, V.fromNumber(r)));
  let a = i;
  return (
    a == null && (a = e.edition === _.Bedrock ? "bedrock" : "java"),
    a === "bedrock" ? new oe(o) : new Se(o)
  );
}
function js(e, t, n) {
  const r = e.javaVersion >= p.V1_18 ? jt.fromSeed(e.seed) : new Se(e.seed),
    i = r.nextLong().or(V.ONE),
    o = r.nextLong().or(V.ONE);
  return (
    r.free(),
    V.fromNumber(t).multiply(i).add(V.fromNumber(n).multiply(o)).xor(e.seed)
  );
}
function Ln(e) {
  return e >= 0 ? Math.floor(e) : Math.ceil(e);
}
function al(e) {
  return (t, n, r, i) => {
    const o = (t - r) >> 2,
      s = (n - r) >> 2,
      a = (t + r) >> 2,
      c = (n + r) >> 2,
      l = a - o + 1,
      u = c - s + 1,
      d = e(o, s, l, u);
    for (let f = 0; f < l * u; ++f) {
      const m = Ue(d[f]);
      if (!i.includes(m)) return !1;
    }
    return !0;
  };
}
function cl(e, t, n, r, i, o) {
  const s = o.map((d) => d.id),
    a = (t - i) >> 2,
    c = (r - i) >> 2,
    l = (t + i) >> 2,
    u = (r + i) >> 2;
  for (let d = c; d <= u; d++)
    for (let f = a; f <= l; f++) {
      const m = e.getNoiseBiome(f, n >> 2, d);
      if (!s.includes(m)) return !1;
    }
  return !0;
}
class vi {
  constructor(t) {
    ((this.world = t), (this.provider = new Uc(t)));
  }
  provider;
  getBiomeGenAt(t, n, r, i) {
    this.assertBedrockOrJava115OrLess();
    const o = [],
      s = this.provider.getInts1(t, n, r, i);
    for (let a = 0; a < r * i; ++a) o[a] = Ue(s[a]);
    return o;
  }
  getInts(t, n, r, i) {
    return this.provider.getInts(t, n, r, i);
  }
  getInts1(t, n, r, i) {
    return (
      this.assertBedrockOrJava115OrLess(),
      this.provider.getInts1(t, n, r, i)
    );
  }
  findBiomePosition(t, n, r, i, o) {
    const s = (t - r) >> 2,
      a = (n - r) >> 2,
      c = (t + r) >> 2,
      l = (n + r) >> 2,
      u = c - s + 1,
      d = l - a + 1,
      f = this.provider.getInts(s, a, u, d);
    let m = null,
      h = 0;
    for (let w = 0; w < u * d; ++w) {
      const v = (s + (w % u)) << 2,
        x = (a + Ln(w / u)) << 2,
        C = Ue(f[w]);
      if (!i.includes(C)) continue;
      let E = m == null;
      (E || (E = o.nextInt(h + 1) === 0),
        E && (m = [v, 0, x]),
        (E ||
          this.world.edition === _.Bedrock ||
          this.world.javaVersion >= p.V1_13) &&
          ++h);
    }
    return m;
  }
  assertJava116Plus() {
    if (this.world.edition !== _.Java || this.world.javaVersion < p.V1_16)
      throw new Error("method is only meant to be used with Java 1.16+");
  }
  assertBedrockOrJava115OrLess() {
    if (this.world.edition === _.Java && this.world.javaVersion >= p.V1_16)
      throw new Error("method should not be used with Java 1.16+");
  }
  getNoiseBiome(t, n) {
    return (this.assertJava116Plus(), Ue(this.provider.getInts(t, n, 1, 1)[0]));
  }
  getBiomeForStructure(t, n) {
    return this.world.edition === _.Bedrock || this.world.javaVersion < p.V1_13
      ? this.getBiomeGenAt(t * 16 + 8, n * 16 + 8, 1, 1)[0]
      : this.world.javaVersion < p.V1_16
        ? this.getBiomeGenAt(t * 16 + 9, n * 16 + 9, 1, 1)[0]
        : this.getNoiseBiome((t << 2) + 2, (n << 2) + 2);
  }
  _getBiomeArea(t, n, r, i, o) {
    const s = r - t + 1,
      a = i - n + 1,
      c = o(t, n, s, a);
    return (l, u) => {
      if (l < t || l > r || u < n || u > i)
        throw new Error("biome access out of bounds");
      const d = l - t,
        f = u - n,
        m = d + f * s;
      return Ue(c[m]);
    };
  }
  getNoiseBiomeArea(t, n, r, i) {
    return this._getBiomeArea(
      t,
      n,
      r,
      i,
      this.provider.getInts.bind(this.provider),
    );
  }
  getBiomeArea(t, n, r, i) {
    return (
      this.assertBedrockOrJava115OrLess(),
      this._getBiomeArea(t, n, r, i, this.provider.getInts1.bind(this.provider))
    );
  }
  areBiomesViable = al((...t) => this.provider.getInts(...t));
  free() {
    this.provider.free();
  }
}
function cr(e) {
  return (
    (e.edition === _.Java && e.javaVersion >= p.V1_18) ||
    (e.edition === _.Bedrock && e.bedrockVersion >= S.V1_18)
  );
}
function Us(e) {
  return (
    (e.edition === _.Java && e.javaVersion >= p.V1_16) ||
    (e.edition === _.Bedrock && e.bedrockVersion >= S.V1_16)
  );
}
class Zs {
  biomeId;
  constructor(t) {
    this.biomeId = t;
  }
  getBiome() {
    return this.biomeId;
  }
  free() {}
}
const ll = (e) => {
    if (cr(e)) {
      const t = Object.assign(et.newOverworld(e), {
        legacy: () => {
          throw new Error("Wrong biome provider");
        },
        noise: () => t,
      });
      return t;
    } else {
      const t = Object.assign(new vi(e), {
        legacy: () => t,
        noise: () => {
          throw new Error("Wrong biome provider");
        },
      });
      return t;
    }
  },
  ul = (e) => {
    if (Us(e)) {
      const t = Object.assign(et.newNether(e), {
        legacy: () => {
          throw new Error("Wrong biome provider");
        },
        noise: () => t,
      });
      return t;
    } else {
      const t = Object.assign(new Zs(mi.id), {
        legacy: () => t,
        noise: () => {
          throw new Error("Wrong biome provider");
        },
      });
      return t;
    }
  };
Le.filter((e) => e.dimension === y.Overworld).map((e) => e.id);
const Js = [vt.id, nr.id, Jn.id],
  fl = [De.id, Ye.id, He.id, qe.id],
  dl = [...fl, Ne.id, Ke.id, pt.id, ht.id, Qe.id],
  ml = [ft.id, Ze.id],
  gl = [di.id, $t.id];
(we.id, Re.id, Mt.id, nn.id);
(Xt.id, hi.id, Xn.id, tr.id, ot.id, At.id, sr.id, wi.id);
const Xs = [Qn.id, _i.id, qn.id];
(Jt.id, Kt.id, Yn.id);
(St.id, Ot.id, zt.id, rn.id, xt.id);
const $s = [Me.id, Kn.id, pi.id],
  Ks = [mi.id, Hs.id, Ds.id, Ws.id, Dc.id],
  Qs = [Tc.id, qt.id, Ps.id, Ec.id, kc.id];
[
  Ve.id,
  er.id,
  Ot.id,
  zt.id,
  xt.id,
  Ne.id,
  De.id,
  At.id,
  _t.id,
  $t.id,
  Re.id,
  Ze.id,
  ...Qs,
];
[Y.id, Qe.id, ...Js, ...$s, ...Ks, ...Xs, or.id];
[
  Ve.id,
  er.id,
  Ot.id,
  zt.id,
  xt.id,
  Ne.id,
  De.id,
  At.id,
  _t.id,
  $t.id,
  Re.id,
  Ze.id,
  ...Qs,
  pt.id,
  Ye.id,
  Mt.id,
  nn.id,
  we.id,
  Kt.id,
  Yn.id,
  Jt.id,
  rn.id,
  wi.id,
];
[Y.id, Qe.id, ...Js, ...$s, ...Ks, ...Xs, or.id, qe.id, ht.id];
Le.filter((e) => e.displayCategory === "legacy").map((e) => e.id);
const Ur = { IS_OCEAN: dl, IS_BEACH: ml, IS_RIVER: gl };
function hl(e, t, n) {
  return new oe(pl(e, t, n));
}
function pl(e, t, n) {
  return lr(e)(t, n);
}
function lr(e) {
  const t = new oe(e.seed),
    r = t.nextInt() | 1,
    o = t.nextInt() | 1;
  t.free();
  const s = e.seed.toInt();
  return function (a, c) {
    return s ^ (Math.imul(o, c) + Math.imul(r, a));
  };
}
const Je = Ue,
  Zr = (e, t, n) => Math.min(n, Math.max(t, e));
function Jr(e) {
  return e.edition === _.Java
    ? [
        "java",
        e.seed.toString(),
        e.javaVersion,
        e.config.flat ?? !1,
        e.config.biomeSize ?? null,
        e.config.largeBiomes ?? !1,
      ].join("//")
    : [
        "bedrock",
        e.seed.toString(),
        e.bedrockVersion,
        e.config.flat ?? !1,
        e.config.biomeSize ?? null,
        e.config.largeBiomes ?? !1,
      ].join("//");
}
function Rt(e) {
  return { ...e, seed: V.fromString(e.seed) };
}
const _l = [208, 227, 240];
function yl(e, t, n) {
  let r = "",
    i,
    o = !1;
  return (s) => {
    const a = n(s);
    return ((o && a === r) || ((r = a), o && t(i), (i = e(s)), (o = !0)), i);
  };
}
function Be(e, { x: t, z: n }) {
  return t >= e.x && t < e.x + e.sizeX && n >= e.z && n < e.z + e.sizeZ;
}
function tt(e, t = {}) {
  const { x0: n = 0, x1: r = 0, z0: i = 0, z1: o = 0 } = t;
  return {
    x: e.x + n,
    z: e.z + i,
    sizeX: e.sizeX - n + r,
    sizeZ: e.sizeZ - i + o,
  };
}
function Si(e, t) {
  const n = So({ x: e.x, z: e.z }, t),
    r = So({ x: e.x + e.sizeX - 1, z: e.z + e.sizeZ - 1 }, t);
  return { x: n.x, z: n.z, sizeX: r.x - n.x + 1, sizeZ: r.z - n.z + 1 };
}
function So(e, t) {
  return { x: Math.floor(e.x / t), z: Math.floor(e.z / t) };
}
function ue(e, t) {
  for (let n = e.z; n < e.z + e.sizeZ; n++)
    for (let r = e.x; r < e.x + e.sizeX; r++) t(r, n);
}
async function qs(e, t) {
  for (let n = e.z; n < e.z + e.sizeZ; n++)
    for (let r = e.x; r < e.x + e.sizeX; r++) await t(r, n);
}
function Ys(e, t) {
  const n = [];
  return (
    ue(e, (r, i) => {
      t(r, i) && n.push([r, i]);
    }),
    n
  );
}
function wl(e, t) {
  const n = [];
  return (
    ue(e, (r, i) => {
      n.push(...t(r, i));
    }),
    n
  );
}
function bl(e, t) {
  return `${e},${t}`;
}
function vl(e) {
  return e.split(",").map((t) => parseInt(t, 10));
}
function Xe(e, t) {
  const n = e.reduce((r, i) => {
    const [o, s] = t(i),
      a = bl(o, s);
    return (r[a] || (r[a] = []), r[a].push(i), r);
  }, {});
  return Object.entries(n).map(([r, i]) => {
    const [o, s] = vl(r);
    return [o, s, i];
  });
}
function ea(e, t, n) {
  const r = e.filter((i) => {
    const o = n(i);
    return Be(t, { x: o[0], z: o[1] });
  });
  return Xe(r, n);
}
function Sl(e, t, n, r) {
  const i = Math.floor(t / r.spacing),
    o = Math.floor(n / r.spacing),
    { rng: s, chunkX: a, chunkZ: c } = ta(e, i, o, r);
  return { rng: s, isFeatureChunk: a === t && c === n };
}
function ta(e, t, n, r) {
  const i = Gs(e, t, n, r.salt, r.forceRngType);
  let o, s;
  r.linearSeparation
    ? ((o = i.nextInt(r.spacing - r.separation)),
      (s = i.nextInt(r.spacing - r.separation)))
    : ((o = Ln(
        (i.nextInt(r.spacing - r.separation) +
          i.nextInt(r.spacing - r.separation)) /
          2,
      )),
      (s = Ln(
        (i.nextInt(r.spacing - r.separation) +
          i.nextInt(r.spacing - r.separation)) /
          2,
      )));
  const a = t * r.spacing + o,
    c = n * r.spacing + s;
  return { chunkX: a, chunkZ: c, rng: i };
}
function q(e, t, n, r, i, o, s) {
  return async (a) => {
    const c = [],
      l = i ? tt(a, i) : a,
      u = Si(l, t.spacing);
    if (
      (await qs(u, async (m, h) => {
        const { chunkX: w, chunkZ: v, rng: x } = ta(e, m, h, t);
        try {
          if (!Be(l, { x: w, z: v })) return;
          const C = await n(w, v, x);
          if (!C) return;
          r ? c.push([w, v, r(w, v, x, C)]) : c.push([w, v]);
        } finally {
          x.free();
        }
      }),
      !o)
    )
      return c;
    const d = c.map((m) => m[2]).filter(Boolean),
      f = Xe(d, o).filter((m) => Be(a, { x: m[0], z: m[1] }));
    return s ? f.map((m) => [m[0], m[1], m[2][0]]) : f;
  };
}
async function xl(e, t, n) {
  return (await q(e, t, async () => !0)(n)).length > 0;
}
const Cl = {
  [g.AmethystGeode]: {
    [_.Java]: [p.V1_17, p.V26_3],
    [_.Bedrock]: [S.V1_17, S.V26_50],
  },
  [g.AncientCity]: {
    [_.Java]: [p.V1_19, p.V26_3],
    [_.Bedrock]: [S.V1_19, S.V26_50],
  },
  [g.BastionRemnant]: {
    [_.Java]: [p.V1_16, p.V26_3],
    [_.Bedrock]: [S.V1_16, S.V26_50],
  },
  [g.BuriedTreasure]: {
    [_.Java]: [p.V1_13, p.V26_3],
    [_.Bedrock]: [S.V1_14, S.V26_50],
  },
  [g.Cave]: { [_.Java]: [p.V1_18, p.V26_3], [_.Bedrock]: [S.V1_18, S.V26_50] },
  [g.DesertWell]: {
    [_.Java]: [p.V1_18, p.V26_3],
    [_.Bedrock]: [S.V1_18, S.V26_50],
  },
  [g.Dungeon]: {
    [_.Java]: [p.V1_13, p.V26_3],
    [_.Bedrock]: [S.V1_16, S.V26_50],
  },
  [g.EndCity]: {
    [_.Java]: [p.V1_13, p.V26_3],
    [_.Bedrock]: [S.V1_14, S.V26_50],
  },
  [g.EndGateway]: {
    [_.Java]: [p.V1_16, p.V26_3],
    [_.Bedrock]: [S.V1_16, S.V26_50],
  },
  [g.Fossil]: {
    [_.Java]: [p.V1_16, p.V26_3],
    [_.Bedrock]: [S.V1_16, S.V26_50],
  },
  [g.FossilNether]: {
    [_.Java]: [p.V1_16, p.V26_3],
    [_.Bedrock]: [S.V1_16, S.V26_50],
  },
  [g.ItemOverworld]: {
    [_.Java]: [p.V1_18, p.V26_3],
    [_.Bedrock]: [S.V1_18, S.V26_50],
  },
  [g.LavaPool]: {
    [_.Java]: [p.V1_18, p.V26_3],
    [_.Bedrock]: [S.V1_18, S.V26_50],
  },
  [g.Mineshaft]: {
    [_.Java]: [p.V1_7, p.V26_3],
    [_.Bedrock]: [S.V1_14, S.V26_50],
  },
  [g.NetherFortress]: {
    [_.Java]: [p.V1_7, p.V26_3],
    [_.Bedrock]: [S.V1_14, S.V26_50],
  },
  [g.OceanMonument]: {
    [_.Java]: [p.V1_8, p.V26_3],
    [_.Bedrock]: [S.V1_14, S.V26_50],
  },
  [g.OceanRuin]: {
    [_.Java]: [p.V1_16, p.V26_3],
    [_.Bedrock]: [S.V1_16, S.V26_50],
  },
  [g.OreVein]: {
    [_.Java]: [p.V1_18, p.V26_3],
    [_.Bedrock]: [S.V1_18, S.V26_50],
  },
  [g.PillagerOutpost]: {
    [_.Java]: [p.V1_14, p.V26_3],
    [_.Bedrock]: [S.V1_14, S.V26_50],
  },
  [g.Ravine]: {
    [_.Java]: [p.V1_16, p.V26_3],
    [_.Bedrock]: [S.V1_16, S.V26_50],
  },
  [g.RuinedPortalOverworld]: {
    [_.Java]: [p.V1_16, p.V26_3],
    [_.Bedrock]: [S.V1_16, S.V26_50],
  },
  [g.RuinedPortalNether]: {
    [_.Java]: [p.V1_16, p.V26_3],
    [_.Bedrock]: [S.V1_16, S.V26_50],
  },
  [g.DesertTemple]: {
    [_.Java]: [p.V1_7, p.V26_3],
    [_.Bedrock]: [S.V1_14, S.V26_50],
  },
  [g.JungleTemple]: {
    [_.Java]: [p.V1_7, p.V26_3],
    [_.Bedrock]: [S.V1_14, S.V26_50],
  },
  [g.WitchHut]: {
    [_.Java]: [p.V1_7, p.V26_3],
    [_.Bedrock]: [S.V1_14, S.V26_50],
  },
  [g.Igloo]: { [_.Java]: [p.V1_9, p.V26_3], [_.Bedrock]: [S.V1_14, S.V26_50] },
  [g.Shipwreck]: {
    [_.Java]: [p.V1_13, p.V26_3],
    [_.Bedrock]: [S.V1_14, S.V26_50],
  },
  [g.SlimeChunk]: {
    [_.Java]: [p.V1_7, p.V26_3],
    [_.Bedrock]: [S.V1_14, S.V26_50],
  },
  [g.Spawn]: { [_.Java]: [p.V1_7, p.V26_3], [_.Bedrock]: [S.V1_14, S.V26_50] },
  [g.Stronghold]: {
    [_.Java]: [p.V1_7, p.V26_3],
    [_.Bedrock]: [S.V1_14, S.V26_50],
  },
  [g.TrailRuin]: {
    [_.Java]: [p.V1_20, p.V26_3],
    [_.Bedrock]: [S.V1_20, S.V26_50],
  },
  [g.TrialChamber]: {
    [_.Java]: [p.V1_21, p.V26_3],
    [_.Bedrock]: [S.V1_21, S.V26_50],
  },
  [g.Village]: {
    [_.Java]: [p.V1_7, p.V26_3],
    [_.Bedrock]: [S.V1_14, S.V26_50],
  },
  [g.WoodlandMansion]: {
    [_.Java]: [p.V1_11, p.V26_3],
    [_.Bedrock]: [S.V1_14, S.V26_50],
  },
  [g.AbandonedCamp]: {
    [_.Java]: [p.V26_3, p.V26_3],
    [_.Bedrock]: [S.V26_50, S.V26_50],
  },
};
function W(e, t) {
  const n = Cl[e][t.edition];
  if (!n) return !1;
  const r = t.edition === _.Java ? t.javaVersion : t.bedrockVersion;
  return r >= n[0] && r <= n[1];
}
const xi = [
  (e, t, n) => [e, t, n],
  (e, t, n) => [-n, t, e],
  (e, t, n) => [-e, t, -n],
  (e, t, n) => [n, t, -e],
];
function na(e, t, n, r, i) {
  const { rotatedSize: o, offset: s } = ra(r, n, i),
    a = Xr(e, o[0], s[0]),
    c = Xr(t, o[2], s[2]);
  return { x: a, z: c, rotatedSize: o };
}
function ra(e, t, n) {
  const r = xi[t],
    i = r(e[0] - 1, e[1] - 1, e[2] - 1);
  let o = [0, 0, 0];
  if (n) {
    const s = r(n[0], 0, n[1]);
    o = [-s[0], 0, -s[2]];
  }
  return { rotatedSize: i, offset: o };
}
function Xr(e, t, n) {
  return (n + (e * 32 + t) / 2) | 0;
}
function xo(e, t) {
  const n = Math.floor(-(e + 2 * t) / 32);
  let r = 1 / 0,
    i = -1 / 0;
  for (let o = n - 1; o <= n + 1; o++) {
    const s = (Xr(o, e, t) >> 4) - o;
    ((r = Math.min(r, s)), (i = Math.max(i, s)));
  }
  return [r, i];
}
function Tl(e, t) {
  let n = 1 / 0,
    r = -1 / 0,
    i = 1 / 0,
    o = -1 / 0;
  for (const [, s, a] of e)
    if (!(s <= 0))
      for (let c = 0; c < xi.length; c++) {
        const { rotatedSize: l, offset: u } = ra(a, c, t),
          [d, f] = xo(l[0], u[0]),
          [m, h] = xo(l[2], u[2]);
        ((n = Math.min(n, d)),
          (r = Math.max(r, f)),
          (i = Math.min(i, m)),
          (o = Math.max(o, h)));
      }
  if (!Number.isFinite(n)) throw new Error("Unable to find structure");
  return { x0: 0 - r, x1: 0 - n, z0: 0 - o, z1: 0 - i };
}
const ia = (e, t) => {
  const n = e.reduce((i, o) => i + o[1], 0);
  let r = t.nextInt(n);
  for (const i of e) if (((r -= i[1]), r < 0)) return i;
  throw new Error("Unable to find structure");
};
function Ft({
  world: e,
  biomeProvider: t,
  chunkX: n,
  chunkZ: r,
  initialY: i,
  projectionY: o,
  allowedBiomes: s,
  structures: a,
  namedStartPos: c,
  mapResult: l,
}) {
  const u = _e(e, n, r, void 0, "java");
  try {
    let d = typeof i == "number" ? i : i({ rng: u });
    const f = u.nextInt(xi.length),
      m = ia(a, u),
      [h, , w] = m,
      v = a.indexOf(m);
    if (c && o) throw new Error("not supported");
    const { x, z: C, rotatedSize: E } = na(n, r, f, w, c);
    o &&
      (d = d + t.getSurfaceBlock(x, C, o.heightType, o.surfaceCheckType) + 1);
    let k,
      M = null;
    s === "all"
      ? (k = !0)
      : ((M = Je(t.getNoiseBiome(x >> 2, d >> 2, C >> 2))),
        typeof s == "function" ? (k = s(M)) : (k = s.includes(M)));
    const I = (d - 1 + E[1] / 2) | 0;
    if (!k) return !1;
    const A = { key: h, x, y: I, z: C, yBase: d };
    return l ? l(A, { rng: u, biome: M, structureIndex: v }) : A;
  } finally {
    u.free();
  }
}
const Bl = (e) => (t, n) => {
    const r = e.reduce((i, o) => i + o.weight, 0);
    return (i, o) => {
      const s = _e(t, i, o);
      try {
        let a = [...e],
          c = r;
        for (; a.length > 0;) {
          let l = s.nextInt(c),
            u = a[0];
          for (const f of a)
            if (((l -= f.weight), l < 0)) {
              u = f;
              break;
            }
          const d = u.canGenerate(i, o);
          if (d) return u.poi === n ? d : !1;
          ((c -= u.weight), (a = a.filter((f) => f !== u)));
        }
        return !1;
      } finally {
        s.free();
      }
    };
  },
  oa = (e, t, n) =>
    Bl([
      { poi: g.NetherFortress, weight: 2, canGenerate: () => !0 },
      {
        poi: g.BastionRemnant,
        weight: 3,
        canGenerate: (r, i) => Vl(e, t[y.Nether], r, i),
      },
    ])(e, n),
  Il = { supportsWorld: (e) => W(g.BastionRemnant, e), create: Ml },
  $r = [Ds, mi, Hs, Ws],
  Gt = [
    ["units", 1, [46, 24, 46]],
    ["hoglin_stable", 1, [30, 24, 48]],
    ["treasure", 1, [38, 48, 38]],
    ["bridge", 1, [16, 32, 32]],
  ],
  sa = 33,
  El = Tl(Gt);
function kl(e) {
  return {
    spacing: e === _.Bedrock ? 30 : 27,
    separation: 4,
    salt: 30084232,
    linearSeparation: !0,
  };
}
function Co(e, t, n, r) {
  if (e.edition === _.Java && e.javaVersion >= p.V1_18) {
    const i = _e(e, t, n),
      o = i.nextInt(5) >= 2;
    return (i.free(), o);
  } else {
    const i = e.edition === _.Bedrock ? 6 : 5;
    return r.nextInt(i) >= 2;
  }
}
function aa(e, t, n, r, i) {
  return { type: e, x: t, y: sa, z: n, placementChunkX: r, placementChunkZ: i };
}
function To(e, t, n, [r, , i]) {
  const { x: o, z: s } = na(e, t, n, i);
  return aa(r, o, s, e, t);
}
function Vl(e, t, n, r) {
  return Ft({
    world: e,
    biomeProvider: t.noise(),
    chunkX: n,
    chunkZ: r,
    initialY: sa,
    projectionY: null,
    allowedBiomes: $r,
    structures: Gt,
    mapResult: (i) => aa(i.key, i.x, i.z, n, r),
  });
}
async function Ml(e, t) {
  const n = t.nether.noise(),
    r = oa(e, t, g.BastionRemnant);
  return q(
    e,
    kl(e.edition),
    async (i, o, s) => {
      if (e.edition === _.Java) {
        if (e.javaVersion >= p.V1_18) return r(i, o);
        {
          if (
            !Co(e, i, o, s) ||
            !$r.includes(Je(n.getNoiseBiome(i * 4 + 2, 0, o * 4 + 2)))
          )
            return !1;
          const a = _e(e, i, o),
            c = a.nextInt(4),
            l = a.nextInt(4);
          return (a.free(), To(i, o, c, Gt[l]));
        }
      } else {
        if (!Co(e, i, o, s)) return !1;
        const a = e.bedrockVersion >= S.V1_18 ? 0 : 8;
        if (!cl(n, i * 16 + a, 0, o * 16 + a, 2, $r)) return !1;
        const c = s.nextInt(4),
          l = Gt.length - 1 - s.nextInt(4);
        return To(i, o, c, Gt[l]);
      }
    },
    (i, o, s, a) => a,
    El,
    (i) => [i.x >> 4, i.z >> 4],
    !0,
  );
}
const yt = (e, t, n, r) =>
    Je(e.getNoiseBiomeAtHeightType(t * 4 + 2, n * 4 + 2, r)),
  ur = (e, t, n, r) => Je(e.getNoiseBiomeBlock(t, n, r)),
  dt = (e, t, n, r, i, o) => !!Ci(e, t, n, r, i, o),
  Ci = (e, t, n, r, i, o) => {
    const s = o.map((k) => k.id),
      a = t - i,
      c = n - i,
      l = r - i,
      u = t + i,
      d = n + i,
      f = r + i;
    let m;
    const h = Math.floor((u - a + 4) / 4),
      w = a + Math.floor(h / 2) * 4,
      v = Math.floor((d - c + 4) / 4),
      x = c + Math.floor(v / 2) * 4,
      C = Math.floor((f - l + 4) / 4),
      E = l + Math.floor(C / 2) * 4;
    for (let k = c; k <= d; k += 4)
      for (let M = a; M <= u; M += 4)
        for (let I = l; I <= f; I += 4) {
          const A = e.getNoiseBiomeBlock(M, k, I);
          if (!s.includes(A)) return !1;
          M === w && k === x && I === E && (m = Je(A));
        }
    return m ?? Je(e.getNoiseBiomeBlock(t, n, r));
  },
  Al = (e, t, n, r, i) =>
    [
      [t, n],
      [t + r, n],
      [t, n + i],
      [t + r, n + i],
    ].map((o) =>
      e.getSurfaceBlock(o[0], o[1], "worldSurface", "topmostAccurate"),
    ),
  Bo = (e, t, n, r, i) => {
    const o = Al(e, t * 16, n * 16, r, i);
    return Math.min(...o);
  },
  ca = { supportsWorld: (e) => W(g.BuriedTreasure, e), create: Ol };
async function Ol(e, t) {
  return e.edition === _.Java ? Fl(e, t.overworld) : Rl(e, t.overworld);
}
const Io = [ft, Ze, As, Zn],
  zl = [ft, Ze];
function Rl(e, t) {
  return q(
    e,
    { salt: 16842397, spacing: 4, separation: 2, linearSeparation: !1 },
    async (n, r) => {
      if (e.bedrockVersion >= S.V1_18) {
        const i = t.noise(),
          o = i.getPreliminarySurfaceLevel(n * 4, r * 4);
        return dt(i, n * 16 + 8, o, r * 16 + 8, 3, Io);
      } else return t.legacy().areBiomesViable(n * 16 + 8, r * 16 + 8, 3, Io);
    },
  );
}
function Fl(e, t) {
  return async (n) => {
    const r = [];
    return (
      ue(n, (i, o) => {
        const s = Gs(e, i, o, 10387320);
        if (s.nextFloat() >= 0.01) {
          s.free();
          return;
        }
        const a =
          e.javaVersion >= p.V1_18
            ? yt(t.noise(), i, o, "oceanFloor")
            : t.legacy().getBiomeForStructure(i, o);
        (zl.includes(a) && r.push([i, o]), s.free());
      }),
      r
    );
  };
}
const Ti = (e, t) => async (n) => {
  if (n.sizeX <= t && n.sizeZ <= t) return e(n);
  const r = Si(n, t),
    i = [];
  return (
    await qs(r, async (o, s) => {
      const a = await e({ x: o * t, z: s * t, sizeX: t, sizeZ: t });
      i.push(...a);
    }),
    i.filter((o) => Be(n, { x: o[0], z: o[1] }))
  );
};
function la(e) {
  return async (t) => async (n) => Ys(n, (r, i) => e(t, r, i));
}
const Bi = { supportsWorld: (e) => W(g.Mineshaft, e), create: la(Pl) };
function Pl(e, t, n) {
  return e.edition === _.Bedrock ? Nl(e, t, n) : Ll(e, t, n);
}
function Ll(e, t, n) {
  const r = _e(e, t, n);
  try {
    if ((e.javaVersion < p.V1_13 && r.nextIntVoid(), r.nextDouble() >= 0.004))
      return !1;
    if (e.javaVersion >= p.V1_13) return !0;
    const i = Math.max(Math.abs(t), Math.abs(n));
    return i >= 80 ? !0 : r.nextInt(80) < i;
  } finally {
    r.free();
  }
}
function Nl(e, t, n) {
  const r = _e(e, t, n);
  if ((r.nextInt(), r.nextFloat() >= 0.004)) return (r.free(), !1);
  const o = r.nextInt(80) < Math.max(Math.abs(t), Math.abs(n));
  return (r.free(), o);
}
const fr = (e, t, n) => e.nextInt(n - t + 1) + t,
  Kr = (e, t, n) => fr(e, t, n - 1),
  Hl = (e, t, n, r) => {
    const i = n - t,
      o = (i - r) / 2,
      s = i - o;
    return t + e.nextFloat() * s + e.nextFloat() * o;
  },
  Dl = (e, t) =>
    e === _t ? !1 : t.edition === _.Java ? !0 : e !== ar && e !== wi,
  Wl = [
    ["end_1", 1, [19, 20, 19]],
    ["end_2", 1, [19, 20, 19]],
  ],
  Qr = {
    supportsWorld: (e) => W(g.TrialChamber, e),
    async create(e, t) {
      return q(
        e,
        {
          spacing: 34,
          separation: 12,
          linearSeparation: !0,
          salt: 94251327,
          forceRngType: "java",
        },
        async (n, r) =>
          Ft({
            world: e,
            biomeProvider: t.overworld.noise(),
            chunkX: n,
            chunkZ: r,
            initialY: ({ rng: i }) => fr(i, -40, -20),
            projectionY: null,
            allowedBiomes: (i) => Dl(i, e),
            structures: Wl,
          }),
        (n, r, i, o) => [o.x, o.y, o.z],
        { x0: 0, z0: 0, x1: 1, z1: 1 },
        (n) => [n[0] >> 4, n[2] >> 4],
        !0,
      );
    },
  },
  Gl = {
    supportsWorld: (e) => W(g.Dungeon, e),
    create: async (e, t, n) => {
      const r = new Jc(e),
        o = cr(e) ? t.overworld.noise() : void 0,
        s = e.edition === _.Bedrock ? [await Jl(e, t, n)] : [],
        a = Ti(async (l) => {
          const u = o ? r.find(o, l) : r.findLegacy(l);
          return Xe(u, (d) => [d[0] >> 4, d[2] >> 4]);
        }, 16),
        c = async (l) => {
          let u = await a(l);
          for (const d of s) u = await d(l, u);
          return u;
        };
      return (
        (c.free = () => {
          (s.forEach((l) => l.free?.()), r.free());
        }),
        c
      );
    },
  },
  jl = 6,
  Ul = 2.5,
  Zl = 20,
  Jl = async (e, t, n) => {
    const r = [],
      i = cr(e);
    (i || r.push({ findStructures: await Bi.create(e), minDist: jl }),
      i &&
        Qr.supportsWorld(e) &&
        r.push({
          findStructures: await Qr.create(e, t, n),
          minDist: Ul,
          yRange: (s, a) => s - a >= -25 && s - a <= Zl,
        }));
    const o = async (s, a) => {
      for (const { findStructures: c, minDist: l, yRange: u } of r) {
        const d = Math.ceil(l) + 1,
          f = await c(tt(s, { x0: -d, z0: -d, x1: d, z1: d }));
        f.length !== 0 &&
          (a = a.filter(
            (m) => (
              (m[2] = m[2].filter((h) => {
                const w = (h[0] - 8) >> 4,
                  v = (h[2] - 8) >> 4;
                return !f.some((x) => {
                  if (Math.hypot(w - x[0], v - x[1]) >= l) return !1;
                  if (!u) return !0;
                  const C = x[2][1];
                  return u(h[1], C);
                });
              })),
              m[2].length > 0
            ),
          ));
      }
      return a;
    };
    return (
      (o.free = () => {
        r.forEach((s) => s.findStructures.free?.());
      }),
      o
    );
  };
class Xl {
  finder;
  constructor(t) {
    this.finder = new Gr(de(t));
  }
  hasShip(t, n) {
    if (!this.finder) throw new Error("freed");
    return this.finder.a(t, n);
  }
  free() {
    (this.finder?.free(), (this.finder = void 0));
  }
}
class ua {
  chunkGen;
  constructor(t) {
    this.chunkGen = new Xc(t);
  }
  buildHeightmap(t, n) {
    return this.chunkGen.buildHeightmap(t, n);
  }
  free() {
    this.chunkGen.free();
  }
}
const $l = {
  supportsWorld: (e) => W(g.EndCity, e),
  create: async (e, t) => {
    const n = t.end,
      r = new ua(e);
    let i;
    try {
      i = new Xl(e);
    } catch (s) {
      throw (r.free(), s);
    }
    const o = q(
      e,
      { spacing: 20, separation: 11, salt: 10387313, linearSeparation: !1 },
      async (s, a) => Kl(e, r, n, s, a),
      (s, a) => ({ hasShip: i.hasShip(s, a) }),
    );
    return (
      (o.free = () => {
        (r.free(), i.free());
      }),
      o
    );
  },
};
function Kl(e, t, n, r, i) {
  const o = n.getBiomeAtChunk(r, i);
  return [qt, Ps].includes(o) ? Ql(e, r, i, t) >= 60 : !1;
}
const fn = (e, t) => e * 16 + t;
function Ql(e, t, n, r) {
  const i = r.buildHeightmap(t, n);
  let o;
  e.edition === _.Java
    ? e.javaVersion >= p.V1_19
      ? (o = _e(e, t, n))
      : (o = new Se(V.fromNumber(t).add(V.fromNumber(n).mul(10387313))))
    : (o = new oe(10387313 * n + t));
  const s = o.nextInt(4);
  o.free();
  let a = 5,
    c = 5;
  s === 1 ? (a = -5) : s === 2 ? ((a = -5), (c = -5)) : s === 3 && (c = -5);
  const l = i[fn(7, 7)],
    u = i[fn(7, 7 + c)],
    d = i[fn(7 + a, 7)],
    f = i[fn(7 + a, 7 + c)];
  return Math.min(l, u, d, f) + (e.edition === _.Bedrock ? 1 : 0);
}
const ql = (e) => async (t) =>
    Ys(t, (n, r) => {
      const i = n >> 4,
        o = r >> 4,
        s = V.fromNumber(i ^ (o << 4)).xor(e.seed),
        a = e.edition === _.Bedrock ? new oe(s) : new Se(s);
      try {
        if ((a.nextInt(), a.nextInt(3) !== 0)) return !1;
        const c = (i << 4) + 4 + a.nextInt(8);
        if (n !== c) return !1;
        const l = (o << 4) + 4 + a.nextInt(8);
        return r === l;
      } finally {
        a.free();
      }
    }),
  Yl = (e, t) => {
    const n = oa(e, t, g.NetherFortress);
    return q(
      e,
      {
        spacing: e.edition === _.Bedrock ? 30 : 27,
        separation: 4,
        salt: 30084232,
        linearSeparation: !0,
      },
      async (r, i, o) =>
        e.edition === _.Java && e.javaVersion >= p.V1_18
          ? !!n(r, i)
          : o.nextInt(e.edition === _.Bedrock ? 6 : 5) < 2,
    );
  },
  eu = {
    supportsWorld: (e) => W(g.NetherFortress, e),
    create: async (e, t) =>
      (e.edition === _.Java && e.javaVersion < p.V1_16) ||
      (e.edition === _.Bedrock && e.bedrockVersion < S.V1_16)
        ? ql(e)
        : Yl(e, t),
  },
  tu = 62,
  qr = 63,
  nu = -64,
  Eo = [Ke, He, di, Ne, $t],
  dn = [Ye, De, qe, He, Yt],
  mn = [Ke, Ne, He, Qe, ht, pt, Yt, qe, Ye, De, di, $t],
  fa = { spacing: 32, separation: 5, salt: 10387313, linearSeparation: !1 },
  Ii = {
    supportsWorld: (e) => W(g.OceanMonument, e),
    create: async (e, t) => q(e, fa, async (n, r) => ru(e, t.overworld, n, r)),
  };
function ru(e, t, n, r) {
  if (e.edition === _.Java)
    if (e.javaVersion >= p.V1_18) {
      const i = t.noise();
      return (
        dn.includes(yt(i, n, r, "oceanFloor")) &&
        dt(i, n * 16 + 9, qr, r * 16 + 9, 29, mn)
      );
    } else if (e.javaVersion >= p.V1_13) {
      const i = t.legacy();
      return (
        i.areBiomesViable(n * 16 + 9, r * 16 + 9, 16, dn) &&
        i.areBiomesViable(n * 16 + 9, r * 16 + 9, 29, mn)
      );
    } else if (e.javaVersion >= p.V1_9) {
      const i = t.legacy();
      return (
        i.areBiomesViable(n * 16 + 8, r * 16 + 8, 16, [He]) &&
        i.areBiomesViable(n * 16 + 8, r * 16 + 8, 29, Eo)
      );
    } else {
      const i = t.legacy();
      return (
        i.getBiomeGenAt(n * 16 + 8, r * 16 + 8, 1, 1)[0] === He &&
        i.areBiomesViable(n * 16 + 8, r * 16 + 8, 29, Eo)
      );
    }
  else if (e.bedrockVersion >= S.V1_18) {
    const i = t.noise(),
      o = i.getPreliminarySurfaceLevel(n * 4, r * 4);
    return (
      dt(i, n * 16 + 8, o, r * 16 + 8, 16, dn) &&
      dt(i, n * 16 + 8, o, r * 16 + 8, 29, mn)
    );
  } else {
    const i = t.legacy();
    return (
      i.areBiomesViable(n * 16 + 8, r * 16 + 8, 16, dn) &&
      i.areBiomesViable(n * 16 + 8, r * 16 + 8, 29, mn)
    );
  }
}
const dr = { supportsWorld: (e) => W(g.Village, e), create: iu };
function da(e) {
  return {
    spacing: e.javaVersion >= p.V1_18 ? 34 : 32,
    separation: 8,
    salt: 10387312,
    linearSeparation: !0,
  };
}
async function iu(e, t) {
  if (e.edition === _.Java) {
    const r = da(e);
    return e.javaVersion >= p.V1_18
      ? q(
          e,
          r,
          async (i, o) => au(e, t.overworld, i, o),
          (i, o, s, a) => a,
        )
      : q(
          e,
          r,
          async (i, o) => su(e, t.overworld, i, o),
          (i, o, s, a) => {
            if (a === !0) return { type: null, zombie: null };
            if (e.javaVersion < p.V1_15) return { type: null, zombie: null };
            const c = Vo(a),
              l = _e(e, i, o);
            l.nextIntVoid(4);
            const u = ia(ga[c], l);
            return (l.free(), { type: c, zombie: ha(u[0]) });
          },
        );
  }
  const n = t.overworld;
  return q(
    e,
    {
      spacing: e.bedrockVersion >= S.V1_18 ? 34 : 27,
      separation: e.bedrockVersion >= S.V1_18 ? 8 : 10,
      salt: 10387312,
      linearSeparation: !1,
    },
    async (r, i) =>
      e.bedrockVersion >= S.V1_18
        ? Ci(
            n.noise(),
            r * 16 + 8,
            n.noise().getPreliminarySurfaceLevel(r * 4, i * 4),
            i * 16 + 8,
            2,
            ko,
          )
        : n.legacy().areBiomesViable(r * 16 + 8, i * 16 + 8, 2, ko),
    (r, i, o, s) => {
      const a =
        typeof s != "boolean"
          ? s
          : e.bedrockVersion >= S.V1_18
            ? ur(
                n.noise(),
                r * 16 + 8,
                n.noise().getPreliminarySurfaceLevel(r * 4, i * 4),
                i * 16 + 8,
              )
            : n.legacy().getBiomeForStructure(r, i);
      o.nextInt(4);
      const c = e.bedrockVersion >= S.V1_18 ? 0.02 : 0.2;
      return { type: Vo(a), zombie: o.nextDouble() < c };
    },
  );
}
const Sr = [ke, Y, Me],
  gn = [ke, Y, Me, we],
  hn = [ke, Y, Me, we, Ve],
  be = [Y, ke, St, Me, Ve, we],
  ma = {
    [p.V1_7]: Sr,
    [p.V1_8]: Sr,
    [p.V1_9]: Sr,
    [p.V1_10]: gn,
    [p.V1_11]: gn,
    [p.V1_12]: gn,
    [p.V1_13]: gn,
    [p.V1_14]: hn,
    [p.V1_15]: hn,
    [p.V1_16]: hn,
    [p.V1_17]: hn,
    [p.V1_18]: be,
    [p.V1_19]: be,
    [p.V1_19_3]: be,
    [p.V1_20]: be,
    [p.V1_21]: be,
    [p.V1_21_2]: be,
    [p.V1_21_4]: be,
    [p.V1_21_5]: be,
    [p.V1_21_6]: be,
    [p.V1_21_9]: be,
    [p.V26_1]: be,
    [p.V26_2]: be,
    [p.V26_3]: be,
  },
  ko = [ke, en, Me, Ve, we, Qt, Re, $n, Y, St],
  Ei = {
    desert: [Y],
    plains: [ke, en, St],
    savanna: [Me],
    snowy: [Ve],
    taiga: [we, Qt, Re, $n],
  },
  ou = Object.keys(Ei),
  Vo = (e) => {
    for (const t of ou) if (Ei[t].includes(e)) return t;
    throw new Error(`Unexpected biome for village: ${e.id}`);
  };
function su(e, t, n, r) {
  const i = ma[e.javaVersion],
    o = t.legacy();
  if (e.javaVersion < p.V1_13)
    return o.areBiomesViable(n * 16 + 8, r * 16 + 8, 0, i);
  const s = o.getBiomeForStructure(n, r);
  return i.includes(s) ? s : !1;
}
const ga = {
    desert: [
      ["desert_meeting_point_1", 98, [17, 6, 9]],
      ["desert_meeting_point_2", 98, [12, 6, 12]],
      ["desert_meeting_point_3", 49, [15, 6, 15]],
      ["zombie/desert_meeting_point_1", 2, [17, 6, 9]],
      ["zombie/desert_meeting_point_2", 2, [12, 6, 12]],
      ["zombie/desert_meeting_point_3", 1, [15, 6, 15]],
    ],
    plains: [
      ["plains_fountain_01", 50, [9, 4, 9]],
      ["plains_meeting_point_1", 50, [10, 7, 10]],
      ["plains_meeting_point_2", 50, [8, 5, 15]],
      ["plains_meeting_point_3", 50, [11, 9, 11]],
      ["zombie/plains_fountain_01", 1, [9, 6, 9]],
      ["zombie/plains_meeting_point_1", 1, [10, 7, 10]],
      ["zombie/plains_meeting_point_2", 1, [8, 5, 15]],
      ["zombie/plains_meeting_point_3", 1, [11, 9, 11]],
    ],
    savanna: [
      ["savanna_meeting_point_1", 100, [14, 5, 12]],
      ["savanna_meeting_point_2", 50, [11, 6, 11]],
      ["savanna_meeting_point_3", 150, [9, 6, 11]],
      ["savanna_meeting_point_4", 150, [9, 6, 9]],
      ["zombie/savanna_meeting_point_1", 2, [14, 6, 12]],
      ["zombie/savanna_meeting_point_2", 1, [11, 6, 11]],
      ["zombie/savanna_meeting_point_3", 3, [9, 6, 11]],
      ["zombie/savanna_meeting_point_4", 3, [9, 6, 9]],
    ],
    snowy: [
      ["snowy_meeting_point_1", 100, [12, 8, 8]],
      ["snowy_meeting_point_2", 50, [11, 5, 9]],
      ["snowy_meeting_point_3", 150, [7, 7, 7]],
      ["zombie/snowy_meeting_point_1", 2, [12, 8, 8]],
      ["zombie/snowy_meeting_point_2", 1, [11, 6, 9]],
      ["zombie/snowy_meeting_point_3", 3, [7, 7, 7]],
    ],
    taiga: [
      ["taiga_meeting_point_1", 49, [22, 3, 18]],
      ["taiga_meeting_point_2", 49, [9, 7, 9]],
      ["zombie/taiga_meeting_point_1", 1, [22, 6, 18]],
      ["zombie/taiga_meeting_point_2", 1, [9, 7, 9]],
    ],
  },
  ha = (e) => e.startsWith("zombie/");
function au(e, t, n, r) {
  const i = ma[e.javaVersion],
    o = t.noise(),
    s = ["plains", "desert", "savanna", "snowy", "taiga"],
    a = _e(e, n, r);
  try {
    for (; s.length > 0;) {
      const c = s.splice(a.nextInt(s.length), 1)[0],
        l = Ei[c].filter((d) => i.includes(d));
      if (l.length < 1) continue;
      const u = Ft({
        world: e,
        biomeProvider: o,
        chunkX: n,
        chunkZ: r,
        initialY: 0,
        projectionY: {
          heightType: "worldSurface",
          surfaceCheckType: "topmostAccurate",
        },
        allowedBiomes: l,
        structures: ga[c],
      });
      if (u) return { type: c, zombie: ha(u.key) };
    }
    return !1;
  } finally {
    a.free();
  }
}
const cu = {
    supportsWorld: (e) => W(g.RuinedPortalOverworld, e),
    create: async (e, t, n) => {
      if (e.edition === _.Java && e.javaVersion >= p.V1_18) {
        const r = t.overworld.noise(),
          i = wo(e, r),
          o = async (s) =>
            i(tt(s, Mo))
              .map(({ portal: a, placementChunkX: c, placementChunkZ: l }) => [
                a.x >> 4,
                a.z >> 4,
                { ...a, placementChunkX: c, placementChunkZ: l },
              ])
              .filter(([a, c]) => Be(s, { x: a, z: c }));
        return ((o.free = i.free), o);
      }
      if (e.edition === _.Bedrock && e.bedrockVersion >= S.V1_18) {
        const r = await uu(e, t, n),
          i = t.overworld.noise(),
          o = wo(e, i),
          s = async (a) => {
            const c = [];
            for (const l of o(tt(a, Mo))) {
              const u = { x: l.placementChunkX, z: l.placementChunkZ },
                d = { x: l.portal.x >> 4, z: l.portal.z >> 4 };
              if (!Be(a, u) && !Be(a, d)) continue;
              const f = (await r(l))
                ? [u.x, u.z, void 0]
                : [
                    d.x,
                    d.z,
                    {
                      ...(l.portal.placement === "on_land_surface"
                        ? l.portal
                        : { ...l.portal, yUnreliable: !0 }),
                      placementChunkX: l.placementChunkX,
                      placementChunkZ: l.placementChunkZ,
                    },
                  ];
              Be(a, { x: f[0], z: f[1] }) && c.push(f);
            }
            return c;
          };
        return (
          (s.free = () => {
            (o.free(), r.free());
          }),
          s
        );
      }
      return q(
        e,
        {
          spacing: 40,
          separation: 15,
          salt: e.edition === _.Bedrock ? 40552231 : 34222645,
          linearSeparation: !0,
        },
        async () => !0,
        () => {},
      );
    },
  },
  Mo = { x0: -1, x1: 1, z0: -1, z1: 1 },
  pn = 4,
  lu = 20,
  _n = 1;
async function uu(e, t, n) {
  const [r, i, o] = await Promise.all([
      Bi.create(e),
      dr.create(e, t, n),
      ca.create(e, t, n),
    ]),
    s = async ({ placementChunkX: a, placementChunkZ: c }) => {
      const l = { x: a - _n, z: c - _n, sizeX: 2 * _n + 1, sizeZ: 2 * _n + 1 },
        u = { x: a - pn, z: c - pn, sizeX: 2 * pn + 1, sizeZ: 2 * pn + 1 };
      return (await i(l)).length > 0 || (await o(l)).length > 0
        ? !0
        : (await r(u)).some(([d, f]) => (d - a) ** 2 + (f - c) ** 2 <= lu);
    };
  return (
    (s.free = () => {
      (r.free?.(), i.free?.(), o.free?.());
    }),
    s
  );
}
const fu = {
    supportsWorld: (e) => W(g.RuinedPortalNether, e),
    create: async (e) =>
      q(
        e,
        e.edition === _.Java && e.javaVersion >= p.V1_18
          ? {
              spacing: 40,
              separation: 15,
              salt: 34222645,
              linearSeparation: !0,
            }
          : {
              spacing: 25,
              separation: 10,
              salt: e.edition === _.Bedrock ? 40552231 : 34222645,
              linearSeparation: !0,
            },
        async () => !0,
      ),
  },
  yn = (e) => e.edition === _.Java && e.javaVersion >= p.V1_13,
  du = (e) => e.edition === _.Java && e.javaVersion >= p.V1_16,
  kn = (e) => e.edition === _.Java && e.javaVersion >= p.V1_18,
  ki = (e) => e.edition === _.Bedrock && e.bedrockVersion >= S.V1_18,
  mu = async (e, t, n, r, i, o) => {
    const s = t.noise();
    for (let a = 0; a < 16; a++)
      for (let c = 0; c < 16; c++)
        if (
          s.getSurfaceBlock(
            i * 16 + a,
            o * 16 + c,
            "worldSurface",
            "enhanced",
          ) < tu
        )
          return !1;
    return !0;
  },
  wn = (e) => (ki(e) ? mu : void 0),
  gu = {
    SHIPWRECK: (e) =>
      e.edition === _.Bedrock
        ? {
            ...(ki(e)
              ? { spacing: 24, separation: 4 }
              : { spacing: 10, separation: 5, linearSeparation: !1 }),
            salt: 165745295,
            allowedBiomes: [ft, Ze, Zn, Ke, He, pt, Ye, ht, qe, Ne, De, Qe],
            checkChunk: (t, ...n) => wu(e, ...n),
          }
        : {
            ...(du(e)
              ? { spacing: 24, separation: 4 }
              : { spacing: 16, separation: 8 }),
            salt: yn(e) ? 165745295 : 14357617,
            checkBiome: kn(e)
              ? (t, n, r, i, o) => {
                  const s = [ft, Ze],
                    a = o.filter((u) => !s.includes(u)),
                    c = yt(n.noise(), r, i, "worldSurface");
                  if (s.includes(c)) return c;
                  const l = yt(n.noise(), r, i, "oceanFloor");
                  return a.includes(l) ? l : !1;
                }
              : void 0,
            allowedBiomes: [ft, Ze, Ne, Ke, pt, ht, Qe, De, Ye, He, qe, Yt],
          },
    DESERT_TEMPLE: (e) => ({
      spacing: 32,
      separation: 8,
      salt: 14357617,
      allowedBiomes: [Y, Ms],
      checkChunk: kn(e)
        ? async (t, n, r, i, o, s) => Bo(n.noise(), o, s, 21, 21) >= qr
        : wn(e),
    }),
    JUNGLE_TEMPLE: (e) => ({
      spacing: 32,
      separation: 8,
      salt: yn(e) ? 14357619 : 14357617,
      allowedBiomes: [vt, gi, ...(e.edition !== _.Bedrock ? [nr, Ns] : [])],
      checkChunk: kn(e)
        ? async (t, n, r, i, o, s) => Bo(n.noise(), o, s, 12, 15) >= qr
        : wn(e),
    }),
    IGLOO: (e) => ({
      spacing: 32,
      separation: 8,
      salt: yn(e) ? 14357618 : 14357617,
      allowedBiomes: [Ve, Re, xt],
      checkChunk: wn(e),
    }),
    WITCH_HUT: (e) => ({
      spacing: 32,
      separation: 8,
      salt: yn(e) ? 14357620 : 14357617,
      allowedBiomes: e.edition === _.Java ? [gt] : [gt, Ls],
      checkChunk: wn(e),
    }),
  },
  pa = {
    supportsWorld: (e) => W(g.DesertTemple, e),
    create: (e, t, n) => on("DESERT_TEMPLE", e, t.overworld, n),
  },
  hu = {
    supportsWorld: (e) => W(g.JungleTemple, e),
    create: (e, t, n) => on("JUNGLE_TEMPLE", e, t.overworld, n),
  },
  pu = {
    supportsWorld: (e) => W(g.WitchHut, e),
    create: (e, t, n) => on("WITCH_HUT", e, t.overworld, n),
  },
  _u = {
    supportsWorld: (e) => W(g.Igloo, e),
    create: (e, t, n) =>
      on("IGLOO", e, t.overworld, n, (r, i) => {
        if (e.edition === _.Bedrock) {
          const a = hl(e, r, i);
          a.nextInt();
          const c = a.nextDouble() >= 0.5;
          return (a.free(), { hasBasement: c });
        }
        if (e.javaVersion < p.V1_13) return { hasBasement: null };
        const o = _e(e, r, i);
        o.nextInt(4);
        const s = o.nextDouble() < 0.5;
        return (o.free(), { hasBasement: s });
      }),
  },
  yu = {
    supportsWorld: (e) => W(g.Shipwreck, e),
    create: (e, t, n) => on("SHIPWRECK", e, t.overworld, n),
  };
async function wu(e, t, n, r, i, o) {
  const a = [Ze, ft, Zn].includes(r) ? 10 : 20;
  return (
    e.bedrockVersion >= S.V1_18
      ? dt(
          t.noise(),
          i * 16 + 8,
          t.noise().getPreliminarySurfaceLevel(i * 4, o * 4),
          o * 16 + 8,
          a,
          [r],
        )
      : t.legacy().areBiomesViable((i << 4) + 8, (o << 4) + 8, a, [r])
  )
    ? (
        await (
          await Ii.create(e, { overworld: t }, n)
        )({ x: i - 5, z: o - 5, sizeX: 10, sizeZ: 10 })
      ).length < 1
    : !1;
}
function bu(e, t, n, r, i) {
  const o = kn(e)
    ? yt(t.noise(), n, r, "worldSurface")
    : ki(e)
      ? ur(
          t.noise(),
          n * 16 + 8,
          t.noise().getPreliminarySurfaceLevel(n * 4, r * 4),
          r * 16 + 8,
        )
      : t.legacy().getBiomeForStructure(n, r);
  return i.includes(o) ? o : !1;
}
async function on(e, t, n, r, i) {
  const { allowedBiomes: o, checkBiome: s, checkChunk: a, ...c } = gu[e](t),
    l = { linearSeparation: !0, ...c },
    u = s || bu,
    d = async (f, m) => {
      const h = u(t, n, f, m, o);
      return h ? !a || (await a(t, n, r, h, f, m)) : !1;
    };
  return i ? q(t, l, d, i) : q(t, l, d);
}
const vu = { supportsWorld: (e) => W(g.SlimeChunk, e), create: la(Su) };
function Su(e, t, n) {
  return e.edition === _.Bedrock ? ku(t, n) : Eu(e.seed, t, n);
}
const xu = 4987142,
  Cu = 5947611,
  Tu = V.fromInt(4392871),
  Bu = 389711,
  Iu = V.fromInt(987234911);
function Eu(e, t, n) {
  const r = e
      .add(V.fromInt(Math.imul(Math.imul(t, t), xu)))
      .add(V.fromInt(Math.imul(t, Cu)))
      .add(V.fromInt(Math.imul(n, n)).multiply(Tu))
      .add(V.fromInt(Math.imul(n, Bu)))
      .xor(Iu),
    i = new Se(r),
    o = i.nextInt(10) === 0;
  return (i.free(), o);
}
function ku(e, t) {
  const n = new oe(Math.imul(e, 522133279) ^ t),
    r = n.nextInt(10) === 0;
  return (n.free(), r);
}
const Vu = {
  supportsWorld: (e) => W(g.Stronghold, e),
  finiteGenerationArea: (e) =>
    e.edition === _.Java
      ? { x: -1536, z: -1536, sizeX: 3072, sizeZ: 3072 }
      : null,
  create: async (e, t, n) => {
    const r = await n.sharedTask("StrongholdFinder.staticStrongholds", () =>
      Mu(e, t.overworld, n),
    );
    return async (i) => [
      ...r.filter(([o, s]) => Be(i, { x: o, z: s })),
      ...Au(e, i),
    ];
  },
};
async function Mu(e, t, n) {
  return e.edition === _.Bedrock
    ? await Fu(e, t, n)
    : e.javaVersion >= p.V1_9
      ? Ou(e, t)
      : Ru(e, t.legacy());
}
function Au(e, t) {
  return e.edition === _.Bedrock ? zu(e, t) : [];
}
const Vn = 32,
  _a = 3,
  lt = [
    ke,
    Y,
    Jt,
    Xt,
    we,
    Ve,
    Bc,
    Vs,
    Ms,
    Kt,
    Qt,
    Ic,
    vt,
    gi,
    Jn,
    As,
    Xn,
    Os,
    ot,
    Re,
    $n,
    Mt,
    zs,
    Rs,
    Me,
    Kn,
    Qn,
    qn,
    Fs,
    en,
    Vc,
    Yn,
    hi,
    Mc,
    er,
    Ac,
    Oc,
    tr,
    zc,
    tn,
    Rc,
    nn,
    Fc,
    Pc,
    pi,
    Lc,
    _i,
    Nc,
    Hc,
  ],
  Mn = [...lt, Zn],
  Ao = [...Mn, nr, Ns],
  Pe = [
    ke,
    Y,
    Jt,
    Xt,
    we,
    Ve,
    Vs,
    Kt,
    vt,
    Jn,
    Xn,
    ot,
    Re,
    Mt,
    Me,
    Kn,
    Qn,
    qn,
    en,
    Yn,
    hi,
    er,
    tr,
    nn,
    pi,
    _i,
    nr,
    rr,
    ir,
    St,
    At,
    xt,
    Ot,
    zt,
    rn,
    sr,
    ar,
  ],
  bn = [...Pe, yi],
  Yr = {
    [p.V1_7]: lt,
    [p.V1_8]: lt,
    [p.V1_9]: lt,
    [p.V1_10]: lt,
    [p.V1_11]: lt,
    [p.V1_12]: lt,
    [p.V1_13]: Mn,
    [p.V1_14]: Ao,
    [p.V1_15]: Ao,
    [p.V1_16]: Mn,
    [p.V1_17]: Mn,
    [p.V1_18]: Pe,
    [p.V1_19]: Pe,
    [p.V1_19_3]: Pe,
    [p.V1_20]: Pe,
    [p.V1_21]: Pe,
    [p.V1_21_2]: Pe,
    [p.V1_21_4]: Pe,
    [p.V1_21_5]: Pe,
    [p.V1_21_6]: Pe,
    [p.V1_21_9]: bn,
    [p.V26_1]: bn,
    [p.V26_2]: bn,
    [p.V26_3]: bn,
  };
function Ou(e, t) {
  const r = new Se(e.seed);
  let i = r.nextDouble() * 3.141592653589793 * 2;
  const o = [];
  let s = 0,
    a = 0,
    c = _a;
  for (let l = 0; l < 128; ++l) {
    const u = r.nextDouble(),
      d = 4 * Vn + Vn * s * 6 + (u - 0.5) * Vn * 2.5;
    let f = Math.round(Math.cos(i) * d),
      m = Math.round(Math.sin(i) * d);
    const h = e.javaVersion >= p.V1_19_3 ? new Se(r.nextLong()) : null,
      w =
        e.javaVersion >= p.V1_18
          ? il(
              t.noise(),
              (f << 4) + 8,
              0,
              (m << 4) + 8,
              112,
              (v) => Yr[e.javaVersion].includes(v),
              e.javaVersion >= p.V1_19_3 ? h : r,
            )
          : t
              .legacy()
              .findBiomePosition(
                (f << 4) + 8,
                (m << 4) + 8,
                112,
                Yr[e.javaVersion],
                r,
              );
    (h?.free(),
      w != null && ((f = w[0] >> 4), (m = w[2] >> 4)),
      o.push([f, m]),
      (i += 6.283185307179586 / c),
      (a += 1),
      a === c &&
        (s++,
        (a = 0),
        (c += Ln((2 * c) / (s + 1))),
        (c = Math.min(c, 128 - l)),
        (i += r.nextDouble() * 3.141592653589793 * 2)));
  }
  return (r.free(), o);
}
function zu(e, t) {
  const o = Si(t, 200);
  return wl(o, (s, a) => {
    const c = s * 200 + Math.floor(100),
      l = a * 200 + Math.floor(200 / 2),
      u =
        (((Math.imul(-1683231919, c) -
          Math.imul(1100435783, l) +
          e.seed.toInt()) |
          0) +
          97858791) |
        0,
      d = new oe(u),
      f = 200 * s + 200 - 150,
      m = 200 * a + 200 - 150,
      h = 200 * s + 150,
      w = 200 * a + 150,
      v = d.nextIntRange(f, h),
      x = d.nextIntRange(m, w),
      C = d.nextFloat() < 0.25;
    return (d.free(), C ? [[v, x]] : []);
  }).filter(([s, a]) => Be(t, { x: s, z: a }));
}
function Ru(e, t) {
  const r = new Se(e.seed);
  let i = r.nextDouble() * 3.141592653589793 * 2,
    o = 1;
  const s = [];
  let a = _a;
  for (let c = 0; c < 3; ++c) {
    const l = r.nextDouble(),
      u = (1.25 * o + l) * Vn * o;
    let d = Math.round(Math.cos(i) * u),
      f = Math.round(Math.sin(i) * u);
    const m = t.findBiomePosition(
      (d << 4) + 8,
      (f << 4) + 8,
      112,
      Yr[e.javaVersion],
      r,
    );
    (m != null && ((d = m[0] >> 4), (f = m[2] >> 4)),
      s.push([d, f]),
      (i += (3.141592653589793 * 2 * o) / a),
      c === a && ((o += 2 + r.nextInt(5)), (a += 1 + r.nextInt(2))));
  }
  return (r.free(), s);
}
async function Fu(e, t, n) {
  const i = [],
    o = await dr.create(e, { overworld: t }, n),
    s = new oe(e.seed);
  let a = s.nextFloat() * Math.PI * 2,
    c = s.nextInt(16) + 40;
  s.free();
  let l = 0;
  for (; l < 3;) {
    const u = Math.floor(c * Math.cos(a)),
      d = Math.floor(c * Math.sin(a));
    let f = !1;
    e: for (let m = u - 8; m < u + 8; m++)
      for (let h = d - 8; h < d + 8; h++)
        if ((await o({ x: m, z: h, sizeX: 1, sizeZ: 1 })).length > 0) {
          ((i[l++] = [m, h]), (f = !0));
          break e;
        }
    f ? ((a += 0.6 * Math.PI), (c += 8)) : ((a += 0.25 * Math.PI), (c += 4));
  }
  return i;
}
const Pu = [ot, tn],
  Lu = [ot, tn, sr],
  Nu = [ot, tn, ir, rr],
  Hu = [ot, tn, ir, rr, sr, ar],
  Du = (e) =>
    e.edition === _.Java
      ? e.javaVersion >= p.V1_21_5
        ? Lu
        : Pu
      : e.bedrockVersion >= S.V1_21_60
        ? Hu
        : Nu,
  Wu = {
    supportsWorld: (e) => W(g.WoodlandMansion, e),
    create: async (e, t) =>
      q(
        e,
        { spacing: 80, separation: 20, linearSeparation: !1, salt: 10387319 },
        async (n, r) => Gu(e, t.overworld, n, r),
      ),
  };
function Gu(e, t, n, r) {
  const i = Du(e);
  if (e.edition === _.Java && e.javaVersion >= p.V1_18) {
    const s = t
      .noise()
      .getNoiseBiomeAtHeightType(
        (n * 16 + 7) >> 2,
        (r * 16 + 7) >> 2,
        "worldSurface",
      );
    return i.includes(Je(s));
  } else if (e.edition === _.Bedrock && e.bedrockVersion >= S.V1_18)
    return dt(
      t.noise(),
      n * 16 + 8,
      t.noise().getPreliminarySurfaceLevel(n * 4, r * 4),
      r * 16 + 8,
      32,
      i,
    );
  const o = e.edition !== _.Bedrock && e.javaVersion >= p.V1_13 ? 9 : 8;
  return t.legacy().areBiomesViable(n * 16 + o, r * 16 + o, 32, i);
}
const Oo = [ke, Y, we, Ve, Me, At, St, Ot, zt, rn, xt, yi],
  ya = [ke, en, Me, Ve, we, Qt, $n, Y],
  ju = [...ya, Re, St, Ot, zt, rn, xt, At, yi],
  Uu = {
    supportsWorld: (e) => W(g.PillagerOutpost, e),
    create: async (e, t, n) => {
      if (e.edition === _.Bedrock)
        return q(
          e,
          {
            spacing: 80,
            separation: 24,
            salt: 165745296,
            linearSeparation: !1,
          },
          async (i, o) => Zu(e, t.overworld, i, o),
        );
      const r = await dr.create(e, t, n);
      return q(
        e,
        { spacing: 32, separation: 8, salt: 165745296, linearSeparation: !0 },
        async (i, o) => await Ju(e, t.overworld, r, i, o),
      );
    },
  };
function Zu(e, t, n, r) {
  return e.bedrockVersion >= S.V1_18
    ? dt(
        t.noise(),
        n * 16 + 8,
        t.noise().getPreliminarySurfaceLevel(n * 4, r * 4),
        r * 16 + 8,
        0,
        ju,
      )
    : t.legacy().areBiomesViable(n * 16 + 8, r * 16 + 8, 0, ya);
}
async function Ju(e, t, n, r, i) {
  const o = r >> 4,
    s = i >> 4,
    a = V.fromNumber(o ^ (s << 4)).xor(e.seed),
    c = new Se(a);
  c.nextIntVoid();
  const l = c.nextInt(5);
  if ((c.free(), l !== 0 || !Xu(e, t, r, i))) return !1;
  const u = { x: r - 10, z: i - 10, sizeX: 21, sizeZ: 21 };
  return e.javaVersion >= p.V1_16
    ? !(await xl(e, da(e), u))
    : (await n(u)).length <= 0;
}
function Xu(e, t, n, r) {
  return e.javaVersion >= p.V1_18
    ? !!Ft({
        world: e,
        biomeProvider: t.noise(),
        chunkX: n,
        chunkZ: r,
        initialY: 0,
        projectionY: {
          heightType: "worldSurface",
          surfaceCheckType: "topmostAccurate",
        },
        allowedBiomes: Oo,
        structures: [["outpost", 1, [16, 30, 16]]],
      })
    : Oo.includes(t.getBiomeForStructure(n, r));
}
const at = { warm: [qe, Yt, ht, Qe], cold: [pt, Ye, De, He, Ne, Ke] },
  $u = new Map([
    [Ne, { type: "cold", largeProbability: 0.3, clusterProbability: 0.25 }],
    [Ke, { type: "cold", largeProbability: 0.3, clusterProbability: 0.25 }],
    [He, { type: "cold", largeProbability: 0.5, clusterProbability: 0.4 }],
    [Qe, { type: "warm", largeProbability: 0.3, clusterProbability: 0.5 }],
    [Yt, { type: "warm", largeProbability: 0.3, clusterProbability: 0.5 }],
    [ht, { type: "warm", largeProbability: 0.3, clusterProbability: 0.5 }],
    [qe, { type: "warm", largeProbability: 0.3, clusterProbability: 0.5 }],
    [pt, { type: "cold", largeProbability: 0.3, clusterProbability: 0.25 }],
    [Ye, { type: "cold", largeProbability: 0.5, clusterProbability: 0.4 }],
    [De, { type: "cold", largeProbability: 0.5, clusterProbability: 0.4 }],
  ]),
  Ku = {
    supportsWorld: (e) => W(g.OceanRuin, e),
    async create(e, t, n) {
      const r = e.edition === _.Bedrock ? await Ii.create(e, t, n) : null;
      return q(
        e,
        e.edition === _.Java || e.bedrockVersion >= S.V1_18
          ? { spacing: 20, separation: 8, linearSeparation: !0, salt: 14357621 }
          : {
              spacing: 12,
              separation: 7,
              linearSeparation: !1,
              salt: 14357621,
            },
        async (i, o) => {
          if (e.edition === _.Bedrock) {
            if (
              (await r({ x: i - 5, z: o - 5, sizeX: 10, sizeZ: 10 })).length >=
              1
            )
              return !1;
            const a = [...at.cold, ...at.warm];
            let c;
            if (e.bedrockVersion >= S.V1_18) {
              const l = t.overworld.noise(),
                u = l.getPreliminarySurfaceLevel(i * 4, o * 4);
              if (((c = Ci(l, i * 16 + 8, u, o * 16 + 8, 0, a)), !c)) return !1;
            } else {
              if (
                !t.overworld
                  .legacy()
                  .areBiomesViable(i * 16 + 8, o * 16 + 8, 0, a)
              )
                return !1;
              c = t.overworld.legacy().getBiomeForStructure(i, o);
            }
            return [...at.cold, ...at.warm].includes(c) ? c : !1;
          } else {
            const s =
              e.javaVersion >= p.V1_18
                ? yt(t.overworld.noise(), i, o, "oceanFloor")
                : t.overworld.legacy().getBiomeForStructure(i, o);
            return [...at.cold, ...at.warm].includes(s) ? s : !1;
          }
        },
        (i, o, s, a) => {
          const c =
            e.edition === _.Bedrock
              ? $u.get(a)
              : {
                  type: at.cold.includes(a) ? "cold" : "warm",
                  largeProbability: 0.3,
                  clusterProbability: 0.9,
                };
          if (!c) throw new Error("Unexpected biome");
          const l =
            e.edition === _.Bedrock ? Sl(e, i + 4, o + 4, fa).rng : _e(e, i, o);
          l.nextInt(4);
          const u = l.nextFloat() <= c.largeProbability;
          let d = 0;
          if (u && (l.nextInt(), l.nextFloat() <= c.clusterProbability)) {
            for (let f = 0; f < 16; f++) l.nextInt();
            d = 4 + l.nextInt(5);
          }
          return (l.free(), { type: c.type, isLarge: u, clusterSize: d });
        },
      );
    },
  },
  wa = [vt, gi, ke, Xt, Kt, we, Qt];
function Qu(e, t) {
  if (e.bedrockVersion >= S.V1_18) {
    const [r, , i] = t.noise().findSpawnPosition();
    return [r, i];
  }
  let n = 40;
  for (; n < 2e4;) {
    const r = t.legacy().getBiomeArea(n, 0, n + 40, 40);
    for (let i = 1; i < 9; i++)
      for (let o = 1; o < 9; o++)
        if (
          [
            [n + o * 4 + 0, i * 4 + 0],
            [n + o * 4 - 4, i * 4 + 0],
            [n + o * 4 + 4, i * 4 + 0],
            [n + o * 4 + 0, i * 4 - 4],
            [n + o * 4 + 0, i * 4 + 4],
          ].every((c) => wa.includes(r(c[0], c[1])))
        )
          return [n + 4 * o, 4 * i];
    n += 40;
  }
  return [0, 0];
}
function qu(e, t) {
  if (e.javaVersion >= p.V1_18) {
    const [n, , r] = t.noise().findSpawnPosition();
    return [n, r];
  } else {
    const n = new Se(e.seed),
      [r, , i] = t.legacy().findBiomePosition(0, 0, 256, wa, n) || [0, 0, 0];
    return (n.free(), [r, i]);
  }
}
const Yu = {
  supportsWorld: (e) => W(g.Spawn, e),
  finiteGenerationArea(e) {
    return e.edition === _.Bedrock && e.bedrockVersion < S.V1_18
      ? { x: 0, z: 0, sizeX: 1253, sizeZ: 3 }
      : { x: -512, z: -512, sizeX: 1024, sizeZ: 1024 };
  },
  async create(e, { overworld: t }) {
    const n = e.edition === _.Java ? qu(e, t) : Qu(e, t),
      r = { x: n[0] >> 4, z: n[1] >> 4 };
    return async (i) => (Be(i, r) ? [[r.x, r.z, { x: n[0], z: n[1] }]] : []);
  },
};
function ba(e, t, n, r) {
  const i = t.add(n);
  return (
    En(i, V.fromNumber(1e4 * r)),
    e.javaVersion >= p.V1_18 ? jt.fromSeed(i) : new Se(i)
  );
}
function ef(e) {
  const t = e;
  return t.decorator ? t.decorator : t.placement.reverse();
}
function nt(e, t, n, r) {
  const { decorationStepOrdinal: i, featureIndex: o, feature: s } = r,
    a = ef(r),
    c = [t * 16, 0, n * 16],
    l = js(e, c[0], c[2]),
    u = ba(e, l, o, i),
    d = [],
    f = { random: u };
  return (
    a.reduce(
      (h, w) => (v, x, C) => {
        w(v, x, (E) => h(E, x, C));
      },
      (h) => d.push(s(h, f)),
    )(c, f, (h) => {
      const w = s(h, f);
      d.push(w);
    }),
    u.free(),
    d
  );
}
const rt = (e) => (t, n, r) => {
    n.random.nextFloat() < 1 / e.chance && r(t);
  },
  sn = () => (e) => [e],
  zo = (e) => (t) => {
    const { minInclusive: n, maxInclusive: r } = e;
    return n > r ? r : t.nextInt(r - n + 1) + n;
  },
  tf = (e) => (t) => {
    const { minInclusive: n, maxInclusive: r, plateau: i = 0 } = e;
    if (n > r) return (console.warn("3276386391"), r);
    const o = r - n;
    if (i >= o) return xr(t, n, r);
    const s = Math.floor((o - i) / 2),
      a = o - s;
    return n + xr(t, 0, a) + xr(t, 0, s);
  };
function xr(e, t, n) {
  return e.nextInt(n - t + 1) + t;
}
const nf = (e) => (t, n, r) => {
    const i = e(n.random);
    r([t[0], i, t[2]]);
  },
  Cr = (e) => (t) => nf(e(t)),
  Nn = {
    uniform: Cr(zo),
    triangle: Cr(tf),
    range_8_8_nether: Cr(() => zo({ minInclusive: 8, maxInclusive: 119 })),
  },
  Ut =
    ({ provider: e, allowedBiomes: t, disallowedBiomes: n }) =>
    (r, i, o) => {
      const s = Je(e.getNoiseBiome(r[0] >> 2, r[1] >> 2, r[2] >> 2));
      (t && !t.includes(s)) || (n && n.includes(s)) || o(r);
    },
  wt = () => (e, t, n) => {
    const { random: r } = t,
      i = e[0] + r.nextInt(16),
      o = e[2] + r.nextInt(16);
    n([i, e[1], o]);
  },
  Ro = (e) => (t, n) => {
    const { random: r } = n;
    (r.nextInt(4), r.nextInt(4));
    const i = Math.min(
        t[1],
        e.getSurfaceBlock(t[0], t[2], "oceanFloor", "topmostAccurate"),
      ),
      o = Math.max(i - 15 - r.nextInt(10), nu + 10);
    return [[t[0], o, t[2]]];
  };
class Hn {
  gen;
  constructor(t, n) {
    const r = de(t);
    this.gen = new kr(r, n);
  }
  getSeedForChunk(t, n) {
    return this.gen.a(t, n);
  }
  free() {
    this.gen.free();
  }
}
class rf {
  finder;
  constructor(t) {
    this.finder = new Nr(de(t));
  }
  find(t, n) {
    return this.finder.a(t.x, t.z, t.sizeX, t.sizeZ, n.provider);
  }
  free() {
    this.finder.free();
  }
}
const of = {
    supportsWorld: (e) => W(g.Fossil, e),
    create: async function (e, t) {
      return e.edition === _.Java
        ? e.javaVersion >= p.V1_18
          ? sf(e, t.overworld.noise())
          : cf(e, t.overworld.legacy())
        : lf(e, t.overworld);
    },
  },
  Fo = [Y, gt, or];
function sf(e, t) {
  return async (n) => {
    const r = [];
    return (
      ue(n, (i, o) => {
        const s = nt(e, i, o, {
            decorationStepOrdinal: 3,
            featureIndex: 0,
            placement: [
              rt({ chance: 64 }),
              wt(),
              Nn.uniform({ minInclusive: 0, maxInclusive: 319 }),
              Ut({ provider: t, allowedBiomes: Fo }),
            ],
            feature: Ro(t),
          }),
          a = nt(e, i, o, {
            decorationStepOrdinal: 3,
            featureIndex: 1,
            placement: [
              rt({ chance: 64 }),
              wt(),
              Nn.uniform({ minInclusive: -64, maxInclusive: -8 }),
              Ut({ provider: t, allowedBiomes: Fo }),
            ],
            feature: Ro(t),
          }),
          c = [];
        (s.length > 0 && c.push([...s[0][0], "coal"]),
          a.length > 0 && c.push([...a[0][0], "diamond"]),
          c.length > 0 && r.push([i, o, c]));
      }),
      r
    );
  };
}
const af = { [Y.id]: 0, [gt.id]: 0, [Ls.id]: 1 };
function cf(e, t) {
  return async (n) => {
    const r = [],
      i = t.getNoiseBiomeArea(
        n.x * 4 + 2,
        n.z * 4 + 2,
        (n.x + n.sizeX) * 4 - 2,
        (n.z + n.sizeZ) * 4 - 2,
      );
    return (
      ue(n, (o, s) => {
        const a = i(o * 4 + 2, s * 4 + 2).id,
          c = af[a];
        if (c == null) return;
        nt(e, o, s, {
          decorationStepOrdinal: 3,
          featureIndex: c + 2,
          decorator: [rt({ chance: 64 })],
          feature: sn(),
        }).length > 0 && r.push([o, s, void 0]);
      }),
      r
    );
  };
}
function Po(e, t, n) {
  return n === "default"
    ? t === Y.id || t === gt.id
    : n === "deep" &&
        e >= S.V1_18 &&
        (t === Y.id || t === gt.id || (t === or.id && e >= S.V1_21_60));
}
function lf(e, t) {
  const n = e.bedrockVersion >= S.V1_18,
    r = new Hn(e, "minecraft:desert_or_swamp_after_surface_fossil_feature"),
    i = n
      ? new Hn(
          e,
          "minecraft:desert_or_swamp_after_surface_fossil_deepslate_feature",
        )
      : null,
    o = async (s) => {
      const a = [],
        c = n
          ? null
          : t
              .legacy()
              .getBiomeArea(
                s.x * 16,
                s.z * 16,
                (s.x + s.sizeX) * 16,
                (s.z + s.sizeZ) * 16,
              );
      return (
        ue(s, (l, u) => {
          const d = c
              ? c(l * 16 + 15, u * 16 + 15)
              : ur(t.noise(), l * 16, 0, u * 16),
            f = Po(e.bedrockVersion, d.id, "default"),
            m = Po(e.bedrockVersion, d.id, "deep");
          if (!f && !m) return;
          const h = [];
          if (f) {
            const w = r.getSeedForChunk(l, u),
              v = new oe(w);
            (v.nextInt(64) < 1 && h.push([null, null, null, "coal"]), v.free());
          }
          if (m && i) {
            const w = i.getSeedForChunk(l, u),
              v = new oe(w);
            (v.nextInt(64) < 1 && h.push([null, null, null, "diamond"]),
              v.free());
          }
          h.length > 0 && a.push([l, u, h]);
        }),
        a
      );
    };
  return (
    (o.free = () => {
      (r.free(), i?.free());
    }),
    o
  );
}
const uf = {
  supportsWorld: (e) => W(g.FossilNether, e),
  create: async function (e, t) {
    return ff(e, t.nether.noise());
  },
};
function ff(e, t) {
  const n = new rf(e),
    r = async (i) => {
      const o = n
        .find(i, t)
        .map((s) => [
          s.x,
          s.y,
          s.z,
          { variant: s.variant, hasDriedGhast: s.hasDriedGhast },
        ]);
      return Xe(o, (s) => [s[0] >> 4, s[2] >> 4]);
    };
  return (
    (r.free = () => {
      n.free();
    }),
    r
  );
}
const df = {
  supportsWorld: (e) => W(g.Ravine, e),
  create: async (e, { overworld: t }) =>
    e.edition === _.Java
      ? e.javaVersion >= p.V1_18
        ? mf(e)
        : hf(e, t.legacy())
      : pf(e, t),
};
function mf(e) {
  return async (t) => {
    const n = [];
    return (
      ue(t, (r, i) => {
        const o = [],
          s = _e(e, r, i, 2);
        if (s.nextFloat() < 0.01) {
          const a = gf(s, r, i);
          o.push(a);
        }
        (s.free(), o.length > 0 && n.push([r, i, o]));
      }),
      n
    );
  };
}
function gf(e, t, n) {
  const r = t * 16 + e.nextInt(16),
    i = fr(e, 10, 67),
    o = n * 16 + e.nextInt(16);
  (e.nextFloat(), e.nextFloat());
  const s = Hl(e, 0, 6, 2);
  return { x: r, y: i, z: o, thickness: s, isUnderwater: !1, isMegaRavine: !1 };
}
function hf(e, t) {
  return async (n) => {
    const r = [],
      i = t.getNoiseBiomeArea(
        (n.x - 8) * 4,
        (n.z - 8) * 4,
        (n.x + n.sizeX + 8) * 4,
        (n.z + n.sizeZ + 8) * 4,
      );
    return (
      ue(n, (o, s) => {
        const a = [],
          c = _e(e, o, s, 1);
        if (c.nextFloat() < 0.02) {
          const u = Lo(c, o, s, !1);
          a.push(u);
        }
        c.free();
        const l = _e(e, o, s, 0);
        (l.nextFloat() < 0.02 &&
          i(o * 4, s * 4).category === "ocean" &&
          a.push(Lo(l, o, s, !0)),
          l.free(),
          a.length > 0 && r.push([o, s, a]));
      }),
      r
    );
  };
}
function Lo(e, t, n, r) {
  const i = t * 16 + e.nextInt(16),
    o = e.nextInt(e.nextInt(40) + 8) + 20,
    s = n * 16 + e.nextInt(16);
  (e.nextFloat(), e.nextFloat());
  const a = (e.nextFloat() * 2 + e.nextFloat()) * 2;
  return { x: i, y: o, z: s, thickness: a, isUnderwater: r, isMegaRavine: !1 };
}
function pf(e, t) {
  const n = lr(e);
  return async (r) => {
    const i = [];
    return (
      ue(r, (o, s) => {
        const a = new oe(n(o, s));
        try {
          if (a.nextInt(e.bedrockVersion >= S.V1_21_60 ? 100 : 150) !== 0)
            return;
          const c = a.nextInt(16) + o * 16;
          let l;
          if (e.bedrockVersion >= S.V1_21_60)
            ((l = fr(a, 10, 67)), a.nextInt());
          else {
            const w = a.nextInt(40);
            l = a.nextInt(w + 8) + 20;
          }
          a.nextInt();
          const u = a.nextInt(16) + s * 16;
          (a.nextFloat(), a.nextFloat());
          let d = 3 * a.nextFloat() + 3 * a.nextFloat();
          const f = a.nextFloat() < 0.05 && e.bedrockVersion < S.V1_21_60;
          f && (d = 2 * d);
          const h =
            (e.bedrockVersion < S.V1_18
              ? t.legacy().getBiomeGenAt(c, u, 1, 1)[0]
              : yt(t.noise(), o, s, "oceanFloor")
            ).category === "ocean";
          (!h ||
            e.bedrockVersion < S.V1_18 ||
            e.bedrockVersion >= S.V1_21_60) &&
            i.push([
              o,
              s,
              [
                {
                  x: c,
                  y: l,
                  z: u,
                  thickness: d,
                  isMegaRavine: f,
                  isUnderwater: h,
                },
              ],
            ]);
        } finally {
          a.free();
        }
      }),
      i
    );
  };
}
function _f(e, t) {
  const n = new Map(),
    r = new Map();
  let i, o, s;
  const a = (f, m) => {
      if (s != null && i === f && o === m) return s;
      let h = r.get(f);
      h == null && ((h = new Map()), r.set(f, h));
      let w = h.get(m);
      return (
        w == null && ((w = e.buildHeightmap(f, m)), h.set(m, w)),
        (i = f),
        (o = m),
        (s = w),
        w
      );
    },
    c = (f, m, h) => {
      let w = n.get(f);
      w == null && ((w = new Map()), n.set(f, w));
      let v = w.get(h);
      (v == null && ((v = new Set()), w.set(h, v)), v.add(m));
    },
    l = (f, m, h) => {
      const w = f >> 4,
        v = m >> 4,
        x = a(w, v),
        C = (f & 15) * 16 + (m & 15);
      return x[C];
    };
  return {
    setBlock: c,
    hasBlock: (f, m, h) => {
      const w = l(f, h);
      return m <= w ? !0 : (n.get(f)?.get(h)?.has(m) ?? !1);
    },
    getHeight: l,
    resetBlocks: () => {
      n.clear();
    },
  };
}
function yf(e, t, n) {
  const [r, i, o] = n;
  (e.setBlock(r, i, o), va(e, r, i, o, r, o, t, 0));
}
const ne = { NORTH: 0, EAST: 1, SOUTH: 2, WEST: 3 },
  wf = {
    [ne.NORTH]: ne.SOUTH,
    [ne.SOUTH]: ne.NORTH,
    [ne.EAST]: ne.WEST,
    [ne.WEST]: ne.EAST,
  };
function No(e, t, n, r, i) {
  return (
    (i === ne.EAST || !e.hasBlock(t + 1, n, r)) &&
    (i === ne.WEST || !e.hasBlock(t - 1, n, r)) &&
    (i === ne.SOUTH || !e.hasBlock(t, n, r + 1)) &&
    (i === ne.NORTH || !e.hasBlock(t, n, r - 1))
  );
}
function va(e, t, n, r, i, o, s, a) {
  let l = s.nextInt(4) + 1;
  a === 0 && (l += 1);
  for (let d = 0; d < l; d++) {
    const f = n + d + 1;
    if (!No(e, t, f, r)) return;
    (e.setBlock(t, f, r), e.setBlock(t, f - 1, r));
  }
  let u = !1;
  if (a < 4) {
    let d = s.nextInt(4);
    a === 0 && (d += 1);
    const f = n + l;
    for (let m = 0; m < d; m++) {
      const h = s.nextInt(4);
      let w = t,
        v = r;
      (h === ne.NORTH
        ? (v -= 1)
        : h === ne.EAST
          ? (w += 1)
          : h === ne.SOUTH
            ? (v += 1)
            : (w -= 1),
        !(
          w <= i - 8 ||
          w >= i + 8 ||
          v <= o - 8 ||
          v >= o + 8 ||
          e.hasBlock(w, f, v) ||
          e.hasBlock(w, f - 1, v) ||
          !No(e, w, f, v, wf[h])
        ) &&
          ((u = !0),
          e.setBlock(w, f, v),
          h === ne.NORTH
            ? e.setBlock(w, f, v + 1)
            : h === ne.EAST
              ? e.setBlock(w - 1, f, v)
              : h === ne.SOUTH
                ? e.setBlock(w, f, v - 1)
                : e.setBlock(w + 1, f, v),
          va(e, w, f, v, i, o, s, a + 1)));
    }
  }
  u || e.setBlock(t, n + 1, r);
}
const bf = () => (e, t, n) => {
    const { random: r } = t;
    if (r.nextInt(700) !== 0) return;
    const i = 0,
      o = e[0] + r.nextInt(16),
      s = e[2] + r.nextInt(16);
    n([o, i, s]);
  },
  vf = {
    supportsWorld: (e) => W(g.EndGateway, e),
    create: async function (e, t) {
      return e.edition === _.Java
        ? e.javaVersion >= p.V1_18
          ? Sf(e, t.end)
          : xf(e, t.end)
        : Cf(e, t.end);
    },
  };
function Sf(e, t) {
  return async (n) => {
    const r = [];
    return (
      ue(n, (i, o) => {
        const s = nt(e, i, o, {
          decorationStepOrdinal: 4,
          featureIndex: 0,
          placement: [
            rt({ chance: 700 }),
            wt(),
            Ut({ provider: t, allowedBiomes: [qt] }),
          ],
          feature: sn(),
        });
        s.length < 1 || r.push([i, o, [{ x: s[0][0][0], z: s[0][0][2] }]]);
      }),
      r
    );
  };
}
function xf(e, t) {
  return async (n) => {
    const r = [];
    return (
      ue(n, (i, o) => {
        const s = nt(e, i, o, {
          decorationStepOrdinal: 4,
          featureIndex: 13,
          decorator:
            e.javaVersion >= p.V1_17 ? [wt(), rt({ chance: 700 })] : [bf()],
          feature: sn(),
        });
        s.length < 1 ||
          t.getNoiseBiome(i * 4 + 2, 0, o * 4 + 2) !== qt.id ||
          r.push([i, o, [{ x: s[0][0][0], z: s[0][0][2] }]]);
      }),
      r
    );
  };
}
function Cf(e, t) {
  const n = new ua(e),
    r = new oe(e.seed),
    i = e.bedrockVersion >= S.V1_18,
    o = qt.id,
    s = async (a) => {
      const c = lr(e),
        l = _f(n),
        u = new Map(),
        d = a.x + a.sizeX,
        f = a.z + a.sizeZ,
        m = tt(a, { x0: -1, z0: -1 }),
        h = m.sizeX,
        w = t.getBiomeArea(m.x * 4, m.z * 4, h, m.sizeZ, 4);
      let v = 0;
      for (let C = m.z; C < m.z + m.sizeZ; C++)
        for (let E = m.x; E < m.x + m.sizeX; E++) {
          if (w[v] !== o) {
            v += 1;
            continue;
          }
          ((v += 1), l.resetBlocks());
          const k = c(E, C);
          (r.setSeed(k), i && r.nextInt());
          const M = r.nextInt(5),
            I = E * 16 + 8,
            A = C * 16 + 8;
          for (let U = 0; U < M; U++) {
            const J = I + r.nextInt(16),
              K = A + r.nextInt(16),
              G = l.getHeight(J, K) + 1;
            G <= 0 || yf(l, r, [J, G, K]);
          }
          if (r.nextInt(700) !== 0) continue;
          const L = I + r.nextInt(16),
            P = A + r.nextInt(16);
          if (l.getHeight(L, P, !0) <= 0) continue;
          const R = L >> 4,
            z = P >> 4;
          if (R < a.x || R >= d || z < a.z || z >= f) continue;
          let O = u.get(R);
          O == null && ((O = new Map()), u.set(R, O));
          let F = O.get(z);
          (F == null && ((F = []), O.set(z, F)), F.push({ x: L, z: P }));
        }
      const x = [];
      for (const [C, E] of u) for (const [k, M] of E) x.push([C, k, M]);
      return x;
    };
  return (
    (s.free = () => {
      (r.free(), n.free());
    }),
    s
  );
}
const Tf = (e) => (t) => {
    const { x: n = 0, y: r = 0, z: i = 0 } = e;
    return [[t[0] + n, t[1] + r, t[2] + i]];
  },
  Bf = {
    supportsWorld: (e) => W(g.AmethystGeode, e),
    create: async (e, t) => (e.edition === _.Java ? Ef(e, t.overworld) : kf(e)),
  },
  If = (e) => ([Ne.id, De.id].includes(e) ? 2 : 0);
function Ef(e, t) {
  return async (n) => {
    const r = tt(n, { x0: -1, z0: -1 }),
      i = [],
      o =
        e.javaVersion < p.V1_18
          ? t
              .legacy()
              .getNoiseBiomeArea(
                r.x * 4 + 2,
                r.z * 4 + 2,
                (r.x + r.sizeX) * 4 - 2,
                (r.z + r.sizeZ) * 4 - 2,
              )
          : null;
    return (
      ue(r, (s, a) => {
        const c = o?.(s * 4 + 2, a * 4 + 2).id,
          l = nt(e, s, a, {
            decorationStepOrdinal: 2,
            featureIndex: c == null || e.javaVersion >= p.V1_18 ? 2 : If(c),
            decorator: [
              Nn.uniform({
                minInclusive: e.javaVersion >= p.V1_18 ? -58 : 6,
                maxInclusive: e.javaVersion >= p.V1_18 ? 30 : 46,
              }),
              wt(),
              rt({ chance: e.javaVersion >= p.V1_18 ? 24 : 53 }),
            ],
            feature: Tf({ x: 4, y: 4, z: 4 }),
          });
        l.length > 0 && i.push(l[0][0]);
      }),
      ea(i, n, (s) => [s[0] >> 4, s[2] >> 4])
    );
  };
}
function kf(e) {
  const t = new Hn(e, "minecraft:overworld_amethyst_geode_feature"),
    n = e.bedrockVersion >= S.V1_18 ? 24 : 53,
    r = e.bedrockVersion >= S.V1_18 ? [-58, 30] : [6, 47],
    i = async (o) => {
      const s = [];
      return (
        ue(o, (a, c) => {
          const l = t.getSeedForChunk(a, c),
            u = new oe(l);
          if (u.nextInt(n) < 1) {
            const d = Kr(u, r[0], r[1]);
            s.push([a * 16 + 4, d + 4, c * 16 + 4]);
          }
          u.free();
        }),
        ea(s, o, (a) => [a[0] >> 4, a[2] >> 4])
      );
    };
  return (
    (i.free = () => {
      t.free();
    }),
    i
  );
}
const Vf = [
    ["city_center_1", 1, [18, 31, 41]],
    ["city_center_2", 1, [18, 31, 41]],
    ["city_center_3", 1, [18, 31, 41]],
  ],
  Mf = {
    supportsWorld: (e) => W(g.AncientCity, e),
    create: async (e, t) => {
      const n = t.overworld.noise();
      return q(
        e,
        {
          spacing: 24,
          separation: 8,
          salt: 20083232,
          linearSeparation: e.edition !== _.Bedrock,
        },
        async (r, i) =>
          e.edition === _.Java
            ? !!Ft({
                world: e,
                biomeProvider: t.overworld.noise(),
                chunkX: r,
                chunkZ: i,
                initialY: -27,
                projectionY: null,
                allowedBiomes: [_t],
                structures: Vf,
                namedStartPos: [13, 20],
              })
            : n.getNoiseBiomeBlock(r * 16, -27, i * 16) === _t.id,
      );
    },
  },
  Af = "minecraft:chest",
  Of = [
    {
      bonus_rolls: 0,
      entries: [
        {
          type: "minecraft:item",
          functions: [
            {
              add: !1,
              count: { type: "minecraft:uniform", max: 3, min: 1 },
              function: "minecraft:set_count",
            },
          ],
          name: "minecraft:diamond",
          weight: 5,
        },
        {
          type: "minecraft:item",
          functions: [
            {
              add: !1,
              count: { type: "minecraft:uniform", max: 5, min: 1 },
              function: "minecraft:set_count",
            },
          ],
          name: "minecraft:iron_ingot",
          weight: 15,
        },
        {
          type: "minecraft:item",
          functions: [
            {
              add: !1,
              count: { type: "minecraft:uniform", max: 7, min: 2 },
              function: "minecraft:set_count",
            },
          ],
          name: "minecraft:gold_ingot",
          weight: 15,
        },
        {
          type: "minecraft:item",
          functions: [
            {
              add: !1,
              count: { type: "minecraft:uniform", max: 3, min: 1 },
              function: "minecraft:set_count",
            },
          ],
          name: "minecraft:emerald",
          weight: 15,
        },
        {
          type: "minecraft:item",
          functions: [
            {
              add: !1,
              count: { type: "minecraft:uniform", max: 6, min: 4 },
              function: "minecraft:set_count",
            },
          ],
          name: "minecraft:bone",
          weight: 25,
        },
        {
          type: "minecraft:item",
          functions: [
            {
              add: !1,
              count: { type: "minecraft:uniform", max: 3, min: 1 },
              function: "minecraft:set_count",
            },
          ],
          name: "minecraft:spider_eye",
          weight: 25,
        },
        {
          type: "minecraft:item",
          functions: [
            {
              add: !1,
              count: { type: "minecraft:uniform", max: 7, min: 3 },
              function: "minecraft:set_count",
            },
          ],
          name: "minecraft:rotten_flesh",
          weight: 25,
        },
        {
          type: "minecraft:item",
          functions: [
            {
              add: !1,
              count: { type: "minecraft:uniform", max: 5, min: 1 },
              function: "minecraft:set_count",
            },
          ],
          name: "minecraft:leather",
          weight: 20,
        },
        {
          type: "minecraft:item",
          name: "minecraft:copper_horse_armor",
          weight: 15,
        },
        {
          type: "minecraft:item",
          name: "minecraft:iron_horse_armor",
          weight: 15,
        },
        {
          type: "minecraft:item",
          name: "minecraft:golden_horse_armor",
          weight: 10,
        },
        {
          type: "minecraft:item",
          name: "minecraft:diamond_horse_armor",
          weight: 5,
        },
        {
          type: "minecraft:item",
          functions: [
            {
              function: "minecraft:enchant_randomly",
              options: "#minecraft:on_random_loot",
            },
          ],
          name: "minecraft:book",
          weight: 20,
        },
        { type: "minecraft:item", name: "minecraft:golden_apple", weight: 20 },
        {
          type: "minecraft:item",
          name: "minecraft:enchanted_golden_apple",
          weight: 2,
        },
        { type: "minecraft:empty", weight: 15 },
      ],
      rolls: { type: "minecraft:uniform", max: 4, min: 2 },
    },
    {
      bonus_rolls: 0,
      entries: [
        {
          type: "minecraft:item",
          functions: [
            {
              add: !1,
              count: { type: "minecraft:uniform", max: 8, min: 1 },
              function: "minecraft:set_count",
            },
          ],
          name: "minecraft:bone",
          weight: 10,
        },
        {
          type: "minecraft:item",
          functions: [
            {
              add: !1,
              count: { type: "minecraft:uniform", max: 8, min: 1 },
              function: "minecraft:set_count",
            },
          ],
          name: "minecraft:gunpowder",
          weight: 10,
        },
        {
          type: "minecraft:item",
          functions: [
            {
              add: !1,
              count: { type: "minecraft:uniform", max: 8, min: 1 },
              function: "minecraft:set_count",
            },
          ],
          name: "minecraft:rotten_flesh",
          weight: 10,
        },
        {
          type: "minecraft:item",
          functions: [
            {
              add: !1,
              count: { type: "minecraft:uniform", max: 8, min: 1 },
              function: "minecraft:set_count",
            },
          ],
          name: "minecraft:string",
          weight: 10,
        },
        {
          type: "minecraft:item",
          functions: [
            {
              add: !1,
              count: { type: "minecraft:uniform", max: 8, min: 1 },
              function: "minecraft:set_count",
            },
          ],
          name: "minecraft:sand",
          weight: 10,
        },
      ],
      rolls: 4,
    },
    {
      bonus_rolls: 0,
      entries: [
        { type: "minecraft:empty", weight: 6 },
        {
          type: "minecraft:item",
          functions: [{ add: !1, count: 2, function: "minecraft:set_count" }],
          name: "minecraft:dune_armor_trim_smithing_template",
        },
      ],
      rolls: 1,
    },
  ],
  zf = "minecraft:chests/desert_pyramid";
var Rf = { type: Af, pools: Of, random_sequence: zf };
const Ff = "minecraft:chest",
  Pf = [
    {
      bonus_rolls: 0,
      entries: [
        {
          type: "minecraft:item",
          functions: [
            {
              add: !1,
              count: { type: "minecraft:uniform", max: 3, min: 1 },
              function: "minecraft:set_count",
            },
          ],
          name: "minecraft:diamond",
          weight: 5,
        },
        {
          type: "minecraft:item",
          functions: [
            {
              add: !1,
              count: { type: "minecraft:uniform", max: 5, min: 1 },
              function: "minecraft:set_count",
            },
          ],
          name: "minecraft:iron_ingot",
          weight: 15,
        },
        {
          type: "minecraft:item",
          functions: [
            {
              add: !1,
              count: { type: "minecraft:uniform", max: 7, min: 2 },
              function: "minecraft:set_count",
            },
          ],
          name: "minecraft:gold_ingot",
          weight: 15,
        },
        {
          type: "minecraft:item",
          functions: [
            {
              add: !1,
              count: { type: "minecraft:uniform", max: 3, min: 1 },
              function: "minecraft:set_count",
            },
          ],
          name: "minecraft:emerald",
          weight: 15,
        },
        {
          type: "minecraft:item",
          functions: [
            {
              add: !1,
              count: { type: "minecraft:uniform", max: 6, min: 4 },
              function: "minecraft:set_count",
            },
          ],
          name: "minecraft:bone",
          weight: 25,
        },
        {
          type: "minecraft:item",
          functions: [
            {
              add: !1,
              count: { type: "minecraft:uniform", max: 3, min: 1 },
              function: "minecraft:set_count",
            },
          ],
          name: "minecraft:spider_eye",
          weight: 25,
        },
        {
          type: "minecraft:item",
          functions: [
            {
              add: !1,
              count: { type: "minecraft:uniform", max: 7, min: 3 },
              function: "minecraft:set_count",
            },
          ],
          name: "minecraft:rotten_flesh",
          weight: 25,
        },
        { type: "minecraft:item", name: "minecraft:saddle", weight: 20 },
        {
          type: "minecraft:item",
          name: "minecraft:iron_horse_armor",
          weight: 15,
        },
        {
          type: "minecraft:item",
          name: "minecraft:golden_horse_armor",
          weight: 10,
        },
        {
          type: "minecraft:item",
          name: "minecraft:diamond_horse_armor",
          weight: 5,
        },
        {
          type: "minecraft:item",
          functions: [{ function: "minecraft:enchant_randomly" }],
          name: "minecraft:book",
          weight: 20,
        },
        { type: "minecraft:item", name: "minecraft:golden_apple", weight: 20 },
        {
          type: "minecraft:item",
          name: "minecraft:enchanted_golden_apple",
          weight: 2,
        },
        { type: "minecraft:empty", weight: 15 },
      ],
      rolls: { type: "minecraft:uniform", max: 4, min: 2 },
    },
    {
      bonus_rolls: 0,
      entries: [
        {
          type: "minecraft:item",
          functions: [
            {
              add: !1,
              count: { type: "minecraft:uniform", max: 8, min: 1 },
              function: "minecraft:set_count",
            },
          ],
          name: "minecraft:bone",
          weight: 10,
        },
        {
          type: "minecraft:item",
          functions: [
            {
              add: !1,
              count: { type: "minecraft:uniform", max: 8, min: 1 },
              function: "minecraft:set_count",
            },
          ],
          name: "minecraft:gunpowder",
          weight: 10,
        },
        {
          type: "minecraft:item",
          functions: [
            {
              add: !1,
              count: { type: "minecraft:uniform", max: 8, min: 1 },
              function: "minecraft:set_count",
            },
          ],
          name: "minecraft:rotten_flesh",
          weight: 10,
        },
        {
          type: "minecraft:item",
          functions: [
            {
              add: !1,
              count: { type: "minecraft:uniform", max: 8, min: 1 },
              function: "minecraft:set_count",
            },
          ],
          name: "minecraft:string",
          weight: 10,
        },
        {
          type: "minecraft:item",
          functions: [
            {
              add: !1,
              count: { type: "minecraft:uniform", max: 8, min: 1 },
              function: "minecraft:set_count",
            },
          ],
          name: "minecraft:sand",
          weight: 10,
        },
      ],
      rolls: 4,
    },
    {
      bonus_rolls: 0,
      entries: [
        { type: "minecraft:empty", weight: 6 },
        {
          type: "minecraft:item",
          functions: [{ add: !1, count: 2, function: "minecraft:set_count" }],
          name: "minecraft:dune_armor_trim_smithing_template",
        },
      ],
      rolls: 1,
    },
  ];
var Lf = { type: Ff, pools: Pf };
const Nf = [
  {
    rolls: { min: 2, max: 4 },
    entries: [
      {
        type: "item",
        name: "minecraft:diamond",
        functions: [{ function: "set_count", count: { min: 1, max: 3 } }],
        weight: 5,
      },
      {
        type: "item",
        name: "minecraft:iron_ingot",
        functions: [{ function: "set_count", count: { min: 1, max: 5 } }],
        weight: 15,
      },
      {
        type: "item",
        name: "minecraft:gold_ingot",
        functions: [{ function: "set_count", count: { min: 2, max: 7 } }],
        weight: 15,
      },
      {
        type: "item",
        name: "minecraft:emerald",
        functions: [{ function: "set_count", count: { min: 1, max: 3 } }],
        weight: 15,
      },
      {
        type: "item",
        name: "minecraft:bone",
        functions: [{ function: "set_count", count: { min: 4, max: 6 } }],
        weight: 25,
      },
      {
        type: "item",
        name: "minecraft:spider_eye",
        functions: [{ function: "set_count", count: { min: 1, max: 3 } }],
        weight: 25,
      },
      {
        type: "item",
        name: "minecraft:rotten_flesh",
        functions: [{ function: "set_count", count: { min: 3, max: 7 } }],
        weight: 25,
      },
      {
        type: "item",
        name: "minecraft:leather",
        functions: [
          { function: "set_count", count: { min: 1, max: 5 }, add: !1 },
        ],
        weight: 20,
      },
      { type: "item", name: "minecraft:horsearmoriron", weight: 15 },
      { type: "item", name: "minecraft:horsearmorgold", weight: 10 },
      { type: "item", name: "minecraft:horsearmordiamond", weight: 5 },
      {
        type: "item",
        name: "minecraft:book",
        weight: 20,
        functions: [{ function: "enchant_randomly" }],
      },
      { type: "item", name: "minecraft:golden_apple", weight: 20 },
      { type: "item", name: "minecraft:appleEnchanted", weight: 2 },
      { type: "empty", weight: 15 },
    ],
  },
  {
    rolls: 4,
    entries: [
      {
        type: "item",
        name: "minecraft:bone",
        weight: 10,
        functions: [{ function: "set_count", count: { min: 1, max: 8 } }],
      },
      {
        type: "item",
        name: "minecraft:gunpowder",
        weight: 10,
        functions: [{ function: "set_count", count: { min: 1, max: 8 } }],
      },
      {
        type: "item",
        name: "minecraft:rotten_flesh",
        weight: 10,
        functions: [{ function: "set_count", count: { min: 1, max: 8 } }],
      },
      {
        type: "item",
        name: "minecraft:string",
        weight: 10,
        functions: [{ function: "set_count", count: { min: 1, max: 8 } }],
      },
      {
        type: "item",
        name: "minecraft:sand",
        weight: 10,
        functions: [{ function: "set_count", count: { min: 1, max: 8 } }],
      },
    ],
  },
  {
    rolls: 1,
    entries: [
      { type: "empty", weight: 6 },
      {
        type: "item",
        name: "minecraft:dune_armor_trim_smithing_template",
        weight: 1,
        functions: [{ function: "set_count", count: 2 }],
      },
    ],
  },
];
var Hf = { pools: Nf };
const Df = [
  {
    rolls: { min: 2, max: 4 },
    entries: [
      {
        type: "item",
        name: "minecraft:diamond",
        functions: [{ function: "set_count", count: { min: 1, max: 3 } }],
        weight: 5,
      },
      {
        type: "item",
        name: "minecraft:iron_ingot",
        functions: [{ function: "set_count", count: { min: 1, max: 5 } }],
        weight: 15,
      },
      {
        type: "item",
        name: "minecraft:gold_ingot",
        functions: [{ function: "set_count", count: { min: 2, max: 7 } }],
        weight: 15,
      },
      {
        type: "item",
        name: "minecraft:emerald",
        functions: [{ function: "set_count", count: { min: 1, max: 3 } }],
        weight: 15,
      },
      {
        type: "item",
        name: "minecraft:bone",
        functions: [{ function: "set_count", count: { min: 4, max: 6 } }],
        weight: 25,
      },
      {
        type: "item",
        name: "minecraft:spider_eye",
        functions: [{ function: "set_count", count: { min: 1, max: 3 } }],
        weight: 25,
      },
      {
        type: "item",
        name: "minecraft:rotten_flesh",
        functions: [{ function: "set_count", count: { min: 3, max: 7 } }],
        weight: 25,
      },
      { type: "item", name: "minecraft:saddle", weight: 20 },
      { type: "item", name: "minecraft:horsearmoriron", weight: 15 },
      { type: "item", name: "minecraft:horsearmorgold", weight: 10 },
      { type: "item", name: "minecraft:horsearmordiamond", weight: 5 },
      {
        type: "item",
        name: "minecraft:book",
        weight: 20,
        functions: [{ function: "enchant_randomly" }],
      },
      { type: "item", name: "minecraft:golden_apple", weight: 20 },
      { type: "item", name: "minecraft:appleEnchanted", weight: 2 },
      { type: "empty", weight: 15 },
    ],
  },
  {
    rolls: 4,
    entries: [
      {
        type: "item",
        name: "minecraft:bone",
        weight: 10,
        functions: [{ function: "set_count", count: { min: 1, max: 8 } }],
      },
      {
        type: "item",
        name: "minecraft:gunpowder",
        weight: 10,
        functions: [{ function: "set_count", count: { min: 1, max: 8 } }],
      },
      {
        type: "item",
        name: "minecraft:rotten_flesh",
        weight: 10,
        functions: [{ function: "set_count", count: { min: 1, max: 8 } }],
      },
      {
        type: "item",
        name: "minecraft:string",
        weight: 10,
        functions: [{ function: "set_count", count: { min: 1, max: 8 } }],
      },
      {
        type: "item",
        name: "minecraft:sand",
        weight: 10,
        functions: [{ function: "set_count", count: { min: 1, max: 8 } }],
      },
    ],
  },
];
var Wf = { pools: Df };
const Gf = [
  {
    rolls: { min: 2, max: 4 },
    entries: [
      {
        type: "item",
        name: "minecraft:diamond",
        functions: [{ function: "set_count", count: { min: 1, max: 3 } }],
        weight: 5,
      },
      {
        type: "item",
        name: "minecraft:iron_ingot",
        functions: [{ function: "set_count", count: { min: 1, max: 5 } }],
        weight: 15,
      },
      {
        type: "item",
        name: "minecraft:gold_ingot",
        functions: [{ function: "set_count", count: { min: 2, max: 7 } }],
        weight: 15,
      },
      {
        type: "item",
        name: "minecraft:emerald",
        functions: [{ function: "set_count", count: { min: 1, max: 3 } }],
        weight: 15,
      },
      {
        type: "item",
        name: "minecraft:bone",
        functions: [{ function: "set_count", count: { min: 4, max: 6 } }],
        weight: 25,
      },
      {
        type: "item",
        name: "minecraft:spider_eye",
        functions: [{ function: "set_count", count: { min: 1, max: 3 } }],
        weight: 25,
      },
      {
        type: "item",
        name: "minecraft:rotten_flesh",
        functions: [{ function: "set_count", count: { min: 3, max: 7 } }],
        weight: 25,
      },
      {
        type: "item",
        name: "minecraft:leather",
        functions: [
          { function: "set_count", count: { min: 1, max: 5 }, add: !1 },
        ],
        weight: 20,
      },
      { type: "item", name: "minecraft:horsearmoriron", weight: 15 },
      { type: "item", name: "minecraft:copper_horse_armor", weight: 15 },
      { type: "item", name: "minecraft:horsearmorgold", weight: 10 },
      { type: "item", name: "minecraft:horsearmordiamond", weight: 5 },
      {
        type: "item",
        name: "minecraft:book",
        weight: 20,
        functions: [{ function: "enchant_randomly" }],
      },
      { type: "item", name: "minecraft:golden_apple", weight: 20 },
      { type: "item", name: "minecraft:appleEnchanted", weight: 2 },
      { type: "empty", weight: 15 },
    ],
  },
  {
    rolls: 4,
    entries: [
      {
        type: "item",
        name: "minecraft:bone",
        weight: 10,
        functions: [{ function: "set_count", count: { min: 1, max: 8 } }],
      },
      {
        type: "item",
        name: "minecraft:gunpowder",
        weight: 10,
        functions: [{ function: "set_count", count: { min: 1, max: 8 } }],
      },
      {
        type: "item",
        name: "minecraft:rotten_flesh",
        weight: 10,
        functions: [{ function: "set_count", count: { min: 1, max: 8 } }],
      },
      {
        type: "item",
        name: "minecraft:string",
        weight: 10,
        functions: [{ function: "set_count", count: { min: 1, max: 8 } }],
      },
      {
        type: "item",
        name: "minecraft:sand",
        weight: 10,
        functions: [{ function: "set_count", count: { min: 1, max: 8 } }],
      },
    ],
  },
  {
    rolls: 1,
    entries: [
      { type: "empty", weight: 6 },
      {
        type: "item",
        name: "minecraft:dune_armor_trim_smithing_template",
        weight: 1,
        functions: [{ function: "set_count", count: 2 }],
      },
    ],
  },
];
var jf = { pools: Gf };
const ei = (e, t) => {
    if (Array.isArray(e))
      for (let n = 0; n < e.length; n++)
        typeof e[n] == "string" ? (e[n] = t(e[n])) : ei(e[n], t);
    if (typeof e == "object" && e !== null) {
      const n = e;
      for (const [r, i] of Object.entries(e))
        typeof i == "string" ? (n[r] = t(i)) : ei(n[r], t);
    }
  },
  Uf = (e, t) => {
    if (e.edition === _.Java && e.javaVersion >= p.V1_21_9) return Rf;
    if (e.edition === _.Java && e.javaVersion >= p.V1_18) return Lf;
    if (e.edition === _.Bedrock && e.bedrockVersion >= S.V1_21_110) return jf;
    if (e.edition === _.Bedrock && e.bedrockVersion >= S.V1_21_90) return Hf;
    if (e.edition === _.Bedrock && e.bedrockVersion >= S.V1_18) return Wf;
    throw new Error(`Loot table ${t} not found`);
  },
  Zf = (e, t) => {
    const n = Uf(e, t);
    return (ei(n, (r) => (r.startsWith("minecraft:") ? r.slice(10) : r)), n);
  },
  Jf = [
    { name: "protection", category: "ARMOR", minLevel: 1, maxLevel: 4 },
    { name: "fire_protection", category: "ARMOR", minLevel: 1, maxLevel: 4 },
    {
      name: "feather_falling",
      category: "ARMOR_FEET",
      minLevel: 1,
      maxLevel: 4,
    },
    { name: "blast_protection", category: "ARMOR", minLevel: 1, maxLevel: 4 },
    {
      name: "projectile_protection",
      category: "ARMOR",
      minLevel: 1,
      maxLevel: 4,
    },
    { name: "respiration", category: "ARMOR_HEAD", minLevel: 1, maxLevel: 3 },
    { name: "aqua_affinity", category: "ARMOR_HEAD", minLevel: 1, maxLevel: 1 },
    { name: "thorns", category: "ARMOR_CHEST", minLevel: 1, maxLevel: 3 },
    { name: "depth_strider", category: "ARMOR_FEET", minLevel: 1, maxLevel: 3 },
    { name: "frost_walker", category: "ARMOR_FEET", minLevel: 1, maxLevel: 2 },
    { name: "binding_curse", category: "WEARABLE", minLevel: 1, maxLevel: 1 },
    { name: "sharpness", category: "WEAPON", minLevel: 1, maxLevel: 5 },
    { name: "smite", category: "WEAPON", minLevel: 1, maxLevel: 5 },
    {
      name: "bane_of_arthropods",
      category: "WEAPON",
      minLevel: 1,
      maxLevel: 5,
    },
    { name: "knockback", category: "WEAPON", minLevel: 1, maxLevel: 2 },
    { name: "fire_aspect", category: "WEAPON", minLevel: 1, maxLevel: 2 },
    { name: "looting", category: "WEAPON", minLevel: 1, maxLevel: 3 },
    { name: "sweeping", category: "WEAPON", minLevel: 1, maxLevel: 3 },
    { name: "efficiency", category: "DIGGER", minLevel: 1, maxLevel: 5 },
    { name: "silk_touch", category: "DIGGER", minLevel: 1, maxLevel: 1 },
    { name: "unbreaking", category: "BREAKABLE", minLevel: 1, maxLevel: 3 },
    { name: "fortune", category: "DIGGER", minLevel: 1, maxLevel: 3 },
    { name: "power", category: "BOW", minLevel: 1, maxLevel: 5 },
    { name: "punch", category: "BOW", minLevel: 1, maxLevel: 2 },
    { name: "flame", category: "BOW", minLevel: 1, maxLevel: 1 },
    { name: "infinity", category: "BOW", minLevel: 1, maxLevel: 1 },
    {
      name: "luck_of_the_sea",
      category: "FISHING_ROD",
      minLevel: 1,
      maxLevel: 3,
    },
    { name: "lure", category: "FISHING_ROD", minLevel: 1, maxLevel: 3 },
    { name: "loyalty", category: "TRIDENT", minLevel: 1, maxLevel: 3 },
    { name: "impaling", category: "TRIDENT", minLevel: 1, maxLevel: 5 },
    { name: "riptide", category: "TRIDENT", minLevel: 1, maxLevel: 3 },
    { name: "channeling", category: "TRIDENT", minLevel: 1, maxLevel: 1 },
    { name: "multishot", category: "CROSSBOW", minLevel: 1, maxLevel: 1 },
    { name: "quick_charge", category: "CROSSBOW", minLevel: 1, maxLevel: 3 },
    { name: "piercing", category: "CROSSBOW", minLevel: 1, maxLevel: 4 },
    { name: "mending", category: "BREAKABLE", minLevel: 1, maxLevel: 1 },
    {
      name: "vanishing_curse",
      category: "VANISHABLE",
      minLevel: 1,
      maxLevel: 1,
    },
  ],
  Xf = {
    golden_sword: [11, 12, 13, 14, 15, 16, 17, 20, 35, 36],
    golden_axe: [11, 12, 13, 18, 19, 20, 21, 35, 36],
    golden_hoe: [18, 19, 20, 21, 35, 36],
    golden_shovel: [18, 19, 20, 21, 35, 36],
    golden_pickaxe: [18, 19, 20, 21, 35, 36],
    golden_boots: [0, 1, 2, 3, 4, 7, 8, 9, 10, 20, 35, 36],
    golden_chestplate: [0, 1, 3, 4, 7, 10, 20, 35, 36],
    golden_helmet: [0, 1, 3, 4, 5, 6, 7, 10, 20, 35, 36],
    golden_leggings: [0, 1, 3, 4, 7, 10, 20, 35, 36],
  },
  $f = (e) => Jf,
  Kf = (e, t) => {
    const n = $f();
    if (t === "book") return n;
    const r = Xf[t];
    if (!r) throw new Error("Enchantments for " + t + " unknown");
    return r.map((i) => n[i]);
  };
function Qf({ world: e, lootTableKey: t, randomSeed: n }) {
  const r = Zf(e, t),
    i = e.edition === _.Java ? new Se(n) : new oe(n),
    o = [];
  try {
    for (const s of r.pools) {
      const a = s.entries.reduce((l, u) => l + (u.weight ?? 1), 0);
      if (a <= 0 || s.entries.length < 1) continue;
      let c = null;
      (typeof s.rolls == "number"
        ? (e.edition === _.Bedrock && i.nextInt(), (c = s.rolls))
        : (c = ti(s.rolls.min, s.rolls.max, i)),
        e.edition === _.Bedrock && i.nextFloat());
      for (let l = 0; l < c; l++)
        if (e.edition === _.Java && s.entries.length === 1)
          s.entries[0].type === "item" && o.push(Ho(s.entries[0], i, e));
        else {
          let u = i.nextInt(a);
          for (const d of s.entries)
            if (((u -= d.weight ?? 1), u < 0)) {
              d.type === "item" && o.push(Ho(d, i, e));
              break;
            }
        }
    }
  } finally {
    i.free();
  }
  return o;
}
function Ho(e, t, n) {
  return (e.functions || []).reduce((r, i) => qf(r, i, t, n), {
    name: e.name,
    count: 1,
  });
}
function qf(e, t, n, r) {
  if (t.function === "set_data") return e;
  if (t.function === "set_count")
    return (
      r.edition === _.Bedrock && t.count.min === t.count.max && n.nextInt(1),
      { ...e, count: ti(t.count.min, t.count.max, n) }
    );
  if (t.function === "enchant_randomly") {
    if (r.edition === _.Bedrock)
      return (n.nextInt(), { ...e, enchantment: "unknown" });
    const i = Kf(r, e.name),
      { name: o, minLevel: s, maxLevel: a } = i[n.nextInt(i.length)],
      c = ti(s, a, n);
    return {
      name: e.name === "book" ? "enchanted_book" : e.name,
      count: 1,
      enchantment: { name: o, level: c },
    };
  }
  throw new Error(`Function ${t.function} not implemented`);
}
function ti(e, t, n) {
  const r = Math.floor(e),
    i = Math.floor(t);
  return r >= i ? r : n.nextInt(i - r + 1) + r;
}
const Yf = (e) => e.reduce((t, n) => t.concat(n), []),
  ed = { enchanted_golden_apple: ["enchanted_golden_apple", "appleEnchanted"] },
  td = {
    supportsWorld: (e) => W(g.ItemOverworld, e),
    create: async (e, t, n) => {
      const r = await pa.create(e, t, n),
        i = rd(e);
      return async (o) => {
        const s = await r(o),
          a = [];
        for (const c of s) {
          const l = i(c);
          Yf(
            l.map((f) =>
              Qf({ world: e, lootTableKey: "desert_pyramid", randomSeed: f }),
            ),
          ).find((f) => ed.enchanted_golden_apple.includes(f.name)) &&
            a.push([...c, [{ item: "enchanted_golden_apple" }]]);
        }
        return a;
      };
    },
  },
  nd = (e) => (e >= p.V26_3 ? 19 : e >= p.V1_19_3 ? 1 : 3),
  rd = (e) => {
    if (e.edition === _.Bedrock) {
      const t = lr(e);
      return (n) => {
        const r = new oe(t(n[0], n[1]));
        r.nextInt();
        const i = [
          V.fromInt(r.nextInt()),
          V.fromInt(r.nextInt()),
          V.fromInt(r.nextInt()),
          V.fromInt(r.nextInt()),
        ];
        return (r.free(), i);
      };
    } else
      return (t) => {
        const n = js(e, t[0] * 16, t[1] * 16),
          r = ba(e, n, nd(e.javaVersion), 4);
        r.nextInt(3);
        const i = [r.nextLong(), r.nextLong(), r.nextLong(), r.nextLong()];
        return (r.free(), i);
      };
  },
  id = {
    supportsWorld: (e) => W(g.OreVein, e),
    async create(e, t) {
      const n = new $c(e),
        r = t.overworld.noise(),
        i = async (o) => {
          const s = n.find(o, r);
          return Xe(s, (a) => [a.reference[0] >> 4, a.reference[2] >> 4]);
        };
      return ((i.free = () => n.free()), i);
    },
  };
class od {
  rustFinder;
  constructor(t) {
    this.rustFinder = new Or(de(t));
  }
  find(t, n) {
    return this.rustFinder.a(t.provider, n.x, n.z, n.sizeX, n.sizeZ);
  }
  free() {
    this.rustFinder.free();
  }
}
const sd = {
    supportsWorld: (e) => W(g.Cave, e),
    async create(e, t) {
      const n = new od(e),
        r = t.overworld.noise(),
        i = async (o) => {
          const s = n.find(r, o);
          return Xe(s, (a) => [
            a.reference.pos[0] >> 4,
            a.reference.pos[2] >> 4,
          ]);
        };
      return ((i.free = () => n.free()), i);
    },
  },
  ad =
    ({ provider: e, heightType: t }) =>
    (n, r, i) => {
      i([n[0], e.getSurfaceBlock(n[0], n[2], t, "topmostAccurate"), n[2]]);
    },
  cd = {
    supportsWorld: (e) => W(g.DesertWell, e),
    create: async function (e, t) {
      return e.edition === _.Java
        ? ld(e, t.overworld.noise())
        : ud(e, t.overworld);
    },
  };
function Sa(e, t) {
  const n = t[0];
  let r = t[1] + 1;
  const i = t[2];
  let o;
  for (; (o = e.getNoiseBlock(n, r, i, !1)) === Wt.Air;) r -= 1;
  if (!rl(o)) return null;
  for (let s = -2; s <= 2; s++)
    for (let a = -2; a <= 2; a++)
      if (
        e.getNoiseBlock(n + s, r - 1, i + a, !1) === Wt.Air &&
        e.getNoiseBlock(n + s, r - 2, i + a, !1) === Wt.Air
      )
        return null;
  return r;
}
function ld(e, t) {
  return async (n) => {
    const r = [];
    return (
      ue(n, (i, o) => {
        const s = nt(e, i, o, {
          decorationStepOrdinal: 4,
          featureIndex: 2,
          placement: [
            rt({ chance: 1e3 }),
            wt(),
            ad({ provider: t, heightType: "oceanFloor" }),
            Ut({ provider: t, allowedBiomes: [Y] }),
          ],
          feature: sn(),
        });
        if (s.length < 1) return;
        const a = Sa(t, s[0][0]);
        if (a == null) return;
        const c = [s[0][0][0], a, s[0][0][2]];
        r.push([i, o, c]);
      }),
      r
    );
  };
}
function ud(e, t) {
  const n = t.noise(),
    r = new Hn(e, "minecraft:desert_after_surface_desert_well_feature"),
    i = (s, a, c) => ur(n, s, a, c) === Y,
    o = async (s) => {
      const a = [];
      return (
        ue(s, (c, l) => {
          if (!i(c * 16 + 8, 128, l * 16 + 8)) return;
          const u = r.getSeedForChunk(c, l),
            d = new oe(u);
          if (d.nextInt(500) >= 1) {
            d.free();
            return;
          }
          const f = l * 16 + Kr(d, 0, 16),
            m = c * 16 + Kr(d, 0, 16);
          if ((d.free(), !i(m, 128, f))) return;
          const h = n.getSurfaceBlock(m, f, "oceanFloor", "topmostAccurate"),
            w = Sa(n, [m, h, f]);
          w != null && a.push([c, l, [m, w, f]]);
        }),
        a
      );
    };
  return (
    (o.free = () => {
      r.free();
    }),
    o
  );
}
const fd = [
    ["tower_1", 1, [5, 13, 5]],
    ["tower_2", 1, [5, 13, 5]],
    ["tower_3", 1, [7, 13, 7]],
    ["tower_4", 1, [7, 13, 7]],
    ["tower_5", 1, [7, 13, 7]],
  ],
  Do = [we, Re, Mt, nn, tr, vt],
  dd = {
    supportsWorld: (e) => W(g.TrailRuin, e),
    create: async (e, t) => {
      const n = t.overworld.noise(),
        r = e.edition === _.Bedrock && e.bedrockVersion >= S.V1_20_60;
      return q(
        e,
        {
          spacing: 34,
          separation: 8,
          salt: 83469867,
          linearSeparation: e.edition === _.Java || r,
          forceRngType: r ? "java" : void 0,
        },
        async (i, o) => {
          if (e.edition === _.Java || r) {
            const c = Ft({
              world: e,
              biomeProvider: t.overworld.noise(),
              chunkX: i,
              chunkZ: o,
              initialY: -15,
              projectionY: {
                heightType: "worldSurface",
                surfaceCheckType: "topmostAccurate",
              },
              allowedBiomes: Do,
              structures: fd,
            });
            return c ? [c.x, c.y + 10, c.z] : !1;
          }
          const s = n.getPreliminarySurfaceLevel(i * 4, o * 4),
            a = Je(n.getNoiseBiomeBlock(i * 16, s - 20, o * 16));
          return Do.includes(a) ? [i * 16 + 8, null, o * 16 + 8] : !1;
        },
        (i, o, s, a) => a,
        { x0: 0, z0: 0, x1: 1, z1: 1 },
        (i) => [i[0] >> 4, i[2] >> 4],
        !0,
      );
    },
  };
class md {
  rustFinder;
  constructor(t) {
    this.rustFinder = new Pr(de(t));
  }
  find(t, n) {
    return this.rustFinder.a(t.provider, n.x, n.z, n.sizeX, n.sizeZ);
  }
  free() {
    this.rustFinder.free();
  }
}
class gd {
  helper;
  constructor(t) {
    this.helper = new Lr(de(t));
  }
  findPositionsBedrock(t, n, r, i, o) {
    return this.helper.b(t.provider, n, r, i, o);
  }
  testFeaturePositionsJava(t, n) {
    return this.helper.a(t.provider, n);
  }
  free() {
    this.helper.free();
  }
}
const hd = {
  supportsWorld: (e) => W(g.LavaPool, e),
  create: async (e, t) => {
    const n = new md(e),
      r = new gd(e),
      i = t.overworld.noise(),
      o = async (s) => {
        const a = n.find(i, s),
          c =
            e.edition === _.Bedrock
              ? await pd(e, s, r, i)
              : await _d(e, s, r, i),
          l = [
            ...a.map((u) => ({
              type: "cave",
              pos: u.reference.pos,
              count: u.count,
            })),
            ...c.map((u) => ({ type: "undergroundLake", pos: u })),
          ];
        return Xe(l, (u) => [u.pos[0] >> 4, u.pos[2] >> 4]).filter((u) =>
          Be(s, { x: u[0], z: u[1] }),
        );
      };
    return (
      (o.free = () => {
        (n.free(), r.free());
      }),
      o
    );
  },
};
async function pd(e, t, n, r) {
  const i = tt(t, { x1: 1, z1: 1 });
  return (
    await Ti(async (s) => {
      const a = n.findPositionsBedrock(r, s.x, s.z, s.sizeX, s.sizeZ);
      return Xe(a, (c) => [c[0] >> 4, c[2] >> 4]);
    }, 20)(i)
  ).reduce((s, a) => (s.push(...a[2]), s), []);
}
async function _d(e, t, n, r) {
  const i = e.javaVersion >= p.V26_1 ? t : tt(t, { x0: -1, z0: -1 });
  return (
    await Ti(async (s) => {
      const a = [];
      if (
        (ue(s, (l, u) => {
          const d = nt(e, l, u, {
            decorationStepOrdinal: 1,
            featureIndex: 0,
            placement: [
              rt({ chance: 9 }),
              wt(),
              Nn.uniform({ minInclusive: 0, maxInclusive: 319 }),
              Ut({ provider: r, disallowedBiomes: [_t] }),
            ],
            feature: sn(),
          }).flat();
          a.push(...d);
        }),
        a.length < 1)
      )
        return [];
      const c = n.testFeaturePositionsJava(r, a);
      return Xe(c, (l) => [l[0] >> 4, l[2] >> 4]);
    }, 20)(i)
  ).reduce((s, a) => (s.push(...a[2]), s), []);
}
const yd = {
    supportsWorld: (e) => W(g.AbandonedCamp, e),
    async create(e, t) {
      const n = t.overworld.noise(),
        r = qc(e, n),
        i = async (o) => r(o).map((s) => [s.x >> 4, s.z >> 4, s]);
      return ((i.free = r.free), i);
    },
  },
  ni = {
    [g.BuriedTreasure]: ca,
    [g.Dungeon]: Gl,
    [g.NetherFortress]: eu,
    [g.BastionRemnant]: Il,
    [g.EndCity]: $l,
    [g.SlimeChunk]: vu,
    [g.Stronghold]: Vu,
    [g.Village]: dr,
    [g.Mineshaft]: Bi,
    [g.WoodlandMansion]: Wu,
    [g.PillagerOutpost]: Uu,
    [g.OceanRuin]: Ku,
    [g.OceanMonument]: Ii,
    [g.Shipwreck]: yu,
    [g.DesertTemple]: pa,
    [g.JungleTemple]: hu,
    [g.WitchHut]: pu,
    [g.Igloo]: _u,
    [g.RuinedPortalOverworld]: cu,
    [g.RuinedPortalNether]: fu,
    [g.Spawn]: Yu,
    [g.Fossil]: of,
    [g.FossilNether]: uf,
    [g.Ravine]: df,
    [g.EndGateway]: vf,
    [g.AmethystGeode]: Bf,
    [g.AncientCity]: Mf,
    [g.ItemOverworld]: td,
    [g.OreVein]: id,
    [g.Cave]: sd,
    [g.DesertWell]: cd,
    [g.TrailRuin]: dd,
    [g.TrialChamber]: Qr,
    [g.LavaPool]: hd,
    [g.AbandonedCamp]: yd,
  },
  xa = (e, t) => ni[e].finiteGenerationArea?.(t) ?? null,
  wd = (e, t, n) => {
    let r = "idle";
    const i = {},
      o = async (s, a) => {
        if (r !== "idle")
          throw new Error(`illegal state for finding pois: ${r}`);
        r = "running";
        try {
          const c = await Promise.all(
            a.map(async (l) => {
              if (!i[l]) {
                if (!ni[l].supportsWorld(e)) return [l, []];
                i[l] = await ni[l].create(e, t, n);
              }
              return [l, await i[l](s)];
            }),
          );
          return Object.fromEntries(c);
        } finally {
          r = "idle";
        }
      };
    return (
      (o.free = () => {
        if (r !== "idle") throw new Error(`illegal state freeing pois: ${r}`);
        (Object.values(i).forEach((s) => {
          s.free && s.free();
        }),
          (r = "freed"));
      }),
      o
    );
  };
let ri;
function bd(e) {
  ri = e;
}
const Pt = yl(
    (e) => {
      const t = {},
        n = {
          get [y.Overworld]() {
            return (t[y.Overworld] ??= ll(e));
          },
          get [y.Nether]() {
            return (t[y.Nether] ??= ul(e));
          },
          get [y.End]() {
            return (t[y.End] ??= new bi(e));
          },
        },
        r = wd(e, n, {
          sharedTask: async (o, s) => {
            const a = Jr(e);
            return ri ? await ri(a + "--" + o, vs(s)) : await s();
          },
        });
      return {
        providers: n,
        poiFinder: r,
        freeBuiltProviders: () => {
          (t[y.Overworld]?.free(), t[y.Nether]?.free(), t[y.End]?.free());
        },
      };
    },
    ({ freeBuiltProviders: e, poiFinder: t }) => {
      (e(), t.free());
    },
    Jr,
  ),
  Ca = 1e-9;
function Ta(e, t, n) {
  const r = e[0] - t[0],
    i = e[2] - t[2],
    o = n && e[1] != null && t[1] != null ? e[1] - t[1] : 0;
  return r * r + o * o + i * i;
}
function Vi(e) {
  return Math.max(1, Math.abs(e)) * Ca;
}
function D(e, t) {
  return Math.floor(e / t);
}
function Dn(e, t) {
  return e - D(e, t) * t;
}
function vd(e, t, n, r) {
  const i = n[0] - t[0],
    o = n[2] - t[2],
    s = i * i + o * o;
  if (s === 0 || s > 4 * r) return;
  const a = (t[0] + n[0]) / 2,
    c = (t[2] + n[2]) / 2,
    l = r - s / 4;
  if (l <= 0) {
    e.push([a, null, c]);
    return;
  }
  const u = Math.sqrt(l / s),
    d = -o * u,
    f = i * u;
  e.push([a + d, null, c + f], [a - d, null, c - f]);
}
function Sd(e, t, n, r, i) {
  const o = t[1],
    s = n[0] - t[0],
    a = n[1] - o,
    c = n[2] - t[2],
    l = r[0] - t[0],
    u = r[1] - o,
    d = r[2] - t[2],
    f = s * s + a * a + c * c,
    m = l * l + u * u + d * d,
    h = s * l + a * u + c * d,
    w = f * m - h * h;
  if (w < 1e-9) return;
  const v = ((f / 2) * m - (m / 2) * h) / w,
    x = (f * (m / 2) - h * (f / 2)) / w,
    C = t[0] + v * s + x * l,
    E = o + v * a + x * u,
    k = t[2] + v * c + x * d,
    M = (C - t[0]) * (C - t[0]) + (E - o) * (E - o) + (k - t[2]) * (k - t[2]),
    I = i - M;
  if (I < 0) return;
  if (I === 0) {
    e.push([C, E, k]);
    return;
  }
  const A = a * d - c * u,
    L = c * l - s * d,
    P = s * u - a * l,
    R = Math.sqrt(I / w);
  e.push([C + A * R, E + L * R, k + P * R], [C - A * R, E - L * R, k - P * R]);
}
const Wo = "depth0",
  xd = "oceanFloor",
  Cd = "enhancedNoCaves",
  Mi = 62;
async function Td(e, t, n, r, i, o, s, a) {
  const c = Rt(e),
    { providers: l } = Pt(c),
    { biomes: u, heights: d } = ze(
      l,
      t,
      n,
      r,
      i,
      o,
      s,
      a.mode === "biomes"
        ? { mode: "biomes", getBiomesAt: a.getBiomesAt ?? Wo }
        : {
            mode: "biomesAndHeights",
            getBiomesAt: a.getBiomesAt ?? Wo,
            getHeightLevelAt: a.getHeightLevelAt ?? xd,
            surfaceCheckType: a.surfaceCheckType ?? Cd,
          },
    ),
    f =
      d && a.mode === "biomesAndHeights" && a.enableTerrainShading
        ? Id(d, i, o, s)
        : null,
    m = new Uint8Array(i * o * 4),
    h = new Uint8Array(i * o * 3),
    w = a.biomeFilter ?? !1;
  for (let v = 0; v < u.length; v++) {
    const x = u[v],
      C = d?.[v],
      E = kd({ biome: x, height: C, shadingData: f?.[v], biomeFilter: w });
    if ((m.set(E, v * 4), (h[v * 3] = x), C != null)) {
      let k = Math.max(-16384, Math.min(16383, C));
      (k < 0 && (k += 32768),
        (k |= 32768),
        (h[v * 3 + 1] = k & 255),
        (h[v * 3 + 2] = (k >> 8) & 255));
    }
  }
  return bs({ rgba: m, data: h }, [m.buffer, h.buffer]);
}
function ze(e, t, n, r, i, o, s, a) {
  if (t === y.End) {
    if (a.mode === "heights")
      throw new Error("End does not support heights mode");
    return Bd(e, n, r, i, o, s);
  }
  const c = e[t];
  if (c instanceof et)
    return a.mode === "heights"
      ? {
          biomes: new Uint8Array(i * o),
          heights: c.getSurfaceArea(
            n,
            r,
            i,
            o,
            s,
            a.getHeightLevelAt,
            a.surfaceCheckType,
          ),
        }
      : a.mode === "biomes"
        ? typeof a.getBiomesAt == "number"
          ? {
              biomes: c.getNoiseBiomeArea(n, a.getBiomesAt >> 2, r, i, 1, o, s),
              heights: null,
            }
          : {
              biomes: c.getNoiseBiomeAreaAtHeightType(
                n,
                r,
                i,
                o,
                s,
                a.getBiomesAt,
              ),
              heights: null,
            }
        : c.getNoiseBiomeAreaAtHeightTypeWithSurface(
            n,
            r,
            i,
            o,
            s,
            a.getBiomesAt,
            a.getHeightLevelAt,
            a.surfaceCheckType,
          );
  if (c instanceof vi) {
    if (a.mode === "heights")
      throw new Error("Legacy provider does not support heights mode");
    const l = new Uint8Array(i * o),
      u = c.getInts(n, r, i * s, o * s);
    for (let d = 0; d < o; d++)
      for (let f = 0; f < i; f++) {
        const m = d * i + f,
          h = Math.floor((d + 0.5) * s) * i * s + Math.floor((f + 0.5) * s);
        l[m] = u[h];
      }
    return { biomes: l, heights: null };
  }
  if (c instanceof Zs) {
    if (a.mode === "heights")
      throw new Error("Single biome provider does not support heights mode");
    const l = new Uint8Array(i * o);
    return (l.fill(c.getBiome()), { biomes: l, heights: null });
  }
  throw new Error("Unknown biome provider");
}
function Bd(e, t, n, r, i, o) {
  if (o >= 4)
    return { biomes: e[y.End].getBiomeArea(t, n, r, i, o), heights: null };
  if (o !== 1 && o !== 2) throw new Error("Invalid step");
  const s = D(t, 4),
    a = D(n, 4),
    c = D(t + (r - 1) * o, 4) - s + 1,
    l = D(n + (i - 1) * o, 4) - a + 1,
    u = e[y.End].getBiomeArea(s * 4, a * 4, c, l, 4),
    d = new Uint8Array(r * i);
  for (let f = 0; f < i; f++) {
    const m = (D(n + f * o, 4) - a) * c;
    for (let h = 0; h < r; h++) d[f * r + h] = u[m + D(t + h * o, 4) - s];
  }
  return { biomes: d, heights: null };
}
function Id(e, t, n, r) {
  const i = [],
    s = (1 / Math.sqrt(0.5)) * Math.sqrt(r / 4),
    a = 45,
    c = 315,
    l = s * 1,
    u = (Math.PI * a) / 180,
    d = (Math.PI * c) / 180,
    f = Math.cos(u),
    m = Math.sin(u);
  for (let h = 0; h < n; h++) {
    const w = Math.max(h - 1, 0),
      v = Math.min(h + 1, n - 1);
    for (let x = 0; x < t; x++) {
      const C = Math.max(x - 1, 0),
        E = Math.min(x + 1, t - 1),
        k = 0.025 * e[h * t + C],
        M = 0.025 * e[h * t + E],
        I = 0.025 * e[w * t + x],
        A = 0.025 * e[v * t + x],
        L = (M - k) / l,
        P = (A - I) / l,
        R = Math.atan(Math.sqrt(L * L + P * P));
      let z = Math.atan2(P, -L);
      z < 0
        ? (z = Math.PI / 2 - z)
        : z > Math.PI / 2
          ? (z = 2 * Math.PI - z + Math.PI / 2)
          : (z = Math.PI / 2 - z);
      const O = m * Math.cos(R) + f * Math.sin(R) * Math.cos(d - z);
      i[h * t + x] = Zr(Math.floor(256 * (O - 0.20710678118654746)), 0, 255);
    }
  }
  return i;
}
function Ed(e, t, n) {
  return [
    Math.round(e[0] * (1 - n) + t[0] * n),
    Math.round(e[1] * (1 - n) + t[1] * n),
    Math.round(e[2] * (1 - n) + t[2] * n),
  ];
}
function Tr(e, t) {
  const n = e / 256,
    r = t / 256;
  return n < 0.5
    ? Zr(Math.floor(2 * n * r * 256), 0, 255)
    : Zr(Math.floor((1 - 2 * (1 - n) * (1 - r)) * 256), 0, 255);
}
function kd({ biome: e, height: t, shadingData: n, biomeFilter: r }) {
  if (e === 255) return [0, 0, 0, 0];
  const i = Le[e];
  let o = i.rgb;
  if (t != null && n != null) {
    const a = t < Mi,
      c = i.category === "ocean" || i.category === "river",
      l = i.temperature <= 0.1;
    (a && !c
      ? l
        ? (o = Le[11].rgb)
        : (o = Le[7].rgb)
      : !a && c && (l ? (o = Le[26].rgb) : (o = Le[16].rgb)),
      (o = [Tr(n, o[0]), Tr(n, o[1]), Tr(n, o[2])]));
  }
  const s = [...o, 255];
  if (r)
    if (r.includes(e))
      ((s[0] = Math.round(o[0] * 0.6)),
        (s[1] = Math.round(o[1] * 0.6)),
        (s[2] = Math.round(o[2] * 0.6)));
    else {
      const a = Ed(_l, o, 0.1255);
      ((s[0] = a[0]), (s[1] = a[1]), (s[2] = a[2]));
    }
  return s;
}
async function Vd(e, t, n, r) {
  const i = Rt(e),
    { providers: o } = Pt(i);
  return o[y.Overworld].noise().getNoiseBiomeYColumn(t, n, r);
}
async function Md(e, t, n, r, i, o) {
  const s = { x: n, z: r, sizeX: i, sizeZ: o },
    a = Rt(e),
    { poiFinder: c } = Pt(a);
  return await c(s, t);
}
const Ba = {
    witnessPoiIds: Object.freeze([]),
    pois: Object.freeze([]),
    clusters: Object.freeze([]),
  },
  Zt = Object.freeze({ passed: !1, ...Ba }),
  Ad = Object.freeze({ passed: !0, ...Ba });
function Od(e, t, n) {
  if (e.shape.kind === "square") {
    const i = Math.max(1, Math.round(e.shape.inradius * 2)),
      o = (i - 1) >> 1;
    return {
      centerX: t,
      centerZ: n,
      minX: t - o,
      maxX: t + (i - 1 - o),
      minZ: n - o,
      maxZ: n + (i - 1 - o),
    };
  }
  const r = e.shape.radius;
  return {
    centerX: t,
    centerZ: n,
    minX: Math.floor(t - r),
    maxX: Math.ceil(t + r),
    minZ: Math.floor(n - r),
    maxZ: Math.ceil(n + r),
  };
}
function zd(e, t, n, r) {
  if (e.shape.kind === "square")
    return n >= t.minX && n <= t.maxX && r >= t.minZ && r <= t.maxZ;
  const i = n - t.centerX,
    o = r - t.centerZ;
  return i * i + o * o <= e.shape.radius * e.shape.radius;
}
async function an(e, t, n, r, i) {
  const o = e.stepQ ?? 1,
    s = Math.max(0, Math.ceil(((n.minX >> 2) - e.xQ0) / o)),
    a = Math.min(e.xLen, Math.floor(((n.maxX >> 2) - e.xQ0) / o) + 1),
    c = Math.max(0, Math.ceil(((n.minZ >> 2) - e.zQ0) / o)),
    l = Math.min(e.zLen, Math.floor(((n.maxZ >> 2) - e.zQ0) / o) + 1);
  for (let u = c; u < l; u++) {
    await r();
    const d = (e.zQ0 + u * o) * 4,
      f = d + 2;
    for (let m = s; m < a; m++) {
      const h = (e.xQ0 + m * o) * 4,
        w = h + 2;
      Rd(t, n, h, d) && i(u * e.xLen + m, w, f);
    }
  }
}
function Rd(e, t, n, r) {
  const i = n + 3,
    o = r + 3;
  if (e.shape.kind === "square")
    return i >= t.minX && n <= t.maxX && o >= t.minZ && r <= t.maxZ;
  const s = Math.max(n, Math.min(t.centerX, i)),
    a = Math.max(r, Math.min(t.centerZ, o)),
    c = s - t.centerX,
    l = a - t.centerZ;
  return c * c + l * l <= e.shape.radius * e.shape.radius;
}
const Fd = { barrel: "Barrel", chest: "Chest", special: "Special" },
  ii = "oxidized copper golem statue",
  Pd = {
    11: "wheat farm",
    12: "carrot farm",
    13: "pumpkin patch",
    14: "potato farm",
  },
  Ld = 2,
  Nd = { meadow: 1, savanna: 1, snowy_taiga: 2 },
  Hd = {
    bamboo_jungle: 1,
    cherry_grove: 4,
    snowy_taiga: 1,
    sparse_jungle: 1,
    swamp: 8,
  },
  Go = { biomeKey: "pale_garden", number: 3 };
function jo(e, t) {
  return t.length > 0 ? `${e} (${t.join(", ")})` : e;
}
function Dd(e, t) {
  const n = [],
    r = t.key;
  if (e.campsiteKind === "biome")
    (r === Go.biomeKey &&
      e.campsiteNumber === Go.number &&
      n.push("creaking heart"),
      r != null && Nd[r] === e.campsiteNumber && n.push(ii));
  else if (e.campsiteKind === "special") {
    e.campsiteNumber === Ld && n.push(ii);
    const i = Pd[e.campsiteNumber];
    i && n.push(i);
  }
  return n;
}
function Wd(e, t) {
  const n = t.key;
  return n != null && Hd[n] === e.tentNumber ? [ii] : [];
}
function Gd(e) {
  const t = Ue(e.campBiomeId),
    n = t.name,
    r =
      e.campsiteKind === "biome"
        ? `${n} ${e.campsiteNumber}`
        : `${Fd[e.campsiteKind]} ${e.campsiteNumber}`;
  return {
    campsite: jo(r, Dd(e, t)),
    tent: jo(`${n} ${e.tentNumber}`, Wd(e, t)),
  };
}
const he = {
  possible: (e) => ({ text: "Possible", hint: e, tone: "warning-strong" }),
  likely: (e) => ({ text: "Likely", hint: e, tone: "warning" }),
  offBy: (e, t) => ({ text: `±${e} blocks`, hint: t, tone: "warning" }),
  yUnreliable: (e) => ({ text: "Y unreliable", hint: e, tone: "warning" }),
  mayBeUnderground: (e) => ({
    text: "May be underground",
    hint: e,
    tone: "neutral",
  }),
};
function $(e) {
  return (
    (e = Math.round(e * 10) / 10),
    (e + "").replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,")
  );
}
function Ge(e) {
  return e[2].map(function (t) {
    return [e[0], e[1], t];
  });
}
function jd(e) {
  const t = e[2];
  return t ? Ge([e[0], e[1], t]) : [[e[0], e[1], void 0]];
}
function Uo(e, t) {
  return t.edition === _.Java && t.javaVersion >= p.V1_18
    ? [e[0] * 16, null, e[1] * 16]
    : [e[0] * 16 + 8, null, e[1] * 16 + 8];
}
const An = (e) => e.edition === _.Java && e.javaVersion >= p.V1_18,
  Zo = (e) => An(e) || (e.edition === _.Bedrock && e.bedrockVersion >= S.V1_18),
  Jo = he.offBy(
    24,
    "The portal is within 24 blocks of this point in each direction.",
  ),
  vn = "Sometimes missing in-game.",
  H = { chunkClassifier: 8, veryBig: 16, big: 32, normal: 128, small: 256 },
  N = {
    chunk: function (e) {
      return e[0] + "//" + e[1];
    },
    xzBlock: function (e, t) {
      return e + "/" + t;
    },
    xyBlockArr: function (e) {
      return N.xzBlock(e[2][0], e[2][2]);
    },
    placementChunk: function (e) {
      return N.chunk([e.placementChunkX, e.placementChunkZ, e]);
    },
  };
function Xo(e) {
  return e.count < 600
    ? "small"
    : e.count < 1800
      ? "medium"
      : e.count < 5400
        ? "large"
        : "huge";
}
function Br(e) {
  return !!(e && e[0] != null && e[2] != null);
}
function $o(e) {
  return e
    ? e === "units"
      ? "Housing units"
      : e === "hoglin_stable"
        ? "Hoglin stables"
        : e === "treasure"
          ? "Treasure room"
          : e === "bridge"
            ? "Bridges"
            : null
    : null;
}
function Ko(e) {
  return e === ve.ZOMBIE
    ? "Zombie"
    : e === ve.SKELETON
      ? "Skeleton"
      : e === ve.SPIDER
        ? "Spider"
        : null;
}
function Qo(e) {
  return [
    e.isLarge ? "Large," : "Small,",
    e.type === "warm" ? "Warm" : "Cold",
    "Ruin",
    e.clusterSize > 0 && "with Cluster (" + e.clusterSize + " small ruins)",
  ]
    .filter(Boolean)
    .join(" ");
}
function Ud(e) {
  return e.oreCount < 6 ? "small" : e.oreCount < 9 ? "medium" : "large";
}
function qo(e) {
  if (e.type == null) return null;
  let t = {
    desert: "Desert Village",
    plains: "Plains Village",
    savanna: "Savanna Village",
    taiga: "Taiga Village",
    snowy: "Snowy Village",
  }[e.type];
  return (e.zombie && (t = "Zombie " + t), t);
}
const We = (e) => e,
  Z = (e) => e,
  it = {
    [g.AbandonedCamp]: Z({
      shortId: "Ab",
      label: "Camp",
      fullLabel: "Abandoned Camp",
      icon: "abandoned-camp",
      imgSrc: {
        default: "abandoned-camp.png",
        secretChest: "abandoned-camp-special-copper.png",
      },
      dimension: y.Overworld,
      biomeScanHeights: ["surface"],
      maxTileSize: H.normal,
      getTooltipText: function (e) {
        return e[2].hasSecretChest
          ? "Abandoned Camp (Copper Chest)"
          : "Abandoned Camp";
      },
      getImg: function (e) {
        return e.hasSecretChest ? "secretChest" : "default";
      },
      getCoords: function (e) {
        const { x: t, y: n, z: r } = e[2];
        return [t, n, r];
      },
      getDetails: function (e) {
        const { campsite: t, tent: n } = Gd(e[2]);
        return [
          { label: "Campsite", value: t },
          { label: "Tent", value: n },
        ];
      },
      fillColor: "154,63,53",
      getHash: function (e) {
        return N.placementChunk(e[2]);
      },
    }),
    [g.AmethystGeode]: We({
      shortId: "Ag",
      label: "Geode",
      fullLabel: "Amethyst Geode",
      icon: "amethyst",
      imgSrc: "amethyst.png",
      dimension: y.Overworld,
      biomeScanHeights: ["surface", "underground", "bottom"],
      maxTileSize: H.chunkClassifier,
      splitPois: Ge,
      getHoverText: function (e) {
        return (
          "Geode @ " +
          e[2]
            .map(function (n) {
              return $(n[0]) + " / " + $(n[1]) + " / " + $(n[2]);
            })
            .join(", ")
        );
      },
      getTooltipText: function () {
        return "Amethyst Geode";
      },
      getAccuracyCues: function () {
        return [he.likely("About 9 in 10 of these exist in-game.")];
      },
      getCoords: function (e) {
        return e[2];
      },
      fillColor: "98,69,149",
      getHash: N.xyBlockArr,
    }),
    [g.AncientCity]: Z({
      shortId: "Ac",
      label: "Ancient City",
      icon: "ancient-city",
      imgSrc: "ancient-city.png",
      dimension: y.Overworld,
      biomeScanHeights: ["bottom"],
      maxTileSize: H.normal,
      getTooltipText: function () {
        return "Ancient City";
      },
      getCoords: function (e) {
        return [e[0] * 16 + 8, -51, e[1] * 16 + 8];
      },
      getHoverText: function (e, t) {
        const n = it[g.AncientCity].getCoords?.(e, t) ?? [0, 0, 0];
        return "Ancient City @ " + $(n[0]) + " / " + n[1] + " / " + $(n[2]);
      },
      fillColor: "5,35,30",
      getHash: N.chunk,
    }),
    [g.BastionRemnant]: Z({
      shortId: "Br",
      label: "Bastion",
      fullLabel: "Bastion Remnant",
      icon: "piglin",
      imgSrc: {
        default: "bastion.png",
        bridge: "bastion-bridge.png",
        stables: "bastion-stables.png",
        units: "bastion-units.png",
        treasure: "bastion-treasure.png",
      },
      dimension: y.Nether,
      maxTileSize: H.big,
      getCoords: function (e) {
        const { x: t, y: n, z: r } = e[2];
        return [t, n, r];
      },
      getHoverText: function (e) {
        const t = $o(e[2].type);
        return t == null ? null : "Type: " + t;
      },
      getTooltipText: function (e) {
        return "Bastion (" + $o(e[2].type) + ")";
      },
      getImg: function (e) {
        return e.type === "hoglin_stable"
          ? "stables"
          : e.type === "treasure"
            ? "treasure"
            : e.type === "bridge"
              ? "bridge"
              : "units";
      },
      fillColor: function (e) {
        return e?.type == null || e.type === "units"
          ? "140,140,140"
          : e.type === "hoglin_stable"
            ? "245,0,122"
            : e.type === "treasure"
              ? "139,69,19"
              : e.type === "bridge"
                ? "8,145,17"
                : "0,0,0";
      },
      getHash: function (e) {
        return N.placementChunk(e[2]);
      },
    }),
    [g.BuriedTreasure]: Z({
      shortId: "Bt",
      label: "Treasure",
      fullLabel: "Buried Treasure",
      icon: "buried-treasure",
      imgSrc: "buried-treasure.png",
      dimension: y.Overworld,
      biomeScanHeights: ["surface"],
      maxTileSize: H.big,
      getHoverText: function (e, t) {
        const n = it[g.BuriedTreasure].getCoords?.(e, t) ?? [0, 0, 0];
        return "Treasure @ " + $(n[0]) + " / " + $(n[2]);
      },
      getTooltipText: function () {
        return "Buried Treasure";
      },
      getCoords: function (e, t) {
        const n = t.edition === _.Java ? 9 : 8;
        return [e[0] * 16 + n, null, e[1] * 16 + n];
      },
      fillColor: "190,140,100",
      getHash: N.chunk,
    }),
    [g.Cave]: We({
      shortId: "Ca",
      label: "Cave",
      fullLabel: "Cheese Cave",
      icon: "cave",
      imgSrc: { default: "cave.png", special: "cave-special.png" },
      dimension: y.Overworld,
      biomeScanHeights: ["surface", "underground", "bottom"],
      maxTileSize: H.veryBig,
      splitPois: Ge,
      getCoords: function (e) {
        return e[2].reference.pos;
      },
      getTooltipText: function (e) {
        return "Cheese Cave (" + Xo(e[2]) + ")";
      },
      getImg: function (e) {
        return Xo(e) === "huge" ? "special" : "default";
      },
      fillColor: function () {
        return "80,80,80";
      },
      getHash: function (e) {
        return N.xzBlock(e[2].reference.pos[0], e[2].reference.pos[2]);
      },
    }),
    [g.DesertTemple]: Z({
      shortId: "Dt",
      label: "Desert Temple",
      icon: "desert-temple",
      imgSrc: "desert-temple.png",
      dimension: y.Overworld,
      biomeScanHeights: ["surface"],
      maxTileSize: H.normal,
      getTooltipText: function () {
        return "Desert Temple";
      },
      fillColor: "120,100,20",
      getHash: N.chunk,
    }),
    [g.DesertWell]: Z({
      shortId: "Dw",
      label: "Desert Well",
      icon: "desert-well",
      imgSrc: "desert-well.png",
      dimension: y.Overworld,
      biomeScanHeights: ["surface"],
      maxTileSize: H.big,
      getTooltipText: function () {
        return "Desert Well";
      },
      getAccuracyCues: function () {
        return [he.likely(vn)];
      },
      getCoords: function (e) {
        return e[2].slice(0, 3);
      },
      fillColor: "40,57,161",
      getHash: N.chunk,
    }),
    [g.Dungeon]: We({
      shortId: "D",
      label: "Dungeon",
      icon: "dungeon",
      imgSrc: {
        default: "dungeon.png",
        zombie: "dungeon-zombie.png",
        spider: "dungeon-spider.png",
        skeleton: "dungeon-skeleton.png",
      },
      dimension: y.Overworld,
      biomeScanHeights: ["surface", "underground", "bottom"],
      maxTileSize: H.chunkClassifier,
      getImg: function (e) {
        const t = e[3];
        return t === ve.ZOMBIE
          ? "zombie"
          : t === ve.SKELETON
            ? "skeleton"
            : "spider";
      },
      fillColor: function (e) {
        return e == null || e.length > 1
          ? "220,120,20"
          : e[0][3] === ve.ZOMBIE
            ? "70,109,29"
            : e[0][3] === ve.SKELETON
              ? "125,125,125"
              : e[0][3] === ve.SPIDER
                ? "168,46,0"
                : "0,0,0";
      },
      splitPois: Ge,
      getCoords: function (e) {
        return e[2].slice(0, 3);
      },
      getTooltipText: function (e) {
        return "Dungeon (" + (Ko(e[2][3]) || "Unknown Mob") + ")";
      },
      getAccuracyCues: function (e, t) {
        return Zo(t)
          ? [
              he.possible(
                "Often missing in-game, and some real dungeons are not shown.",
              ),
            ]
          : [
              he.likely(
                "Sometimes missing in-game, for example where a mineshaft cuts through the spot.",
              ),
            ];
      },
      getHoverText: function (e) {
        return e[2]
          .map(function (t) {
            return (
              (Ko(t[3]) || "Dungeon") +
              " @ " +
              [$(t[0]), t[1], $(t[2])].join(" / ")
            );
          }, "")
          .join(", ");
      },
      getHash: function (e) {
        return N.xyBlockArr([e[0], e[1], [e[2][0], e[2][1], e[2][2]]]);
      },
    }),
    [g.Fossil]: We({
      shortId: "F",
      label: "Fossil",
      icon: "fossil",
      imgSrc: "fossil.png",
      dimension: y.Overworld,
      biomeScanHeights: ["surface", "underground", "bottom"],
      maxTileSize: H.chunkClassifier,
      fillColor: "90,90,90",
      splitPois: jd,
      getCoords: function (e) {
        return Br(e[2])
          ? e[2].slice(0, 3)
          : [e[0] * 16 + 8, null, e[1] * 16 + 8];
      },
      getTooltipText: function (e) {
        return e[2] && e[2][3] === "diamond" ? "Diamond Fossil" : "Fossil";
      },
      getAccuracyCues: function (e) {
        return Br(e[2])
          ? []
          : [
              he.offBy(
                8,
                "The fossil is somewhere in this chunk. The exact position is not known.",
              ),
            ];
      },
      getHoverText: function (e) {
        const t = e[2].filter(Boolean);
        return Br(t[0])
          ? t
              .map(function (n) {
                return (
                  "Fossil @ " +
                  [$(n?.[0] ?? 0), n?.[1], $(n?.[2] ?? 0)]
                    .filter(Boolean)
                    .join(" / ")
                );
              }, "")
              .join(", ")
          : null;
      },
      getHash: N.chunk,
    }),
    [g.FossilNether]: We({
      shortId: "Fn",
      label: "Nether Fossil",
      icon: "fossil",
      imgSrc: { default: "fossil.png", ghast: "fossil-ghast.png" },
      dimension: y.Nether,
      maxTileSize: H.chunkClassifier,
      fillColor: function (e) {
        return e != null && e[0][3].hasDriedGhast ? "0,122,108" : "90,90,90";
      },
      splitPois: Ge,
      getImg: function (e) {
        return e[3].hasDriedGhast ? "ghast" : "default";
      },
      getCoords: function (e) {
        return e[2].slice(0, 3);
      },
      getTooltipText: function (e) {
        return e[2][3].hasDriedGhast
          ? "Nether Fossil (Ghast)"
          : "Nether Fossil";
      },
      getAccuracyCues: function (e, t) {
        return t.edition === _.Bedrock ? [he.likely(vn)] : [];
      },
      getHoverText: function (e) {
        return e[2]
          .map(function (t) {
            return (
              "Fossil " +
              (t[3].hasDriedGhast ? "(Ghast)" : "") +
              " @ " +
              [$(t[0]), t[1], $(t[2])].filter(Boolean).join(" / ")
            );
          }, "")
          .join(", ");
      },
      getHash: N.chunk,
    }),
    [g.EndCity]: Z({
      shortId: "E",
      label: "End City",
      icon: "end-city",
      imgSrc: { default: "end-city.png", ship: "end-city-ship.png" },
      dimension: y.End,
      maxTileSize: H.normal,
      getImg: function (e) {
        return e.hasShip == null || e.hasShip ? "ship" : "default";
      },
      fillColor: function (e) {
        return e == null || e.hasShip == null || e.hasShip
          ? "73,49,73"
          : "130,130,130";
      },
      getTooltipText: function (e) {
        return e[2].hasShip == null
          ? "End City"
          : e[2].hasShip
            ? "End City (with ship)"
            : "End City (without ship)";
      },
      getHoverText: function (e) {
        return e[2].hasShip == null
          ? null
          : e[2].hasShip
            ? "End City with ship"
            : "End City without ship";
      },
      getHash: N.chunk,
    }),
    [g.EndGateway]: We({
      shortId: "Eg",
      label: "End Gateway",
      icon: "end-gateway",
      imgSrc: "end-gateway.png",
      dimension: y.End,
      maxTileSize: H.normal,
      fillColor: "20,100,85",
      splitPois: Ge,
      getCoords: function (e) {
        return [e[2].x, null, e[2].z];
      },
      getHoverText: function (e) {
        return "End Gateway @ " + $(e[2][0].x) + " / " + $(e[2][0].z);
      },
      getTooltipText: function () {
        return "End Gateway";
      },
      getHash: function (e) {
        return N.xzBlock(e[2].x, e[2].z);
      },
    }),
    [g.NetherFortress]: Z({
      shortId: "N",
      label: "Nether Fortress",
      icon: "nether-fortress2",
      imgSrc: "nether-fortress.png",
      dimension: y.Nether,
      maxTileSize: H.big,
      fillColor: "195,65,55",
      getCoords: function (e) {
        return [e[0] * 16 + 11, null, e[1] * 16 + 11];
      },
      getTooltipText: function () {
        return "Nether Fortress (Crossing)";
      },
      getHoverText: function (e) {
        return (
          "Crossing @ " + $((e[0] << 4) + 11) + " / " + $((e[1] << 4) + 11)
        );
      },
      getHash: N.chunk,
    }),
    [g.Igloo]: Z({
      shortId: "I",
      label: "Igloo",
      icon: "igloo2",
      imgSrc: { default: "igloo.png", basement: "igloo-basement.png" },
      dimension: y.Overworld,
      biomeScanHeights: ["surface"],
      maxTileSize: H.normal,
      getImg: function (e) {
        return e.hasBasement ? "basement" : "default";
      },
      fillColor: function (e) {
        return e?.hasBasement ? "35,87,205" : "100,100,100";
      },
      getTooltipText: function (e) {
        return e[2].hasBasement == null
          ? "Igloo"
          : e[2].hasBasement
            ? "Igloo (with basement)"
            : "Igloo (without basement)";
      },
      getHoverText: function (e) {
        return e[2].hasBasement == null
          ? null
          : e[2].hasBasement
            ? "Igloo with basement"
            : "Igloo without basement";
      },
      getHash: N.chunk,
    }),
    [g.JungleTemple]: Z({
      shortId: "J",
      label: "Jungle Temple",
      icon: "jungle-temple",
      imgSrc: "jungle-temple.png",
      dimension: y.Overworld,
      biomeScanHeights: ["surface"],
      maxTileSize: H.normal,
      getTooltipText: function () {
        return "Jungle Temple";
      },
      getAccuracyCues: function (e, t) {
        return An(t) ? [he.likely(vn)] : [];
      },
      fillColor: "114,133,10",
      getHash: N.chunk,
    }),
    [g.WoodlandMansion]: Z({
      shortId: "Ma",
      label: "Mansion",
      fullLabel: "Woodland Mansion",
      icon: "mansion3",
      imgSrc: "mansion.png",
      dimension: y.Overworld,
      biomeScanHeights: ["surface"],
      maxTileSize: H.small,
      getTooltipText: function () {
        return "Woodland Mansion";
      },
      getAccuracyCues: function (e, t) {
        return An(t) ? [he.likely(vn)] : [];
      },
      fillColor: "160,82,45",
      getHash: N.chunk,
    }),
    [g.LavaPool]: We({
      shortId: "Lp",
      label: "Lava Pool",
      fullLabel: "Underground Lava Pool",
      icon: "lava",
      imgSrc: {
        default: "lava.png",
        bucket: "lava-bucket.png",
        cave: "lava-cave.png",
      },
      getImg: function (e) {
        return e.type === "undergroundLake" ? "bucket" : "cave";
      },
      dimension: y.Overworld,
      biomeScanHeights: ["surface", "underground", "bottom"],
      maxTileSize: H.chunkClassifier,
      splitPois: Ge,
      fillColor: "240,90,20",
      getHash: function (e) {
        return N.xzBlock(e[2].pos[0], e[2].pos[2]);
      },
      getTooltipText: function (e) {
        return e[2].type === "cave"
          ? "Lava-Flooded Cave"
          : "Underground Lava Lake";
      },
      getAccuracyCues: function (e) {
        return e[2].type === "cave"
          ? []
          : [
              he.likely(
                "Sometimes missing in-game, and some lakes are not shown.",
              ),
            ];
      },
      getTooltipAdditionalText: function () {
        return "Never dig straight down";
      },
      getCoords: function (e) {
        return e[2].pos;
      },
    }),
    [g.Mineshaft]: Z({
      shortId: "M",
      label: "Mineshaft",
      icon: "mineshaft2",
      imgSrc: "mineshaft.png",
      dimension: y.Overworld,
      biomeScanHeights: ["surface", "underground", "bottom"],
      maxTileSize: H.veryBig,
      getTooltipText: function () {
        return "Mineshaft";
      },
      fillColor: "160,130,10",
      getHash: N.chunk,
    }),
    [g.OceanMonument]: Z({
      shortId: "Om",
      label: "Monument",
      fullLabel: "Ocean Monument",
      icon: "ocean-monument2",
      imgSrc: "ocean-monument.png",
      dimension: y.Overworld,
      biomeScanHeights: ["surface"],
      maxTileSize: H.normal,
      getTooltipText: function () {
        return "Ocean Monument";
      },
      fillColor: "100,100,220",
      getHash: N.chunk,
    }),
    [g.OceanRuin]: Z({
      shortId: "Or",
      label: "Ocean Ruins",
      icon: "ocean-ruin",
      imgSrc: { default: "ocean-ruin.png", special: "ocean-ruin-special.png" },
      dimension: y.Overworld,
      biomeScanHeights: ["surface"],
      maxTileSize: H.big,
      getImg: function (e) {
        return e.isLarge && e.clusterSize > 0 ? "special" : "default";
      },
      fillColor: function (e) {
        return e?.type === "cold"
          ? e.isLarge && e.clusterSize > 0
            ? "51,102,255"
            : "80,98,149"
          : e?.isLarge && e?.clusterSize > 0
            ? "255,82,51"
            : "149,91,80";
      },
      getTooltipText: function (e) {
        return Qo(e[2]);
      },
      getHoverText: function (e) {
        return Qo(e[2]);
      },
      getHash: N.chunk,
    }),
    [g.PillagerOutpost]: Z({
      shortId: "Po",
      label: "Outpost",
      fullLabel: "Pillager Outpost",
      icon: "pillager-outpost2",
      imgSrc: "pillager-outpost.png",
      dimension: y.Overworld,
      biomeScanHeights: ["surface"],
      getCoords: Uo,
      maxTileSize: H.normal,
      getTooltipText: function () {
        return "Pillager Outpost";
      },
      fillColor: "80,50,20",
      getHash: N.chunk,
    }),
    [g.Ravine]: We({
      shortId: "Rv",
      label: "Ravine",
      icon: "ravine",
      imgSrc: {
        default: "ravine.png",
        special: "ravine-special.png",
        underwater: "ravine-underwater.png",
        underwaterSpecial: "ravine-underwater-special.png",
      },
      dimension: y.Overworld,
      biomeScanHeights: ["surface", "underground", "bottom"],
      maxTileSize: H.chunkClassifier,
      splitPois: Ge,
      getCoords: function (e) {
        return [e[2].x, e[2].y, e[2].z];
      },
      getImg: function (e) {
        return e.isUnderwater
          ? e.isMegaRavine
            ? "underwaterSpecial"
            : "underwater"
          : e.isMegaRavine
            ? "special"
            : "default";
      },
      getTooltipText: function (e) {
        const t = e[2];
        return [
          t.isMegaRavine && "Mega",
          t.isUnderwater && "Underwater",
          "Ravine",
          t.thickness && "(Width: " + $(t.thickness) + ")",
        ]
          .filter(Boolean)
          .join(" ");
      },
      getHoverText: function (e) {
        const t = e[2][0];
        return [
          t.isMegaRavine && "Mega",
          t.isUnderwater && "Underwater",
          "Ravine",
          "@ " + $(t.x) + " / " + $(t.y) + " / " + $(t.z),
        ]
          .filter(Boolean)
          .join(" ");
      },
      fillColor: function (e) {
        if (e == null) return "20,90,0";
        const t = e[0];
        return t.isUnderwater
          ? t.isMegaRavine
            ? "168,7,213"
            : "0,0,255"
          : t.isMegaRavine
            ? "128,25,0"
            : "20,90,0";
      },
      getHash: function (e) {
        return N.xzBlock(e[2].x, e[2].z);
      },
    }),
    [g.OreVein]: We({
      shortId: "Ov",
      label: "Ore Veins",
      icon: "ore-vein",
      imgSrc: {
        default: "raw-iron.png",
        copper: "raw-copper.png",
        iron: "raw-iron.png",
      },
      dimension: y.Overworld,
      biomeScanHeights: ["surface", "underground", "bottom"],
      splitPois: Ge,
      getCoords: function (e) {
        return e[2].reference;
      },
      getImg: function (e) {
        return e.type;
      },
      maxTileSize: H.chunkClassifier,
      getTooltipText: function (e) {
        return [
          e[2].type === "copper" ? "Copper Vein" : "Iron Vein",
          "(" + Ud(e[2]) + ")",
        ].join(" ");
      },
      fillColor: "110,75,40",
      getHash: function (e) {
        return N.xzBlock(e[2].reference[0], e[2].reference[2]);
      },
    }),
    [g.RuinedPortalOverworld]: Z({
      shortId: "Rp",
      label: "Ruined Portal",
      fullLabel: "Ruined Portal Overworld",
      icon: "ruined-portal",
      imgSrc: {
        default: "ruined-portal.png",
        giant: "ruined-portal-giant.png",
      },
      dimension: y.Overworld,
      biomeScanHeights: ["surface", "underground", "bottom"],
      maxTileSize: H.big,
      getImg: function (e) {
        return e?.giant ? "giant" : "default";
      },
      getTooltipText: function (e) {
        const t = e[2];
        if (!t) return "Ruined Portal";
        const n = t.giant ? "Giant Ruined Portal" : "Ruined Portal",
          r = {
            on_land_surface: "",
            partly_buried: " (partly buried)",
            on_ocean_floor: " (ocean floor)",
            in_mountain: " (in mountain)",
            underground: " (underground)",
          }[t.placement];
        return n + r;
      },
      getAccuracyCues: function (e) {
        const t = e[2];
        return t
          ? t.yUnreliable
            ? [
                he.yUnreliable(
                  "X and Z are exact. The height is usually right but sometimes far off.",
                ),
              ]
            : []
          : [Jo, he.mayBeUnderground("The portal may be fully underground.")];
      },
      getCoords: function (e) {
        const t = e[2];
        return t ? [t.x, t.y, t.z] : [e[0] * 16 + 8, null, e[1] * 16 + 8];
      },
      fillColor: "109,9,109",
      getHash: function (e) {
        const t = e[2];
        return t ? N.placementChunk(t) : N.chunk(e);
      },
    }),
    [g.RuinedPortalNether]: Z({
      shortId: "Rpn",
      label: "Ruined Portal",
      fullLabel: "Ruined Portal Nether",
      icon: "ruined-portal",
      imgSrc: "ruined-portal.png",
      dimension: y.Nether,
      maxTileSize: H.big,
      getTooltipText: function () {
        return "Ruined Portal";
      },
      getAccuracyCues: () => [Jo],
      fillColor: "109,9,109",
      getHash: N.chunk,
    }),
    [g.Shipwreck]: Z({
      shortId: "Sw",
      label: "Shipwreck",
      icon: "shipwreck2",
      imgSrc: "shipwreck.png",
      dimension: y.Overworld,
      biomeScanHeights: ["surface"],
      maxTileSize: H.big,
      getTooltipText: function () {
        return "Shipwreck";
      },
      fillColor: "108,88,97",
      getHash: N.chunk,
    }),
    [g.SlimeChunk]: Z({
      shortId: "Sc",
      label: "Slime Chunk",
      icon: "slime",
      imgSrc: "slime.png",
      dimension: y.Overworld,
      biomeScanHeights: ["surface", "underground", "bottom"],
      maxTileSize: H.chunkClassifier,
      getTooltipText: function () {
        return "Slime Chunk";
      },
      fillColor: "29,145,44",
      fillColorOuter: "40,199,60",
      getHash: N.chunk,
      canOverlay: !0,
      preferFill: !0,
    }),
    [g.Spawn]: Z({
      shortId: "Sp",
      label: "Spawn Point",
      icon: "spawn",
      imgSrc: "spawn.png",
      dimension: y.Overworld,
      biomeScanHeights: ["surface"],
      maxTileSize: H.small,
      getCoords: function (e) {
        return [e[2].x, null, e[2].z];
      },
      getTooltipText: function () {
        return "Spawn Point";
      },
      getAccuracyCues: function (e, t) {
        return Zo(t)
          ? []
          : [
              he.offBy(
                20,
                "The world spawn is usually within 20 blocks of this point.",
              ),
            ];
      },
      fillColor: "40,40,40",
      getHash: N.chunk,
    }),
    [g.Stronghold]: Z({
      shortId: "St",
      label: "Stronghold",
      icon: "stronghold",
      imgSrc: "stronghold.png",
      dimension: y.Overworld,
      biomeScanHeights: ["surface", "underground", "bottom"],
      maxTileSize: H.small,
      fillColor: "195,65,55",
      getCoords: function (e) {
        return [e[0] * 16 + 4, null, e[1] * 16 + 4];
      },
      getTooltipText: function () {
        return "Stronghold (Stairway)";
      },
      getHoverText: function (e) {
        return (
          "Stronghold stairway @ " +
          $((e[0] << 4) + 4) +
          " / " +
          $((e[1] << 4) + 4)
        );
      },
      getHash: N.chunk,
    }),
    [g.TrailRuin]: Z({
      shortId: "Tr",
      label: "Trail Ruins",
      icon: "trail-ruin",
      imgSrc: "trail-ruin.png",
      dimension: y.Overworld,
      biomeScanHeights: ["surface", "underground"],
      maxTileSize: H.normal,
      getTooltipText: function (e) {
        return "Trail Ruins";
      },
      getCoords: function (e) {
        return e[2].slice(0, 3);
      },
      fillColor: "123,80,20",
      getHash: N.chunk,
    }),
    [g.TrialChamber]: Z({
      shortId: "Tc",
      label: "Trial Chamber",
      icon: "trial-chamber",
      imgSrc: "trial-chamber.png",
      dimension: y.Overworld,
      biomeScanHeights: ["surface", "underground", "bottom"],
      maxTileSize: H.big,
      getTooltipText: function () {
        return "Trial Chamber";
      },
      getCoords: function (e) {
        return e[2] != null ? e[2] : [e[0] * 16, null, e[1] * 16];
      },
      fillColor: "113,45,25",
      getHash: N.chunk,
    }),
    [g.Village]: Z({
      shortId: "V",
      label: "Village",
      icon: "village2",
      imgSrc: {
        default: "village.png",
        zombie: "village-zombie.png",
        desert: "village-desert.png",
        savanna: "village-savanna.png",
        snowy: "village-snowy.png",
        taiga: "village-taiga.png",
      },
      dimension: y.Overworld,
      biomeScanHeights: ["surface"],
      maxTileSize: H.normal,
      getImg: function (e) {
        if (e.zombie) return "zombie";
        switch (e.type) {
          case "desert":
          case "savanna":
          case "snowy":
          case "taiga":
            return e.type;
          default:
            return "default";
        }
      },
      getCoords: Uo,
      fillColor: function (e) {
        return e?.zombie
          ? "200,0,190"
          : e?.type == null
            ? "179,163,60"
            : {
                desert: "180,101,4",
                plains: "100,131,63",
                savanna: "138,128,56",
                taiga: "11,102,89",
                snowy: "120,120,120",
              }[e.type];
      },
      getTooltipText: function (e) {
        return qo(e[2]) || "Village";
      },
      getHoverText: function (e) {
        return qo(e[2]);
      },
      getHash: N.chunk,
    }),
    [g.WitchHut]: Z({
      shortId: "Wh",
      label: "Witch Hut",
      icon: "witch-hut2",
      imgSrc: "witch-hut.png",
      dimension: y.Overworld,
      biomeScanHeights: ["surface"],
      maxTileSize: H.normal,
      getTooltipText: function () {
        return "Witch Hut";
      },
      fillColor: "169,44,212",
      getHash: N.chunk,
    }),
    [g.ItemOverworld]: Z({
      shortId: "IOw",
      label: "Apple",
      fullLabel: "Enchanted Golden Apple",
      icon: "golden-apple",
      imgSrc: "golden-apple.png",
      dimension: y.Overworld,
      biomeScanHeights: ["surface"],
      maxTileSize: H.small,
      fillColor: "145,81,13",
      getTooltipText: function () {
        return "Enchanted Apple (temple chest)";
      },
      getHoverText: function () {
        return "Enchanted Apple (temple chest)";
      },
      getAccuracyCues: function (e, t) {
        return An(t)
          ? [
              he.likely(
                "Sometimes wrong: the temple may be missing, or the chest may hold different loot.",
              ),
            ]
          : [];
      },
      getHash: N.chunk,
      canOverlay: !0,
    }),
  };
Object.fromEntries(Object.entries(it).map((e) => [e[1].shortId, e[0]]));
function Zd(e, t) {
  return `${e}/${it[e].getHash(t)}`;
}
const Jd = [
  g.Spawn,
  g.SlimeChunk,
  g.Village,
  g.AncientCity,
  g.Dungeon,
  g.Stronghold,
  g.WoodlandMansion,
  g.OceanMonument,
  g.PillagerOutpost,
  g.Mineshaft,
  g.RuinedPortalOverworld,
  g.JungleTemple,
  g.DesertTemple,
  g.WitchHut,
  g.BuriedTreasure,
  g.Shipwreck,
  g.Igloo,
  g.OceanRuin,
  g.Fossil,
  g.Cave,
  g.Ravine,
  g.LavaPool,
  g.EndCity,
  g.EndGateway,
  g.NetherFortress,
  g.BastionRemnant,
  g.RuinedPortalNether,
  g.AmethystGeode,
  g.ItemOverworld,
  g.OreVein,
  g.DesertWell,
  g.TrailRuin,
  g.TrialChamber,
  g.FossilNether,
  g.AbandonedCamp,
];
Jd.map((e) => ({ key: e, ...it[e] }));
function Xd(e, t, n) {
  return it[e].getCoords?.(t, n) ?? [t[0] * 16 + 8, null, t[1] * 16 + 8];
}
function $d(e, t, n) {
  return {
    poi: e,
    coords: Xd(e, t, n),
    data: t[2],
    chunk: [t[0], t[1]],
    poiId: Zd(e, t),
  };
}
function* Kd(e, t, n) {
  const r = it[e];
  for (const i of t) {
    const o = r.splitPois ? r.splitPois(i) : [i];
    for (const s of o) yield $d(e, s, n);
  }
}
function Qd(e, t, n) {
  return [...Kd(e, t, n)];
}
const qd = {
  [g.BastionRemnant]: ge()({
    Bridge: (e) => e.type === "bridge",
    Stables: (e) => e.type === "hoglin_stable",
    Units: (e) => e.type === "units",
    Treasure: (e) => e.type === "treasure",
  }),
  [g.BuriedTreasure]: {},
  [g.Dungeon]: ge()({
    Zombie: (e) => e[3] === ve.ZOMBIE,
    Skeleton: (e) => e[3] === ve.SKELETON,
    Spider: (e) => e[3] === ve.SPIDER,
  }),
  [g.EndCity]: ge()({ Ship: (e) => e.hasShip }),
  [g.NetherFortress]: {},
  [g.SlimeChunk]: {},
  [g.Stronghold]: {},
  [g.Village]: ge()({
    Zombie: (e) => !!e.zombie,
    Desert: (e) => e.type === "desert",
    Plains: (e) => e.type === "plains",
    Savanna: (e) => e.type === "savanna",
    Taiga: (e) => e.type === "taiga",
    Snowy: (e) => e.type === "snowy",
  }),
  [g.Mineshaft]: {},
  [g.WoodlandMansion]: {},
  [g.PillagerOutpost]: {},
  [g.OceanRuin]: ge()({
    Large: (e) => e.isLarge,
    Cluster: (e) => e.clusterSize > 0,
    Warm: (e) => e.type === "warm",
    Cold: (e) => e.type === "cold",
  }),
  [g.OceanMonument]: {},
  [g.Shipwreck]: {},
  [g.DesertTemple]: {},
  [g.JungleTemple]: {},
  [g.WitchHut]: {},
  [g.Igloo]: ge()({ Basement: (e) => !!e.hasBasement }),
  [g.RuinedPortalOverworld]: ge()({
    Giant: (e) => !!e?.giant,
    Surface: (e) =>
      e?.placement === "on_land_surface" || e?.placement === "on_ocean_floor",
    Underground: (e) =>
      e?.placement === "partly_buried" ||
      e?.placement === "in_mountain" ||
      e?.placement === "underground",
  }),
  [g.RuinedPortalNether]: {},
  [g.Spawn]: {},
  [g.Fossil]: ge()({
    Diamond: (e) => e[3] === "diamond",
    Coal: (e) => e[3] === "coal",
  }),
  [g.FossilNether]: ge()({ Ghast: (e) => !!e[3].hasDriedGhast }),
  [g.Ravine]: ge()({
    Mega: (e) => e.isMegaRavine,
    Underwater: (e) => e.isUnderwater,
  }),
  [g.EndGateway]: {},
  [g.AmethystGeode]: {},
  [g.AncientCity]: {},
  [g.ItemOverworld]: {},
  [g.OreVein]: ge()({
    Copper: (e) => e.type === "copper",
    Iron: (e) => e.type === "iron",
    Small: (e) => Ir(e) === "small",
    Medium: (e) => Ir(e) === "medium",
    Large: (e) => Ir(e) === "large",
  }),
  [g.Cave]: ge()({
    Small: (e) => Sn(e) === "small",
    Medium: (e) => Sn(e) === "medium",
    Large: (e) => Sn(e) === "large",
    Huge: (e) => Sn(e) === "huge",
  }),
  [g.DesertWell]: {},
  [g.TrailRuin]: {},
  [g.TrialChamber]: {},
  [g.LavaPool]: ge()({
    UndergroundLake: (e) => e.type === "undergroundLake",
    Cave: (e) => e.type === "cave",
  }),
  [g.AbandonedCamp]: ge()({ CopperChest: (e) => e.hasSecretChest }),
};
function ge() {
  return (e) => e;
}
function Yd(e, t) {
  const n = qd[e];
  if (!n) throw new Error(`No tags defined for POI: ${e}`);
  return Object.entries(n)
    .filter(([r, i]) => i(t))
    .map(([r]) => r);
}
const em = ({
  tags: e,
  include: t = [],
  exclude: n = [],
  includeAny: r = [],
}) =>
  !n.some((i) => e.includes(i)) &&
  t.every((i) => e.includes(i)) &&
  (r.length === 0 || r.some((i) => e.includes(i)));
function Ir(e) {
  return e.oreCount < 6 ? "small" : e.oreCount < 9 ? "medium" : "large";
}
function Sn(e) {
  return e.count < 600
    ? "small"
    : e.count < 1800
      ? "medium"
      : e.count < 5400
        ? "large"
        : "huge";
}
const tm = {
  [g.BastionRemnant]: {
    units: {
      include: ["Units"],
      label: "Bastion (Housing Units)",
      imgSrcKey: "units",
    },
    stables: {
      include: ["Stables"],
      label: "Bastion (Hoglin Stables)",
      imgSrcKey: "stables",
    },
    treasure: {
      include: ["Treasure"],
      label: "Bastion (Treasure Room)",
      imgSrcKey: "treasure",
    },
    bridge: {
      include: ["Bridge"],
      label: "Bastion (Bridge)",
      imgSrcKey: "bridge",
    },
  },
  [g.Cave]: {
    small: { include: ["Small"], label: "Small Cheese Cave" },
    mediumPlus: {
      includeAny: ["Medium", "Large", "Huge"],
      label: "Medium+ Cheese Cave",
    },
    largePlus: { includeAny: ["Large", "Huge"], label: "Large+ Cheese Cave" },
    huge: {
      include: ["Huge"],
      label: "Huge Cheese Cave",
      imgSrcKey: "special",
    },
  },
  [g.Dungeon]: {
    zombie: {
      include: ["Zombie"],
      label: "Zombie Dungeon",
      imgSrcKey: "zombie",
    },
    skeleton: {
      include: ["Skeleton"],
      label: "Skeleton Dungeon",
      imgSrcKey: "skeleton",
    },
    spider: {
      include: ["Spider"],
      label: "Spider Dungeon",
      imgSrcKey: "spider",
    },
  },
  [g.EndCity]: {
    ship: { include: ["Ship"], label: "End City with Ship", imgSrcKey: "ship" },
    "no-ship": { exclude: ["Ship"], label: "End City without Ship" },
  },
  [g.Fossil]: {
    diamond: { include: ["Diamond"], label: "Diamond Fossil" },
    coal: { include: ["Coal"], label: "Coal Fossil" },
  },
  [g.FossilNether]: {
    ghast: {
      include: ["Ghast"],
      label: "Nether Fossil (Dried Ghast)",
      imgSrcKey: "ghast",
    },
  },
  [g.Igloo]: {
    basement: {
      include: ["Basement"],
      label: "Igloo With Basement",
      imgSrcKey: "basement",
    },
    "no-basement": { exclude: ["Basement"], label: "Igloo Without Basement" },
  },
  [g.LavaPool]: {
    lake: {
      include: ["UndergroundLake"],
      label: "Underground Lava Lake",
      imgSrcKey: "bucket",
    },
    cave: { include: ["Cave"], label: "Lava-Flooded Cave", imgSrcKey: "cave" },
  },
  [g.OceanRuin]: {
    large: { include: ["Large"], label: "Large Ocean Ruins" },
    small: { exclude: ["Large"], label: "Small Ocean Ruins" },
    cluster: {
      include: ["Cluster"],
      label: "Ocean Ruins with Cluster",
      imgSrcKey: "special",
    },
    warm: { include: ["Warm"], label: "Warm Ocean Ruins" },
    cold: { include: ["Cold"], label: "Cold Ocean Ruins" },
  },
  [g.OreVein]: {
    copper: { include: ["Copper"], label: "Copper Vein", imgSrcKey: "copper" },
    iron: { include: ["Iron"], label: "Iron Vein", imgSrcKey: "iron" },
    small: { include: ["Small"], label: "Small Vein" },
    mediumPlus: { includeAny: ["Medium", "Large"], label: "Medium+ Vein" },
    large: { includeAny: ["Large"], label: "Large Vein" },
  },
  [g.Ravine]: {
    mega: { include: ["Mega"], label: "Mega Ravine", imgSrcKey: "special" },
    underwater: {
      include: ["Underwater"],
      label: "Underwater Ravine",
      imgSrcKey: "underwater",
    },
  },
  [g.RuinedPortalOverworld]: {
    giant: {
      include: ["Giant"],
      label: "Giant Ruined Portal",
      imgSrcKey: "giant",
    },
    surface: { include: ["Surface"], label: "Surface Ruined Portal" },
    underground: {
      include: ["Underground"],
      label: "Underground Ruined Portal",
    },
  },
  [g.Village]: {
    zombie: {
      include: ["Zombie"],
      label: "Zombie Village",
      imgSrcKey: "zombie",
    },
    desert: {
      include: ["Desert"],
      label: "Desert Village",
      imgSrcKey: "desert",
    },
    plains: { include: ["Plains"], label: "Plains Village" },
    savanna: {
      include: ["Savanna"],
      label: "Savanna Village",
      imgSrcKey: "savanna",
    },
    snowy: { include: ["Snowy"], label: "Snowy Village", imgSrcKey: "snowy" },
    taiga: { include: ["Taiga"], label: "Taiga Village", imgSrcKey: "taiga" },
  },
  [g.AbandonedCamp]: {
    copperChest: {
      include: ["CopperChest"],
      label: "Camp (Copper Chest)",
      imgSrcKey: "secretChest",
    },
  },
};
function nm(e, t) {
  if (!t) return {};
  const n = tm[e]?.[t];
  return n
    ? {
        includeTags: n.include,
        includeAnyTags: n.includeAny,
        excludeTags: n.exclude,
      }
    : {};
}
function rm(e, t) {
  const { includeTags: n, includeAnyTags: r, excludeTags: i } = nm(e, t);
  return (o, s) => {
    if (e !== o) return !1;
    const a = Yd(o, s);
    return em({ tags: a, include: n, exclude: i, includeAny: r });
  };
}
async function Wn(e, t, n) {
  const r = e.get(t);
  if (r !== void 0 || e.has(t)) return r;
  const i = Promise.resolve(n());
  e.set(t, i);
  try {
    const o = await i;
    return (e.set(t, o), o);
  } catch (o) {
    throw (e.delete(t), o);
  }
}
const $e = 4;
async function Ai(e, t, n, r, i = Ie) {
  const o = [...new Set(n)],
    s = D(r.minX >> 4, $e),
    a = D(r.minZ >> 4, $e),
    c = D(r.maxX >> 4, $e),
    l = D(r.maxZ >> 4, $e),
    u = {};
  for (const d of o) {
    const f = [];
    for (let m = a; m <= l; m++)
      for (let h = s; h <= c; h++) {
        await i();
        const w = `poi-tile:${d}:${h},${m}`,
          v = await Wn(
            e,
            w,
            async () =>
              (await t({ x: h * $e, z: m * $e, sizeX: $e, sizeZ: $e }, [d]))[
                d
              ] ?? [],
          );
        v.length > 0 && f.push(v);
      }
    u[d] = f.flat();
  }
  return u;
}
async function im(e, t, n, r, i, o, s, a = Ie) {
  const c = r * 16,
    l = i * 16,
    u = (r + o) * 16 - 1,
    d = (i + s) * 16 - 1;
  return Ai(e, t, n, { minX: c, maxX: u, minZ: l, maxZ: d }, a);
}
function Ia(e, t) {
  return e < t ? -1 : e > t ? 1 : 0;
}
function Oi(e) {
  return { poiId: e.poiId, poi: e.poi, chunk: e.chunk, poiData: e.data };
}
function zi(e, t, n, r) {
  const i = rm(e, t);
  return Qd(e, n, r).filter((o) => i(e, o.data));
}
function Ea(e, t, n, r, i, o) {
  return zi(e, t, n, r).filter((s) => zd(i, o, s.coords[0], s.coords[2]));
}
function om(e) {
  const t = new Set(),
    n = [];
  for (const r of [...e].sort((i, o) => Ia(i.poiId, o.poiId)))
    t.has(r.poiId) || (t.add(r.poiId), n.push(r));
  return n;
}
const Yo = { [y.Overworld]: 1, [y.Nether]: 8, [y.End]: 1 };
function sm(e, t) {
  return Yo[e] / Yo[t];
}
const am = 4,
  cm = 0.6,
  lm = 2.25;
function um(e, t) {
  const n =
      t.shape.kind === "square" ? t.shape.inradius * 2 : t.shape.radius * 2,
    r = Math.min(lm, Math.max(cm, Math.sqrt(n / 128)));
  return Math.round(e * r);
}
function ka(e, t, n) {
  const r = sm(y.Overworld, n);
  return [Math.floor(e * r), Math.floor(t * r)];
}
const xe = 16;
function oi(e) {
  return e.mode === "biomes"
    ? ["biomes", e.getBiomesAt].join(":")
    : e.mode === "heights"
      ? ["heights", e.getHeightLevelAt, e.surfaceCheckType].join(":")
      : [
          "biomesAndHeights",
          e.getBiomesAt,
          e.getHeightLevelAt,
          e.surfaceCheckType,
        ].join(":");
}
const mr = Object.freeze({ xQ: 0, zQ: 0 }),
  Va = 4096,
  fm = 512,
  dm = 256;
function Ma(e, t) {
  const n = D((e.maxX >> 2) - (e.minX >> 2), t) + 2,
    r = D((e.maxZ >> 2) - (e.minZ >> 2), t) + 2;
  return n * r;
}
function gr(e, t, n) {
  return n && Ma(e, t) > fm ? "tiles" : "rect";
}
async function hr(e, t, n, r, i, o = Ie, s = 1, a = mr, c = "tiles") {
  const l = r.minX >> 2,
    u = r.minZ >> 2;
  if (l === r.maxX >> 2 && u === r.maxZ >> 2) {
    const O = `biome-point:${n}:${oi(i)}:${l},${u}`,
      F = await Wn(e, O, () => ze(t, n, l, u, 1, 1, 1, i));
    return {
      biomes: F.biomes,
      heights: F.heights ?? null,
      xQ0: l,
      zQ0: u,
      xLen: 1,
      zLen: 1,
      stepQ: 1,
    };
  }
  if (c === "rect") return mm(e, t, n, r, i, o, s, a);
  const d = xe * s,
    f = D((r.minX >> 2) - a.xQ, d),
    m = D((r.minZ >> 2) - a.zQ, d),
    h = D((r.maxX >> 2) - a.xQ, d),
    w = D((r.maxZ >> 2) - a.zQ, d),
    v = h - f + 1,
    x = w - m + 1,
    C = f * d + a.xQ,
    E = m * d + a.zQ,
    k = v * xe,
    M = x * xe,
    I = `biome-tile:${n}:${oi(i)}:s${s}:p${a.xQ},${a.zQ}`,
    A = [];
  for (let O = m; O <= w; O++)
    for (let F = f; F <= h; F++) {
      const U = `${I}:${F},${O}`;
      (await o(),
        A.push(
          Wn(e, U, () => ze(t, n, F * d + a.xQ, O * d + a.zQ, xe, xe, s, i)),
        ));
    }
  const L = await Promise.all(A),
    P = new Uint8Array(k * M),
    R = i.mode !== "biomes" ? new Int32Array(k * M) : null;
  let z = !1;
  for (let O = 0; O < x; O++)
    for (let F = 0; F < v; F++) {
      const U = L[O * v + F];
      for (let J = 0; J < xe; J++) {
        const K = (O * xe + J) * k + F * xe,
          G = J * xe;
        for (let ee = 0; ee < xe; ee++) P[K + ee] = U.biomes[G + ee];
        if (R)
          if (U.heights)
            for (let ee = 0; ee < xe; ee++) R[K + ee] = U.heights[G + ee];
          else z = !0;
      }
    }
  return {
    biomes: P,
    heights: z ? null : R,
    xQ0: C,
    zQ0: E,
    xLen: k,
    zLen: M,
    stepQ: s,
  };
}
async function mm(e, t, n, r, i, o, s, a) {
  const c = r.minX >> 2,
    l = r.minZ >> 2,
    u = c - Dn(c - a.xQ, s),
    d = l - Dn(l - a.zQ, s),
    f = D((r.maxX >> 2) - u, s) + 1,
    m = D((r.maxZ >> 2) - d, s) + 1,
    h = `biome-rect:${n}:${oi(i)}:s${s}:${u},${d}:${f}x${m}`,
    w = await Wn(e, h, async () => {
      const v = Math.max(1, Math.floor(Va / f));
      if (v >= m) {
        await o();
        const k = ze(t, n, u, d, f, m, s, i);
        return { biomes: k.biomes, heights: k.heights ?? null };
      }
      const x = new Uint8Array(f * m),
        C = i.mode !== "biomes" ? new Int32Array(f * m) : null;
      let E = !1;
      for (let k = 0; k < m; k += v) {
        await o();
        const M = Math.min(v, m - k),
          I = ze(t, n, u, d + k * s, f, M, s, i);
        (x.set(I.biomes, k * f),
          C && (I.heights ? C.set(I.heights, k * f) : (E = !0)));
      }
      return { biomes: x, heights: E ? null : C };
    });
  return {
    biomes: w.biomes,
    heights: w.heights,
    xQ0: u,
    zQ0: d,
    xLen: f,
    zLen: m,
    stepQ: s,
  };
}
const es = 4,
  gm = 4;
function Vt(e, t, n) {
  return t === 1 ? mr : Ri(e, n);
}
function Aa(e, t, n, r = 1, i = "tiles") {
  if (e[t] instanceof vi) return null;
  if (i === "rect") return Ma(n, r) >= dm ? es * r : null;
  const o = es * r,
    s = ts(n, r, Vt(n, r, r)),
    a = ts(n, o, Vt(n, r, o));
  return s >= gm * a ? o : null;
}
function hm(e, t) {
  return t === y.End ? !0 : e[t] instanceof et;
}
function cn(e, t, n) {
  const r = (n ?? am) / 4;
  return r === 1 ? 1 : hm(e, t) ? r : 1;
}
function Ri(e, t) {
  return { xQ: Dn(e.centerX >> 2, t), zQ: Dn(e.centerZ >> 2, t) };
}
function ts(e, t, n) {
  const r = xe * t,
    i = D((e.maxX >> 2) - n.xQ, r) - D((e.minX >> 2) - n.xQ, r) + 1,
    o = D((e.maxZ >> 2) - n.zQ, r) - D((e.minZ >> 2) - n.zQ, r) + 1;
  return i * o;
}
const si = ["depth0", "bottom", "caveDepth"];
function Fi(e, t) {
  return t === y.Overworld
    ? cr(e)
      ? si
      : ["depth0"]
    : t === y.Nether
      ? Us(e)
        ? si
        : ["depth0"]
      : ["depth0"];
}
function Oa(e) {
  switch (e.kind) {
    case "surface":
      return { mode: "biomes", getBiomesAt: "depth0" };
    case "underground":
      return { mode: "biomes", getBiomesAt: "caveDepth" };
    case "fixed":
      return { mode: "biomes", getBiomesAt: e.y };
  }
}
function za(e) {
  return { mode: "biomes", getBiomesAt: e };
}
function pm(e) {
  return si.includes(e);
}
function ns(e, t, n, r, i) {
  const { biomes: o } = ze(e, t, n >> 2, r >> 2, 1, 1, 1, {
    mode: "biomes",
    getBiomesAt: i,
  });
  return o[0];
}
async function _m(e, t, n, r, i, o, s, a, c, l, u = Ie) {
  const d = await Ai(l, t, [s.type], o, u),
    f = [],
    m = Ea(s.type, s.variantId, d[s.type] ?? [], n, i, o);
  if (m.length < a) return Zt;
  if ((m.sort((h, w) => Ia(h.poiId, w.poiId)), c !== void 0)) {
    const h = Math.max(a, rs);
    for (const w of m)
      if (
        (await u(),
        Ra(e, n, r, s.type, w.coords, [c]) && (f.push(w), f.length >= h))
      )
        break;
  } else f.push(...m);
  return f.length < a
    ? Zt
    : {
        passed: !0,
        witnessPoiIds: f.slice(0, a).map((h) => h.poiId),
        pois: f.slice(0, rs).map(Oi),
        clusters: [],
      };
}
const rs = 100,
  ym = { surface: "depth0", underground: "caveDepth", bottom: "bottom" };
function Ra(e, t, n, r, i, o) {
  const [s, a, c] = i;
  if (a != null) return o.includes(ns(e, n, s, c, a));
  const l = it[r].biomeScanHeights ?? ["surface"];
  let d = Fi(t, n).filter((f) => l.some((m) => ym[m] === f));
  return (
    d.length === 0 && (d = ["depth0"]),
    d.some((f) => o.includes(ns(e, n, s, c, f)))
  );
}
function wm(e, t) {
  if (e.length === 0) return [0, null, 0];
  const n = e.every((s) => s[1] != null),
    r = t && n ? 3 : 2,
    i = e.map((s) => (r === 3 ? [s[0], s[1], s[2]] : [s[0], s[2]])),
    o = bm(i, r);
  return r === 3
    ? [o.center[0], o.center[1], o.center[2]]
    : [o.center[0], null, o.center[1]];
}
function bm(e, t) {
  return ai(vm(e), e.length, [], t);
}
function ai(e, t, n, r) {
  if (t === 0 || n.length === r + 1) return Sm(n, r);
  const i = e[t - 1],
    o = ai(e, t - 1, n, r);
  return Fa(o, i) ? o : ai(e, t - 1, [...n, i], r);
}
function vm(e) {
  return [...e].sort((t, n) => os(t) - os(n) || Tm(t, n));
}
function Sm(e, t) {
  if (e.length === 0) return { center: Array(t).fill(0), r2: -1 };
  let n = null;
  const r = 1 << e.length;
  for (let i = 1; i < r; i++) {
    const o = e.filter((a, c) => (i & (1 << c)) !== 0),
      s = xm(o, t);
    s &&
      e.every((a) => Fa(s, a)) &&
      (n = n == null || s.r2 < n.r2 - Vi(n.r2) ? s : n);
  }
  return n ?? { center: [...e[0]], r2: 0 };
}
function xm(e, t) {
  if (e.length === 1) return { center: [...e[0]], r2: 0 };
  const n = e[0],
    r = e.slice(1).map((c) => c.map((l, u) => l - n[u])),
    i = r.map((c) => r.map((l) => 2 * is(c, l))),
    o = r.map((c) => is(c, c)),
    s = Cm(i, o);
  if (!s) return null;
  const a = [...n];
  for (let c = 0; c < r.length; c++)
    for (let l = 0; l < t; l++) a[l] += s[c] * r[c][l];
  return { center: a, r2: Pa(a, n) };
}
function Cm(e, t) {
  const n = t.length,
    r = e.map((i, o) => [...i, t[o]]);
  for (let i = 0; i < n; i++) {
    let o = i;
    for (let a = i + 1; a < n; a++)
      Math.abs(r[a][i]) > Math.abs(r[o][i]) && (o = a);
    if (Math.abs(r[o][i]) <= Ca) return null;
    [r[i], r[o]] = [r[o], r[i]];
    const s = r[i][i];
    for (let a = i; a <= n; a++) r[i][a] /= s;
    for (let a = 0; a < n; a++) {
      if (a === i) continue;
      const c = r[a][i];
      for (let l = i; l <= n; l++) r[a][l] -= c * r[i][l];
    }
  }
  return r.map((i) => i[n]);
}
function Fa(e, t) {
  return e.r2 >= 0 && Pa(e.center, t) <= e.r2 + Vi(e.r2);
}
function Pa(e, t) {
  let n = 0;
  for (let r = 0; r < e.length; r++) {
    const i = e[r] - t[r];
    n += i * i;
  }
  return n;
}
function is(e, t) {
  let n = 0;
  for (let r = 0; r < e.length; r++) n += e[r] * t[r];
  return n;
}
function os(e) {
  let t = 2166136261;
  for (const n of e) t = Math.imul(t ^ Math.round(n * 1024), 16777619);
  return t >>> 0;
}
function Tm(e, t) {
  for (let n = 0; n < e.length; n++) if (e[n] !== t[n]) return e[n] - t[n];
  return e.length - t.length;
}
async function Bm(e, t, n, r, i, o, s = Ie) {
  const a = await La(e, t, n, r, i, o, s, 1),
    [c] = a;
  return c == null
    ? Zt
    : {
        passed: !0,
        witnessPoiIds: c.witnesses.map((l) => l.poiId),
        pois: c.witnesses.map(Oi),
        clusters: [
          {
            x: c.coords[0],
            z: c.coords[2],
            y: c.coords[1] ?? void 0,
            radius: i.radius.meters,
            members: i.members.map((l) => l.poi),
            witnessCount: c.witnesses.length,
          },
        ],
      };
}
async function Im(e, t, n, r, i, o, s, a, c = Ie) {
  const l = i * 16,
    u = o * 16,
    d = (i + s) * 16 - 1,
    f = (o + a) * 16 - 1,
    m = Math.max(0, r.radius.meters),
    h = {
      centerX: (l + d) / 2,
      centerZ: (u + f) / 2,
      minX: Math.floor(l - m),
      maxX: Math.ceil(d + m),
      minZ: Math.floor(u - m),
      maxZ: Math.ceil(f + m),
    },
    w = { shape: { kind: "square", inradius: (h.maxX - h.minX + 1) / 2 } };
  return (await La(t, n, w, h, r, e, c)).filter((x) => {
    const C = Math.floor(x.coords[0]),
      E = Math.floor(x.coords[2]);
    return C >= l && C <= d && E >= u && E <= f;
  });
}
async function La(e, t, n, r, i, o, s, a) {
  if (i.members.length === 0) return [];
  const c = i.members.map((I) => I.poi.type),
    l = await Ai(o, e, c, r, s),
    u = i.members.map((I) =>
      Ea(I.poi.type, I.poi.variantId, l[I.poi.type] ?? [], t, n, r),
    );
  for (let I = 0; I < i.members.length; I++)
    if (u[I].length < i.members[I].minAmount) return [];
  const d = [].concat(...u).map((I) => I.coords),
    { meters: f, threeD: m } = i.radius,
    h = f * f,
    w = m && d.every((I) => I[1] != null),
    v = (I, A) => Ta(I, A, w) <= h + Vi(h),
    x = [...d];
  let C = 0;
  if (w)
    for (let I = 0; I < d.length; I++) {
      const A = d[I];
      for (let L = I + 1; L < d.length; L++) {
        ++C % 250 === 0 && (await s());
        const P = d[L],
          R = A[0] - P[0],
          z = A[2] - P[2],
          O = A[1] - P[1];
        if (R * R + z * z + O * O > 4 * h) continue;
        const F = (A[1] + P[1]) / 2;
        x.push([(A[0] + P[0]) / 2, F, (A[2] + P[2]) / 2]);
        for (let U = L + 1; U < d.length; U++) {
          ++C % 250 === 0 && (await s());
          const J = d[U];
          Sd(x, A, P, J, h);
        }
      }
    }
  else
    for (let I = 0; I < d.length; I++)
      for (let A = I + 1; A < d.length; A++)
        (++C % 250 === 0 && (await s()), vd(x, d[I], d[A], h));
  const E = [],
    k = [],
    M = new Set();
  for (const I of x) {
    ++C % 50 === 0 && (await s());
    const A = [];
    let L = !0;
    for (let U = 0; U < i.members.length; U++) {
      const J = i.members[U].minAmount;
      let K = 0;
      for (const G of u[U]) v(I, G.coords) && (A.push(G), K++);
      if (K < J) {
        L = !1;
        break;
      }
    }
    if (!L) continue;
    const P = om(A),
      R = P.map((U) => U.poiId),
      z = R.join("|");
    if (M.has(z)) continue;
    M.add(z);
    const O = Em(P, w),
      F = { coords: O.coords, maxDistance: O.maxDistance, witnesses: P };
    if (km(E, k, F, R) && a !== void 0 && E.length >= a) return E;
  }
  return E;
}
function Em(e, t) {
  const n = wm(
    e.map((i) => i.coords),
    t,
  );
  let r = 0;
  for (const i of e) r = Math.max(r, Ta(i.coords, n, t));
  return { coords: n, maxDistance: Math.sqrt(r) };
}
function km(e, t, n, r) {
  const i = new Set(r);
  for (const o of t) if (ss(i, o)) return !1;
  for (let o = e.length - 1; o >= 0; o--)
    ss(t[o], i) && (e.splice(o, 1), t.splice(o, 1));
  return (e.push(n), t.push(i), !0);
}
function ss(e, t) {
  for (const n of e) if (!t.has(n)) return !1;
  return !0;
}
async function Vm(e, t, n, r, i, o, s, a, c, l, u = Ie, d = !1) {
  const f = Am(e, t, n, o, s, c),
    m = new Set(s),
    h = cn(e, n, a),
    w = gr(i, h, d),
    v = Aa(e, n, i, h, w);
  if (v !== null) {
    const x = await as(e, n, r, i, f, o, m, l, u, v, Vt(i, h, v), w, !1);
    switch (o) {
      case "includes-all":
      case "includes-any":
        if (x) return !0;
        break;
      case "excludes-all":
      case "limited-to":
        if (!x) return !1;
        break;
    }
  }
  return as(e, n, r, i, f, o, m, l, u, h, Vt(i, h, h), w, !0);
}
async function as(e, t, n, r, i, o, s, a, c, l, u, d, f) {
  const m = new Set();
  let h = !0;
  for (const w of i) {
    const v = await hr(a, e, t, r, w.options, c, l, u, d);
    switch (
      (w.gateLand
        ? (await zm(e, t, n, r, v, o, s, m, c, f)) && (h = !1)
        : await an(v, n, r, c, (x) => {
            const C = v.biomes[x];
            s.has(C) ? m.add(C) : o === "limited-to" && (h = !1);
          }),
      o)
    ) {
      case "includes-all":
        if (m.size === s.size) return !0;
        break;
      case "includes-any":
        if (m.size > 0) return !0;
        break;
      case "excludes-all":
        if (m.size > 0) return !1;
        break;
      case "limited-to":
        if (!h) return !1;
        break;
    }
  }
  switch (o) {
    case "includes-all":
      return m.size === s.size;
    case "includes-any":
      return m.size > 0;
    case "excludes-all":
      return m.size === 0;
    case "limited-to":
      return h && (!f || m.size > 0);
  }
}
async function Mm(e, t, n, r, i, o, s, a, c, l = Ie, u = !1) {
  const d = Fi(t, n),
    f = cn(e, n, a),
    m = gr(i, f, u),
    h = Aa(e, n, i, f, m);
  if (h !== null) {
    const v = await cs(e, n, r, i, d, s, c, l, h, Vt(i, f, h), m);
    switch (o) {
      case "at-least":
        if (v.size >= s) return !0;
        break;
      case "at-most":
      case "exactly":
        if (v.size > s) return !1;
        break;
    }
  }
  const w = await cs(e, n, r, i, d, s, c, l, f, Vt(i, f, f), m);
  switch (o) {
    case "at-least":
      return w.size >= s;
    case "at-most":
      return w.size <= s;
    case "exactly":
      return w.size === s;
  }
}
async function cs(e, t, n, r, i, o, s, a, c, l, u) {
  const d = new Set();
  for (const f of i) {
    const m = await hr(s, e, t, r, za(f), a, c, l, u);
    if (
      (await an(m, n, r, a, (h) => {
        d.add(m.biomes[h]);
      }),
      d.size > o)
    )
      return d;
  }
  return d;
}
function Am(e, t, n, r, i, o) {
  if (o !== void 0 && n === y.Overworld && e[n] instanceof et) {
    const s = o.kind === "surface" && o.surfaceKind === "land";
    return [{ options: Oa(o), gateLand: s }];
  }
  return Om(t, n, r, i).map((s) => ({ options: za(s), gateLand: !1 }));
}
function Om(e, t, n, r) {
  const i = Fi(e, t);
  if (n !== "includes-all" && n !== "includes-any") return i;
  const o = new Set();
  for (const s of r) {
    const a = Wc(s);
    pm(a) && o.add(a);
  }
  return i.filter((s) => o.has(s));
}
async function zm(e, t, n, r, i, o, s, a, c, l) {
  const u = [];
  let d = i.xLen,
    f = -1,
    m = -1;
  if (
    (await an(i, n, r, c, (E) => {
      if (!(o === "limited-to" ? l || !s.has(i.biomes[E]) : s.has(i.biomes[E])))
        return;
      u.push(E);
      const M = E % i.xLen,
        I = Math.floor(E / i.xLen);
      (M < d && (d = M), M > f && (f = M), I > m && (m = I));
    }),
    u.length === 0)
  )
    return !1;
  const h = f - d + 1,
    w = Math.max(1, Math.floor(Va / h));
  let v = 0,
    x = 0,
    C = null;
  for (const E of u) {
    const k = E % i.xLen,
      M = Math.floor(E / i.xLen);
    if (
      (M >= x &&
        (await c(),
        (v = M),
        (x = Math.min(m + 1, M + w)),
        ({ heights: C } = ze(
          e,
          t,
          i.xQ0 + d * i.stepQ,
          i.zQ0 + v * i.stepQ,
          h,
          x - v,
          i.stepQ,
          {
            mode: "heights",
            getHeightLevelAt: "oceanFloor",
            surfaceCheckType: "fastApproximate",
          },
        ))),
      C !== null && C[(M - v) * h + (k - d)] < Mi)
    )
      continue;
    const I = i.biomes[E];
    if (s.has(I)) {
      if ((a.add(I), o === "includes-all")) {
        if (a.size === s.size) break;
      } else if (o !== "limited-to") break;
    } else return !0;
  }
  return !1;
}
async function Rm(e, t, n, r, i, o, s, a, c = Ie, l = !1) {
  if (i === void 0 && o === void 0) return !0;
  const u = cn(e, t, s),
    d = await hr(
      a,
      e,
      t,
      r,
      {
        mode: "heights",
        getHeightLevelAt: "oceanFloor",
        surfaceCheckType: "fastApproximate",
      },
      c,
      u,
      u > 1 ? Ri(r, u) : mr,
      gr(r, u, l),
    );
  if (!d.heights) return !0;
  const f = [];
  let m = 1 / 0,
    h = -1 / 0;
  if (
    (await an(d, n, r, c, (x) => {
      const C = d.heights[x];
      (f.push(C), C < m && (m = C), C > h && (h = C));
    }),
    f.length === 0)
  )
    return !0;
  const w = Na(f, m, h),
    v = m + ci(w, Math.floor(f.length / 2));
  return !((i !== void 0 && v < i) || (o !== void 0 && v > o));
}
async function Fm(e, t, n, r, i, o, s, a, c = Ie, l = !1) {
  const u = cn(e, t, s),
    d = await hr(
      a,
      e,
      t,
      r,
      {
        mode: "heights",
        getHeightLevelAt: "oceanFloor",
        surfaceCheckType: "fastApproximate",
      },
      c,
      u,
      u > 1 ? Ri(r, u) : mr,
      gr(r, u, l),
    );
  if (!d.heights) return !0;
  const f = [],
    m = new Uint8Array(d.heights.length);
  let h = 1 / 0,
    w = -1 / 0;
  if (
    (await an(d, n, r, c, (z) => {
      const O = d.heights[z];
      (f.push(O), (m[z] = 1), O < h && (h = O), O > w && (w = O));
    }),
    f.length === 0)
  )
    return !0;
  const v = Na(f, h, w),
    x = Math.min(
      f.length - 1,
      Math.max(0, Math.floor((i.lowerPercentile / 100) * f.length)),
    ),
    C = Math.min(
      f.length - 1,
      Math.max(0, Math.ceil((i.upperPercentile / 100) * f.length) - 1),
    ),
    E = h + ci(v, x);
  if (h + ci(v, C) - E > um(i.maxBlocksAt128, n)) return !1;
  const M = d.heights,
    I = new Int32Array(w - h + 1);
  let A = 0;
  for (let z = 0; z < d.zLen; z++) {
    await c();
    for (let O = 0; O < d.xLen; O++) {
      const F = z * d.xLen + O;
      m[F] &&
        (O + 1 < d.xLen && m[F + 1] && (I[Math.abs(M[F + 1] - M[F])]++, A++),
        z + 1 < d.zLen &&
          m[F + d.xLen] &&
          (I[Math.abs(M[F + d.xLen] - M[F])]++, A++));
    }
  }
  if (A === 0) return !0;
  const L = Math.max(1, Math.ceil(A * 0.95));
  let P = 0,
    R = L;
  for (let z = 0; z < I.length && R > 0; z++) {
    const O = Math.min(I[z], R);
    ((P += z * O), (R -= O));
  }
  return P / (4 * u) / L <= o;
}
function Na(e, t, n) {
  const r = new Int32Array(n - t + 1);
  for (const i of e) r[i - t]++;
  return r;
}
function ci(e, t) {
  let n = 0;
  for (let r = 0; r < e.length; r++) if (((n += e[r]), n > t)) return r;
  return e.length - 1;
}
async function Ha(e, t, n, r, i, o, s, a, c = Ie, l = !1) {
  const u = [],
    d = [],
    f = [];
  for (const m of s) {
    const h = Od(m, i, o);
    for (const w of m.conditions) {
      const v = await Pm(e, t, n, r, m, h, w, a, c, l);
      if (!v.passed) return Zt;
      (u.push(...v.witnessPoiIds), d.push(...v.pois), f.push(...v.clusters));
    }
  }
  return { passed: !0, witnessPoiIds: u, pois: d, clusters: f };
}
async function Pm(e, t, n, r, i, o, s, a, c, l) {
  switch (s.kind) {
    case "poi-presence":
      return _m(e, t, n, r, i, o, s.poi, s.minAmount, s.biomeAtPos, a, c);
    case "poi-cluster":
      return Bm(t, n, i, o, s, a, c);
    case "biome-filter":
      return xn(
        await Vm(
          e,
          n,
          r,
          i,
          o,
          s.mode,
          s.biomes,
          s.sampleGrid,
          s.scanHeight,
          a,
          c,
          l,
        ),
      );
    case "biome-variance":
      return xn(
        await Mm(e, n, r, i, o, s.comparator, s.count, s.sampleGrid, a, c, l),
      );
    case "terrain-height":
      return xn(await Rm(e, r, i, o, s.minY, s.maxY, s.sampleGrid, a, c, l));
    case "flatness":
      return xn(
        await Fm(e, r, i, o, s.range, s.maxAverageSlope, s.sampleGrid, a, c, l),
      );
  }
}
function xn(e) {
  return e ? Ad : Zt;
}
const Lm = 400,
  Pi = 1,
  fe = 10,
  Gn = 4,
  ae = 4,
  ce = 2,
  Nm = 255;
function Li(e) {
  const t = e * Gn;
  if (t % ce !== 0)
    throw new Error(
      `Biome patch tile quart length ${t} must be divisible by stride ${ce}`,
    );
  return t / ce;
}
function jn(e, t, n = 1) {
  const r = Math.max(Pi, t),
    i = n * ae;
  return e * i * i >= r;
}
function Ni(e, t) {
  const n = e.qStride * ae;
  return { blocks: e.cellCount * n * n, kind: t };
}
function Hm(e, t) {
  return { blocks: (e.maxX - e.minX + 1) * (e.maxZ - e.minZ + 1), kind: t };
}
function Dm(e) {
  const t = Li(e);
  return fe * fe * t * t;
}
function Da(e) {
  return {
    minX: e.minQX * ae,
    maxX: e.maxQX * ae + e.qStride * ae - 1,
    minZ: e.minQZ * ae,
    maxZ: e.maxQZ * ae + e.qStride * ae - 1,
  };
}
function Wa(e) {
  const t = (e.qStride * ae) / 2;
  return {
    worldX: Math.round((e.sumQX / e.cellCount) * ae + t),
    worldZ: Math.round((e.sumQZ / e.cellCount) * ae + t),
  };
}
function Ga(e) {
  return {
    worldX: Math.round((e.minX + e.maxX) / 2),
    worldZ: Math.round((e.minZ + e.maxZ) / 2),
  };
}
function ja(e, t) {
  const n = D(e.scanTileX, fe) * fe,
    r = D(e.scanTileZ, fe) * fe,
    i = n * t * 16,
    o = r * t * 16,
    s = fe * t * 16;
  return { minX: i, maxX: i + s - 1, minZ: o, maxZ: o + s - 1 };
}
function Hi(e) {
  const t = new Uint8Array(Math.max(...e) + 1);
  for (const n of e) t[n] = 1;
  return t;
}
function Wm(e) {
  return e.scanHeight.kind === "surface" && e.scanHeight.surfaceKind === "land";
}
function Gm(e, t, n, r, i) {
  return `biome-patch-tile:${Jr(e)}:${t.dimension}:${r}:${n}:stride=${ce}:${i}:`;
}
function Di(e, t, n, r, i, o, s, a) {
  const c = a + r + "," + i,
    l = bc(c);
  if (l) return l;
  const u = D(r, o),
    d = D(i, o),
    f = Li(o),
    m = r * Gn,
    h = i * Gn,
    w = Wm(n.anchor),
    { biomes: v } = ze(t, n.dimension, m, h, f, f, ce, Oa(n.anchor.scanHeight));
  let x = !1,
    C = v.length > 0,
    E = f,
    k = -1,
    M = f,
    I = -1;
  for (let L = 0; L < v.length; L++) {
    const P = s[v[L]] === 1;
    if (((x = x || P), (C = C && P), w && P)) {
      const R = L % f,
        z = Math.floor(L / f);
      (R < E && (E = R), R > k && (k = R), z < M && (M = z), z > I && (I = z));
    }
  }
  if (w && x) {
    const L = k - E + 1,
      P = I - M + 1,
      { heights: R } = ze(t, n.dimension, m + E * ce, h + M * ce, L, P, ce, {
        mode: "heights",
        getHeightLevelAt: "oceanFloor",
        surfaceCheckType: "fastApproximate",
      });
    if (R) {
      x = !1;
      let z = !1;
      for (let O = 0; O < P; O++)
        for (let F = 0; F < L; F++) {
          const U = (M + O) * f + (E + F);
          s[v[U]] === 1 &&
            (R[O * L + F] < Mi ? ((v[U] = Nm), (z = !0)) : (x = !0));
        }
      C = C && !z;
    }
  }
  const A = {
    chunkX: r,
    chunkZ: i,
    scanTileX: u,
    scanTileZ: d,
    qX0: m,
    qZ0: h,
    qLen: f,
    qStride: ce,
    biomes: v,
    anyTarget: x,
    allTarget: C,
  };
  return (vc(c, A), A);
}
async function jm(e, t, n, r, i, o, s, a) {
  const c = D(r.scanTileX, fe) * fe,
    l = D(r.scanTileZ, fe) * fe;
  for (let u = 0; u < fe; u++)
    for (let d = 0; d < fe; d++)
      if (
        (await a(), !Di(e, t, n, (c + d) * i, (l + u) * i, i, o, s).allTarget)
      )
        return !1;
  return !0;
}
const Um = 2 ** 26;
function Zm(e, t, n, r) {
  const i = e.qLen,
    o = [n];
  let s = 0;
  r[n] = 1;
  let a = 0,
    c = 0,
    l = 0,
    u = 1 / 0,
    d = -1 / 0,
    f = 1 / 0,
    m = -1 / 0,
    h = !1;
  for (; s < o.length;) {
    const w = o[s++],
      v = w % i,
      x = Math.floor(w / i),
      C = e.qX0 + v * e.qStride,
      E = e.qZ0 + x * e.qStride;
    (a++,
      (c += C),
      (l += E),
      (u = Math.min(u, C)),
      (d = Math.max(d, C)),
      (f = Math.min(f, E)),
      (m = Math.max(m, E)),
      (h = h || v === 0 || x === 0 || v === i - 1 || x === i - 1));
    for (let k = -1; k <= 1; k++)
      for (let M = -1; M <= 1; M++) {
        if (M === 0 && k === 0) continue;
        const I = v + M,
          A = x + k;
        I < 0 || I >= i || A < 0 || A >= i || Jm(o, r, e, t, A * i + I);
      }
  }
  return {
    qStride: e.qStride,
    seedQX: e.qX0 + (n % i) * e.qStride,
    seedQZ: e.qZ0 + Math.floor(n / i) * e.qStride,
    cellCount: a,
    sumQX: c,
    sumQZ: l,
    minQX: u,
    maxQX: d,
    minQZ: f,
    maxQZ: m,
    touchesEdge: h,
  };
}
function Jm(e, t, n, r, i) {
  t[i] || r[n.biomes[i]] !== 1 || ((t[i] = 1), e.push(i));
}
async function Xm(e, t, n, r, i, o, s, a, c, l) {
  const u = Li(r),
    d = r * Gn,
    f = new Map(),
    m = new Set(),
    h = [],
    w = [];
  let v = 0,
    x = 0,
    C = 0,
    E = 0,
    k = 1 / 0,
    M = -1 / 0,
    I = 1 / 0,
    A = -1 / 0,
    L = null;
  const P = () => ({
    exceededMaxTiles: !0,
    filledArea: Ni({ qStride: ce, cellCount: L ?? x }, "lower-bound"),
  });
  let R = null,
    z = null,
    O = 0,
    F = 0;
  const U = (J, K) => {
    let G = R;
    if (
      G === null ||
      J < G.qX0 ||
      J >= G.qX0 + F ||
      K < G.qZ0 ||
      K >= G.qZ0 + F
    ) {
      const me = D(J, d),
        se = D(K, d);
      ((G = Di(e, t, n, me * r, se * r, r, i, c)),
        (R = G),
        (F = G.qLen * G.qStride),
        (O = me * Um + se),
        (z = f.get(O) ?? null));
    }
    const ee = Math.floor((J - G.qX0) / G.qStride),
      te = Math.floor((K - G.qZ0) / G.qStride) * u + ee;
    if (i[G.biomes[te]] !== 1) return !0;
    let Q = z;
    return (
      Q === null &&
        ((Q = new Uint8Array(G.biomes.length)), f.set(O, Q), (z = Q)),
      Q[te]
        ? !0
        : ((Q[te] = 1),
          m.add(O),
          m.size > Lm && jn(x + 1, a, ce)
            ? ((L = x + 1), !1)
            : (h.push(J),
              w.push(K),
              x++,
              (C += J),
              (E += K),
              (k = Math.min(k, J)),
              (M = Math.max(M, J)),
              (I = Math.min(I, K)),
              (A = Math.max(A, K)),
              !0))
    );
  };
  if (!U(o, s)) return P();
  for (; v < h.length;) {
    v % 50 === 0 && (await l());
    const J = h[v],
      K = w[v];
    v++;
    for (let G = -1; G <= 1; G++)
      for (let ee = -1; ee <= 1; ee++)
        if (!(ee === 0 && G === 0) && !U(J + ee * ce, K + G * ce)) return P();
  }
  return {
    exceededMaxTiles: !1,
    qStride: ce,
    cellCount: x,
    sumQX: C,
    sumQZ: E,
    minQX: k,
    maxQX: M,
    minQZ: I,
    maxQZ: A,
  };
}
function Ua(e, t, n, r) {
  return [
    "biome-patch",
    e.dimension,
    n,
    t,
    "finite",
    `stride=${r.qStride}`,
    r.minQX,
    r.minQZ,
    r.maxQX,
    r.maxQZ,
    r.cellCount,
  ].join(":");
}
function Za(e, t, n, r) {
  const i = D(t.scanTileX, fe),
    o = D(t.scanTileZ, fe);
  return ["biome-patch", e.dimension, r, n, "split", `stride=${ce}`, i, o].join(
    ":",
  );
}
function $m(e) {
  return [...new Set(e)].sort((t, n) => t - n).join(",");
}
function Km(e) {
  return e.kind === "fixed"
    ? `fixed:${e.y}`
    : e.kind === "surface"
      ? `surface:${e.surfaceKind}`
      : e.kind;
}
async function Qm(e, t, n, r, i, o, s, a) {
  const c = n.anchor;
  if (c.biomes.length === 0) return [];
  const l = Hi(c.biomes),
    u = $m(c.biomes),
    d = Km(c.scanHeight),
    f = Gm(t, n, u, d, o),
    m = Di(s, e, n, r, i, o, l, f);
  if (!m.anyTarget) return [];
  const h = [],
    w = c.minPatchSize ?? Pi;
  if (m.allTarget && jn(Dm(o), w, ce) && (await jm(s, e, n, m, o, l, f, a))) {
    const x = ja(m, o);
    return [
      ls(n, {
        dedupeKey: Za(n, m, u, d),
        center: Ga(x),
        bounds: x,
        filledArea: Hm(x, "lower-bound"),
        split: !0,
      }),
    ];
  }
  const v = new Uint8Array(m.biomes.length);
  for (let x = 0; x < m.biomes.length; x++) {
    if ((x % 1e3 === 0 && (await a()), v[x] || l[m.biomes[x]] !== 1)) continue;
    const C = Zm(m, l, x, v),
      E = C.touchesEdge
        ? await qm(s, e, n, m, o, l, u, d, f, C, a)
        : jn(C.cellCount, w, C.qStride)
          ? {
              dedupeKey: Ua(n, u, d, {
                qStride: C.qStride,
                cellCount: C.cellCount,
                minQX: C.minQX,
                maxQX: C.maxQX,
                minQZ: C.minQZ,
                maxQZ: C.maxQZ,
              }),
              center: Wa(C),
              bounds: Da(C),
              filledArea: Ni(C, "exact"),
              split: !1,
            }
          : null;
    E && h.push(ls(n, E));
  }
  return h;
}
async function qm(e, t, n, r, i, o, s, a, c, l, u) {
  const d = n.anchor.minPatchSize ?? Pi,
    f = await Xm(e, t, n, i, o, l.seedQX, l.seedQZ, d, c, u);
  if (f.exceededMaxTiles) {
    const m = ja(r, i);
    return {
      dedupeKey: Za(n, r, s, a),
      center: Ga(m),
      bounds: m,
      filledArea: f.filledArea,
      split: !0,
    };
  }
  return jn(f.cellCount, d, f.qStride)
    ? {
        dedupeKey: Ua(n, s, a, f),
        center: Wa(f),
        bounds: Da(f),
        filledArea: Ni(f, "exact"),
        split: !1,
      }
    : null;
}
function ls(e, t) {
  const { worldX: n, worldZ: r } = t.center;
  return {
    worldX: n,
    worldZ: r,
    chunk: [n >> 4, r >> 4],
    data: {
      type: "biome-patch",
      biomes: e.anchor.biomes,
      scanHeight: e.anchor.scanHeight,
      minPatchSize: e.anchor.minPatchSize,
      bounds: t.bounds,
      filledArea: t.filledArea,
      split: t.split,
    },
    dedupeKey: t.dedupeKey,
    anchorPois: [],
    regionPois: [],
  };
}
const Ym = new Set([
  g.SlimeChunk,
  g.Dungeon,
  g.Fossil,
  g.FossilNether,
  g.AmethystGeode,
  g.Cave,
  g.LavaPool,
]);
function eg(e) {
  return e.anchor.kind === "poi" && Ym.has(e.anchor.poi.type);
}
async function tg(e, t, n, r, i, o) {
  let a = 0;
  const c = Ts(o);
  try {
    const l = Rt(e),
      { poiFinder: u, providers: d } = Pt(l),
      f = new Map(),
      m = await ng(d, u, l, t, n, r, i, f, c);
    if (t.regions.length === 0) return ((a = m.length), m);
    const h = eg(t),
      w = [];
    for (const v of m) {
      await c();
      const x = await Ha(
        d,
        u,
        l,
        t.dimension,
        v.worldX,
        v.worldZ,
        t.regions,
        f,
        c,
        h,
      );
      x.passed && ((v.regionPois = x.pois.map((C) => C.poiId)), w.push(v));
    }
    return ((a = w.length), w);
  } catch (l) {
    if (l instanceof Et) return [];
    throw l;
  }
}
async function ng(e, t, n, r, i, o, s, a, c) {
  switch (r.anchor.kind) {
    case "biome-patch":
      return Qm(e, n, r, i, o, s, a, c);
    case "cluster":
      return (await Im(a, t, n, r.anchor, i, o, s, s, c)).map((u) => {
        const d = u.witnesses.map((f) => f.poiId);
        return {
          worldX: u.coords[0],
          worldY: u.coords[1] ?? void 0,
          worldZ: u.coords[2],
          chunk: [u.coords[0] >> 4, u.coords[2] >> 4],
          data: { type: "cluster", maxDistance: u.maxDistance },
          dedupeKey: `witness:${d.join("|")}`,
          anchorPois: d,
          regionPois: [],
        };
      });
    case "poi": {
      const l = r.anchor.poi,
        d = (await im(a, t, [l.type], i, o, s, s, c))[l.type]?.filter(
          (m) => m[0] >= i && m[0] < i + s && m[1] >= o && m[1] < o + s,
        );
      if (!d) return [];
      const f = [];
      for (const m of zi(l.type, l.variantId, d, n))
        (r.anchor.biomesAtPos !== void 0 &&
          (await c(),
          !Ra(e, n, r.dimension, l.type, m.coords, r.anchor.biomesAtPos))) ||
          f.push({
            worldX: m.coords[0],
            worldZ: m.coords[2],
            chunk: m.chunk,
            data: { type: "poi", poiData: m.data },
            anchorPois: [m.poiId],
            regionPois: [],
          });
      return f;
    }
  }
}
const us = 16,
  Fe = 16,
  rg = 2 ** 26,
  fs = Hi(Ur.IS_OCEAN),
  ig = [...Ur.IS_BEACH, ...Ur.IS_RIVER];
async function og(e, t, n, r, i, o, s) {
  const a = cn(e, t, i.sampleGrid),
    c = n >> 2,
    l = r >> 2,
    u = a * a,
    d = i.minChunks * us,
    f = i.maxChunks * us,
    m = Fe * a,
    h = `island-tile:${t}:s${a}:a${c},${l}:`,
    w = new Uint32Array(256),
    v = new Map(),
    x = [],
    C = [];
  let E = 0,
    k = 0,
    M = 1 / 0,
    I = -1 / 0,
    A = 1 / 0,
    L = -1 / 0,
    P = 1 / 0,
    R = 1 / 0,
    z = new Uint8Array(0),
    O = null,
    F = 0;
  const U = (te, Q) => {
      ((P = te), (R = Q), (F = te * rg + Q));
      const me = h + te + "," + Q;
      let se = o.get(me);
      (se === void 0 &&
        (({ biomes: se } = ze(e, t, c + te * m, l + Q * m, Fe, Fe, a, {
          mode: "biomes",
          getBiomesAt: "depth0",
        })),
        o.set(me, se)),
        (z = se),
        (O = v.get(F) ?? null));
    },
    J = (te, Q) => {
      const me = D(te, Fe),
        se = D(Q, Fe);
      (me !== P || se !== R) && U(me, se);
      const Ja = te - me * Fe,
        _r = (Q - se * Fe) * Fe + Ja,
        Wi = z[_r];
      if (fs[Wi] === 1) return !0;
      let Ct = O;
      return (
        Ct === null && ((Ct = new Uint8Array(Fe * Fe)), v.set(F, Ct), (O = Ct)),
        Ct[_r]
          ? !0
          : ((Ct[_r] = 1),
            (k += u),
            k > f
              ? !1
              : (w[Wi]++,
                te < M && (M = te),
                te > I && (I = te),
                Q < A && (A = Q),
                Q > L && (L = Q),
                x.push(te),
                C.push(Q),
                !0))
      );
    },
    { biomes: K } = ze(e, t, c, l, 1, 1, a, {
      mode: "biomes",
      getBiomesAt: "depth0",
    });
  if (fs[K[0]] === 1 || (U(0, 0), !J(0, 0))) return null;
  for (; E < x.length;) {
    E % 50 === 0 && (await s());
    const te = x[E],
      Q = C[E];
    E++;
    for (let me = -1; me <= 1; me++)
      for (let se = -1; se <= 1; se++)
        if (!(se === 0 && me === 0) && !J(te + se, Q + me)) return null;
  }
  if (k < d || !sg(i, w)) return null;
  const G = a * ae,
    ee = c * ae,
    pr = l * ae;
  return {
    bounds: {
      minX: ee + M * G,
      maxX: ee + (I + 1) * G - 1,
      minZ: pr + A * G,
      maxZ: pr + (L + 1) * G - 1,
    },
    filledArea: { blocks: k * ae * ae, kind: a === 1 ? "exact" : "estimate" },
  };
}
function sg(e, t) {
  switch (e.mode) {
    case "any":
      return !0;
    case "includes-any":
      return e.biomes.some((n) => t[n] > 0);
    case "includes-all":
      return e.biomes.every((n) => t[n] > 0);
    case "excludes-all":
      return !e.biomes.some((n) => t[n] > 0);
    case "limited-to": {
      const n = Hi([...e.biomes, ...ig]);
      for (let r = 0; r < t.length; r++) if (t[r] > 0 && n[r] !== 1) return !1;
      return e.biomes.some((r) => t[r] > 0);
    }
  }
}
function ag() {
  const e = Math.floor(Math.random() * 4294967296),
    t = Math.floor(Math.random() * 4294967296);
  return V.fromBits(t, e).toString();
}
const ds = 1e4;
async function cg(e, t, n, r, i, o) {
  if (t.kind === "random" && !(o !== void 0 && o > 0 && o <= ds))
    throw new Error(
      `findSeeds: a random seed source requires a batch budget in (0, ${ds}] ms, got ${o}`,
    );
  const s = performance.now(),
    a = lg(t),
    c = Ts(r),
    l = async () => {
      if (i !== void 0 && Date.now() >= i) throw new Et();
      if ((await c(), i !== void 0 && Date.now() >= i)) throw new Et();
    },
    u = [];
  let d = 0;
  const f = () => o === void 0 || performance.now() - s < o;
  try {
    for (let m = a(); m !== null && f(); m = a()) {
      await l();
      const h = await ug(e, m, n, l);
      (d++, h !== null && u.push(h));
    }
  } catch (m) {
    if (!(m instanceof Et)) throw m;
  }
  return { matches: u, scannedCount: d };
}
function lg(e) {
  switch (e.kind) {
    case "random": {
      const { use32Bit: t } = e;
      return () => {
        const n = ag();
        return t ? `${V.fromString(n).toInt()}` : n;
      };
    }
    case "list": {
      let t = 0;
      return () => (t < e.seeds.length ? e.seeds[t++] : null);
    }
  }
}
async function ug(e, t, n, r) {
  const i = Rt({ ...e, seed: t }),
    { providers: o, poiFinder: s } = Pt(i),
    a = new Map(),
    c = await hg(s, i, n),
    l = {
      providers: o,
      poiFinder: s,
      world: i,
      cache: a,
      checkpoint: r,
      anchorX: c.x,
      anchorZ: c.z,
      regionPois: {},
      clusters: {},
      islands: {},
    };
  for (const [u, d] of Object.entries(n.anchorConditions)) {
    if (d.length === 0) continue;
    const f = d.filter(fg);
    if (f.length > 0 && !(await ms(l, u, [dg(f)]))) return null;
    for (const m of d)
      if (m.kind === "anchor-island" && !(await gg(l, u, m))) return null;
  }
  for (const [u, d] of Object.entries(n.regions))
    if (d.length !== 0 && !(await ms(l, u, d))) return null;
  return {
    seed: t,
    anchorX: c.x,
    anchorZ: c.z,
    anchorPois: c.pois,
    regionPois: l.regionPois,
    clusters: l.clusters,
    islands: l.islands,
  };
}
async function ms(e, t, n) {
  const [r, i] = ka(e.anchorX, e.anchorZ, t),
    o = await Ha(
      e.providers,
      e.poiFinder,
      e.world,
      t,
      r,
      i,
      n,
      e.cache,
      e.checkpoint,
      !1,
    );
  return o.passed
    ? (o.pois.length > 0 &&
        (e.regionPois[t] = [...(e.regionPois[t] ?? []), ...o.pois]),
      o.clusters.length > 0 &&
        (e.clusters[t] = [...(e.clusters[t] ?? []), ...o.clusters]),
      !0)
    : !1;
}
function fg(e) {
  return e.kind !== "anchor-island";
}
function dg(e) {
  return { shape: { kind: "square", inradius: 0 }, conditions: e.map(mg) };
}
function mg(e) {
  switch (e.kind) {
    case "anchor-biome":
      return {
        kind: "biome-filter",
        mode: e.mode === "in" ? "includes-any" : "excludes-all",
        biomes: e.biomes,
      };
    case "anchor-terrain-height":
      return { kind: "terrain-height", minY: e.minY, maxY: e.maxY };
  }
}
async function gg(e, t, n) {
  const [r, i] = ka(e.anchorX, e.anchorZ, t),
    o = await og(e.providers, t, r, i, n, e.cache, e.checkpoint);
  return o === null ? !1 : ((e.islands[t] = [...(e.islands[t] ?? []), o]), !0);
}
async function hg(e, t, n) {
  switch (n.anchor.kind) {
    case "origin":
      return { x: 0, z: 0, pois: [] };
    case "custom":
      return { x: n.anchor.x, z: n.anchor.z, pois: [] };
    case "spawn": {
      const r = xa(g.Spawn, t);
      if (r === null)
        throw new Error("spawn anchor: expected a finite generation area");
      const i = (await e(r, [g.Spawn]))[g.Spawn] ?? [],
        o = zi(g.Spawn, void 0, i, t)[0];
      if (o == null) throw new Error("spawn anchor: unsupported world");
      return { x: o.coords[0], z: o.coords[2], pois: [Oi(o)] };
    }
  }
}
async function pg(e, t) {
  if (t.anchor.kind !== "poi") return { kind: "unbounded" };
  const n = Rt(e),
    r = t.anchor.poi.type,
    i = xa(r, n);
  if (i === null) return { kind: "unbounded" };
  const { poiFinder: o } = Pt(n),
    s = (await o(i, [r]))[r] ?? [],
    a = new Set(),
    c = [];
  for (const l of s) {
    const u = `${l[0]},${l[1]}`;
    a.has(u) || (a.add(u), c.push([l[0], l[1]]));
  }
  return { kind: "finite", chunks: c };
}
function _g(e) {
  (_c(e), Sc());
}
async function yg() {
  await gc();
}
self.addEventListener("unhandledrejection", (e) => {
  throw e.reason;
});
var wg = Object.freeze({
  __proto__: null,
  cancelTask: _g,
  findSeeds: cg,
  getAnchorDomain: pg,
  getBiomeTileData: Td,
  getNoiseBiomeYColumnOverworld: Vd,
  getPois: Md,
  initWorker: yg,
  scanTile: tg,
  setSharedContextCallback: bd,
});
li(wg);

/*! Chunk Base (c) Alexander Gundermann - https://www.chunkbase.com - unauthorized copying prohibited */

//# chunkId=01a099e9-5e6c-7af1-aa32-3f5ef7c322a7
