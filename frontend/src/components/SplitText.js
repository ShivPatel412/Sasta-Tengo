import React from 'react';
import { motion } from 'motion/react';
import '../styles/SplitText.css';

const SplitText = ({ 
  text, 
  className = '', 
  delay = 0.05,
  duration = 0.5,
  animationType = 'fade' // 'fade', 'slide', 'scale'
}) => {
  const words = text.split(' ');
  
  const container = {
    hidden: { opacity: 0 },
    visible: (i = 1) => ({
      opacity: 1,
      transition: { staggerChildren: delay, delayChildren: 0.04 * i },
    }),
  };

  const child = {
    visible: {
      opacity: 1,
      y: 0,
      x: 0,
      scale: 1,
      transition: {
        type: 'spring',
        damping: 12,
        stiffness: 100,
        duration: duration,
      },
    },
    hidden: {
      opacity: animationType === 'fade' || animationType === 'slide' ? 0 : 1,
      y: animationType === 'slide' ? 20 : 0,
      x: 0,
      scale: animationType === 'scale' ? 0 : 1,
      transition: {
        type: 'spring',
        damping: 12,
        stiffness: 100,
      },
    },
  };

  return (
    <motion.div
      className={`split-text ${className}`}
      variants={container}
      initial="hidden"
      animate="visible"
    >
      {words.map((word, index) => (
        <motion.span
          key={index}
          variants={child}
          className="split-text-word"
        >
          {word}
        </motion.span>
      ))}
    </motion.div>
  );
};

export default SplitText;
