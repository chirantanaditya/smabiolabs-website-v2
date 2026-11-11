/* dc-lite.js — minimal standalone renderer for exported Design Component pages.
   Supports what the SmaBio redesign pages use: {{path}} holes in text and attributes,
   <sc-for list as>, <sc-if value>, onClick-style handlers, and setState re-render. */
(function () {
  'use strict';

  function DCLogic(props) {
    this.props = props || {};
    this.state = undefined;
  }
  DCLogic.prototype.setState = function (patch) {
    var next = typeof patch === 'function' ? patch(this.state, this.props) : patch;
    this.state = Object.assign({}, this.state || {}, next || {});
    if (this.__render) this.__render();
  };
  DCLogic.prototype.forceUpdate = function () { if (this.__render) this.__render(); };

  var HOLE = /\{\{\s*([^}]*?)\s*\}\}/g;
  var WHOLE = /^\s*\{\{\s*([^}]*?)\s*\}\}\s*$/;

  function lookup(expr, scope) {
    if (expr === 'true') return true;
    if (expr === 'false') return false;
    if (expr === 'null') return null;
    if (/^-?\d+(\.\d+)?$/.test(expr)) return Number(expr);
    if (/^(['"]).*\1$/.test(expr)) return expr.slice(1, -1);
    var parts = expr.split('.');
    var v = scope;
    for (var i = 0; i < parts.length; i++) {
      if (v == null) return undefined;
      v = v[parts[i]];
    }
    return v;
  }
  function str(v) { return v == null ? '' : String(v); }

  function processChildren(parent, scope) {
    var kids = Array.prototype.slice.call(parent.childNodes);
    for (var i = 0; i < kids.length; i++) processNode(kids[i], scope);
  }

  function processNode(node, scope) {
    if (node.nodeType === 3) {
      if (node.nodeValue.indexOf('{{') !== -1) {
        node.nodeValue = node.nodeValue.replace(HOLE, function (_, e) { return str(lookup(e, scope)); });
      }
      return;
    }
    if (node.nodeType !== 1) return;
    var tag = node.tagName.toLowerCase();

    if (tag === 'sc-for') {
      var listExpr = (node.getAttribute('list') || '').match(WHOLE);
      var list = listExpr ? lookup(listExpr[1], scope) : [];
      var as = node.getAttribute('as') || 'item';
      var frag = document.createDocumentFragment();
      (list || []).forEach(function (item, k) {
        var s = Object.create(scope);
        s[as] = item;
        s.$index = k;
        var holder = document.createElement('div');
        Array.prototype.forEach.call(node.childNodes, function (c) { holder.appendChild(c.cloneNode(true)); });
        processChildren(holder, s);
        while (holder.firstChild) frag.appendChild(holder.firstChild);
      });
      node.parentNode.replaceChild(frag, node);
      return;
    }

    if (tag === 'sc-if') {
      var m = (node.getAttribute('value') || '').match(WHOLE);
      var ok = m ? !!lookup(m[1], scope) : false;
      if (!ok) { node.parentNode.removeChild(node); return; }
      processChildren(node, scope);
      var f2 = document.createDocumentFragment();
      while (node.firstChild) f2.appendChild(node.firstChild);
      node.parentNode.replaceChild(f2, node);
      return;
    }

    var attrs = Array.prototype.slice.call(node.attributes);
    for (var a = 0; a < attrs.length; a++) {
      var name = attrs[a].name, val = attrs[a].value;
      if (name.indexOf('hint-') === 0) { node.removeAttribute(name); continue; }
      if (val.indexOf('{{') === -1) continue;
      var whole = val.match(WHOLE);
      if (/^on[a-z]+$/.test(name)) {
        node.removeAttribute(name);
        var fn = whole ? lookup(whole[1], scope) : null;
        if (typeof fn === 'function') node.addEventListener(name.slice(2), fn);
        continue;
      }
      var out = whole ? lookup(whole[1], scope) : val.replace(HOLE, function (_, e) { return str(lookup(e, scope)); });
      if (out === false || out == null) node.removeAttribute(name);
      else node.setAttribute(name, out === true ? '' : str(out));
    }
    processChildren(node, scope);
  }

  function boot() {
    var tpl = document.getElementById('dc-template');
    var root = document.getElementById('dc-root');
    var code = document.getElementById('dc-logic');
    if (!tpl || !root || !code) return;
    var props = {};
    try {
      var decl = JSON.parse(code.getAttribute('data-props') || '{}');
      Object.keys(decl).forEach(function (k) {
        if (k.charAt(0) !== '$' && decl[k] && 'default' in decl[k]) props[k] = decl[k]['default'];
      });
    } catch (e) { /* ignore bad props */ }
    var Component = new Function('DCLogic', code.textContent + '\n;return Component;')(DCLogic);
    var inst = new Component(props);
    if (!inst.props) inst.props = props;
    inst.__render = function () {
      var vals = inst.renderVals ? inst.renderVals() : {};
      var frag = tpl.content.cloneNode(true);
      var holder = document.createElement('div');
      holder.appendChild(frag);
      processChildren(holder, vals || {});
      var y = window.scrollY;
      root.innerHTML = '';
      while (holder.firstChild) root.appendChild(holder.firstChild);
      window.scrollTo(0, y);
    };
    inst.__render();
    if (typeof inst.componentDidMount === 'function') inst.componentDidMount();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
