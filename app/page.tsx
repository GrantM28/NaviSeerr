import { ScanButton } from "@/components/scan-button";
import { SettingsForm } from "@/components/settings-form";
import { WishlistActionButton } from "@/components/wishlist-action-button";
import { WishlistControls } from "@/components/wishlist-controls";
import { loadAppState } from "@/lib/dashboard";

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(date);
}

function EmptyReport() {
  return (
    <section className="panel hero-card">
      <div className="eyebrow">Collection intelligence for Navidrome</div>
      <h1>NaviSeerr turns your library into a backlog of what to collect next.</h1>
      <p className="lede">
        Save your Navidrome server, run a scan, and this dashboard will surface missing releases,
        recent drops from artists you already own, and a wishlist you can push into the rest of
        your stack.
      </p>
      <div className="hero-grid">
        <article className="mini-panel">
          <h2>Missing discography</h2>
          <p>See which artists are incomplete and which albums, EPs, or live releases are absent.</p>
        </article>
        <article className="mini-panel">
          <h2>New releases</h2>
          <p>Catch recent release groups from the artists already living in your Navidrome library.</p>
        </article>
        <article className="mini-panel">
          <h2>Recommendations</h2>
          <p>Use Navidrome similarity data or Last.fm to build a smart wanted queue instead of a random list.</p>
        </article>
      </div>
    </section>
  );
}

