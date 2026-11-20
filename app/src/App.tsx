import { HashRouter, Route, Routes, Navigate } from 'react-router-dom';
import { AppShell, useThemeSync } from './components/AppShell';
import Home from './pages/Home';
import ReadingList from './pages/ReadingList';
import ReadingTest from './pages/ReadingTest';
import ReadingResult from './pages/ReadingResult';
import ReadingByType from './pages/ReadingByType';
import WritingList from './pages/WritingList';
import WritingRoom from './pages/WritingRoom';
import WritingReview from './pages/WritingReview';
import SpeakingList from './pages/SpeakingList';
import SpeakingView from './pages/SpeakingView';
import SpeakingTest from './pages/SpeakingTest';
import SpeakingReview from './pages/SpeakingReview';
import History from './pages/History';
import Settings from './pages/Settings';
import SolutionsList from './pages/SolutionsList';
import Solution from './pages/Solution';
import PrintSolutions from './pages/PrintSolutions';

export default function App() {
  useThemeSync();
  return (
    <HashRouter>
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
          <Route path="bai-mau/:examId" element={<Solution />} />
        </Route>
        {/* Full-screen exam rooms (no app chrome) */}
        <Route path="reading/:examId/:mode" element={<ReadingTest />} />
        <Route path="writing/:examId/:mode" element={<WritingRoom />} />
        <Route path="speaking/:examId/test" element={<SpeakingTest />} />
        <Route path="in/bai-mau/:examId" element={<PrintSolutions />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
