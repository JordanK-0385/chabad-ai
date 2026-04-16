/* ─── Affiches.jsx ─── Poster generator module (extracted from App.jsx) ─── */

import { useState, useCallback, useRef, useEffect } from "react";
import html2canvas from "html2canvas";
import { T, SERIF, SANS, INP, ChabadLogo, Card, GBtn, StepLabel, BackButton, AppHeader } from "./shared";
import { db } from "./firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

/* ─── Claude system prompt ─── */
const CLAUDE_SYS = `Tu es expert en communication visuelle pour les institutions Chabad-Loubavitch en France. Tu génères le contenu structuré d'affiches communautaires juives religieuses.

═══════════════════════════════════════
RÈGLES VISUELLES — ABSOLUES ET NON NÉGOCIABLES
═══════════════════════════════════════

BSD :
- "בס״ד" apparaît TOUJOURS en haut à droite de chaque affiche, petit et sobre. Ce n'est pas un élément central — il ne concurrence jamais le titre.

SYMBOLES :
- Interdit : croix, hamsa, étoile de David, symboles d'autres religions, tout symbole religieux quel qu'il soit.
- Les affiches sont visuelles et communautaires — aucun symbole religieux dans l'illustration.

COUVRE-CHEFS — RÈGLE ABSOLUE :
- HOMMES et GARÇONS : portent TOUJOURS une kippah. Couleur OBLIGATOIREMENT sombre : marine, noir ou bordeaux. JAMAIS blanche.
- FEMMES et FILLES : ne portent JAMAIS de kippah. Jamais. C'est une interdiction absolue sans exception.
- FEMMES MARIÉES : sheitel (perruque naturelle) OU tichel noué derrière la tête. JAMAIS un hijab, voile, foulard islamique ou niqab.
- FILLES non mariées : cheveux naturels visibles — tresse, queue de cheval, cheveux lâchés. JAMAIS hijab, voile ou foulard.

TENUE VESTIMENTAIRE (Tsniout) :
- Femmes et filles : jupe ou robe longue OBLIGATOIREMENT sous le genou. Manches longues. Col fermé.
- Hommes et garçons : tenue correcte, kippah sombre.
- Aucune tenue révélatrice, décolleté, jupe courte ou manche courte pour les femmes.

PERSONNAGES :
- Le TYPE d'illustration est CHOISI par l'utilisateur dans l'interface.
- TON rôle : appliquer les règles Tsniout aux personnages choisis. NE PAS décider toi-même qui apparaît.
- Le champ "personnages" dans ton JSON doit TOUJOURS être un tableau vide [].
- Si l'illustration est "Décor" (sans personnage) : ignorer toutes les règles de personnages.

LOGO :
- Si l'utilisateur a uploadé un logo personnalisé dans son profil : utilise ce logo sur l'affiche.
- Si aucun logo personnalisé n'est présent : utilise le logo par défaut Habad.ai (les deux vav dorés).
- Le logo apparaît TOUJOURS en bas de l'affiche, centré ou aligné avec les informations de contact.
- Ne jamais omettre le logo.

═══════════════════════════════════════
COULEURS PAR OCCASION
═══════════════════════════════════════
- Pessah → blanc, or, bleu clair
- Hanoukka → bleu royal, argent, or
- Pourim → violet, or, festif
- Lag BaOmer → orange, brun, nature
- Roch Hachana / Yom Kippour → blanc, or, bordeaux solennel
- Chabbat → bordeaux, or, crème
- Bar/Bat Mitsva → bleu marine, or
- Mariage → blanc, or, ivoire
- Souccot → vert, brun, or
- Chavouot → blanc, vert, or
- Deuil / Yahrzeit → bordeaux foncé, gris, sobre
- Défaut (autre) → #003087 (bleu Chabad) + #C9971A (or)

═══════════════════════════════════════
STRUCTURE VISUELLE DE L'AFFICHE
═══════════════════════════════════════
Respecte impérativement cette hiérarchie visuelle de haut en bas :

1. BSD (בס״ד) — haut à droite, petit, sobre
2. EMOJI — centré, grand, au-dessus du titre. Capte l'œil instantanément.
3. TITRE — élément dominant. Police serif, gras, centré. Maximum 3 niveaux de taille de police sur toute l'affiche.
4. TEXTE HÉBREU — juste sous le titre, élégant, taille moyenne. Ancrage identitaire et émotionnel.
5. SOUS-TITRE — plus petit que le titre, même axe central. Précise sans surcharger.
6. INFORMATIONS PRATIQUES (date, heure, lieu) — bloc compact et séparé visuellement. La date n'est JAMAIS l'élément dominant.
7. ACCROCHE — en bas de la zone centrale, ton chaleureux, police légère ou italique. Complète, ne domine pas.
8. LOGO + CONTACT — tout en bas, petit. Ancrage institutionnel.

RÈGLES TYPOGRAPHIQUES :
- Maximum 3 tailles de police différentes sur toute l'affiche
- Maximum 2 familles de polices (une serif pour les titres, une sans-serif pour les infos)
- L'accroche ne doit jamais être plus grande que le titre
- La date et l'heure sont des infos secondaires — jamais en gros

═══════════════════════════════════════
CONTENU À GÉNÉRER
═══════════════════════════════════════
- Titre : accrocheur, court, en français. Maximum 6 mots.
- Sous-titre : précise le contexte ou le public. Maximum 10 mots.
- Accroche : phrase d'invitation courte et chaleureuse. Maximum 15 mots.
- Texte hébreu : formule hébraïque adaptée à l'occasion. Toujours en hébreu authentique.
- Emoji : 1 seul emoji représentatif de l'occasion.
- Ambiance : "festive", "solennelle", "chaleureuse", "éducative" ou "communautaire".

═══════════════════════════════════════
FORMAT DE RÉPONSE
═══════════════════════════════════════
Réponds UNIQUEMENT avec du JSON valide.
AUCUN texte avant ou après. AUCUN backtick. AUCUN commentaire.
Structure exacte obligatoire :

{"titre":"...","sous_titre":"...","date":"...","heure":"...","lieu":"...","adresse":"...","public":"...","accroche":"...","texte_hebreu":"...","ambiance":"festive","emoji":"...","contact":"...","logo":"...","personnages":[],"couleur_dominante":"#003087","couleur_accent":"#C9971A"}

Si une information n'est pas fournie, laisse le champ vide "".`;

