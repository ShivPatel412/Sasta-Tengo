import React, { useEffect, useState } from 'react';

const TextGenerateEffect = ({ words, className = '' }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < words.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(words.slice(0, currentIndex + 1));
        setCurrentIndex(currentIndex + 1);
      }, 100); // Adjust speed here (lower = faster)

      return () => clearTimeout(timeout);
    }
  }, [currentIndex, words]);

  return (
    <span className={className}>
      {displayedText}
      {currentIndex < words.length && (
        <span className="animate-pulse">|</span>
      )}
    </span>
  );
};

export default TextGenerateEffect;
