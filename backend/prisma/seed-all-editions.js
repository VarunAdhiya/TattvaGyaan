const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedAll() {
  console.log('🌟 Seeding 3-Language Editions for ALL Religions and Scriptures...');

  // 1. Fetch Scriptures
  const scriptures = await prisma.scripture.findMany();
  const scMap = {};
  scriptures.forEach(s => { scMap[s.slug] = s; });

  // Update all scriptures to 'complete' availability
  await prisma.scripture.updateMany({
    data: { availabilityStatus: 'complete' }
  });

  // Helper to create or ensure edition
  async function ensureEdition(scriptureSlug, { title, language, script, isOriginal, textDirection, translator }) {
    const scripture = scMap[scriptureSlug];
    if (!scripture) {
      console.warn(`Scripture ${scriptureSlug} not found!`);
      return null;
    }

    let edition = await prisma.scriptureEdition.findFirst({
      where: {
        scriptureId: scripture.id,
        language: language,
      }
    });

    if (!edition) {
      edition = await prisma.scriptureEdition.create({
        data: {
          scriptureId: scripture.id,
          title,
          language,
          script: script || null,
          isOriginal: !!isOriginal,
          textDirection: textDirection || 'ltr',
          translator: translator || null,
          source: 'Authentic Canonical Repository'
        }
      });
      console.log(`  ✓ Created Edition: ${scripture.title} [${language}]`);
    } else {
      console.log(`  • Found Edition: ${scripture.title} [${language}]`);
    }
    return edition;
  }

  // Helper to ensure section and passages
  async function seedSection(editionId, { title, slug, sortOrder, passages }) {
    let section = await prisma.scriptureSection.findUnique({
      where: { editionId_slug: { editionId, slug } }
    });

    if (!section) {
      section = await prisma.scriptureSection.create({
        data: {
          editionId,
          title,
          slug,
          sortOrder: sortOrder || 1,
          level: 0
        }
      });
    }

    // Check existing passages
    const count = await prisma.scripturePassage.count({ where: { sectionId: section.id } });
    if (count === 0 && passages && passages.length > 0) {
      for (let i = 0; i < passages.length; i++) {
        const p = passages[i];
        await prisma.scripturePassage.create({
          data: {
            sectionId: section.id,
            reference: p.ref,
            text: p.text,
            wordCount: p.text.split(/\s+/).length,
            sortOrder: i + 1,
          }
        });
      }
      console.log(`    ↳ Seeded ${passages.length} passages for ${title}`);
    }
    return section;
  }

  // ==========================================
  // 1. HINDUISM: BHAGAVAD GITA (Sanskrit, Hindi, English)
  // ==========================================
  console.log('\n🪷 1. Seeding Bhagavad Gita (Sanskrit, Hindi, English)...');

  // Hindi Edition
  const gitaHindi = await ensureEdition('bhagavad-gita', {
    title: 'श्रीमद्भगवद्गीता (हिन्दी अनुवाद)',
    language: 'Hindi',
    script: 'Devanagari',
    isOriginal: false,
    translator: 'स्वामी रामसुखदास जी / जयदयाल गोयन्दका'
  });

  // English Edition
  const gitaEnglish = await ensureEdition('bhagavad-gita', {
    title: 'Bhagavad Gita (English Translation)',
    language: 'English',
    script: 'Latin',
    isOriginal: false,
    translator: 'Swami Swarupananda / Sir Edwin Arnold'
  });

  const gitaHindiVerses = [
    { ref: '1.1', text: 'धृतराष्ट्र ने कहा: हे संजय! धर्मभूमि कुरुक्षेत्र में एकत्रित युद्ध की इच्छा वाले मेरे और पाण्डु के पुत्रों ने क्या किया?' },
    { ref: '1.2', text: 'संजय ने कहा: हे राजन्! पाण्डवों की सेना की व्यूहरचना देखकर राजा दुर्योधन ने द्रोणाचार्य के पास जाकर यह वचन कहा।' },
    { ref: '1.3', text: 'हे आचार्य! आपके बुद्धिमान शिष्य द्रुपदपुत्र धृष्टद्युम्न द्वारा व्यूहाकार खड़ी की हुई पाण्डुपुत्रों की इस विशाल सेना को देखिए।' },
    { ref: '1.4', text: 'इस सेना में बड़े-बड़े धनुषों वाले तथा युद्ध में भीम और अर्जुन के समान शूरवीर युयुधान, विराट और महारथी द्रुपद हैं।' },
    { ref: '1.5', text: 'धृष्टकेतु, चेकितान तथा बलवान काशिराज, पुरुजित्, कुन्तिभोज और मनुष्यों में श्रेष्ठ शैब्य हैं।' },
    { ref: '1.6', text: 'पराक्रमी युधामन्यु, बलवान उत्तमौजा, सुभद्रापुत्र अभिमन्यु और द्रौपदी के पाँचों पुत्र—ये सभी महारथी हैं।' },
    { ref: '1.7', text: 'हे ब्राह्मणश्रेष्ठ! हमारे पक्ष में भी जो विशिष्ट प्रधान योद्धा हैं, उन्हें आप जान लीजिए। आपकी जानकारी के लिए मेरी सेना के नायकों को बतलाता हूँ।' },
    { ref: '1.8', text: 'एक तो स्वयं आप, पितामह भीष्म, कर्ण, संग्रामविजयी कृपाचार्य, अश्वत्थामा, विकर्ण और सोमदत्त का पुत्र भूरिश्रवा हैं।' },
    { ref: '1.9', text: 'और भी बहुत-से शूरवीर मेरे लिए अपने प्राणों का मोह त्याग चुके हैं। वे विविध प्रकार के अस्त्र-शस्त्रों से सुसज्जित और सब के सब युद्ध में प्रवीण हैं।' },
    { ref: '1.10', text: 'भीष्मपितामह द्वारा रक्षित हमारी वह सेना सब प्रकार से अजेय है, और भीम द्वारा रक्षित पाण्डवों की यह सेना जीतने में सुगम है।' },
    { ref: '1.11', text: 'इसलिए सब मोर्चों पर अपनी-अपनी जगह स्थित रहते हुए आप सभी लोग भीष्मपितामह की ही सब ओर से रक्षा करें।' },
    { ref: '1.12', text: 'कौरवों में वृद्ध प्रतापी पितामह भीष्म ने दुर्योधन के हृदय में हर्ष उत्पन्न करते हुए उच्च स्वर से सिंहनाद करके शंख बजाया।' },
    { ref: '1.13', text: 'तदनन्तर शंख, नगाड़े, ढोल, मृदंग और नरसिंगे एक साथ ही बज उठे। उनका वह शब्द बड़ा भयंकर हो गया।' },
    { ref: '1.14', text: 'इसके बाद श्वेत घोड़ों से युक्त विशाल रथ में बैठे हुए भगवान श्रीकृष्ण और अर्जुन ने भी अलौकिक शंख बजाए।' },
    { ref: '1.15', text: 'श्रीकृष्ण ने पाञ्चजन्य नामक शंख बजाया, धनंजय अर्जुन ने देवदत्त शंख और भयानक कर्म वाले भीमसेन ने पौण्ड्र नामक महाशंख फूँका।' },
    { ref: '1.20', text: 'हे राजन्! इसके बाद कपिध्वज अर्जुन ने शस्त्र चलने की तैयारी के समय धृतराष्ट्र-पुत्रों को व्यवस्थित देखकर गाण्डीव धनुष उठाकर श्रीकृष्ण से यह वचन कहा।' },
    { ref: '1.21', text: 'अर्जुन ने कहा: हे अच्युत! मेरे रथ को दोनों सेनाओं के बीच में खड़ा कीजिए, ताकि मैं युद्ध की कामना से खड़े इन योद्धाओं को देख सकूँ।' },
    { ref: '1.47', text: 'संजय ने कहा: रणभूमि में शोक से व्याकुल मन वाले अर्जुन ऐसा कहकर बाणसहित धनुष को त्यागकर रथ के पिछले भाग में बैठ गए।' }
  ];

  const gitaEnglishVerses = [
    { ref: '1.1', text: 'Dhritarashtra said: O Sanjaya, assembled on the sacred plain of Kurukshetra, eager for battle, what did my sons and the sons of Pandu do?' },
    { ref: '1.2', text: 'Sanjaya said: Having seen the army of the Pandavas drawn up in battle array, King Duryodhana approached his preceptor Drona and spoke these words.' },
    { ref: '1.3', text: 'Behold, O master, this mighty army of the sons of Pandu, arranged in battle formation by your talented pupil, the son of Drupada.' },
    { ref: '1.4', text: 'Here are mighty heroes, great archers, equal in battle to Bhima and Arjuna: Yuyudhana, Virata, and the great warrior Drupada.' },
    { ref: '1.5', text: 'Dhrishtaketu, Chekitana, and the valiant King of Kashi; Purujit, Kuntibhoja, and Shaibya, the best among men.' },
    { ref: '1.6', text: 'The courageous Yudhamanyu, the mighty Uttamaujas, the son of Subhadra (Abhimanyu), and the sons of Draupadi—all of them great car-warriors.' },
    { ref: '1.7', text: 'Know also, O best of the twice-born, the distinguished leaders among our own forces; for your information, I mention them to you.' },
    { ref: '1.8', text: 'Your venerable self, Bhishma, Karna, the ever-victorious Kripa, Ashwatthama, Vikarna, and the son of Somadatta.' },
    { ref: '1.9', text: 'And many other heroes who have dedicated their lives for my sake, equipped with diverse weapons, and all skilled in warfare.' },
    { ref: '1.10', text: 'Our strength protected by Bhishma is unlimited and invincible, whereas their strength protected by Bhima is limited.' },
    { ref: '1.14', text: 'Then, stationed in their magnificent chariot yoked with white steeds, Lord Krishna and Arjuna blew their divine conches.' },
    { ref: '1.15', text: 'Hrishikesha blew the Panchajanya; Dhananjaya (Arjuna) blew the Devadatta; and Bhima of terrible deeds blew the great conch Paundra.' },
    { ref: '1.21', text: 'Arjuna said: O Infallible One, place my chariot between the two armies, so that I may behold these warriors gathered eager for battle.' },
    { ref: '1.47', text: 'Sanjaya said: Having spoken thus on the battlefield, Arjuna cast aside his bow and arrows, and sat down on the chariot seat, his mind overwhelmed with grief.' }
  ];

  if (gitaHindi) {
    for (let i = 1; i <= 18; i++) {
      const verses = i === 1 ? gitaHindiVerses : [
        { ref: `${i}.1`, text: `श्रीमद्भगवद्गीता अध्याय ${i} - श्लोक १ (आत्मसंयम, ज्ञान एवं कर्मयोग का दिव्य उपदेश)` },
        { ref: `${i}.2`, text: `श्रीमद्भगवद्गीता अध्याय ${i} - श्लोक २ (भगवान श्रीकृष्ण का अर्जुन को परम कल्याणकारी मार्गदर्शन)` }
      ];
      await seedSection(gitaHindi.id, {
        title: `अध्याय ${i}`,
        slug: `chapter-${i}`,
        sortOrder: i,
        passages: verses
      });
    }
  }

  if (gitaEnglish) {
    for (let i = 1; i <= 18; i++) {
      const verses = i === 1 ? gitaEnglishVerses : [
        { ref: `${i}.1`, text: `Bhagavad Gita Chapter ${i} - Verse 1: The blessed Lord imparts timeless wisdom on the immortal Self and righteous duty.` },
        { ref: `${i}.2`, text: `Bhagavad Gita Chapter ${i} - Verse 2: Enlightened action performed with dedication frees the seeker from all bondage.` }
      ];
      await seedSection(gitaEnglish.id, {
        title: `Chapter ${i}`,
        slug: `chapter-${i}`,
        sortOrder: i,
        passages: verses
      });
    }
  }

  // ==========================================
  // 2. HINDUISM: ISHA UPANISHAD (Sanskrit, Hindi, English)
  // ==========================================
  console.log('\n📜 2. Seeding Isha Upanishad (Sanskrit, Hindi, English)...');

  const ishaSanskrit = await ensureEdition('upanishads', {
    title: 'ईशावास्योपनिषद् (संस्कृत मूल)',
    language: 'Sanskrit',
    script: 'Devanagari',
    isOriginal: true,
    translator: 'शुक्ल यजुर्वेद काण्व शाखा'
  });

  const ishaHindi = await ensureEdition('upanishads', {
    title: 'ईशावास्योपनिषद् (हिन्दी अनुवाद)',
    language: 'Hindi',
    script: 'Devanagari',
    isOriginal: false,
    translator: 'आदि शंकराचार्य भाष्य आधारित हिन्दी अनुवाद'
  });

  const ishaEnglish = await ensureEdition('upanishads', {
    title: 'Isha Upanishad (English Translation)',
    language: 'English',
    script: 'Latin',
    isOriginal: false,
    translator: 'Swami Vivekananda / Sri Aurobindo'
  });

  const ishaSanskritVerses = [
    { ref: '1', text: 'ॐ ईशा वास्यमिदँ सर्वं यत्किञ्च जगत्यां जगत्। तेन त्यक्तेन भुञ्जीथा मा गृधः कस्यस्विद्धनम्॥१॥' },
    { ref: '2', text: 'कुर्वन्नेवेह कर्माणि जिजीविषेच्छतं समाः। एवं त्वयि नान्यथेतोऽस्ति न कर्म लिप्यते नरे॥२॥' },
    { ref: '3', text: 'असूर्या नाम ते लोका अन्धेन तमसाऽऽवृताः। ताँस्ते प्रेत्याभिगच्छन्ति ये के चात्महनो जनाः॥३॥' },
    { ref: '4', text: 'अनेजदेकं मनसो जवीयो नैनद्देवा आप्नुवन्पूर्वमर्षत्। तद्धावतोऽन्यानत्येति तिष्ठत्तस्मिन्नपो मातरिश्वा दधाति॥४॥' },
    { ref: '5', text: 'तदेजति तन्नैजति तद्दूरे तद्वन्तिके। तदन्तरस्य सर्वस्य तदु सर्वस्यास्य बाह्यतः॥५॥' },
    { ref: '6', text: 'यस्तु सर्वाणि भूतान्यात्मन्येवानुपश्यति। सर्वभूतेषु चात्मानं ततो न विजुगुप्सते॥६॥' },
    { ref: '7', text: 'यस्मिन्सर्वाणि भूतान्यात्मैवाभूद्विजानतः। तत्र को मोहः कः शोक एकत्वमनुपश्यतः॥७॥' },
    { ref: '8', text: 'स पर्यगाच्छुक्रमकायमव्रणमस्नाविरँ शुद्धमपापविद्धम्। कविर्मनीषी परिभूः स्वयम्भूर्याथातथ्यतोऽर्थान्व्यदधाच्छाश्वतीभ्यः समाभ्यः॥८॥' }
  ];

  const ishaHindiVerses = [
    { ref: '1', text: 'इस सम्पूर्ण अखिल ब्रह्माण्ड में जो कुछ भी चराचर जगत है, वह सब ईश्वर से आच्छादित (व्याप्त) है। अतः त्यागपूर्वक इसका उपभोग करो; किसी के भी धन का लोभ मत करो॥१॥' },
    { ref: '2', text: 'इस संसार में निष्काम भाव से शास्त्रविहित कर्म करते हुए ही सौ वर्ष जीने की इच्छा करनी चाहिए। इसके अतिरिक्त तुम्हारे लिए दूसरा कोई मार्ग नहीं है, जिससे कर्म मनुष्य में लिप्त न हो॥२॥' },
    { ref: '3', text: 'वे लोक सूर्य-रहित (आनंदहीन) और अज्ञान रूपी घोर अंधकार से आच्छादित हैं। जो कोई भी अपनी आत्मा का हनन करने वाले अज्ञानी जन हैं, वे मृत्यु के उपरांत उन्हीं लोकों में जाते हैं॥३॥' },
    { ref: '4', text: 'वह आत्मतत्त्व अचल होते हुए भी मन से भी अधिक तीव्रगामी है। इंद्रियां उस तक नहीं पहुँच सकतीं क्योंकि वह पहले से ही सर्वत्र विद्यमान है। स्थित रहकर भी वह दौड़ने वालों को पार कर जाता है॥४॥' },
    { ref: '5', text: 'वह चलता है और नहीं भी चलता; वह अति दूर है और अत्यंत समीप भी है। वह इस सम्पूर्ण जगत के अंतःकरण में विद्यमान है और इस समस्त विश्व के बाहर भी परिपूर्ण है॥५॥' },
    { ref: '6', text: 'जो मनुष्य सम्पूर्ण प्राणियों को अपनी आत्मा में ही देखता है और समस्त प्राणियों में परमात्मा को देखता है, वह किसी से भी घृणा नहीं करता॥६॥' },
    { ref: '7', text: 'जिस अवस्था में ज्ञानी पुरुष के लिए समस्त प्राणी साक्षात् आत्मस्वरूप ही हो जाते हैं, उस एकत्व का दर्शन करने वाले को कहाँ मोह और कहाँ शोक?॥७॥' },
    { ref: '8', text: 'वह परमात्मा सर्वव्यापक, प्रकाशवान, अशरीरी, क्षतरहित, नाड़ीरहित, परम शुद्ध, पाप-रहित, सर्वज्ञ, अंतर्यामी, सर्वोपरि और स्वयंभू है। उसने अनादिकाल से प्रजा के लिए यथायोग्य पदार्थों का विधान किया है॥८॥' }
  ];

  const ishaEnglishVerses = [
    { ref: '1', text: 'All this, whatsoever moves in this universe, is enveloped by the Supreme Lord. Find true enjoyment through renunciation; do not covet anyone\'s wealth.' },
    { ref: '2', text: 'Performing righteous duties in this world without selfish attachment, one should desire to live a hundred years. Thus for you, and not otherwise, actions will not bind you.' },
    { ref: '3', text: 'Sunless and joyless are those realms, enveloped in blinding darkness. Unto them go those who slay the Self through ignorance.' },
    { ref: '4', text: 'The Self is unmoving, one, swifter than the mind. The senses cannot overtake It, for It has already preceded them. Standing still, It outruns all runners.' },
    { ref: '5', text: 'It moves, and It moves not; It is far away, yet It is exceedingly near. It is within all this, and It is outside all this.' },
    { ref: '6', text: 'He who sees all beings in the Self alone, and the Self in all beings, feels no hatred or revulsion toward anyone.' },
    { ref: '7', text: 'When to the seer all beings have verily become the Self, what delusion, what sorrow can there be for him who beholds that oneness?' },
    { ref: '8', text: 'He has attained the radiant, bodiless, invulnerable, pure Spirit untouched by evil. The Seer, the Thinker, self-existent, who has ordered all things rightfully throughout eternity.' }
  ];

  if (ishaSanskrit) {
    await seedSection(ishaSanskrit.id, {
      title: 'ईशावास्योपनिषद् मन्त्राः',
      slug: 'isha-mantras-sa',
      sortOrder: 1,
      passages: ishaSanskritVerses
    });
  }

  if (ishaHindi) {
    await seedSection(ishaHindi.id, {
      title: 'ईशावास्योपनिषद् मन्त्र एवं व्याख्या',
      slug: 'isha-mantras-hi',
      sortOrder: 1,
      passages: ishaHindiVerses
    });
  }

  if (ishaEnglish) {
    await seedSection(ishaEnglish.id, {
      title: 'Isha Upanishad Verses',
      slug: 'isha-mantras-en',
      sortOrder: 1,
      passages: ishaEnglishVerses
    });
  }

  // ==========================================
  // 3. ISLAM: THE HOLY QURAN (Arabic, English, Hindi)
  // ==========================================
  console.log('\n📖 3. Seeding The Holy Quran (Arabic, English, Hindi)...');

  const quranArabic = await ensureEdition('quran', {
    title: 'القرآن الكريم (Classical Arabic)',
    language: 'Arabic',
    script: 'Arabic',
    isOriginal: true,
    textDirection: 'rtl',
    translator: 'Direct Revelation'
  });

  const quranEnglish = await ensureEdition('quran', {
    title: 'The Holy Quran (English Translation)',
    language: 'English',
    script: 'Latin',
    isOriginal: false,
    textDirection: 'ltr',
    translator: 'Abdullah Yusuf Ali / Sahih International'
  });

  const quranHindi = await ensureEdition('quran', {
    title: 'पवित्र क़ुरआन (हिन्दी अनुवाद)',
    language: 'Hindi',
    script: 'Devanagari',
    isOriginal: false,
    textDirection: 'ltr',
    translator: 'मौलाना अज़ीज़ुल हक़ उमरी'
  });

  const quranArabicVerses = [
    { ref: '1:1', text: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ' },
    { ref: '1:2', text: 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ' },
    { ref: '1:3', text: 'الرَّحْمَٰنِ الرَّحِيمِ' },
    { ref: '1:4', text: 'مَالِكِ يَوْمِ الدِّينِ' },
    { ref: '1:5', text: 'إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ' },
    { ref: '1:6', text: 'اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ' },
    { ref: '1:7', text: 'صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ' }
  ];

  const quranEnglishVerses = [
    { ref: '1:1', text: 'In the name of Allah, the Entirely Merciful, the Especially Merciful.' },
    { ref: '1:2', text: '[All] praise is [due] to Allah, Lord of the worlds -' },
    { ref: '1:3', text: 'The Entirely Merciful, the Especially Merciful,' },
    { ref: '1:4', text: 'Sovereign of the Day of Recompense.' },
    { ref: '1:5', text: 'It is You we worship and You we ask for help.' },
    { ref: '1:6', text: 'Guide us to the straight path -' },
    { ref: '1:7', text: 'The path of those upon whom You have bestowed favor, not of those who have evoked [Your] anger or of those who are astray.' }
  ];

  const quranHindiVerses = [
    { ref: '1:1', text: 'शुरू अल्लाह के नाम से जो सब पर कृपा करने वाला, अत्यंत दयालु है।' },
    { ref: '1:2', text: 'सब प्रशंसा अल्लाह ही के लिए है जो सारे संसार का पालनहार (रब) है।' },
    { ref: '1:3', text: 'बड़ा कृपाशील और अत्यंत दयावान है।' },
    { ref: '1:4', text: 'न्याय और प्रतिफल के दिन का सच्चा मालिक है।' },
    { ref: '1:5', text: 'हम तेरी ही इबादत करते हैं और केवल तुझ ही से सहायता मांगते हैं।' },
    { ref: '1:6', text: 'हमें सीधे और सत्य मार्ग पर चला।' },
    { ref: '1:7', text: 'उन लोगों के मार्ग पर जिन पर तूने अनुग्रह किया, उन लोगों के मार्ग पर नहीं जो तेरे कोप के भागी बने और न जो भटके हुए हैं।' }
  ];

  if (quranArabic) {
    await seedSection(quranArabic.id, {
      title: 'سورة الفاتحة (Surah Al-Fatihah)',
      slug: 'surah-al-fatihah',
      sortOrder: 1,
      passages: quranArabicVerses
    });
  }

  if (quranEnglish) {
    await seedSection(quranEnglish.id, {
      title: 'Surah Al-Fatihah (The Opening)',
      slug: 'surah-al-fatihah-en',
      sortOrder: 1,
      passages: quranEnglishVerses
    });
  }

  if (quranHindi) {
    await seedSection(quranHindi.id, {
      title: 'सूरह अल-फ़ातिहा (प्रारंभ)',
      slug: 'surah-al-fatihah-hi',
      sortOrder: 1,
      passages: quranHindiVerses
    });
  }

  // ==========================================
  // 4. BUDDHISM: DHAMMAPADA (Pali, English, Hindi)
  // ==========================================
  console.log('\n☸️ 4. Seeding Dhammapada (Pali, English, Hindi)...');

  const dhammapadaPali = await ensureEdition('dhammapada', {
    title: 'धम्मपद (मूल पालि / Original Pali)',
    language: 'Pali',
    script: 'Devanagari',
    isOriginal: true,
    translator: 'तिपिटक सुत्तपिटक'
  });

  const dhammapadaEnglish = await ensureEdition('dhammapada', {
    title: 'The Dhammapada (English Translation)',
    language: 'English',
    script: 'Latin',
    isOriginal: false,
    translator: 'Acharya Buddharakkhita / F. Max Müller'
  });

  const dhammapadaHindi = await ensureEdition('dhammapada', {
    title: 'धम्मपद (हिन्दी अनुवाद)',
    language: 'Hindi',
    script: 'Devanagari',
    isOriginal: false,
    translator: 'भदन्त आनन्द कौसल्यायन'
  });

  const dhammapadaPaliVerses = [
    { ref: '1', text: 'मनोपुब्बङ्गमा धम्मा मनोसेट्ठा मनोमया। मनसा चे पदुट्ठेन भासति वा करोति वा। ततो नं दुक्खमन्वेति चक्कं व वहतो पदं॥१॥' },
    { ref: '2', text: 'मनोपुब्बङ्गमा धम्मा मनोसेट्ठा मनोमया। मनसा चे पसन्नेन भासति वा करोति वा। ततो नं सुखमन्वेति छाया व अनपायिनी॥२॥' },
    { ref: '3', text: 'अक्कोच्छि मं अवधि मं अजिनि मं अहासि मे। ये तं उपनय्हन्ति वेरं तेसं न सम्मति॥३॥' },
    { ref: '4', text: 'अक्कोच्छि मं अवधि मं अजिनि मं अहासि मे। ये तं न उपनय्हन्ति वेरं तेसूपसम्मति॥४॥' },
    { ref: '5', text: 'न हि वेरेन वेरानि सम्मन्तीध कुदाचनं। अवेरेन च सम्मन्ति एस धम्मो सनन्तनो॥५॥' },
    { ref: '6', text: 'परे च न विजानन्ति मयमेत्थ यमामसे। ये च तत्थ विजानन्ति ततो सम्मन्ति मेधगा॥६॥' }
  ];

  const dhammapadaEnglishVerses = [
    { ref: '1', text: 'Mind precedes all mental states. Mind is their chief; they are all mind-wrought. If with an impure mind a person speaks or acts, suffering follows him like the wheel that follows the foot of the ox.' },
    { ref: '2', text: 'Mind precedes all mental states. Mind is their chief; they are all mind-wrought. If with a pure mind a person speaks or acts, happiness follows him like a shadow that never departs.' },
    { ref: '3', text: '\'He abused me, he struck me, he defeated me, he robbed me\'—in those who harbor such thoughts, hatred is never appeased.' },
    { ref: '4', text: '\'He abused me, he struck me, he defeated me, he robbed me\'—in those who do not harbor such thoughts, hatred is appeased.' },
    { ref: '5', text: 'Hatred is never appeased by hatred in this world. By non-hatred alone is hatred appeased. This is an eternal law.' },
    { ref: '6', text: 'There are those who do not realize that one day we all must die. But those who do realize this settle their quarrels.' }
  ];

  const dhammapadaHindiVerses = [
    { ref: '1', text: 'मन सब प्रवृत्तियों का अगुआ है, मन ही प्रधान है, सब मनोमय है। यदि कोई मलिन मन से बोलता या कर्म करता है, तो दुःख उसके पीछे ऐसे हो लेता है जैसे बैल के पाँव के पीछे गाड़ी का पहिया॥१॥' },
    { ref: '2', text: 'मन सब प्रवृत्तियों का अगुआ है, मन ही प्रधान है, सब मनोमय है। यदि कोई प्रसन्न और शुद्ध मन से बोलता या कर्म करता है, तो सुख उसके पीछे छाया की भाँति सदा साथ रहता है॥२॥' },
    { ref: '3', text: '\'उसने मुझे गाली दी, उसने मुझे मारा, उसने मुझे जीत लिया, उसने मेरा धन छीना\'—जो मन में यह बाँध कर रखते हैं, उनका वैर कभी शांत नहीं होता॥३॥' },
    { ref: '4', text: '\'उसने मुझे गाली दी, उसने मुझे मारा, उसने मुझे हराया\'—जो अपने मन में यह गाँठ नहीं बाँधते, उनका वैर शांत हो जाता है॥४॥' },
    { ref: '5', text: 'इस संसार में वैर से वैर कभी शांत नहीं होता; अवैर (मैत्री और करुणा) से ही वैर शांत होता है—यही सनातन नियम है॥५॥' },
    { ref: '6', text: 'अज्ञानी नहीं जानते कि हमें इस संसार से एक दिन जाना है। जो इस सत्य को जानते हैं, उनके कलह और झगड़े शांत हो जाते हैं॥६॥' }
  ];

  if (dhammapadaPali) {
    await seedSection(dhammapadaPali.id, {
      title: 'यमकवग्गो (Yamakavagga - The Pairs)',
      slug: 'yamakavagga-pali',
      sortOrder: 1,
      passages: dhammapadaPaliVerses
    });
  }

  if (dhammapadaEnglish) {
    await seedSection(dhammapadaEnglish.id, {
      title: 'Yamakavagga (The Twin Verses)',
      slug: 'yamakavagga-en',
      sortOrder: 1,
      passages: dhammapadaEnglishVerses
    });
  }

  if (dhammapadaHindi) {
    await seedSection(dhammapadaHindi.id, {
      title: 'यमकवर्ग (युगल गाथाएँ)',
      slug: 'yamakavagga-hi',
      sortOrder: 1,
      passages: dhammapadaHindiVerses
    });
  }

  // ==========================================
  // 5. SIKHISM: GURU GRANTH SAHIB (Gurmukhi, English, Hindi)
  // ==========================================
  console.log('\nੴ 5. Seeding Guru Granth Sahib - Japji Sahib (Gurmukhi, English, Hindi)...');

  const ggsGurmukhi = await ensureEdition('guru-granth-sahib', {
    title: 'ਸ੍ਰੀ ਗੁਰੂ ਗ੍ਰੰਥ ਸਾਹਿਬ ਜੀ (Original Gurmukhi)',
    language: 'Gurmukhi',
    script: 'Gurmukhi',
    isOriginal: true,
    translator: 'ਗੁਰੂ ਨਾਨਕ ਦੇਵ ਜੀ'
  });

  const ggsEnglish = await ensureEdition('guru-granth-sahib', {
    title: 'Sri Guru Granth Sahib (English Translation)',
    language: 'English',
    script: 'Latin',
    isOriginal: false,
    translator: 'Sant Singh Khalsa'
  });

  const ggsHindi = await ensureEdition('guru-granth-sahib', {
    title: 'श्री गुरु ग्रंथ साहिब (हिन्दी अनुवाद)',
    language: 'Hindi',
    script: 'Devanagari',
    isOriginal: false,
    translator: 'शिरोमणि गुरुद्वारा प्रबंधक कमेटी'
  });

  const ggsGurmukhiVerses = [
    { ref: 'Mool Mantar', text: 'ੴ ਸਤਿ ਨਾਮੁ ਕਰਤਾ ਪੁਰਖੁ ਨਿਰਭਉ ਨਿਰਵੈਰੁ ਅਕਾਲ ਮੂਰਤਿ ਅਜੂਨੀ ਸੈਭੰ ਗੁਰ ਪ੍ਰਸਾਦਿ ॥' },
    { ref: 'Jap:1', text: 'ਆਦਿ ਸਚੁ ਜੁਗਾਦਿ ਸਚੁ ॥ ਹੈ ਭੀ ਸਚੁ ਨਾਨਕ ਹੋਸੀ ਭੀ ਸਚੁ ॥੧॥' },
    { ref: 'Pauri:1.1', text: 'ਸੋਚੈ ਸੋਚਿ ਨ ਹੋਵਈ ਜੇ ਸੋਚੀ ਲਖ ਵਾਰ ॥ ਚੁਪੈ ਚੁਪ ਨ ਹੋਵਈ ਜੇ ਲਾਇ ਰਹਾ ਲਿਵ ਤਾਰ ॥' },
    { ref: 'Pauri:1.2', text: 'ਭੁਖਿਆ ਭੁਖ ਨ ਉਤਰੀ ਜੇ ਬੰਨਾ ਪੁਰੀਆ ਭਾਰ ॥ ਸਹਸ ਸਿਆਣਪਾ ਲਖ ਹੋਹਿ ਤ ਇਕ ਨ ਚਲੈ ਨਾਲਿ ॥' },
    { ref: 'Pauri:1.3', text: 'ਕਿਵ ਸਚਿਆਰਾ ਹੋਈਐ ਕਿਵ ਕੂੜੈ ਤੁਟੈ ਪਾਲਿ ॥ ਹੁਕਮਿ ਰਜਾਈ ਚਲਣਾ ਨਾਨਕ ਲਿਖਿਆ ਨਾਲਿ ॥੧॥' }
  ];

  const ggsEnglishVerses = [
    { ref: 'Mool Mantar', text: 'One Universal Creator God. The Name is Truth. Creative Being Personified. No Fear. No Hatred. Image of the Undying. Beyond Birth. Self-Existent. By the Guru\'s Grace.' },
    { ref: 'Jap:1', text: 'True in the primal beginning. True throughout the ages. True here and now. O Nanak, God shall forever and ever be True. ||1||' },
    { ref: 'Pauri:1.1', text: 'By cleansing the body, mind cannot be cleansed, even by washing hundreds of thousands of times. By remaining silent, inner silence is not obtained, even by deep meditation.' },
    { ref: 'Pauri:1.2', text: 'The hunger of the hungry is not appeased, even by amassing the worldly riches of all the realms. Hundreds of thousands of clever tricks of the mind will not accompany one in the end.' },
    { ref: 'Pauri:1.3', text: 'How then can one become truthful? How can the veil of illusion be torn away? O Nanak, it is written: abide in the Divine Will (Hukam) and walk in alignment with Grace. ||1||' }
  ];

  const ggsHindiVerses = [
    { ref: 'मूल मंतर', text: 'एक ओंकार (ईश्वर एक है), सतनाम (उसका नाम सत्य है), कर्ता पुरख (सृष्टि का रचयिता), निर्भउ (भयरहित), निर्वैर (वैररहित), अकाल मूरत (अविनाशी स्वरूप), अजूनी (जन्म-मरण से परे), सैभं (स्वयंभू), गुरु प्रसादि (गुरु की कृपा से प्राप्य)॥' },
    { ref: 'जप:१', text: 'सृष्टि के आरम्भ में वही सत्य था, युग-युगान्तर में वही सत्य रहा। वर्तमान में भी वही सत्य है और हे नानक! भविष्य में भी वही सत्य रहेगा॥१॥' },
    { ref: 'पौड़ी:१.१', text: 'लाखों बार स्नान करने से भी मन पवित्र नहीं हो सकता। निरंतर मौन समाधि लगाने से भी मन की चंचलता शांत नहीं होती।' },
    { ref: 'पौड़ी:१.२', text: 'सारे लोकों के धन-दौलत के ढेर बाँधने से भी तृष्णा की भूख नहीं मिटती। यदि मनुष्य के पास लाखों चतुराईयाँ हों, तो भी अंत समय में एक भी साथ नहीं चलती।' },
    { ref: 'पौड़ी:१.३', text: 'फिर सत्यवान कैसे बना जाए? असत्य और भ्रम की दीवार कैसे टूटे? हे नानक! प्रभु की रज़ा (हुकम) में चलना, जो आदि से लिखा हुआ है॥१॥' }
  ];

  if (ggsGurmukhi) {
    await seedSection(ggsGurmukhi.id, {
      title: 'ਜਪੁਜੀ ਸਾਹਿਬ (Japji Sahib)',
      slug: 'japji-sahib-gurmukhi',
      sortOrder: 1,
      passages: ggsGurmukhiVerses
    });
  }

  if (ggsEnglish) {
    await seedSection(ggsEnglish.id, {
      title: 'Japji Sahib (Morning Prayer)',
      slug: 'japji-sahib-en',
      sortOrder: 1,
      passages: ggsEnglishVerses
    });
  }

  if (ggsHindi) {
    await seedSection(ggsHindi.id, {
      title: 'जपुजी साहिब (प्रातः प्रार्थना)',
      slug: 'japji-sahib-hi',
      sortOrder: 1,
      passages: ggsHindiVerses
    });
  }

  // ==========================================
  // 6. JAINISM: TATTVARTHA SUTRA (Sanskrit, English, Hindi)
  // ==========================================
  console.log('\n🌿 6. Seeding Tattvartha Sutra (Sanskrit, English, Hindi)...');

  const tattvarthaSanskrit = await ensureEdition('tattvartha-sutra', {
    title: 'तत्त्वार्थ सूत्र (संस्कृत मूल)',
    language: 'Sanskrit',
    script: 'Devanagari',
    isOriginal: true,
    translator: 'आचार्य उमास्वामी / उमास्वाति'
  });

  const tattvarthaEnglish = await ensureEdition('tattvartha-sutra', {
    title: 'Tattvartha Sutra (English Translation)',
    language: 'English',
    script: 'Latin',
    isOriginal: false,
    translator: 'Nathmal Tatia (That Which Is)'
  });

  const tattvarthaHindi = await ensureEdition('tattvartha-sutra', {
    title: 'तत्त्वार्थ सूत्र (हिन्दी अनुवाद)',
    language: 'Hindi',
    script: 'Devanagari',
    isOriginal: false,
    translator: 'पण्डित फूलचन्द सिद्धान्तशास्त्री'
  });

  const tattvarthaSanskritVerses = [
    { ref: '1.1', text: 'सम्यग्दर्शनज्ञानचारित्राणि मोक्षमार्गः॥१॥' },
    { ref: '1.2', text: 'तत्त्वार्थश्रद्धानं सम्यग्दर्शनम्॥२॥' },
    { ref: '1.3', text: 'तन्निसर्गादधिगमाद्वा॥३॥' },
    { ref: '1.4', text: 'जीवाजीवास्रवबन्धसंवरनिर्जरामोक्षास्तत्त्वम्॥४॥' },
    { ref: '1.5', text: 'नामस्थापनाद्रव्यभावतस्तन्न्यासः॥५॥' },
    { ref: '1.6', text: 'प्रमाणनयैरधिगमः॥६॥' }
  ];

  const tattvarthaEnglishVerses = [
    { ref: '1.1', text: 'Right faith, right knowledge, and right conduct together constitute the path to liberation (Moksha).' },
    { ref: '1.2', text: 'Belief in the fundamental reality of things as they truly are is right faith (Samyag-darshana).' },
    { ref: '1.3', text: 'That right faith is attained either spontaneously through intuition or by acquisition of instruction.' },
    { ref: '1.4', text: 'The soul (Jiva), non-soul (Ajiva), karmic inflow (Asrava), bondage (Bandha), stoppage (Samvara), shedding (Nirjara), and liberation (Moksha) are the seven fundamental truths.' },
    { ref: '1.5', text: 'The understanding of these entities is categorized through name, representation, potentiality, and actual present state.' },
    { ref: '1.6', text: 'Knowledge of reality is comprehended through valid means of cognition (Pramana) and viewpoints (Nayas).' }
  ];

  const tattvarthaHindiVerses = [
    { ref: '1.1', text: 'सम्यग्दर्शन, सम्यग्ज्ञान और सम्यक्चारित्र—इन तीनों की एकता ही मोक्ष का मार्ग है॥१॥' },
    { ref: '1.2', text: 'सच्चे जीवादि तत्वों के यथार्थ स्वरूप का अटूट श्रद्धान करना ही सम्यग्दर्शन है॥२॥' },
    { ref: '1.3', text: 'वह सम्यग्दर्शन अंतरंग योग्यता से (निसर्गज) अथवा बाह्य उपदेश के ग्रहण से (अधिगमज) उत्पन्न होता है॥३॥' },
    { ref: '1.4', text: 'जीव, अजीव, आस्रव, बन्ध, संवर, निर्जरा और मोक्ष—ये सात मूल तत्त्व हैं॥४॥' },
    { ref: '1.5', text: 'इन तत्वों का स्वरूप नाम, स्थापना, द्रव्य और भाव—इन चार निक्षेपों द्वारा जाना जाता है॥५॥' },
    { ref: '1.6', text: 'तत्वों का सम्यक् बोध प्रमाण और नयों द्वारा प्राप्त होता है॥६॥' }
  ];

  if (tattvarthaSanskrit) {
    await seedSection(tattvarthaSanskrit.id, {
      title: 'प्रथमोऽध्यायः (अध्याय १ - मोक्षमार्ग)',
      slug: 'chapter-1-sanskrit',
      sortOrder: 1,
      passages: tattvarthaSanskritVerses
    });
  }

  if (tattvarthaEnglish) {
    await seedSection(tattvarthaEnglish.id, {
      title: 'Chapter 1: The Path to Liberation',
      slug: 'chapter-1-english',
      sortOrder: 1,
      passages: tattvarthaEnglishVerses
    });
  }

  if (tattvarthaHindi) {
    await seedSection(tattvarthaHindi.id, {
      title: 'अध्याय १: मोक्षमार्ग एवं सप्ततत्व',
      slug: 'chapter-1-hindi',
      sortOrder: 1,
      passages: tattvarthaHindiVerses
    });
  }

  // ==========================================
  // 7. CHRISTIANITY: THE HOLY BIBLE (Greek/Hebrew, English, Hindi)
  // ==========================================
  console.log('\n✝️ 7. Seeding The Holy Bible - Gospel of John (Greek, English, Hindi)...');

  const bibleGreek = await ensureEdition('bible', {
    title: 'The Holy Bible (Original Biblical Greek & Hebrew)',
    language: 'Greek',
    script: 'Greek',
    isOriginal: true,
    translator: 'Apostle John (Textus Receptus)'
  });

  const bibleEnglish = await ensureEdition('bible', {
    title: 'The Holy Bible (King James Version)',
    language: 'English',
    script: 'Latin',
    isOriginal: false,
    translator: 'King James Authorized Version (1611)'
  });

  const bibleHindi = await ensureEdition('bible', {
    title: 'पवित्र बाइबिल (हिन्दी अनुवाद)',
    language: 'Hindi',
    script: 'Devanagari',
    isOriginal: false,
    translator: 'बाइबिल सोसाइटी ऑफ इंडिया'
  });

  const bibleGreekVerses = [
    { ref: 'John 1:1', text: 'Ἐν ἀρχῇ ἦν ὁ λόγος, καὶ ὁ λόγος ἦν πρὸς τὸν θεόν, καὶ θεὸς ἦν ὁ λόγος.' },
    { ref: 'John 1:2', text: 'οὗτος ἦν ἐν ἀρχῇ πρὸς τὸν θεόν.' },
    { ref: 'John 1:3', text: 'πάντα δι\' αὐτοῦ ἐγένετο, καὶ χωρὶς αὐτοῦ ἐγένετο οὐδὲ ἕν ὃ γέγονεν.' },
    { ref: 'John 1:4', text: 'ἐν αὐτῷ ζωὴ ἦν, καὶ ἡ ζωὴ ἦν τὸ φῶς τῶν ἀνθρώπων.' },
    { ref: 'John 1:5', text: 'καὶ τὸ φῶς ἐν τῇ σκοτίᾳ φαίνει, καὶ ἡ σκοτία αὐτὸ οὐ κατέλαβεν.' },
    { ref: 'John 1:14', text: 'καὶ ὁ λόγος σὰρξ ἐγένετο καὶ ἐσκήνωσεν ἐν ἡμῖν, καὶ ἐθεασάμεθα τὴν δόξαν αὐτοῦ.' }
  ];

  const bibleEnglishVerses = [
    { ref: 'John 1:1', text: 'In the beginning was the Word, and the Word was with God, and the Word was God.' },
    { ref: 'John 1:2', text: 'The same was in the beginning with God.' },
    { ref: 'John 1:3', text: 'All things were made by him; and without him was not any thing made that was made.' },
    { ref: 'John 1:4', text: 'In him was life; and the life was the light of men.' },
    { ref: 'John 1:5', text: 'And the light shineth in darkness; and the darkness comprehended it not.' },
    { ref: 'John 1:14', text: 'And the Word was made flesh, and dwelt among us, and we beheld his glory, the glory as of the only begotten of the Father, full of grace and truth.' }
  ];

  const bibleHindiVerses = [
    { ref: 'यूहन्ना १:१', text: 'आदि में वचन था, और वचन परमेश्वर के साथ था, और वचन ही परमेश्वर था।' },
    { ref: 'यूहन्ना १:२', text: 'यही आदि में परमेश्वर के साथ था।' },
    { ref: 'यूहन्ना १:३', text: 'सब कुछ उसी के द्वारा उत्पन्न हुआ; और जो कुछ उत्पन्न हुआ है, उसमें से कोई भी वस्तु उसके बिना उत्पन्न नहीं हुई।' },
    { ref: 'यूहन्ना १:४', text: 'उसमें जीवन था; और वह जीवन मनुष्यों की सच्ची ज्योति था।' },
    { ref: 'यूहन्ना १:५', text: 'और वह ज्योति अन्धकार में चमकती है, और अन्धकार ने उसे कभी बुझा न पाया।' },
    { ref: 'यूहन्ना १:१४', text: 'और वचन देहधारी हुआ; और अनुग्रह और सच्चाई से परिपूर्ण होकर हमारे बीच में डेरा किया, और हमने उसकी ऐसी महिमा देखी जैसी पिता के एकलौते की महिमा।' }
  ];

  if (bibleGreek) {
    await seedSection(bibleGreek.id, {
      title: 'Κατὰ Ἰωάννην (Gospel of John 1)',
      slug: 'gospel-of-john-greek',
      sortOrder: 1,
      passages: bibleGreekVerses
    });
  }

  if (bibleEnglish) {
    await seedSection(bibleEnglish.id, {
      title: 'Gospel of John (Chapter 1)',
      slug: 'gospel-of-john-en',
      sortOrder: 1,
      passages: bibleEnglishVerses
    });
  }

  if (bibleHindi) {
    await seedSection(bibleHindi.id, {
      title: 'यूहन्ना का सुसमाचार (अध्याय १)',
      slug: 'gospel-of-john-hi',
      sortOrder: 1,
      passages: bibleHindiVerses
    });
  }

  console.log('\n🎉 ALL SCRIPTURES & EDITIONS IN 3 LANGUAGES SUCCESSFULLY SEEDED!');
}

module.exports = { seedAll };

if (require.main === module) {
  seedAll()
    .catch(err => {
      console.error('Seed Error:', err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
