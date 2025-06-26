import * as React from "react"

export const Checkbox = React.forwardRef(
  ({ className, checked, onCheckedChange, ...props }, ref) => {
    return (
      <input
        type="checkbox"
        className={className}
        checked={checked}
        onChange={(e) => onCheckedChange?.(e.target.checked)}
        ref={ref}
        {...props}
      />
    )
  }
)
Checkbox.displayName = "Checkbox"