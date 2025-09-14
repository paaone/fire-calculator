import { useState } from 'react'
import { FaChevronDown } from 'react-icons/fa6'

export default function Accordion({ title, children, defaultOpen = false }: { title: string; children: JSX.Element | string; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="accordion">
      <button className="accordion-header" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span>{title}</span>
        <FaChevronDown size={14} className={open ? 'rotate' : ''} />
      </button>
      {open && <div className="accordion-content">{children}</div>}
    </div>
  )
}

