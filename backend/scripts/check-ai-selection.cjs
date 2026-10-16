// Optional live provider check; uses one existing section and writes no user data.
process.env.NODE_ENV = 'test';
const prisma = require('../dist/lib/prisma').default;
const { aiController } = require('../dist/controllers/aiController');
(async () => {
  const section = await prisma.scriptureSection.findFirst({
    where: { edition: { contentStatus: 'complete' }, passages: { some: {} } },
    orderBy: { sortOrder: 'asc' }, select: { id: true, editionId: true, title: true },
  });
  if (!section) throw new Error('No verified section available');
  console.log('Selected section: ' + section.title);
  let failure;
  await aiController.summarize({ body: { editionId: section.editionId, sectionId: section.id, responseLang: 'hi' } },
    { json(result) { console.log(result.content); } }, error => { failure = error; });
  if (failure) throw failure;
})().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
