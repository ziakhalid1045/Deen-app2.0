import React from 'react';
import { useUpload } from '../context/UploadContext';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, XCircle, Loader2, X } from 'lucide-react';

export const UploadProgressOverlay = () => {
  const { activeUploads, clearCompleted } = useUpload();

  if (activeUploads.length === 0) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 pointer-events-none">
      <div className="flex flex-col gap-2 max-w-md mx-auto">
        <AnimatePresence>
          {activeUploads.map((task) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl shadow-2xl border border-gray-100 p-3 pointer-events-auto flex items-center gap-3"
            >
              <div className="relative w-10 h-10 flex-shrink-0">
                {task.status === 'uploading' && (
                  <>
                    <svg className="w-full h-full -rotate-90">
                      <circle
                        cx="20"
                        cy="20"
                        r="18"
                        className="stroke-gray-100 fill-none"
                        strokeWidth="3"
                      />
                      <circle
                        cx="20"
                        cy="20"
                        r="18"
                        className="stroke-teal-600 fill-none transition-all duration-300"
                        strokeWidth="3"
                        strokeDasharray={113}
                        strokeDashoffset={113 - (113 * task.progress) / 100}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-teal-700">
                      {task.progress}%
                    </div>
                  </>
                )}
                {task.status === 'completed' && (
                  <div className="w-full h-full bg-green-100 rounded-full flex items-center justify-center text-green-600">
                    <CheckCircle2 size={24} />
                  </div>
                )}
                {task.status === 'error' && (
                  <div className="w-full h-full bg-red-100 rounded-full flex items-center justify-center text-red-600">
                    <XCircle size={24} />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {task.status === 'uploading' ? 'Uploading post...' : task.status === 'completed' ? 'Post published!' : 'Upload failed'}
                </p>
                <p className="text-xs text-gray-500 truncate">{task.fileName}</p>
              </div>

              {task.status === 'error' && (
                <button 
                  onClick={() => {/* handle retry or dismiss */}}
                  className="p-1 hover:bg-gray-100 rounded-full text-gray-400"
                >
                  <X size={18} />
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};
