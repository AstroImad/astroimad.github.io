import { useEffect } from 'react'

export default function useScrollReveal() {
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return

    const sections = document.querySelectorAll('#projects, #contact')
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        entry.target.classList.add('portfolio-reveal')
        observer.unobserve(entry.target)
      }
    }, { rootMargin: '0px 0px -24px 0px' })

    sections.forEach((section) => observer.observe(section))

    return () => observer.disconnect()
  }, [])
}
