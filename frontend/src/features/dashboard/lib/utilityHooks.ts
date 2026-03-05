import { useState } from "react";

export function useOutsideClickStrict(onClose: () => void) {
  const [isMouseDownOnOverlay, setIsMouseDownOnOverlay] = useState(false);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only true if the initial click was directly on the overlay
    setIsMouseDownOnOverlay(e.target === e.currentTarget);
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    // Close only if both down and up were on overlay itself
    if (isMouseDownOnOverlay && e.target === e.currentTarget) {
      onClose();
    }

    // Reset state after mouse up
    setIsMouseDownOnOverlay(false);
  };

  return {
    handleMouseDown,
    handleMouseUp,
  };
}