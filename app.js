/**
 * Chapter 9 — Gated Evergreen Secondary Pricing (Optimal Clearing Frontier)
 * Spec: ../../PricingModel.md
 */

const SCENARIOS = {
  partners: {
    label: "Partners Group 2026",
    gated: true,
    regime: "annuity",
    nav0: 100,
    tcost: 0.5,
    qt: 9.8,
    cq: 5,
    wp: 0.85,
    gp: 0.1,
    rc: 0.04,
    fm: 0.015,
    rf: 0.015,
    lm: 0.035,
    lmBand: 0.005,
    thetaMin: 0.01,
    thetaMax: 0.04,
    navFac: 0.1,
    mq: 0.2,
    alpha: 1.5,
    gamma: 0.5,
  },
  distressed: {
    label: "Distressed REIT",
    gated: true,
    regime: "annuity",
    nav0: 100,
    tcost: 0.5,
    qt: 25,
    cq: 5,
    wp: 0.9,
    gp: 0.02,
    rc: 0.05,
    fm: 0.0125,
    rf: 0.045,
    lm: 0.06,
    lmBand: 0.01,
    thetaMin: 0.1,
    thetaMax: 0.25,
    navFac: 0,
    mq: 0,
    alpha: 2,
    gamma: 0.5,
  },
};

const $ = (id) => document.getElementById(id);

function discountFactor(k, tq, regime) {
  const kt = k * tq;
  if (regime === "bullet") return Math.exp(kt);
  if (Math.abs(kt) < 1e-8) return 1;
  return (Math.exp(kt) - 1) / kt;
}

function price(nav0, k, tq, theta, regime) {
  return nav0 * discountFactor(k, tq, regime) * (1 - theta);
}

function asFraction(value, assumePercentAbove = 1) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.abs(n) > assumePercentAbove ? n / 100 : n;
}

function readInputs() {
  return {
    gated: $("isGated").checked,
    regime: document.querySelector('input[name="regime"]:checked').value,
    nav0: +$("nav0").value,
    tcost: +$("tcost").value,
    qt: +$("qt").value,
    cq: +$("cq").value,
    wp: +$("wp").value,
    gp: asFraction($("gp").value, 0.5),
    rc: asFraction($("rc").value, 0.5),
    fm: asFraction($("fm").value, 0.5),
    rf: asFraction($("rf").value, 0.5),
    lm: asFraction($("lm").value, 0.5),
    lmBand: asFraction($("lmBand").value, 0.5),
    thetaMin: asFraction($("thetaMin").value, 0.5),
    thetaMax: asFraction($("thetaMax").value, 0.5),
    navFac: asFraction($("navFac").value, 0.5),
    mq: asFraction($("mq").value, 0.5),
    alpha: Math.max(1, +$("alpha").value),
    gamma: +$("gamma").value,
  };
}

function compute(inputs) {
  const {
    gated,
    regime,
    nav0,
    tcost,
    qt,
    cq,
    wp,
    gp,
    rc,
    fm,
    rf,
    lm,
    lmBand,
    thetaMin,
    thetaMax,
    navFac,
    mq,
    alpha,
    gamma,
  } = inputs;

  if (!gated) {
    return { inactive: true };
  }

  const wc = 1 - wp;
  const qtFrac = qt > 1 ? qt / 100 : qt;
  const cqFrac = cq > 1 ? cq / 100 : cq;
  const tqMin = cqFrac > 0 ? qtFrac / cqFrac / 4 : 0;
  const tqMax = tqMin * alpha;
  const gadj = wp * gp + wc * rc - fm;

  const kTarget = gadj - rf - Math.max(0, lm - lmBand);
  const kBase = gadj - rf - (lm + lmBand);
  const kMid = gadj - rf - lm;

  const damping = Math.min(1, navFac + mq);
  const thetaTargetEff = Math.max(0, thetaMin * (1 - damping));
  const thetaBaseEff = thetaMax;

  const pTargetRaw = price(nav0, kTarget, tqMin, thetaTargetEff, regime);
  const pBaseRaw = price(nav0, kBase, tqMax, thetaBaseEff, regime);

  const maxPrice = Math.max(0, nav0 - tcost);
  const cap = (p) => Math.min(maxPrice, Math.max(0, p));

  const pTarget = cap(pTargetRaw);
  const pBase = cap(pBaseRaw);
  const pFinal = cap(pTarget - gamma * (pTarget - pBase));

  const thetaMid = (thetaMin + thetaMax) / 2;
  const pAnn = cap(price(nav0, kMid, tqMin, thetaMid, "annuity"));
  const pBul = cap(price(nav0, kMid, tqMin, thetaMid, "bullet"));

  const discount = nav0 - pFinal;
  const discountPct = nav0 > 0 ? (discount / nav0) * 100 : 0;

  return {
    inactive: false,
    regime,
    nav0,
    maxPrice,
    tqMin,
    tqMax,
    gadj,
    kMid,
    kTarget,
    kBase,
    pTarget,
    pBase,
    pFinal,
    discount,
    discountPct,
    pAnn,
    pBul,
    gamma,
    premium: pFinal > nav0,
  };
}

function pct(n, digits = 1) {
  return `${n.toFixed(digits)}%`;
}

function pctRate(n) {
  return `${(n * 100).toFixed(2)}%`;
}

