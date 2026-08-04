import React from 'react';
import '../styles/Marquee.css';

const Marquee = ({ children, speed = 40, direction = 'left', className = '' }) => {
  return (
    <div className={`marquee-container ${className}`}>
      <div 
        className="marquee-content" 
        style={{
          animationDuration: `${speed}s`,
          animationDirection: direction === 'right' ? 'reverse' : 'normal'
        }}
      >
        {children}
        {children}
      </div>
    </div>
  );
};

export default Marquee;
