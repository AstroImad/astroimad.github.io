import './Projects.css'

const tools = ['Python', 'pandas', 'statsmodels', 'Matplotlib']

export default function Projects() {
  return (
    <section id="projects" className="projects-section" aria-labelledby="projects-title">
      <h2 id="projects-title" className="projects-label">02 / Projects</h2>

      <article className="project-card">
        <h3>Treasury Yields and Stock Valuations After a Fed Balance Sheet Shock</h3>
        <p className="project-meta">Internship project · March to August 2025</p>

        <ul className="tech-stack" aria-label="Tech stack" role="list">
          {tools.map((tool) => <li key={tool}>{tool}</li>)}
        </ul>

        <ul className="project-summary">
          <li>
            <strong>Objective:</strong> 59 quarters of U.S. data (2007 Q2 to 2021 Q4)
            were analyzed to estimate how the 10-year Treasury yield and the S&amp;P 500
            price-to-earnings (P/E) ratio responded to an unexpected expansion of the
            Fed’s balance sheet.
          </li>
          <li>
            <strong>Model selection:</strong> A vector error correction model (VECM) was
            used because the data suggested a long-run relationship among the series.
            Because that evidence depended on the lag length, the results were compared
            with those from a vector autoregression (VAR) in quarterly changes.
          </li>
          <li>
            <strong>Findings:</strong> Following a one-standard-deviation balance sheet
            shock (about a 9% increase), the Treasury yield response was estimated to
            level off at <strong>−0.20 percentage points</strong>. A negative P/E response
            was estimated, but its 90% bootstrap confidence band included zero at most
            horizons.
          </li>
          <li>
            <strong>Limitation:</strong> Causality could not be established because the
            balance sheet expansion could not be fully separated from the market stress
            that may have prompted it.
          </li>
        </ul>

        <a
          className="button"
          href="https://github.com/AstroImad/Intern-Project-Impact-of-Quantitative-Easing-on-Asset-Valuation-"
          target="_blank"
          rel="noopener"
        >
          View full project on GitHub <span aria-hidden="true">↗</span>
        </a>
      </article>
    </section>
  )
}
