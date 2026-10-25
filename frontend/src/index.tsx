import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app/App';
import './index.css';

const kok = document.getElementById('root');
if (!kok) throw new Error('index.html içinde #root öğesi yok');
ReactDOM.createRoot(kok).render(<App />);
