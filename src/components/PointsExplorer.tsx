"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import LocationPicker, { type Coords } from "./LocationPicker";
import MapView from "./MapView";
import { directionsUrl, openNow, walkMinutes } from "@/lib/geo";

export type ExplorerPoint = { id: string; name: string; kind: string; address: string; hours: string; lat: number; lng: number };

// Find an Iza point: search a place or use your location, filter by kind, see the closest first on a list and a map.
export default function PointsExplorer({
  points,
  initialMode = "pick",
  showModeSwitch = true,
}: {
  points: ExplorerPoint[];
  initialMode?: "pick" | "send";
  showModeSwitch?: boolean;
}) {
  const [mode, setMode] = useState(initialMode);
  const [query, setQuery] = useState("");
  const [spot, setSpot] = useState<Coords | null>(null);
  const [kind, setKind] = useState("all");
  const [chosen, setChosen] = useState<string | null>(null);

  const kinds = useMemo(() => [...new Set(points.map((p) => p.kind))].sort(), [points]);

  const rows = useMemo(() => {
    const list = points
      .filter((p) => kind === "all" || p.kind === kind)
      .map((p) => ({ p, minutes: spot ? walkMinutes(spot, p) : null, open: openNow(p.hours) }));
    if (spot) list.sort((a, b) => (a.minutes as number) - (b.minutes as number));
    return list;
  }, [points, kind, spot]);

  const focus = rows.find((r) => r.p.id === chosen)?.p;
  const mapCentre = focus ? { lat: focus.lat, lng: focus.lng } : null;

  return (
    <div className="explorerWrap">
    <div className="explorer">
      <div className="stack">
        {showModeSwitch && (
          <div className="seg" role="group" aria-label="What are you doing?">
            <button type="button" aria-pressed={mode === "pick"} onClick={() => setMode("pick")}>
              I&apos;m picking up
            </button>
            <button type="button" aria-pressed={mode === "send"} onClick={() => setMode("send")}>
              I&apos;m sending
            </button>
          </div>
        )}
        <p className="muted" style={{ margin: 0 }}>
          {mode === "pick"
            ? "Showing places where you can collect a parcel with your code."
            : "Showing places where a parcel can be dropped for your customer."}
        </p>

        <LocationPicker
          id="search-place"
          label="Search a place"
          placeholder="Type a street, a landmark or a suburb"
          value={query}
          onValue={setQuery}
          coords={spot}
          onCoords={setSpot}
          canUseMyLocation
          hideMap
        />

        <div className="field">
          <label htmlFor="kind">Type of point</label>
          <select id="kind" className="input" value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="all">All types of points</option>
            {kinds.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </div>

        {rows.length === 0 && <p className="muted">No points match. Try another type.</p>}
        <ul className="plainList">
          {rows.map(({ p, minutes, open }, i) => (
            <li key={p.id} className={`card nearby${chosen === p.id ? " picked" : ""}`}>
              <div className="nearbyBody">
                <strong>{p.name}</strong>
                <div className="muted">
                  {p.kind}
                  {open === true && " · open now"}
                  {open === false && " · closed now"}
                </div>
                <div className="muted">Open {p.hours}</div>
                {minutes !== null && (
                  <div className="walk">
                    {minutes} min walk{i === 0 ? ", closest to you" : ""}
                  </div>
                )}
              </div>
              <div className="nearbyActions">
                <button type="button" className="btn btn-soft" onClick={() => setChosen(p.id)}>
                  Show on map
                </button>
                {mode === "send" ? (
                  <Link className="btn btn-primary" href={`/send?point=${encodeURIComponent(p.id)}`}>
                    Send here
                  </Link>
                ) : (
                  <a className="btn btn-primary" href={directionsUrl(p)} target="_blank" rel="noopener noreferrer">
                    Directions
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="explorerMap" role="region" aria-label="Map of Iza points">
        <MapView
          points={rows.map((r) => ({ id: r.p.id, name: r.p.name, lat: r.p.lat, lng: r.p.lng }))}
          me={spot}
          pin={mapCentre}
          height={520}
        />
        {mapCentre && <FocusNote name={focus!.name} />}
      </div>
    </div>
    </div>
  );
}

function FocusNote({ name }: { name: string }) {
  return (
    <p className="muted" role="status" style={{ margin: "8px 4px 0" }}>
      Showing {name}.
    </p>
  );
}
