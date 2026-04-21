interface Props {
  type: "error" | "warning" | "info";
  message: string;
  onDismiss?: () => void;
}

const STYLES = {
  error: "bg-red-50 border-red-400 text-red-800",
  warning: "bg-orange-50 border-orange-400 text-orange-800",
  info: "bg-blue-50 border-blue-400 text-blue-800",
};

export default function AlertBanner({ type, message, onDismiss }: Props) {
  return (
    <div className={`border-l-4 p-4 mb-3 rounded flex justify-between items-center ${STYLES[type]}`}>
      <span className="text-sm font-medium">{message}</span>
      {onDismiss && (
        <button onClick={onDismiss} className="ml-4 text-xs opacity-60 hover:opacity-100">
          닫기
        </button>
      )}
    </div>
  );
}
