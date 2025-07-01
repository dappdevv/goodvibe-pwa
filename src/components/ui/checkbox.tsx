import React from "react";

/**
 * Checkbox — чекбокс по design.json
 * Радиус, цвета, outline при фокусе, стили для checked/disabled
 */
type CheckboxProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Checkbox: React.FC<CheckboxProps> = ({
  className = "",
  ...props
}) => (
  <input
    type="checkbox"
    className={`
      appearance-none
      w-5 h-5
      rounded-[4px]
      bg-card
      border-2 border-primary
      checked:bg-primary
      checked:border-primary
      checked:after:content-['']
      checked:after:block
      checked:after:w-3
      checked:after:h-3
      checked:after:rounded-[2px]
      checked:after:bg-text-inverse
      focus:outline-none
      focus:ring-2
      focus:ring-primary
      transition
      duration-150
      disabled:bg-background
      disabled:border-secondary
      ${className}
    `}
    {...props}
  />
);

// Пример использования:
// <Checkbox checked={value} onChange={handleChange} />
