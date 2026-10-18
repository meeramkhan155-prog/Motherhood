// "Myth or safe?": common family traditions for newborns, answered with respect.
// Based on WHO, CDC, AAP and NHS guidance, and on Pakistani studies of newborn care practices.
// verdict: "no" (not safe), "care" (safe with care), "yes" (safe).
// Each item: why (respectful, plain), instead (a safe way to honor the same wish).
window.MOTHERHOOD_MYTHS = [
  {
    id: "colostrum", verdict: "no", title: "Throwing away the first yellow milk",
    words: /colostrum|first (yellow )?milk|yellow milk|throw (away )?(the )?first milk|pehla doodh|keera/i,
    why: "That thick yellow first milk is called colostrum. It's not dirty or heavy. It's the most precious milk your baby will ever get, full of protection against infections. Many doctors call it baby's first vaccine.",
    instead: "Put baby to the breast within the first hour after birth, and let them have every drop of that first milk.",
  },
  {
    id: "ghutti", verdict: "no", title: "Ghutti or a first feed before breast milk",
    words: /ghutti|janam ghutti|first feed|prelacteal|before (breast ?milk|breastfeeding)|sweet (water|feed)|chaar ark|arq/i,
    why: "Families give ghutti out of love, hoping to pass on good qualities. But a newborn's tummy is tiny and its gut is still learning. Anything other than breast milk in the first days can bring germs, fill baby up, and delay breastfeeding.",
    instead: "If the family wants a blessing ritual, an elder can say a prayer, or touch a clean finger to baby's lips. Then the first feed is breast milk.",
  },
  {
    id: "honey", verdict: "no", title: "Honey for a newborn",
    words: /honey|shehad|shahad|miel|bal\b/i,
    why: "Honey can carry spores that cause infant botulism, a rare but very serious illness, because a baby's gut can't fight them yet. This is true even for pure, natural honey, and even a tiny lick.",
    instead: "No honey at all before the first birthday. After one year, it's fine.",
  },
  {
    id: "water", verdict: "no", title: "Water, herbal waters or gripe water",
    words: /\bwater\b.*(baby|newborn)|(baby|newborn).*\bwater\b|saunf|fennel|gripe water|green tea|qehwa|kahwa|rose water|ark.?e.?gulab|chamomile|tea for (the )?baby/i,
    why: "In the first six months, breast milk or formula already has all the water a baby needs, even in hot weather. Extra water, saunf water or teas fill their tiny tummy, so they drink less milk, and too much water can even be dangerous.",
    instead: "On hot days, simply offer more breast milk or formula feeds. For colic, try holding, rocking and burping.",
  },
  {
    id: "surma", verdict: "no", title: "Surma or kajal in baby's eyes",
    words: /surma|kajal|kohl|kajol|eyeliner|black (dot|tika)|nazar/i,
    why: "Many surma and kohl products contain lead, which can harm a baby's growing brain. Putting anything in a newborn's eyes can also cause infections. It doesn't make eyes bigger or stronger.",
    instead: "Keep surma and kajal away from baby's eyes and skin. If the family wants protection from nazar, a prayer or blessing works without any risk.",
  },
  {
    id: "cord", verdict: "no", title: "Putting oil, ghee or powder on the cord",
    words: /(oil|ghee|ash|turmeric|haldi|matti|powder|dung|surma).*(cord|belly button|navel|naal)|(cord|belly button|navel|naal).*(oil|ghee|ash|turmeric|haldi|matti|powder)/i,
    why: "The cord stump is an open path into baby's body until it heals. Oil, ghee, ash, turmeric or powder can carry germs and cause serious infections, including tetanus.",
    instead: "Keep the cord clean and dry, and let it fall off on its own. If your health worker gives you a special cord antiseptic, use only that, as they show you.",
  },
  {
    id: "massage", verdict: "care", title: "Oil massage",
    words: /massage|malish|maalish|mustard oil|sarson|oil (on|for) (the )?baby/i,
    why: "Massage is a beautiful way to bond, and it can calm baby. But mustard oil can irritate and damage a newborn's thin skin.",
    instead: "Use a gentle plant oil such as sunflower or coconut, with warm hands. Keep oil out of the eyes, nose and ears, and off the cord. Never drip oil into the nose or ears.",
  },
  {
    id: "powder", verdict: "no", title: "Sprinkling powder on the baby",
    words: /powder|talc/i,
    why: "Babies can breathe in powder clouds, which can hurt their lungs. Powder doesn't stop rashes better than keeping skin clean and dry.",
    instead: "Pat the skin dry, especially in the creases. For diaper rash, use a thin layer of barrier cream instead.",
  },
  {
    id: "first-bath", verdict: "care", title: "Bathing baby right after birth",
    words: /(first )?bath (right )?after birth|wash off|white (coating|stuff)|vernix|bathe.*(birth|born)/i,
    why: "That white creamy coating, called vernix, protects baby's skin and helps keep them warm. Newborns lose heat very quickly, and an early bath can make them cold.",
    instead: "Wait at least a day before the first bath. Gently wipe away blood, but let the white coating soak in. Keep baby warm, skin to skin with mom.",
  },
  {
    id: "legs", verdict: "no", title: "Wrapping with legs pulled straight",
    words: /legs? (straight|tight)|straighten (the )?legs|tight(ly)? (wrap|swaddl)|bandh|crooked legs/i,
    why: "Wrapping legs straight and tight can harm baby's hip joints, a problem called hip dysplasia. It doesn't make legs straighter. Babies' legs naturally curl up like a frog and straighten on their own as they grow.",
    instead: "Swaddle snugly at the chest, but loosely at the hips, so the legs can bend up and out.",
    guide: "swaddle",
  },
  {
    id: "thread", verdict: "care", title: "Threads, necklaces or charms on baby",
    words: /thread|taweez|taviz|tabeez|amulet|charm|necklace|bracelet|kala dhaga|black thread|amber/i,
    why: "Families often add these for protection, and that love matters. But anything around the neck, wrist or ankle can strangle or choke a baby, especially during sleep.",
    instead: "Keep it close but out of reach: never on baby while sleeping or unwatched, and never around the neck. A prayer or blessing can protect without any risk.",
  },
  {
    id: "bundling", verdict: "no", title: "Many layers and a very warm room",
    words: /(many|lots of|extra|thick) (layers|blankets|clothes)|bundl|cover (the )?(head|face)|too (hot|warm)|keep (baby )?warm/i,
    why: "Babies can't cool themselves down well. Too many layers or a very hot room raise the risk of sudden infant death, especially during sleep.",
    instead: "Dress baby in one layer more than you'd wear. Feel the back of the neck: warm is good, sweaty means too hot. Keep the head and face uncovered for sleep.",
  },
  {
    id: "tummy-sleep", verdict: "no", title: "Sleeping baby on their tummy for a nice head shape",
    words: /(sleep|sleeping|lay|put).*(tummy|stomach|front|side)|head shape|flat head|round head/i,
    why: "Sleeping on the tummy or side greatly raises the risk of sudden infant death. A slightly flat spot is common and usually improves.",
    instead: "Always put baby to sleep on their back. For head shape, give plenty of tummy time while baby is awake and someone is watching.",
    guide: "sleep",
  },
  {
    id: "shave", verdict: "yes", title: "Shaving baby's head",
    words: /shav(e|ing)|mundan|aqiqah|aqeeqah|hair (cut|thick)/i,
    why: "Shaving is safe when done gently with a clean razor or clippers. It won't make hair grow thicker or darker, since that depends on genes, but it does no harm.",
    instead: "Use clean tools, go gently around the soft spots, and keep the room warm. Avoid putting anything on any small cuts other than clean water.",
  },
];