/* ─── buildPrompt ─── */
function buildPrompt(data, bc, fmt, illustSelection = []) {
  const ratios = { carre: "1:1", story: "9:16", a4: "3:4", paysage: "4:3" };
  const ar     = ratios[fmt] || "1:1";
  const isSol = data.ambiance === "solennelle";
  const pal   = isSol ? "dark burgundy and charcoal, dignified" : "deep Chabad blue and warm gold, festive";
  const scene = data.accroche ? `Scene hint: "${data.accroche}". ` : "";

  const ageMap = { "Enfants": "young children (ages 5-10)", "Adolescents": "teenagers (ages 13-17)", "Adolescentes": "teenage girls (ages 13-17)", "Adultes": "young adults (ages 25-40)", "Adulte": "adult (age 35-55)", "Seniors": "elderly (ages 65+)", "\u00C2g\u00E9": "elderly man (age 65+)", "\u00C2g\u00E9e": "elderly woman (age 65+)" };
  const MALE_TILES = ["garcons", "rav"];
  const FEMALE_TILES = ["filles", "rabbanit"];

  function descTile(tile, age, qty) {
    const a = age && ageMap[age] ? `, age group: ${ageMap[age]}` : ", adults";
    const solo = qty === "1";
    if (tile === "garcons") return solo
      ? `A single Jewish Chabad boy${a}. Dark navy or black suede kippah (NEVER white). White shirt, visible tzitzit strings at waist, long dark trousers. Warm, friendly, expressive face. Only ONE boy, no other characters.`
      : `Jewish Chabad boys (small group of 2-4)${a}. Dark navy or black suede kippah (NEVER white). White shirt, visible tzitzit strings at waist, long dark trousers. Warm, friendly, expressive faces.`;
    if (tile === "filles") return solo
      ? `A single Jewish Chabad girl${a}. Completely natural uncovered hair \u2014 braids, ponytail, or loose. NO kippah, NO head covering. Modest long dress below knee, long sleeves. Warm, friendly, expressive face. Only ONE girl, no other characters.`
      : `Jewish Chabad girls (small group of 2-4)${a}. Completely natural uncovered hair \u2014 braids, ponytail, or loose flowing hair. NO kippah, NO head covering. Modest long dress below knee, long sleeves. Warm, friendly, expressive faces.`;
    if (tile === "rav") return `A single Chabad Rabbi (Rav)${a}. Full beard, wearing a black fedora hat (classic Chabad rabbi hat) on his head, dark suit jacket, white shirt, visible tzitzit strings. Warm, wise, approachable expression. The black hat is essential.`;
    if (tile === "rabbanit") return `A single Chabad Rebbetzin (Rabbanit)${a}. Elegant, modest dress below knee, long sleeves. Completely natural uncovered hair \u2014 styled nicely. ABSOLUTELY NO kippah, NO head covering. Warm, wise, gracious expression.`;
    if (tile === "mixte") return `Mixed scene${a} \u2014 Boys/men strictly LEFT side, girls/women strictly RIGHT side, clear visual divider (mechitza, partition, table). No interaction, no touching. Boys: kippah (dark navy, NEVER white), tzitzit. Girls: natural uncovered hair, modest dress. SEPARATION MUST BE OBVIOUS.`;
    return "";
  }

  let charSection = "";
  if (!illustSelection.length) {
    charSection = `SCENE: NO human characters at all. Beautiful atmospheric scene only: Jewish decorative elements, warm lighting, Chabad blue and gold color palette, relevant objects for the event. Cozy and inviting ambiance.`;
  } else if (illustSelection.length === 1) {
    const s = illustSelection[0];
    if (s.tile === "mixte") {
      charSection = `CHARACTERS: ${descTile(s.tile, s.age, s.qty)}\nPixar-meets-storybook aesthetic.`;
    } else {
      const isMale = MALE_TILES.includes(s.tile);
      const isFemale = FEMALE_TILES.includes(s.tile);
      charSection = `CHARACTERS: ${descTile(s.tile, s.age, s.qty)}\nPixar-meets-storybook aesthetic.`;
      if (isMale) charSection += `\nABSOLUTELY NO girls or women visible anywhere, including background.`;
      if (isFemale) charSection += `\nABSOLUTELY NO boys or men visible anywhere, including background.`;
    }
  } else {
    const s1 = illustSelection[0], s2 = illustSelection[1];
    const strictMale = MALE_TILES.includes(s1.tile) && MALE_TILES.includes(s2.tile);
    const strictFemale = FEMALE_TILES.includes(s1.tile) && FEMALE_TILES.includes(s2.tile);
    const g1male = MALE_TILES.includes(s1.tile), g1female = FEMALE_TILES.includes(s1.tile);
    const g2male = MALE_TILES.includes(s2.tile), g2female = FEMALE_TILES.includes(s2.tile);
    const mixedGender = (g1male && g2female) || (g1female && g2male) || s1.tile === "mixte" || s2.tile === "mixte";
    charSection = `SCENE COMPOSITION: Two groups in the same image.\nGroup 1: ${descTile(s1.tile, s1.age, s1.qty)}\nGroup 2: ${descTile(s2.tile, s2.age, s2.qty)}\nPixar-meets-storybook aesthetic.`;
    if (mixedGender) charSection += `\nGroups must be visually separated by a clear divider (table, architectural element, or space). No physical contact between groups. Orthodox Jewish modesty rule (tzniut).`;
    else charSection += `\nGroups interact naturally in the same space.`;
    if (strictMale) charSection += `\nABSOLUTELY NO girls, women, or female characters visible ANYWHERE in the image \u2014 not in the scene, not in the background, not partially visible. This is a MALES ONLY scene. Zero females.`;
    if (strictFemale) charSection += `\nABSOLUTELY NO boys, men, or male characters visible ANYWHERE in the image \u2014 not in the scene, not in the background, not partially visible. This is a FEMALES ONLY scene. Zero males.`;
  }

  const titre = data.titre || "";
  const feteKey = titre.toLowerCase();
  let feteRules = "";
  if (feteKey.includes("pessah") || feteKey.includes("matsa") || feteKey.includes("seder"))
    feteRules = "Pessah objects ONLY: matzot, seder plate, wine cups, Haggadah, spring flowers. NO menorah, NO shofar, NO sukkah, NO lulav.";
  else if (feteKey.includes("hanouk") || feteKey.includes("hanuk") || feteKey.includes("hanoucca"))
    feteRules = "Hanoukka objects ONLY: menorah/hanukkiah (9 branches), dreidels, sufganiyot (donuts), latkes, gelt, oil jug. NO matzot, NO shofar, NO sukkah. Torah books and Siddur if present must be on a table or bookshelf ONLY \u2014 never on the floor or ground level.";
  else if (feteKey.includes("pourim") || feteKey.includes("purim"))
    feteRules = "Pourim objects ONLY: megillah scroll, mishloah manot (gift baskets), hamantashen cookies, masks, costumes. NO menorah, NO matzot, NO shofar.";
  else if (feteKey.includes("souccot") || feteKey.includes("sukkot") || feteKey.includes("soukka"))
    feteRules = "Souccot objects ONLY: sukkah, lulav, etrog, schach (roof branches), decorations. NO menorah, NO matzot.";
  else if (feteKey.includes("chavouot") || feteKey.includes("shavuot"))
    feteRules = "Chavouot objects ONLY: Torah scroll, flowers, greenery, dairy foods, Ten Commandments tablets. NO menorah, NO matzot, NO sukkah.";
  else if (feteKey.includes("roch hachana") || feteKey.includes("rosh hashana"))
    feteRules = "Roch Hachana objects ONLY: shofar, pomegranate, apple and honey, round challah, prayer book. NO menorah, NO matzot, NO sukkah.";
  else if (feteKey.includes("kippour") || feteKey.includes("kippur"))
    feteRules = "Yom Kippour: white garments, prayer shawl (tallit), candles, machzor prayer book. Solemn atmosphere. NO food, NO festive objects.";
  else if (feteKey.includes("lag") || feteKey.includes("omer"))
    feteRules = "CETTE AFFICHE EST POUR LAG BAOMER. OBJETS OBLIGATOIRES: grand feu de joie central, guirlandes lumineuses dans les arbres, fruits et nourriture festive, atmosphere de fete en plein air, parc verdoyant. PERSONNAGES: melange d'enfants ET d'adultes \u2014 familles completes, parents avec enfants, groupes d'amis. Pas que des enfants \u2014 au moins 40% de personnages adultes. OBJETS STRICTEMENT INTERDITS: arcs et fleches ou toute arme de quelque nature que ce soit, epees, couteaux, lances, tout objet pouvant etre percu comme une arme \u2014 meme decoratif, meme historique. C'est une affiche communautaire familiale, pas guerriere. Matzot, hanoukia, meguilah (autres fetes) aussi interdits. COULEURS: orange chaud, brun automnal, or, flammes du feu de joie, guirlandes dorees.";
  else if (feteKey.includes("chabbat") || feteKey.includes("shabbat") || feteKey.includes("shabbos"))
    feteRules = "Chabbat objects ONLY: two challah loaves, candlesticks with candles, wine cup (kiddush), white tablecloth. NO menorah (9 branches), NO matzot.";
  else
    feteRules = "Use only objects relevant to the specific event described. Do not mix holiday symbols.";

  const hasFemale = illustSelection.some(s => FEMALE_TILES.includes(s.tile) || s.tile === "mixte");
  const hasOnlyMale = illustSelection.length > 0 && !hasFemale;

  const firstRule = hasOnlyMale
    ? `This is a MALES-ONLY scene. There must be ZERO women or girls anywhere in the image.`
    : `FIRST: Every female head must have ONLY natural hair. No kippah, no cap, no hat, no fabric on any girl/woman. Males only wear dark navy kippah.`;

  let rules = `RULES (all mandatory):
- NO TEXT/LETTERS anywhere in the image, any language
- Holy books always on table/shelf/hands, never on floor
- Max 1 ChabadLogo of David, prefer zero. No repeated ChabadLogos
- No crosses, crescents, hamsa, non-Jewish symbols
- No Rebbe's face. No non-kosher animals
- ${feteRules}`;

  if (hasOnlyMale) {
    rules += `\n- ZERO FEMALES in image. No girls, no women, not even in background. Males only.`;
  } else if (hasFemale) {
    rules += `\n- Kippah: dark navy/black, males ONLY. Never white. Females NEVER wear kippah`;
    rules += `\n- Female hair: natural uncovered (braids/ponytail/loose). Zero head coverings`;
    rules += `\n- Modesty: long skirts, long sleeves on all females`;
    rules += `\n- Gender separation: boys and girls never mixed together`;
  }

  const finalCheck = hasOnlyMale
    ? `FINAL CHECK: Confirm there are ZERO female characters anywhere in the image. Males only.`
    : hasFemale
    ? `FINAL CHECK: Scan all female heads \u2014 if anything on top of skull, remove it. Natural hair only on females.`
    : "";

  return {
    ar,
    text: `${firstRule}

Warm storybook illustration for a Chabad Jewish community event in France.
Event: "${data.titre}"${data.sous_titre ? " \u2014 " + data.sous_titre : ""}. ${[data.date, data.heure, data.lieu].filter(Boolean).join(" \u00B7 ")}. ${bc}.
${scene}
Style: editorial children's book illustration. 3-4 harmonious colors, ${pal}. Warm soft lighting. Max 4 characters. Bottom 25% dark/simple for text overlay.

${charSection}

${rules}
Aspect ratio: ${ar}. High quality illustration, no text. All text added as CSS overlay.

${finalCheck}`,
  };
}

