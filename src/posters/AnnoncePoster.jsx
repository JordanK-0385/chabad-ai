/* ─── AnnoncePoster.jsx ─── Gabarit affiche Annonce communautaire (sans photo) ─── */
import { forwardRef } from "react";

/* Icônes inline (sûres pour html2canvas) */
function AIcon({ name, size = 30, stroke = "#173B5E", sw = 1.9 }) {
  const c = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke, strokeWidth: sw, strokeLinecap: "round", strokeLinejoin: "round" };
  switch (name) {
    case "fork":   return (<svg {...c}><path d="M6 3v6a2 2 0 0 0 4 0V3M8 3v18M17 3c-1.5 1-2 3-2 6s.5 4 2 5v7" /></svg>);
    case "bowl":   return (<svg {...c}><path d="M3 11h18a8 8 0 0 1-8 8h-2a8 8 0 0 1-8-8z" /><path d="M12 11c0-3 2-4 2-6M9 11c0-2 1-3 1-4" /></svg>);
    case "pin":    return (<svg {...c}><path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>);
    case "cal":    return (<svg {...c}><rect x="4" y="5" width="16" height="16" rx="2.5" /><path d="M4 9h16M8 3v4M16 3v4" /></svg>);
    case "clock":  return (<svg {...c}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>);
    case "euro":   return (<svg {...c}><path d="M17 6a7 7 0 1 0 0 12M4 10h9M4 14h8" /></svg>);
    case "phone":  return (<svg {...c}><path d="M6 3h3l2 5-2.5 1.5a12 12 0 0 0 5 5L16 12l5 2v3a2 2 0 0 1-2.2 2A16 16 0 0 1 4 5.2 2 2 0 0 1 6 3z" /></svg>);
    case "people": return (<svg {...c}><circle cx="9" cy="8" r="3" /><path d="M3 20c0-3 2.7-5 6-5s6 2 6 5" /><path d="M16 6a3 3 0 0 1 0 5M18 20c0-2.4-1-4-3-4.6" /></svg>);
    case "heart":  return (<svg {...c}><path d="M12 20s-7-4.5-9-9a4.5 4.5 0 0 1 9-2 4.5 4.5 0 0 1 9 2c-2 4.5-9 9-9 9z" /></svg>);
    case "jump":   return (<svg {...c}><circle cx="12" cy="5" r="2" /><path d="M12 8v6M12 10l-5-2M12 10l5-2M9 20l3-6 3 6" /></svg>);
    default:       return null;
  }
}

const CSS = `
.ap-poster{position:relative;width:560px;height:840px;background:#FBF9F5;overflow:hidden;color:#1b2a3a;font-family:"Manrope","Segoe UI",sans-serif}
.ap-poster *{box-sizing:border-box}
.ap-bh{position:absolute;top:14px;right:20px;font-family:"Frank Ruhl Libre",serif;font-size:15px;color:var(--ap-navy);direction:rtl}
.ap-pad{position:absolute;left:0;right:0;top:0;bottom:var(--ap-bandh);padding:30px 34px 8px;display:flex;flex-direction:column}
.ap-emblem{display:flex;flex-direction:column;align-items:center;gap:5px;margin-bottom:6px}
.ap-emblem .badge{width:74px;height:74px;border-radius:50%;background:var(--ap-navy);display:flex;align-items:center;justify-content:center;overflow:hidden}
.ap-emblem .badge img{width:100%;height:100%;object-fit:cover}
.ap-emblem .org{font-weight:800;font-size:14px;color:var(--ap-navy)}
.ap-emblem .orgsub{font-size:9px;font-weight:700;letter-spacing:.12em;color:var(--ap-orange);text-transform:uppercase;margin-top:-2px}
.ap-title{text-align:center;margin-top:2px}
.ap-title .t1{font-weight:800;line-height:.98;color:var(--ap-navy);letter-spacing:-.01em}
.ap-title .t2{font-family:"Pacifico",cursive;line-height:.9;color:var(--ap-orange);margin-top:2px;font-weight:400}
.ap-title svg{display:block;margin:2px auto 0}
.ap-tag{display:flex;align-items:center;gap:14px;margin:16px 4px 0}
.ap-tag p{flex:1;text-align:center;font-size:16px;font-weight:600;color:#3a4a5a;margin:0;line-height:1.35}
.ap-cards{display:flex;gap:12px;margin-top:20px}
.ap-card{flex:1;border:2px solid;border-radius:14px;padding:14px 12px 12px;text-align:center;position:relative}
.ap-card .pin{position:absolute;top:-15px;left:50%;transform:translateX(-50%);background:#FBF9F5;padding:0 6px}
.ap-card .addr{font-weight:800;font-size:17px;color:var(--ap-navy);margin-top:6px}
.ap-card .area{font-weight:800;font-size:13px;letter-spacing:.06em;margin-top:3px}
.ap-card .sep{height:1px;background:#dfe4ea;margin:9px 12px}
.ap-card .detail{font-size:12.5px;color:#5a6a7a;font-weight:600}
.ap-info{display:flex;align-items:center;justify-content:space-between;margin:20px 0 0;border-top:2px dotted #c9d2db;border-bottom:2px dotted #c9d2db;padding:14px 0}
.ap-info .cell{display:flex;align-items:center;gap:9px;flex:1;justify-content:center}
.ap-info .cell .tx b{display:block;font-size:11px;font-weight:800;color:var(--ap-navy);letter-spacing:.02em}
.ap-info .cell .tx span{font-size:14.5px;font-weight:700;color:#5a6a7a}
.ap-info .vsep{width:2px;align-self:stretch;background:#e3e8ee}
.ap-contact{display:flex;align-items:center;gap:14px;margin-top:20px}
.ap-contact .ph{width:44px;height:44px;border-radius:50%;background:var(--ap-navy);display:flex;align-items:center;justify-content:center;flex:0 0 auto}
.ap-contact .who b{display:block;font-size:12px;font-weight:800;color:var(--ap-navy)}
.ap-contact .who .name{font-size:16px;font-weight:800;color:#1b2a3a}
.ap-contact .num{margin-left:auto;font-size:26px;font-weight:800;color:var(--ap-navy)}
.ap-band{position:absolute;left:0;right:0;bottom:0;height:var(--ap-bandh);background:var(--ap-navy);display:flex;align-items:center;justify-content:space-between;padding:0 34px}
.ap-band::before{content:"";position:absolute;top:-26px;left:0;right:0;height:34px;background:var(--ap-navy);border-radius:100% 100% 0 0}
.ap-band .slogan{position:relative;color:#fff;font-family:"Pacifico",cursive;font-size:23px;line-height:1.15}
.ap-band .icons{position:relative;display:flex;gap:16px}
`;

