/* Progressive enhancement. Every diagram is written in index.html as a plain list (the no-JS
   fallback). Each widget below reads that list, builds the interactive version, then hides it. */
(function () {
  "use strict";
  var reduce = false;
  try { reduce = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}

  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function pad2(n) { return String(n).padStart(2, "0"); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function title(li) { var b = li.querySelector("b"); return b ? b.textContent.trim() : ""; }
  function caption(li) {
    var c = li.cloneNode(true);
    $$("b, ul", c).forEach(function (n) { n.remove(); });
    return c.textContent.replace(/\s+/g, " ").trim();
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (ch) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]; }); }
  var ARR_R = '<svg width="11" height="11" viewBox="0 0 10 10" aria-hidden="true"><path d="M0 0 L10 5 L0 10 Z" fill="currentColor"/></svg>';
  var ARR_L = '<svg width="11" height="11" viewBox="0 0 10 10" aria-hidden="true"><path d="M10 0 L0 5 L10 10 Z" fill="currentColor"/></svg>';
  var ARR_H = '<svg width="22" height="12" viewBox="0 0 22 12" aria-hidden="true"><path d="M0 6 H19" stroke="currentColor" stroke-width="2"/><path d="M14 1 L21 6 L14 11" fill="none" stroke="currentColor" stroke-width="2"/></svg>';
  var ARR_V = '<svg width="12" height="26" viewBox="0 0 12 26" aria-hidden="true"><path d="M6 0 V23" stroke="currentColor" stroke-width="2"/><path d="M1 18 L6 25 L11 18" fill="none" stroke="currentColor" stroke-width="2"/></svg>';

  /* row stagger for output tables */
  function replayRows(table) {
    if (reduce || !table) return;
    $$("tr", table).forEach(function (tr, i) { tr.style.setProperty("--r", i); });
    table.classList.remove("anim-rows"); void table.offsetWidth; table.classList.add("anim-rows");
  }

  /* ---------- Single sign-on: step-through sequence diagram ---------- */
  $$('[data-widget="sso"]').forEach(function (root) {
    var list = root.querySelector("ol.fb");
    var lanes = list.getAttribute("data-lanes").split(";").map(function (s) { return s.split("|"); });
    var all = $$(":scope > li", list).map(function (li) {
      return { from: +li.dataset.from, to: +li.dataset.to, label: li.dataset.label, cap: caption(li),
        attack: li.hasAttribute("data-attack"), revoke: li.hasAttribute("data-revoke") };
    });
    var normal = all.filter(function (s) { return !s.attack; });
    var st = { step: 0, attack: false, revoked: false };

    var scroll = el("div", "scroll"), seq = el("div", "seq");
    scroll.tabIndex = 0; scroll.setAttribute("role", "region"); scroll.setAttribute("aria-label", "Sequence diagram. The step text is below it.");
    seq.setAttribute("aria-hidden", "true");
    scroll.appendChild(seq);
    var pills = el("div", "pills"); pills.setAttribute("role", "group"); pills.setAttribute("aria-label", "Jump to step");
    var cap = el("p", "cap"); cap.setAttribute("aria-live", "polite");
    var ctrl = el("div", "ctrl");
    var prev = el("button", "btn", "Back"), next = el("button", "btn", "Next"), atk = el("button", "btn", "Attacker reuses a stolen refresh token");
    [prev, next, atk].forEach(function (b) { b.type = "button"; });
    atk.setAttribute("aria-pressed", "false");
    ctrl.appendChild(prev); ctrl.appendChild(next); ctrl.appendChild(el("span", "sp")); ctrl.appendChild(atk);
    list.after(scroll, pills, cap, ctrl);
    list.hidden = true;

    var table = document.getElementById("sessions");
    var hint = document.querySelector("[data-hint]"); if (hint) hint.hidden = false;
    var famRow = table && table.querySelector('tr[data-family="fam_7"]');

    function render() {
      var ln = st.attack ? lanes : lanes.slice(0, 3);
      var steps = st.attack ? all : normal;
      var step = Math.min(st.step, steps.length - 1);
      var cols = "repeat(" + ln.length + ", minmax(0, 1fr))";
      seq.innerHTML = "";
      var bg = el("div", "lanes"); bg.style.gridTemplateColumns = cols;
      ln.forEach(function () { bg.appendChild(el("div", "laneline")); });
      seq.appendChild(bg);
      var head = el("div", "mrow"); head.style.gridTemplateColumns = cols;
      ln.forEach(function (l, i) { head.appendChild(el("div", "lanehead" + (i === 3 ? " atk" : ""), esc(l[0]) + '<span class="sub">' + esc(l[1]) + "</span>")); });
      seq.appendChild(head);
      pills.innerHTML = "";
      steps.forEach(function (m, i) {
        var lo = Math.min(m.from, m.to), hi = Math.max(m.from, m.to), span = hi - lo + 1, self = m.from === m.to;
        var row = el("div", "mrow"); row.style.gridTemplateColumns = cols;
        var msg = el("div", "msg" + (m.attack ? " bad" : "") + (i === step ? " cur" : "") + (i > step ? " todo" : ""));
        msg.style.gridColumn = (lo + 1) + " / " + (hi + 2);
        msg.style.paddingInline = self ? "8%" : (50 / span).toFixed(2) + "%";
                var lab = '<div class="mlab"><span class="mnum">' + pad2(i + 1) + "</span>" + esc(m.label) + "</div>";
        msg.innerHTML = self ? '<div class="selfbox">' + lab + "</div>"
          : lab + '<div class="arrow">' + (m.to < m.from ? ARR_L : "") + '<div class="shaft"></div>' + (m.to > m.from ? ARR_R : "") + "</div>";
        row.appendChild(msg); seq.appendChild(row);
        var p = el("button", "pill" + (m.attack ? " bad" : "") + (i === step ? " on" : (i < step ? " done" : "")), pad2(i + 1));
        p.type = "button";
        p.setAttribute("aria-label", "Step " + pad2(i + 1) + ": " + m.label);
        p.setAttribute("aria-pressed", i === step ? "true" : "false");
        p.addEventListener("click", function () { st.step = i; render(); });
        pills.appendChild(p);
      });
      cap.textContent = "Step " + pad2(step + 1) + ". " + steps[step].cap;
      prev.disabled = step === 0;
      next.disabled = step === steps.length - 1;
      atk.setAttribute("aria-pressed", st.attack ? "true" : "false");

      var revokeAt = -1;
      steps.forEach(function (m, i) { if (m.revoke) revokeAt = i; });
      var revoked = st.attack && revokeAt >= 0 && step >= revokeAt;
      if (famRow) {
        famRow.className = revoked ? "hit" : "live";
        famRow.querySelector('[data-col="at"]').textContent = revoked ? "2026-11-03T21:20:41.007Z" : "null";
        famRow.querySelector('[data-col="reason"]').textContent = revoked ? "reuse" : "null";
        if (revoked && !st.revoked) {
          if (!reduce) { famRow.classList.add("flash"); }
          replayRows(table);
        }
      }
      st.revoked = revoked;
    }
    prev.addEventListener("click", function () { st.step = Math.max(0, st.step - 1); render(); });
    next.addEventListener("click", function () { st.step += 1; render(); });
    atk.addEventListener("click", function () {
      if (st.attack) { st.attack = false; st.step = Math.min(st.step, normal.length - 1); }
      else { st.attack = true; st.step = normal.length; }
      render();
    });
    render();
  });

  /* ---------- Audit log: request flow, and the admin / user view of the log ---------- */
  $$('[data-widget="audit"]').forEach(function (root) {
    var list = root.querySelector("ol.fb");
    var nodes = $$(":scope > li", list).map(function (li) { return { t: title(li), sub: li.dataset.sub, rec: caption(li) }; });
    var flow = el("div", "vflow"), col = el("div"), detail = el("div", "vdetail");
    detail.setAttribute("aria-live", "polite");
    detail.appendChild(el("span", "lbl", "Recorded here"));
    var rec = el("p"); detail.appendChild(rec);
    var btns = [], cur = 1;
    nodes.forEach(function (n, i) {
      var b = el("button", "node", '<span class="nn">' + pad2(i + 1) + "</span><b>" + esc(n.t) + '</b><span class="sub">' + esc(n.sub) + "</span>");
      b.type = "button";
      var pick = function () { if (cur !== i) { cur = i; render(); } };
      b.addEventListener("click", pick); b.addEventListener("mouseenter", pick); b.addEventListener("focus", pick);
      col.appendChild(b); btns.push(b);
      if (i < nodes.length - 1) col.appendChild(el("div", "vconn", ARR_V));
    });
    flow.appendChild(col); flow.appendChild(detail);
    list.after(flow);
    list.hidden = true;
    var note = root.querySelector(".fb-note"); if (note) note.hidden = true;
    function render() {
      btns.forEach(function (b, i) { b.setAttribute("aria-pressed", i === cur ? "true" : "false"); });
      rec.textContent = nodes[cur].rec;
    }
    render();
  });

  (function () {
    var bar = document.querySelector("[data-viewas]");
    var table = document.getElementById("log");
    if (!bar || !table) return;
    bar.hidden = false;
    var note = document.querySelector("[data-viewnote]");
    var btns = $$("[data-view]", bar);
    function render(view) {
      btns.forEach(function (b) { b.setAttribute("aria-pressed", b.dataset.view === view ? "true" : "false"); });
      $$("tbody tr", table).forEach(function (tr) { tr.hidden = view !== "admin" && tr.dataset.user !== view; });
      note.textContent = view === "admin" ? "Admin view: every user's events." : "User 3 sees only user 3's rows.";
      replayRows(table);
    }
    btns.forEach(function (b) { b.addEventListener("click", function () { render(b.dataset.view); }); });
  })();

  /* ---------- Deployments: pipeline with control tags ---------- */
  $$('[data-widget="pipe"]').forEach(function (root) {
    var list = root.querySelector("ol.fb");
    var stages = $$(":scope > li", list).map(function (li) {
      return { t: title(li), sub: li.dataset.sub, d: caption(li),
        badges: $$(".badge", li).map(function (b) { return { t: b.textContent.trim(), gap: b.classList.contains("gap") }; }) };
    });
    var flow = el("div", "hflow"), detail = el("p", "pdetail");
    detail.setAttribute("aria-live", "polite");
    var cur = 2, cols = [];
    stages.forEach(function (s, i) {
      var c = el("div", "pcol");
      var b = el("button", "node", '<span class="nn">' + pad2(i + 1) + "</span><b>" + esc(s.t) + '</b><span class="sub">' + esc(s.sub) + "</span>");
      b.type = "button";
      var pick = function () { if (cur !== i) { cur = i; render(); } };
      b.addEventListener("click", pick); b.addEventListener("mouseenter", pick); b.addEventListener("focus", pick);
      var ul = el("ul", "badges");
      s.badges.forEach(function (x) { ul.appendChild(el("li", "badge" + (x.gap ? " gap" : ""), esc(x.t))); });
      c.appendChild(b); c.appendChild(ul);
      flow.appendChild(c);
      if (i < stages.length - 1) { var cn = el("div", "conn", ARR_H); cn.setAttribute("aria-hidden", "true"); flow.appendChild(cn); }
      cols.push([b, ul]);
    });
    list.after(flow, detail);
    list.hidden = true;
    function render() {
      cols.forEach(function (c, i) {
        c[0].setAttribute("aria-pressed", i === cur ? "true" : "false");
        $$(".badge", c[1]).forEach(function (x) { x.classList.toggle("on", i === cur); });
      });
      detail.textContent = stages[cur].d;
    }
    render();
  });

  /* ---------- Small step flows (vibe map, KPI reports) ---------- */
  $$('[data-widget="steps"]').forEach(function (root) {
    var list = root.querySelector("ol.fb");
    var steps = $$(":scope > li", list).map(function (li) { return { t: title(li), d: caption(li) }; });
    var flow = el("div", "kflow"); flow.setAttribute("role", "group");
    var heading = root.closest("article") && root.closest("article").querySelector("h3");
    if (heading) flow.setAttribute("aria-label", "Steps: " + heading.textContent);
    var cap = el("p", "cap"); cap.setAttribute("aria-live", "polite");
    var cur = 0, btns = [];
    steps.forEach(function (s, i) {
      var b = el("button", "kstep", '<span class="nn">' + pad2(i + 1) + "</span>" + esc(s.t));
      b.type = "button";
      var pick = function () { if (cur !== i) { cur = i; render(); } };
      b.addEventListener("click", pick); b.addEventListener("mouseenter", pick); b.addEventListener("focus", pick);
      flow.appendChild(b); btns.push(b);
    });
    list.after(flow, cap);
    list.hidden = true;
    function render() {
      btns.forEach(function (b, i) { b.setAttribute("aria-pressed", i === cur ? "true" : "false"); });
      cap.textContent = steps[cur].d;
    }
    render();
  });

  /* ---------- Controls matrix: pick a control ---------- */
  $$('[data-widget="controls"]').forEach(function (root) {
    var list = root.querySelector("ol.ctl");
    var items = $$(":scope > li", list);
    var chips = el("div", "chips"); chips.setAttribute("role", "group"); chips.setAttribute("aria-label", "Choose a control");
    var cur = 0, btns = [];
    var fromHash = (location.hash || "").slice(1).toLowerCase();
    items.forEach(function (li, i) {
      if (li.id === fromHash) cur = i;
      var b = el("button", "chip", esc(li.dataset.id));
      b.type = "button";
      b.setAttribute("aria-controls", li.id);
      b.addEventListener("click", function () { cur = i; render(); });
      chips.appendChild(b); btns.push(b);
    });
    if (!fromHash) items.forEach(function (li, i) { if (li.dataset.id === "SM-1") cur = i; });
    list.before(chips);
    list.classList.remove("static");
    function render() {
      items.forEach(function (li, i) { li.hidden = i !== cur; });
      btns.forEach(function (b, i) { b.setAttribute("aria-pressed", i === cur ? "true" : "false"); });
    }
    render();
  });

  /* ---------- Copy email ---------- */
  (function () {
    var btn = document.querySelector("[data-copy]"), mail = document.querySelector("[data-mail]");
    if (!btn || !mail || !navigator.clipboard) return;
    btn.hidden = false;
    btn.addEventListener("click", function () {
      navigator.clipboard.writeText(mail.textContent.trim()).then(function () {
        btn.textContent = "Copied";
        setTimeout(function () { btn.textContent = "Copy email"; }, 1600);
      }, function () { btn.textContent = "Copy failed"; });
    });
  })();

  /* ---------- Tabs: mark the section in view ---------- */
  (function () {
    if (!("IntersectionObserver" in window)) return;
    var tabs = $$(".tabs .tab");
    var map = { jkos: "jkos", sso: "jkos", audit: "jkos", deploy: "jkos", projects: "projects", experience: "experience", contact: "contact" };
    function mark(name) {
      tabs.forEach(function (t) {
        if (t.getAttribute("href") === "#" + name) t.setAttribute("aria-current", "true"); else t.removeAttribute("aria-current");
      });
    }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) mark(map[e.target.id]); });
    }, { rootMargin: "-45% 0px -50% 0px" });
    Object.keys(map).forEach(function (id) { var s = document.getElementById(id); if (s) io.observe(s); });
    var hero = document.querySelector(".hero");
    if (hero) new IntersectionObserver(function (es) { if (es[0].isIntersecting) mark(""); }, { rootMargin: "-45% 0px -50% 0px" }).observe(hero);
  })();

  /* ---------- Scroll reveal: visible at rest; a short rise when they come into view ---------- */
  (function () {
    if (reduce || !("IntersectionObserver" in window)) return;
    var targets = $$(".exh-head,.arch,.out,.txt li,.card,.row,.skills > div,.idx li,.jk-word,.lead,.sh");
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        var t = e.target; io.unobserve(t);
        t.classList.add("rv"); void t.offsetWidth; t.classList.add("in");
        $$(".dt", t).forEach(replayRows);
      });
    }, { threshold: 0.12 });
    targets.forEach(function (t, i) {
      var r = t.getBoundingClientRect();
      if (r.top < innerHeight && r.bottom > 0) return; /* already on screen at load: leave it still */
      t.style.animationDelay = (i % 4) * 60 + "ms";
      io.observe(t);
    });
  })();
})();
