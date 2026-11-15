import type { ReactNode } from 'react'
import { CLUB, parseClubDate } from '../club.ts'
import { PageHeader } from '../components/Layout.tsx'
import { useTitle } from '../hooks.ts'
import { INFO_PAGES, paths, type InfoPage } from '../router.ts'

const TITLES: Record<InfoPage, string> = {
  rules: 'League Rules',
  privacy: 'Privacy Policy',
  terms: 'Terms of Use',
}

function updatedLabel(): string {
  const date = parseClubDate(CLUB.policiesUpdated)
  return date ? date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : CLUB.policiesUpdated
}

/** The ways to reach the organizers, or a fallback when none are configured yet. */
function Contact() {
  const { email, discordUrl } = CLUB.contact
  if (!email && !discordUrl) return <>message a club organizer in the club Discord server</>
  return (
    <>
      {email && <>email <a href={`mailto:${email}`}>{email}</a></>}
      {email && discordUrl && ' or '}
      {discordUrl && <>message an organizer in the <a href={discordUrl} target="_blank" rel="noreferrer">club Discord server</a></>}
    </>
  )
}

function Rules() {
  return (
    <>
      <p className="lede">
        These rules apply to every Let&apos;s Queue Club season. Organizers may add season-specific details when a season is announced.
      </p>

      <h2>1. Eligibility</h2>
      <ul>
        <li>Every player needs a League of Legends account in good standing on the North America server, linked to the Riot ID they register with.</li>
        <li>Players must follow the <a href="https://www.riotgames.com/en/terms-of-service" target="_blank" rel="noreferrer">Riot Games Terms of Service</a>. Account sharing, boosting, and playing on someone else&apos;s account aren&apos;t allowed.</li>
        <li>A player may be on only one team per season.</li>
      </ul>

      <h2>2. Entry and prizes</h2>
      <ul>
        <li>Joining the club and playing in a season is free. There is no entry fee.</li>
        <li>Any prizes are announced before the season starts, along with how they&apos;re awarded.</li>
        <li>Gambling, betting, or wagering on club matches is not allowed.</li>
      </ul>

      <h2>3. Teams and rosters</h2>
      <ul>
        <li>Teams field five starters and may list substitutes. Rosters are locked once the season starts, except with organizer approval.</li>
        <li>Only rostered players may play for a team. Each player plays under the Riot ID they registered.</li>
      </ul>

      <h2>4. Format and matches</h2>
      <ul>
        <li>Seasons run as weekly regular-season matches on Summoner&apos;s Rift in Tournament Draft. The schedule is posted on this site before the season starts.</li>
        <li>Organizers create each lobby with a tournament code from the Riot Games API. Results are recorded automatically from that game, so use the code you&apos;re given.</li>
        <li>Teams pick sides as listed on the schedule. Unless both captains and an organizer agree, games are played at the scheduled time.</li>
      </ul>

      <h2>5. Forfeits and disconnects</h2>
      <ul>
        <li>A team that can&apos;t field five rostered players within 15 minutes of the scheduled start forfeits the game.</li>
        <li>If a player disconnects, the team may pause and wait up to 10 minutes total per game. Remakes follow the normal in-game rules.</li>
        <li>Forfeits count as a loss for the forfeiting team and a win for its opponent, and appear in the match history.</li>
      </ul>

      <h2>6. Standings</h2>
      <ul>
        <li>Teams are ranked by wins, then by fewest losses. Teams with the same record share a rank.</li>
        <li>Any playoff format and tiebreakers for playoff seeding are announced before the season starts.</li>
      </ul>

      <h2>7. Conduct</h2>
      <ul>
        <li>Treat every player with respect, in game and in the club&apos;s community spaces. Harassment, hate speech, and cheating aren&apos;t tolerated.</li>
        <li>Organizers may warn, forfeit games for, or remove players and teams that break these rules. Disputes go to the organizers, whose decision is final.</li>
      </ul>

      <h2>8. Questions</h2>
      <p>To ask about a ruling, <Contact />.</p>
    </>
  )
}

