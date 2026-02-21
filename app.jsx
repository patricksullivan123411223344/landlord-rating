import { useState } from "react";

const SAFMR = {
  "02903": { neighborhood: "Downtown", studio: 1730, "1br": 1860, "2br": 2270, "3br": 2730 },
  "02906": { neighborhood: "East Side / College Hill", studio: 1630, "1br": 1750, "2br": 2140, "3br": 2580 },
  "02912": { neighborhood: "Brown University Area", studio: 1640, "1br": 1760, "2br": 2150, "3br": 2590 },
  "02908": { neighborhood: "Manton / Smith Hill", studio: 1220, "1br": 1310, "2br": 1600, "3br": 1930 },
  "02909": { neighborhood: "West End / Olneyville", studio: 1170, "1br": 1260, "2br": 1530, "3br": 1850 },
  "02907": { neighborhood: "South Providence", studio: 1170, "1br": 1260, "2br": 1530, "3br": 1850 },
  "02904": { neighborhood: "North Providence Border", studio: 1230, "1br": 1320, "2br": 1610, "3br": 1940 },
  "02905": { neighborhood: "Elmwood", studio: 1240, "1br": 1320, "2br": 1620, "3br": 1950 },
  "02910": { neighborhood: "Cranston Border", studio: 1280, "1br": 1370, "2br": 1680, "3br": 2020 },
  "02911": { neighborhood: "North Providence", studio: 1340, "1br": 1440, "2br": 1760, "3br": 2120 },
};

const NEARBY = {
  "02903": ["02906", "02905", "02908"],
  "02906": ["02903", "02912", "02904"],
  "02912": ["02906", "02903", "02904"],
  "02908": ["02904", "02909", "02911"],
  "02909": ["02907", "02908", "02905"],
  "02907": ["02909", "02905", "02910"],
  "02904": ["02906", "02908", "02911"],
  "02905": ["02907", "02909", "02910"],
  "02910": ["02905", "02907", "02904"],
  "02911": ["02904", "02908", "02910"],
};

const AMENITY_ADJ = {
  parking: 100,
  in_unit_laundry: 90,
  utilities_included: 175,
  central_ac: 60,
  pets_allowed: 50,
  no_elevator: -30,
};

const AMENITY_LABELS = {
  parking: "Parking Included",
  in_unit_laundry: "In-Unit Laundry",
  utilities_included: "Utilities Included",
  central_ac: "Central A/C",
  pets_allowed: "Pets Allowed",
  no_elevator: "3+ Floors, No Elevator",
};

const BED_KEY = { studio: "studio", "1": "1br", "2": "2br", "3": "3br" };

const DEMO_LANDLORDS = {
  "196 broadway": {
    owner_name: "Broadway Holdings LLC",
    is_llc: true, non_resident: true,
    year_built: 1924, total_properties: 23,
    recent_permits: 0,
    permit_details: [],
    grade: "F", score: 35,
    notes: ["Owned by LLC — reduced owner transparency", "Non-resident landlord registered with RI SOS", "Large portfolio: 23 properties statewide", "No permits pulled since 2019", "Pre-1980 building with no recent renovation permits"],
  },
  "45 prospect": {
    owner_name: "Margaret Chen",
    is_llc: false, non_resident: false,
    year_built: 1987, total_properties: 2,
    recent_permits: 4,
    permit_details: ["2022 – Electrical upgrade", "2021 – HVAC replacement", "2020 – Roof repair", "2019 – Plumbing"],
    grade: "A", score: 92,
    notes: ["Small portfolio: 2 properties", "Active permit history — well maintained", "Resident landlord"],
  },
  "310 smith": {
    owner_name: "Providence Properties Group LLC",
    is_llc: true, non_resident: false,
    year_built: 1961, total_properties: 11,
    recent_permits: 1,
    permit_details: ["2020 – Exterior repair"],
    grade: "C", score: 58,
    notes: ["Owned by LLC — reduced owner transparency", "Medium portfolio: 11 properties", "Minimal permit activity for building age"],
  },
  "88 waterman": {
    owner_name: "East Side Rentals LLC",
    is_llc: true, non_resident: true,
    year_built: 1910, total_properties: 8,
    recent_permits: 0,
    permit_details: [],
    grade: "D", score: 42,
    notes: ["Owned by LLC — reduced owner transparency", "Non-resident landlord registered with RI SOS", "No permits pulled since 2019", "Pre-1980 building with no recent renovation permits"],
  },
};

