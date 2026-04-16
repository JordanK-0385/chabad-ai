/* ─── affiche-gemini.js ─── */

export const CRITICAL_RULE = `ABSOLUTE RULE — NO EXCEPTIONS:
MALES ONLY wear kippah (dark navy or black, never white).
FEMALES have visible natural hair — described in detail below per character type.
MODESTY: All females wear long dress or skirt below knee, long sleeves, closed neckline.`;

export function buildLogoLine(hasCustomLogo) {
  return `IMPORTANT: Do NOT generate, draw, invent or render any logo, icon, emblem, seal, stamp or watermark anywhere in the image. Leave the bottom 20% of the image as a clean dark area with no visual elements — it will be used for text overlay only.`;
}

export function buildPrompt(data, bc, fmt, illustSelection) {
  const { titre, sous_titre, date, heure, lieu, accroche, ambiance } = data;
  const ar = fmt === "story" ? "9:16" : fmt === "a4" ? "3:4" : fmt === "paysage" ? "4:3" : "1:1";
  const issolemn = ambiance === "solennelle";
  const pal = issolemn ? "dark burgundy and charcoal, dignified atmosphere" : "deep Chabad blue #003087 and warm gold #C9971A, festive warm atmosphere";

  const hasFemale = illustSelection?.some(t => ["filles","rabbanit","mixte"].includes(t?.tile));
  const maleOnly = illustSelection?.every(t => ["garcons","rav"].includes(t?.tile)) && illustSelection?.length > 0;

  function getAgeLabel(age) {
    if (!age || age === "Adulte") return "adult";
    if (age === "Enfants") return "young child aged 5-10";
    if (age === "Adolescents") return "teenager aged 12-17";
    if (age === "Seniors") return "elderly person aged 65+";
    return "adult";
  }

  function descTile(tile, age, qty) {
    const ageLabel = getAgeLabel(age);
    const isGroup = qty === "groupe" || qty > 1;

    if (tile === "garcons") {
      return isGroup
        ? `A group of 2-4 Jewish boys (${ageLabel}). Each boy wears a dark navy or black kippah on top of his head. White shirt, tzitzit strings visible at waist, long dark trousers.`
        : `One Jewish boy (${ageLabel}). He wears a dark navy kippah on top of his head. White shirt, tzitzit strings visible at waist, long dark trousers. Only this one boy, no other characters.`;
    }

    if (tile === "filles") {
      const hairDesc = ageLabel.includes("child") ? "two long dark braids hanging freely on both sides of her face, with no accessory, clip, band or covering on top of the skull" :
                       ageLabel.includes("teenager") ? "long hair in a ponytail or loose flowing" :
                       ageLabel.includes("elderly") ? "silver hair in a neat bun" :
                       "long dark hair in a braid or elegant updo";
      const femaleAgeLabel = ageLabel.includes("child") ? "young girl" :
                             ageLabel.includes("teenager") ? "teenage girl" :
                             ageLabel.includes("elderly") ? "elderly woman" :
                             "young woman";
      const femaleAgeLabelPlural = ageLabel.includes("child") ? "young girls" :
                                   ageLabel.includes("teenager") ? "teenage girls" :
                                   ageLabel.includes("elderly") ? "elderly women" :
                                   "young women";
      return isGroup
        ? `A group of ${femaleAgeLabelPlural} with ${hairDesc} worn freely and visibly — none of them wear any hat, cap or head covering. Each girl's hair is parted and braided — the top of every head shows only hair, no bands, no clips, no accessories on top of the skull. They wear long modest dresses below the knee, with long sleeves.`
        : `One ${femaleAgeLabel} with ${hairDesc}. The top of her head shows only hair parted in the middle — no blue band, no clip, no accessory of any kind on the top of the head. Her hair cascades freely and visibly — she wears absolutely no hat, cap or head covering of any kind. She wears a long modest dress reaching below the knee, with long sleeves.`;
    }

    if (tile === "rav") {
      return `One Chabad Rabbi (${ageLabel}). He has a full dark beard and wears a classic wide-brimmed black felt fedora hat. Dark suit jacket, white shirt, tzitzit strings visible. Wise and warm expression.`;
    }

    if (tile === "rabbanit") {
      const hairDesc = ageLabel.includes("elderly") ? "neat silver hair in a bun" : "elegant dark hair styled in a bun or chignon";
      return `One ${ageLabel} woman with ${hairDesc} worn freely and visibly. She wears no hat, cap or head covering. Elegant modest dress below knee, long sleeves, closed neckline. Warm gracious expression.`;
    }

    if (tile === "mixte") {
      return `A warm family scene:
- Father: bearded man, dark navy kippah on his head, dark suit, white shirt, tzitzit strings at waist
- Son/boy: dark navy kippah on his head, white shirt, dark trousers
- Mother: a woman with dark hair in an elegant bun, hair fully visible, wearing an elegant modest dress below knee with long sleeves
- Daughter: a young girl with hair in a braid or ponytail, hair completely visible and free, wearing a modest long dress below knee`;
    }

    return "";
  }

  // Character section
  let charSection = "";
  if (!illustSelection || illustSelection.length === 0 || illustSelection.every(t => !t?.tile || t?.tile === "decor")) {
    charSection = `SCENE: NO human characters at all. Beautiful atmospheric Jewish scene only: warm lighting, Chabad blue and gold palette, relevant objects for the event. Cozy and inviting.`;
  } else if (illustSelection.length === 1) {
    const t = illustSelection[0];
    charSection = `CHARACTER:\n${descTile(t.tile, t.age, t.qty)}\nPixar-meets-storybook illustration style.`;
    if (maleOnly) charSection += `\nZERO women or girls anywhere in the image, including background.`;
  } else {
    charSection = `CHARACTERS — Two groups:\n`;
    illustSelection.forEach((t, i) => {
      charSection += `Group ${i+1}:\n${descTile(t.tile, t.age, t.qty)}\n\n`;
    });
    charSection += `Pixar-meets-storybook illustration style.`;
    if (maleOnly) charSection += `\nZERO women or girls anywhere in the image, including background.`;
  }

  // Holiday-specific objects
  const titleLower = (titre || "").toLowerCase() + " " + (accroche || "").toLowerCase();
  let feteRules = `Use only objects relevant to the specific event. Do not mix holiday symbols.`;
  if (/pessah|pessa[hc]|seder|matsa|matzot/i.test(titleLower))
    feteRules = `PESSAH ONLY: matzot, seder plate, wine cups, Haggadah, spring flowers. FORBIDDEN: menorah, shofar, sukkah, lulav.`;
  else if (/hanoukk|hanukkah|chanukah/i.test(titleLower))
    feteRules = `HANUKKAH ONLY: hanukkiah 9-branch menorah, dreidels, sufganiyot donuts, gelt, oil jug. Books on table or shelf only. FORBIDDEN: matzot, shofar, sukkah.`;
  else if (/pourim|purim/i.test(titleLower))
    feteRules = `PURIM ONLY: megillah scroll, mishloah manot baskets, hamantashen cookies, masks, costumes. FORBIDDEN: menorah, matzot, shofar.`;
  else if (/souccot|sukkot|soukkot/i.test(titleLower))
    feteRules = `SUKKOT ONLY: sukkah, lulav, etrog, schach roof branches. FORBIDDEN: menorah, matzot.`;
  else if (/chavouot|shavuot/i.test(titleLower))
    feteRules = `SHAVUOT ONLY: Torah scroll, flowers, greenery, dairy foods. FORBIDDEN: menorah, matzot, sukkah.`;
  else if (/roch.?hachana|rosh.?hashana/i.test(titleLower))
    feteRules = `ROSH HASHANA ONLY: shofar, apple and honey, round challah, prayer book. FORBIDDEN: menorah, matzot, sukkah.`;
  else if (/kippour|kippur/i.test(titleLower))
    feteRules = `YOM KIPPUR: white garments, tallit, candles, machzor. Solemn atmosphere. FORBIDDEN: food, festive objects.`;
  else if (/lag.?baomer/i.test(titleLower))
    feteRules = `LAG BAOMER: large bonfire, string lights, fruits, outdoor park. Families with adults AND children. FORBIDDEN: weapons of any kind, matzot, hanukkiah.`;
  else if (/chabbat|shabbat/i.test(titleLower))
    feteRules = `SHABBAT ONLY: two challah loaves, candlesticks, kiddush cup, white tablecloth. FORBIDDEN: 9-branch menorah, matzot.`;

  const finalCheck = maleOnly
    ? `FINAL CHECK: Zero female characters anywhere.`
    : hasFemale
    ? `FINAL CHECK: Every female character has visible natural hair on her head and nothing else.`
    : ``;

  const eventDetails = [titre, sous_titre, date, heure, lieu, bc].filter(Boolean).join(" · ");

  return `Warm storybook illustration for a religious community event in France.
Event: ${eventDetails}
Scene hint: "${accroche || sous_titre}"
Style: editorial children's book illustration. ${pal}. Warm soft lighting. Max 4 characters. Bottom 20% kept dark and empty for text overlay — no visual elements in bottom 20%.

${charSection}

MANDATORY RULES:
- NO TEXT or letters anywhere in the image (any language)
- Holy books always on table, shelf or in hands — never on the floor
- No religious symbols (no Star of David, no crosses, no crescents, no hamsa)
- No Rebbe's face. No non-kosher animals
- ${feteRules}
${maleOnly ? "- ZERO females anywhere." : hasFemale ? "- Female characters have visible natural hair. Male characters wear dark kippah." : ""}

${finalCheck}
Aspect ratio: ${ar}. High quality illustration. Absolutely no text or writing in the image.`;
}
