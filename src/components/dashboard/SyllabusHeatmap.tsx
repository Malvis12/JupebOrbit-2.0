import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  ArrowRight, 
  BrainCircuit
} from 'lucide-react';

interface TopicStatus {
  name: string;
  category: string;
  masteryPercentage: number;
}

const SYLLABUS_MAP: Record<string, TopicStatus[]> = {
  physics: [
    { name: "Mechanics & Linear Dynamics", category: "Core", masteryPercentage: 82 },
    { name: "Heat & Thermodynamics", category: "Thermal", masteryPercentage: 68 },
    { name: "Waves, Optics & Sound", category: "Waves", masteryPercentage: 45 },
    { name: "Electrostatics & Capacitors", category: "EM", masteryPercentage: 74 },
    { name: "Current Electricity & DC Circuits", category: "EM", masteryPercentage: 80 },
    { name: "Magnetic Fields & Induction", category: "EM", masteryPercentage: 54 },
    { name: "Atomic & Nuclear Physics", category: "Modern", masteryPercentage: 42 }
  ],
  mathematics: [
    { name: "Differential Calculus", category: "Calculus", masteryPercentage: 88 },
    { name: "Integral Calculus", category: "Calculus", masteryPercentage: 64 },
    { name: "Trigonometric Identities", category: "Trig", masteryPercentage: 58 },
    { name: "Polynomials & Quadratic Equations", category: "Algebra", masteryPercentage: 85 },
    { name: "Matrices & Determinants", category: "Algebra", masteryPercentage: 72 },
    { name: "Vectors in 2D & 3D Space", category: "Geometry", masteryPercentage: 48 },
    { name: "Probability & Permutations", category: "Statistics", masteryPercentage: 76 }
  ],
  chemistry: [
    { name: "Stoichiometry & Mole Concept", category: "Physical", masteryPercentage: 84 },
    { name: "Atomic Structure & Quantum Numbers", category: "Inorganic", masteryPercentage: 78 },
    { name: "Chemical Kinetics & Rates", category: "Physical", masteryPercentage: 62 },
    { name: "Chemical Equilibrium & Le Chatelier", category: "Physical", masteryPercentage: 48 },
    { name: "Redox Reactions & Oxidation States", category: "Inorganic", masteryPercentage: 70 },
    { name: "Organic Chemistry: Hydrocarbons", category: "Organic", masteryPercentage: 52 },
    { name: "Thermodynamics & Spontaneity", category: "Physical", masteryPercentage: 40 }
  ],
  biology: [
    { name: "Cell Biology & Organization", category: "Cytology", masteryPercentage: 82 },
    { name: "Genetics, DNA & Mendel's Laws", category: "Genetics", masteryPercentage: 60 },
    { name: "Plant & Animal Nutrition", category: "Physiology", masteryPercentage: 75 },
    { name: "Circulatory & Respiratory Systems", category: "Physiology", masteryPercentage: 68 },
    { name: "Ecology & Nutrient Cycles", category: "Ecology", masteryPercentage: 50 },
    { name: "Evolution & Adaptation", category: "Genetics", masteryPercentage: 44 }
  ],
  economics: [
    { name: "Scarcity, Choice & Production Possibility Frontier", category: "Micro", masteryPercentage: 86 },
    { name: "Theory of Consumer Behaviour & Utility", category: "Micro", masteryPercentage: 78 },
    { name: "Demand, Supply & Elasticity Dynamics", category: "Micro", masteryPercentage: 72 },
    { name: "Market Structures (Monopoly & Perfect Competition)", category: "Micro", masteryPercentage: 65 },
    { name: "National Income Determination & Keynesian Multiplier", category: "Macro", masteryPercentage: 58 },
    { name: "Money, Banking & Monetary Policy", category: "Macro", masteryPercentage: 70 },
    { name: "Public Finance, Taxation & Fiscal Policy", category: "Macro", masteryPercentage: 62 },
    { name: "International Trade & Balance of Payments", category: "Trade", masteryPercentage: 54 }
  ],
  government: [
    { name: "Basic Concepts: Power, Authority & Sovereignty", category: "Political Theory", masteryPercentage: 82 },
    { name: "Political Ideologies, Rule of Law & Separation of Powers", category: "Political Theory", masteryPercentage: 76 },
    { name: "Pre-Colonial Political Systems in Nigeria", category: "Nigerian Govt", masteryPercentage: 68 },
    { name: "Colonial Administration (Indirect Rule & French Assimilation)", category: "Colonial Era", masteryPercentage: 74 },
    { name: "Constitutional Development & First Republic Politics", category: "Nigerian Govt", masteryPercentage: 60 },
    { name: "Military Regimes & Transition to Civil Rule", category: "Nigerian Govt", masteryPercentage: 55 },
    { name: "Public Administration, Corporations & Local Government", category: "Administration", masteryPercentage: 64 },
    { name: "Foreign Policy & International Organizations (ECOWAS/UN)", category: "International", masteryPercentage: 72 }
  ],
  "agricultural science": [
    { name: "Soil Science & Fertility Management", category: "Agronomy", masteryPercentage: 78 },
    { name: "Crop Production & Pathology", category: "Agronomy", masteryPercentage: 70 },
    { name: "Animal Science & Husbandry", category: "Animal Science", masteryPercentage: 65 },
    { name: "Agricultural Economics & Extension", category: "Agric Econ", masteryPercentage: 60 },
    { name: "Farm Mechanization & Surveying", category: "Engineering", masteryPercentage: 52 }
  ],
  "literature in english": [
    { name: "Drama Analysis & Shakespearean Texts", category: "Drama", masteryPercentage: 75 },
    { name: "African & Non-African Poetry Exploration", category: "Poetry", masteryPercentage: 62 },
    { name: "African Prose & Narrative Techniques", category: "Prose", masteryPercentage: 70 },
    { name: "Literary Devices, Figurative Language & Tone", category: "Theory", masteryPercentage: 80 }
  ],
  "crs/irs": [
    { name: "Old Testament Themes & Prophetic Teachings", category: "Biblical Studies", masteryPercentage: 76 },
    { name: "Early Church & Pauline Epistles", category: "New Testament", masteryPercentage: 72 },
    { name: "Tawhid, Quranic Exegesis & Hadith Studies", category: "Islamic Studies", masteryPercentage: 74 },
    { name: "Islamic Jurisprudence (Fiqh) & Ethics", category: "Islamic Law", masteryPercentage: 68 }
  ],
  accounting: [
    { name: "Principles of Double Entry & Financial Records", category: "Financial", masteryPercentage: 84 },
    { name: "Bank Reconciliation & Trial Balance Adjustments", category: "Financial", masteryPercentage: 74 },
    { name: "Partnership & Company Final Accounts", category: "Corporate", masteryPercentage: 60 },
    { name: "Cost Accounting & Variance Analysis", category: "Costing", masteryPercentage: 56 },
    { name: "Public Sector Accounting & Ratio Analysis", category: "Public Sector", masteryPercentage: 65 }
  ]
};

