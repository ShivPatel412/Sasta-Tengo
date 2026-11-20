'use client';
import CornerFrame from '../../CornerFrame';
import React, { useState, useRef, useEffect } from 'react';
import WhatsAppConsent from './WhatsAppConsent';
import {sendTerminalContact} from '../../../lib/terminal-contact.mjs';

const TerminalForm = ({ onSubmit }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [responses, setResponses] = useState({});
  const [whatsappConsent,setWhatsappConsent]=useState(false);
  const [currentInput, setCurrentInput] = useState('');
  const [history, setHistory] = useState([]);
  const [cursorPosition, setCursorPosition] = useState({ left: 0, top: 2 });
  const [isUploading, setIsUploading] = useState(false);
  const pendingSubmission = useRef(false);
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
    if (!currentInput.trim() || isUploading || pendingSubmission.current) return;

    const currentQuestion = questions[currentStep];
    if(currentQuestion.multiline&&whatsappConsent&&!/^\+[1-9][0-9]{6,14}$/.test((responses.mobile||'').replace(/[\s().-]/g,''))){
      setHistory(prev=>[...prev,{type:'error',text:'WhatsApp needs a country code such as +91. Uncheck WhatsApp consent to send this inquiry without WhatsApp follow-up.'}]);
      return;
    }
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
      const newResponses = { ...responses, [currentQuestion.id]: currentInput,whatsapp_consent:whatsappConsent };
      setResponses(newResponses);
      setCurrentInput('');
      if (currentStep < questions.length - 1) {
        setCurrentStep(currentStep + 1);
      } else {
        setHistory(prev => [
          ...prev,
          { type: 'system', text: '─'.repeat(50) },
          { type: 'system', text: 'Sending your inquiry...' }
        ]);
        void sendTerminalContact({
          pending:pendingSubmission,send:onSubmit,answers:newResponses,onPending:setIsUploading,
          onSuccess:()=>{
            setCurrentStep(0);setResponses({});setWhatsappConsent(false);
            setHistory(prev=>[...prev,{type:'success',text:'Inquiry sent. Thank you for your message.'}]);
          },
          onFailure:()=>{
            setCurrentInput(newResponses.message || '');
            setHistory(prev=>[...prev,{type:'error',text:'Sending failed. Your answers are kept. Submit the message again to retry.'}]);
          }
        });
      }
    }
  };

  const currentQuestion = questions[currentStep];
  const isComplete = currentStep >= questions.length;

  return (
    <div className="terminal-form corner-box"><CornerFrame/>
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
          <div className="upload-progress" role="status">Sending your inquiry…</div>
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
                      disabled={isUploading}
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
                      disabled={isUploading}
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
                  <button type="submit" className="terminal-mobile-submit" disabled={isUploading}>
                    Submit message
                  </button>
                )}
              </div>
            </form>
            {currentQuestion.multiline&&<WhatsAppConsent checked={whatsappConsent} onChange={setWhatsappConsent} disabled={isUploading}/>}
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
