import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Trophy, CheckCircle2, XCircle, Timer, RotateCcw, Home } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Question {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

const questions: Question[] = [
  {
    id: 1,
    question: "Which Prophet is known as 'Khalilullah' (Friend of Allah)?",
    options: ["Prophet Musa (AS)", "Prophet Ibrahim (AS)", "Prophet Isa (AS)", "Prophet Muhammad (SAW)"],
    correctAnswer: 1,
    explanation: "Prophet Ibrahim (AS) is honored with the title Khalilullah because of his unwavering devotion to Allah."
  },
  {
    id: 2,
    question: "How many Surahs (chapters) are in the Holy Quran?",
    options: ["110", "112", "114", "116"],
    correctAnswer: 2,
    explanation: "There are 114 Surahs in the Quran, ranging from Surah Al-Fatiha to Surah An-Nas."
  },
  {
    id: 3,
    question: "Which battle was the first major conflict between Muslims and the Quraish?",
    options: ["Battle of Uhud", "Battle of Khandaq", "Battle of Badr", "Battle of Hunayn"],
    correctAnswer: 2,
    explanation: "The Battle of Badr took place in the 2nd year of Hijra and was a turning point for the early Muslim community."
  },
  {
    id: 4,
    question: "What is the name of the month in which the Quran was first revealed?",
    options: ["Rajab", "Ramadan", "Muharram", "Shawwal"],
    correctAnswer: 1,
    explanation: "The first verses of the Quran were revealed to Prophet Muhammad (SAW) during the month of Ramadan, specifically on Laylat al-Qadr."
  }
];

const Quiz = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<'start' | 'playing' | 'result'>('start');
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);

  const currentQuestion = questions[currentQuestionIdx];

  const handleStart = () => {
    setCurrentStep('playing');
    setCurrentQuestionIdx(0);
    setScore(0);
    setSelectedOption(null);
    setIsAnswered(false);
  };

  const handleAnswerSelect = (idx: number) => {
    if (isAnswered) return;
    setSelectedOption(idx);
    setIsAnswered(true);
    if (idx === currentQuestion.correctAnswer) {
      setScore(s => s + 1);
    }
  };

  const handleNext = () => {
    if (currentQuestionIdx < questions.length - 1) {
      setCurrentQuestionIdx(prev => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      setCurrentStep('result');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-500 hover:text-teal-600 transition-colors">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-sm font-black uppercase tracking-[0.2em] text-teal-900">Ilm Quiz</h1>
        <div className="w-10"></div>
      </div>

      <div className="max-w-md mx-auto px-6 py-8">
        <AnimatePresence mode="wait">
          {currentStep === 'start' && (
            <motion.div 
              key="start"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center"
            >
              <div className="w-24 h-24 bg-teal-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-xl shadow-teal-900/5">
                <Trophy size={48} className="text-teal-600" />
              </div>
              <h2 className="text-2xl font-black text-teal-900 mb-2">Test Your Knowledge</h2>
              <p className="text-sm text-gray-500 font-medium mb-8 leading-relaxed">
                Expand your understanding of Islamic history and teachings with our daily quiz.
              </p>
              <button 
                onClick={handleStart}
                className="w-full bg-[#115E59] text-white py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-teal-900/20 active:scale-95 transition-all"
              >
                Begin Journey
              </button>
            </motion.div>
          )}

          {currentStep === 'playing' && (
            <motion.div 
              key="playing"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* Progress */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-teal-600">
                  Question {currentQuestionIdx + 1}/{questions.length}
                </span>
                <div className="flex items-center text-gray-400">
                  <Timer size={14} className="mr-1" />
                  <span className="text-[10px] font-bold">Untimed</span>
                </div>
              </div>
              <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden mb-6">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${((currentQuestionIdx + 1) / questions.length) * 100}%` }}
                  className="h-full bg-teal-600"
                />
              </div>

              {/* Question */}
              <h3 className="text-xl font-bold text-gray-900 leading-snug">
                {currentQuestion.question}
              </h3>

              {/* Options */}
              <div className="space-y-3">
                {currentQuestion.options.map((option, idx) => {
                  let status: 'idle' | 'selected' | 'correct' | 'wrong' = 'idle';
                  if (isAnswered) {
                    if (idx === currentQuestion.correctAnswer) status = 'correct';
                    else if (idx === selectedOption) status = 'wrong';
                  } else if (selectedOption === idx) {
                    status = 'selected';
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => handleAnswerSelect(idx)}
                      disabled={isAnswered}
                      className={`w-full p-4 rounded-2xl border-2 text-left transition-all flex items-center justify-between ${
                        status === 'correct' ? 'bg-emerald-50 border-emerald-500 text-emerald-900' :
                        status === 'wrong' ? 'bg-red-50 border-red-500 text-red-900' :
                        status === 'selected' ? 'bg-teal-50 border-teal-500 text-teal-900' :
                        'bg-white border-gray-100 hover:border-teal-200 text-gray-700'
                      }`}
                    >
                      <span className="text-sm font-bold">{option}</span>
                      {status === 'correct' && <CheckCircle2 size={20} className="text-emerald-500" />}
                      {status === 'wrong' && <XCircle size={20} className="text-red-500" />}
                    </button>
                  );
                })}
              </div>

              {/* Explanation */}
              {isAnswered && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm"
                >
                  <p className="text-[10px] font-black uppercase tracking-widest text-teal-600 mb-2">Did you know?</p>
                  <p className="text-xs text-gray-600 leading-relaxed font-medium">
                    {currentQuestion.explanation}
                  </p>
                </motion.div>
              )}

              {/* Next Button */}
              {isAnswered && (
                <button 
                  onClick={handleNext}
                  className="w-full bg-[#115E59] text-white py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-teal-900/20"
                >
                  {currentQuestionIdx < questions.length - 1 ? 'Next Question' : 'View Results'}
                </button>
              )}
            </motion.div>
          )}

          {currentStep === 'result' && (
            <motion.div 
              key="result"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center"
            >
              <div className="w-32 h-32 bg-teal-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 relative">
                 <Trophy size={64} className="text-teal-600" />
                 <div className="absolute -top-2 -right-2 bg-teal-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-black text-sm shadow-lg">
                    {score}/{questions.length}
                 </div>
              </div>
              <h2 className="text-2xl font-black text-teal-900 mb-2">
                {score === questions.length ? 'Ma Shaa Allah!' : 'Great Effort!'}
              </h2>
              <p className="text-sm text-gray-500 font-medium mb-8">
                You correctly answered {score} out of {questions.length} questions correctly.
              </p>

              <div className="space-y-3">
                <button 
                  onClick={handleStart}
                  className="w-full bg-[#115E59] text-white py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-teal-900/20 flex items-center justify-center space-x-2"
                >
                  <RotateCcw size={16} />
                  <span>Try Again</span>
                </button>
                <button 
                  onClick={() => navigate('/')}
                  className="w-full bg-white border-2 border-gray-100 text-teal-900 py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-xs flex items-center justify-center space-x-2"
                >
                  <Home size={16} />
                  <span>Back to Home</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Quiz;
