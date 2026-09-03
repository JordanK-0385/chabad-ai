/* ─── ChabbatPoster.jsx ─── Gabarit affiche Chabbat (fidèle KI TAVO) ─── */
import { forwardRef } from "react";

const CP_CSS = `
.cp-poster{position:relative;width:560px;height:840px;background:#FAF7F1;overflow:hidden;font-family:"Cormorant Garamond",Georgia,serif;color:#2A2622}
.cp-poster *{box-sizing:border-box}
.cp-sidebar{position:absolute;top:0;right:0;width:35%;height:100%;background:var(--cp-sidebar)}
.cp-bh{position:absolute;top:24px;left:0;right:0;text-align:center;font-family:"Frank Ruhl Libre",serif;font-size:17px;color:#EFEBE2;direction:rtl;z-index:4}
.cp-cluster{position:absolute;top:50px;left:50%;transform:translateX(-51%);width:195px;z-index:3}
.cp-cluster img{width:100%;display:block;filter:drop-shadow(0 6px 9px rgba(0,0,0,.20))}
.cp-chalom{position:absolute;top:66%;left:0;right:0;text-align:center;color:#F3EFE7;z-index:4}
.cp-chalom .fr{font-family:"Cormorant Garamond",serif;font-style:italic;font-size:24px;font-weight:600}
.cp-chalom .he{font-family:"Frank Ruhl Libre",serif;font-size:22px;margin-top:2px;direction:rtl}
.cp-chalom .orn{margin-top:8px;font-size:13px;letter-spacing:.5em;color:#E4DECF}
.cp-blogo{position:absolute;bottom:52px;left:0;right:0;text-align:center;color:#F1EDE4}
.cp-blogo img{width:44px;height:auto;display:block;margin:0 auto 6px;opacity:.95;filter:brightness(0) invert(1)}
.cp-blogo .n{font-family:"Playfair Display",serif;font-size:12px;font-weight:700;letter-spacing:.06em}
.cp-blogo .s{font-size:10px;letter-spacing:.24em;opacity:.85;margin-top:1px}
.cp-edition{position:absolute;right:4px;top:50%;transform:translateY(-50%) rotate(180deg);writing-mode:vertical-rl;font-size:9.5px;letter-spacing:.1em;color:rgba(0,0,0,.32);white-space:nowrap}
.cp-main{position:absolute;top:0;left:0;width:65%;height:100%;padding:44px 24px 30px 34px;display:flex;flex-direction:column;z-index:2}
.cp-k1{font-family:"Playfair Display",serif;font-style:italic;font-weight:600;font-size:29px;color:#2A2622;text-align:center;line-height:1}
.cp-title{font-family:"Playfair Display",serif;font-style:italic;font-weight:800;color:var(--cp-title);text-align:center;line-height:.98;margin:6px 0 8px;word-break:break-word}
.cp-date{font-family:"Playfair Display",serif;font-style:italic;font-weight:600;font-size:18.5px;color:var(--cp-info);text-align:center}
.cp-region{font-family:"Playfair Display",serif;font-size:18.5px;color:#2A2622;text-align:center;margin-top:6px}
.cp-reflect{flex:1;display:flex;align-items:center}
.cp-reflect p{font-family:"Cormorant Garamond",serif;font-style:italic;font-weight:500;font-size:16px;line-height:1.5;color:#2c2824;text-align:center;margin:0;width:100%}
.cp-times{display:flex;align-items:flex-start;justify-content:space-between;padding-top:8px}
.cp-times .col{flex:1;text-align:center}
.cp-times .lab{font-family:"Playfair Display",serif;font-style:italic;font-size:21px}
.cp-times .val{font-family:"Playfair Display",serif;font-weight:800;font-size:40px;line-height:1;margin-top:2px}
.cp-times .entree .lab,.cp-times .entree .val{color:var(--cp-title)}
.cp-times .sortie .lab,.cp-times .sortie .val{color:var(--cp-info)}
.cp-times .dots{display:flex;flex-direction:column;gap:6px;padding:8px 6px 0}
.cp-times .dots i{width:4px;height:4px;border-radius:50%;background:#c9b48a;display:block}
`;

const ChabbatPoster = forwardRef(function ChabbatPoster({
  parasha = "PARACHA",
  hebDate = "",
  gregDate = "",
  region = "Horaires pour Paris & Région",
  reflection = "",
  candle = "—",
  havdalah = "—",
  community = "BETH LOUBAVITCH",
  communitySub = "ÎLE-DE-FRANCE",
  edition = "",
  titleColor = "#1A5FD0",
  infoColor = "#B08A44",
  sidebarColor = "#9B9384",
}, ref) {
  const lines = String(reflection).split("\n");
  const _letters = String(parasha).replace(/[^0-9A-Za-zÀ-ÿ]/g, "").length;
  const titleSize = _letters > 15 ? 34 : _letters > 11 ? 42 : _letters > 8 ? 50 : 58;
  return (
    <div
      ref={ref}
      className="cp-poster"
      style={{ "--cp-title": titleColor, "--cp-info": infoColor, "--cp-sidebar": sidebarColor }}
    >
      <style>{CP_CSS}</style>
      <div className="cp-sidebar">
      <div className="cp-bh">{"ב״ה"}</div>
      <div className="cp-cluster"><img src="/chabbat-cluster.png" alt="" crossOrigin="anonymous" /></div>
      <div className="cp-chalom">
        <div className="fr">Chabbat Chalom</div>
        <div className="he">{"שבת שלום"}</div>
        <div className="orn">{"· ◈ ·"}</div>
      </div>
      <div className="cp-blogo">
        <img src="/logo-beth-loubavitch.png" alt="" crossOrigin="anonymous" />
        <div className="n">{community}</div>
        <div className="s">{communitySub}</div>
      </div>
      {edition && <div className="cp-edition">{edition}</div>}
      </div>

      <div className="cp-main">
        <div className="cp-k1">Horaires de Chabbat</div>
        <div className="cp-title" style={{ fontSize: titleSize }}>{parasha}</div>
        {(hebDate || gregDate) && (
          <div className="cp-date">{[hebDate, gregDate].filter(Boolean).join(" • ")}</div>
        )}
        <div className="cp-region">{region}</div>
        <div className="cp-reflect">
          <p>{lines.map((l, i) => (<span key={i}>{l}{i < lines.length - 1 && <br />}</span>))}</p>
        </div>
        <div className="cp-times">
          <div className="col entree"><div className="lab">Entrée :</div><div className="val">{candle}</div></div>
          <div className="dots"><i></i><i></i><i></i><i></i><i></i></div>
          <div className="col sortie"><div className="lab">Sortie :</div><div className="val">{havdalah}</div></div>
        </div>
      </div>
    </div>
  );
});

export default ChabbatPoster;
