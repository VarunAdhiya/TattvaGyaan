import React from 'react';
import { BookOpen, Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-amber-950 text-amber-100/80 border-t border-amber-900/40 py-10 px-4 mt-auto font-sans">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-amber-700 flex items-center justify-center text-amber-100">
              <BookOpen className="w-4 h-4" />
            </div>
            <span className="font-serif text-lg font-bold text-amber-50">TattvaGyaan</span>
          </div>
          <p className="text-xs text-amber-200/70 leading-relaxed">
            A digital library preserving original-language religious scriptures across six ancient traditions: Hinduism, Islam, Buddhism, Sikhism, Jainism, and Christianity.
          </p>
        </div>

        <div>
          <h4 className="font-serif font-semibold text-amber-100 mb-3 text-sm">Six Traditions</h4>
          <ul className="text-xs space-y-1.5 text-amber-200/70">
            <li>Hinduism (Sanskrit)</li>
            <li>Islam (Classical Arabic)</li>
            <li>Buddhism (Pali & Sanskrit)</li>
            <li>Sikhism (Gurmukhi)</li>
            <li>Jainism (Prakrit & Sanskrit)</li>
            <li>Christianity (Hebrew, Greek, Aramaic)</li>
          </ul>
        </div>

        <div>
          <h4 className="font-serif font-semibold text-amber-100 mb-3 text-sm">Features</h4>
          <ul className="text-xs space-y-1.5 text-amber-200/70">
            <li>Realistic 3D Book Reader</li>
            <li>Multilingual OpenAI Assistant</li>
            <li>Personalized Reading Plans</li>
            <li>Unicode & Script Shaping</li>
            <li>RAG Scripture Explanations</li>
          </ul>
        </div>

        <div>
          <h4 className="font-serif font-semibold text-amber-100 mb-3 text-sm">Ethical Guidelines</h4>
          <p className="text-xs text-amber-200/70 leading-relaxed">
            Original texts are verified and source-grounded. AI content is clearly demarcated as explanatory material.
          </p>
          <div className="mt-4 text-[11px] text-amber-300/50 flex items-center gap-1">
            Built with respect for all spiritual traditions.
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto border-t border-amber-900/40 mt-8 pt-6 text-center text-xs text-amber-300/50">
        &copy; {new Date().getFullYear()} TattvaGyaan Digital Scripture Library. All rights reserved.
      </div>
    </footer>
  );
}
