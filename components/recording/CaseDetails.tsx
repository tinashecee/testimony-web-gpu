import type { Recording } from "@/services/api";
import { formatDuration, formatFileSize } from "@/lib/utils";

interface CaseDetailsProps {
  recording: Recording;
}

export default function CaseDetails({ recording }: CaseDetailsProps) {
  const details = [
    { label: "Date", value: new Date(recording.date_stamp).toLocaleDateString() },
    { label: "Time", value: new Date(recording.date_stamp).toLocaleTimeString() },
    { label: "Duration", value: formatDuration(recording.duration) },
    { label: "Status", value: recording.status },
    { label: "File Size", value: formatFileSize(recording.size) },
    { label: "Judge", value: recording.judge_name },
    { label: "Court", value: recording.court },
    { label: "Courtroom", value: recording.courtroom },
  ];

  return (
    <div className="p-6">
      <h2 className="text-lg font-semibold mb-4">Case Details</h2>
      <dl className="space-y-2">
        {details.map((detail) => (
          <div key={detail.label} className="grid grid-cols-2">
            <dt className="text-gray-600">{detail.label}</dt>
            <dd className="font-medium">{detail.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
