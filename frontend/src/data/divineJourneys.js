export const journeySources = {
  birth: { title: 'Amritapuri · The birth and symbolism of Ganesha', url: 'https://www.amritapuri.org/3714/ganesha.aum' },
  wisdom: { title: 'Hindu American Foundation · Ganesha', url: 'https://www.hinduamerican.org/blog/5-things-to-know-about-ganesha/' },
  festival: { title: 'Hindu American Foundation · Ganesha Chaturthi', url: 'https://www.hinduamerican.org/blog/ganesha-chaturthi-the-day-to-celebrate-ganeshas-birth' },
};

export const deities = [
  {
    id: 'ganesha', name: 'Ganesha', honorific: 'Shri Ganesha', hindi: 'श्री गणेश',
    title: 'Every beginning has a blessing.',
    description: 'Meet the beloved son of Shiva and Parvati, revered for wisdom and the removal of obstacles. Follow his sacred stories from a mother’s love to a presence welcomed in homes and hearts.',
    image: '/journeys/ganesha.png', alt: 'Ganesha seated beside a lotus pond in a sunlit Himalayan temple garden.',
    quality: 'Wisdom & new beginnings', prayer: '/mantras?deity=Ganesha',
  },
  {
    id: 'shiva', name: 'Shiva', honorific: 'Lord Shiva', hindi: 'महादेव',
    title: 'Find stillness within.',
    description: 'Mahadeva is revered as the great yogi and the lord of transformation. His stories invite reflection on stillness, compassion, and the renewal that follows change.',
    image: '/journeys/shiva.png', alt: 'Shiva meditating on Mount Kailash with his trident and Nandi nearby.',
    quality: 'Stillness & transformation', prayer: '/mantras?deity=Shiva',
  },
  {
    id: 'krishna', name: 'Krishna', honorific: 'Shri Krishna', hindi: 'श्री कृष्ण',
    title: 'Let devotion lead the way.',
    description: 'From the beloved flute-player of Vrindavan to Arjuna’s guide in the Bhagavad Gita, Krishna is celebrated through stories of love, dharma, and devoted action.',
    image: '/journeys/krishna.png', alt: 'Krishna playing his flute in the gardens of Vrindavan beside a white cow.',
    quality: 'Love & dharma', prayer: '/bhajans?deity=Krishna',
  },
  {
    id: 'hanuman', name: 'Hanuman', honorific: 'Shri Hanuman', hindi: 'श्री हनुमान',
    title: 'Discover the strength of devotion.',
    description: 'Hanuman’s devotion to Rama unites courage with humility. Remembered for his service in the Ramayana, he inspires steadfastness, kindness, and strength used for others.',
    image: '/journeys/hanuman.png', alt: 'Hanuman with a golden gada in a peaceful sacred forest.',
    quality: 'Courage & service', prayer: '/chalisas/hanuman-chalisa',
  },
];

