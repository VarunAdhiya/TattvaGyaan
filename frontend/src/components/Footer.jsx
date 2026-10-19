import React from 'react';
import { BookOpen } from 'lucide-react';

export default function Footer() {
  const [year] = React.useState(() => new Date().getFullYear());
  return (
    <footer className="sacred-footer bg-amber-950 text-amber-100/80 border-t border-amber-900/40 py-10 px-4 mt-auto font-sans">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-amber-700 flex items-center justify-center text-amber-100">
              <BookOpen className="w-4 h-4" />
            </div>
            <span className="font-serif text-lg font-bold text-amber-50">TattvaGyaan</span>
          </div>
          <p className="text-xs text-amber-200/70 leading-relaxed">
            A Hindi scripture library with attributed editions, personal notes, and explanations grounded in the text you select.
          </p>
        </div>

        <div>
          <h4 className="font-serif font-semibold text-amber-100 mb-3 text-sm">Your Library</h4>
          <ul className="text-xs space-y-1.5 text-amber-200/70">
            <li>Hindi editions</li>
            <li>Source and translation credits</li>
            <li>Clear content availability</li>
          </ul>
        </div>

        <div>
          <h4 className="font-serif font-semibold text-amber-100 mb-3 text-sm">Features</h4>
          <ul className="text-xs space-y-1.5 text-amber-200/70">
            <li>Realistic 3D Book Reader</li>
            <li>AI Passage Explanations</li>
            <li>Personalized Reading Plans</li>
            <li>Private Notes and Bookmarks</li>
            <li>Direct Page Navigation</li>
          </ul>
        </div>

        <div>
          <h4 className="font-serif font-semibold text-amber-100 mb-3 text-sm">Ethical Guidelines</h4>
          <p className="text-xs text-amber-200/70 leading-relaxed">
            Each edition shows its source and verification status. AI explanations are separate from scripture text.
          </p>
          <div className="mt-4 text-[11px] text-amber-300/50 flex items-center gap-1">
            Built with respect for all spiritual traditions.
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto border-t border-amber-900/40 mt-8 pt-6 text-center text-xs text-amber-300/50">
        &copy; {year} TattvaGyaan Digital Scripture Library. All rights reserved.
      </div>
    </footer>
  );
}
