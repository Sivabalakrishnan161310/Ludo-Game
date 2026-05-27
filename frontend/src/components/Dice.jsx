import React from 'react';
import { motion } from 'framer-motion';

const Dice = ({ value, rollTrigger }) => {
  const getRotation = (v) => {
    switch(v) {
      case 1: return { x: 0, y: 0 };
      case 2: return { x: 0, y: 180 };
      case 3: return { x: 0, y: -90 };
      case 4: return { x: 0, y: 90 };
      case 5: return { x: -90, y: 0 };
      case 6: return { x: 90, y: 0 };
      default: return { x: 0, y: 0 };
    }
  };

  const targetRot = getRotation(value || 1);
  
  // Add spins based on rollTrigger to ensure it physically rolls every time
  const animateRot = { 
    x: targetRot.x + (rollTrigger * 720), 
    y: targetRot.y + (rollTrigger * 720) 
  };

  return (
    <div style={{ width: '80px', height: '80px', perspective: '600px', margin: '1.5rem 0' }}>
      <motion.div
        animate={{ rotateX: animateRot.x, rotateY: animateRot.y }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        style={{
          width: '100%', height: '100%', position: 'relative', transformStyle: 'preserve-3d'
        }}
      >
        <Face id={1} rotate="rotateY(0deg) translateZ(40px)" dots={[4]} />
        <Face id={2} rotate="rotateY(180deg) translateZ(40px)" dots={[0, 8]} />
        <Face id={3} rotate="rotateY(90deg) translateZ(40px)" dots={[0, 4, 8]} />
        <Face id={4} rotate="rotateY(-90deg) translateZ(40px)" dots={[0, 2, 6, 8]} />
        <Face id={5} rotate="rotateX(90deg) translateZ(40px)" dots={[0, 2, 4, 6, 8]} />
        <Face id={6} rotate="rotateX(-90deg) translateZ(40px)" dots={[0, 2, 3, 5, 6, 8]} />
      </motion.div>
    </div>
  );
};

const Face = ({ rotate, dots }) => (
  <div style={{
    position: 'absolute', width: '100%', height: '100%', background: 'white',
    borderRadius: '12px', border: '2px solid #e2e8f0',
    transform: rotate, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
    gridTemplateRows: 'repeat(3, 1fr)', gap: '4px', padding: '8px',
    boxShadow: 'inset 0 0 10px rgba(0,0,0,0.1), 0 0 5px rgba(0,0,0,0.2)'
  }}>
    {Array.from({ length: 9 }).map((_, i) => (
      <div key={i} style={{
        background: dots.includes(i) ? (dots.length === 1 ? '#ef4444' : '#1e293b') : 'transparent',
        borderRadius: '50%',
        width: '100%', height: '100%'
      }} />
    ))}
  </div>
);

export default Dice;
