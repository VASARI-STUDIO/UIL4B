import { useEffect, useState, useRef } from 'react'

export default function DocsTOC({ items }) {
  const [activeId, setActiveId] = useState(items[0]?.id || '')
  const [visible, setVisible] = useState(false)
  const navRef = useRef(null)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 220)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        const visible = entries.filter(e => e.isIntersecting)
        if (visible.length > 0) {
          visible.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
          setActiveId(visible[0].target.id)
        }
      },
      { rootMargin: '-30% 0px -55% 0px', threshold: 0 }
    )
    items.forEach(item => {
      const el = document.getElementById(item.id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [items])

  useEffect(() => {
    const active = navRef.current?.querySelector('.docs-toc-item.active')
    if (active && navRef.current) {
      const navRect = navRef.current.getBoundingClientRect()
      const activeRect = active.getBoundingClientRect()
      if (activeRect.left < navRect.left || activeRect.right > navRect.right) {
        active.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
      }
    }
  }, [activeId])

  const onClick = (e, id) => {
    e.preventDefault()
    const el = document.getElementById(id)
    if (el) {
      const offset = 110
      const top = el.getBoundingClientRect().top + window.scrollY - offset
      window.scrollTo({ top, behavior: 'smooth' })
    }
  }

  return (
    <div className={`docs-toc${visible ? ' visible' : ''}`} ref={navRef}>
      <div className="docs-toc-eyebrow">In this guide</div>
      <div className="docs-toc-track">
        {items.map(item => (
          <a key={item.id} href={`#${item.id}`} onClick={(e) => onClick(e, item.id)}
            className={`docs-toc-item${activeId === item.id ? ' active' : ''}`}
          >
            <span className="docs-toc-num">{item.number}</span>
            <span className="docs-toc-label">{item.title}</span>
          </a>
        ))}
      </div>
    </div>
  )
}
