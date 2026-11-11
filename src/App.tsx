import './App.css'

const features = [
  {
    number: '01',
    title: 'Season standings',
    description: 'Follow the competition and see how the season stacks up.',
  },
  {
    number: '02',
    title: 'Team stats',
    description: 'Get to know the teams and track their performance.',
  },
  {
    number: '03',
    title: 'Player stats',
    description: 'Explore the players and the numbers behind each game.',
  },
]

function App() {
  return (
    <div className="site-shell">
      <a className="skip-link" href="#main">Skip to content</a>
      <header className="site-header">
        <a className="brand" href="#" aria-label="Let's Queue Club home">
          <span className="brand-mark" aria-hidden="true">Q</span>
          <span>LET&apos;S QUEUE <span className="brand-subtitle">CLUB</span></span>
        </a>
        <a className="header-link" href="#coming-soon">What&apos;s next <span aria-hidden="true">&darr;</span></a>
      </header>

      <main id="main">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow"><span className="status-dot" /> A new home for the club</p>
            <h1 id="hero-title">Good games.<br />Great company.<br /><span>Let&apos;s queue.</span></h1>
            <p className="hero-description">
              Your home for League of Legends standings, teams, and player stats.
              We&apos;re getting things ready. See you on the Rift.
            </p>
            <a className="primary-link" href="#coming-soon">See what&apos;s coming <span aria-hidden="true">&rarr;</span></a>
          </div>
          <div className="queue-card" aria-label="Club site status: coming soon">
            <div className="card-heading"><span>LET&apos;S QUEUE CLUB</span><span className="status-dot" /></div>
            <div className="queue-symbol" aria-hidden="true">Q</div>
            <p className="card-title">The next chapter<br />starts here.</p>
            <div className="card-footer"><span>OUR SITE IS IN THE WORKS</span><span className="badge">Coming soon</span></div>
          </div>
        </section>

        <section className="coming-soon" id="coming-soon" aria-labelledby="coming-soon-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">On the horizon</p>
              <h2 id="coming-soon-title">The club, at a glance.</h2>
            </div>
            <p>More details. Less digging.</p>
          </div>
          <div className="feature-grid">
            {features.map((feature) => (
              <article className="feature" key={feature.number}>
                <span className="feature-number">{feature.number} / COMING SOON</span>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <span>Let&apos;s Queue Club</span>
        <span>Built for the love of the game.</span>
      </footer>
    </div>
  )
}

export default App