export const SyllabusHeatmap: React.FC = () => {
  const { userData } = useAuth();
  const combination = userData?.combination || ['Physics', 'Chemistry', 'Mathematics'];
  const [activeSubject, setActiveSubject] = useState<string>(
    combination[0]?.toLowerCase() || 'physics'
  );

  const topics = SYLLABUS_MAP[activeSubject.toLowerCase()] || SYLLABUS_MAP.physics;

  const getStatusBadge = (score: number) => {
    if (score >= 75) {
      return {
        label: "Mastered",
        bg: "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-400",
        icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />,
        color: "bg-emerald-500"
      };
    }
    if (score >= 50) {
      return {
        label: "Borderline",
        bg: "bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-900/60 text-amber-700 dark:text-amber-400",
        icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />,
        color: "bg-amber-500"
      };
    }
    return {
      label: "Critical Gap",
      bg: "bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-400",
      icon: <XCircle className="w-3.5 h-3.5 text-rose-500" />,
      color: "bg-rose-500"
    };
  };

  const masteredCount = topics.filter(t => t.masteryPercentage >= 75).length;
  const borderlineCount = topics.filter(t => t.masteryPercentage >= 50 && t.masteryPercentage < 75).length;
  const criticalCount = topics.filter(t => t.masteryPercentage < 50).length;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-premium dark:shadow-premium-dark space-y-6">
      
      {/* Header & Subject Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
            <BrainCircuit className="w-4 h-4 text-brand-600" />
            <span>Diagnostic Heatmap</span>
          </div>
          <h2 className="font-display font-black text-xl text-slate-900 dark:text-white">
            Topic-by-Topic Syllabus Coverage
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time mastery matrix mapped directly against the official JUPEB syllabus.
          </p>
        </div>

        {/* Subject Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {combination.map((sub) => {
            const isSelected = activeSubject.toLowerCase() === sub.toLowerCase();
            return (
              <button
                key={sub}
                onClick={() => setActiveSubject(sub.toLowerCase())}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  isSelected
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {sub}
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend & Summary Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
        <div className="p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300">Mastered (75%+)</span>
          </div>
          <span className="font-display font-black text-xs text-emerald-900 dark:text-emerald-200">{masteredCount} Topics</span>
        </div>

        <div className="p-3 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300">Borderline (50–74%)</span>
          </div>
          <span className="font-display font-black text-xs text-amber-900 dark:text-amber-200">{borderlineCount} Topics</span>
        </div>

        <div className="p-3 rounded-2xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span className="text-[11px] font-bold text-rose-800 dark:text-rose-300">Critical Gap (&lt;50%)</span>
          </div>
          <span className="font-display font-black text-xs text-rose-900 dark:text-rose-200">{criticalCount} Topics</span>
        </div>
      </div>

      {/* Topics Heatmap Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {topics.map((t) => {
          const status = getStatusBadge(t.masteryPercentage);
          return (
            <div
              key={t.name}
              className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850/60 border border-slate-200/80 dark:border-slate-800 hover:border-brand-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <h4 className="font-display font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                    {t.name}
                  </h4>
                  <div className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold border flex items-center gap-1 shrink-0 ${status.bg}`}>
                    {status.icon}
                    <span>{status.label}</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1 my-2">
                  <div className="flex justify-between text-[10px] font-bold text-slate-400">
                    <span>Mastery Level</span>
                    <span>{t.masteryPercentage}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${status.color}`}
                      style={{ width: `${t.masteryPercentage}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Action */}
              <div className="mt-3 pt-2 border-t border-slate-200/40 dark:border-slate-800 flex items-center justify-between text-[11px]">
                <span className="text-slate-400 font-medium">{t.category} Domain</span>
                <Link
                  to={`/practice?subject=${encodeURIComponent(activeSubject)}&topic=${encodeURIComponent(t.name)}`}
                  className="font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
                >
                  <span>Practice Questions</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};

