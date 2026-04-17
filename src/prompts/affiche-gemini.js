/* ─── affiche-gemini.js ─── */

export const CRITICAL_RULE = `CHARACTER APPEARANCE RULES:
Male characters (men and boys) wear a dark navy or black kippah resting on the crown of the head.
Female characters (women and girls) have natural visible hair on the head. The scalp and hair parting are clearly shown, with hair as the only element on top of the head.
All female characters wear long dresses or skirts reaching below the knee, with long sleeves and closed necklines.`;

export function buildLogoLine(hasCustomLogo) {
  return `IMPORTANT: Do NOT generate, draw, invent or render any logo, icon, emblem, seal, stamp or watermark anywhere in the image. Leave the bottom 20% of the image as a clean dark area with no visual elements — it will be used for text overlay only.`;
}

export function buildPrompt(data, bc, fmt, illustSelection) {
  const { titre, sous_titre, date, heure, lieu, accroche, ambiance } = data;
  const ar = fmt === "story" ? "9:16" : fmt === "a4" ? "3:4" : fmt === "paysage" ? "4:3" : "1:1";
  const issolemn = ambiance === "solennelle";
  const pal = issolemn ? "dark burgundy and charcoal, dignified atmosphere" : "deep royal blue #003087 and warm gold #C9971A, festive warm atmosphere";

  const hasFemale = illustSelection?.some(t => ["filles","rabbanit"].includes(t?.tile));
  const maleOnly = illustSelection?.every(t => ["garcons","rav"].includes(t?.tile)) && illustSelection?.length > 0;

  function getAgeLabel(age) {
    if (!age || age === "Adulte") return "adult";
    if (age === "Enfants") return "young child aged 5-10";
    if (age === "Adolescents") return "teenager aged 12-17";
    if (age === "Seniors" || age === "Âgé" || age === "Âgée") return "elderly person aged 65+";
    return "adult";
  }

  function descTile(tile, age, qty) {
    const ageLabel = getAgeLabel(age);
    const isGroup = qty === "groupe" || qty > 1;

    if (tile === "garcons") {
      return isGroup
        ? `A group of 2-4 boys (${ageLabel}). Each boy wears a dark navy or black kippah on top of his head. White shirt, tzitzit strings visible at waist, long dark trousers.`
        : `One boy (${ageLabel}). He wears a dark navy kippah on top of his head. White shirt, tzitzit strings visible at waist, long dark trousers. Only this one boy, no other characters.`;
    }

    if (tile === "filles") {
      const hairDesc = ageLabel.includes("child") ? "two long dark brown braids starting at a clean center parting on her scalp" :
                       ageLabel.includes("teenager") ? "long hair worn loose or in a ponytail, fully flowing from a visible scalp" :
                       ageLabel.includes("elderly") ? "silver hair gathered in a neat bun, with the natural shape of the scalp visible around it" :
                       "long dark hair styled in a braid or elegant updo, with the scalp's parting line clearly shown";
      const femaleAgeLabel = ageLabel.includes("child") ? "young girl" :
                             ageLabel.includes("teenager") ? "teenage girl" :
                             ageLabel.includes("elderly") ? "elderly woman" :
                             "young woman";
      const femaleAgeLabelPlural = ageLabel.includes("child") ? "young girls" :
                                   ageLabel.includes("teenager") ? "teenage girls" :
                                   ageLabel.includes("elderly") ? "elderly women" :
                                   "young women";
      if (isGroup && ageLabel.includes("child")) {
        return `A group of young girls (children aged 5-10), each with two long dark brown braids starting at a clean center parting on her scalp.
On every girl's head: the natural parting line shows a narrow strip of skin-toned scalp between smooth hair on each side. Each girl's braids begin directly at the scalp at the end of the parting, with hair being the only element visible on top of the head.
They wear long modest dresses below the knee, with long sleeves.`;
      }
      if (isGroup) {
        return `A group of ${femaleAgeLabelPlural} with ${hairDesc}.
Every head clearly shows the natural parting of the hair with a thin line of skin-toned scalp visible between smooth strands on each side. Hair is the only element on top of every head.
They wear long modest dresses below the knee, with long sleeves.`;
      }
      if (ageLabel.includes("child")) {
        return `One young girl (child aged 5-10) with two long dark brown braids starting at a clean center parting on her scalp.
The top of her head shows the natural parting — a thin line of skin-toned scalp visible between smooth hair on each side. Her braids begin directly at the scalp where the parting ends, with hair being the only element on top of her head.
She wears a long modest dress reaching below the knee, with long sleeves.`;
      }
      return `One ${femaleAgeLabel} with ${hairDesc}.
The center parting of her hair is clearly visible along the top of her head, showing the natural line of the scalp. Her hair cascades freely and naturally from that parting.
She wears a long modest dress reaching below the knee, with long sleeves.`;
    }

    if (tile === "rav") {
      const beardDesc = ageLabel.includes("elderly") ? "full grey or white beard, wrinkled wise face" : "full dark beard";
      return `One rabbi (${ageLabel}). He has a ${beardDesc} and wears a classic wide-brimmed black felt fedora hat. Dark suit jacket, white shirt, tzitzit strings visible. Wise and warm expression.`;
    }

    if (tile === "rabbanit") {
      const hairDesc = ageLabel.includes("elderly") ? "neat silver hair in a bun" : "elegant dark hair styled in a bun or chignon";
      return `One ${ageLabel} woman with ${hairDesc} worn freely.
The natural shape of her scalp is visible around the hairline and at the hair's parting, with hair being the only element on top of her head.
Elegant modest dress below knee, long sleeves, closed neckline. Warm gracious expression.`;
    }

    return "";
  }

  // Character section
  let charSection = "";
  if (!illustSelection || illustSelection.length === 0 || illustSelection.every(t => !t?.tile || t?.tile === "decor")) {
    charSection = `SCENE: NO human characters at all. Beautiful atmospheric scene: warm lighting, deep blue and gold palette, relevant objects for the event. Cozy and inviting.`;
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
    const hasBoys = illustSelection.some(t => t?.tile === "garcons");
    const hasGirls = illustSelection.some(t => t?.tile === "filles");
    if (hasBoys && hasGirls) {
      charSection += `\n\nGENDER DISTINCTION:
Boys and girls are visually different characters. The male character group (boys) wears a dark navy kippah on the head. The female character group (girls) shows natural visible hair on the head, with the scalp parting clearly shown.`;
    }
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
    ? `FINAL CHECK: Only male characters appear in the scene.`
    : hasFemale
    ? `FINAL CHECK: On every female character's head, confirm that the natural hair and scalp parting are clearly visible, with hair being the only element on top of the head.`
    : ``;

  const eventDetails = [titre, sous_titre, date, heure, lieu, bc].filter(Boolean).join(" · ");

  return `Warm children's storybook illustration for a community event in France.
Event: ${eventDetails}
Scene hint: "${accroche || sous_titre}"
Style: editorial children's book illustration in the spirit of modern Pixar and Disney animation — fresh, warm, natural, with simple secular styling for all characters. ${pal}. Warm soft lighting. Max 4 characters. Bottom 20% kept dark and empty for text overlay — no visual elements in bottom 20%.

${charSection}

MANDATORY RULES:
- NO TEXT or letters anywhere in the image (any language)
- Holy books always on table, shelf or in hands — never on the floor
- FEMALE HAIR: Every female character shows her natural hair on top of the head, with the scalp parting line clearly visible. Male characters wear a dark kippah.
- No symbols such as Star of David, crosses, crescents, or hamsa
- No Rebbe's face. No non-kosher animals
- ${feteRules}
${maleOnly ? "- Only male characters appear in this scene. Each wears a dark navy kippah." : hasFemale ? "- Female characters have natural visible hair with the scalp parting shown. Male characters wear a dark kippah." : ""}

${finalCheck}
Aspect ratio: ${ar}. High quality illustration. Absolutely no text or writing in the image.`;
}
