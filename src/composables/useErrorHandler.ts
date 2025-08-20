import { ref } from "vue";

interface AppError {
  id: string;
  message: string;
  details?: string;
  stack?: string;
  type?: "error" | "warning" | "info" | "success";
  severity?: "critical" | "non-critical";
  handled?: boolean; // whether it's already shown to the user
}

// Global error state
const globalError = ref<AppError | null>(null);
const lastErrorMessage = ref<string>("");
const lastErrorTime = ref<number>(0);

// Generate unique error ID
const generateErrorId = (): string => {
  return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Normalize any input into an Error-like object
const normalizeError = (err: unknown, fallbackMessage = "Ukjent feil"): Error => {
  if (err instanceof Error) return err;
  if (typeof err === "string") return new Error(err);
  return new Error(fallbackMessage);
};

// Global error handler
const handleError = (error: unknown, context?: string, severity: "critical" | "non-critical" = "critical"): void => {
  const err = normalizeError(error);

  // Prevent spamming identical errors within 1s
  const now = Date.now();
  if (err.message === lastErrorMessage.value && now - lastErrorTime.value < 1000) {
    return;
  }
  lastErrorMessage.value = err.message;
  lastErrorTime.value = now;

  const appError: AppError = {
    id: generateErrorId(),
    message: err.message || "En uventet feil oppstod",
    details: context || err.stack || "Ingen detaljer tilgjengelig",
    stack: err.stack,
    type: "error",
    severity,
    handled: false,
  };

  globalError.value = appError;

  // Debug logging
  console.error("❌ Global error handler:", {
    id: appError.id,
    message: appError.message,
    context,
    severity,
    full: err,
  });
};

// Specific error helpers
const handleNetworkError = (error: unknown) => handleError(error, "Network error", "non-critical");

const handleAuthError = (error: unknown) => handleError(error, "Authentication error");

const handleDatabaseError = (error: unknown) => handleError(error, "Database error");

const handleValidationError = (error: unknown) => handleError(error, "Validation error", "non-critical");

// Clear error
const clearError = (): void => {
  globalError.value = null;
  lastErrorMessage.value = "";
  lastErrorTime.value = 0;
};

// Show helpers (user-facing)
const showError = (message: string, details?: string) => {
  globalError.value = {
    id: generateErrorId(),
    message,
    details,
    type: "error",
    severity: "critical",
    handled: true,
  };
};

const showWarning = (message: string, details?: string) => {
  globalError.value = {
    id: generateErrorId(),
    message,
    details,
    type: "warning",
    severity: "non-critical",
    handled: true,
  };
};

const showInfo = (message: string, details?: string) => {
  globalError.value = {
    id: generateErrorId(),
    message,
    details,
    type: "info",
    severity: "non-critical",
    handled: true,
  };
};

const showSuccess = (message: string, details?: string) => {
  globalError.value = {
    id: generateErrorId(),
    message,
    details,
    type: "success",
    severity: "non-critical",
    handled: true,
  };
};

// Wrap async operations with error catching
const withErrorHandling = async <T>(operation: () => Promise<T>, userMessage?: string): Promise<T | null> => {
  try {
    return await operation();
  } catch (err: unknown) {
    const e = normalizeError(err);
    handleError(e, userMessage || e.message);
    return null;
  }
};

export function useErrorHandler() {
  return {
    // State
    globalError,

    // Methods
    handleError,
    handleNetworkError,
    handleAuthError,
    handleDatabaseError,
    handleValidationError,
    clearError,
    showError,
    showWarning,
    showInfo,
    showSuccess,
    withErrorHandling,
  };
}
