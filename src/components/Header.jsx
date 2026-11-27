import './Header.css'

export default function Header() {
  return (
    <header className="portfolio-header">
      <a className="portfolio-brand" href="#about">Imad Duddin</a>

      <nav className="portfolio-nav" aria-label="Portfolio sections">
        <div className="portfolio-nav-links">
          <a href="#about">About</a>
          <a href="#projects">Projects</a>
        </div>
        <a className="portfolio-contact" href="#contact">Contact</a>
      </nav>
    </header>
  )
}