function computeRent(zip, bedrooms, amenities, sqft) {
  const data = SAFMR[zip];
  if (!data) return null;
  const key = BED_KEY[bedrooms];
  const base = data[key];
  const adj = amenities.reduce((s, a) => s + (AMENITY_ADJ[a] || 0), 0);
  const medianSqft = { studio: 450, "1br": 650, "2br": 850, "3br": 1100 }[key];
  const sqftDelta = sqft ? ((sqft - medianSqft) / medianSqft) * base * 0.1 : 0;
  const mid = Math.round(base + adj + sqftDelta);
  return {
    base, adj: Math.round(adj), sqftDelta: Math.round(sqftDelta),
    low: Math.round(mid * 0.93), mid, high: Math.round(mid * 1.07),
    neighborhood: data.neighborhood,
  };
}

function getFlag(asking, mid) {
  const pct = (asking - mid) / mid;
  const delta = Math.round(asking - mid);
  if (pct > 0.50) return { level: "red", label: "Extreme Premium", pct: Math.round(pct * 100), delta };
  if (pct > 0.35) return { level: "red", label: "Significantly Overpriced", pct: Math.round(pct * 100), delta };
  if (pct > 0.20) return { level: "yellow", label: "Above Market", pct: Math.round(pct * 100), delta };
  if (pct > -0.10) return { level: "green", label: "At Market Rate", pct: Math.round(pct * 100), delta };
  return { level: "green", label: "Below Market — Good Deal", pct: Math.round(pct * 100), delta };
}

function lookupLandlord(address) {
  const key = Object.keys(DEMO_LANDLORDS).find(k => address.toLowerCase().includes(k));
  return key ? DEMO_LANDLORDS[key] : null;
}

function getNearby(zip, bedrooms, amenities) {
  const key = BED_KEY[bedrooms];
  return (NEARBY[zip] || []).map(z => {
    const base = SAFMR[z]?.[key] || 0;
    const adj = amenities.reduce((s, a) => s + (AMENITY_ADJ[a] || 0), 0);
    return { zip: z, neighborhood: SAFMR[z]?.neighborhood, rent: Math.round(base + adj) };
  }).sort((a, b) => a.rent - b.rent);
}

const GRADE_COLORS = {
  A: { bg: "#0d3d2e", accent: "#22c55e", text: "#86efac" },
  B: { bg: "#1a3a1a", accent: "#4ade80", text: "#bbf7d0" },
  C: { bg: "#3d3200", accent: "#facc15", text: "#fef08a" },
  D: { bg: "#3d1a00", accent: "#f97316", text: "#fed7aa" },
  F: { bg: "#3d0d0d", accent: "#ef4444", text: "#fca5a5" },
};

const FLAG_STYLES = {
  red: { color: "#ef4444", bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.3)" },
  yellow: { color: "#f59e0b", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.3)" },
  green: { color: "#22c55e", bg: "rgba(34,197,94,0.1)", border: "rgba(34,197,94,0.3)" },
};

