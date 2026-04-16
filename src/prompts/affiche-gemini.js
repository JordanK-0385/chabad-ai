/* ─── affiche-gemini.js ─── Prompt fragments sent to Gemini for affiche image generation ─── */

export const CRITICAL_RULE = `ABSOLUTE RULES — ZERO EXCEPTIONS:
HEAD COVERINGS: Males (boys/men/teens) → dark navy or black kippah ONLY, never white. Females (girls/women/teens) → ZERO head covering, natural hair only (braids, ponytail, loose). One female with a kippah = total generation failure.
MODESTY: All females → long dress or skirt below knee, long sleeves, closed neckline. No exceptions.
MIXED SCENES: Identify each character's gender individually. Do NOT apply kippah to a character because nearby characters wear one.`;

export function buildLogoLine(hasCustomLogo) {
  return hasCustomLogo
    ? "Include the institution's logo at the bottom of the poster. The logo is a custom image provided by the user."
    : "Include at the bottom the Habad.ai logo: two golden Vav letters (ו ו) in gold color on a dark background.";
}

export function buildPrompt(data, bc, fmt, illustSelection) {
  const { titre, sous_titre, date, heure, lieu, accroche, ambiance } = data;
  const ar = fmt === "story" ? "9:16" : fmt === "a4" ? "3:4" : fmt === "paysage" ? "4:3" : "1:1";
  const issolemn = ambiance === "solennelle";
  const pal = issolemn ? "dark burgundy and charcoal, dignified atmosphere" : "deep Chabad blue #003087 and warm gold #C9971A, festive warm atmosphere";

  const hasFemale = illustSelection?.some(t => ["filles","rabbanit","mixte"].includes(t?.tile));
  const maleOnly = illustSelection?.every(t => ["garcons","rav"].includes(t?.tile)) && illustSelection?.length > 0;

  // Scene description per tile
  function descTile(tile, age, qty) {
    const ageStr = age && age !== "Adulte" ? `, ${age}` : "";
    const qtyStr = (qty === "groupe" || qty > 1) ? "group of 2-4" : "single";
    const tiles = {
      garcons: qty === "groupe" || qty > 1
        ? `Jewish Chabad boys (${qtyStr}${ageStr}). Dark navy or black suede kippah, NEVER white. White shirt, visible tzitzit at waist, long dark trousers.`
        : `A single Jewish Chabad boy${ageStr}. Dark navy or black suede kippah, NEVER white. White shirt, visible tzitzit at waist, long dark trousers. Only ONE boy, no other characters.`,
      filles: qty === "groupe" || qty > 1
        ? `Girls (${qtyStr}${ageStr}) with natural hair — braids, ponytails or loose. Every single girl has a completely bare head with nothing on it. Long modest dresses below knee, long sleeves. Warm friendly faces.`
        : `A young girl${ageStr} with natural ${qty === "groupe" || qty > 1 ? "hair" : "hair in braids or ponytail"}. She has absolutely nothing on her head — no hat, no cap, no kippah, no fabric, no accessory on top of skull. Long modest dress below knee, long sleeves. Warm friendly face. Only ONE girl, no other characters.`,
      rav: `A single Chabad Rabbi${ageStr}. Full beard, classic black fedora hat, dark suit jacket, white shirt, visible tzitzit. Wise and warm expression. The black fedora is essential.`,
      rabbanit: `An elegant woman${ageStr} with natural styled hair — bun, updo or loose. Completely bare head, nothing on top of skull. Modest dress below knee, long sleeves, closed neckline. Warm gracious expression.`,
      mixte: `A family scene${ageStr}.
Father: bearded man with dark navy kippah, dark suit, white shirt, tzitzit strings at waist.
Son/boy: dark navy kippah, white shirt, dark trousers.
Mother: woman with natural hair in bun or loose style, NOTHING on her head, elegant modest dress below knee, long sleeves.
Daughter/girl: natural hair in braids or ponytail, NOTHING on her head, modest long dress below knee, long sleeves.
The females have zero head coverings of any kind.`,
    };
    return tiles[tile] || "";
  }

  // Character section
  let charSection = "";
  if (!illustSelection || illustSelection.length === 0 || illustSelection.every(t => !t?.tile || t?.tile === "decor")) {
    charSection = `SCENE: NO human characters. Beautiful atmospheric Jewish scene only: warm lighting, Chabad blue and gold palette, relevant objects for the event. Cozy and inviting.`;
  } else if (illustSelection.length === 1) {
    const t = illustSelection[0];
    charSection = `CHARACTER: ${descTile(t.tile, t.age, t.qty)}\nPixar-meets-storybook aesthetic.`;
    if (maleOnly) charSection += `\nABSOLUTELY ZERO women or girls anywhere in the image, not even in background.`;
  } else {
    charSection = `SCENE COMPOSITION: Two distinct groups.\n`;
    illustSelection.forEach((t, i) => {
      charSection += `Group ${i+1}: ${descTile(t.tile, t.age, t.qty)}\n`;
    });
    charSection += `Pixar-meets-storybook aesthetic.`;
    if (maleOnly) charSection += `\nABSOLUTELY ZERO women or girls anywhere, not even in background.`;
  }

  // Holiday-specific objects (all in English)
  const titleLower = (titre || "").toLowerCase() + " " + (accroche || "").toLowerCase();
  let feteRules = `Use only objects relevant to the specific event. Do not mix holiday symbols.`;
  if (/pessah|pessa[hc]|seder|matsa|matzot/i.test(titleLower))
    feteRules = `PESSAH ONLY: matzot, seder plate, wine cups, Haggadah, spring flowers. FORBIDDEN: menorah, shofar, sukkah, lulav.`;
  else if (/hanoukk|hanukkah|chanukah/i.test(titleLower))
    feteRules = `HANUKKAH ONLY: hanukkiah (9-branch menorah), dreidels, sufganiyot donuts, latkes, gelt, oil jug. FORBIDDEN: matzot, shofar, sukkah. Books and siddurim on table or shelf only, never on the floor.`;
  else if (/pourim|purim/i.test(titleLower))
    feteRules = `PURIM ONLY: megillah scroll, mishloah manot baskets, hamantashen cookies, masks, festive costumes. FORBIDDEN: menorah, matzot, shofar.`;
  else if (/souccot|sukkot|soukkot/i.test(titleLower))
    feteRules = `SUKKOT ONLY: sukkah structure, lulav, etrog, schach roof branches, decorations. FORBIDDEN: menorah, matzot.`;
  else if (/chavouot|shavuot/i.test(titleLower))
    feteRules = `SHAVUOT ONLY: Torah scroll, flowers, greenery, dairy foods, Ten Commandments tablets. FORBIDDEN: menorah, matzot, sukkah.`;
  else if (/roch.?hachana|rosh.?hashana/i.test(titleLower))
    feteRules = `ROSH HASHANA ONLY: shofar, pomegranate, apple and honey, round challah, prayer book. FORBIDDEN: menorah, matzot, sukkah.`;
  else if (/kippour|kippur|yom kippour/i.test(titleLower))
    feteRules = `YOM KIPPUR: white garments, tallit prayer shawl, candles, machzor prayer book. Solemn atmosphere. FORBIDDEN: food, festive objects.`;
  else if (/lag.?baomer|lag b'omer/i.test(titleLower))
    feteRules = `LAG BAOMER: large central bonfire, string lights in trees, fruits and festive food, outdoor park setting, families with children AND adults (min 40% adults). FORBIDDEN: bows, arrows, swords, weapons of any kind, matzot, hanukkiah, megillah.`;
  else if (/chabbat|shabbat/i.test(titleLower))
    feteRules = `SHABBAT ONLY: two challah loaves, candlesticks with candles, kiddush wine cup, white tablecloth. FORBIDDEN: 9-branch menorah, matzot.`;

  // Final check
  let finalCheck = "";
  if (maleOnly) finalCheck = `FINAL CHECK: Confirm ZERO female characters anywhere in the image.`;
  else if (hasFemale) finalCheck = `FINAL CHECK: Scan every female head — if anything on top of skull, remove it. Natural hair only on all females.`;

  const eventDetails = [titre, sous_titre, date, heure, lieu, bc].filter(Boolean).join(" · ");

  return `BEFORE GENERATING: Every female character must have zero head covering. Scan each female individually. If you would place a kippah on a female, place natural hair instead.

Warm storybook illustration for a Chabad Jewish community event in France.
Event: ${eventDetails}
Scene hint: "${accroche || sous_titre}"
Style: editorial children's book illustration. ${pal}. Warm soft lighting. Max 4 characters. Bottom 25% kept dark and simple for text overlay.

${charSection}

MANDATORY RULES:
- NO TEXT or letters anywhere in the image (any language)
- Holy books always on table, shelf or in hands — never on the floor
- No Star of David symbol (prefer zero)
- No crosses, crescents, hamsa or non-Jewish symbols
- No Rebbe's face. No non-kosher animals
- ${feteRules}
${maleOnly ? "- ZERO FEMALES in image. No girls, no women, not even in background." : hasFemale ? "- Kippah: dark navy/black on males ONLY. Females: natural hair only, zero head coverings.\n- Modesty: long skirts and long sleeves on all females." : ""}

${finalCheck}
Aspect ratio: ${ar}. High quality illustration. No text in image.`;
}
