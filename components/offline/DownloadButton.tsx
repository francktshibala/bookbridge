'use client';

import { useState, useEffect } from 'react';
import { Download, Check, X, Pause, Play, Loader2 } from 'lucide-react';
import { useOffline } from '@/contexts/OfflineContext';
import type { DownloadProgress } from '@/lib/offline/indexeddb';

interface DownloadButtonProps {
  bookId: string;
  level: string;
  compact?: boolean;
  className?: string;
}

export function DownloadButton({ bookId, level, compact = false, className = '' }: DownloadButtonProps) {
  const {
    downloadBook,
    cancelDownload,
    pauseDownload,
    resumeDownload,
    isBookAvailableOffline,
    isDownloading,
    getProgress,
  } = useOffline();

  const [isOffline, setIsOffline] = useState(false);
  const [isDownloadingState, setIsDownloadingState] = useState(false);
  const [progress, setProgress] = useState<DownloadProgress | undefined>();
  const [error, setError] = useState<string | null>(null);

  // Check offline status
  useEffect(() => {
    const checkOfflineStatus = async () => {
      const offline = await isBookAvailableOffline(bookId);
      setIsOffline(offline);
    };

    checkOfflineStatus();
    const interval = setInterval(checkOfflineStatus, 2000);

    return () => clearInterval(interval);
  }, [bookId, isBookAvailableOffline]);

  // Check download status
  useEffect(() => {
    const downloading = isDownloading(bookId);
    setIsDownloadingState(downloading);

    if (downloading) {
      const currentProgress = getProgress(bookId);
      setProgress(currentProgress);
    } else {
      setProgress(undefined);
    }

    const interval = setInterval(() => {
      const downloading = isDownloading(bookId);
      if (downloading) {
        const currentProgress = getProgress(bookId);
        setProgress(currentProgress);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [bookId, isDownloading, getProgress]);

  const handleDownload = async () => {
    try {
      setError(null);
      await downloadBook(bookId, level);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed');
    }
  };

  const handleCancel = () => {
    cancelDownload(bookId);
    setError(null);
  };

  const handlePause = async () => {
    try {
      await pauseDownload(bookId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to pause');
    }
  };

  const handleResume = async () => {
    try {
      setError(null);
      await resumeDownload(bookId, level);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resume');
    }
  };

  // Calculate progress percentage
  const progressPercentage = progress
    ? Math.round((progress.downloaded / progress.totalBundles) * 100)
    : 0;

  if (compact) {
    // Compact icon-only version
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (isOffline) return;
          if (isDownloadingState) {
            if (progress?.status === 'paused') {
              handleResume();
            } else {
              handleCancel();
            }
          } else {
            handleDownload();
          }
        }}
        className={`p-2 rounded-full transition-colors ${
          isOffline
            ? 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300'
            : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
        } ${className}`}
        disabled={isDownloadingState && progress?.status === 'downloading'}
        title={
          isOffline
            ? 'Available offline'
            : isDownloadingState
            ? 'Downloading...'
            : 'Download for offline'
        }
      >
        {isOffline ? (
          <Check className="w-5 h-5" />
        ) : isDownloadingState ? (
          progress?.status === 'paused' ? (
            <Play className="w-5 h-5" />
          ) : (
            <Loader2 className="w-5 h-5 animate-spin" />
          )
        ) : (
          <Download className="w-5 h-5" />
        )}
      </button>
    );
  }

  // Full button version with progress
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {isOffline ? (
        <div className="flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-lg">
          <Check className="w-5 h-5" />
          <span className="font-medium">Available Offline</span>
        </div>
      ) : isDownloadingState ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1">
              {progress?.status === 'paused' ? (
                <Pause className="w-5 h-5 text-blue-600" />
              ) : (
                <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
              )}
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {progress?.status === 'paused'
                  ? 'Paused'
                  : `Downloading... ${progressPercentage}%`}
              </span>
            </div>
            <div className="flex gap-2">
              {progress?.status === 'paused' ? (
                <button
                  onClick={handleResume}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                  title="Resume download"
                >
                  <Play className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handlePause}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                  title="Pause download"
                >
                  <Pause className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={handleCancel}
                className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900 rounded transition-colors text-red-600"
                title="Cancel download"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>

          {/* Details */}
          {progress && (
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>
                {progress.downloaded} / {progress.totalBundles} bundles
              </span>
              <span>{Math.round(progress.bytesDownloaded / 1024)} KB</span>
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={handleDownload}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          <Download className="w-5 h-5" />
          <span>Download for Offline</span>
        </button>
      )}

      {error && (
        <div className="text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}
    </div>
  );
}