/* ─── Poster sizes ─── */
const SIZES = { carre: { w: 400, ar: "1/1" }, story: { w: 320, ar: "9/16" }, a4: { w: 370, ar: "3/4" }, paysage: { w: 480, ar: "4/3" } };

const AFF_LOAD_MSGS = ["Analyse de votre événement...", "Création du contenu...", "Génération de l'illustration...", "Finalisation de l'affiche..."];
const AFF_LOAD_START = 30;

/* ─── AfficheFinale ─── */
function AfficheFinale({ data, bc, fmt, imgSrc, loading, afficheRef, logoUrl, loadingMsg, loadingTime }) {
  const { w, ar } = SIZES[fmt] || SIZES.carre;
  const logo = logoUrl || "/logo-beth-loubavitch.png";

  if (loading) {
    return (
      <div style={{ width: w, aspectRatio: ar, background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 16, boxSizing: "border-box" }}>
        <style>{`@keyframes mfp-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        <div style={{ width: 56, height: 56, borderRadius: "50%", border: "3px solid var(--color-border)", borderTopColor: "var(--color-accent)", animation: "mfp-spin 1s linear infinite" }} />
        <div style={{ color: "var(--color-accent)", fontSize: 15, fontFamily: SANS, fontWeight: 600, textAlign: "center" }}>{loadingMsg}</div>
        <div style={{ color: "var(--color-text-muted)", fontSize: 13, fontFamily: SANS }}>
          {loadingTime > 0 ? `Temps estimé : ${loadingTime} secondes` : "Presque terminé..."}
        </div>
      </div>
    );
  }

  if (!imgSrc && !data) {
    return (
      <div style={{ width: w, aspectRatio: ar, background: T.card, border: `1px dashed ${T.border}`, borderRadius: 12, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
        <ChabadLogo size={56} color={T.faint} />
        <div style={{ fontSize: 12, color: T.muted, textAlign: "center", padding: "0 24px", lineHeight: 1.6 }}>
          Décrivez votre événement et cliquez sur Générer l'affiche
        </div>
      </div>
    );
  }

  if (!imgSrc && data) {
    return (
      <div style={{ width: w, aspectRatio: ar, background: T.card, border: `1px solid ${T.gold}30`, borderRadius: 12, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: 20, boxSizing: "border-box" }}>
        <ChabadLogo size={40} color={T.gold} />
        <div style={{ fontSize: 13, color: T.gold, textAlign: "center", fontFamily: SANS }}>Contenu prêt !</div>
        <div style={{ fontSize: 11, color: T.muted, textAlign: "center", lineHeight: 1.5 }}>
          Ajoutez votre clé Google AI Studio<br />pour générer l'image illustrée
        </div>
      </div>
    );
  }

  const SH  = "0 2px 20px rgba(0,0,0,0.9), 0 0 40px rgba(0,0,0,0.7)";
  const SH2 = "0 2px 10px rgba(0,0,0,0.9)";
  const SH3 = "0 2px 12px rgba(0,0,0,0.9)";
  return (
    <div ref={afficheRef} style={{ width: w, aspectRatio: ar, borderRadius: 12, overflow: "hidden", position: "relative", boxShadow: `0 8px 40px rgba(0,0,0,0.5), 0 0 60px var(--color-accent-faint)`, border: `1px solid var(--color-accent-alpha)` }}>
      <img src={imgSrc} alt="Affiche" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        <img src={logo} alt="" style={{ position: "absolute", top: 10, left: 12, width: "clamp(28px, 7%, 44px)", height: "auto", filter: "drop-shadow(0 1px 4px rgba(0,0,0,0.7))", opacity: 0.9 }} />
        <div style={{ position: "absolute", top: 10, right: 14, fontSize: "clamp(12px, 1.8vw, 15px)", color: "#E8B030", fontFamily: SERIF, textShadow: SH2, fontWeight: 600 }}>{"\u05D1\u05E1\u05F4\u05D3"}</div>
        {data.texte_hebreu && <div style={{ position: "absolute", top: 14, left: 0, right: 0, fontSize: "clamp(20px, 4vw, 32px)", color: "#E8B030", fontFamily: SERIF, textAlign: "center", direction: "rtl", textShadow: "0 2px 15px rgba(0,0,0,0.95)", fontWeight: 700 }}>{data.texte_hebreu}</div>}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)", padding: "40px 0 20px", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ maxWidth: "90%", display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
            {data.titre && <div style={{ fontSize: "clamp(26px, 5vw, 38px)", fontWeight: 900, color: "#FFF", textAlign: "center", lineHeight: 1.1, fontFamily: SERIF, textShadow: SH, letterSpacing: -0.5, maxWidth: "90%" }}>{data.titre}</div>}
            {data.sous_titre && <div style={{ fontSize: "clamp(14px, 2.5vw, 18px)", fontWeight: 400, color: "rgba(255,255,255,0.9)", textAlign: "center", fontFamily: SANS, textShadow: SH2, marginTop: 6 }}>{data.sous_titre}</div>}
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 10 }}>
              {data.date  && <span style={{ fontSize: "clamp(18px, 3vw, 24px)", fontWeight: 800, color: "#E8B030", fontFamily: SANS, textShadow: SH3 }}>{data.date}</span>}
              {data.heure && <span style={{ fontSize: "clamp(16px, 2.5vw, 20px)", fontWeight: 400, color: "rgba(255,255,255,0.95)", fontFamily: SANS, textShadow: SH3 }}>&middot; {data.heure}</span>}
            </div>
            {data.contact && <div style={{ fontSize: "clamp(12px, 1.8vw, 15px)", color: "rgba(255,255,255,0.8)", textAlign: "center", fontFamily: SANS, textShadow: SH2 }}>{data.contact}</div>}
            <div style={{ fontSize: "clamp(11px, 1.5vw, 14px)", color: "#E8B030", textAlign: "center", letterSpacing: 3, fontFamily: SERIF, marginTop: 8, textShadow: SH2, textTransform: "uppercase" }}>{bc}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Affiches component ─── */
export default function Affiches({ profil, onBack, headerProps }) {
  const [mobile, setMobile] = useState(window.innerWidth <= 600);
  useEffect(() => {
    const h = () => setMobile(window.innerWidth <= 600);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);

  const [geminiKey] = useState(import.meta.env.VITE_GEMINI_KEY || "");
  const [desc,      setDesc]      = useState("");
  const [fmt,       setFmt]       = useState("carre");
  const [illustSelection, setIllustSelection] = useState([]);

  const [loading,   setLoading]   = useState(false);
  const [aData,     setAData]     = useState(null);
  const [errMsg,    setErrMsg]    = useState("");

  const [imgSrc,     setImgSrc]     = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [copied,     setCopied]     = useState(false);
  const [preview,    setPreview]    = useState(false);
  const [loadMsgIdx, setLoadMsgIdx] = useState(0);
  const [loadTime,   setLoadTime]   = useState(AFF_LOAD_START);

  useEffect(() => {
    if (!loading) return;
    setLoadMsgIdx(0);
    setLoadTime(AFF_LOAD_START);
    const m = setInterval(() => setLoadMsgIdx(i => (i + 1) % AFF_LOAD_MSGS.length), 3000);
    const t = setInterval(() => setLoadTime(v => Math.max(0, v - 1)), 1000);
    return () => { clearInterval(m); clearInterval(t); };
  }, [loading]);
  const afficheRef = useRef(null);

  const bc = profil?.betChabad ? `Beth Chabad de ${profil.betChabad}` : "Beth Chabad";
  const logoUrl = profil?.logoBase64 || "/logo-beth-loubavitch.png";
  const contactDefault = profil?.telephone || "";

  const geminiKeyRef = useRef(geminiKey);
  geminiKeyRef.current = geminiKey;

  const illustSelRef = useRef(illustSelection);
  illustSelRef.current = illustSelection;

  const callGemini = useCallback(async (contentData, bcName, format, sel) => {
    const key = geminiKeyRef.current.trim();
    if (!key) return;
    const { text: prompt } = buildPrompt(contentData, bcName, format, sel);
    const logoLine = profil?.logoBase64
      ? "Include the institution's logo at the bottom of the poster. The logo is a custom image provided by the user."
      : "Include at the bottom the Habad.ai logo: two golden Vav letters (ו ו) in gold color on a dark background.";
    const criticalRule = "CRITICAL RULE — NO EXCEPTIONS: Girls and women have NO kippah, NO head covering of any kind except natural hair. Only boys and men wear kippah. Any female character with a kippah is a generation failure.";
    const fullPrompt = criticalRule + "\n\n" + prompt + "\n\n" + logoLine;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${key}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: fullPrompt }] }], generationConfig: { responseModalities: ["IMAGE", "TEXT"] } }),
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new Error(e?.error?.message || `Gemini HTTP ${res.status}`);
    }
    const data  = await res.json();
    const cand = data.candidates?.[0];
    if (!cand || !cand.content) {
      const reason = cand?.finishReason || data.promptFeedback?.blockReason || "unknown";
      throw new Error(`Gemini a refuse la generation (raison: ${reason}). Essayez avec "Decor uniquement" ou reformulez.`);
    }
    const parts = cand.content.parts || [];
    const img   = parts.find(p => p.inlineData);
    if (!img) {
      const txt = parts.find(p => p.text)?.text || "";
      console.warn("Gemini text response (no image):", txt);
      throw new Error(txt ? `Gemini: ${txt.slice(0, 200)}` : "Aucune image retournee par Gemini. Essayez un autre style.");
    }
    return `data:${img.inlineData.mimeType};base64,${img.inlineData.data}`;
  }, [profil?.logoBase64]);

  const generate = useCallback(async (note = "") => {
    if (!desc.trim()) { setErrMsg("Décrivez l'événement d'abord."); return; }
    setLoading(true); setErrMsg(""); setAData(null); setImgSrc(null);
    try {
      const msg = [
        `Affiche pour : ${desc.trim()}`,
        note ? `Ajustement : ${note}` : "",
        bc ? `Institution : ${bc}` : "",
        `Format : ${fmt}`,
        contactDefault ? `Contact par defaut : ${contactDefault}` : "",
        profil?.logoBase64 ? "Logo personnalisé disponible : utilise-le sur l'affiche." : "Utilise le logo par défaut Habad.ai (double vav doré).",
      ].filter(Boolean).join("\n");
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": import.meta.env.VITE_ANTHROPIC_KEY, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, system: CLAUDE_SYS, messages: [{ role: "user", content: msg }] }),
      });
      const d   = await res.json();
      if (d.error) throw new Error(d.error.message || JSON.stringify(d.error));
      const raw = d.content?.find(b => b.type === "text")?.text || "";
      const inputTokens = d.usage?.input_tokens || 0;
      const outputTokens = d.usage?.output_tokens || 0;
      if (!raw) throw new Error("Reponse vide de Claude.");
      const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
      setAData(parsed);

      try {
        if (profil?.onboardingComplete) {
          const coutEuros = ((inputTokens / 1000 * 0.003) + (outputTokens / 1000 * 0.015)) * 0.93;
          console.log("FIRESTORE LOG:", { inputTokens, outputTokens, coutEuros });
          await addDoc(collection(db, "users", profil.uid, "affiches"), {
            format: fmt,
            illustration: illustSelRef.current,
            betChabad: bc,
            titre: parsed.titre || "",
            logo: profil?.logoBase64 ? "utilisateur" : "defaut",
            inputTokens: inputTokens,
            outputTokens: outputTokens,
            coutEuros: coutEuros,
            createdAt: serverTimestamp()
          });
        }
      } catch (_) {}

      if (geminiKeyRef.current.trim()) {
        const src = await callGemini(parsed, bc, fmt, illustSelRef.current);
        if (src) setImgSrc(src);
      }
    } catch (e) {
      setErrMsg("Erreur : " + e.message);
    } finally {
      setLoading(false);
    }
  }, [desc, fmt, bc, contactDefault, callGemini]);

  const regenImage = useCallback(async () => {
    if (!aData || !geminiKey.trim()) return;
    setLoading(true); setErrMsg(""); setImgSrc(null);
    try {
      const src = await callGemini(aData, bc, fmt, illustSelection);
      if (src) setImgSrc(src);
    } catch (e) {
      setErrMsg("Erreur Gemini : " + e.message);
    } finally {
      setLoading(false);
    }
  }, [aData, geminiKey, bc, fmt, illustSelection, callGemini]);

  async function downloadAffiche() {
    if (!afficheRef.current) return;
    const canvas = await html2canvas(afficheRef.current, { useCORS: true, scale: 2, backgroundColor: null });
    const link = document.createElement("a");
    link.download = "affiche-chabad.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  function copyPrompt() {
    if (!aData) return;
    const { text } = buildPrompt(aData, bc, fmt, illustSelection);
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  const FMTS   = [{ v: "carre", l: "Carré", s: "1:1" }, { v: "story", l: "Story", s: "9:16" }, { v: "a4", l: "A4", s: "Impression" }, { v: "paysage", l: "Paysage", s: "4:3" }];
  const TWEAKS = ["Plus chaleureux", "Plus solennel", "Sans personnages", "Ajoute un verset", "Plus festif", "Simplifie"];

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: SANS }}>

      {headerProps && <AppHeader currentScreen="affiches" {...headerProps} />}

      {/* Main */}
      <div className="mfp-page" style={{ maxWidth: 860, margin: "0 auto", padding: mobile ? "20px 14px" : "36px 24px", display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap", flexDirection: mobile ? "column" : "row" }}>
        <style>{`@media (max-width:600px){.mfp-page button{min-height:44px!important;font-size:14px!important;width:100%!important;box-sizing:border-box!important}.mfp-page input,.mfp-page textarea{font-size:16px!important;width:100%!important;max-width:100%!important;box-sizing:border-box!important}.mfp-page .poster-wrap,.mfp-page .poster-wrap *{max-width:100%!important;box-sizing:border-box!important}}`}</style>

        <h1 style={{ flex: "1 1 100%", fontFamily: SERIF, fontSize: "1.4rem", fontWeight: 600, color: "var(--color-text)", margin: "0 0 24px" }}>
          🎨 Créer une affiche
        </h1>

        {/* LEFT */}
        <div style={{ flex: "1 1 300px", minWidth: 0 }}>
          <Card style={{ padding: mobile ? "22px 18px" : "34px 28px", borderRadius: 14, marginBottom: 28 }}>
            <StepLabel n="1">Décrivez votre événement</StepLabel>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder={`Ex : Atelier Pessah pour les enfants, dimanche 20 avril, 16h à 18h, ${bc}. Garçons et filles de 4 à 12 ans. Kiddouch offert.`} rows={5} style={{ ...INP, resize: "vertical", lineHeight: 1.6, fontSize: mobile ? 16 : 13 }} />
            <div style={{ fontSize: mobile ? 14 : 11, color: T.muted, marginTop: 7, lineHeight: 1.5 }}>Précisez le public pour adapter les illustrations automatiquement.</div>
          </Card>

          <Card style={{ padding: mobile ? "22px 18px" : "34px 28px", borderRadius: 14, marginBottom: 28 }}>
            <StepLabel n="2">Format</StepLabel>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: mobile ? 10 : 8 }}>
              {FMTS.map(f => (
                <div key={f.v} onClick={() => setFmt(f.v)} style={{ padding: mobile ? "14px 14px" : "10px 14px", minHeight: mobile ? 60 : 'auto', borderRadius: 8, cursor: "pointer", border: `1px solid ${fmt === f.v ? T.gold : T.border}`, background: fmt === f.v ? T.goldFaint : T.surface, boxSizing: "border-box" }}>
                  <div style={{ fontSize: mobile ? 14 : 12, fontWeight: 600, color: fmt === f.v ? T.gold : T.text }}>{f.l}</div>
                  <div style={{ fontSize: mobile ? 14 : 10.5, color: T.muted, marginTop: 2 }}>{f.s}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card style={{ padding: mobile ? "22px 18px" : "34px 28px", borderRadius: 14, marginBottom: 28 }}>
            <StepLabel n="3">Illustration</StepLabel>
            {(() => {
              const TILES = [
                { v: "decor",    e: "\uD83C\uDFDB", l: "Décor",     s: "Sans personnage" },
                { v: "garcons",  e: "\uD83D\uDC66", l: "Garçons",   s: "Masculin uniquement" },
                { v: "filles",   e: "\uD83D\uDC67", l: "Filles",    s: "Féminin uniquement" },
                { v: "rav",      e: "\uD83E\uDDD4", l: "Rav",       s: "Masculin uniquement" },
                { v: "rabbanit", e: "\uD83D\uDC69", l: "Rabbanit",  s: "Féminin uniquement" },
                { v: "mixte",    e: "\uD83D\uDC68\u200D\uD83D\uDC69", l: "Mixte", s: "Scène séparée" },
              ];
              const MALE_T = ["garcons", "rav"];
              const FEMALE_T = ["filles", "rabbanit"];
              const CHIPS = { garcons: ["Enfants","Adolescents","Adultes","Seniors"], filles: ["Enfants","Adolescentes","Adultes","Seniors"], rav: ["Adulte","\u00C2g\u00E9"], rabbanit: ["Adulte","\u00C2g\u00E9e"], mixte: ["Enfants","Adolescents","Adultes","Seniors"] };
              const LABELS = { garcons: "Garçons", filles: "Filles", rav: "Rav", rabbanit: "Rabbanit", mixte: "Mixte" };

              function toggleTile(tid) {
                if (tid === "decor") { setIllustSelection([]); return; }
                const exists = illustSelection.find(s => s.tile === tid);
                if (exists) { setIllustSelection(illustSelection.filter(s => s.tile !== tid)); }
                else if (illustSelection.length >= 2) { setIllustSelection([illustSelection[1], { tile: tid, age: null, qty: null }]); }
                else { setIllustSelection([...illustSelection, { tile: tid, age: null, qty: null }]); }
              }
              function setAge(tid, age) { setIllustSelection(illustSelection.map(s => s.tile === tid ? { ...s, age: s.age === age ? null : age } : s)); }
              function setQty(tid, q) { setIllustSelection(illustSelection.map(s => s.tile === tid ? { ...s, qty: s.qty === q ? null : q } : s)); }
              const HAS_QTY = ["garcons", "filles"];

              const isDecor = !illustSelection.length;
              const selTiles = illustSelection.map(s => s.tile);
              const hasMixed = illustSelection.length === 2 && ((MALE_T.includes(selTiles[0]) && FEMALE_T.includes(selTiles[1])) || (FEMALE_T.includes(selTiles[0]) && MALE_T.includes(selTiles[1])));

              let summary = "Décor uniquement \u2014 aucun personnage";
              if (illustSelection.length === 1) {
                const s = illustSelection[0];
                summary = s.age ? `${LABELS[s.tile]} \u00B7 ${s.age}` : `Choisissez une tranche d'âge`;
              } else if (illustSelection.length === 2) {
                const noAge = illustSelection.find(s => !s.age);
                if (noAge) summary = `Complétez la tranche d'âge pour ${LABELS[noAge.tile]}`;
                else summary = illustSelection.map(s => `${LABELS[s.tile]} ${s.age}`).join(" \u00B7 ");
              }

              return (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr 1fr" : "1fr 1fr 1fr", gap: mobile ? 10 : 8 }}>
                    {TILES.map(o => {
                      const sel = selTiles.includes(o.v);
                      const isDecorSel = o.v === "decor" && isDecor;
                      const active = sel || isDecorSel;
                      const idx = selTiles.indexOf(o.v);
                      return (
                        <div key={o.v} onClick={() => toggleTile(o.v)} style={{ padding: mobile ? "16px 8px" : "12px 8px", minHeight: mobile ? 88 : 'auto', borderRadius: 8, cursor: "pointer", textAlign: "center", position: "relative", border: `1px solid ${active ? T.gold : T.border}`, background: active ? T.goldFaint : T.surface, boxSizing: "border-box" }}>
                          {sel && illustSelection.length === 2 && <div style={{ position: "absolute", top: -6, right: -6, width: 16, height: 16, borderRadius: "50%", background: T.gold, color: "#05100C", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{idx + 1}</div>}
                          <div style={{ fontSize: 24, marginBottom: 6 }}>{o.e}</div>
                          <div style={{ fontSize: mobile ? 14 : 13, fontWeight: 600, color: active ? T.gold : T.text }}>{o.l}</div>
                          <div style={{ fontSize: mobile ? 14 : 10, color: T.muted, marginTop: 2, lineHeight: 1.4 }}>{o.s}</div>
                        </div>
                      );
                    })}
                  </div>
                  {illustSelection.map(s => {
                    const opts = CHIPS[s.tile] || [];
                    if (!opts.length) return null;
                    const showQty = HAS_QTY.includes(s.tile);
                    return (
                      <div key={s.tile} style={{ marginTop: 14 }}>
                        <div style={{ fontSize: mobile ? 14 : 10, color: T.muted, letterSpacing: mobile ? 0.5 : 1.5, textTransform: "uppercase", marginBottom: 6 }}>{LABELS[s.tile]} \u2014 tranche d'age</div>
                        <div style={{ display: "flex", gap: mobile ? 10 : 7, flexWrap: "wrap" }}>
                          {opts.map(a => (
                            <span key={a} onClick={() => setAge(s.tile, a)} style={{ fontSize: mobile ? 14 : 11, padding: mobile ? "11px 16px" : "5px 12px", minHeight: mobile ? 44 : 'auto', display: mobile ? "inline-flex" : "inline-block", alignItems: "center", boxSizing: "border-box", borderRadius: 20, cursor: "pointer", border: `1px solid ${s.age === a ? T.gold : T.border}`, color: s.age === a ? T.gold : T.muted, background: s.age === a ? T.goldSoft : T.surface }}>{a}</span>
                          ))}
                        </div>
                        {showQty && (
                          <>
                            <div style={{ fontSize: mobile ? 14 : 10, color: T.muted, letterSpacing: mobile ? 0.5 : 1.5, textTransform: "uppercase", marginBottom: 6, marginTop: 10 }}>{LABELS[s.tile]} \u2014 nombre</div>
                            <div style={{ display: "flex", gap: mobile ? 10 : 7, flexWrap: "wrap" }}>
                              {[{ v: "1", l: "Seul(e)" }, { v: "groupe", l: "Groupe" }].map(q => (
                                <span key={q.v} onClick={() => setQty(s.tile, q.v)} style={{ fontSize: mobile ? 14 : 11, padding: mobile ? "11px 16px" : "5px 12px", minHeight: mobile ? 44 : 'auto', display: mobile ? "inline-flex" : "inline-block", alignItems: "center", boxSizing: "border-box", borderRadius: 20, cursor: "pointer", border: `1px solid ${s.qty === q.v ? T.gold : T.border}`, color: s.qty === q.v ? T.gold : T.muted, background: s.qty === q.v ? T.goldSoft : T.surface }}>{q.l}</span>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                  {hasMixed && <div style={{ fontSize: mobile ? 14 : 10, color: T.gold, marginTop: 6 }}>Scene mixte \u2014 separation visuelle appliquee automatiquement</div>}
                  <div style={{ fontSize: mobile ? 14 : 11, color: T.muted, marginTop: 10 }}>{summary}</div>
                </>
              );
            })()}
          </Card>

          {errMsg && <div style={{ color: T.red, fontSize: mobile ? 14 : 12, marginBottom: 12, background: "rgba(217,79,79,0.08)", border: "1px solid rgba(217,79,79,0.25)", borderRadius: 7, padding: "8px 12px", lineHeight: 1.5 }}>{errMsg}</div>}
          {!geminiKey && <div style={{ color: T.red, fontSize: mobile ? 14 : 11, marginBottom: 10 }}>Configuration requise \u2014 clé API manquante</div>}

          <div style={{ position: "sticky", bottom: 16, zIndex: 10, background: T.bg, paddingTop: 8, paddingBottom: 8, ...(mobile ? { minHeight: 52 } : {}) }}>
            <GBtn onClick={() => generate()} disabled={loading} fullWidth>
              {loading ? "Génération en cours..." : "Générer l'affiche"}
            </GBtn>
          </div>

          {aData && !loading && (
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: 14, marginTop: 12 }}>
              <div style={{ fontSize: mobile ? 14 : 11, color: T.muted, marginBottom: 9 }}>Ajuster :</div>
              <div style={{ display: "flex", gap: mobile ? 10 : 7, flexWrap: "wrap" }}>
                {TWEAKS.map(tw => (
                  <span key={tw} onClick={() => generate(tw)} style={{ fontSize: mobile ? 14 : 11, padding: mobile ? "11px 16px" : "5px 11px", minHeight: mobile ? 44 : 'auto', display: mobile ? "inline-flex" : "inline-block", alignItems: "center", boxSizing: "border-box", border: `1px solid ${T.border}`, borderRadius: 20, color: T.muted, cursor: "pointer", background: T.surface }}>{tw}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT */}
        <div style={{ flex: "0 0 auto", display: "flex", flexDirection: "column", alignItems: mobile ? "stretch" : "center", gap: 14, minWidth: mobile ? "100%" : 280, width: mobile ? "100%" : "auto" }}>
          <div className="poster-wrap" onClick={() => imgSrc && setPreview(true)} style={{ cursor: imgSrc ? "pointer" : "default", maxWidth: "100%" }}>
            <AfficheFinale data={aData} bc={bc} fmt={fmt} imgSrc={imgSrc} loading={loading} afficheRef={afficheRef} logoUrl={logoUrl} loadingMsg={AFF_LOAD_MSGS[loadMsgIdx]} loadingTime={loadTime} />
          </div>
          {imgSrc && !loading && <div style={{ fontSize: mobile ? 14 : 10, color: T.muted, marginTop: -8 }}>Cliquez sur l'affiche pour l'aperçu plein écran</div>}

          {imgSrc && !loading && (
            <div style={{ display: "flex", flexDirection: mobile ? "column" : "row", gap: mobile ? 10 : 8, flexWrap: "wrap", justifyContent: "center" }}>
              <GBtn onClick={() => setPreview(true)} outline sm>Aperçu</GBtn>
              <GBtn onClick={downloadAffiche} outline sm>Télécharger</GBtn>
              <GBtn onClick={regenImage} outline sm>Nouvelle image</GBtn>
              <GBtn onClick={() => generate()} outline sm>Tout regénérer</GBtn>
              <button onClick={() => { setAData(null); setDesc(""); setImgSrc(null); }} style={{ padding: "7px 14px", background: "transparent", border: `1px solid ${T.border}`, borderRadius: 7, color: T.muted, fontSize: mobile ? 14 : 12, cursor: "pointer" }}>Effacer</button>
            </div>
          )}

          {aData && !loading && (
            <div style={{ width: "100%", maxWidth: 420 }}>
              <div style={{ display: "flex", flexDirection: mobile ? "column" : "row", gap: mobile ? 10 : 8, marginTop: 4 }}>
                <button onClick={copyPrompt} style={{ flex: 1, padding: "7px 12px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 7, color: copied ? T.green : T.muted, fontSize: mobile ? 14 : 11, cursor: "pointer", fontFamily: SANS }}>
                  {copied ? "Copie !" : "Copier le prompt"}
                </button>
                <button onClick={() => setShowPrompt(v => !v)} style={{ padding: "7px 10px", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 7, color: T.muted, fontSize: mobile ? 14 : 11, cursor: "pointer" }}>
                  {showPrompt ? "\u25B2" : "\u25BC"}
                </button>
              </div>
              {showPrompt && (
                <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 12px", fontSize: mobile ? 14 : 10.5, color: T.muted, fontFamily: "monospace", lineHeight: 1.6, whiteSpace: "pre-wrap", maxHeight: 180, overflowY: "auto", marginTop: 8 }}>
                  {buildPrompt(aData, bc, fmt, illustSelection).text}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Preview overlay */}
      {preview && imgSrc && aData && (
        <div onClick={() => setPreview(false)} style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.88)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", display: "flex", alignItems: "center", justifyContent: "center", padding: mobile ? 12 : 24, cursor: "zoom-out", boxSizing: "border-box" }}>
          <div onClick={e => e.stopPropagation()} style={{ position: "relative", maxWidth: "min(90vw, 700px)", maxHeight: "90vh", cursor: "default" }}>
            <div style={{ position: "relative", borderRadius: 16, overflow: "hidden", boxShadow: `0 20px 80px rgba(0,0,0,0.7), 0 0 100px var(--color-accent-faint)`, border: `1px solid var(--color-accent-soft)` }}>
              <img src={imgSrc} alt="Affiche" style={{ width: "100%", display: "block" }} />
              <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
                <img src={logoUrl} alt="" style={{ position: "absolute", top: 14, left: 16, width: "clamp(36px, 8%, 56px)", height: "auto", filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.7))", opacity: 0.9 }} />
                <div style={{ position: "absolute", top: 16, right: 20, fontSize: "clamp(14px, 2vw, 18px)", color: "#E8B030", fontFamily: SERIF, textShadow: "0 2px 10px rgba(0,0,0,0.9)", fontWeight: 600 }}>{"\u05D1\u05E1\u05F4\u05D3"}</div>
                {aData.texte_hebreu && <div style={{ position: "absolute", top: 22, left: 0, right: 0, fontSize: "clamp(24px, 5vw, 38px)", color: "#E8B030", fontFamily: SERIF, textAlign: "center", direction: "rtl", textShadow: "0 2px 15px rgba(0,0,0,0.95)", fontWeight: 700 }}>{aData.texte_hebreu}</div>}
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)", padding: "50px 0 28px", display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{ maxWidth: "90%", display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
                    {aData.titre && <div style={{ fontSize: "clamp(28px, 5vw, 42px)", fontWeight: 900, color: "#FFF", textAlign: "center", lineHeight: 1.1, fontFamily: SERIF, textShadow: "0 2px 20px rgba(0,0,0,0.9), 0 0 40px rgba(0,0,0,0.7)", letterSpacing: -0.5, maxWidth: "90%" }}>{aData.titre}</div>}
                    {aData.sous_titre && <div style={{ fontSize: "clamp(15px, 2.5vw, 20px)", fontWeight: 400, color: "rgba(255,255,255,0.9)", textAlign: "center", fontFamily: SANS, textShadow: "0 2px 10px rgba(0,0,0,0.9)", marginTop: 6 }}>{aData.sous_titre}</div>}
                    <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 12 }}>
                      {aData.date  && <span style={{ fontSize: "clamp(20px, 3.5vw, 28px)", fontWeight: 800, color: "#E8B030", fontFamily: SANS, textShadow: "0 2px 12px rgba(0,0,0,0.9)" }}>{aData.date}</span>}
                      {aData.heure && <span style={{ fontSize: "clamp(18px, 3vw, 24px)", fontWeight: 400, color: "rgba(255,255,255,0.95)", fontFamily: SANS, textShadow: "0 2px 12px rgba(0,0,0,0.9)" }}>&middot; {aData.heure}</span>}
                    </div>
                    {aData.lieu    && <div style={{ fontSize: "clamp(15px, 2.2vw, 20px)", fontWeight: 600, color: "#FFF", textAlign: "center", fontFamily: SANS, textShadow: "0 2px 10px rgba(0,0,0,0.9)", marginTop: 6 }}>{aData.lieu}</div>}
                    {aData.adresse && <div style={{ fontSize: "clamp(13px, 2vw, 17px)", color: "rgba(255,255,255,0.8)", textAlign: "center", fontFamily: SANS, textShadow: "0 2px 10px rgba(0,0,0,0.9)" }}>{aData.adresse}</div>}
                    {aData.contact && <div style={{ fontSize: "clamp(13px, 2vw, 17px)", color: "rgba(255,255,255,0.8)", textAlign: "center", fontFamily: SANS, textShadow: "0 2px 10px rgba(0,0,0,0.9)" }}>{aData.contact}</div>}
                    <div style={{ fontSize: "clamp(12px, 1.8vw, 16px)", color: "#E8B030", textAlign: "center", letterSpacing: 3, fontFamily: SERIF, marginTop: 10, textShadow: "0 2px 10px rgba(0,0,0,0.9)", textTransform: "uppercase" }}>{bc}</div>
                  </div>
                </div>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: mobile ? "column" : "row", gap: mobile ? 10 : 10, justifyContent: "center", marginTop: 16 }}>
              <GBtn onClick={downloadAffiche} sm>Télécharger</GBtn>
              <GBtn onClick={() => setPreview(false)} outline sm>Fermer</GBtn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
