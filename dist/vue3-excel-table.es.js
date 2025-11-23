import { ref as E, reactive as ye, computed as G, watch as W, onMounted as Qe, onBeforeUnmount as Ze, createElementBlock as _, openBlock as k, createElementVNode as I, createCommentVNode as A, Fragment as D, renderList as M, normalizeStyle as q, normalizeClass as P, withKeys as we, withModifiers as B, toDisplayString as N, nextTick as et } from "vue";
const tt = /* @__PURE__ */ new Set(["1", "true", "TRUE", "yes", "YES", "y", "Y", "x", "X"]), nt = /* @__PURE__ */ new Set(["0", "false", "FALSE", "no", "NO", "n", "N", "", null, void 0]), rt = {
  allowAddEmptyRow: !0,
  dropdownPasteMode: "both",
  undoLimit: 200,
  keyFields: []
}, S = {
  EDIT: "edit",
  PASTE: "paste",
  FILL: "fill",
  PROGRAMMATIC: "programmatic",
  UNDO: "undo"
};
function ot(c) {
  return c ? c.replace(/\r/g, "").split(`
`).filter((e, r, s) => !(e === "" && r === s.length - 1)).map((e) => e.split("	")) : [];
}
function J(c, e) {
  if (c === null || typeof c > "u")
    return "";
  const r = String(c);
  return e ? r : r.toLowerCase();
}
function st(c) {
  const e = c.dropdown ?? {}, r = Array.isArray(e.options) ? e.options.slice() : [], s = e.valueField ?? "value", i = e.displayField ?? "label", l = e.keyFields && e.keyFields.length > 0 ? e.keyFields.slice() : [s], f = e.pasteMode ?? c.pasteMode ?? "both", u = e.caseSensitive ?? !1, g = /* @__PURE__ */ new Map(), y = /* @__PURE__ */ new Map(), w = /* @__PURE__ */ new Map();
  return r.forEach((d) => {
    const b = d[s] ?? d, x = d[i] ?? d, m = l.map(($) => d[$]).join("||"), C = J(b, u), R = J(x, u);
    g.has(C) || g.set(C, d), y.has(R) || y.set(R, d), w.set(m, d);
  }), {
    options: r,
    valueField: s,
    displayField: i,
    keyFields: l,
    pasteMode: f,
    caseSensitive: u,
    indexByValue: g,
    indexByDisplay: y,
    indexByKey: w
  };
}
function ke(c, e, r) {
  const s = c._dropdown;
  if (!s)
    return null;
  const { pasteMode: i, caseSensitive: l } = s, f = r ?? i, u = J(e, l), g = f === "both" ? ["value", "display"] : [f];
  for (const y of g) {
    if (y === "value" && s.indexByValue.has(u))
      return s.indexByValue.get(u);
    if (y === "display" && s.indexByDisplay.has(u))
      return s.indexByDisplay.get(u);
  }
  return null;
}
function ge(c, e) {
  const r = c._dropdown;
  if (!r)
    return e;
  const s = J(e, r.caseSensitive), i = r.indexByValue.get(s);
  return i ? i[r.displayField] ?? i : e;
}
function xe(c, e) {
  const r = c._dropdown;
  return !r || !e ? null : e[r.valueField] ?? e;
}
function it(c, e) {
  if (!c._dropdown || e === null || typeof e > "u" || e === "")
    return e;
  const s = ke(c, e);
  return s ? xe(c, s) : e;
}
function L(c) {
  if (typeof c > "u" || c === null)
    return c;
  if (typeof structuredClone == "function")
    try {
      return structuredClone(c);
    } catch {
    }
  return Array.isArray(c) ? c.map((e) => L(e)) : typeof c == "object" ? Object.keys(c).reduce((e, r) => (e[r] = L(c[r]), e), {}) : c;
}
function lt(c, e) {
  return c === e || Number.isNaN(c) && Number.isNaN(e) ? !0 : JSON.stringify(c) === JSON.stringify(e);
}
function be(c) {
  if (c === null || typeof c > "u" || c === "")
    return null;
  if (typeof c == "number")
    return Number.isNaN(c) ? null : c;
  const e = Number(String(c).replace(/,/g, ""));
  return Number.isNaN(e) ? null : e;
}
function at(c) {
  return typeof c == "boolean" ? c : tt.has(c) ? !0 : nt.has(c) ? !1 : !!c;
}
function ut(c) {
  return Array.isArray(c) ? c : c === null || typeof c > "u" ? [] : [c];
}
function ct(c) {
  return ut(c).map((e) => typeof e == "string" ? { label: e, href: e } : e && typeof e == "object" ? {
    label: e.label ?? e.text ?? e.href ?? e.url ?? "",
    href: e.href ?? e.url ?? "#",
    target: e.target ?? "_blank"
  } : null).filter(Boolean);
}
function ve(c, e) {
  return `${c}:${e}`;
}
function dt(c, e) {
  if (!c.key && !c.field && !c.id)
    throw new Error(`Column at index ${e} must provide a key/field/id`);
  const r = c.key ?? c.field ?? c.id, s = {
    type: "text",
    editable: !0,
    filterable: !0,
    sortable: !0,
    allowPaste: !0,
    ...c,
    key: r,
    index: e
  };
  return s.type === "dropdown" && (s._dropdown = st(s)), s;
}
class _e {
  constructor({ columns: e, data: r = [], options: s = {} }) {
    if (!Array.isArray(e) || e.length === 0)
      throw new Error("TableModel requires a non-empty columns array");
    this.options = { ...rt, ...s }, this.columns = e.map((i, l) => dt(i, l)), this.columnIndex = new Map(this.columns.map((i, l) => [i.key, l])), this.rows = [], this.filters = /* @__PURE__ */ new Map(), this.errors = /* @__PURE__ */ new Map(), this.changeListeners = /* @__PURE__ */ new Set(), this.undoStack = [], this.redoStack = [], this.viewCache = [], this.sortState = null, this._suspendNotifications = !1, this.setData(r, { silent: !0 });
  }
  getColumn(e) {
    if (!this.columnIndex.has(e))
      throw new Error(`Unknown column key: ${e}`);
    return this.columns[this.columnIndex.get(e)];
  }
  getColumns() {
    return this.columns.slice();
  }
  getColumnIndex(e) {
    return this.columnIndex.get(e);
  }
  getColumnByIndex(e) {
    return this.columns[e];
  }
  setData(e, { silent: r = !1 } = {}) {
    const s = Array.isArray(e) ? e.map((i) => this._normalizeRow(i)) : [];
    this.rows = s, this.undoStack = [], this.redoStack = [], this._cleanTrailingEmptyRows(), this._refreshValidations(), this._rebuildView(), r || this._emitChange({
      type: "data:replace",
      source: S.PROGRAMMATIC,
      changes: [],
      affectedRowIndices: s.map((i, l) => l),
      rows: this.getRowsWithIndices(),
      errors: this.getErrorsGrouped()
    });
  }
  getRawData() {
    return L(this.rows);
  }
  getRowsWithIndices({ includeEmptyRow: e = !0 } = {}) {
    const r = this.viewCache.map(({ index: s, row: i, key: l }) => ({
      index: s,
      key: l,
      data: L(i)
    }));
    if (e && this.options.allowAddEmptyRow) {
      const s = this._createEmptyRow();
      r.push({
        index: this.rows.length,
        key: `__placeholder-${this.rows.length}`,
        data: s,
        isPlaceholder: !0
      });
    }
    return r;
  }
  getViewRows(e = {}) {
    return this.getRowsWithIndices(e);
  }
  getSortState() {
    return this.sortState ? { ...this.sortState } : null;
  }
  cycleSort(e) {
    if (!this.columnIndex.has(e))
      return this.getSortState();
    const s = this.sortState && this.sortState.columnKey === e ? this.sortState.direction : null;
    let i = null;
    return s ? s === "asc" ? i = "desc" : i = null : i = "asc", this.setSort(e, i);
  }
  setSort(e, r) {
    if (r && !this.columnIndex.has(e))
      return this.getSortState();
    const s = r ? { columnKey: e, direction: r } : null, i = this.sortState ? { ...this.sortState } : null;
    if (!i && !s || i && s && i.columnKey === s.columnKey && i.direction === s.direction)
      return this.getSortState();
    if (s) {
      if (this.getColumn(s.columnKey).sortable === !1)
        return this.getSortState();
      this.sortState = s;
    } else
      this.sortState = null;
    return this._rebuildView(), this._emitChange({
      type: "sort",
      source: S.PROGRAMMATIC,
      changes: [],
      affectedRowIndices: this.viewCache.map(({ index: l }) => l),
      rows: this.getRowsWithIndices(),
      errors: this.getErrorsGrouped(),
      sortState: this.getSortState()
    }), this.getSortState();
  }
  getRow(e) {
    return L(this.rows[e]);
  }
  getRowCount() {
    return this.rows.length;
  }
  setFilter(e, r) {
    r === null || typeof r > "u" || typeof r == "object" && Object.keys(r).length === 0 ? this.filters.delete(e) : this.filters.set(e, r), this._rebuildView(), this._emitChange({
      type: "filter",
      source: S.PROGRAMMATIC,
      changes: [],
      affectedRowIndices: this.viewCache.map(({ index: s }) => s),
      rows: this.getRowsWithIndices(),
      errors: this.getErrorsGrouped()
    });
  }
  clearFilters() {
    this.filters.clear(), this._rebuildView();
  }
  setCell(e, r, s, { source: i = S.EDIT } = {}) {
    return this._applyChangeSet([
      {
        rowIndex: e,
        columnKey: r,
        value: s
      }
    ], {
      source: i,
      type: "cell"
    });
  }
  bulkUpdate(e, { source: r = S.EDIT, type: s = "bulk" } = {}) {
    return this._applyChangeSet(e, { source: r, type: s });
  }
  paste(e, r, s, { source: i = S.PASTE } = {}) {
    const l = ot(s);
    if (l.length === 0)
      return null;
    const f = this.columnIndex.get(r);
    if (typeof f > "u")
      throw new Error(`Unknown column key ${r}`);
    const u = [];
    return l.forEach((g, y) => {
      g.forEach((w, d) => {
        const b = this.columns[f + d];
        !b || b.allowPaste === !1 || u.push({
          rowIndex: e + y,
          columnKey: b.key,
          value: b.type === "dropdown" ? this._resolveDropdownPasteValue(b, w) : w
        });
      });
    }), this._applyChangeSet(u, { source: i, type: "paste" });
  }
  fill(e, r, { source: s = S.FILL } = {}) {
    if (!e || !r)
      return null;
    const { startRow: i, endRow: l, startCol: f, endCol: u } = e, { endRow: g = l, endCol: y = u } = r, w = [];
    for (let b = i; b <= l; b += 1) {
      const x = [];
      for (let m = f; m <= u; m += 1) {
        const C = this.columns[m], R = this._ensureRow(b)[C.key];
        x.push(R);
      }
      w.push(x);
    }
    const d = [];
    if (g > l)
      for (let b = l + 1; b <= g; b += 1)
        w[(b - i) % w.length].forEach((m, C) => {
          const R = this.columns[f + C];
          R && R.editable && d.push({
            rowIndex: b,
            columnKey: R.key,
            value: m
          });
        });
    if (y > u)
      for (let b = u + 1; b <= y; b += 1) {
        const x = this.columns[b];
        if (!(!x || !x.editable))
          for (let m = i; m <= l; m += 1) {
            const C = w[(m - i) % w.length][(b - f) % w[0].length];
            d.push({
              rowIndex: m,
              columnKey: x.key,
              value: C
            });
          }
      }
    return d.length === 0 ? null : this._applyChangeSet(d, { source: s, type: "fill" });
  }
  undo() {
    const e = this.undoStack.pop();
    if (!e)
      return null;
    const r = e.changes.map(({ rowIndex: s, columnKey: i, from: l }) => ({
      rowIndex: s,
      columnKey: i,
      value: l
    }));
    return this.redoStack.push(e), this._applyChangeSet(r, {
      source: S.UNDO,
      type: e.type,
      skipUndo: !0
    });
  }
  redo() {
    const e = this.redoStack.pop();
    if (!e)
      return null;
    const r = e.changes.map(({ rowIndex: s, columnKey: i, to: l }) => ({
      rowIndex: s,
      columnKey: i,
      value: l
    }));
    return this._applyChangeSet(r, {
      source: S.EDIT,
      type: e.type,
      skipUndo: !1,
      restoreFromRedo: e
    });
  }
  registerChangeListener(e) {
    return this.changeListeners.add(e), () => {
      this.changeListeners.delete(e);
    };
  }
  suspendNotifications() {
    this._suspendNotifications = !0;
  }
  resumeNotifications() {
    this._suspendNotifications = !1;
  }
  getErrorsGrouped() {
    const e = {};
    return this.errors.forEach((r, s) => {
      e[s] = r.slice();
    }), e;
  }
  _resolveDropdownPasteValue(e, r) {
    if (!e._dropdown)
      return r;
    const s = ke(e, r, e._dropdown.pasteMode);
    return s ? xe(e, s) : r;
  }
  _ensureRow(e) {
    for (; e >= this.rows.length; )
      this.rows.push(this._createEmptyRow());
    return this.rows[e];
  }
  _normalizeRow(e) {
    const r = e ?? {}, s = {};
    return this.columns.forEach((i) => {
      const l = typeof i.accessor == "function" ? i.accessor(r) : r[i.key];
      s[i.key] = this._normalizeValue(i, l);
    }), s;
  }
  _normalizeValue(e, r) {
    switch (e.type) {
      case "number":
        return be(r);
      case "checkbox":
        return at(r);
      case "dropdown":
        return it(e, r);
      case "links":
        return ct(r);
      case "button":
        return r;
      default:
        return r;
    }
  }
  _applyChangeSet(e, {
    source: r,
    type: s,
    skipUndo: i = !1,
    restoreFromRedo: l = null
  }) {
    if (!Array.isArray(e) || e.length === 0)
      return null;
    const f = [], u = /* @__PURE__ */ new Set();
    if (e.forEach(({ rowIndex: y, columnKey: w, value: d }) => {
      if (typeof y != "number" || y < 0 || !this.columnIndex.has(w))
        return;
      const b = this.getColumn(w);
      if (b.editable === !1)
        return;
      const x = this._ensureRow(y), m = this._normalizeValue(b, d), C = x[w];
      lt(C, m) || (x[w] = m, f.push({ rowIndex: y, columnKey: w, oldValue: C, newValue: m }), u.add(y));
    }), f.length === 0)
      return null;
    if (i)
      l && this.undoStack.push(l);
    else {
      const y = {
        type: s,
        source: r,
        changes: f.map(({ rowIndex: w, columnKey: d, oldValue: b, newValue: x }) => ({
          rowIndex: w,
          columnKey: d,
          from: b,
          to: x
        }))
      };
      this.undoStack.push(y), this.undoStack.length > this.options.undoLimit && this.undoStack.shift(), this.redoStack = [];
    }
    this._cleanTrailingEmptyRows(), this._refreshValidations(Array.from(u)), this._rebuildView();
    const g = {
      type: s,
      source: r,
      changes: f.map(({ rowIndex: y, columnKey: w, oldValue: d, newValue: b }) => ({
        rowIndex: y,
        columnKey: w,
        oldValue: d,
        newValue: b
      })),
      affectedRowIndices: Array.from(u),
      rows: Array.from(u).map((y) => ({
        index: y,
        data: L(this.rows[y])
      })),
      errors: this.getErrorsGrouped()
    };
    return this._emitChange(g), g;
  }
  _cleanTrailingEmptyRows() {
    let e = this.rows.length - 1;
    for (; e >= 0 && this._isRowEmpty(this.rows[e]); )
      e -= 1;
    e < this.rows.length - 1 && this.rows.splice(e + 1);
  }
  _isRowEmpty(e) {
    return e ? this.columns.every((r) => {
      const s = e[r.key];
      return r.type === "checkbox" ? s === !1 || s === null || typeof s > "u" : r.type === "links" ? !s || s.length === 0 : s === null || typeof s > "u" || s === "";
    }) : !0;
  }
  _createEmptyRow() {
    const e = {};
    return this.columns.forEach((r) => {
      const s = typeof r.defaultValue == "function" ? r.defaultValue() : r.defaultValue ?? null;
      e[r.key] = this._normalizeValue(r, s);
    }), e;
  }
  _rebuildView() {
    const e = [];
    this.rows.forEach((s, i) => {
      this._passesFilters(s, i) && e.push({ row: s, index: i });
    });
    const r = this._getActiveSortColumn();
    if (r && this.sortState) {
      const s = this.sortState.direction === "desc" ? -1 : 1;
      e.sort((i, l) => s * this._compareRowsForSort(r, i, l));
    }
    this.viewCache = e.map(({ row: s, index: i }) => ({
      row: s,
      index: i,
      key: this._computeRowKey(s, i)
    }));
  }
  _getActiveSortColumn() {
    if (!this.sortState)
      return null;
    const e = this.columnIndex.get(this.sortState.columnKey);
    if (typeof e > "u")
      return this.sortState = null, null;
    const r = this.columns[e];
    return !r || r.sortable === !1 ? (this.sortState = null, null) : r;
  }
  _compareRowsForSort(e, r, s) {
    const i = this._normalizeSortValue(e, r.row[e.key]), l = this._normalizeSortValue(e, s.row[e.key]);
    if (i === null && l === null)
      return r.index - s.index;
    if (i === null)
      return 1;
    if (l === null)
      return -1;
    if (typeof i == "number" && typeof l == "number")
      return i === l ? r.index - s.index : i < l ? -1 : 1;
    const f = String(i).localeCompare(String(l), void 0, { sensitivity: "base" });
    return f === 0 ? r.index - s.index : f;
  }
  _normalizeSortValue(e, r) {
    if (r === null || typeof r > "u")
      return null;
    if (e.type === "number") {
      const s = be(r);
      return typeof s == "number" ? s : null;
    }
    if (e.type === "checkbox")
      return r ? 1 : 0;
    if (e.type === "dropdown") {
      const s = ge(e, r);
      return typeof s == "string" ? s.toLowerCase() : String(s ?? "").toLowerCase();
    }
    return e.type === "links" ? (r ?? []).map((s) => s?.label ?? s?.href ?? "").join("||").toLowerCase() : r instanceof Date ? r.getTime() : typeof r == "number" ? r : String(r).toLowerCase();
  }
  _passesFilters(e, r) {
    if (this.filters.size === 0)
      return !0;
    for (const [s, i] of this.filters.entries()) {
      const l = this.getColumn(s), f = e[l.key];
      if (i != null) {
        if (typeof l.filterPredicate == "function") {
          if (!l.filterPredicate({ value: f, row: e, rowIndex: r, filter: i, column: l, data: this.rows }))
            return !1;
          continue;
        }
        if (l.type === "number") {
          const { min: u, max: g } = i;
          if (typeof u == "number" && (f === null || f < u) || typeof g == "number" && (f === null || f > g))
            return !1;
        } else {
          const u = typeof i == "string" ? i : i.query;
          if (u && u.trim()) {
            const g = u.trim().toLowerCase();
            if (!(l.type === "dropdown" ? String(ge(l, f) ?? "").toLowerCase() : String(f ?? "").toLowerCase()).includes(g))
              return !1;
          }
        }
      }
    }
    return !0;
  }
  _refreshValidations(e) {
    const r = Array.isArray(e) && e.length > 0 ? e : Array.from({ length: this.rows.length }, (i, l) => l);
    r.forEach((i) => {
      this.columns.forEach((l) => {
        const f = ve(i, l.key);
        this.errors.delete(f);
      });
    });
    const s = /* @__PURE__ */ new Map();
    this.columns.forEach((i) => {
      if (!i.unique)
        return;
      const l = /* @__PURE__ */ new Map();
      this.rows.forEach((f, u) => {
        const g = f[i.key], y = g === null || typeof g > "u" ? "__EMPTY__" : JSON.stringify(g);
        l.has(y) || l.set(y, []), l.get(y).push(u);
      }), s.set(i.key, l);
    }), r.forEach((i) => {
      const l = this.rows[i];
      l && this.columns.forEach((f) => {
        const u = ve(i, f.key), g = [], y = l[f.key];
        if (f.type === "number" && y !== null && typeof y != "number" && g.push("Value must be a number"), f.unique) {
          const w = s.get(f.key), d = y === null || typeof y > "u" ? "__EMPTY__" : JSON.stringify(y);
          w && w.get(d) && w.get(d).length > 1 && g.push("Value must be unique in this column");
        }
        if (typeof f.validator == "function") {
          const w = f.validator({
            value: y,
            row: l,
            rowIndex: i,
            column: f,
            data: this.rows,
            getValue: (d) => l[d]
          });
          typeof w == "string" && w.trim() ? g.push(w) : Array.isArray(w) && w.filter(Boolean).forEach((d) => g.push(d));
        }
        g.length > 0 && this.errors.set(u, g);
      });
    });
  }
  _emitChange(e) {
    this._suspendNotifications || this.changeListeners.forEach((r) => r(e));
  }
  _computeRowKey(e, r) {
    const s = Array.isArray(this.options.keyFields) ? this.options.keyFields : [];
    return !e || s.length === 0 ? r : s.map((i) => e[i]).map((i) => i === null || typeof i > "u" ? "" : String(i)).join("||");
  }
}
const ft = { class: "excel-table__grid" }, pt = ["aria-sort"], ht = ["tabindex", "role", "onClick", "onKeydown"], yt = {
  key: 0,
  class: "excel-table__filter"
}, wt = ["placeholder", "value", "onInput"], gt = ["placeholder", "value", "onInput"], bt = ["placeholder", "value", "onInput"], vt = ["data-row-index", "data-row-position"], _t = ["onMousedown", "onMouseenter", "onPaste"], kt = { class: "excel-table__cell-content" }, xt = ["checked", "onChange", "onKeydown"], mt = ["value", "onChange"], Ct = {
  key: 0,
  value: ""
}, St = ["value"], Rt = ["value", "onInput", "onBlur", "onKeydown"], Et = ["onClick"], It = {
  key: 4,
  class: "excel-table__links"
}, Vt = ["href", "target"], At = ["value", "onInput", "onBlur", "onKeydown"], Dt = {
  key: 0,
  class: "excel-table__cell-errors"
}, Mt = {
  __name: "ExcelTable",
  props: {
    columns: {
      type: Array,
      required: !0
    },
    modelValue: {
      type: Array,
      default: () => []
    },
    options: {
      type: Object,
      default: () => ({})
    },
    filters: {
      type: Object,
      default: () => ({})
    }
  },
  emits: [
    "update:modelValue",
    "change",
    "update:filters",
    "cell-edit",
    "cell-click",
    "button-click"
  ],
  setup(c, { emit: e }) {
    const r = c, s = e, i = E(null), l = ye({ ...r.filters }), f = ye({}), u = E(new _e({
      columns: r.columns,
      data: r.modelValue,
      options: r.options
    })), g = E(u.value.getViewRows()), y = E(u.value.getErrorsGrouped()), w = E(u.value.getSortState()), d = E(null), b = E(null), x = E(null), m = E(!1), C = E(!1), R = E(null), $ = E(0), F = G(() => u.value.getColumns()), re = G(() => r.options?.frozenColumns ?? 0), H = G(() => r.options?.freezeHeader !== !1), oe = G(() => {
      const t = [];
      let o = 0;
      return F.value.forEach((n, p) => {
        if (p < re.value) {
          const a = n.width ?? n.minWidth ?? 150;
          t[p] = o, o += a;
        } else
          t[p] = null;
      }), t;
    });
    let z = u.value.registerChangeListener((t) => {
      y.value = t.errors, g.value = u.value.getViewRows(), w.value = u.value.getSortState(), s("change", t), t.type !== "filter" && t.type !== "sort" && s("update:modelValue", u.value.getRawData());
    });
    function se(t, o) {
      typeof z == "function" && z(), he(), u.value = new _e({
        columns: t ?? r.columns,
        data: r.modelValue ?? [],
        options: o ?? r.options ?? {}
      }), g.value = u.value.getViewRows(), y.value = u.value.getErrorsGrouped(), w.value = u.value.getSortState(), z = u.value.registerChangeListener((n) => {
        y.value = n.errors, g.value = u.value.getViewRows(), w.value = u.value.getSortState(), s("change", n), n.type !== "filter" && n.type !== "sort" && s("update:modelValue", u.value.getRawData());
      }), Y();
    }
    function me(t, o) {
      try {
        return JSON.stringify(t) === JSON.stringify(o);
      } catch {
        return !1;
      }
    }
    W(
      () => r.modelValue,
      (t) => {
        me(t, u.value.getRawData()) || (u.value.setData(t ?? [], { silent: !0 }), g.value = u.value.getViewRows(), y.value = u.value.getErrorsGrouped(), w.value = u.value.getSortState(), he());
      },
      { deep: !0 }
    ), W(
      () => r.columns,
      (t) => {
        se(t, r.options);
      },
      { deep: !0 }
    ), W(
      () => r.options,
      (t) => {
        se(r.columns, t);
      },
      { deep: !0 }
    ), W(
      () => r.filters,
      () => {
        Object.keys(l).forEach((t) => {
          delete l[t];
        }), Object.assign(l, r.filters ?? {}), Y();
      },
      { deep: !0 }
    ), Qe(() => {
      Y(), window.addEventListener("mouseup", de);
    }), Ze(() => {
      typeof z == "function" && z(), window.removeEventListener("mouseup", de);
    });
    function Y() {
      if (!r.filters) {
        u.value.clearFilters();
        return;
      }
      Object.entries(r.filters).forEach(([t, o]) => {
        o && typeof o == "object" && ("min" in o || "max" in o) ? u.value.setFilter(t, {
          min: o.min !== "" ? Number(o.min) : void 0,
          max: o.max !== "" ? Number(o.max) : void 0
        }) : u.value.setFilter(t, o);
      }), g.value = u.value.getViewRows(), w.value = u.value.getSortState();
    }
    function X(t) {
      return H.value && t < re.value;
    }
    function Ce(t) {
      const o = F.value[t], n = {};
      if (o.width ? (n.width = `${o.width}px`, n.minWidth = `${o.width}px`) : o.minWidth && (n.minWidth = `${o.minWidth}px`), H.value && X(t)) {
        const p = oe.value[t] ?? 0;
        n.left = `${p}px`, n.position = "sticky", n.zIndex = 3;
      }
      return H.value && (n.top = "0", n.position = "sticky", n.zIndex = (n.zIndex ?? 1) + 1), n;
    }
    function Se(t) {
      const o = {}, n = F.value[t];
      if (n.width ? (o.width = `${n.width}px`, o.minWidth = `${n.width}px`) : n.minWidth && (o.minWidth = `${n.minWidth}px`), X(t)) {
        const p = oe.value[t] ?? 0;
        o.left = `${p}px`, o.position = "sticky", o.zIndex = 2, o.background = "var(--excel-table-cell-bg, #fff)";
      }
      return o;
    }
    function ie(t) {
      if (!t || t.sortable === !1)
        return;
      const o = u.value.cycleSort(t.key);
      w.value = o ? { ...o } : null;
    }
    function le(t, o) {
      (t?.key === "Enter" || t?.key === " ") && (t.preventDefault(), ie(o));
    }
    function T(t) {
      return !w.value || w.value.columnKey !== t ? null : w.value.direction;
    }
    function Re(t) {
      const o = T(t);
      return o === "asc" ? "ascending" : o === "desc" ? "descending" : "none";
    }
    function Ee(t, o) {
      l[t] = o, u.value.setFilter(t, o), s("update:filters", { ...l }), g.value = u.value.getViewRows();
    }
    function ae(t, o, n) {
      l[t] || (l[t] = { min: "", max: "" }), l[t][o] = n, u.value.setFilter(t, {
        min: l[t].min !== "" ? Number(l[t].min) : void 0,
        max: l[t].max !== "" ? Number(l[t].max) : void 0
      }), s("update:filters", { ...l }), g.value = u.value.getViewRows();
    }
    function ue(t, o) {
      const n = l[t];
      return n && typeof n == "object" ? n[o] ?? "" : "";
    }
    function ce(t, o, n) {
      const p = K(t.index, o.key);
      f[p] = n;
    }
    function Ie(t, o, n) {
      u.value.setCell(t.index, o.key, n, { source: S.EDIT }), s("cell-edit", {
        rowIndex: t.index,
        column: o,
        value: n
      });
    }
    function Ve(t, o, n) {
      u.value.setCell(t.index, o.key, n, { source: S.EDIT }), s("cell-edit", {
        rowIndex: t.index,
        column: o,
        value: n
      });
    }
    function Ae(t, o) {
      const n = {
        rowIndex: t.index,
        row: t.data,
        column: o,
        model: u.value
      };
      o.button?.onClick && o.button.onClick(n), s("button-click", n);
    }
    function De(t, o) {
      return typeof o.button?.label == "function" ? o.button.label(t.data, t.index, o) : typeof t.data[o.key] == "string" ? t.data[o.key] : o.button?.label ?? "Action";
    }
    function Fe(t) {
      return t.dropdown?.options ?? [];
    }
    function Me(t, o) {
      const n = t.dropdown?.valueField ?? "value";
      return o[n] ?? o;
    }
    function Ne(t, o) {
      const n = t.dropdown?.displayField ?? "label";
      return o[n] ?? o;
    }
    function Le(t, o) {
      return (t.dropdown?.keyFields ?? [t.dropdown?.valueField ?? "value"]).map((p) => o[p]).join("||");
    }
    function Q(t, o) {
      const n = `${t}:${o}`;
      return y.value?.[n] ?? [];
    }
    function ze(t, o, n) {
      const p = Pe(t.index, n), a = Q(t.index, o.key).length > 0;
      return {
        "is-selected": p,
        "has-error": a,
        "is-placeholder-cell": t.isPlaceholder
      };
    }
    function Te(t, o, n, p, a) {
      if (t.button !== 0)
        return;
      C.value = !0;
      const v = { rowIndex: o.index, columnIndex: a };
      b.value = v, d.value = j(v, v), s("cell-click", {
        rowIndex: o.index,
        column: n,
        event: t
      });
    }
    function Oe(t, o, n, p, a) {
      m.value ? je(o.index, a) : C.value && t.buttons === 1 && b.value && (d.value = j(b.value, { rowIndex: o.index, columnIndex: a }));
    }
    function de() {
      m.value && d.value && x.value && Ke(), m.value = !1, C.value = !1, x.value = null;
    }
    function Pe(t, o) {
      return d.value ? t >= d.value.startRow && t <= d.value.endRow && o >= d.value.startCol && o <= d.value.endCol : !1;
    }
    function j(t, o) {
      return {
        startRow: Math.min(t.rowIndex, o.rowIndex),
        endRow: Math.max(t.rowIndex, o.rowIndex),
        startCol: Math.min(t.columnIndex, o.columnIndex),
        endCol: Math.max(t.columnIndex, o.columnIndex)
      };
    }
    function Be(t, o) {
      return d.value ? d.value.endRow === t && d.value.endCol === o : !1;
    }
    function $e() {
      d.value && (m.value = !0, x.value = { ...d.value });
    }
    function je(t, o) {
      if (!d.value)
        return;
      const n = { ...d.value };
      t > d.value.endRow && (n.endRow = t), o > d.value.endCol && (n.endCol = o), x.value = n;
    }
    function Ke() {
      const t = d.value, o = x.value;
      !t || !o || (u.value.fill(t, o, { source: S.FILL }), d.value = j(
        { rowIndex: t.startRow, columnIndex: t.startCol },
        { rowIndex: o.endRow, columnIndex: o.endCol }
      ), x.value = null);
    }
    function fe(t) {
      if ($.value, !t)
        return {};
      const o = Z(t.startRow, t.startCol), n = Z(t.endRow, t.endCol);
      if (!o || !n)
        return {};
      const p = o.getBoundingClientRect(), a = n.getBoundingClientRect(), v = R.value;
      if (!v)
        return {};
      const h = v.getBoundingClientRect();
      return h ? {
        top: `${p.top - h.top + v.scrollTop}px`,
        left: `${p.left - h.left + v.scrollLeft}px`,
        width: `${a.right - p.left}px`,
        height: `${a.bottom - p.top}px`
      } : {};
    }
    function Z(t, o) {
      const n = R.value?.querySelector(`tbody tr[data-row-index="${t}"]`);
      return n ? n.querySelectorAll("td")[o] ?? null : null;
    }
    function ee(t, o, n, p, a) {
      if (!t || typeof a != "number")
        return;
      const { key: v, shiftKey: h } = t, V = v === "Tab" && !h, O = v === "Tab" && h;
      if (v === "Escape") {
        t.preventDefault(), Xe(o, n);
        return;
      }
      let U = 0, ne = 0;
      if (v === "Enter")
        U = h ? -1 : 1;
      else if (v === "ArrowDown")
        U = 1;
      else if (v === "ArrowUp")
        U = -1;
      else if (v === "ArrowRight" || V)
        ne = 1;
      else if (v === "ArrowLeft" || O)
        ne = -1;
      else
        return;
      t.preventDefault(), t.stopPropagation(), te(o, n), Ue({
        fromViewRowIndex: a,
        fromColumnIndex: p,
        rowDelta: U,
        columnDelta: ne
      });
    }
    function Ue({
      fromViewRowIndex: t,
      fromColumnIndex: o,
      rowDelta: n = 0,
      columnDelta: p = 0
    }) {
      const a = t + n, v = o + p;
      if (a < 0 || a >= g.value.length || v < 0 || v >= F.value.length)
        return;
      const h = g.value[a];
      h && Ge(h.index, v);
    }
    function Ge(t, o) {
      const n = { rowIndex: t, columnIndex: o };
      b.value = n, d.value = j(n, n), et(() => {
        const p = Z(t, o);
        if (!p)
          return;
        We(p);
        const a = qe(p);
        if (a) {
          a.focus(), typeof a.select == "function" && a.tagName === "INPUT" && a.type !== "checkbox" && a.select();
          return;
        }
        p.hasAttribute("tabindex") || p.setAttribute("tabindex", "-1"), p.focus();
      });
    }
    function We(t) {
      if (t)
        try {
          t.scrollIntoView({ block: "nearest", inline: "nearest" });
        } catch {
        }
    }
    function qe(t) {
      return t ? t.querySelector('input, select, textarea, button, [contenteditable="true"]') : null;
    }
    function Je(t, o, n) {
      const p = t.clipboardData.getData("text/plain");
      if (!p)
        return;
      t.preventDefault();
      const a = u.value.paste(o.index, n.key, p, { source: S.PASTE });
      if (a && a.changes.length) {
        const v = a.changes.map((O) => O.rowIndex), h = a.changes.map((O) => u.value.getColumnIndex(O.columnKey)), V = {
          startRow: Math.min(...v),
          endRow: Math.max(...v),
          startCol: Math.min(...h),
          endCol: Math.max(...h)
        };
        d.value = V, b.value = { rowIndex: V.startRow, columnIndex: V.startCol };
      }
    }
    function He(t) {
      (t.metaKey || t.ctrlKey) && (t.key.toLowerCase() === "z" && (t.preventDefault(), u.value.undo()), (t.key.toLowerCase() === "y" || t.shiftKey && t.key.toLowerCase() === "z") && (t.preventDefault(), u.value.redo()));
    }
    function Ye() {
      $.value += 1;
    }
    function K(t, o) {
      return `${t}:${o}`;
    }
    function pe(t, o) {
      const n = K(t.index, o.key);
      return Object.prototype.hasOwnProperty.call(f, n) ? f[n] : t.data[o.key] ?? "";
    }
    function te(t, o) {
      const n = K(t.index, o.key);
      if (!Object.prototype.hasOwnProperty.call(f, n))
        return;
      const p = f[n];
      delete f[n], u.value.setCell(t.index, o.key, p, { source: S.EDIT }), s("cell-edit", {
        rowIndex: t.index,
        column: o,
        value: p
      });
    }
    function Xe(t, o) {
      const n = K(t.index, o.key);
      Object.prototype.hasOwnProperty.call(f, n) && delete f[n];
    }
    function he() {
      Object.keys(f).forEach((t) => {
        delete f[t];
      });
    }
    return (t, o) => (k(), _("div", {
      ref_key: "containerRef",
      ref: i,
      class: "excel-table",
      tabindex: "0",
      onKeydown: He
    }, [
      I("div", {
        ref_key: "viewportRef",
        ref: R,
        class: "excel-table__viewport",
        onScroll: Ye
      }, [
        I("table", ft, [
          I("thead", null, [
            I("tr", null, [
              (k(!0), _(D, null, M(F.value, (n, p) => (k(), _("th", {
                key: n.key,
                class: P(["excel-table__header-cell", { "is-frozen": X(p) }]),
                style: q(Ce(p)),
                "aria-sort": Re(n.key)
              }, [
                I("div", {
                  class: P(["excel-table__header-content", {
                    "is-sortable": n.sortable !== !1,
                    "is-sorted": !!T(n.key)
                  }]),
                  tabindex: n.sortable === !1 ? void 0 : 0,
                  role: n.sortable === !1 ? void 0 : "button",
                  onClick: () => ie(n),
                  onKeydown: [
                    we(B((a) => le(a, n), ["prevent"]), ["enter"]),
                    we(B((a) => le(a, n), ["prevent"]), ["space"])
                  ]
                }, [
                  I("span", null, N(n.label ?? n.title ?? n.key), 1),
                  T(n.key) ? (k(), _("span", {
                    key: 0,
                    class: P(["excel-table__sort-indicator", {
                      "is-asc": T(n.key) === "asc",
                      "is-desc": T(n.key) === "desc"
                    }]),
                    "aria-hidden": "true"
                  }, null, 2)) : A("", !0)
                ], 42, ht),
                n.filterable ? (k(), _("div", yt, [
                  n.type === "number" ? (k(), _(D, { key: 0 }, [
                    I("input", {
                      class: "excel-table__filter-input",
                      type: "number",
                      placeholder: n.filterPlaceholderMin ?? "Min",
                      value: ue(n.key, "min"),
                      onInput: (a) => ae(n.key, "min", a.target.value)
                    }, null, 40, wt),
                    I("input", {
                      class: "excel-table__filter-input",
                      type: "number",
                      placeholder: n.filterPlaceholderMax ?? "Max",
                      value: ue(n.key, "max"),
                      onInput: (a) => ae(n.key, "max", a.target.value)
                    }, null, 40, gt)
                  ], 64)) : (k(), _("input", {
                    key: 1,
                    class: "excel-table__filter-input",
                    type: "text",
                    placeholder: n.filterPlaceholder ?? "Filter",
                    value: l[n.key] ?? "",
                    onInput: (a) => Ee(n.key, a.target.value)
                  }, null, 40, bt))
                ])) : A("", !0)
              ], 14, pt))), 128))
            ])
          ]),
          I("tbody", null, [
            (k(!0), _(D, null, M(g.value, (n, p) => (k(), _("tr", {
              key: n.key ?? n.index,
              "data-row-index": n.index,
              "data-row-position": p,
              class: P({
                "is-placeholder": n.isPlaceholder
              })
            }, [
              (k(!0), _(D, null, M(F.value, (a, v) => (k(), _("td", {
                key: a.key,
                class: P(["excel-table__cell", ze(n, a, v)]),
                style: q(Se(v)),
                onMousedown: (h) => Te(h, n, a, p, v),
                onMouseenter: (h) => Oe(h, n, a, p, v),
                onPaste: B((h) => Je(h, n, a), ["prevent"])
              }, [
                I("div", kt, [
                  a.type === "checkbox" ? (k(), _("input", {
                    key: 0,
                    type: "checkbox",
                    checked: !!n.data[a.key],
                    onChange: (h) => Ie(n, a, h.target.checked),
                    onKeydown: (h) => ee(h, n.index, v, p)
                  }, null, 40, xt)) : a.type === "dropdown" ? (k(), _("select", {
                    key: 1,
                    class: "excel-table__input",
                    value: n.data[a.key] ?? "",
                    onChange: (h) => Ve(n, a, h.target.value)
                  }, [
                    a.dropdown?.allowEmpty ? (k(), _("option", Ct, N(a.dropdown.emptyLabel ?? "Select…"), 1)) : A("", !0),
                    (k(!0), _(D, null, M(Fe(a), (h) => (k(), _("option", {
                      key: Le(a, h),
                      value: Me(a, h)
                    }, N(Ne(a, h)), 9, St))), 128))
                  ], 40, mt)) : a.type === "number" ? (k(), _("input", {
                    key: 2,
                    class: "excel-table__input",
                    type: "number",
                    value: pe(n, a),
                    onInput: (h) => ce(n, a, h.target.value),
                    onBlur: () => te(n, a),
                    onKeydown: (h) => ee(h, n, a, v, p)
                  }, null, 40, Rt)) : a.type === "button" ? (k(), _("button", {
                    key: 3,
                    type: "button",
                    class: "excel-table__button",
                    onClick: B(() => Ae(n, a), ["stop"])
                  }, N(De(n, a)), 9, Et)) : a.type === "links" ? (k(), _("div", It, [
                    (k(!0), _(D, null, M(n.data[a.key] ?? [], (h) => (k(), _("a", {
                      key: h.href + h.label,
                      class: "excel-table__link",
                      href: h.href,
                      target: h.target ?? "_blank",
                      rel: "noopener"
                    }, N(h.label ?? h.href), 9, Vt))), 128))
                  ])) : (k(), _("input", {
                    key: 5,
                    class: "excel-table__input",
                    type: "text",
                    value: pe(n, a),
                    onInput: (h) => ce(n, a, h.target.value),
                    onBlur: () => te(n, a),
                    onKeydown: (h) => ee(h, n, a, v, p)
                  }, null, 40, At)),
                  d.value && Be(n.index, v) ? (k(), _("span", {
                    key: 6,
                    class: "excel-table__fill-handle",
                    onMousedown: B($e, ["stop"])
                  }, null, 32)) : A("", !0)
                ]),
                Q(n.index, a.key).length ? (k(), _("div", Dt, [
                  (k(!0), _(D, null, M(Q(n.index, a.key), (h, V) => (k(), _("span", {
                    key: `${a.key}-error-${V}`
                  }, N(h), 1))), 128))
                ])) : A("", !0)
              ], 46, _t))), 128))
            ], 10, vt))), 128))
          ])
        ]),
        x.value ? (k(), _("div", {
          key: 0,
          class: "excel-table__fill-preview",
          style: q(fe(x.value))
        }, null, 4)) : A("", !0),
        d.value ? (k(), _("div", {
          key: 1,
          class: "excel-table__selection",
          style: q(fe(d.value))
        }, null, 4)) : A("", !0)
      ], 544)
    ], 544));
  }
};
export {
  S as CHANGE_SOURCES,
  Mt as ExcelTable,
  _e as TableModel,
  Mt as default
};
