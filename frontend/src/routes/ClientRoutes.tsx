import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from '../layouts/client/Home';

const ClientRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
    </Routes>
  );
};

export default ClientRoutes;
