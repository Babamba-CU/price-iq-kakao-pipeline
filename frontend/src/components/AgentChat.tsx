import ReactMarkdown from "react-markdown";

interface Props {
  report: string;
  isLoading?: boolean;
}

export default function AgentChat({ report, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="p-6 bg-white rounded-lg border animate-pulse text-gray-400">
        AI 분석 생성 중...
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg border prose prose-sm max-w-none">
      <ReactMarkdown>{report}</ReactMarkdown>
    </div>
  );
}
