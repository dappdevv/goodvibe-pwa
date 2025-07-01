import React from "react";

/**
 * Modal — модальное окно по design.json
 * Фон, радиус, тень, padding, анимация появления
 */
type ModalProps = React.PropsWithChildren<{
  open: boolean;
  onClose: () => void;
  className?: string;
}>;

export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  children,
  className = "",
}) => {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      tabIndex={-1}
      aria-modal="true"
      role="dialog"
      onClick={onClose}
    >
      <div
        className={`
          bg-card
          rounded-modal
          shadow-modal
          p-8
          max-w-lg w-full
          animate-fade-in
          ${className}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
};

// Пример использования:
// <Modal open={isOpen} onClose={closeModal}>Контент</Modal>
