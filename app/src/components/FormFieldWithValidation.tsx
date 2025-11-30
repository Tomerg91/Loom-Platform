/**
 * FormFieldWithValidation Component
 *
 * Reusable form field wrapper with inline validation feedback
 * Integrates with react-hook-form and shadcn/ui components
 */

import React from "react";
import { cn } from "@src/lib/utils";
import { Check, AlertCircle } from "lucide-react";

interface FormFieldWithValidationProps {
  label: string;
  error?: string;
  touched?: boolean;
  success?: boolean;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

/**
 * Wraps a form field with label, error message, success icon, and validation feedback
 *
 * @param label - Field label text
 * @param error - Error message to display (if any)
 * @param touched - Whether field has been touched by user
 * @param success - Whether field validation passed
 * @param hint - Hint text displayed below the field
 * @param required - Whether field is required
 * @param children - The form control element
 * @param className - Additional CSS classes
 */
export const FormFieldWithValidation: React.FC<FormFieldWithValidationProps> = ({
  label,
  error,
  touched = false,
  success = false,
  hint,
  required = false,
  children,
  className = "",
}) => {
  const hasError = touched && error;
  const showSuccess = touched && success && !error;

  return (
    <div className={cn("space-y-2", className)}>
      {/* Label */}
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>

      {/* Input Wrapper with Validation State */}
      <div className="relative">
        {children}

        {/* Success Icon */}
        {showSuccess && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Check className="h-5 w-5 text-green-500" />
          </div>
        )}

        {/* Error Icon */}
        {hasError && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <AlertCircle className="h-5 w-5 text-red-500" />
          </div>
        )}
      </div>

      {/* Error Message */}
      {hasError && (
        <p className="text-sm text-red-500 flex items-center gap-1">
          <AlertCircle className="h-4 w-4" />
          {error}
        </p>
      )}

      {/* Success Message (Optional) */}
      {showSuccess && (
        <p className="text-sm text-green-600 flex items-center gap-1">
          <Check className="h-4 w-4" />
          Looking good!
        </p>
      )}

      {/* Hint Text */}
      {hint && !hasError && (
        <p className="text-sm text-gray-500">{hint}</p>
      )}
    </div>
  );
};

export default FormFieldWithValidation;
