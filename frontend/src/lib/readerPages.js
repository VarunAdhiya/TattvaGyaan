// Stable, two-passage pages: changing the font or viewport never changes a URL.
export function buildReaderPages(sections, scannedPageCount = 0) {
  const pages = [{ type: 'cover' }, { type: 'toc' }];
  if (scannedPageCount) {
    for (let pageNumber = 1; pageNumber <= scannedPageCount; pageNumber += 1) {
      pages.push({ type: 'scan', pageNumber });
    }
    return pages;
  }
  for (const section of sections) {
    const count = section._count?.passages ?? section.passages?.length ?? 0;
    for (let offset = 0; offset < count; offset += 2) {
      pages.push({ type: 'content', sectionId: section.id, sectionTitle: section.title, sectionPage: offset / 2 + 1 });
    }
  }
  return pages;
}

export function spreadStart(page, wide) {
  return wide && page > 0 ? page - ((page - 1) % 2) : page;
}
