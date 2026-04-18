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
    feteRules = `PESSAH ONLY: CENTER of scene = seder table with white tablecloth. ON TABLE MANDATORY: round hand-made shmura matzah (round, beige, with char marks — NOT square crackers), seder plate with exactly 6 items (zroa = roasted lamb bone, beitza = hard-boiled egg, maror = whole horseradish root, karpas = celery stalk, charoset = dark brown paste, chazeret = romaine lettuce), 4 red wine cups, separate large Eliyahu cup filled with red wine, open Haggadah. Family reclining on pillows to the left. FORBIDDEN: menorah, shofar, sukkah, lulav, square industrial matzah.`;
  else if (/hanoukk|hanukkah|chanukah/i.test(titleLower))
    feteRules = `HANUKKAH ONLY: CENTER of scene = hanukkiah (9-branch menorah lit with olive oil — small glass cups with oil and wicks, NOT candles) placed at left side of a doorway or on a windowsill visible from outside. Chabad hanukkiah is tall, silver or brass, with straight branches. Small olive oil pitcher nearby. Dreidels and gold foil-wrapped chocolate coins (gelt) on a table. FORBIDDEN: matzot, shofar, sukkah, lulav, wax candles in the hanukkiah.`;
  else if (/pourim|purim/i.test(titleLower))
    feteRules = `PURIM ONLY: CENTER of scene = colorful mishloah manot gift basket containing at least 2 different foods and a bottle of wine or grape juice, open Megillat Esther scroll (handwritten Hebrew parchment), hamantashen triangular cookies (poppy seed or jam filled), festive costumes and masks. FORBIDDEN: menorah, matzot, shofar.`;
  else if (/souccot|sukkot|soukkot/i.test(titleLower))
    feteRules = `SUKKOT ONLY: CENTER of scene = sukkah (wooden or fabric walls, roof of schach = palm branches and leaves through which sky is visible, hanging fruits and decorations inside). Man holding lulav set in right hand (tall straight palm frond bound with 3 myrtle branches and 2 willow branches) and etrog (yellow citron fruit with intact green pitom tip) in left hand. FORBIDDEN: menorah, matzot.`;
  else if (/chavouot|shavuot/i.test(titleLower))
    feteRules = `SHAVUOT ONLY: CENTER of scene = table with open Torah scroll, room decorated with fresh green branches and flowers (the synagogue is traditionally decorated with greenery). Dairy foods on table: cheesecake, blintzes (thin crepes folded around white cheese). Tikkun Leil Shavuot book open (night of Torah study). FORBIDDEN: menorah, matzot, sukkah.`;
  else if (/roch.?hachana|rosh.?hashana/i.test(titleLower))
    feteRules = `ROSH HASHANA ONLY: CENTER of scene = festive table. MANDATORY ITEMS: ram's horn shofar (curved hollow horn from a male sheep, beige/brown color, NOT a straight or metal instrument), round raisin challah dipped in honey, golden honey dish with red apple slices, pomegranate (rimon) cut open showing red seeds, fish or ram's head on a plate. FORBIDDEN: any straight or metal horn, menorah, matzot, sukkah, any musical instrument that is not a curved ram's horn.`;
  else if (/kippour|kippur/i.test(titleLower))
    feteRules = `YOM KIPPUR: CENTER of scene = synagogue interior, solemn and white. Married men wear a kittel (long plain white linen robe with white belt, reaching the feet, worn OVER their black suit — this is the most visually dominant garment, like a white angel robe). White Chabad machzor (prayer book with white cover) open in hands. White tallit draped over shoulders. Lit memorial candles (yahrtzeit candles in glass). White tablecloth. Atmosphere: solemn, pure, angelic. FORBIDDEN: food, festive objects, colorful clothing, gold jewelry.`;
  else if (/lag.?baomer/i.test(titleLower))
    feteRules = `LAG BAOMER ONLY: CENTER of scene = large central bonfire at night with tall orange flames. Open Zohar book on a nearby table (the Rashbi's hillulah). Families and children celebrating around the fire. Joyful outdoor atmosphere. FORBIDDEN: weapons, bows, arrows, matzot, hanukkiah.`;
  else if (/chabbat|shabbat/i.test(titleLower))
    feteRules = `SHABBAT ONLY: CENTER of scene = white dining table. MANDATORY: two braided challahs covered with an embroidered challah cover (decorative fabric with Hebrew letters), silver kiddush cup filled with red wine, silver candlesticks with 2 lit white candles, pure white tablecloth. Warm golden candlelight atmosphere. FORBIDDEN: 9-branch menorah, matzot, any chametz.`;

  const finalCheck = maleOnly
    ? `FINAL CHECK: Only male characters appear in the scene.`
    : hasFemale
    ? `FINAL CHECK: On every female character's head, confirm that the natural hair and scalp parting are clearly visible, with hair being the only element on top of the head.`
    : ``;

  const eventDetails = [titre, sous_titre, date, heure, lieu, bc].filter(Boolean).join(" · ");

  return `SCENE PRIORITY: The holiday objects listed below are MANDATORY and must dominate the scene. Characters are secondary and must be arranged around the holiday objects, not the opposite.

═══ 1. HOLIDAY OBJECTS (mandatory, must dominate the scene) ═══
${feteRules}

═══ 2. FORMAT & VISUAL COMPOSITION ═══
Warm children's storybook illustration for a community event in France.
Event: ${eventDetails}
Scene hint: "${accroche || sous_titre}"
Style: editorial children's book illustration in the spirit of modern Pixar and Disney animation — fresh, warm, natural, with simple secular styling for all characters. ${pal}. Warm soft lighting. Max 4 characters. Bottom 20% kept dark and empty for text overlay — no visual elements in bottom 20%.
Aspect ratio: ${ar}.

═══ 3. CHARACTERS (arranged around the holiday objects) ═══
${charSection}

═══ 4. MANDATORY RULES ═══
SCENE COMPOSITION PRIORITY: Holiday ritual objects listed below are MANDATORY and visually dominant. Characters are secondary — they must be arranged around and interacting with the holiday objects, never replacing them.
- NO TEXT or letters anywhere in the image (any language)
- Holy books always on table, shelf or in hands — never on the floor
- FEMALE HAIR: Every female character shows her natural hair on top of the head, with the scalp parting line clearly visible. Male characters wear a dark kippah.
- No symbols such as Star of David, crosses, crescents, or hamsa
- No Rebbe's face. No non-kosher animals
${maleOnly ? "- Only male characters appear in this scene. Each wears a dark navy kippah." : hasFemale ? "- Female characters have natural visible hair with the scalp parting shown. Male characters wear a dark kippah." : ""}

${finalCheck}
High quality illustration. Absolutely no text or writing in the image.`;
}
