import React from 'react';

export const TrustLogo = ({ className = "w-10 h-10", style }: { className?: string, style?: React.CSSProperties }) => (
  <svg 
    className={className} 
    style={style}
    viewBox="0 0 40 40" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Основной фон (Глубокий синий) */}
    <rect width="40" height="40" rx="10" fill="#0f1b3d" />
    
    {/* Контур щита (Акцентный синий) */}
    <path 
      d="M20 8L10 12V18C10 24.5 14.5 30.5 20 32C25.5 30.5 30 24.5 30 18V12L20 8Z" 
      stroke="#3b6fa0" 
      strokeWidth="2.5" 
      strokeLinejoin="round"
    />
    
    {/* Узлы сети - Рефералы (Светлый лед) */}
    <circle cx="20" cy="16" r="2.5" fill="#e8edf3" />
    <circle cx="15" cy="23" r="2" fill="#e8edf3" />
    <circle cx="25" cy="23" r="2" fill="#e8edf3" />
    
    {/* Соединительные линии сети */}
    <path d="M16.5 21L19 18" stroke="#3b6fa0" strokeWidth="2" strokeLinecap="round"/>
    <path d="M23.5 21L21 18" stroke="#3b6fa0" strokeWidth="2" strokeLinecap="round"/>
    <path d="M16.5 23H23.5" stroke="#3b6fa0" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2 2"/>
  </svg>
);
