import React from 'react';
import { Routes, Route } from 'react-router-dom';
import DisplayScreen from './pages/DisplayScreen';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<DisplayScreen />} />
      <Route path="/admin" element={<DisplayScreen />} />
      <Route path="*" element={<DisplayScreen />} />
    </Routes>
  );
}