export default async function Home() {
  const state = await loadAppState();
  const report = state.report;

  return (
    <main className="app-shell">
      <div className="backdrop" />
      <section className="topbar">
        <div>
          <div className="eyebrow">Self-hosted music companion</div>
          <h1 className="site-title">NaviSeerr</h1>
          <p className="lede compact">
            Find the releases you are missing, track what just dropped, and turn discovery into a
            usable wanted queue.
          </p>
        </div>
        <div className="topbar-actions">
          <ScanButton disabled={!state.hasConfig} />
        </div>
      </section>

      <section className="layout-grid">
        <div className="main-column">
          {report ? (
            <>
              <section className="stats-grid">
                <article className="stat-card">
                  <span>Total artists</span>
                  <strong>{report.stats.totalArtists}</strong>
                </article>
                <article className="stat-card">
                  <span>Total albums</span>
                  <strong>{report.stats.totalAlbums}</strong>
                </article>
                <article className="stat-card">
                  <span>Missing releases</span>
                  <strong>{report.stats.missingReleases}</strong>
                </article>
                <article className="stat-card">
                  <span>Recent drops</span>
                  <strong>{report.stats.newReleases}</strong>
                </article>
              </section>

              <section className="panel section-panel">
                <div className="section-heading">
                  <div>
                    <div className="eyebrow">Dashboard</div>
                    <h2>Home screen</h2>
                  </div>
                  <p>Last scan: {formatDate(report.generatedAt)}</p>
                </div>
                <div className="section-columns">
                  <div>
                    <h3>Top genres</h3>
                    <div className="pill-row">
                      {report.overview.topGenres.length ? (
                        report.overview.topGenres.map((genre) => (
                          <span className="pill" key={genre.name}>
                            {genre.name} • {genre.count}
                          </span>
                        ))
                      ) : (
                        <span className="muted">No genre data was returned by Navidrome.</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <h3>Top artists by album count</h3>
                    <ul className="simple-list">
                      {report.overview.topArtists.map((artist) => (
                        <li key={artist.name}>
                          <span>{artist.name}</span>
                          <strong>{artist.albumCount}</strong>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </section>

              <section className="panel section-panel">
                <div className="section-heading">
                  <div>
                    <div className="eyebrow">Missing discography</div>
                    <h2>Collection completion</h2>
                  </div>
                  <p>Scanned top {report.stats.scannedArtists} artists by album depth.</p>
                </div>
                <div className="card-stack">
                  {report.missingDiscography.length ? (
                    report.missingDiscography.map((item) => (
                      <article className="discovery-card" key={item.artist}>
                        <header>
                          <div>
                            <h3>{item.artist}</h3>
                            <p>
                              You have {item.ownedCount} of {item.knownCount} release groups in the sampled
                              discography.
                            </p>
                          </div>
                        </header>
                        <div className="tag-cloud">
                          {item.missing.map((release) => (
                            <div className="release-chip" key={`${item.artist}-${release.id}`}>
                              <div>
                                <strong>{release.title}</strong>
                                <span>
                                  {release.type}
                                  {release.year ? ` • ${release.year}` : ""}
                                </span>
                              </div>
                              <WishlistActionButton
                                artist={item.artist}
                                title={release.title}
                                type="album"
                                reason={`Missing ${release.type.toLowerCase()} from ${item.artist}`}
                                source="missing-discography"
                                label="Want this"
                              />
                            </div>
                          ))}
                        </div>
                      </article>
                    ))
                  ) : (
                    <p className="muted">No obvious missing release groups surfaced in this scan window.</p>
                  )}
                </div>
              </section>

              <section className="dual-grid">
                <article className="panel section-panel">
                  <div className="section-heading">
                    <div>
                      <div className="eyebrow">Fresh drops</div>
                      <h2>New releases</h2>
                    </div>
                    <p>Window: {state.config?.preferences.recentReleaseWindowDays || 45} days</p>
                  </div>
                  <div className="card-stack">
                    {report.newReleases.length ? (
                      report.newReleases.map((release) => (
                        <article className="mini-panel release-row" key={`${release.artist}-${release.title}`}>
                          <div>
                            <strong>{release.title}</strong>
                            <p>
                              {release.artist} • {release.type} • {formatDate(release.date)}
                            </p>
                          </div>
                          <WishlistActionButton
                            artist={release.artist}
                            title={release.title}
                            type="album"
                            reason={`Recent release from ${release.artist}`}
                            source="new-releases"
                            label="Save"
                          />
                        </article>
                      ))
                    ) : (
                      <p className="muted">No recent missing releases were found for the sampled artists.</p>
                    )}
                  </div>
                </article>

                <article className="panel section-panel">
                  <div className="section-heading">
                    <div>
                      <div className="eyebrow">Because you already listen to...</div>
                      <h2>Similar artists</h2>
                    </div>
                    <p>Powered by Navidrome similarity data, then Last.fm if configured.</p>
                  </div>
                  <div className="card-stack">
                    {report.similarArtists.length ? (
                      report.similarArtists.map((item) => (
                        <article className="mini-panel release-row" key={`${item.seedArtist}-${item.artist}`}>
                          <div>
                            <strong>{item.artist}</strong>
                            <p>
                              Seeded from {item.seedArtist} • {item.source}
                            </p>
                          </div>
                          <WishlistActionButton
                            artist={item.artist}
                            title={item.artist}
                            type="artist"
                            reason={`Similar to ${item.seedArtist}`}
                            source={item.source}
                            label="Queue"
                          />
                        </article>
                      ))
                    ) : (
                      <p className="muted">
                        Add a Last.fm API key if Navidrome is not returning similarity data yet.
                      </p>
                    )}
                  </div>
                </article>
              </section>

              <section className="dual-grid">
                <article className="panel section-panel">
                  <div className="section-heading">
                    <div>
                      <div className="eyebrow">Smart gaps</div>
                      <h2>Library health</h2>
                    </div>
                  </div>
                  <div className="card-stack">
                    {report.collectionGaps.map((gap) => (
                      <article className="mini-panel" key={gap.title}>
                        <strong>{gap.title}</strong>
                        <p>{gap.detail}</p>
                      </article>
                    ))}
                  </div>
                </article>

                <article className="panel section-panel">
                  <div className="section-heading">
                    <div>
                      <div className="eyebrow">Scan notes</div>
                      <h2>What this pass looked at</h2>
                    </div>
                  </div>
                  <ul className="notes-list">
                    {report.notes.map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                </article>
              </section>
            </>
          ) : (
            <EmptyReport />
          )}
        </div>

        <aside className="side-column">
          <section className="panel side-panel">
            <div className="section-heading">
              <div>
                <div className="eyebrow">Setup</div>
                <h2>Connections</h2>
              </div>
            </div>
            <SettingsForm config={state.config} />
          </section>

          <section className="panel side-panel">
            <div className="section-heading">
              <div>
                <div className="eyebrow">Wanted queue</div>
                <h2>Wishlist</h2>
              </div>
              <p>{state.wishlist.length} saved items</p>
            </div>
            <div className="card-stack">
              {state.wishlist.length ? (
                state.wishlist.map((item) => (
                  <article className="mini-panel" key={item.id}>
                    <strong>{item.title}</strong>
                    <p>
                      {item.artist} • {item.reason}
                    </p>
                    <small>
                      {item.status === "sent" && item.lastSentAt
                        ? `Sent ${formatDate(item.lastSentAt)}`
                        : `Saved ${formatDate(item.createdAt)}`}
                    </small>
                    <WishlistControls itemId={item.id} canSend={Boolean(state.config?.integrations.requestWebhookUrl)} />
                  </article>
                ))
              ) : (
                <p className="muted">Albums and artists you save from the dashboard will land here.</p>
              )}
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}
