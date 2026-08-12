import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface ThemeToggleProps {
  className?: string;
  fixed?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ 
  className = '',
  fixed = false 
}) => {
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === 'light';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={toggleTheme}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggleTheme();
        }
      }}
      className={`theme-pill-toggle ${fixed ? 'theme-pill-fixed' : ''} ${className}`}
      title={isLight ? 'Switch to Dark Theme' : 'Switch to Light Theme'}
      aria-label={`Current theme: ${theme}. Click to toggle theme.`}
    >
      {/* Sliding Pill Thumb */}
      <div 
        className="theme-pill-thumb" 
        style={{
          transform: isLight ? 'translateX(0px)' : 'translateX(32px)',
        }}
      />

      {/* Sun Icon (Left) */}
      <div className={`theme-pill-icon ${isLight ? 'active' : 'inactive'}`}>
        <Sun size={15} strokeWidth={isLight ? 2.4 : 1.8} />
      </div>

      {/* Moon Icon (Right) */}
      <div className={`theme-pill-icon ${!isLight ? 'active' : 'inactive'}`}>
        <Moon size={15} strokeWidth={!isLight ? 2.4 : 1.8} />
      </div>
    </div>
  );
};
