import { AutoScanBanner } from "@/components/auto-scan-banner";
import { CardArt } from "@/components/card-art";
import { ScanButton } from "@/components/scan-button";
import { SettingsForm } from "@/components/settings-form";
import { ThemeToggle } from "@/components/theme-toggle";
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
      <div className="eyebrow">Song-first discovery</div>
      <h1>NaviSeerr should feel like “what do I play next?” instead of “what album am I missing?”</h1>
      <p className="lede">
        Save your Navidrome connection, star a few favorite tracks, add a Last.fm API key, and the
        home screen will fill with similar songs, top tracks from artists you already love, and new
        artists worth queuing.
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
            Recommendations for what to hear next, built from your Navidrome taste profile.
          </p>
        </div>
        <div className="topbar-actions">
          <ThemeToggle />
          <ScanButton disabled={!state.hasConfig} />
        </div>
      </section>

      <div className="page-stack">
        <AutoScanBanner initialState={state.scanState} shouldAutoScan={state.shouldAutoScan} />

        <section className="hero-layout">
          <article className="panel hero-card">
            <div className="eyebrow">Overview</div>
            <h2 className="section-title">A better queue for your next listen.</h2>
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
                <span>Song recs</span>
                <strong>{report?.similarSongs.length ?? 0}</strong>
              </article>
              <article className="stat-card">
                <span>Wishlist</span>
                <strong>{report?.stats.wishlistCount ?? state.wishlist.length}</strong>
              </article>
            </div>
            {report ? (
              <p className="lede compact">
                Last report generated {formatDate(report.generatedAt)}. Starred songs in Navidrome
                are used as your first taste seeds.
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
                  <div className="eyebrow">Taste seeds</div>
                  <h2 className="section-title small">Starred songs from your library</h2>
                </div>
                <p>{report.starredSongs.length} starred tracks found in Navidrome</p>
              </div>
              <div className="carousel-row">
                {report.starredSongs.length ? (
                  report.starredSongs.map((track) => (
                    <article className="carousel-card" key={track.id}>
                      <CardArt
                        alt={`${track.title} cover art`}
                        src={track.coverArtId ? `/api/art?id=${encodeURIComponent(track.coverArtId)}` : undefined}
                      />
                      <div className="card-kicker">{track.artist}</div>
                      <h3>{track.title}</h3>
                      <p>{track.album || "Starred track seed"}</p>
                      <WishlistActionButton
                        artist={track.artist}
                        title={track.title}
                        type="album"
                        reason={`Seed track from ${track.artist}`}
                        source="starred-song"
                        label="Save artist"
                      />
                    </article>
                  ))
                ) : (
                  <article className="carousel-card featured">
                    <h3>No starred songs yet</h3>
                    <p>
                      Star a few tracks in Navidrome and this row becomes the engine for similar-song
                      recommendations.
                    </p>
                  </article>
                )}
              </div>
            </section>

            <section className="row-section">
              <div className="row-header">
                <div>
                  <div className="eyebrow">Similar songs</div>
                  <h2 className="section-title small">Because you loved those tracks</h2>
                </div>
                <p>Last.fm track similarity seeded from your starred songs</p>
              </div>
              <div className="carousel-row">
                {report.similarSongs.length ? (
                  report.similarSongs.map((song) => (
                    <article className="carousel-card" key={`${song.artist}-${song.title}`}>
                      <CardArt alt={`${song.title} artwork`} src={song.artUrl} />
                      <div className="card-kicker">{song.seedArtist ? `${song.seedArtist} seed` : "Recommended track"}</div>
                      <h3>{song.title}</h3>
                      <p>
                        {song.artist}
                        {song.seedTitle ? ` • from ${song.seedTitle}` : ""}
                      </p>
                      <WishlistActionButton
                        artist={song.artist}
                        title={song.title}
                        type="artist"
                        reason={song.reason}
                        source="similar-songs"
                        label="Queue artist"
                      />
                    </article>
                  ))
                ) : (
                  <article className="carousel-card featured">
                    <h3>Similar-song row is waiting on seeds</h3>
                    <p>Add a Last.fm API key and star a few songs in Navidrome to unlock this row.</p>
                  </article>
                )}
              </div>
            </section>

            <section className="row-section">
              <div className="row-header">
                <div>
                  <div className="eyebrow">Artist highlights</div>
                  <h2 className="section-title small">Top tracks from artists you already collect</h2>
                </div>
                <p>Great when you want deeper cuts without leaving your lane</p>
              </div>
              <div className="carousel-row">
                {report.artistTopTracks.length ? (
                  report.artistTopTracks.map((track) => (
                    <article className="carousel-card" key={`${track.artist}-${track.title}`}>
                      <CardArt alt={`${track.title} artwork`} src={track.artUrl} />
                      <div className="card-kicker">{track.artist}</div>
                      <h3>{track.title}</h3>
                      <p>
                        {track.playcount ? `${track.playcount.toLocaleString()} plays` : "Top listener favorite"}
                      </p>
                      <WishlistActionButton
                        artist={track.artist}
                        title={track.title}
                        type="artist"
                        reason={`Top track spotlight from ${track.artist}`}
                        source="artist-top-tracks"
                        label="Queue artist"
                      />
                    </article>
                  ))
                ) : (
                  <article className="carousel-card featured">
                    <h3>No top-track data yet</h3>
                    <p>Last.fm artist top tracks will fill this row once the integration is configured.</p>
                  </article>
                )}
              </div>
            </section>

            <section className="row-section">
              <div className="row-header">
                <div>
                  <div className="eyebrow">New artists</div>
                  <h2 className="section-title small">Adjacent artists worth trying</h2>
                </div>
                <p>Based on your existing artists and external similarity data</p>
              </div>
              <div className="carousel-row">
                {report.similarArtists.length ? (
                  report.similarArtists.map((item) => (
                    <article className="carousel-card" key={`${item.seedArtist}-${item.artist}`}>
                      <CardArt alt={`${item.artist} artwork`} src={item.artUrl} />
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
                  <article className="carousel-card featured">
                    <h3>No artist suggestions yet</h3>
                    <p>Once metadata coverage grows, this row fills with adjacent artists you do not already own.</p>
                  </article>
                )}
              </div>
            </section>

            <section className="row-section">
              <div className="row-header">
                <div>
                  <div className="eyebrow">Wanted queue</div>
                  <h2 className="section-title small">Saved for later</h2>
                </div>
                <p>{state.wishlist.length} queued items</p>
              </div>
              <div className="carousel-row">
                {state.wishlist.length ? (
                  state.wishlist.map((item) => (
                    <article className="carousel-card" key={item.id}>
                      <CardArt alt={`${item.title} placeholder art`} />
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
                  <article className="carousel-card featured">
                    <h3>Your queue is empty</h3>
                    <p>Use the recommendation rows to build a wanted queue instead of a mental note pile.</p>
                  </article>
                )}
              </div>
            </section>

            <section className="row-section">
              <div className="row-header">
                <div>
                  <div className="eyebrow">Context</div>
                  <h2 className="section-title small">Collection profile</h2>
                </div>
              </div>
              <div className="carousel-row">
                <article className="carousel-card featured">
                  <CardArt alt="Genre collage placeholder" />
                  <div className="card-kicker">Genres</div>
                  <div className="chip-cloud">
                    {report.overview.topGenres.map((genre) => (
                      <span className="pill" key={genre.name}>
                        {genre.name} • {genre.count}
                      </span>
                    ))}
                  </div>
                </article>
                <article className="carousel-card featured">
                  <CardArt alt="Top artists placeholder" />
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
                <article className="carousel-card featured">
                  <CardArt alt="Library health placeholder" />
                  <div className="card-kicker">Library health</div>
                  <div className="mini-stack">
                    {report.collectionGaps.map((gap) => (
                      <p key={gap.title}>
                        <strong>{gap.title}</strong>
                        <br />
                        {gap.detail}
                      </p>
                    ))}
                  </div>
                </article>
                <article className="carousel-card featured">
                  <CardArt alt="Fresh releases placeholder" />
                  <div className="card-kicker">Fresh releases</div>
                  <div className="mini-stack">
                    {report.newReleases.slice(0, 5).map((release) => (
                      <p key={`${release.artist}-${release.title}`}>
                        <strong>{release.title}</strong>
                        <br />
                        {release.artist} • {formatDate(release.date)}
                      </p>
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
