import { AutoScanBanner } from "@/components/auto-scan-banner";
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
      <h1>NaviSeerr turns your library into a browseable backlog.</h1>
      <p className="lede">
        Connect Navidrome once, then NaviSeerr keeps scanning the full library in the background so
        your rows stay current with missing releases, recent drops, and artists worth queuing next.
      </p>
    </section>
  );
}

export default async function Home() {
  const state = await loadAppState();
  const report = state.report;

  return (
    <main className="app-shell">
      <div className="backdrop" />
      <section className="topbar topbar-compact">
        <div>
          <div className="eyebrow">Self-hosted music companion</div>
          <h1 className="site-title">NaviSeerr</h1>
          <p className="lede compact">
            Jellyseerr-style browsing for your Navidrome collection, with whole-library sync and a
            wanted queue.
          </p>
        </div>
        <ScanButton disabled={!state.hasConfig} />
      </section>

      <div className="page-stack">
        <AutoScanBanner initialState={state.scanState} shouldAutoScan={state.shouldAutoScan} />

        <section className="hero-layout">
          <article className="panel hero-card">
            <div className="eyebrow">Overview</div>
            <h2 className="section-title">Your next listens, pickups, and gaps at a glance.</h2>
            <div className="stats-grid wide">
              <article className="stat-card">
                <span>Artists</span>
                <strong>{report?.stats.totalArtists ?? 0}</strong>
              </article>
              <article className="stat-card">
                <span>Albums</span>
                <strong>{report?.stats.totalAlbums ?? 0}</strong>
              </article>
              <article className="stat-card">
                <span>Metadata coverage</span>
                <strong>{report?.stats.catalogCoverageArtists ?? 0}</strong>
              </article>
              <article className="stat-card">
                <span>Wishlist</span>
                <strong>{report?.stats.wishlistCount ?? state.wishlist.length}</strong>
              </article>
            </div>
            {report ? (
              <p className="lede compact">
                Last report generated {formatDate(report.generatedAt)}. Auto refresh runs every{" "}
                {state.config?.preferences.autoRefreshHours || 12} hours.
              </p>
            ) : null}
          </article>

          <article className="panel setup-card">
            <div className="section-heading">
              <div>
                <div className="eyebrow">Connections</div>
                <h2 className="section-title small">Settings</h2>
              </div>
            </div>
            <SettingsForm config={state.config} />
          </article>
        </section>

        {!report ? <EmptyReport /> : null}

        {report ? (
          <>
            <section className="row-section">
              <div className="row-header">
                <div>
                  <div className="eyebrow">Missing discography</div>
                  <h2 className="section-title small">Complete your artists</h2>
                </div>
                <p>{report.stats.missingReleases} missing releases surfaced across the library.</p>
              </div>
              <div className="carousel-row">
                {report.missingDiscography.length ? (
                  report.missingDiscography.map((item) => (
                    <article className="carousel-card large" key={item.artist}>
                      <div className="card-kicker">{item.artist}</div>
                      <h3>
                        {item.ownedCount} of {item.knownCount} release groups owned
                      </h3>
                      <div className="mini-stack">
                        {item.missing.map((release) => (
                          <div className="release-pill" key={`${item.artist}-${release.id}`}>
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
                              label="Want"
                            />
                          </div>
                        ))}
                      </div>
                    </article>
                  ))
                ) : (
                  <article className="carousel-card">
                    <h3>No missing releases detected</h3>
                    <p>Once metadata coverage grows, this row will fill itself in automatically.</p>
                  </article>
                )}
              </div>
            </section>

            <section className="row-section">
              <div className="row-header">
                <div>
                  <div className="eyebrow">New releases</div>
                  <h2 className="section-title small">Fresh drops from artists you own</h2>
                </div>
                <p>{state.config?.preferences.recentReleaseWindowDays || 45}-day window</p>
              </div>
              <div className="carousel-row">
                {report.newReleases.length ? (
                  report.newReleases.map((release) => (
                    <article className="carousel-card" key={`${release.artist}-${release.title}`}>
                      <div className="card-kicker">{release.artist}</div>
                      <h3>{release.title}</h3>
                      <p>
                        {release.type} • {formatDate(release.date)}
                      </p>
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
                  <article className="carousel-card">
                    <h3>No recent gaps right now</h3>
                    <p>This row fills with new releases from artists already in the library.</p>
                  </article>
                )}
              </div>
            </section>

            <section className="row-section">
              <div className="row-header">
                <div>
                  <div className="eyebrow">Similar artists</div>
                  <h2 className="section-title small">Because you already listen to...</h2>
                </div>
                <p>Navidrome first, Last.fm fallback if configured.</p>
              </div>
              <div className="carousel-row">
                {report.similarArtists.length ? (
                  report.similarArtists.map((item) => (
                    <article className="carousel-card" key={`${item.seedArtist}-${item.artist}`}>
                      <div className="card-kicker">{item.seedArtist}</div>
                      <h3>{item.artist}</h3>
                      <p>{item.reason}</p>
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
                  <article className="carousel-card">
                    <h3>No recommendations yet</h3>
                    <p>Add a Last.fm key if Navidrome isn’t returning enough similarity data.</p>
                  </article>
                )}
              </div>
            </section>

            <section className="row-section">
              <div className="row-header">
                <div>
                  <div className="eyebrow">Library health</div>
                  <h2 className="section-title small">Smart collection gaps</h2>
                </div>
              </div>
              <div className="carousel-row">
                {report.collectionGaps.map((gap) => (
                  <article className="carousel-card" key={gap.title}>
                    <div className="card-kicker">Gap</div>
                    <h3>{gap.title}</h3>
                    <p>{gap.detail}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="row-section">
              <div className="row-header">
                <div>
                  <div className="eyebrow">Wanted queue</div>
                  <h2 className="section-title small">Saved for import</h2>
                </div>
                <p>{state.wishlist.length} queued items</p>
              </div>
              <div className="carousel-row">
                {state.wishlist.length ? (
                  state.wishlist.map((item) => (
                    <article className="carousel-card" key={item.id}>
                      <div className="card-kicker">{item.artist}</div>
                      <h3>{item.title}</h3>
                      <p>{item.reason}</p>
                      <small>
                        {item.status === "sent" && item.lastSentAt
                          ? `Sent ${formatDate(item.lastSentAt)}`
                          : `Saved ${formatDate(item.createdAt)}`}
                      </small>
                      <WishlistControls
                        itemId={item.id}
                        canSend={Boolean(state.config?.integrations.requestWebhookUrl)}
                      />
                    </article>
                  ))
                ) : (
                  <article className="carousel-card">
                    <h3>Your wishlist is empty</h3>
                    <p>Save albums or artists from any row and they’ll show up here.</p>
                  </article>
                )}
              </div>
            </section>

            <section className="row-section">
              <div className="row-header">
                <div>
                  <div className="eyebrow">Top of collection</div>
                  <h2 className="section-title small">Genres and heavy hitters</h2>
                </div>
              </div>
              <div className="carousel-row">
                <article className="carousel-card">
                  <div className="card-kicker">Genres</div>
                  <div className="chip-cloud">
                    {report.overview.topGenres.map((genre) => (
                      <span className="pill" key={genre.name}>
                        {genre.name} • {genre.count}
                      </span>
                    ))}
                  </div>
                </article>
                <article className="carousel-card large" key="top-artists">
                  <div className="card-kicker">Top artists</div>
                  <div className="mini-stack">
                    {report.overview.topArtists.map((artist) => (
                      <div className="list-row" key={artist.name}>
                        <span>{artist.name}</span>
                        <strong>{artist.albumCount}</strong>
                      </div>
                    ))}
                  </div>
                </article>
                <article className="carousel-card large" key="notes">
                  <div className="card-kicker">Notes</div>
                  <div className="mini-stack">
                    {report.notes.map((note) => (
                      <p key={note}>{note}</p>
                    ))}
                  </div>
                </article>
              </div>
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}
