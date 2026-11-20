import { lazy, Suspense } from 'react';
import { HashRouter, Route, Routes, Navigate } from 'react-router-dom';
import { AppShell, useThemeSync } from './components/AppShell';

// Route-level code splitting: a phone opening one model answer loads only the solutions data,
// not every exam's reading/writing/speaking JSON.
const Home = lazy(() => import('./pages/Home'));
const ReadingList = lazy(() => import('./pages/ReadingList'));
const ReadingTest = lazy(() => import('./pages/ReadingTest'));
const ReadingResult = lazy(() => import('./pages/ReadingResult'));
const ReadingByType = lazy(() => import('./pages/ReadingByType'));
const WritingList = lazy(() => import('./pages/WritingList'));
const WritingRoom = lazy(() => import('./pages/WritingRoom'));
const WritingReview = lazy(() => import('./pages/WritingReview'));
const SpeakingList = lazy(() => import('./pages/SpeakingList'));
const SpeakingView = lazy(() => import('./pages/SpeakingView'));
const SpeakingTest = lazy(() => import('./pages/SpeakingTest'));
const SpeakingReview = lazy(() => import('./pages/SpeakingReview'));
const History = lazy(() => import('./pages/History'));
const Settings = lazy(() => import('./pages/Settings'));
const SolutionsList = lazy(() => import('./pages/SolutionsList'));
const Templates = lazy(() => import('./pages/Templates'));
const Solution = lazy(() => import('./pages/Solution'));
const PrintSolutions = lazy(() => import('./pages/PrintSolutions'));

export default function App() {
  useThemeSync();
  return (
    <HashRouter>
      <Suspense fallback={<div className="page muted" aria-busy="true">Đang tải…</div>}>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Home />} />
          <Route path="reading" element={<ReadingList />} />
          <Route path="reading/types/:type?" element={<ReadingByType />} />
          <Route path="reading/result/:attemptId" element={<ReadingResult />} />
          <Route path="writing" element={<WritingList />} />
          <Route path="writing/review/:attemptId" element={<WritingReview />} />
          <Route path="speaking" element={<SpeakingList />} />
          <Route path="speaking/:examId" element={<SpeakingView />} />
          <Route path="speaking/review/:attemptId" element={<SpeakingReview />} />
          <Route path="history" element={<History />} />
          <Route path="settings" element={<Settings />} />
          <Route path="bai-mau" element={<SolutionsList />} />
          <Route path="bai-mau/khung" element={<Templates />} />
          <Route path="bai-mau/:examId" element={<Solution />} />
        </Route>
        {/* Full-screen exam rooms (no app chrome) */}
        <Route path="reading/:examId/:mode" element={<ReadingTest />} />
        <Route path="writing/:examId/:mode" element={<WritingRoom />} />
        <Route path="speaking/:examId/test" element={<SpeakingTest />} />
        <Route path="in/bai-mau/:examId" element={<PrintSolutions />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
    </HashRouter>
  );
}
