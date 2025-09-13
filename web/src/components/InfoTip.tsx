import { FaRegCircleQuestion } from 'react-icons/fa6'

export default function InfoTip({ title, children }: { title: string; children: string | JSX.Element }) {
  return (
    <span className="tooltip" aria-label={title} style={{ marginLeft: 6 }}>
      <FaRegCircleQuestion size={14} color="#9ca3af" />
      <span className="bubble">
        <strong style={{ display: 'block', marginBottom: 6 }}>{title}</strong>
        <span style={{ fontSize: 13, lineHeight: 1.4 }}>{children}</span>
      </span>
    </span>
  )
}