// Original short retellings, not scripture quotations. These episodes belong to
// different traditions; their teaching order is not a canonical chronology.
export const ganeshaLevels = [
  {
    id: 'birth', title: 'A mother’s creation', hindi: 'माँ का आशीर्वाद', place: 'Mount Kailash · Dawn',
    image: '/journeys/birth.png', alt: 'Parvati blessing the human child she has created, in a pavilion on Mount Kailash.',
    sceneImage: '/journeys/realistic/birth.png', sceneAlt: 'Parvati lovingly blessing her human-headed son beside a brass bowl of turmeric paste.',
    story: 'In one beloved telling, Parvati shapes a boy from the paste used for her bath and gives him life. In the quiet of Kailash, a mother welcomes her son.',
    insight: 'Love', reflection: 'Remember someone whose care gave you the courage to begin.',
    detail: 'This telling follows the tradition in which Ganesha first has a human head. Other Hindu texts describe his origin differently.',
    source: 'birth', position: [9, 66],
  },
  {
    id: 'guardian', title: 'The faithful guardian', hindi: 'कर्तव्य का संकल्प', place: 'Kailash courtyard · Dusk',
    image: '/journeys/threshold.png', alt: 'The young human-headed Ganesha guarding a doorway as Shiva arrives with Nandi.',
    sceneImage: '/journeys/realistic/guardian.png', sceneAlt: 'The human-headed boy guards the threshold with a staff as Shiva and Nandi approach.',
    story: 'Parvati asks her son to guard her doorway. When Shiva returns, the boy keeps his promise and refuses entry; neither yet understands their relationship.',
    insight: 'Dedication', reflection: 'Think of a promise you would like to keep with greater care.',
    detail: 'The next episode includes the traditional account of Ganesha losing his head and being restored. The illustrations keep this event non-graphic.',
    source: 'birth', position: [21, 42],
  },
  {
    id: 'renewal', title: 'A new beginning', hindi: 'गजानन का उदय', place: 'Mount Kailash · First light',
    image: '/journeys/family.png', alt: 'Elephant-headed Ganesha reunited with Shiva and Parvati in the gardens of Kailash.',
    sceneImage: '/journeys/realistic/renewal.png', sceneAlt: 'Restored with an elephant head, young Ganesha is lovingly welcomed by Shiva and Parvati.',
    story: 'In the conflict, Shiva severs the boy’s head, and Parvati grieves. Shiva restores him to life with an elephant’s head, welcoming him as his son.',
    insight: 'Renewal', reflection: 'Pause with the possibility of healing after a difficult moment.',
    detail: 'His restoration is part of this origin story, not the end of his life. Hindu traditions continue to revere Ganesha as a living divine presence.',
    source: 'birth', position: [33, 60],
  },
  {
    id: 'ganapati', title: 'First among beginnings', hindi: 'प्रथम पूज्य गणपति', place: 'The sacred garden · Morning',
    image: '/journeys/ganesha.png', alt: 'Ganesha giving his blessing from a lotus pedestal, with his mouse nearby.',
    sceneImage: '/journeys/realistic/ganapati.png', sceneAlt: 'Ganesha blessing new beginnings from a lotus throne while ganas offer flowers and his mouse rests nearby.',
    story: 'Ganesha becomes Ganapati, lord of Shiva’s ganas. Honoured before new undertakings, he is invoked by devotees seeking a clear path and a steady mind.',
    insight: 'Intention', reflection: 'Choose one intention to carry into your next beginning.',
    detail: 'The tradition of first worship connects the origin story with everyday devotional practice.',
    source: 'birth', position: [45, 34],
  },
  {
    id: 'wisdom', title: 'The world within a circle', hindi: 'प्रेम में पूरा संसार', place: 'The divine family · Golden morning',
    image: '/journeys/family.png', alt: 'Ganesha walking around his parents Shiva and Parvati; a peacock stands beside the family.',
    sceneImage: '/journeys/realistic/wisdom.png', sceneAlt: 'Ganesha walks around his seated parents Shiva and Parvati along a circle of marigold blossoms.',
    story: 'Challenged to circle the world, Kartikeya sets off on his journey. Ganesha circles Shiva and Parvati instead, recognising the world in his parents.',
    insight: 'Wisdom', reflection: 'What is close to you that you sometimes forget to value?',
    detail: 'This popular story celebrates insight and reverence. Versions differ in the occasion and the reward.',
    source: 'wisdom', position: [57, 54],
  },
  {
    id: 'scribe', title: 'A tusk becomes a pen', hindi: 'ज्ञान की साधना', place: 'Vyasa’s hermitage · Lamplight',
    image: '/journeys/scribe.png', alt: 'Ganesha writing on palm leaves while sage Vyasa dictates in a forest hermitage.',
    sceneImage: '/journeys/realistic/scribe.png', sceneAlt: 'Ganesha writes on palm leaves with his broken tusk as the silver-bearded Vyasa dictates by lamplight.',
    story: 'In a cherished telling, Vyasa dictates the Mahabharata and Ganesha writes with his tusk. Their agreement joins an unbroken flow of words with understanding before writing.',
    insight: 'Understanding', reflection: 'Let one thought settle fully before you move to the next.',
    detail: 'The scribe story is a traditional account associated with the Mahabharata. There are also other explanations of Ganesha’s broken tusk.',
    source: 'wisdom', position: [69, 29],
  },
  {
    id: 'symbols', title: 'Wisdom in every detail', hindi: 'रूप में छिपी सीख', place: 'The lotus sanctuary · Stillness',
    image: '/journeys/ganesha.png', alt: 'Ganesha holding a sweet and lotus, with a small mouse beside his pedestal.',
    sceneImage: '/journeys/realistic/symbols.png', sceneAlt: 'Ganesha offers a blessing with a lotus, modak sweets and a small mouse at his feet.',
    story: 'Ganesha’s elephant head evokes wisdom; the small mouse invites reflection on the restless mind. His blessing hand reassures, while the sweet recalls the fruit of disciplined practice.',
    insight: 'Awareness', reflection: 'Notice one small distraction, then gently return your attention.',
    detail: 'These are devotional interpretations of his symbols. Meanings and the objects held in his hands vary across images and traditions.',
    source: 'wisdom', position: [81, 49],
  },
  {
    id: 'presence', title: 'A presence that stays', hindi: 'गणपति बप्पा मोरया', place: 'The river ghats · Sunset',
    image: '/journeys/river.png', alt: 'Devotees celebrating Ganesha at sunset on temple-lined river ghats with flowers and lamps.',
    sceneImage: '/journeys/realistic/presence.png', sceneAlt: 'Devotees carry a garlanded clay Ganesha idol toward the river steps with an aarti lamp at sunset.',
    story: 'At Ganesh Chaturthi, devotees welcome Ganesha with prayers and offerings. Visarjan returns the festival image to water; devotion continues, with hope for his return.',
    insight: 'Devotion', reflection: 'Carry one lesson from this journey into a kind action today.',
    detail: 'Visarjan is a ritual farewell to the image, not Ganesha’s death. This journey ends in continuing devotion rather than an invented final life event.',
    source: 'festival', position: [92, 24],
  },
];