function urgencyLabel(gamma) {
  if (gamma <= 0.15) return "Patient seller — near the best case";
  if (gamma >= 0.85) return "Forced sale — near the worst case";
  return "Moderate urgency — between best and worst case";
}

function renderInactive() {
  $("results").innerHTML = `
    <div class="inactive-card">
      <strong>You can redeem at NAV</strong>
      <span>No secondary discount applies while normal redemption works. Uncheck the gate only if you are exploring a hypothetical gated scenario.</span>
    </div>`;
  $("frontier").hidden = true;
  $("diag").textContent = "";
}

function barPosition(value, nav0) {
  const min = 40;
  const max = 102;
  const clamped = Math.min(max, Math.max(min, value));
  return ((clamped - min) / (max - min)) * 100;
}

function renderActive(r) {
  $("frontier").hidden = false;

  const posBase = barPosition(r.pBase, r.nav0);
  const posTarget = barPosition(r.pTarget, r.nav0);
  const posFinal = barPosition(r.pFinal, r.nav0);
  const left = Math.min(posBase, posTarget);
  const width = Math.abs(posTarget - posBase);

  const regimeLabel =
    r.regime === "annuity"
      ? "Partial quarterly payouts (annuity method)"
      : "Full suspension until clearance (bullet method)";

  const discountPillClass = r.premium ? "" : " is-discount";
  const discountPillText = r.premium
    ? "Slightly above NAV in theory — capped in practice"
    : `${pct(r.discountPct)} discount to NAV`;

  const resultsEl = $("results");
  resultsEl.classList.remove("results-updated");
  void resultsEl.offsetWidth;
  resultsEl.classList.add("results-updated");

  resultsEl.innerHTML = `
    <div class="price-hero">
      <span class="label">Your estimated sale price</span>
      <span class="value">${pct(r.pFinal)}</span>
      <span class="discount-pill${discountPillClass}">${discountPillText}</span>
    </div>
    <div class="metrics">
      <div class="metric metric--best">
        <span class="label">Best case</span>
        <span class="value">${pct(r.pTarget)}</span>
        <span class="sub">Patient seller · calm markets</span>
      </div>
      <div class="metric metric--worst">
        <span class="label">Worst case</span>
        <span class="value">${pct(r.pBase)}</span>
        <span class="sub">Forced sale · queue grows</span>
      </div>
      <div class="metric metric--cap">
        <span class="label">No-arbitrage cap</span>
        <span class="value">${pct(r.maxPrice)}</span>
        <span class="sub">NAV minus transaction costs</span>
      </div>
      <div class="metric">
        <span class="label">Est. wait time</span>
        <span class="value">${r.tqMin.toFixed(1)}–${r.tqMax.toFixed(1)}</span>
        <span class="sub">Years in queue (min → stressed)</span>
      </div>
    </div>`;

  $("barRange").style.left = `${left}%`;
  $("barRange").style.width = `${width}%`;
  $("markerBase").style.left = `${posBase}%`;
  $("markerFinal").style.left = `${posFinal}%`;
  $("markerTarget").style.left = `${posTarget}%`;

  $("diag").innerHTML = `
    <strong>${regimeLabel}</strong><br />
    Estimated wait: <strong>${r.tqMin.toFixed(2)}</strong> to <strong>${r.tqMax.toFixed(2)}</strong> years ·
    Portfolio growth (net of fees): <strong>${pctRate(r.gadj)}</strong>/yr ·
    ${urgencyLabel(r.gamma)}
  `;
}

function run() {
  const inputs = readInputs();
  $("gammaVal").textContent = inputs.gamma.toFixed(2);
  const gDesc = $("gammaDesc");
  if (gDesc) {
    gDesc.textContent =
      inputs.gamma <= 0.15
        ? "Low urgency — your estimate should sit close to the best case (green)."
        : inputs.gamma >= 0.85
          ? "High urgency — your estimate should sit close to the worst case (red)."
          : "Moderate urgency — your estimate sits between best and worst case.";
  }
  const result = compute(inputs);
  if (result.inactive) renderInactive();
  else renderActive(result);
}

function applyScenario(key) {
  const s = SCENARIOS[key];
  if (!s) return;

  $("isGated").checked = s.gated;
  document.querySelector(`input[name="regime"][value="${s.regime}"]`).checked = true;

  $("nav0").value = s.nav0;
  $("tcost").value = s.tcost;
  $("qt").value = s.qt;
  $("cq").value = s.cq;
  $("wp").value = s.wp;
  $("gp").value = s.gp;
  $("rc").value = s.rc;
  $("fm").value = s.fm;
  $("rf").value = s.rf;
  $("lm").value = s.lm;
  $("lmBand").value = s.lmBand;
  $("thetaMin").value = s.thetaMin;
  $("thetaMax").value = s.thetaMax;
  $("navFac").value = s.navFac;
  $("mq").value = s.mq;
  $("alpha").value = s.alpha;
  $("gamma").value = s.gamma;

  document.querySelectorAll(".chip").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.scenario === key);
  });

  run();
}

function bindEvents() {
  document.querySelectorAll("input, select").forEach((el) => {
    el.addEventListener("input", run);
    el.addEventListener("change", run);
  });

  document.querySelectorAll(".chip").forEach((btn) => {
    btn.addEventListener("click", () => applyScenario(btn.dataset.scenario));
  });
}

document.addEventListener("DOMContentLoaded", () => {
  bindEvents();
  applyScenario("partners");
});
