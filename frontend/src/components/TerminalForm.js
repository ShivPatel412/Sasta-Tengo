import React, { useState, useRef, useEffect } from 'react';
import './TerminalForm.css';

const TerminalForm = ({ onSubmit }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [responses, setResponses] = useState({});
  const [currentInput, setCurrentInput] = useState('');
  const [history, setHistory] = useState([]);
  const [cursorPosition, setCursorPosition] = useState({ left: 0, top: 2 });
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const inputRef = useRef(null);
  const terminalRef = useRef(null);
  const hiddenSpanRef = useRef(null);

  const questions = [
    { id: 'name', question: 'To start, could you give us your name?', placeholder: 'John Doe' },
    { id: 'mobile', question: 'What is your mobile number?', placeholder: '+91 1234567890', type: 'tel' },
    { id: 'email', question: "Awesome! And what's your email address?", placeholder: 'john@example.com', type: 'email' },
    // added subject field so backend validation is satisfied
    { id: 'subject', question: "What's the subject of your message?", placeholder: 'Project inquiry' },
    { id: 'message', question: 'Perfect, and how can we help you?', placeholder: 'Tell me about your project...', multiline: true }
  ];

  useEffect(() => {
    if (inputRef.current && isInView) {
      inputRef.current.focus();
    }
  }, [currentStep, isInView]);

  useEffect(() => {
    if (!terminalRef.current || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    observer.observe(terminalRef.current);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (hiddenSpanRef.current) {
      const lines = currentInput.split('\n');
      setCursorPosition({
        left: hiddenSpanRef.current.offsetWidth,
        top: (lines.length - 1) * 24 + 2
      });
    }
  }, [currentInput]);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [history, currentStep]);

  useEffect(() => {
    // Initial greeting
    setHistory([
      { type: 'system', text: 'Terminal Contact Form v1.0' },
      { type: 'system', text: 'Type your answers and press Enter to continue.' },
      { type: 'system', text: '─'.repeat(50) }
    ]);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!currentInput.trim() || isUploading) return; // ignore while uploading

    const currentQuestion = questions[currentStep];
    let isValid = true;
    let isCmdError = false;

    // Validation
    if (currentQuestion.type === 'email') {
      isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(currentInput.trim());
      if (!isValid) isCmdError = true;
    } else if (currentQuestion.type === 'tel') {
      const normalizedPhone = currentInput.replace(/\D/g, '');
      isValid = normalizedPhone.length >= 7 && normalizedPhone.length <= 15;
      if (!isValid) isCmdError = true;
    }

    // Add to history
    let newHistory = [
      ...history,
      { type: 'question', text: `> ${currentQuestion.question}` },
      { type: 'answer', text: `$ ${currentInput}`, isValid }
    ];

    if (!isValid && isCmdError) {
      newHistory.push({ type: 'answer', text: 'cmd not found', isValid: false });
      setHistory(newHistory);
      setCurrentInput(''); // clear input for retry
      // Do NOT advance currentStep, so the same question is asked again
      return;
    }

    setHistory(newHistory);

    if (isValid) {
      const newResponses = { ...responses, [currentQuestion.id]: currentInput };
      setResponses(newResponses);
      setCurrentInput('');
      if (currentStep < questions.length - 1) {
        setCurrentStep(currentStep + 1);
      } else {
        // Form complete - start upload progress
        setHistory(prev => [
          ...prev,
          { type: 'system', text: '─'.repeat(50) },
          { type: 'system', text: 'Uploading data...' }
        ]);
        setIsUploading(true);
        setUploadProgress(0);
        
        // Animate progress with stops at 10%, 25%, 50%, 75%, and 100%
        const milestones = [10, 25, 50, 75, 100];
        let currentMilestoneIndex = 0;
        
        const animateToNextMilestone = () => {
          if (currentMilestoneIndex >= milestones.length) {
            setIsUploading(false);
            
            // After progress completes, attempt API submission
            if (onSubmit) {
              onSubmit(newResponses)
                .then(() => {
                  setHistory(prevHistory => [
                    ...prevHistory,
                    { type: 'success', text: '✓ Form submitted successfully!' },
                    { type: 'system', text: 'Thank you for your message. I will get back to you soon.' }
                  ]);
                })
                .catch(() => {
                  setHistory(prevHistory => [
                    ...prevHistory,
                    { type: 'error', text: '✗ Submission failed. Please try again.' }
                  ]);
                });
            }

            // Reset after 3 seconds regardless of result
            setTimeout(() => {
              setCurrentStep(0);
              setResponses({});
              setUploadProgress(0);
              setHistory([
                { type: 'system', text: 'Terminal Contact Form v1.0' },
                { type: 'system', text: 'Type your answers and press Enter to continue.' },
                { type: 'system', text: '─'.repeat(50) }
              ]);
            }, 3000);
            return;
          }
          
          const targetProgress = milestones[currentMilestoneIndex];
          const progressInterval = setInterval(() => {
            setUploadProgress(prev => {
              if (prev >= targetProgress) {
                clearInterval(progressInterval);
                currentMilestoneIndex++;
                // Pause at each milestone before continuing
                setTimeout(animateToNextMilestone, 500);
                return targetProgress;
              }
              return prev + 1;
            });
          }, 50);
        };
        
        animateToNextMilestone();
      }
    }
  };

  const currentQuestion = questions[currentStep];
  const isComplete = currentStep >= questions.length;

  return (
    <div className="terminal-form">
      <div className="terminal-header">
        <div className="terminal-buttons">
          <span className="terminal-button close"></span>
          <span className="terminal-button minimize"></span>
          <span className="terminal-button maximize"></span>
        </div>
        <div className="terminal-title">contact@sastatengo.dev</div>
      </div>
      
      <div className="terminal-body" ref={terminalRef}>
        {history.map((item, index) => (
          <div 
            key={index} 
            className={`terminal-line ${item.type} ${item.type === 'answer' && item.isValid === true ? 'valid-answer' : ''} ${item.type === 'answer' && item.isValid === false ? 'invalid-answer' : ''}`}
          >
            {item.text}
          </div>
        ))}
        
        {isUploading && (
          <div className="upload-progress">
            <div className="progress-bar-container">
              <div className="progress-bar" style={{ width: `${uploadProgress}%` }}></div>
            </div>
            <div className="progress-text">{uploadProgress}%</div>
          </div>
        )}
        
        {!isComplete && (
          <>
            <div className="terminal-line question">
              {'> '}{currentQuestion.question}
            </div>
            <form onSubmit={handleSubmit} className="terminal-input-form">
              <span className="terminal-prompt">$ </span>
              <div className="terminal-input-wrapper">
                <span ref={hiddenSpanRef} className="hidden-text-measure" aria-hidden="true">
                  {currentInput.split('\n').pop()}
                </span>
                {currentQuestion.multiline ? (
                  <>
                    <textarea
                      ref={inputRef}
                      value={currentInput}
                      onChange={(e) => setCurrentInput(e.target.value)}
                      placeholder={currentQuestion.placeholder}
                      className="terminal-textarea"
                      rows="3"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.ctrlKey) {
                          handleSubmit(e);
                        }
                      }}
                    />
                    <span
                      className="terminal-cursor-inline"
                      style={{ left: `${cursorPosition.left}px`, top: `${cursorPosition.top}px` }}
                      aria-hidden="true"
                    />
                  </>
                ) : (
                  <>
                    <input
                      ref={inputRef}
                      type="text"
                      value={currentInput}
                      onChange={(e) => setCurrentInput(e.target.value)}
                      placeholder={currentQuestion.placeholder}
                      className="terminal-input"
                      autoComplete="off"
                    />
                    <span
                      className="terminal-cursor-inline"
                      style={{ left: `${cursorPosition.left}px`, top: `${cursorPosition.top}px` }}
                      aria-hidden="true"
                    />
                  </>
                )}
                {currentQuestion.multiline && (
                  <button type="submit" className="terminal-mobile-submit">
                    Submit message
                  </button>
                )}
              </div>
            </form>
            {currentQuestion.multiline && (
              <div className="terminal-hint">
                Press Ctrl+Enter to submit
              </div>
            )}
          </>
        )}
        
      </div>
    </div>
  );
};

export default TerminalForm;
