import { motion } from 'framer-motion';

// This specific bezier curve creates a "premium" smooth ease-out effect
const pageVariants = {
  initial: {
    opacity: 0,
    y: 15, // Starts 15px lower
  },
  in: {
    opacity: 1,
    y: 0,  // Floats up to natural position
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1], // Premium custom easing (same as your Hero!)
    },
  },
  out: {
    opacity: 0,
    y: -15,
    transition: {
      duration: 0.3,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

export default function PageTransition({ children }) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="in"
      exit="out"
    >
      {children}
    </motion.div>
  );
}