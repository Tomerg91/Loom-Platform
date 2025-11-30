import { useToast } from "../../hooks/use-toast";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "./toast";

export function Toaster({
  position,
}: {
  position?:
    | "top-left"
    | "top-center"
    | "top-right"
    | "bottom-left"
    | "bottom-center"
    | "bottom-right";
}) {
  const { toasts } = useToast();
  const direction =
    typeof document !== "undefined" && document.documentElement.dir === "rtl"
      ? "rtl"
      : "ltr";
  const swipeDirection = direction === "rtl" ? "left" : "right";
  const resolvedPosition =
    position ?? (direction === "rtl" ? "bottom-left" : "bottom-right");

  return (
    <ToastProvider duration={5000} swipeDirection={swipeDirection}>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        );
      })}
      <ToastViewport position={resolvedPosition} />
    </ToastProvider>
  );
}