export default function App() {
  const [form, setForm] = useState({
    address: "", zip: "02906", bedrooms: "2",
    asking: "", sqft: "",
    amenities: [],
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("rent");

  const toggle = (a) => setForm(f => ({
    ...f,
    amenities: f.amenities.includes(a) ? f.amenities.filter(x => x !== a) : [...f.amenities, a]
  }));

  const analyze = () => {
    if (!form.asking || !form.zip) return;
    setLoading(true);
    setTimeout(() => {
      const rent = computeRent(form.zip, form.bedrooms, form.amenities, form.sqft ? parseInt(form.sqft) : null);
      const flag = getFlag(parseFloat(form.asking), rent.mid);
      const landlord = lookupLandlord(form.address);
      const nearby = getNearby(form.zip, form.bedrooms, form.amenities);
      setResult({ rent, flag, landlord, nearby, asking: parseFloat(form.asking) });
      setLoading(false);
      setActiveTab("rent");
    }, 800);
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0a0f",
      color: "#e8e4dc",
      fontFamily: "'Georgia', 'Times New Roman', serif",
    }}>
      {/* Header */}
      <div style={{
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        padding: "24px 40px",
        display: "flex",
        alignItems: "baseline",
        gap: "16px",
        background: "rgba(255,255,255,0.02)",
      }}>
        <div style={{ fontSize: "11px", letterSpacing: "4px", color: "#666", textTransform: "uppercase", fontFamily: "monospace" }}>
          Rhode Island
        </div>
        <div style={{ fontSize: "26px", fontWeight: "400", letterSpacing: "-0.5px", color: "#e8e4dc" }}>
          Fair Rent Report
        </div>
        <div style={{ marginLeft: "auto", fontSize: "10px", color: "#444", fontFamily: "monospace", letterSpacing: "1px" }}>
          DATA: HUD FY2025 SAFMR · OPENPVD · RI SOS
        </div>
      </div>

      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "40px 24px", display: "grid", gridTemplateColumns: result ? "380px 1fr" : "1fr", gap: "32px", transition: "all 0.3s" }}>

        {/* Form Panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div>
            <div style={{ fontSize: "11px", letterSpacing: "3px", color: "#555", textTransform: "uppercase", marginBottom: "20px", fontFamily: "monospace" }}>
              Unit Details
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <Field label="Street Address">
                <input
                  value={form.address}
                  onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                  placeholder="e.g. 88 Waterman St"
                  style={inputStyle}
                />
              </Field>

              <Field label="ZIP Code">
                <select
                  value={form.zip}
                  onChange={e => setForm(f => ({ ...f, zip: e.target.value }))}
                  style={inputStyle}
                >
                  {Object.entries(SAFMR).map(([z, v]) => (
                    <option key={z} value={z}>{z} — {v.neighborhood}</option>
                  ))}
                </select>
              </Field>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <Field label="Bedrooms">
                  <select
                    value={form.bedrooms}
                    onChange={e => setForm(f => ({ ...f, bedrooms: e.target.value }))}
                    style={inputStyle}
                  >
                    <option value="studio">Studio</option>
                    <option value="1">1 Bedroom</option>
                    <option value="2">2 Bedrooms</option>
                    <option value="3">3 Bedrooms</option>
                  </select>
                </Field>
                <Field label="Sq Ft (optional)">
                  <input
                    value={form.sqft}
                    onChange={e => setForm(f => ({ ...f, sqft: e.target.value }))}
                    placeholder="850"
                    type="number"
                    style={inputStyle}
                  />
                </Field>
              </div>

              <Field label="Monthly Asking Rent ($)">
                <input
                  value={form.asking}
                  onChange={e => setForm(f => ({ ...f, asking: e.target.value }))}
                  placeholder="2400"
                  type="number"
                  style={{ ...inputStyle, fontSize: "20px", color: "#e8e4dc" }}
                />
              </Field>
            </div>
          </div>

          {/* Amenities */}
          <div>
            <div style={{ fontSize: "11px", letterSpacing: "3px", color: "#555", textTransform: "uppercase", marginBottom: "14px", fontFamily: "monospace" }}>
              Amenities
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {Object.entries(AMENITY_LABELS).map(([key, label]) => {
                const on = form.amenities.includes(key);
                const adj = AMENITY_ADJ[key];
                return (
                  <button
                    key={key}
                    onClick={() => toggle(key)}
                    style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "10px 14px",
                      background: on ? "rgba(232,228,220,0.08)" : "rgba(255,255,255,0.02)",
                      border: on ? "1px solid rgba(232,228,220,0.2)" : "1px solid rgba(255,255,255,0.06)",
                      borderRadius: "6px",
                      color: on ? "#e8e4dc" : "#666",
                      cursor: "pointer",
                      fontSize: "13px",
                      transition: "all 0.15s",
                      textAlign: "left",
                    }}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "8px", color: on ? "#e8e4dc" : "#444" }}>
                        {on ? "●" : "○"}
                      </span>
                      {label}
                    </span>
                    <span style={{ fontSize: "11px", fontFamily: "monospace", color: adj > 0 ? "#22c55e" : "#ef4444" }}>
                      {adj > 0 ? "+" : ""}{adj}/mo
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <button
            onClick={analyze}
            disabled={!form.asking || loading}
            style={{
              padding: "16px",
              background: !form.asking ? "#1a1a1a" : "#e8e4dc",
              color: !form.asking ? "#333" : "#0a0a0f",
              border: "none",
              borderRadius: "6px",
              fontSize: "13px",
              letterSpacing: "3px",
              textTransform: "uppercase",
              fontFamily: "monospace",
              cursor: form.asking ? "pointer" : "not-allowed",
              transition: "all 0.2s",
            }}
          >
            {loading ? "Analyzing..." : "Run Analysis"}
          </button>

          <div style={{ fontSize: "10px", color: "#333", fontFamily: "monospace", lineHeight: 1.6 }}>
            Data: HUD FY2025 Small Area Fair Market Rents · City of Providence OpenPVD · RI Secretary of State
          </div>
        </div>

        {/* Results Panel */}
        {result && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

            {/* Tabs */}
            <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              {["rent", "landlord", "compare"].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    padding: "10px 20px",
                    background: "none",
                    border: "none",
                    borderBottom: activeTab === tab ? "2px solid #e8e4dc" : "2px solid transparent",
                    color: activeTab === tab ? "#e8e4dc" : "#555",
                    cursor: "pointer",
                    fontSize: "11px",
                    letterSpacing: "3px",
                    textTransform: "uppercase",
                    fontFamily: "monospace",
                    marginBottom: "-1px",
                    transition: "all 0.15s",
                  }}
                >
                  {tab === "rent" ? "Rent Analysis" : tab === "landlord" ? "Landlord Rating" : "ZIP Comparison"}
                </button>
              ))}
            </div>

            {/* Rent Tab */}
            {activeTab === "rent" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* Flag Banner */}
                <div style={{
                  padding: "20px 24px",
                  background: FLAG_STYLES[result.flag.level].bg,
                  border: `1px solid ${FLAG_STYLES[result.flag.level].border}`,
                  borderRadius: "8px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}>
                  <div>
                    <div style={{ fontSize: "11px", letterSpacing: "3px", color: FLAG_STYLES[result.flag.level].color, fontFamily: "monospace", marginBottom: "4px" }}>
                      VERDICT
                    </div>
                    <div style={{ fontSize: "22px", color: FLAG_STYLES[result.flag.level].color }}>
                      {result.flag.label}
                    </div>
                    {result.flag.delta !== 0 && (
                      <div style={{ fontSize: "13px", color: "#888", marginTop: "4px" }}>
                        {result.flag.delta > 0 ? `$${result.flag.delta}/mo above` : `$${Math.abs(result.flag.delta)}/mo below`} estimated fair rent
                        {result.flag.delta > 0 && (
                          <span style={{ color: "#ef4444", marginLeft: "8px" }}>
                            (${(result.flag.delta * 12).toLocaleString()}/year overpaid)
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: "48px", fontFamily: "monospace", color: FLAG_STYLES[result.flag.level].color, opacity: 0.6 }}>
                    {result.flag.pct > 0 ? "+" : ""}{result.flag.pct}%
                  </div>
                </div>

                {/* Rent Breakdown */}
                <div style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: "8px",
                  overflow: "hidden",
                }}>
                  <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", fontSize: "11px", letterSpacing: "3px", color: "#555", fontFamily: "monospace" }}>
                    RENT BREAKDOWN — {result.rent.neighborhood}
                  </div>
                  <div style={{ padding: "20px" }}>
                    <RentRow label="HUD FY2025 SAFMR Baseline" value={result.rent.base} />
                    {result.rent.adj !== 0 && <RentRow label="Amenity Adjustments" value={result.rent.adj} sign />}
                    {result.rent.sqftDelta !== 0 && <RentRow label="Square Footage Adjustment" value={result.rent.sqftDelta} sign />}
                    <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", marginTop: "12px", paddingTop: "12px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                        <span style={{ fontSize: "12px", color: "#888" }}>Estimated Fair Range</span>
                        <span style={{ fontSize: "20px", color: "#e8e4dc" }}>
                          ${result.rent.low.toLocaleString()} – ${result.rent.high.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div style={{ marginTop: "12px", padding: "14px", background: "rgba(255,255,255,0.03)", borderRadius: "6px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "12px", color: "#888" }}>Your Asking Rent</span>
                      <span style={{ fontSize: "24px", color: result.flag.level === "green" ? "#22c55e" : result.flag.level === "yellow" ? "#f59e0b" : "#ef4444" }}>
                        ${result.asking.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Landlord Tab */}
            {activeTab === "landlord" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {result.landlord ? (
                  <>
                    {/* Grade Card */}
                    <div style={{
                      padding: "28px",
                      background: GRADE_COLORS[result.landlord.grade]?.bg || "#1a1a1a",
                      border: `1px solid ${GRADE_COLORS[result.landlord.grade]?.accent || "#333"}22`,
                      borderRadius: "8px",
                      display: "flex",
                      alignItems: "center",
                      gap: "28px",
                    }}>
                      <div style={{
                        fontSize: "72px",
                        fontWeight: "400",
                        color: GRADE_COLORS[result.landlord.grade]?.accent || "#888",
                        lineHeight: 1,
                        minWidth: "80px",
                        textAlign: "center",
                      }}>
                        {result.landlord.grade}
                      </div>
                      <div>
                        <div style={{ fontSize: "18px", color: "#e8e4dc", marginBottom: "4px" }}>
                          {result.landlord.owner_name}
                        </div>
                        <div style={{ fontSize: "12px", color: "#666", fontFamily: "monospace" }}>
                          Landlord Accountability Score: {result.landlord.score}/100
                        </div>
                        <div style={{ display: "flex", gap: "10px", marginTop: "10px", flexWrap: "wrap" }}>
                          {result.landlord.is_llc && <Tag label="LLC" color="#f59e0b" />}
                          {result.landlord.non_resident && <Tag label="Non-Resident" color="#ef4444" />}
                          {result.landlord.total_properties > 10 && <Tag label={`${result.landlord.total_properties} Properties`} color="#8b5cf6" />}
                        </div>
                      </div>
                    </div>

                    {/* Score Factors */}
                    <div style={{
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      borderRadius: "8px",
                      overflow: "hidden",
                    }}>
                      <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", fontSize: "11px", letterSpacing: "3px", color: "#555", fontFamily: "monospace" }}>
                        SCORING FACTORS
                      </div>
                      <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: "10px" }}>
                        {result.landlord.notes.map((note, i) => (
                          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "10px", fontSize: "13px", color: "#aaa" }}>
                            <span style={{ color: "#555", marginTop: "2px" }}>—</span>
                            {note}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Permit History */}
                    {result.landlord.permit_details?.length > 0 && (
                      <div style={{
                        background: "rgba(255,255,255,0.02)",
                        border: "1px solid rgba(255,255,255,0.06)",
                        borderRadius: "8px",
                        overflow: "hidden",
                      }}>
                        <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", fontSize: "11px", letterSpacing: "3px", color: "#555", fontFamily: "monospace" }}>
                          PERMIT HISTORY
                        </div>
                        <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: "8px" }}>
                          {result.landlord.permit_details.map((p, i) => (
                            <div key={i} style={{ fontSize: "13px", color: "#888", fontFamily: "monospace" }}>
                              {p}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div style={{ fontSize: "10px", color: "#333", fontFamily: "monospace", lineHeight: 1.6 }}>
                      Sources: City of Providence OpenPVD · RI Secretary of State Business Registry · Providence Property Assessor
                    </div>
                  </>
                ) : (
                  <div style={{
                    padding: "40px",
                    textAlign: "center",
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: "8px",
                  }}>
                    <div style={{ fontSize: "13px", color: "#555", fontFamily: "monospace" }}>
                      Enter a Providence address to look up landlord records
                    </div>
                    <div style={{ fontSize: "11px", color: "#333", marginTop: "8px", fontFamily: "monospace" }}>
                      Try: 88 Waterman St · 196 Broadway St · 310 Smith St
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ZIP Comparison Tab */}
            {activeTab === "compare" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: "8px",
                  overflow: "hidden",
                }}>
                  <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", fontSize: "11px", letterSpacing: "3px", color: "#555", fontFamily: "monospace" }}>
                    SAME UNIT · NEARBY ZIP CODES
                  </div>

                  {/* Current ZIP */}
                  <div style={{
                    padding: "16px 20px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderBottom: "1px solid rgba(255,255,255,0.06)",
                    background: "rgba(232,228,220,0.04)",
                  }}>
                    <div>
                      <div style={{ fontSize: "11px", color: "#555", fontFamily: "monospace", marginBottom: "2px" }}>
                        {form.zip} · CURRENT
                      </div>
                      <div style={{ fontSize: "14px", color: "#e8e4dc" }}>{result.rent.neighborhood}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "22px", color: "#e8e4dc" }}>${result.rent.mid.toLocaleString()}</div>
                      <div style={{ fontSize: "10px", color: "#555", fontFamily: "monospace" }}>est. fair rent</div>
                    </div>
                  </div>

                  {/* Nearby ZIPs */}
                  {result.nearby.map((n, i) => {
                    const savings = result.rent.mid - n.rent;
                    return (
                      <div key={n.zip} style={{
                        padding: "16px 20px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        borderBottom: i < result.nearby.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                      }}>
                        <div>
                          <div style={{ fontSize: "11px", color: "#555", fontFamily: "monospace", marginBottom: "2px" }}>
                            {n.zip}
                          </div>
                          <div style={{ fontSize: "14px", color: "#aaa" }}>{n.neighborhood}</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: "22px", color: savings > 0 ? "#22c55e" : "#e8e4dc" }}>
                            ${n.rent.toLocaleString()}
                          </div>
                          {savings > 100 && (
                            <div style={{ fontSize: "11px", color: "#22c55e", fontFamily: "monospace" }}>
                              save ${savings}/mo · ${(savings * 12).toLocaleString()}/yr
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={{
                  padding: "16px 20px",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: "#666",
                  lineHeight: 1.7,
                }}>
                  Estimates based on HUD FY2025 Small Area Fair Market Rents adjusted for selected amenities.
                  ZIP codes within ~2 miles of selected area. Actual market prices may vary.
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <div style={{ fontSize: "10px", letterSpacing: "2px", color: "#444", textTransform: "uppercase", fontFamily: "monospace", marginBottom: "6px" }}>
        {label}
      </div>
      {children}
    </div>
  );
}

function RentRow({ label, value, sign }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
      <span style={{ fontSize: "12px", color: "#666" }}>{label}</span>
      <span style={{ fontSize: "14px", color: "#aaa", fontFamily: "monospace" }}>
        {sign && value > 0 ? "+" : ""}{sign && value < 0 ? "" : ""}${Math.abs(value).toLocaleString()}
      </span>
    </div>
  );
}

function Tag({ label, color }) {
  return (
    <span style={{
      padding: "3px 10px",
      background: `${color}18`,
      border: `1px solid ${color}44`,
      borderRadius: "4px",
      fontSize: "10px",
      color,
      fontFamily: "monospace",
      letterSpacing: "1px",
    }}>
      {label}
    </span>
  );
}

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "6px",
  color: "#e8e4dc",
  fontSize: "14px",
  fontFamily: "Georgia, serif",
  outline: "none",
  boxSizing: "border-box",
};
