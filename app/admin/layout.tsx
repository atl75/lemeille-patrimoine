import { ToastProvider } from "@/components/Toast";

// Fournit les notifications (toasts) à toutes les pages de l'admin.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}
