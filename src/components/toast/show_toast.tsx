// src/hooks/useToast.ts
import { toast, ToastOptions } from "react-toastify";

const showToast = (
  message: string,
  type: "success" | "error" | "info" | "warning" = "info"
) => {
  // Set autoClose based on type
  const autoClose = type == "error" || type == "warning" ? 4000 : 4000;

  // Define options with proper typing for position
  const options: ToastOptions = {
    autoClose: autoClose,
    closeOnClick: true,
    draggable: true,
    position: "bottom-right" as ToastOptions["position"],
  };

  // Call the toast with type-specific styling
  switch (type) {
    case "success":
      toast.success(message, options);
      break;
    case "error":
      toast.error(message, options);
      break;
    case "info":
      toast.info(message, options);
      break;
    case "warning":
      toast.warn(message, options);
      break;
    default:
      toast.info(message, options);
  }
};

export default showToast;
