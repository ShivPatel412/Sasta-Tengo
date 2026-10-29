'use client';
import React from 'react';

const NeumorphicButton = ({ 
  text, 
  onClick, 
  type = 'button',
  className = '',
  disabled = false,
  children
}) => {
  return (
    <button
      className={`neumorphic-btn ${className}`}
      onClick={onClick}
      type={type}
      disabled={disabled}
    >
      {children || text}
    </button>
  );
};

export default NeumorphicButton;