const AnnoncePoster = forwardRef(function AnnoncePoster({
  title1 = "TITRE", title2 = "", org = "", orgSub = "", logo = "",
  tagline = "", lieux = [], jours = "", horaires = "", prix = "",
  contactName = "", contactPhone = "", contactLabel = "Pour plus d'informations",
  slogan1 = "", slogan2 = "",
  navy = "#173B5E", orange = "#F0801C",
}, ref) {
  const cards = (lieux || []).filter(l => l && (l.addr || l.area || l.detail)).slice(0, 2);
  const hasInfo = jours || horaires || prix;
  const hasContact = contactName || contactPhone;
  const hasBand = slogan1 || slogan2;
  const bandH = hasBand ? 118 : 0;
  const t1size = String(title1).length > 16 ? 36 : String(title1).length > 12 ? 42 : 47;

  return (
    <div ref={ref} className="ap-poster" style={{ "--ap-navy": navy, "--ap-orange": orange, "--ap-bandh": bandH + "px" }}>
      <style>{CSS}</style>
      <div className="ap-bh">{"ב״ה"}</div>
      <div className="ap-pad">
        {(org || logo) && (
          <div className="ap-emblem">
            <div className="badge">{logo ? <img src={logo} alt="" crossOrigin="anonymous" /> : <AIcon name="jump" size={44} stroke="#fff" sw={1.8} />}</div>
            {org && <div className="org">{org}</div>}
            {orgSub && <div className="orgsub">{orgSub}</div>}
          </div>
        )}

        <div className="ap-title">
          <div className="t1" style={{ fontSize: t1size }}>{title1}</div>
          {title2 && <div className="t2" style={{ fontSize: 50 }}>{title2}</div>}
          <svg width="180" height="8" viewBox="0 0 180 8" preserveAspectRatio="none"><path d="M2 5 C 50 1, 130 1, 178 4" stroke={orange} strokeWidth="4" fill="none" strokeLinecap="round" /></svg>
        </div>

        {tagline && (
          <div className="ap-tag">
            <AIcon name="fork" size={34} stroke={navy} />
            <p>{tagline}</p>
            <AIcon name="bowl" size={34} stroke={navy} />
          </div>
        )}

        {cards.length > 0 && (
          <div className="ap-cards">
            {cards.map((l, i) => {
              const col = i === 0 ? navy : orange;
              return (
                <div className="ap-card" key={i} style={{ borderColor: col }}>
                  <span className="pin"><AIcon name="pin" size={26} stroke={col} sw={2} /></span>
                  {l.addr && <div className="addr">{l.addr}</div>}
                  {l.area && <div className="area" style={{ color: col }}>{l.area}</div>}
                  {l.detail && <div className="sep"></div>}
                  {l.detail && <div className="detail">{l.detail}</div>}
                </div>
              );
            })}
          </div>
        )}

        {hasInfo && (
          <div className="ap-info">
            {jours && <div className="cell"><AIcon name="cal" stroke={navy} /><div className="tx"><span>{jours}</span></div></div>}
            {jours && horaires && <div className="vsep"></div>}
            {horaires && <div className="cell"><AIcon name="clock" stroke={navy} /><div className="tx"><span>{horaires}</span></div></div>}
            {(jours || horaires) && prix && <div className="vsep"></div>}
            {prix && <div className="cell"><AIcon name="euro" stroke={orange} /><div className="tx"><b>PRIX</b><span style={{ color: orange, fontWeight: 800 }}>{prix}</span></div></div>}
          </div>
        )}

        {hasContact && (
          <div className="ap-contact">
            <div className="ph"><AIcon name="phone" size={24} stroke="#fff" /></div>
            <div className="who">{contactLabel && <b>{contactLabel.toUpperCase()}</b>}{contactName && <div className="name">{contactName}</div>}</div>
            {contactPhone && <div className="num">{contactPhone}</div>}
          </div>
        )}
      </div>

      {hasBand && (
        <div className="ap-band">
          <div className="slogan">{slogan1}{slogan1 && slogan2 && <br />}{slogan2 && <span style={{ color: "#FFC58A" }}>{slogan2}</span>}</div>
          <div className="icons"><AIcon name="bowl" stroke="#fff" /><AIcon name="people" stroke="#fff" /><AIcon name="heart" stroke="#fff" /></div>
        </div>
      )}
    </div>
  );
});

export default AnnoncePoster;
