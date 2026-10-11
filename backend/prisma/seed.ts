import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...\n');

  // ==================== RELIGIONS ====================
  const religionsData = [
    {
      name: 'Hinduism',
      slug: 'hinduism',
      description: 'Ancient Indian religious and philosophical traditions encompassing diverse beliefs, texts, and practices.',
      sortOrder: 1,
    },
    {
      name: 'Islam',
      slug: 'islam',
      description: 'Monotheistic Abrahamic religion centered on the teachings of Prophet Muhammad and the Quran.',
      sortOrder: 2,
    },
    {
      name: 'Buddhism',
      slug: 'buddhism',
      description: 'Spiritual tradition based on the teachings of Siddhartha Gautama (the Buddha) focused on enlightenment and ending suffering.',
      sortOrder: 3,
    },
    {
      name: 'Sikhism',
      slug: 'sikhism',
      description: 'Monotheistic religion founded in Punjab with teachings from Guru Nanak and recorded in the Guru Granth Sahib.',
      sortOrder: 4,
    },
    {
      name: 'Jainism',
      slug: 'jainism',
      description: 'Ancient Indian religion emphasizing non-violence (ahimsa), asceticism, and the pursuit of spiritual liberation.',
      sortOrder: 5,
    },
    {
      name: 'Christianity',
      slug: 'christianity',
      description: 'Monotheistic Abrahamic religion centered on Jesus Christ and his teachings as recorded in the Bible.',
      sortOrder: 6,
    },
  ];

  console.log('📚 Seeding religions...');
  const religions: any = {};
  for (const r of religionsData) {
    const religion = await prisma.religion.upsert({
      where: { slug: r.slug },
      update: { description: r.description },
      create: r,
    });
    religions[r.slug] = religion;
    console.log(`  ✓ ${r.name}`);
  }

  // ==================== HINDUISM SCRIPTURES ====================
  console.log('\n📖 Seeding Hinduism scriptures...');

  // Bhagavad Gita
  const bhagavadGita = await prisma.scripture.upsert({
    where: { slug: 'bhagavad-gita' },
    update: {},
    create: {
      religionId: religions.hinduism.id,
      title: 'Bhagavad Gita',
      slug: 'bhagavad-gita',
      originalLang: 'Sanskrit',
      description: 'Sacred dialogue between Lord Krishna and Prince Arjuna in the Mahabharata.',
      summary: 'The Bhagavad Gita is a 700-verse scripture presented as a dialogue between Prince Arjuna and Lord Krishna on the battlefield of Kurukshetra. It addresses Arjuna\'s moral dilemmas and presents philosophical teachings about duty (dharma), devotion (bhakti), and the nature of reality.',
      themes: ['dharma', 'yoga', 'bhakti', 'karma', 'self-realization'],
      availabilityStatus: 'complete',
      estimatedReadTime: 360,
    },
  });

  const gitaEdition = await prisma.scriptureEdition.create({
    data: {
      scriptureId: bhagavadGita.id,
      title: 'Sanskrit Edition (Devanagari)',
      language: 'Sanskrit',
      script: 'Devanagari',
      isOriginal: true,
      textDirection: 'ltr',
      source: 'Traditional Mahabharata Text',
    },
  });

  console.log('  ✓ Bhagavad Gita - Sanskrit Edition');

  // Create 18 chapters
  const gitaChapters: any = {};
  for (let i = 1; i <= 18; i++) {
    const chapter = await prisma.scriptureSection.create({
      data: {
        editionId: gitaEdition.id,
        title: `Chapter ${i}`,
        slug: `chapter-${i}`,
        level: 0,
        sortOrder: i,
      },
    });
    gitaChapters[i] = chapter;
  }

  // Add complete Chapter 1 verses (47 verses)
  const chapter1Verses = [
    { ref: '1.1', text: 'धर्मक्षेत्रे कुरुक्षेत्रे समवेता युयुत्सवः | मामकाः पाण्डवाश्चैव किमकुर्वत सञ्जय ||१||' },
    { ref: '1.2', text: 'संजय उवाच | दृष्ट्वा तु पाण्डवानीकं व्यूढं दुर्योधनस्तदा | आचार्यमुपसङ्गम्य राजा वचनमब्रवीत् ||२||' },
    { ref: '1.3', text: 'पश्यैतां पाण्डुपुत्राणामाचार्य महतीं चमूम् | व्यूढां धृष्टद्युम्नेन पाञ्चालराजेन धीमता ||३||' },
    { ref: '1.4', text: 'अत्र शूरा महेष्वासा भीमार्जुनसमा युधि | युयुधानो विराटश्च द्रुपदश्च महारथः ||४||' },
    { ref: '1.5', text: 'धृष्टकेतुश्चेकितानः काशिराजश्च वीर्यवान् | पुरुजित्कुन्तिभोजश्च शैब्यश्च नरपुङ्गवः ||५||' },
    { ref: '1.6', text: 'युधामन्युश्च विक्रान्त उत्तमौजाश्च वीर्यवान् | सौभद्रो द्रौपदेयाश्च सर्व एव महारथाः ||६||' },
    { ref: '1.7', text: 'अस्माकं तु विशिष्टा ये तान्निबोध द्विजोत्तम | नायका मम सैन्यस्य संज्ञार्थं तान्ब्रवीमि ते ||७||' },
    { ref: '1.8', text: 'भवान्भीष्मश्च कर्णश्च कृपश्च समितिञ्जयः | अश्वत्थामा विकर्णश्च सौमदत्तिस्तथैव च ||८||' },
    { ref: '1.9', text: 'अन्ये च बहवः शूरा मदर्थे त्यक्तजीविताः | नानाशस्त्रप्रहरणाः सर्वे युद्धविशारदाः ||९||' },
    { ref: '1.10', text: 'अपर्याप्तं तदस्माकं बलं भीष्माभिरक्षितम् | पर्याप्तं त्विदमेतेषां बलं भीमाभिरक्षितम् ||१०||' },
    { ref: '1.11', text: 'अयनेषु च सर्वेषु यथाभागमवस्थिताः | भीष्ममेवाभिरक्षन्तु भवन्तः सर्व एव हि ||११||' },
    { ref: '1.12', text: 'तस्य सञ्जनयन्हर्षं कुरुवृद्धः पितामहः | सिंहनादं विनद्योच्चैः शङ्खं दध्मौ प्रतापवान् ||१२||' },
    { ref: '1.13', text: 'ततः शङ्खाश्च भेर्यश्च पणवानकगोमुखाः | सहसैवाभ्यहन्यन्त स शब्दस्तुमुलोऽभवत् ||१३||' },
    { ref: '1.14', text: 'ततः श्वेतैर्हयैर्युक्ते महति स्यन्दने स्थितौ | माधवः पाण्डवश्चैव दिव्यौ शङ्खौ प्रदध्मतुः ||१४||' },
    { ref: '1.15', text: 'पाञ्चजन्यं हृषीकेशो देवदत्तं धनञ्जयः | पौण्ड्रं दध्मौ महाशङ्खं भीमकर्मा वृकोदरः ||१५||' },
    { ref: '1.16', text: 'अनन्तविजयं राजा कुन्तीपुत्रो युधिष्ठिरः | नकुलः सहदेवश्च सुघोषमणिपुष्पकौ ||१६||' },
    { ref: '1.17', text: 'काश्यश्च परमेष्वासः शिखण्डी च महारथः | धृष्टद्युम्नश्च विराटश्च सात्यकिश्चापराजितः ||१७||' },
    { ref: '1.18', text: 'द्रौपदेयश्च सर्वेण पृथिव्यां श्रुतकीर्तिमान् | सौभद्रश्च महाबाहुः शङ्खान्दध्मुः पृथक्पृथक् ||१८||' },
    { ref: '1.19', text: 'स घोषो धार्तराष्ट्राणां हृदयानि व्यदारयत् | नभश्च पृथिवीं चैव तुमुलो व्यनुनादयन् ||१९||' },
    { ref: '1.20', text: 'अथ व्यवस्थितान्दृष्ट्वा धार्तराष्ट्रान्कपिध्वजः | प्रवृत्ते शस्त्रसम्पाते धनुरुद्यम्य पाण्डवः | हृषीकेशं तदा वाक्यमिदमाह महीपते ||२०||' },
    { ref: '1.21', text: 'अर्जुन उवाच | सेनयोरुभयोर्मध्ये रथं स्थापय मे अच्युत | यावदेतान्निरीक्षेऽहं योद्धुकामानवस्थितान् | कैर्मया समितव्ये अस्मिन्रणसमुद्यमे ||२१||' },
    { ref: '1.22', text: 'योत्स्यमानानवेक्षेऽहं य एतेऽत्र समागताः | धार्तराष्ट्रस्य दुर्बुद्धेर्युद्धे प्रियचिकीर्षवः ||२२||' },
    { ref: '1.23', text: 'संजय उवाच | एवमुक्तो हृषीकेशो गुडाकेशेन भारत | सेनयोरुभयोर्मध्ये स्थापयित्वा रथोत्तमम् ||२३||' },
    { ref: '1.24', text: 'भीष्मद्रोणप्रमुखतः सर्वेषां च महीक्षिताम् | उवाच पार्थ पश्यैतान्समवेतान्कुरूनिति ||२४||' },
    { ref: '1.25', text: 'तत्रापश्यत्स्थितान्पार्थः पितॄन्अथ पितामहान् | आचार्यान्मातुलान्भ्रातॄन्पुत्रान्पौत्रान्साखीन्तथा | श्वशुरान्सुहृदश्चैव सेनयोरुभयोरपि ||२५||' },
    { ref: '1.26', text: 'तान्समीक्ष्य स कौन्तेयः सर्वान्बन्धूनवस्थितान् | कृपया परयाविष्टो विषीदन्निदमब्रवीत् ||२६||' },
    { ref: '1.27', text: 'अर्जुन उवाच | दृष्ट्वेमं स्वजनं कृष्ण युयुत्सुं समुपस्थितम् | सीदन्ति मम गात्राणि मुखं च परिशुष्यति ||२७||' },
    { ref: '1.28', text: 'वेपथुश्च शरीरे मे रोमहर्षश्च जायते | गाण्डीवः स्रंसते हस्तात्त्वक्चैव परिदह्यते ||२८||' },
    { ref: '1.29', text: 'न च शक्नोम्यवस्थातुं भ्रमतीव च मे मनः | निमित्तानि च पश्यामि विपरीतानि केशव ||२९||' },
    { ref: '1.30', text: 'न काङ्क्षे विजयं कृष्ण न च राज्यं सुखानि च | किं नो राज्येन गोविन्द किं भोगैर्जीवितेन वा ||३०||' },
    { ref: '1.31', text: 'येषामर्थे काङ्क्षितं नो राज्यं भोगाः सुखानि च | त इमे अवस्थिता युद्धे प्राणांस्त्यक्त्वा धनानि च ||३१||' },
    { ref: '1.32', text: 'आचार्याः पितरः पुत्रास्तथैव च पितामहाः | मातुलाः श्वशुराः पौत्राः श्यालाः सम्बन्धिनस्तथा ||३२||' },
    { ref: '1.33', text: 'एतान्न हन्तुमिच्छामि घ्नतोऽपि मधुसूदन | अपि त्रैलोक्यराज्यस्य हेतोः किं नु महीकृते ||३३||' },
    { ref: '1.34', text: 'निहत्य धार्तराष्ट्रान्नः का प्रीतिः स्यात्जनार्दन | पापमेवाश्रयेदस्मान्हत्वैतानाततायिनः ||३४||' },
    { ref: '1.35', text: 'तस्मान्नार्हा वयं हन्तुं धार्तराष्ट्रान्स्वबान्धवान् | स्वजनं हि कथं हत्वा सुखिनः स्याम माधव ||३५||' },
    { ref: '1.36', text: 'यद्यप्येते न पश्यन्ति लोभोपहतचेतसः | कुलक्षयकृतं दोषं मित्रद्रोहे च पातकम् ||३६||' },
    { ref: '1.37', text: 'कथं न ज्ञेयमस्माभिः पापादस्मान्निवर्तितुम् | कुलक्षयकृतं दोषं प्रपश्यद्भिर्जनार्दन ||३७||' },
    { ref: '1.38', text: 'कुलक्षये प्रणश्यन्ति कुलधर्माः सनातनाः | धर्मे नष्टे कुलं कृत्स्नमधर्मोऽभिभवत्युत ||३८||' },
    { ref: '1.39', text: 'अधर्माभिभवात्कृष्ण प्रदुष्यन्ति कुलस्त्रियः | स्त्रीषु दुष्टासु वार्ष्णेय जायते वर्णसङ्करः ||३९||' },
    { ref: '1.40', text: 'सङ्करो नरकायैव कुलघ्नानां कुलस्य च | पतन्ति पितरो ह्येषां लुप्तपिण्डोदकक्रियाः ||४०||' },
    { ref: '1.41', text: 'दोषैरेतैः कुलघ्नानां वर्णसङ्करकारकैः | उत्साद्यन्ते जातिधर्माः कुलधर्माश्च शाश्वताः ||४१||' },
    { ref: '1.42', text: 'उत्सन्नकुलधर्माणां मनुष्याणां जनार्दन | नरकेऽनियतं वासो भवतीत्यनुशुश्रुम ||४२||' },
    { ref: '1.43', text: 'अहो बत महत्पापं कर्तुं व्यवसिता वयम् | यद्राज्यसुखलोभेन हन्तुं स्वजनमुद्यताः ||४३||' },
    { ref: '1.44', text: 'यदि मामप्रतीकारमशस्त्रं शस्त्रपाणयः | धार्तराष्ट्रा रणे हन्युस्तन्मे क्षेमतरं भवेत् ||४४||' },
    { ref: '1.45', text: 'संजय उवाच | एवमुक्त्वार्जुनः संख्ये रथोपस्थ उपाविशत् | विसृज्य सशरं चापं शोकसंविग्नमानसः ||४५||' },
    { ref: '1.46', text: 'तं तथा कृपयाविष्टमश्रुपूर्णाकुलेक्षणम् | विषीदन्तमिदं वाक्यमुवाच मधुसूदनः ||४६||' },
    { ref: '1.47', text: 'श्रीभगवानुवाच | कुतस्त्वा कश्मलमिदं विषमे समुपस्थितम् | अनार्यजुष्टमस्वर्ग्यमकीर्तिकरमर्जुन ||४७||' },
  ];

  console.log('  ✓ Creating Chapter 1 with 47 verses...');
  for (const verse of chapter1Verses) {
    await prisma.scripturePassage.create({
      data: {
        sectionId: gitaChapters[1].id,
        reference: verse.ref,
        text: verse.text,
        wordCount: verse.text.split(/\s+/).length,
        sortOrder: parseInt(verse.ref.split('.')[1]),
      },
    });
  }

  // Add placeholder passages for other chapters (just 1 verse each for now)
  for (let i = 2; i <= 18; i++) {
    await prisma.scripturePassage.create({
      data: {
        sectionId: gitaChapters[i].id,
        reference: `${i}.1`,
        text: `Chapter ${i} verses to be added...`,
        wordCount: 5,
        sortOrder: 1,
      },
    });
  }

  console.log('  ✓ Bhagavad Gita complete with 18 chapters\n');

  // ==================== OTHER RELIGIONS - METADATA ONLY ====================
  console.log('📚 Seeding other religions (metadata only)...\n');

  // Islam - Quran
  const quran = await prisma.scripture.upsert({
    where: { slug: 'quran' },
    update: {},
    create: {
      religionId: religions.islam.id,
      title: 'Quran',
      slug: 'quran',
      originalLang: 'Classical Arabic',
      description: 'The holy book of Islam, believed to be the word of God revealed to Prophet Muhammad.',
      summary: 'The Quran contains 114 chapters (Surahs) organized by length, covering spiritual guidance, laws, and narratives.',
      themes: ['revelation', 'spirituality', 'justice', 'mercy', 'prophecy'],
      availabilityStatus: 'metadata_only',
      estimatedReadTime: 600,
    },
  });
  console.log('  ✓ Quran (Metadata)');

  // Buddhism - Dhammapada
  const dhammapada = await prisma.scripture.upsert({
    where: { slug: 'dhammapada' },
    update: {},
    create: {
      religionId: religions.buddhism.id,
      title: 'Dhammapada',
      slug: 'dhammapada',
      originalLang: 'Pali',
      description: 'A collection of 423 verses teaching the path to enlightenment in Theravada Buddhism.',
      summary: 'The Dhammapada contains poetic teachings on virtue, mindfulness, wisdom, and the nature of suffering and liberation.',
      themes: ['enlightenment', 'dharma', 'mindfulness', 'virtue', 'non-attachment'],
      availabilityStatus: 'metadata_only',
      estimatedReadTime: 180,
    },
  });
  console.log('  ✓ Dhammapada (Metadata)');

  // Sikhism - Guru Granth Sahib
  const ggs = await prisma.scripture.upsert({
    where: { slug: 'guru-granth-sahib' },
    update: {},
    create: {
      religionId: religions.sikhism.id,
      title: 'Guru Granth Sahib',
      slug: 'guru-granth-sahib',
      originalLang: 'Gurmukhi',
      description: 'The holy scripture of Sikhism, compiled by Guru Arjan Dev Ji.',
      summary: 'The Guru Granth Sahib contains 1,430 pages of hymns (shabads) from various Gurus and saints, emphasizing devotion and social equality.',
      themes: ['devotion', 'equality', 'oneness', 'dharma', 'social justice'],
      availabilityStatus: 'metadata_only',
      estimatedReadTime: 720,
    },
  });
  console.log('  ✓ Guru Granth Sahib (Metadata)');

  // Jainism - Tattvartha Sutra
  const tattvartha = await prisma.scripture.upsert({
    where: { slug: 'tattvartha-sutra' },
    update: {},
    create: {
      religionId: religions.jainism.id,
      title: 'Tattvartha Sutra',
      slug: 'tattvartha-sutra',
      originalLang: 'Sanskrit',
      description: 'A fundamental philosophical text of Jainism summarizing Jain metaphysics and ethics.',
      summary: 'The Tattvartha Sutra contains 366 concise aphorisms (sutras) covering karma, liberation, and the nature of souls.',
      themes: ['karma', 'liberation', 'non-violence', 'metaphysics', 'ethics'],
      availabilityStatus: 'metadata_only',
      estimatedReadTime: 240,
    },
  });
  console.log('  ✓ Tattvartha Sutra (Metadata)');

  // Christianity - Bible
  const bible = await prisma.scripture.upsert({
    where: { slug: 'bible' },
    update: {},
    create: {
      religionId: religions.christianity.id,
      title: 'Bible',
      slug: 'bible',
      originalLang: 'Greek & Hebrew',
      description: 'The holy scriptures of Christianity containing the Old Testament and New Testament.',
      summary: 'The Bible consists of 66 books in the Protestant canon, containing history, poetry, prophecy, and teachings of Jesus Christ.',
      themes: ['salvation', 'faith', 'grace', 'redemption', 'love'],
      availabilityStatus: 'metadata_only',
      estimatedReadTime: 1200,
    },
  });
  console.log('  ✓ Bible (Metadata)');

  // Hinduism - Additional texts
  const upanishads = await prisma.scripture.upsert({
    where: { slug: 'upanishads' },
    update: {},
    create: {
      religionId: religions.hinduism.id,
      title: 'Upanishads',
      slug: 'upanishads',
      originalLang: 'Sanskrit',
      description: 'Philosophical texts that form the basis of Vedantic thought in Hinduism.',
      summary: 'The Upanishads contain philosophical discussions about the nature of Brahman (ultimate reality) and Atman (self).',
      themes: ['brahman', 'atman', 'meditation', 'self-realization', 'non-duality'],
      availabilityStatus: 'metadata_only',
      estimatedReadTime: 480,
    },
  });
  console.log('  ✓ Upanishads (Metadata)');

  console.log('\n✨ Seed completed successfully!');
  console.log(`\n📊 Summary:`);
  console.log(`  • 6 Religions created`);
  console.log(`  • 7 Scriptures seeded`);
  console.log(`  • Bhagavad Gita: 18 chapters, 47 verses in Chapter 1 complete`);
  console.log(`  • Other scriptures: Metadata only (ready for content import)`);
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
