// Original brief retellings. This selected path is not an exhaustive biography
// or a claim that all Hindu traditions share one chronology.
const source = (chapter, title) => ({ title, url: `https://vedabase.io/en/library/${chapter}/` });

export const krishnaSources = {
  'krishna-birth': source('sb/10/3', 'Bhagavata Purana · 10.3: Krishna’s birth'),
  'krishna-gokul': source('sb/10/8', 'Bhagavata Purana · 10.8: Childhood in Gokul'),
  'krishna-flute': source('sb/10/21', 'Bhagavata Purana · 10.21: The flute of Krishna'),
  'krishna-govardhan': source('sb/10/25', 'Bhagavata Purana · 10.25: Govardhan'),
  'krishna-mathura': source('sb/10/44', 'Bhagavata Purana · 10.44: The fall of Kamsa'),
  'krishna-dwarka': source('sb/10/80', 'Bhagavata Purana · 10.80: Sudama’s visit'),
  'krishna-gita': source('bg/2/47', 'Bhagavad Gita · 2.47: Action and its fruits'),
  'krishna-farewell': source('sb/11/30', 'Bhagavata Purana · 11.30: The farewell at Prabhasa'),
};

const chapters = [
  {
    id: 'mathura-birth', title: 'Hope in the darkness', hindi: 'मथुरा में अवतरण', place: 'Mathura · A sacred midnight',
    sceneAlt: 'Devaki cradles newborn Krishna while Vasudeva prepares a woven basket beside a lamp and loose prison shackles.',
    story: 'In a Mathura prison, Devaki and Vasudeva welcome Krishna. To protect him from Kamsa, Vasudeva carries the newborn across the Yamuna to the home of Nanda and Yashoda in Gokul.',
    insight: 'Hope', reflection: 'Remember a small light that helped you through uncertainty.',
    detail: 'The Bhagavata tells of a divine manifestation followed by the form of a newborn. This scene shows the family before the crossing of the Yamuna.',
    source: 'krishna-birth',
  },
  {
    id: 'gokul', title: 'Held in a mother’s love', hindi: 'यशोदा के नंदलाल', place: 'Gokul · A playful morning',
    sceneAlt: 'Young Krishna sits beside a butter pot as Yashoda lovingly rests a hand on his shoulder, with a calf and milk vessels nearby.',
    story: 'In Gokul, Yashoda raises Krishna amid calves, milk pots, and childhood mischief. His love of butter fills the village with stories; the divine is encountered in the tenderness of everyday care.',
    insight: 'Tenderness', reflection: 'Offer someone your full attention in an ordinary moment today.',
    detail: 'The childhood episodes celebrate vatsalya, the devotion expressed through parental affection. Krishna’s early years include many other stories beyond this selected scene.',
    source: 'krishna-gokul',
  },
  {
    id: 'vrindavan', title: 'The forest hears a flute', hindi: 'वृंदावन की मधुर बंसी', place: 'Vrindavan · Golden afternoon',
    sceneAlt: 'Krishna plays his bamboo flute beneath a kadamba tree as two gopis and a white cow listen beside flowers.',
    story: 'Among Vrindavan’s groves and grazing cattle, Krishna plays his flute. The gopis speak of its enchanting music, imagining birds, rivers, and all of nature listening in devotion.',
    insight: 'Devotion', reflection: 'Listen quietly for a moment. What draws your attention toward beauty?',
    detail: 'This chapter draws on the gopis’ poetic descriptions of Krishna’s flute in the Bhagavata. Its imagery expresses devotional longing rather than an ordinary account of a single afternoon.',
    source: 'krishna-flute',
  },
  {
    id: 'govardhan', title: 'Shelter beneath the hill', hindi: 'गोवर्धन की शरण', place: 'Govardhan · Through the storm',
    sceneAlt: 'Krishna raises Govardhan Hill with one hand, sheltering village families, a cow and a calf beneath its rocky slopes.',
    story: 'When Indra’s storm threatens the village, Krishna lifts Govardhan Hill. For seven days, the people and their cattle gather beneath it, finding shelter together in his care.',
    insight: 'Protection', reflection: 'Consider how your strength can become shelter for someone else.',
    detail: 'The Bhagavata places this miracle after the villagers honour Govardhan at Krishna’s urging. The episode joins care for the community with the humbling of pride.',
    source: 'krishna-govardhan',
  },
  {
    id: 'mathura-return', title: 'A family set free', hindi: 'मथुरा में मुक्ति', place: 'Mathura · After Kamsa’s fall',
    sceneAlt: 'Krishna and Balarama reunite with Devaki and Vasudeva, opening their chains beside a stone bench.',
    story: 'Krishna and Balarama return to Mathura, where Krishna defeats Kamsa and ends his rule. They release Devaki and Vasudeva from their chains, turning a long separation into a tender reunion.',
    insight: 'Courage', reflection: 'Think of a responsibility that asks for both courage and compassion.',
    detail: 'The source includes the arena confrontation and Kamsa’s death. This illustration focuses on the reunion that follows, without depicting violence.',
    source: 'krishna-mathura',
  },
  {
    id: 'dwarka', title: 'The wealth of friendship', hindi: 'सुदामा का स्वागत', place: 'Dwarka · A friend comes home',
    sceneAlt: 'Royal Krishna kneels to wash Sudama’s feet in a brass basin while his old friend holds a small bundle of rice.',
    story: 'In Dwarka, Krishna welcomes his old friend Sudama, who arrives in simple clothes carrying a modest gift. Krishna honours him with an embrace and washes his feet, placing friendship above wealth.',
    insight: 'Humility', reflection: 'Welcome someone for who they are, without measuring what they bring.',
    detail: 'The Bhagavata recalls their shared time as students. Sudama’s visit is one glimpse of Krishna’s life in Dwarka; many royal and family episodes lie beyond this journey.',
    source: 'krishna-dwarka',
  },
  {
    id: 'gita', title: 'Wisdom before the battle', hindi: 'कुरुक्षेत्र का उपदेश', place: 'Kurukshetra · A moment of stillness',
    sceneAlt: 'Krishna teaches Arjuna in a stationary carved chariot, with Arjuna’s bow lowered as he listens.',
    story: 'At Kurukshetra, Arjuna pauses before battle, troubled by the conflict ahead. Krishna guides him through the Bhagavad Gita, teaching devoted action without clinging to its rewards or retreating into inaction.',
    insight: 'Purpose', reflection: 'Choose one action you can do with care, without trying to control every outcome.',
    detail: 'Verse 2.47 is one doorway into a much wider dialogue on duty, knowledge, meditation, and devotion. This short reflection does not replace reading the Gita in context.',
    source: 'krishna-gita',
  },
  {
    id: 'prabhasa', title: 'A compassionate farewell', hindi: 'प्रभास में अंतिम लीला', place: 'Prabhasa · The quiet of dusk',
    sceneAlt: 'Krishna sits peacefully beneath a sacred fig tree, reassuring the kneeling hunter Jara whose bow rests on the ground.',
    story: 'Near Prabhasa, the hunter Jara mistakes Krishna’s foot for a deer and releases an arrow. Krishna comforts the remorseful hunter; his earthly lila draws to its close, while his teachings and devotion endure.',
    insight: 'Compassion', reflection: 'Carry one lesson from these stories into a generous act of your own.',
    detail: 'Chapters 11.30–31 tell the farewell and divine departure. The scene depicts forgiveness without injury. Vaishnava traditions understand this as the close of his earthly lila, not the extinction of the divine.',
    source: 'krishna-farewell',
    additionalSource: source('sb/11/31', 'Bhagavata Purana · 11.31: Krishna’s departure'),
  },
];

const positions = [[9, 66], [21, 42], [33, 60], [45, 34], [57, 54], [69, 29], [81, 49], [92, 24]];
export const krishnaLevels = chapters.map((chapter, index) => ({
  ...chapter,
  image: `/journeys/krishna/${chapter.id}.png`, alt: chapter.sceneAlt,
  sceneImage: `/journeys/krishna/${chapter.id}.png`, position: positions[index],
}));
