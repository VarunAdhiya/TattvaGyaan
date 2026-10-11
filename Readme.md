Build an AI-Powered Multilingual Religious Scripture Library
Act as a senior full-stack engineer, software architect, and UI/UX designer. Build a production-oriented MVP for a web application that allows users to read religious scriptures in their original languages, experience a realistic 3D book-reading interface, create personalized reading plans, and use OpenAI to understand scripture passages in their preferred language.
Do not build just a landing page or static pro
totype. Implement the actual frontend, backend, database, authentication, scripture retrieval, reading progress, reading plans, and AI integration.
1. Technology Stack
Use this exact technology stack:
Frontend
React with JavaScript.
Vite as the frontend build tool.
Tailwind CSS for styling.
React Router for navigation.
shadcn/ui for reusable UI components where appropriate.
Lucide React for icons.
A suitable React page-flip library, such as react-pageflip, for the realistic 3D book-reading experience.
Backend
Node.js.
Express.js.
TypeScript.
REST APIs.
Zod for request validation.
Database
PostgreSQL.
Prisma ORM.
Supabase 
Database migrations and seed scripts.
AI
OpenAI API, accessed exclusively through the Express backend.
Use the official OpenAI SDK.
Configure the model through environment variables rather than hardcoding a model name throughout the application.
Use retrieval-augmented generation (RAG) for scripture-specific questions and explanations.
Authentication
Secure registration and login.
Password hashing using Argon2id or an established equivalent.
Secure HTTP-only cookies and server-side session management, or another appropriately secured authentication approach.
Never expose session secrets, database credentials, or OpenAI API keys to the frontend.
Organize the repository into clearly separated frontend and backend directories. Keep database access, business logic, route handling, AI logic, and content ingestion in separate modules.
2. Product Vision
The application is a digital library for six religious traditions:
Hinduism
Islam
Buddhism
Sikhism
Jainism
Christianity
Users should be able to explore these traditions without being required to identify with any religion.
The primary experience should be:
Sign up → Dashboard → Select religion → Explore scriptures → Open scripture → Read in an immersive 3D book → Ask AI about a passage → Create and follow a reading plan.
Prioritize an elegant, immersive, and readable experience. The application should feel like a modern digital library rather than a generic admin dashboard.
3. Authentication and User Dashboard
Implement:
Registration.
Login and logout.
Forgot-password and password-reset flows.
Protected routes.
Persistent user sessions.
User profile and language preferences.
After login, redirect the user to the dashboard.
The dashboard should contain:
Welcome section
Personalized greeting.
Global scripture search.
Religion selection dropdown.
Religion selector
Include exactly these initial options:
Hinduism
Islam
Buddhism
Sikhism
Jainism
Christianity
Selecting a religion should dynamically display the scriptures associated with that tradition.
Continue reading
Show the user's recently opened scriptures, last-read passage, saved position, and reading progress.
My reading plans
Show active plans, daily reading assignments, completion percentages, and upcoming tasks.
Explore scriptures
Display searchable scripture cards containing the title, tradition, original language, short description, and available editions.
Provide proper loading, empty, and error states.
4. Scripture Library and Original-Language Content
The initial content strategy must prioritize original-language scripture texts.
Examples of languages and traditions include:
Hinduism: Sanskrit.
Islam: Classical Arabic.
Buddhism: Pali, Sanskrit, and other languages appropriate to the selected tradition and text.
Sikhism: Gurmukhi and relevant original-language forms of the compositions.
Jainism: Prakrit, Ardhamagadhi, Sanskrit, and other relevant languages, depending on the text.
Christianity: Biblical Hebrew, Biblical Aramaic, and Koine Greek, depending on the text and canon.
Do not assume every text has one universally agreed original language or edition. Record the source tradition, edition, language, translator or editor when applicable, and provenance.
Start the catalog with important texts, including:
Hinduism: Bhagavad Gita, Mahabharata, Ramayana, Upanishads, Vedas.
Islam: Quran and clearly identified Hadith collections.
Buddhism: Dhammapada and selected collections from the Pali Canon.
Sikhism: Guru Granth Sahib.
Jainism: Tattvartha Sutra and selected Agama texts.
Christianity: Bible, with individual books and the relevant textual traditions identified.
This is the initial catalog, not a claim that all of these complete texts will be available immediately.
Scripture content requirements
Build a proper content ingestion pipeline that can import large scripture collections from verified, legally usable sources.
Each imported collection must preserve:
Original text.
Language and script.
Edition or source identifier.
Structural hierarchy.
Book, chapter, section, verse, or equivalent references where applicable.
Sequence order.
Source attribution.
Licensing and provenance metadata.
Do not use AI to fabricate missing scripture passages.
Do not silently label a partial text as a complete scripture. Display a clear content-availability status, such as Complete, Partial, or Metadata Only.
For the initial MVP, prioritize one fully verified, legally usable scripture in its original language and one additional scripture collection if practical. Build the architecture so the remaining traditions and texts can be imported progressively.
The library must support different organizational structures. Do not force every text into a Bible-style book/chapter/verse model.
5. Scripture Details Page
When the user selects a scripture, open a details page containing:
Scripture title.
Tradition.
Original language.
Source and edition.
Availability status.
Background and context.
A short summary, clearly labeled as explanatory content.
Main themes and structure.
Estimated reading time, where meaningful.
Available original-language text and translations.
Start Reading button.
Create Reading Plan button.
Distinguish established historical information from traditional accounts and contested scholarly interpretations.
Never invent a complete scripture summary without sufficient source material.
6. Realistic 3D Book Reader
This is a core differentiating feature. Give it high implementation priority.
When the user clicks Start Reading, open a dedicated, immersive reader that resembles a real physical book.
Visual design
Implement:
Realistic two-page book spreads on desktop.
Animated page turning with natural direction and motion.
Visible page edges, subtle shadows, and paper texture.
Elegant typography and comfortable line spacing.
A central book spine or equivalent visual depth.
Responsive single-page reading on smaller screens.
Smooth animations without blocking reading interactions.
Use a well-maintained React-compatible page-flip library where possible. Customize its appearance rather than building an expensive 3D rendering system unnecessarily.
The text must remain legible throughout page transitions. The visual effect should not compromise accessibility or performance.
Reader controls
Include:
Previous and next page.
Table of contents.
Chapter and section navigation.
Scripture search.
Font-size controls.
Line-spacing controls.
Light, dark, and sepia reading themes.
Original-language text rendering.
Support for right-to-left reading where applicable.
A way to switch between available editions or translations.
Keyboard navigation.
For Sanskrit and other Indic scripts, ensure proper Unicode handling and appropriate font rendering. For Arabic and other right-to-left scripts, ensure correct shaping, direction, and reading order.
Do not use an English-centric layout for every script.
Page layout and persistence
Generate page content from the actual scripture text and the reader's layout. Do not invent traditional page numbers.
Persist the reader position, including the relevant passage reference and page position where practical.
When a user reopens a scripture, allow them to continue from their previous reading position.
Provide:
Bookmarks.
Text highlighting.
Private notes.
Passage selection.
Ask AI about this passage.
Summarize this section.
When font size, viewport size, or other layout settings change, recalculate page boundaries and preserve the user's approximate reading position.
7. OpenAI-Powered Scripture Assistant
Integrate OpenAI into the Express backend. The React application must never call the OpenAI API directly with a secret key.
Implement a reusable AI service that can be configured through environment variables.
Core functionality
Users should be able to:
Summarize a scripture.
Summarize a chapter or section.
Summarize the current reader page.
Explain a selected passage in simple language.
Explain difficult vocabulary.
Provide historical or philosophical context.
Compare passages.
Ask follow-up questions.
Request an explanation in a language different from the scripture's language.
Example:
A user is reading a Sanskrit passage from the Bhagavad Gita. They select a verse and ask, "Explain this in simple Marathi."
The AI should receive the selected source text and reference, retrieve relevant context if necessary, and return an explanation in Marathi.
The original Sanskrit text must remain unchanged.
Context-aware questions
When the user invokes AI from the reader, pass the necessary context:
Scripture identifier.
Edition.
Source language.
Chapter or section.
Selected passage.
Relevant surrounding passages.
Requested response language.
Requested explanation style.
Do not require the user to repeat this information in every question.
For general questions without a selected passage, allow the user to choose a scripture or explicitly ask a broader question.
Multilingual responses
Allow the user to independently select:
Scripture language.
Translation, if available.
AI response language.
Initially provide a language-selection mechanism that can accommodate English, Hindi, Marathi, Sanskrit, Arabic, Urdu, Punjabi, and other languages as model capabilities permit.
The interface should make it clear when a requested language or translation is unavailable or may be less reliable.
Do not treat an AI-generated translation as an authoritative edition of the scripture.
RAG and source grounding
Implement scripture-grounded retrieval.
The workflow should be:
Receive the user's question.
Identify the scripture and relevant passage.
Retrieve matching scripture content from PostgreSQL or the configured retrieval index.
Include relevant surrounding context.
Send the retrieved source material and instructions to OpenAI.
Generate an explanation or summary.
Return the answer with references to the relevant source passages.
Use exact references whenever available, such as book, chapter, verse, or section.
For keyword search, implement PostgreSQL full-text search where suitable. For multilingual semantic retrieval, use a compatible embedding and vector-search solution, such as PostgreSQL with pgvector, if justified by the selected content and retrieval needs.
Keep original text, translations, embeddings, and generated summaries distinguishable.
Do not send an entire enormous scripture to the model in one request. Use passage retrieval and hierarchical summarization.
AI behavior
The assistant must:
Ground scripture-specific claims in retrieved source material.
Avoid fabricating verses or citations.
Admit when the source content is unavailable.
Distinguish direct quotations, paraphrases, and interpretations.
Acknowledge that interpretations can vary between traditions and schools of thought.
Explain the difference between textual meaning and commentary where appropriate.
Respond respectfully to interfaith questions.
Clearly label AI-generated content as explanatory material, not original scripture.
Chat interface
Implement:
Chat history.
Streaming responses where supported by the selected OpenAI API.
Suggested questions.
Language selection.
Copy response.
Regenerate response.
Source references.
Links that take users back to the relevant passage.
Loading, timeout, rate-limit, and failure states.
Allow users to control whether their chat history is retained.
8. Personalized Reading Plans
Users should be able to create a plan to finish a selected scripture within a chosen number of days.
User flow
Select a scripture.
Select an edition.
Choose the target number of days.
Optionally specify available reading time per day.
Optionally choose reading days and rest days.
Generate the schedule.
Review and save the plan.
Scheduling logic
Implement the scheduler in the backend.
Use the actual content structure and, where practical, word count or estimated reading duration.
For example, if a text contains 100 similarly sized chapters and the user wants to finish it in 20 days, an initial schedule may assign approximately five chapters per day.
However, the scheduler should account for unequal chapter lengths and should prefer natural section boundaries.
The schedule must not accidentally skip or duplicate passages.
If a user requests an unrealistic completion time, display a warning and offer an alternative.
Reading plan dashboard
Display:
Daily assigned readings.
Estimated duration.
Completed and pending tasks.
Overall completion percentage.
Start date and target completion date.
Allow users to mark assignments as completed, pause or resume plans, and adjust their target date.
When a plan changes, preserve historical completion records and recalculate future assignments appropriately.
9. Database Architecture
Use PostgreSQL with Prisma for Suprabase whichever is better.
Create normalized tables or equivalent relational models for:
User.
Session.
Religion or tradition.
Scripture.
ScriptureEdition.
ScriptureSection.
ScripturePassage.
Source and licensing metadata.
ReadingProgress.
ReadingPlan.
ReadingPlanItem.
Bookmark.
Highlight.
Note.
ChatConversation.
ChatMessage.
Include:
Primary keys and foreign keys.
Appropriate indexes.
Unique constraints.
Creation and modification timestamps.
Ownership relationships.
Database migrations.
Seed scripts.
Use a flexible hierarchy for scripture sections and passages.
A passage should belong to the correct edition and retain its original reference. Support languages and textual structures that do not naturally map to chapters and verses.
Avoid storing the same scripture text repeatedly for every user.
10. Backend Architecture and API
Build an Express REST API with clear separation between routes, controllers, services, repositories, and validation schemas where appropriate.
Suggested API groups:
/api/auth
/api/users
/api/religions
/api/scriptures
/api/scripture-editions
/api/passages
/api/search
/api/reading-progress
/api/reading-plans
/api/bookmarks
/api/notes
/api/ai
Implement pagination and targeted passage retrieval.
All user-owned data must be protected by server-side authorization checks. Do not trust user IDs supplied by the client as proof of ownership.
Validate all request bodies, query parameters, and route parameters.
Use consistent error responses and appropriate HTTP status codes.
11. UI/UX Requirements
Use a cohesive visual design with:
A premium digital-library aesthetic.
Warm, paper-inspired reading surfaces.
Clean dashboard cards.
Subtle transitions.
Responsive navigation.
Clear typography.
Properly rendered original-language scripts.
Accessible controls and contrast.
The dashboard should be modern and clean. The reader should feel immersive and separate from the rest of the interface.
Avoid overcrowding the reader with dashboard components.
Ensure responsive behavior for desktop, tablet, and mobile.
Do not use stereotypical or disrespectful religious imagery.
12. Security and Performance
Implement:
Secure authentication and session management.
HTTP-only, appropriately configured cookies.
CSRF protection when required by the authentication approach.
Server-side validation.
Rate limiting for AI endpoints.
Safe rendering of scripture content and user notes.
Server-side secret management.
Appropriate database indexes.
Efficient passage retrieval.
Caching where appropriate.
Graceful AI API error handling.
Never expose OpenAI credentials in frontend code or public environment variables.
Treat religion preferences, reading history, bookmarks, and conversations as private user data.
13. MVP Scope and Priorities
Do not try to complete every advanced feature before delivering a working application.
Implement the MVP in this order:
Phase 1 — Foundation
React/Vite frontend.
Express backend.
PostgreSQL and Prisma or SupraBase.
Authentication.
Dashboard.
Religion selector.
Scripture catalog and metadata.
Phase 2 — Original-language reading
Import one complete, verified, legally usable original-language scripture.
Implement scripture details.
Implement the realistic 3D book reader.
Add passage navigation.
Save reading progress.
Add basic bookmarks.
Phase 3 — Reading plans
Create reading plans.
Generate daily assignments.
Track completion.
Persist and adjust plans.
Phase 4 — OpenAI integration
Passage explanations.
Section summaries.
Language selection.
RAG-based retrieval.
Source references.
Chat history and streaming where supported.
Phase 5 — Expansion and polish
Additional scripture collections.
Additional original languages.
Improved search.
Responsive refinements.
Accessibility and automated tests.
Create a catalog containing all six religions early, even if some entries initially have metadata only. Never misrepresent metadata-only entries as readable complete texts.
14. Environment and Documentation
Create .env.example with placeholders for the database connection, session/authentication secrets, OpenAI API key, and configurable model.
Provide:
Installation instructions.
Database migration commands.
Database seeding commands.
Scripture import instructions.
Frontend and backend development commands.
Test commands.
Instructions for configuring OpenAI.
Documentation of content sources and licensing.
A clear list of features and content that are not yet implemented.
Do not commit real credentials.
15. Testing and Acceptance Criteria
The MVP should pass these end-to-end checks:
A user can register, log in, and log out.
The dashboard displays all six religion options.
Selecting a religion filters the available scripture catalog.
A user can open an available scripture and inspect its edition and source.
A user can read the imported original-language text in the 3D book interface.
Page turning and chapter navigation work correctly.
Changing the reader settings does not lose the current passage.
Reading progress persists after logout and login.
A user can create a reading plan and track completion.
A user can select a passage and request an OpenAI explanation in a different language.
The AI uses actual source passages and provides grounded references.
Unavailable content and AI errors are handled honestly.
One user cannot access another user's private data.
The application runs using the documented setup instructions.
Write tests for critical backend logic, especially authentication, authorization, scheduling, passage retrieval, and AI error handling.
16. Instructions for Claude Code
Start by inspecting the project directory.
Then:
Explain the proposed architecture and repository structure briefly.
Identify any technical risks, especially scripture content ingestion, multilingual text rendering, and 3D pagination.
Create a phased implementation checklist.
Implement the application rather than stopping at the plan.
Test each major feature as it is implemented.
Fix errors before marking a phase complete.
Keep the implementation modular and avoid unnecessary abstractions.
Do not claim a feature works until it has been implemented and tested.
Do not fabricate scripture content or use fake AI responses as a substitute for integration.
If a required API key or content source is unavailable, implement the integration point and document the setup required.
The immediate goal is a working MVP with secure authentication, a real scripture catalog, one complete original-language scripture, an immersive 3D reader, saved progress, personalized reading plans, and a functioning OpenAI-powered multilingual scripture assistant.
Once the MVP works end to end, expand the content library and additional capabilities incrementally.