function Privacy() {
  return (
    <>
      <p className="lede">
        Let&apos;s Queue Club is a free, community-run League of Legends league. This policy explains what player information we use, why, and how
        to have it removed.
      </p>

      <h2>Information we collect</h2>
      <ul>
        <li><strong>Riot account details:</strong> your Riot ID (game name and tagline) and your player ID (PUUID), which you give us when you sign up.</li>
        <li><strong>Match data:</strong> results and in-game stats (champions, kills, deaths, assists, damage, gold, and similar) from club games, retrieved
          from the Riot Games API using the tournament codes we create.</li>
        <li><strong>Sign-up details:</strong> your team, role, and contact handle (such as your Discord name) so organizers can schedule matches.</li>
      </ul>
      <p>We don&apos;t collect passwords, payment information, or any data from games played outside the club.</p>

      <h2>How we use it</h2>
      <ul>
        <li>To run the league: build rosters, schedule matches, create tournament lobbies, and record results.</li>
        <li>To publish standings, match history, and player and champion stats on this website.</li>
      </ul>
      <p>We never sell or rent player information, and we don&apos;t use it for advertising.</p>

      <h2>What&apos;s public</h2>
      <p>
        Riot IDs, team names, and match stats from club games are shown publicly on this site. Contact handles, like Discord names, are kept
        private to the organizers and aren&apos;t published.
      </p>

      <h2>Cookies and storage</h2>
      <p>
        This site uses no cookies, analytics, or trackers. To load faster, your browser saves a         copy of the league data and champion
        information in its local storage. You can clear it any time from your browser settings.
      </p>

      <h2>Services we rely on</h2>
      <ul>
        <li><strong>Riot Games API:</strong> creates tournament codes and provides match results.</li>
        <li><strong>Google Sheets and Apps Script:</strong> stores the league records and serves them to this site.</li>
        <li><strong>GitHub Pages:</strong> hosts this site. GitHub may log visitor IP addresses for security, as described in its{' '}
          <a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement" target="_blank" rel="noreferrer">privacy statement</a>.</li>
        <li><strong>Riot Data Dragon:</strong> provides champion names and images, loaded from Riot&apos;s content servers.</li>
      </ul>

      <h2>How long we keep it</h2>
      <p>
        League records are kept as the club&apos;s history for as long as the club runs. If we stop using the Riot Games API, we delete the data we
        got from it, as Riot&apos;s developer terms require.
      </p>

      <h2>Your choices</h2>
      <p>
        You can ask to see, correct, or delete your information at any time. To make a request, <Contact />. We&apos;ll respond within 30 days.
        When you ask us to delete your data, we remove your Riot ID, PUUID, and contact details, and show your past games without your name.
      </p>
      <p>We also honor deletion requests that Riot Games passes along to us on a player&apos;s behalf.</p>

      <h2>Children</h2>
      <p>The club isn&apos;t meant for anyone under 13, and we don&apos;t knowingly collect information from them.</p>

      <h2>Changes</h2>
      <p>If this policy changes, we&apos;ll update it here and change the date at the top of this page.</p>
    </>
  )
}

function Terms() {
  return (
    <>
      <p className="lede">By using this site or playing in Let&apos;s Queue Club, you agree to these terms.</p>

      <h2>The club</h2>
      <p>
        Let&apos;s Queue Club is a free, non-commercial community league. Joining costs nothing, and the club doesn&apos;t sell anything on this site.
        Every season follows the <a href={paths.info('rules')}>league rules</a>.
      </p>

      <h2>Riot Games</h2>
      <p>
        Let&apos;s Queue Club isn&apos;t endorsed by Riot Games and doesn&apos;t reflect the views or opinions of Riot Games or anyone officially involved in
        producing or managing Riot Games properties. Riot Games, League of Legends, and all associated properties are trademarks or registered
        trademarks of Riot Games, Inc. Players must also follow the{' '}
        <a href="https://www.riotgames.com/en/terms-of-service" target="_blank" rel="noreferrer">Riot Games Terms of Service</a>.
      </p>

      <h2>Acceptable use</h2>
      <ul>
        <li>Don&apos;t use club stats or matches for gambling, betting, or wagering.</li>
        <li>Don&apos;t try to disrupt the site, its data source, or the club&apos;s tournament lobbies.</li>
        <li>Don&apos;t impersonate other players or organizers.</li>
      </ul>

      <h2>Accuracy</h2>
      <p>
        Stats are recorded from club games and checked by organizers, but mistakes can happen. The site is provided as is, without warranties. If
        something looks wrong, <Contact />.
      </p>

      <h2>Privacy</h2>
      <p>How we handle player information is described in the <a href={paths.info('privacy')}>privacy policy</a>.</p>

      <h2>Changes</h2>
      <p>We may update these terms. The date at the top of this page shows when they last changed.</p>
    </>
  )
}

const BODIES: Record<InfoPage, () => ReactNode> = { rules: Rules, privacy: Privacy, terms: Terms }

export function InfoPageView({ doc }: { doc: InfoPage }) {
  useTitle(TITLES[doc])
  const Body = BODIES[doc]
  return (
    <>
      <PageHeader eyebrow="Let’s Queue Club" title={TITLES[doc]}>
        <p className="muted">Last updated {updatedLabel()}</p>
      </PageHeader>
      <div className="info-layout">
        <article className="prose">
          <Body />
        </article>
        <nav className="info-nav" aria-label="Club policies">
          {INFO_PAGES.map((page) => (
            <a key={page} href={paths.info(page)} className={page === doc ? 'active' : ''} aria-current={page === doc ? 'page' : undefined}>
              {TITLES[page]}
            </a>
          ))}
        </nav>
      </div>
    </>
  )
}
