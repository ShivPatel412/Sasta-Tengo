import React from 'react';
import '../styles/AnimatedBorderButton.css';

const AnimatedBorderButton = ({ 
  text, 
  onClick, 
  href, 
  className = '',
  type = 'button',
  variant = 'light' // 'light', 'dark', or 'gray'
}) => {
  const buttonClass = variant === 'dark' 
    ? 'animated-border-btn-dark' 
    : variant === 'gray'
    ? 'animated-border-btn-gray'
    : 'animated-border-btn';
  const content = <span>{text}</span>;

  if (href) {
    return (
      <a 
        href={href}
        className={`${buttonClass} ${className}`}
        onClick={onClick}
      >
        {content}
      </a>
    );
  }

  return (
    <button 
      type={type}
      className={`${buttonClass} ${className}`}
      onClick={onClick}
    >
      {content}
    </button>
  );
};

export default AnimatedBorderButton;
